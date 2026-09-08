import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import { getAuth } from '@clerk/express';

import { ObjectPermission } from '../lib/objectAcl';
import { ObjectAccessGroupType } from '../lib/objectAcl';
import { z } from 'zod';
import {
  db,
  membersTable,
  pendingObjectUploadsTable,
  usersTable,
} from '@workspace/db';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const completeUploadSchema = z.object({
  objectPath: z.string().startsWith('/objects/'),
});

class UploadAuthorizationError extends Error {}

function hasAuthenticatedSession(
  req: Request,
): req is Request & { isAuthenticated: () => boolean } {
  if (
    !('isAuthenticated' in req) ||
    typeof req.isAuthenticated !== 'function'
  ) {
    return false;
  }

  return req.isAuthenticated();
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const organizationId = parsed.data.organizationId;
      if (organizationId) {
        const [membership] = await db
          .select({ id: membersTable.id })
          .from(membersTable)
          .innerJoin(usersTable, eq(usersTable.id, membersTable.userId))
          .where(and(
            eq(usersTable.clerkId, auth.userId),
            eq(membersTable.organizationId, organizationId),
            eq(membersTable.status, 'active'),
          ))
          .limit(1);
        if (!membership) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL(
        contentType || 'application/octet-stream',
      );
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);
      await db.insert(pendingObjectUploadsTable).values({
        objectPath,
        ownerClerkId: auth.userId,
        organizationId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

router.post('/storage/uploads/complete', async (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const parsed = completeUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid upload completion payload' });
    return;
  }
  const { objectPath } = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const [pending] = await tx
        .select({
          organizationId: pendingObjectUploadsTable.organizationId,
        })
        .from(pendingObjectUploadsTable)
        .where(and(
          eq(pendingObjectUploadsTable.objectPath, objectPath),
          eq(pendingObjectUploadsTable.ownerClerkId, auth.userId),
          isNull(pendingObjectUploadsTable.consumedAt),
          gt(pendingObjectUploadsTable.expiresAt, new Date()),
        ))
        .limit(1)
        .for('update');
      if (!pending) {
        throw new UploadAuthorizationError(
          'Upload authorization missing, expired, or already consumed',
        );
      }
      if (pending.organizationId) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(67101, ${pending.organizationId})`,
        );
        const [activeMembership] = await tx
          .select({ id: membersTable.id })
          .from(membersTable)
          .innerJoin(usersTable, eq(usersTable.id, membersTable.userId))
          .where(and(
            eq(usersTable.clerkId, auth.userId),
            eq(membersTable.organizationId, pending.organizationId),
            eq(membersTable.status, 'active'),
          ))
          .limit(1);
        if (!activeMembership) {
          throw new UploadAuthorizationError(
            'Organization access was revoked before upload completion',
          );
        }
      }
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: pending.organizationId
          ? `organization:${pending.organizationId}`
          : auth.userId,
        visibility: 'private',
        aclRules: pending.organizationId ? [{
          group: {
            type: ObjectAccessGroupType.ORGANIZATION,
            id: String(pending.organizationId),
          },
          permission: ObjectPermission.READ,
        }] : [],
      });
      await tx
        .update(pendingObjectUploadsTable)
        .set({ consumedAt: new Date() })
        .where(eq(pendingObjectUploadsTable.objectPath, objectPath));
    });
    res.json({ objectPath });
  } catch (error) {
    if (error instanceof UploadAuthorizationError) {
      res.status(403).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, 'Error finalizing private upload');
    res.status(500).json({ error: 'Failed to finalize upload' });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from R2_PUBLIC_PREFIXES.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from the R2 private object prefix.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);
    const canAccess = await objectStorageService.canAccessObjectEntity({
      userId: auth.userId,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;

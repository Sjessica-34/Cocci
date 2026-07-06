import { Router } from "express";
import multer from "multer";
import { db, documentsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return membership ? user.id : null;
}

// GET /organizations/:orgId/documents[?category=xxx]
router.get("/organizations/:orgId/documents", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { category } = req.query as { category?: string };

  const rows = await db
    .select({
      id: documentsTable.id,
      organizationId: documentsTable.organizationId,
      uploadedByUserId: documentsTable.uploadedByUserId,
      category: documentsTable.category,
      originalName: documentsTable.originalName,
      mimeType: documentsTable.mimeType,
      size: documentsTable.size,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(
      category
        ? and(eq(documentsTable.organizationId, orgId), eq(documentsTable.category, category))
        : eq(documentsTable.organizationId, orgId),
    )
    .orderBy(documentsTable.createdAt);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// POST /organizations/:orgId/documents  (multipart/form-data: file + category)
router.post(
  "/organizations/:orgId/documents",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
    const user = await getOrCreateUser(req.clerkUserId!);
    const membership = await verifyMembership(req.clerkUserId!, orgId);
    if (!membership) { res.status(403).json({ error: "Forbidden" }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file provided" }); return; }

    const category = String(req.body?.category ?? "autre");

    const [doc] = await db
      .insert(documentsTable)
      .values({
        organizationId: orgId,
        uploadedByUserId: user.id,
        category,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        content: file.buffer,
      })
      .returning({
        id: documentsTable.id,
        organizationId: documentsTable.organizationId,
        uploadedByUserId: documentsTable.uploadedByUserId,
        category: documentsTable.category,
        originalName: documentsTable.originalName,
        mimeType: documentsTable.mimeType,
        size: documentsTable.size,
        createdAt: documentsTable.createdAt,
      });

    res.status(201).json({ ...doc, createdAt: doc!.createdAt.toISOString() });
  },
);

// GET /organizations/:orgId/documents/:docId/download
router.get("/organizations/:orgId/documents/:docId/download", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const docId = parseId(req.params.docId);
  if (!orgId || isNaN(orgId) || !docId || isNaN(docId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.organizationId, orgId)))
    .limit(1);

  if (!doc) { res.status(404).json({ error: "Not found" }); return; }

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
  res.setHeader("Content-Length", doc.size);
  res.send(doc.content);
});

// DELETE /organizations/:orgId/documents/:docId
router.delete("/organizations/:orgId/documents/:docId", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const docId = parseId(req.params.docId);
  if (!orgId || isNaN(orgId) || !docId || isNaN(docId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const deleted = await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.organizationId, orgId)))
    .returning({ id: documentsTable.id });

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;

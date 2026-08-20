import { Router } from "express";
import multer from "multer";
import { db, documentsTable, documentExerciseLinksTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireActiveOrgMembership, requireExerciseScope, requireWritableExerciseScope, requireWritableOrgMembership } from "../middlewares/exerciseScope";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

// GET /organizations/:orgId/documents[?category=xxx]
router.get("/organizations/:orgId/documents", requireAuth, requireActiveOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const { category } = req.query as { category?: string };

  const links = await db
    .select({ documentId: documentExerciseLinksTable.documentId })
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, req.exercise!.id));
  const docIds = links.map((l) => l.documentId);
  if (docIds.length === 0) { res.json([]); return; }

  const rows = await db
    .select({
      id: documentsTable.id,
      organizationId: documentsTable.organizationId,
      uploadedByUserId: documentsTable.uploadedByUserId,
      category: documentsTable.category,
      label: documentsTable.label,
      description: documentsTable.description,
      originalName: documentsTable.originalName,
      mimeType: documentsTable.mimeType,
      size: documentsTable.size,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(
      category
        ? and(eq(documentsTable.organizationId, req.orgId!), eq(documentsTable.category, category), inArray(documentsTable.id, docIds))
        : and(eq(documentsTable.organizationId, req.orgId!), inArray(documentsTable.id, docIds)),
    )
    .orderBy(documentsTable.createdAt);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// POST /organizations/:orgId/documents  (multipart/form-data: file + category)
router.post(
  "/organizations/:orgId/documents",
  requireAuth,
  requireWritableOrgMembership,
  requireWritableExerciseScope,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file provided" }); return; }

    const category    = String(req.body?.category ?? "autre");
    const label       = req.body?.label       ? String(req.body.label)       : null;
    const description = req.body?.description ? String(req.body.description) : null;

    const [doc] = await db
      .insert(documentsTable)
      .values({
        organizationId: req.orgId!,
        uploadedByUserId: req.userId!,
        category,
        label,
        description,
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
        label: documentsTable.label,
        description: documentsTable.description,
        originalName: documentsTable.originalName,
        mimeType: documentsTable.mimeType,
        size: documentsTable.size,
        createdAt: documentsTable.createdAt,
      });

    await db.insert(documentExerciseLinksTable).values({ documentId: doc!.id, exerciseId: req.exercise!.id });

    res.status(201).json({ ...doc, createdAt: doc!.createdAt.toISOString() });
  },
);

// GET /organizations/:orgId/documents/:docId/download
router.get("/organizations/:orgId/documents/:docId/download", requireAuth, requireActiveOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const docId = parseId(req.params.docId);
  if (!docId || isNaN(docId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [link] = await db
    .select({ id: documentExerciseLinksTable.id })
    .from(documentExerciseLinksTable)
    .where(and(eq(documentExerciseLinksTable.documentId, docId), eq(documentExerciseLinksTable.exerciseId, req.exercise!.id)))
    .limit(1);
  if (!link) { res.status(404).json({ error: "Not found" }); return; }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.organizationId, req.orgId!)))
    .limit(1);

  if (!doc) { res.status(404).json({ error: "Not found" }); return; }

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
  res.setHeader("Content-Length", doc.size);
  res.send(doc.content);
});

// DELETE /organizations/:orgId/documents/:docId
router.delete("/organizations/:orgId/documents/:docId", requireAuth, requireWritableOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const docId = parseId(req.params.docId);
  if (!docId || isNaN(docId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const deletedLink = await db
    .delete(documentExerciseLinksTable)
    .where(and(eq(documentExerciseLinksTable.documentId, docId), eq(documentExerciseLinksTable.exerciseId, req.exercise!.id)))
    .returning({ id: documentExerciseLinksTable.id });

  if (!deletedLink.length) { res.status(404).json({ error: "Not found" }); return; }

  const remainingLinks = await db
    .select({ id: documentExerciseLinksTable.id })
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.documentId, docId))
    .limit(1);

  if (remainingLinks.length === 0) {
    await db.delete(documentsTable).where(and(eq(documentsTable.id, docId), eq(documentsTable.organizationId, req.orgId!)));
  }

  res.status(204).end();
});

export default router;

import { Router } from "express";
import { db, bioDependenciesTable, bioConnectionsTable, bioIssuesTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [m] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return m ? user.id : null;
}

function mapDep(row: typeof bioDependenciesTable.$inferSelect) {
  return {
    id:              row.id,
    organizationId:  row.organizationId,
    name:            row.name ?? null,
    category:        row.category ?? null,
    subCategory:     row.subCategory ?? null,
    chainPosition:   row.chainPosition ?? null,
    dependencyLevel: row.dependencyLevel ?? null,
    masteryLevel:    row.masteryLevel ?? null,
    comments:        row.comments ?? null,
    documentIds:     row.documentIds ? (JSON.parse(row.documentIds) as number[]) : [],
    x:               row.posX ?? null,
    y:               row.posY ?? null,
    createdAt:       row.createdAt.toISOString(),
    updatedAt:       row.updatedAt.toISOString(),
  };
}

function mapConn(row: typeof bioConnectionsTable.$inferSelect) {
  return {
    id:             row.id,
    organizationId: row.organizationId,
    fromElementId:  row.fromElementId,
    toElementId:    row.toElementId,
    relationType:   row.relationType ?? null,
    createdAt:      row.createdAt.toISOString(),
    updatedAt:      row.updatedAt.toISOString(),
  };
}

function mapIssue(row: typeof bioIssuesTable.$inferSelect) {
  return {
    id:             row.id,
    organizationId: row.organizationId,
    name:           row.name          ?? null,
    description:    row.description   ?? null,
    issueType:      row.issueType     ?? null,
    importance:     row.importance    ?? null,
    probability:    row.probability   ?? null,
    urgency:        row.urgency       ?? null,
    reversibility:  row.reversibility ?? null,
    comments:       row.comments      ?? null,
    chainPosition:  row.chainPosition ?? null,
    elementIds:     row.dependencyIds ? (JSON.parse(row.dependencyIds) as number[]) : [],
    x:              row.posX ?? null,
    y:              row.posY ?? null,
    createdAt:      row.createdAt.toISOString(),
    updatedAt:      row.updatedAt.toISOString(),
  };
}

// ─── DEPENDENCIES ─────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-dependencies", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(bioDependenciesTable).where(eq(bioDependenciesTable.organizationId, orgId));
  res.json({ items: rows.map(mapDep) });
});

router.post("/organizations/:orgId/bio-dependencies", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : [];
  const [row] = await db.insert(bioDependenciesTable).values({
    organizationId:  orgId,
    name:            (b.name as string | undefined) ?? null,
    category:        (b.category as string | undefined) ?? null,
    subCategory:     (b.subCategory as string | undefined) ?? null,
    chainPosition:   (b.chainPosition as string | undefined) ?? null,
    dependencyLevel: (b.dependencyLevel as number | undefined) ?? null,
    masteryLevel:    (b.masteryLevel as number | undefined) ?? null,
    comments:        (b.comments as string | undefined) ?? null,
    documentIds:     JSON.stringify(docIds),
    posX:            (b.x as number | undefined) ?? null,
    posY:            (b.y as number | undefined) ?? null,
  }).returning();
  res.json(mapDep(row));
});

router.get("/organizations/:orgId/bio-dependencies/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.select().from(bioDependenciesTable)
    .where(and(eq(bioDependenciesTable.id, id), eq(bioDependenciesTable.organizationId, orgId))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDep(row));
});

router.put("/organizations/:orgId/bio-dependencies/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : undefined;
  const updates: Partial<typeof bioDependenciesTable.$inferInsert> = {
    name:            (b.name as string | null | undefined) ?? null,
    category:        (b.category as string | null | undefined) ?? null,
    subCategory:     (b.subCategory as string | null | undefined) ?? null,
    chainPosition:   (b.chainPosition as string | null | undefined) ?? null,
    dependencyLevel: (b.dependencyLevel as number | null | undefined) ?? null,
    masteryLevel:    (b.masteryLevel as number | null | undefined) ?? null,
    comments:        (b.comments as string | null | undefined) ?? null,
    updatedAt:       new Date(),
  };
  if (docIds !== undefined) updates.documentIds = JSON.stringify(docIds);
  if (b.x !== undefined) updates.posX = (b.x as number | null) ?? null;
  if (b.y !== undefined) updates.posY = (b.y as number | null) ?? null;
  const [row] = await db.update(bioDependenciesTable).set(updates)
    .where(and(eq(bioDependenciesTable.id, id), eq(bioDependenciesTable.organizationId, orgId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDep(row));
});

router.delete("/organizations/:orgId/bio-dependencies/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(bioDependenciesTable).where(and(eq(bioDependenciesTable.id, id), eq(bioDependenciesTable.organizationId, orgId)));
  res.status(204).send();
});

// ─── CONNECTIONS ───────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-connections", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(bioConnectionsTable).where(eq(bioConnectionsTable.organizationId, orgId));
  res.json({ items: rows.map(mapConn) });
});

router.post("/organizations/:orgId/bio-connections", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const fromElementId = Number(b.fromElementId);
  const toElementId   = Number(b.toElementId);
  if (isNaN(fromElementId) || isNaN(toElementId)) { res.status(400).json({ error: "Invalid element ids" }); return; }
  const [row] = await db.insert(bioConnectionsTable).values({
    organizationId: orgId,
    fromElementId,
    toElementId,
    relationType:  (b.relationType as string | undefined) ?? null,
  }).returning();
  res.json(mapConn(row));
});

router.put("/organizations/:orgId/bio-connections/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const [row] = await db.update(bioConnectionsTable).set({
    relationType: (b.relationType as string | null | undefined) ?? null,
    updatedAt:    new Date(),
  }).where(and(eq(bioConnectionsTable.id, id), eq(bioConnectionsTable.organizationId, orgId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapConn(row));
});

router.delete("/organizations/:orgId/bio-connections/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(bioConnectionsTable).where(and(eq(bioConnectionsTable.id, id), eq(bioConnectionsTable.organizationId, orgId)));
  res.status(204).send();
});

// ─── ISSUES ───────────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-issues", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(bioIssuesTable).where(eq(bioIssuesTable.organizationId, orgId));
  res.json({ items: rows.map(mapIssue) });
});

router.post("/organizations/:orgId/bio-issues", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const elIds = Array.isArray(b.elementIds) ? (b.elementIds as number[]) : [];
  const [row] = await db.insert(bioIssuesTable).values({
    organizationId: orgId,
    name:           (b.name        as string | undefined) ?? null,
    description:    (b.description as string | undefined) ?? null,
    issueType:      (b.issueType   as string | undefined) ?? null,
    importance:     (b.importance  as number | undefined) ?? null,
    probability:    (b.probability as number | undefined) ?? null,
    urgency:        (b.urgency     as number | undefined) ?? null,
    reversibility:  (b.reversibility as number | undefined) ?? null,
    comments:       (b.comments    as string | undefined) ?? null,
    chainPosition:  (b.chainPosition as string | undefined) ?? null,
    dependencyIds:  JSON.stringify(elIds),
    posX:           (b.x as number | undefined) ?? null,
    posY:           (b.y as number | undefined) ?? null,
  }).returning();
  res.json(mapIssue(row));
});

router.post("/organizations/:orgId/bio-issues/generate", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const elements    = await db.select().from(bioDependenciesTable).where(eq(bioDependenciesTable.organizationId, orgId));
  const connections = await db.select().from(bioConnectionsTable).where(eq(bioConnectionsTable.organizationId, orgId));

  if (elements.length === 0) { res.json({ suggestions: [] }); return; }

  const elementList = elements.map(e =>
    `- ID ${e.id} | "${e.name ?? "Sans nom"}" | ${e.category ?? "?"}${e.subCategory ? ` / ${e.subCategory}` : ""} | Position: ${e.chainPosition ?? "?"} | Dépendance: ${e.dependencyLevel ?? "?"}/5 | Maîtrise: ${e.masteryLevel ?? "?"}/5`
  ).join("\n");

  const connList = connections.length > 0
    ? connections.map((c) => {
        const from = elements.find((e) => e.id === c.fromElementId);
        const to   = elements.find((e) => e.id === c.toElementId);
        return `- "${from?.name ?? "ID " + c.fromElementId}" → "${to?.name ?? "ID " + c.toElementId}" (${c.relationType ?? "connexion"})`;
      }).join("\n")
    : "Aucune connexion définie.";

  const prompt = `Tu es un expert RSE spécialisé en biodiversité et services écosystémiques. Voici les éléments d'activité d'une entreprise et leurs connexions :

ÉLÉMENTS D'ACTIVITÉ :
${elementList}

CONNEXIONS :
${connList}

Regroupe ces éléments en enjeux RSE biodiversité cohérents (4 à 8 enjeux maximum). Chaque enjeu doit avoir un titre professionnel et synthétique.

Réponds UNIQUEMENT avec un JSON valide, sans commentaires ni markdown :
{
  "suggestions": [
    {
      "name": "Nom court et professionnel de l'enjeu",
      "description": "Description en 1-2 phrases",
      "elementIds": [1, 2],
      "chainPosition": "amont|in-situ|aval",
      "importance": 3
    }
  ]
}

chainPosition doit refléter la position majoritaire des éléments du groupe.
importance de 1 (faible) à 5 (critique) selon le niveau de dépendance moyen et les connexions.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  let parsed: { suggestions: Array<{ name: string; description?: string | null; elementIds: number[]; chainPosition?: string | null; importance?: number | null }> };
  try { parsed = JSON.parse(text) as typeof parsed; } catch { parsed = { suggestions: [] }; }
  res.json(parsed);
});

router.put("/organizations/:orgId/bio-issues/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const elIds = Array.isArray(b.elementIds) ? (b.elementIds as number[]) : undefined;
  const updates: Partial<typeof bioIssuesTable.$inferInsert> = {
    name:          (b.name          as string | null | undefined) ?? null,
    description:   (b.description   as string | null | undefined) ?? null,
    issueType:     (b.issueType     as string | null | undefined) ?? null,
    importance:    (b.importance    as number | null | undefined) ?? null,
    probability:   (b.probability   as number | null | undefined) ?? null,
    urgency:       (b.urgency       as number | null | undefined) ?? null,
    reversibility: (b.reversibility as number | null | undefined) ?? null,
    comments:      (b.comments      as string | null | undefined) ?? null,
    chainPosition: (b.chainPosition as string | null | undefined) ?? null,
    updatedAt:     new Date(),
  };
  if (elIds !== undefined) updates.dependencyIds = JSON.stringify(elIds);
  if (b.x !== undefined) updates.posX = (b.x as number | null) ?? null;
  if (b.y !== undefined) updates.posY = (b.y as number | null) ?? null;
  const [row] = await db.update(bioIssuesTable).set(updates)
    .where(and(eq(bioIssuesTable.id, id), eq(bioIssuesTable.organizationId, orgId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapIssue(row));
});

router.delete("/organizations/:orgId/bio-issues/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(bioIssuesTable).where(and(eq(bioIssuesTable.id, id), eq(bioIssuesTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;

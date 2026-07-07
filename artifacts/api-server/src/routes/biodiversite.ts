import { Router } from "express";
import { db, bioDependenciesTable, bioIssuesTable, membersTable } from "@workspace/db";
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
    element:         row.element ?? null,
    description:     row.description ?? null,
    dependencyLevel: row.dependencyLevel ?? null,
    masteryLevel:    row.masteryLevel ?? null,
    comments:        row.comments ?? null,
    createdAt:       row.createdAt.toISOString(),
    updatedAt:       row.updatedAt.toISOString(),
  };
}

function mapIssue(row: typeof bioIssuesTable.$inferSelect) {
  return {
    id:             row.id,
    organizationId: row.organizationId,
    name:           row.name ?? null,
    description:    row.description ?? null,
    importance:     row.importance ?? null,
    comments:       row.comments ?? null,
    dependencyIds:  row.dependencyIds ? (JSON.parse(row.dependencyIds) as number[]) : [],
    chainPosition:  row.chainPosition ?? null,
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
  const [row] = await db.insert(bioDependenciesTable).values({
    organizationId:  orgId,
    name:            (b.name as string | undefined) ?? null,
    category:        (b.category as string | undefined) ?? null,
    subCategory:     (b.subCategory as string | undefined) ?? null,
    chainPosition:   (b.chainPosition as string | undefined) ?? null,
    element:         (b.element as string | undefined) ?? null,
    description:     (b.description as string | undefined) ?? null,
    dependencyLevel: (b.dependencyLevel as number | undefined) ?? null,
    masteryLevel:    (b.masteryLevel as number | undefined) ?? null,
    comments:        (b.comments as string | undefined) ?? null,
  }).returning();
  res.json(mapDep(row));
});

router.get("/organizations/:orgId/bio-dependencies/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.select().from(bioDependenciesTable).where(and(eq(bioDependenciesTable.id, id), eq(bioDependenciesTable.organizationId, orgId))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDep(row));
});

router.put("/organizations/:orgId/bio-dependencies/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const [row] = await db.update(bioDependenciesTable).set({
    name:            (b.name as string | null | undefined) ?? null,
    category:        (b.category as string | null | undefined) ?? null,
    subCategory:     (b.subCategory as string | null | undefined) ?? null,
    chainPosition:   (b.chainPosition as string | null | undefined) ?? null,
    element:         (b.element as string | null | undefined) ?? null,
    description:     (b.description as string | null | undefined) ?? null,
    dependencyLevel: (b.dependencyLevel as number | null | undefined) ?? null,
    masteryLevel:    (b.masteryLevel as number | null | undefined) ?? null,
    comments:        (b.comments as string | null | undefined) ?? null,
    updatedAt:       new Date(),
  }).where(and(eq(bioDependenciesTable.id, id), eq(bioDependenciesTable.organizationId, orgId))).returning();
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
  const depIds = Array.isArray(b.dependencyIds) ? (b.dependencyIds as number[]) : [];
  const [row] = await db.insert(bioIssuesTable).values({
    organizationId: orgId,
    name:           (b.name as string | undefined) ?? null,
    description:    (b.description as string | undefined) ?? null,
    importance:     (b.importance as number | undefined) ?? null,
    comments:       (b.comments as string | undefined) ?? null,
    dependencyIds:  JSON.stringify(depIds),
    chainPosition:  (b.chainPosition as string | undefined) ?? null,
  }).returning();
  res.json(mapIssue(row));
});

router.put("/organizations/:orgId/bio-issues/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const depIds = Array.isArray(b.dependencyIds) ? (b.dependencyIds as number[]) : [];
  const [row] = await db.update(bioIssuesTable).set({
    name:           (b.name as string | null | undefined) ?? null,
    description:    (b.description as string | null | undefined) ?? null,
    importance:     (b.importance as number | null | undefined) ?? null,
    comments:       (b.comments as string | null | undefined) ?? null,
    dependencyIds:  JSON.stringify(depIds),
    chainPosition:  (b.chainPosition as string | null | undefined) ?? null,
    updatedAt:      new Date(),
  }).where(and(eq(bioIssuesTable.id, id), eq(bioIssuesTable.organizationId, orgId))).returning();
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

// ─── AI GENERATE ──────────────────────────────────────────────────────────────

router.post("/organizations/:orgId/bio-issues/generate", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const deps = await db.select().from(bioDependenciesTable).where(eq(bioDependenciesTable.organizationId, orgId));
  if (deps.length === 0) { res.json({ suggestions: [] }); return; }

  const depList = deps.map((d) =>
    `- ID ${d.id} | ${d.category ?? "?"} / ${d.subCategory ?? "?"} | ${d.name ?? "Sans nom"} | Position: ${d.chainPosition ?? "?"} | Niveau dépendance: ${d.dependencyLevel ?? "?"}/5`
  ).join("\n");

  const prompt = `Tu es un expert RSE spécialisé en biodiversité. Voici la liste des dépendances à la biodiversité d'une entreprise :

${depList}

Regroupe ces dépendances en enjeux cohérents (4 à 8 enjeux maximum). Chaque enjeu doit regrouper des dépendances similaires ou connexes.

Réponds UNIQUEMENT avec un JSON valide, sans commentaires, sans markdown, avec ce format exact :
{
  "suggestions": [
    {
      "name": "Nom court et professionnel de l'enjeu",
      "description": "Description en 1-2 phrases",
      "dependencyIds": [id1, id2],
      "chainPosition": "amont|in-situ|aval"
    }
  ]
}

chainPosition doit refléter la position majoritaire des dépendances du groupe. Propose des noms d'enjeux professionnels et synthétiques.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  const parsed = JSON.parse(text) as { suggestions: Array<{ name: string; description: string; dependencyIds: number[]; chainPosition: string }> };
  res.json(parsed);
});

export default router;

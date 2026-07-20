import { Router } from "express";
import { db, bioDependenciesTable, bioConnectionsTable, bioIssuesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
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
    family:         row.family        ?? null,
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

router.get("/organizations/:orgId/bio-dependencies", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const rows = await db.select().from(bioDependenciesTable).where(scopeToExercise(bioDependenciesTable, req));
  res.json({ items: rows.map(mapDep) });
});

router.post("/organizations/:orgId/bio-dependencies", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : [];
  const [row] = await db.insert(bioDependenciesTable).values(
    withExerciseValues(req, {
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
    }),
  ).returning();
  res.json(mapDep(row));
});

router.get("/organizations/:orgId/bio-dependencies/:id", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(bioDependenciesTable)
    .where(scopeToExercise(bioDependenciesTable, req, eq(bioDependenciesTable.id, id))).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDep(row));
});

router.put("/organizations/:orgId/bio-dependencies/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body as Record<string, unknown>;
  const updates: Partial<typeof bioDependenciesTable.$inferInsert> = { updatedAt: new Date() };
  if (b.name !== undefined)            updates.name            = (b.name            as string | null) ?? null;
  if (b.category !== undefined)        updates.category        = (b.category        as string | null) ?? null;
  if (b.subCategory !== undefined)     updates.subCategory     = (b.subCategory     as string | null) ?? null;
  if (b.chainPosition !== undefined)   updates.chainPosition   = (b.chainPosition   as string | null) ?? null;
  if (b.dependencyLevel !== undefined) updates.dependencyLevel = (b.dependencyLevel as number | null) ?? null;
  if (b.masteryLevel !== undefined)    updates.masteryLevel    = (b.masteryLevel    as number | null) ?? null;
  if (b.comments !== undefined)        updates.comments        = (b.comments        as string | null) ?? null;
  if (b.documentIds !== undefined)     updates.documentIds     = JSON.stringify(Array.isArray(b.documentIds) ? b.documentIds : []);
  if (b.x !== undefined)               updates.posX            = (b.x as number | null) ?? null;
  if (b.y !== undefined)               updates.posY            = (b.y as number | null) ?? null;
  const [row] = await db.update(bioDependenciesTable).set(updates)
    .where(scopeToExercise(bioDependenciesTable, req, eq(bioDependenciesTable.id, id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapDep(row));
});

router.delete("/organizations/:orgId/bio-dependencies/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bioDependenciesTable).where(scopeToExercise(bioDependenciesTable, req, eq(bioDependenciesTable.id, id)));
  res.status(204).send();
});

// ─── CONNECTIONS ───────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-connections", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const rows = await db.select().from(bioConnectionsTable).where(scopeToExercise(bioConnectionsTable, req));
  res.json({ items: rows.map(mapConn) });
});

router.post("/organizations/:orgId/bio-connections", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const fromElementId = Number(b.fromElementId);
  const toElementId   = Number(b.toElementId);
  if (isNaN(fromElementId) || isNaN(toElementId)) { res.status(400).json({ error: "Invalid element ids" }); return; }
  const [row] = await db.insert(bioConnectionsTable).values(
    withExerciseValues(req, {
      fromElementId,
      toElementId,
      relationType: (b.relationType as string | undefined) ?? null,
    }),
  ).returning();
  res.json(mapConn(row));
});

router.put("/organizations/:orgId/bio-connections/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body as Record<string, unknown>;
  const [row] = await db.update(bioConnectionsTable).set({
    relationType: (b.relationType as string | null | undefined) ?? null,
    updatedAt:    new Date(),
  }).where(scopeToExercise(bioConnectionsTable, req, eq(bioConnectionsTable.id, id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapConn(row));
});

router.delete("/organizations/:orgId/bio-connections/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bioConnectionsTable).where(scopeToExercise(bioConnectionsTable, req, eq(bioConnectionsTable.id, id)));
  res.status(204).send();
});

// ─── ISSUES ───────────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-issues", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const rows = await db.select().from(bioIssuesTable).where(scopeToExercise(bioIssuesTable, req));
  res.json({ items: rows.map(mapIssue) });
});

router.post("/organizations/:orgId/bio-issues", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const elIds = Array.isArray(b.elementIds) ? (b.elementIds as number[]) : [];
  const [row] = await db.insert(bioIssuesTable).values(
    withExerciseValues(req, {
      name:           (b.name        as string | undefined) ?? null,
      family:         (b.family      as string | undefined) ?? null,
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
    }),
  ).returning();
  res.json(mapIssue(row));
});

router.post("/organizations/:orgId/bio-issues/group", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const issues = await db.select().from(bioIssuesTable).where(scopeToExercise(bioIssuesTable, req));

  if (issues.length === 0) { res.json({ groups: [] }); return; }

  const issueList = issues.map(i =>
    `- ID ${i.id} | "${i.name ?? "Sans nom"}" | Type: ${i.issueType ?? "?"} | Position: ${i.chainPosition ?? "?"} | Importance: ${i.importance ?? "?"}/5 | Description: ${i.description ?? ""}`
  ).join("\n");

  const prompt = `Tu es un expert RSE spécialisé en biodiversité. Voici une liste d'enjeux biodiversité saisis par une entreprise :

${issueList}

Regroupe ces enjeux par thématique en fusionnant les doublons, synonymes et sujets proches. Donne un nom court et professionnel à chaque groupe (ex : "Eau", "Climat", "Biodiversité locale", "Achats responsables").

Réponds UNIQUEMENT avec un JSON valide, sans commentaires ni markdown :
{
  "groups": [
    {
      "name": "Nom court du thème",
      "issueIds": [1, 2, 3]
    }
  ]
}

Chaque enjeu doit appartenir à exactement un groupe. Tous les IDs doivent être présents.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  let parsed: { groups: Array<{ name: string; issueIds: number[] }> };
  try { parsed = JSON.parse(text) as typeof parsed; } catch { parsed = { groups: [] }; }
  res.json(parsed);
});

router.post("/organizations/:orgId/bio-issues/generate", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const elements    = await db.select().from(bioDependenciesTable).where(scopeToExercise(bioDependenciesTable, req));
  const connections = await db.select().from(bioConnectionsTable).where(scopeToExercise(bioConnectionsTable, req));

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

router.put("/organizations/:orgId/bio-issues/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body as Record<string, unknown>;
  const elIds = Array.isArray(b.elementIds) ? (b.elementIds as number[]) : undefined;
  const updates: Partial<typeof bioIssuesTable.$inferInsert> = { updatedAt: new Date() };
  if (b.name          !== undefined) updates.name          = (b.name          as string | null) ?? null;
  if (b.family        !== undefined) updates.family        = (b.family        as string | null) ?? null;
  if (b.description   !== undefined) updates.description   = (b.description   as string | null) ?? null;
  if (b.issueType     !== undefined) updates.issueType     = (b.issueType     as string | null) ?? null;
  if (b.importance    !== undefined) updates.importance    = (b.importance    as number | null) ?? null;
  if (b.probability   !== undefined) updates.probability   = (b.probability   as number | null) ?? null;
  if (b.urgency       !== undefined) updates.urgency       = (b.urgency       as number | null) ?? null;
  if (b.reversibility !== undefined) updates.reversibility = (b.reversibility as number | null) ?? null;
  if (b.comments      !== undefined) updates.comments      = (b.comments      as string | null) ?? null;
  if (b.chainPosition !== undefined) updates.chainPosition = (b.chainPosition as string | null) ?? null;
  if (elIds           !== undefined) updates.dependencyIds = JSON.stringify(elIds);
  if (b.x             !== undefined) updates.posX          = (b.x as number | null) ?? null;
  if (b.y             !== undefined) updates.posY          = (b.y as number | null) ?? null;
  const [row] = await db.update(bioIssuesTable).set(updates)
    .where(scopeToExercise(bioIssuesTable, req, eq(bioIssuesTable.id, id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapIssue(row));
});

router.delete("/organizations/:orgId/bio-issues/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bioIssuesTable).where(scopeToExercise(bioIssuesTable, req, eq(bioIssuesTable.id, id)));
  res.status(204).send();
});

export default router;

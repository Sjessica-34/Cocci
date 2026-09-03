import { Router } from "express";
import { db, bioDependenciesTable, bioConnectionsTable, bioIssuesTable, exercisesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";
import { getSubsidiaryExercises } from "../lib/consolidation";

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
    importanceOrg:   row.importanceOrg ?? null,
    importanceBio:   row.importanceBio ?? null,
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
    importanceOrg:  row.importanceOrg ?? null,
    importanceBio:  row.importanceBio ?? null,
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
  const subExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
  if (subExercises.length > 0) {
    const [rootRows, ...subRowArrays] = await Promise.all([
      db.select().from(bioDependenciesTable).where(scopeToExercise(bioDependenciesTable, req)),
      ...subExercises.map(({ orgId, exerciseId }) =>
        db.select().from(bioDependenciesTable)
          .where(and(eq(bioDependenciesTable.organizationId, orgId), eq(bioDependenciesTable.exerciseId, exerciseId)))
      ),
    ]);
    const allRows = [rootRows, ...subRowArrays].flat();
    res.json({ items: allRows.map(mapDep) });
    return;
  }
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
      importanceOrg:   (b.importanceOrg as number | undefined) ?? null,
      importanceBio:   (b.importanceBio as number | undefined) ?? null,
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
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : undefined;
  const updates: Partial<typeof bioDependenciesTable.$inferInsert> = { updatedAt: new Date() };
  if (b.name            !== undefined) updates.name            = (b.name            as string | null) ?? null;
  if (b.category        !== undefined) updates.category        = (b.category        as string | null) ?? null;
  if (b.subCategory     !== undefined) updates.subCategory     = (b.subCategory     as string | null) ?? null;
  if (b.chainPosition   !== undefined) updates.chainPosition   = (b.chainPosition   as string | null) ?? null;
  if (b.dependencyLevel !== undefined) updates.dependencyLevel = (b.dependencyLevel as number | null) ?? null;
  if (b.masteryLevel    !== undefined) updates.masteryLevel    = (b.masteryLevel    as number | null) ?? null;
  if (b.importanceOrg   !== undefined) updates.importanceOrg   = (b.importanceOrg   as number | null) ?? null;
  if (b.importanceBio   !== undefined) updates.importanceBio   = (b.importanceBio   as number | null) ?? null;
  if (b.comments        !== undefined) updates.comments        = (b.comments        as string | null) ?? null;
  if (docIds            !== undefined) updates.documentIds     = JSON.stringify(docIds);
  if (b.x               !== undefined) updates.posX            = (b.x as number | null) ?? null;
  if (b.y               !== undefined) updates.posY            = (b.y as number | null) ?? null;
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

// ─── CONNECTIONS ──────────────────────────────────────────────────────────────

router.get("/organizations/:orgId/bio-connections", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const subExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
  if (subExercises.length > 0) {
    const [rootRows, ...subRowArrays] = await Promise.all([
      db.select().from(bioConnectionsTable).where(scopeToExercise(bioConnectionsTable, req)),
      ...subExercises.map(({ orgId, exerciseId }) =>
        db.select().from(bioConnectionsTable)
          .where(and(eq(bioConnectionsTable.organizationId, orgId), eq(bioConnectionsTable.exerciseId, exerciseId)))
      ),
    ]);
    const allRows = [rootRows, ...subRowArrays].flat();
    res.json({ items: allRows.map(mapConn) });
    return;
  }
  const rows = await db.select().from(bioConnectionsTable).where(scopeToExercise(bioConnectionsTable, req));
  res.json({ items: rows.map(mapConn) });
});

router.post("/organizations/:orgId/bio-connections", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const [row] = await db.insert(bioConnectionsTable).values(
    withExerciseValues(req, {
      fromElementId: b.fromElementId as number,
      toElementId:   b.toElementId   as number,
      relationType:  (b.relationType as string | undefined) ?? null,
    }),
  ).returning();
  res.json(mapConn(row));
});

router.put("/organizations/:orgId/bio-connections/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const b  = req.body as Record<string, unknown>;
  const [row] = await db.update(bioConnectionsTable)
    .set({ relationType: (b.relationType as string | null) ?? null, updatedAt: new Date() })
    .where(scopeToExercise(bioConnectionsTable, req, eq(bioConnectionsTable.id, id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapConn(row));
});

router.delete("/organizations/:orgId/bio-connections/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
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
      name:          (b.name          as string | undefined) ?? null,
      family:        (b.family        as string | undefined) ?? null,
      description:   (b.description   as string | undefined) ?? null,
      issueType:     (b.issueType     as string | undefined) ?? null,
      importance:    (b.importance    as number | undefined) ?? null,
      probability:   (b.probability   as number | undefined) ?? null,
      urgency:       (b.urgency       as number | undefined) ?? null,
      reversibility: (b.reversibility as number | undefined) ?? null,
      importanceOrg: (b.importanceOrg as number | undefined) ?? null,
      importanceBio: (b.importanceBio as number | undefined) ?? null,
      comments:      (b.comments      as string | undefined) ?? null,
      chainPosition: (b.chainPosition as string | undefined) ?? null,
      dependencyIds: JSON.stringify(elIds),
    }),
  ).returning();
  res.json(mapIssue(row));
});

// ─── GENERATE (IA) ────────────────────────────────────────────────────────────

router.post("/organizations/:orgId/bio-issues/generate", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;

  // Collect deps from the current org+exercise
  let allDeps = await db.select().from(bioDependenciesTable).where(scopeToExercise(bioDependenciesTable, req));

  // Group mode: gather deps from subsidiary orgs (same exercise year)
  const subsidiaryOrgIds = Array.isArray(b.subsidiaryOrgIds)
    ? (b.subsidiaryOrgIds as number[]).filter(Number.isFinite)
    : [];

  if (subsidiaryOrgIds.length > 0) {
    // Find exercises for each subsidiary that match the current exercise year
    const currentYear = req.exercise!.year;
    const subExercises = await db.select().from(exercisesTable)
      .where(and(
        inArray(exercisesTable.organizationId, subsidiaryOrgIds),
        eq(exercisesTable.year, currentYear),
      ));

    if (subExercises.length > 0) {
      const subExIds = subExercises.map(e => e.id);
      const subOrgIds = subExercises.map(e => e.organizationId);
      const subDeps = await db.select().from(bioDependenciesTable)
        .where(and(
          inArray(bioDependenciesTable.organizationId, subOrgIds),
          inArray(bioDependenciesTable.exerciseId, subExIds),
        ));
      allDeps = [...allDeps, ...subDeps];
    }
  }

  if (allDeps.length === 0) { res.json({ items: [] }); return; }

  // Build dep list for AI prompt
  const depList = allDeps.map(e => {
    const service   = e.subCategory ?? e.category ?? "service inconnu";
    const nom       = e.name ? `"${e.name}"` : `(${service})`;
    const chain     = e.chainPosition ?? "non défini";
    const impOrg    = e.importanceOrg ? `importance org ${e.importanceOrg}/5` : "importance org non définie";
    const impBio    = e.importanceBio ? `impact biodiversité ${e.importanceBio}/5` : "impact bio non défini";
    const desc      = e.comments ? ` — ${e.comments}` : "";
    return `- ID ${e.id} | Service : ${service} | Nom : ${nom} | Chaîne : ${chain} | ${impOrg} | ${impBio}${desc}`;
  }).join("\n");

  const isGroup = subsidiaryOrgIds.length > 0;

  const prompt = `Tu es un expert RSE spécialisé en biodiversité et services écosystémiques (cadre IPBES/TEEB).

${isGroup ? "Un groupe d'entreprises a consolidé" : "Une entreprise a identifié"} les dépendances suivantes vis-à-vis des services écosystémiques :

DÉPENDANCES AUX SERVICES ÉCOSYSTÉMIQUES :
${depList}

À partir de ces dépendances, génère entre 6 et 12 ENJEUX STRATÉGIQUES DE BIODIVERSITÉ.

Règles de génération :
- Regrouper les dépendances qui traitent du même sujet écosystémique (eau, pollinisateurs, sols, habitats, biomasse, etc.)
- Formuler chaque enjeu de façon stratégique et professionnelle (ex : "Sécuriser l'accès durable à la ressource en eau")
- ${isGroup ? "Consolider les dépendances similaires de différentes entités en UN SEUL enjeu groupe" : "Un enjeu peut regrouper plusieurs dépendances du même thème"}
- chainPosition : position dominante dans la chaîne de valeur (in-situ, amont, ou aval) selon les dépendances du groupe
- importanceOrg (1-5) : prendre le MAX de l'importance organisationnelle des dépendances du groupe
- importanceBio (1-5) : prendre le MAX de l'impact biodiversité des dépendances du groupe
- Si importanceOrg ou importanceBio n'est pas défini dans les dépendances, estimer en fonction du service et de la criticité

Réponds UNIQUEMENT avec un JSON valide, sans commentaires ni markdown :
{
  "issues": [
    {
      "name": "Nom de l'enjeu stratégique",
      "description": "Description en 1-2 phrases expliquant le risque ou l'enjeu pour l'organisation",
      "chainPosition": "amont",
      "importanceOrg": 4,
      "importanceBio": 5,
      "dependencyIds": [1, 2, 3]
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  // Strip optional markdown code fences (```json ... ```) that Claude sometimes adds
  const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  let parsed: { issues: Array<{ name: string; description?: string | null; chainPosition?: string | null; importanceOrg?: number | null; importanceBio?: number | null; dependencyIds: number[] }> };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch (err) {
    req.log.error({ err, text }, "bio-issues generate: JSON.parse failed");
    parsed = { issues: [] };
  }

  // Helper: compute max from deps for a given field when AI leaves it null
  function maxFromDeps(depIds: number[], field: "importanceOrg" | "importanceBio"): number | null {
    const values = depIds
      .map(id => allDeps.find(d => d.id === id))
      .filter(Boolean)
      .map(d => d![field])
      .filter((v): v is number => typeof v === "number" && v > 0);
    return values.length > 0 ? Math.max(...values) : null;
  }

  // Helper: dominant chain position from deps
  function dominantChain(depIds: number[]): string | null {
    const counts: Record<string, number> = {};
    for (const id of depIds) {
      const dep = allDeps.find(d => d.id === id);
      if (dep?.chainPosition) counts[dep.chainPosition] = (counts[dep.chainPosition] ?? 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => a[1] >= b[1] ? a : b)[0];
  }

  // Delete existing issues and insert new ones
  await db.delete(bioIssuesTable).where(scopeToExercise(bioIssuesTable, req));

  const created = [];
  for (const s of parsed.issues ?? []) {
    const depIds = Array.isArray(s.dependencyIds) ? s.dependencyIds : [];
    const importanceOrg = s.importanceOrg ?? maxFromDeps(depIds, "importanceOrg");
    const importanceBio = s.importanceBio ?? maxFromDeps(depIds, "importanceBio");
    const chainPosition = s.chainPosition ?? dominantChain(depIds);

    const [row] = await db.insert(bioIssuesTable).values(
      withExerciseValues(req, {
        name:          s.name ?? null,
        description:   s.description ?? null,
        chainPosition: chainPosition ?? null,
        importanceOrg: importanceOrg ?? null,
        importanceBio: importanceBio ?? null,
        dependencyIds: JSON.stringify(depIds),
      }),
    ).returning();
    created.push(mapIssue(row));
  }
  res.json({ items: created });
});

// ─── GROUP (legacy — kept for compatibility) ──────────────────────────────────

router.post("/organizations/:orgId/bio-issues/group", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const issues = await db.select().from(bioIssuesTable).where(scopeToExercise(bioIssuesTable, req));
  if (issues.length === 0) { res.json({ groups: [] }); return; }

  const issueList = issues.map(i => `- ID ${i.id} : ${i.name ?? "(sans nom)"}`).join("\n");
  const prompt = `Regroupe ces enjeux par thématique. Donne un nom court à chaque groupe.
Réponds uniquement en JSON : { "groups": [{ "name": "string", "issueIds": [1,2] }] }

ENJEUX :
${issueList}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  let parsed: { groups: Array<{ name: string; issueIds: number[] }> };
  try { parsed = JSON.parse(text) as typeof parsed; } catch { parsed = { groups: [] }; }
  res.json({ groups: parsed.groups ?? [] });
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
  if (b.importanceOrg !== undefined) updates.importanceOrg = (b.importanceOrg as number | null) ?? null;
  if (b.importanceBio !== undefined) updates.importanceBio = (b.importanceBio as number | null) ?? null;
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

import { Router } from "express";
import { db, membersTable, issueRatingsTable, customIssuesTable, issueAnalysesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ISSUE_LIBRARY } from "../lib/issueLibrary";

const router = Router();

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

// GET /organizations/:orgId/issues
router.get("/organizations/:orgId/issues", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [ratings, customs] = await Promise.all([
    db.select().from(issueRatingsTable).where(eq(issueRatingsTable.organizationId, orgId)),
    db.select().from(customIssuesTable).where(eq(customIssuesTable.organizationId, orgId)),
  ]);

  const ratingsMap = new Map(ratings.map((r) => [r.issueKey, r]));

  const libraryItems = ISSUE_LIBRARY.map((item) => {
    const rating = ratingsMap.get(item.key);
    return {
      key: item.key,
      category: item.category,
      label: item.label,
      isCustom: false,
      customId: null,
      stakeholderScore: rating?.stakeholderScore ?? null,
      companyScore: rating?.companyScore ?? null,
      impactScore: rating?.impactScore ?? null,
      tendance: rating?.tendance ?? null,
    };
  });

  const customItems = customs.map((c) => {
    const key = `custom_${c.id}`;
    const rating = ratingsMap.get(key);
    return {
      key,
      category: c.category,
      label: c.label,
      isCustom: true,
      customId: c.id,
      stakeholderScore: rating?.stakeholderScore ?? null,
      companyScore: rating?.companyScore ?? null,
      impactScore: rating?.impactScore ?? null,
      tendance: rating?.tendance ?? null,
    };
  });

  res.json({ items: [...libraryItems, ...customItems] });
});

// PUT /organizations/:orgId/issues/ratings
router.put("/organizations/:orgId/issues/ratings", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { issueKey, stakeholderScore, companyScore, impactScore, tendance } = req.body as {
    issueKey: string;
    stakeholderScore: number | null;
    companyScore: number | null;
    impactScore: number | null;
    tendance: string | null;
  };
  if (!issueKey) { res.status(400).json({ error: "issueKey is required" }); return; }

  const [upserted] = await db
    .insert(issueRatingsTable)
    .values({ organizationId: orgId, issueKey, stakeholderScore, companyScore, impactScore, tendance })
    .onConflictDoUpdate({
      target: [issueRatingsTable.organizationId, issueRatingsTable.issueKey],
      set: {
        stakeholderScore,
        companyScore,
        impactScore,
        tendance,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(upserted);
});

// POST /organizations/:orgId/issues
router.post("/organizations/:orgId/issues", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { category, label } = req.body as { category: string; label: string };
  if (!category || !label) { res.status(400).json({ error: "category and label are required" }); return; }

  const [created] = await db
    .insert(customIssuesTable)
    .values({ organizationId: orgId, category, label })
    .returning();

  res.status(201).json(created);
});

// DELETE /organizations/:orgId/issues/custom/:issueId
router.delete("/organizations/:orgId/issues/custom/:issueId", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const issueId = parseId(req.params.issueId);
  if (!orgId || isNaN(orgId) || !issueId || isNaN(issueId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const deleted = await db
    .delete(customIssuesTable)
    .where(and(eq(customIssuesTable.id, issueId), eq(customIssuesTable.organizationId, orgId)))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  // also remove associated rating
  await db
    .delete(issueRatingsTable)
    .where(and(eq(issueRatingsTable.organizationId, orgId), eq(issueRatingsTable.issueKey, `custom_${issueId}`)));

  res.status(204).end();
});

// GET /organizations/:orgId/issues/analysis
router.get("/organizations/:orgId/issues/analysis", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [latest] = await db
    .select()
    .from(issueAnalysesTable)
    .where(eq(issueAnalysesTable.organizationId, orgId))
    .orderBy(issueAnalysesTable.createdAt)
    .limit(1);

  if (!latest) { res.status(404).json({ error: "No analysis yet" }); return; }

  res.json(JSON.parse(latest.result));
});

// POST /organizations/:orgId/issues/analyze
router.post("/organizations/:orgId/issues/analyze", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // load all rated items
  const [ratings, customs] = await Promise.all([
    db.select().from(issueRatingsTable).where(eq(issueRatingsTable.organizationId, orgId)),
    db.select().from(customIssuesTable).where(eq(customIssuesTable.organizationId, orgId)),
  ]);

  const ratingsMap = new Map(ratings.map((r) => [r.issueKey, r]));

  const labelFor = (key: string): string => {
    const lib = ISSUE_LIBRARY.find((i) => i.key === key);
    if (lib) return lib.label;
    const customId = key.startsWith("custom_") ? Number(key.replace("custom_", "")) : null;
    if (customId) return customs.find((c) => c.id === customId)?.label ?? key;
    return key;
  };

  // score = average of both scores, only keep rated items
  const scored = ratings
    .filter((r) => r.stakeholderScore != null && r.companyScore != null)
    .map((r) => ({
      key: r.issueKey,
      label: labelFor(r.issueKey),
      stakeholderScore: r.stakeholderScore!,
      companyScore: r.companyScore!,
      avgScore: (r.stakeholderScore! + r.companyScore!) / 2,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 12);

  if (scored.length < 4) {
    res.status(400).json({ error: "Notez au moins 4 enjeux avant de lancer l'analyse." });
    return;
  }

  const issueListText = scored
    .map((s, i) => `${i + 1}. ${s.label} (score PP: ${s.stakeholderScore}/5, score entreprise: ${s.companyScore}/5, moyenne: ${s.avgScore.toFixed(1)}/5)`)
    .join("\n");

  const prompt = `Tu es un expert en RSE (Responsabilité Sociétale des Entreprises) avec l'expertise d'un consultant senior.

Voici les ${scored.length} enjeux les plus matériels identifiés par cette entreprise, classés par score de matérialité (moyenne parties prenantes + entreprise) :

${issueListText}

Ta mission :
1. Regroupe ces enjeux en exactement 4 "super-enjeux" stratégiques. Chaque enjeu doit appartenir à exactement un super-enjeu. Répartis-les de la façon la plus pertinente possible (idéalement 2 à 4 enjeux par super-enjeu).
2. Pour chaque super-enjeu, génère :
   - Un titre stratégique percutant (6 à 10 mots maximum), spécifique aux enjeux regroupés
   - Un texte de synthèse de 3 à 5 lignes expliquant pourquoi ce super-enjeu est stratégique pour l'entreprise
   - La liste exacte des labels des enjeux qui le composent
   - Le score moyen du groupe (moyenne des avgScore)

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaire, avec exactement cette structure :
{
  "superIssues": [
    {
      "title": "...",
      "summary": "...",
      "issues": ["label1", "label2"],
      "avgScore": 4.2
    }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    res.status(500).json({ error: "Unexpected response from AI" });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    res.status(500).json({ error: "AI returned invalid JSON", raw: block.text.slice(0, 200) });
    return;
  }

  // save to DB
  await db
    .delete(issueAnalysesTable)
    .where(eq(issueAnalysesTable.organizationId, orgId));

  await db.insert(issueAnalysesTable).values({
    organizationId: orgId,
    result: JSON.stringify(parsed),
  });

  res.json(parsed);
});

export default router;

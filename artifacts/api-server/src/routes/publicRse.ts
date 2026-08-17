import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, pool, publicLinksTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope } from "../middlewares/exerciseScope";
import { logger } from "../lib/logger";
import { ALL_SUBCATEGORIES, COMPLETENESS_THRESHOLD, getMaturityLabel } from "@workspace/rse-referentials";
import crypto from "crypto";

const router = Router();

// ── Calcul des scores par axe E/S/G ───────────────────────────────────────────

function computeScoresByAxis(responses: Array<{ question_id: string; level: number }>) {
  const responseMap = new Map<string, number>(responses.map((r) => [r.question_id, r.level]));

  const byAxis: Record<string, number[]> = { ENV: [], SOC: [], GOV: [] };

  for (const sub of ALL_SUBCATEGORIES) {
    const totalQ = sub.questions.length;
    const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
    const completeness = totalQ > 0 ? answered / totalQ : 0;
    if (completeness < COMPLETENESS_THRESHOLD) continue;
    const sumLevels = sub.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
    const score = Math.round((sumLevels / (answered * 3)) * 100);
    byAxis[sub.categoryId]?.push(score);
  }

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  const env = avg(byAxis.ENV ?? []);
  const soc = avg(byAxis.SOC ?? []);
  const gov = avg(byAxis.GOV ?? []);

  const all = [env, soc, gov].filter((v): v is number => v !== null);
  const global = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;

  return { global, env, soc, gov };
}

// ── GET /api/public/rse/:token — public, no auth ────────────────────────────────

router.get("/public/rse/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  try {
    // 1. Résoudre le lien public via drizzle ORM
    const [link] = await db
      .select()
      .from(publicLinksTable)
      .where(eq(publicLinksTable.token, token))
      .limit(1);

    if (!link) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    const { organizationId: orgId, exerciseId } = link;

    // 2. Toutes les données en parallèle via pool.query
    const [
      orgRows,
      exerciseRows,
      diagnosticRows,
      actionPlanRows,
      labelRows,
      stakeholderCountRows,
      issueCountRows,
      reportDraftRows,
      baroCampaignRows,
    ] = await Promise.all([
      pool.query<{ id: number; name: string; logo_url: string | null; sector: string | null; size: string | null }>(
        "SELECT id, name, logo_url, sector, size FROM organizations WHERE id = $1 LIMIT 1",
        [orgId],
      ),
      pool.query<{ id: number; year: number; status: string }>(
        "SELECT id, year, status FROM exercises WHERE id = $1 LIMIT 1",
        [exerciseId],
      ),
      pool.query<{ question_id: string; level: number }>(
        "SELECT question_id, level FROM diagnostic_responses WHERE organization_id = $1 AND exercise_id = $2",
        [orgId, exerciseId],
      ),
      pool.query<{ is_checked: boolean; category: string | null; esg_pillar: string | null }>(
        `SELECT oap.is_checked, al.category, al.esg_pillar
         FROM organization_action_plans oap
         LEFT JOIN action_library al ON al.id = oap.library_action_id
         WHERE oap.organization_id = $1 AND oap.exercise_id = $2`,
        [orgId, exerciseId],
      ),
      pool.query<{ name: string | null; logo_url: string | null; holder: string | null; score: string | null }>(
        "SELECT name, logo_url, holder, score FROM labels WHERE organization_id = $1 AND exercise_id = $2",
        [orgId, exerciseId],
      ),
      pool.query<{ cnt: string }>(
        "SELECT COUNT(*) AS cnt FROM stakeholders WHERE organization_id = $1 AND exercise_id = $2",
        [orgId, exerciseId],
      ),
      pool.query<{ cnt: string }>(
        "SELECT COUNT(*) AS cnt FROM issue_ratings WHERE organization_id = $1 AND exercise_id = $2",
        [orgId, exerciseId],
      ),
      pool.query<{ generation_count: number; updated_at: Date }>(
        "SELECT generation_count, updated_at FROM rse_report_drafts WHERE organization_id = $1 AND exercise_id = $2 LIMIT 1",
        [orgId, exerciseId],
      ),
      pool.query<{ id: number; nb_collaborateurs: number | null }>(
        `SELECT id, nb_collaborateurs FROM barometre_campaigns
         WHERE organization_id = $1 AND exercise_id = $2 AND status = 'closed'
         ORDER BY close_date DESC LIMIT 1`,
        [orgId, exerciseId],
      ),
    ]);

    const org = orgRows.rows[0];
    const exercise = exerciseRows.rows[0];

    if (!org || !exercise) {
      res.status(404).json({ error: "Organization or exercise not found" });
      return;
    }

    // 3. Scores diagnostic + scores par sous-catégorie
    const scores = computeScoresByAxis(diagnosticRows.rows);

    const responseMap = new Map<string, number>(diagnosticRows.rows.map((r) => [r.question_id, r.level]));
    const subcategoryScores: Array<{
      id: string; name: string; categoryId: string;
      score: number | null; answeredCount: number; totalCount: number;
    }> = [];
    for (const sub of ALL_SUBCATEGORIES) {
      const totalQ = sub.questions.length;
      const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
      if (answered === 0) continue;
      const completeness = answered / totalQ;
      let score: number | null = null;
      if (completeness >= COMPLETENESS_THRESHOLD) {
        const sumLevels = sub.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
        score = Math.round((sumLevels / (answered * 3)) * 100);
      }
      subcategoryScores.push({ id: sub.id, name: sub.label, categoryId: sub.categoryId, score, answeredCount: answered, totalCount: totalQ });
    }

    // 4. Plan d'actions
    const actionItems = actionPlanRows.rows;
    const totalActions = actionItems.length;
    const doneActions = actionItems.filter((a) => a.is_checked).length;
    const byCategory: Record<string, { total: number; done: number }> = {};
    for (const item of actionItems) {
      const cat = item.category ?? "Autre";
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 };
      byCategory[cat].total++;
      if (item.is_checked) byCategory[cat].done++;
    }

    // 5. Labels (normalisation camelCase)
    const labels = labelRows.rows.map((l) => ({
      name: l.name,
      logoUrl: l.logo_url,
      holder: l.holder,
      score: l.score,
    }));

    // 6. Comptages
    const stakeholderCount = Number(stakeholderCountRows.rows[0]?.cnt ?? 0);
    const hasMateriaux = Number(issueCountRows.rows[0]?.cnt ?? 0) > 0;

    // 7. Rapport RSE
    const reportDraft = reportDraftRows.rows[0];

    // 8. Baromètre social
    let barometre: {
      satisfactionGlobale: number | null;
      tauxParticipation: number | null;
      nbRepondants: number | null;
      nbCollaborateurs: number | null;
    } | null = null;

    const campaign = baroCampaignRows.rows[0];

    if (campaign) {
      const [avgRows, countRows] = await Promise.all([
        pool.query<{ avg_satisfaction: string | null }>(
          `SELECT AVG(ba.scale_value) AS avg_satisfaction
           FROM barometre_responses br
           JOIN barometre_answers ba ON ba.response_id = br.id
           WHERE br.campaign_id = $1 AND br.completed = true AND ba.scale_value IS NOT NULL`,
          [campaign.id],
        ),
        pool.query<{ nb: string }>(
          "SELECT COUNT(*) AS nb FROM barometre_responses WHERE campaign_id = $1 AND completed = true",
          [campaign.id],
        ),
      ]);
      const avgSat = avgRows.rows[0]?.avg_satisfaction;
      const nb = Number(countRows.rows[0]?.nb ?? 0);
      const nbCollaborateurs = campaign.nb_collaborateurs ?? 0;
      barometre = {
        satisfactionGlobale: avgSat ? Math.round(parseFloat(avgSat) * 10) / 10 : null,
        tauxParticipation: nbCollaborateurs > 0 ? Math.round((nb / nbCollaborateurs) * 100) : null,
        nbRepondants: nb,
        nbCollaborateurs: campaign.nb_collaborateurs,
      };
    }

    // 9. Progression
    const progression = {
      diagnostic: diagnosticRows.rows.length > 0,
      stakeholders: stakeholderCount > 0,
      materiality: hasMateriaux,
      actionPlan: totalActions > 0,
      actionsInProgress: doneActions > 0,
      reportGenerated: (reportDraft?.generation_count ?? 0) > 0,
    };

    res.json({
      organization: { name: org.name, logoUrl: org.logo_url, sector: org.sector, size: org.size },
      exercise: { year: exercise.year },
      updatedAt: (reportDraft?.updated_at ?? new Date()).toISOString(),
      scores,
      actionPlan: { total: totalActions, done: doneActions, byCategory },
      labels,
      stakeholderCount,
      barometre,
      progression,
      reportGenerationCount: reportDraft?.generation_count ?? 0,
      subcategoryScores,
    });
  } catch (e) {
    logger.error({ e }, "public-rse error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /organizations/:orgId/public-link — token actuel ──────────────────────

router.get("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  const [link] = await db
    .select({ token: publicLinksTable.token, createdAt: publicLinksTable.createdAt })
    .from(publicLinksTable)
    .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)))
    .limit(1);

  res.json(link ?? null);
});

// ── POST /organizations/:orgId/public-link — génère ou retourne le token ──────

router.post("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  try {
    const [existing] = await db
      .select()
      .from(publicLinksTable)
      .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)))
      .limit(1);

    if (existing) {
      res.json({ token: existing.token });
      return;
    }

    const token = crypto.randomUUID();
    await db.insert(publicLinksTable).values({ organizationId: orgId, exerciseId: exercise.id, token });
    res.json({ token });
  } catch (e) {
    logger.error({ e }, "create public link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /organizations/:orgId/public-link — révoque le lien ────────────────

router.delete("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  await db
    .delete(publicLinksTable)
    .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)));

  res.json({ ok: true });
});

export default router;

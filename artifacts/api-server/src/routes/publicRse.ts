import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, pool, publicLinksTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireOrgMembership,
  requireOrgRole,
  requireExerciseScope,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";
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

    const { organizationId: orgId, exerciseId, customDescription, showReport } = link;

    // 2. Données de base + filiales éventuelles
    const [orgRows, exerciseRows, subsidiaryRows] = await Promise.all([
      pool.query<{ id: number; name: string; logo_url: string | null; sector: string | null; size: string | null }>(
        "SELECT id, name, logo_url, sector, size FROM organizations WHERE id = $1 LIMIT 1",
        [orgId],
      ),
      pool.query<{ id: number; year: number; status: string }>(
        "SELECT id, year, status FROM exercises WHERE id = $1 LIMIT 1",
        [exerciseId],
      ),
      // Filiales directes (pour mode groupe consolidé)
      pool.query<{ id: number }>(
        "SELECT id FROM organizations WHERE parent_id = $1",
        [orgId],
      ),
    ]);

    const org = orgRows.rows[0];
    const exercise = exerciseRows.rows[0];

    if (!org || !exercise) {
      res.status(404).json({ error: "Organization or exercise not found" });
      return;
    }

    // 3. Charger les données directes de l'org
    const [
      diagnosticRows,
      actionPlanRows,
      labelRows,
      stakeholderCountRows,
      issueCountRows,
      reportDraftRows,
      baroCampaignRows,
      responsiblePurchaseRows,
      nrResponseRows,
      diversityRows,
    ] = await Promise.all([
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
      pool.query<{
        category: string;
        amount: string;
        responsible_percent: number;
        local_percent: number;
        circular_percent: number;
      }>(
        `SELECT category, amount, responsible_percent, local_percent, circular_percent
         FROM responsible_purchases
         WHERE organization_id = $1 AND exercise_id = $2`,
        [orgId, exerciseId],
      ),
      pool.query<{ criterion_id: string; checked: boolean }>(
        `SELECT criterion_id, checked
         FROM nr_responses
         WHERE organization_id = $1 AND exercise_id = $2`,
        [orgId, exerciseId],
      ),
      pool.query<{ nb_hommes: number | null; nb_femmes: number | null }>(
        `SELECT nb_hommes, nb_femmes
         FROM employment_diversity
         WHERE organization_id = $1 AND exercise_id = $2`,
        [orgId, exerciseId],
      ),
    ]);

    // 4. Si l'org est un groupe sans données propres → consolider les filiales
    const subsidiaryIds = subsidiaryRows.rows.map((r) => r.id);
    let allDiagnosticRows = diagnosticRows.rows;
    let allActionPlanRows = actionPlanRows.rows;
    let allLabelRows = labelRows.rows;
    let allStakeholderCount = Number(stakeholderCountRows.rows[0]?.cnt ?? 0);
    let hasMateriaux = Number(issueCountRows.rows[0]?.cnt ?? 0) > 0;
    let allResponsiblePurchaseRows = responsiblePurchaseRows.rows;
    let allNrResponseRows = nrResponseRows.rows;
    let allDiversityRows = diversityRows.rows;

    if (diagnosticRows.rows.length === 0 && subsidiaryIds.length > 0) {
      // Récupérer l'exercice actif de chaque filiale puis agréger leurs données
      const subExercisesRes = await pool.query<{ organization_id: number; id: number }>(
        `SELECT organization_id, id FROM exercises
         WHERE organization_id = ANY($1) AND status = 'active'
         ORDER BY organization_id`,
        [subsidiaryIds],
      );
      const subExercises = subExercisesRes.rows; // [{ organization_id, id }]

      if (subExercises.length > 0) {
        // Construire des filtres OR pour chaque (org_id, exercise_id)
        const pairs = subExercises.map((_, i) => `(organization_id = $${i * 2 + 1} AND exercise_id = $${i * 2 + 2})`).join(" OR ");
        const flatParams = subExercises.flatMap((e) => [e.organization_id, e.id]);

        const [
          subDiagRows,
          subActionRows,
          subLabelRows,
          subStakeholderRows,
          subIssueRows,
          subResponsiblePurchaseRows,
          subNrResponseRows,
          subDiversityRows,
        ] = await Promise.all([
          pool.query<{ question_id: string; level: number }>(
            `SELECT question_id, level FROM diagnostic_responses WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{ is_checked: boolean; category: string | null; esg_pillar: string | null }>(
            `SELECT oap.is_checked, al.category, al.esg_pillar
             FROM organization_action_plans oap
             LEFT JOIN action_library al ON al.id = oap.library_action_id
             WHERE ${pairs.replace(/organization_id/g, "oap.organization_id").replace(/exercise_id/g, "oap.exercise_id")}`,
            flatParams,
          ),
          pool.query<{ name: string | null; logo_url: string | null; holder: string | null; score: string | null }>(
            `SELECT name, logo_url, holder, score FROM labels WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{ cnt: string }>(
            `SELECT COUNT(*) AS cnt FROM stakeholders WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{ cnt: string }>(
            `SELECT COUNT(*) AS cnt FROM issue_ratings WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{
            category: string;
            amount: string;
            responsible_percent: number;
            local_percent: number;
            circular_percent: number;
          }>(
            `SELECT category, amount, responsible_percent, local_percent, circular_percent
             FROM responsible_purchases
             WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{ criterion_id: string; checked: boolean }>(
            `SELECT criterion_id, checked FROM nr_responses WHERE ${pairs}`,
            flatParams,
          ),
          pool.query<{ nb_hommes: number | null; nb_femmes: number | null }>(
            `SELECT nb_hommes, nb_femmes FROM employment_diversity WHERE ${pairs}`,
            flatParams,
          ),
        ]);

        // Consolider : pour le diagnostic on fait la moyenne des questions par catégorie
        // On agrège en conservant la réponse la plus récente par question_id (dernière filiale)
        const consolidatedMap = new Map<string, number[]>();
        for (const row of subDiagRows.rows) {
          if (!consolidatedMap.has(row.question_id)) consolidatedMap.set(row.question_id, []);
          consolidatedMap.get(row.question_id)!.push(row.level);
        }
        allDiagnosticRows = Array.from(consolidatedMap.entries()).map(([question_id, levels]) => ({
          question_id,
          level: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length),
        }));

        allActionPlanRows = [...allActionPlanRows, ...subActionRows.rows];
        allLabelRows = [...allLabelRows, ...subLabelRows.rows];
        allStakeholderCount += Number(subStakeholderRows.rows[0]?.cnt ?? 0);
        hasMateriaux = hasMateriaux || Number(subIssueRows.rows[0]?.cnt ?? 0) > 0;
        allResponsiblePurchaseRows = [...allResponsiblePurchaseRows, ...subResponsiblePurchaseRows.rows];
        allNrResponseRows = [...allNrResponseRows, ...subNrResponseRows.rows];
        allDiversityRows = [...allDiversityRows, ...subDiversityRows.rows];
      }
    }

    // 5. Scores diagnostic + scores par sous-catégorie
    const scores = computeScoresByAxis(allDiagnosticRows);

    const responseMap = new Map<string, number>(allDiagnosticRows.map((r) => [r.question_id, r.level]));
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

    // 6. Plan d'actions
    const actionItems = allActionPlanRows;
    const totalActions = actionItems.length;
    const doneActions = actionItems.filter((a) => a.is_checked).length;
    const byCategory: Record<string, { total: number; done: number }> = {};
    for (const item of actionItems) {
      const cat = item.category ?? "Autre";
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 };
      byCategory[cat].total++;
      if (item.is_checked) byCategory[cat].done++;
    }

    // 7. Labels (dédupliqués, normalisation camelCase)
    const seenLabels = new Set<string>();
    const labels = allLabelRows
      .filter((l) => { const k = `${l.name}|${l.holder}`; if (seenLabels.has(k)) return false; seenLabels.add(k); return true; })
      .map((l) => ({ name: l.name, logoUrl: l.logo_url, holder: l.holder, score: l.score }));

    // 8. Achats responsables — ne jamais exposer les montants sur la page publique
    const totalPurchasesAmount = allResponsiblePurchaseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const responsiblePurchasesByCategory = new Map<string, number>();
    let responsibleAmount = 0;
    let localAmount = 0;
    let circularAmount = 0;

    for (const row of allResponsiblePurchaseRows) {
      const amount = Number(row.amount ?? 0);
      responsibleAmount += amount * Number(row.responsible_percent ?? 0) / 100;
      localAmount += amount * Number(row.local_percent ?? 0) / 100;
      circularAmount += amount * Number(row.circular_percent ?? 0) / 100;
      responsiblePurchasesByCategory.set(
        row.category,
        (responsiblePurchasesByCategory.get(row.category) ?? 0) + amount,
      );
    }

    const asPercent = (amount: number) =>
      totalPurchasesAmount > 0 ? Math.round((amount / totalPurchasesAmount) * 100) : 0;
    const responsiblePurchases = allResponsiblePurchaseRows.length > 0
      ? {
          responsiblePercent: asPercent(responsibleAmount),
          localPercent: asPercent(localAmount),
          circularPercent: asPercent(circularAmount),
          byCategory: Array.from(responsiblePurchasesByCategory.entries())
            .map(([category, amount]) => ({
              category,
              sharePercent: asPercent(amount),
            }))
            .sort((a, b) => b.sharePercent - a.sharePercent),
        }
      : null;

    // 9. Synthèses publiques complémentaires
    const numeriqueResponsable = allNrResponseRows.length > 0
      ? {
          responses: allNrResponseRows.map((row) => ({
            criterionId: row.criterion_id,
            checked: row.checked,
          })),
        }
      : null;

    const diversityTotals = allDiversityRows.reduce(
      (totals, row) => ({
        women: totals.women + Number(row.nb_femmes ?? 0),
        men: totals.men + Number(row.nb_hommes ?? 0),
      }),
      { women: 0, men: 0 },
    );
    const genderTotal = diversityTotals.women + diversityTotals.men;
    const parite = genderTotal > 0
      ? {
          womenPercent: Math.round((diversityTotals.women / genderTotal) * 100),
          menPercent: Math.round((diversityTotals.men / genderTotal) * 100),
        }
      : null;

    // 10. Rapport RSE
    const reportDraft = reportDraftRows.rows[0];

    // 11. Baromètre social
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

    // 12. Progression
    const progression = {
      diagnostic: allDiagnosticRows.length > 0,
      stakeholders: allStakeholderCount > 0,
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
      stakeholderCount: allStakeholderCount,
      responsiblePurchases,
      numeriqueResponsable,
      parite,
      barometre,
      progression,
      reportGenerationCount: reportDraft?.generation_count ?? 0,
      subcategoryScores,
      customDescription: customDescription ?? null,
      showReport: showReport ?? false,
    });
  } catch (e) {
    logger.error({ err: e, msg: (e as Error)?.message, stack: (e as Error)?.stack }, "public-rse error");
    res.status(500).json({ error: "Internal server error", detail: (e as Error)?.message });
  }
});

// ── GET /organizations/:orgId/public-link — token actuel ──────────────────────

router.get("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  const [link] = await db
    .select({
      token: publicLinksTable.token,
      createdAt: publicLinksTable.createdAt,
      customDescription: publicLinksTable.customDescription,
      showReport: publicLinksTable.showReport,
    })
    .from(publicLinksTable)
    .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)))
    .limit(1);

  res.json(link ?? null);
});

// ── PATCH /organizations/:orgId/public-link — met à jour description/showReport

router.patch("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireOrgRole(["owner", "admin"]), requireWritableExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  const { customDescription, showReport } = req.body as { customDescription?: string | null; showReport?: boolean };

  try {
    await db
      .update(publicLinksTable)
      .set({
        ...(customDescription !== undefined ? { customDescription: customDescription || null } : {}),
        ...(showReport !== undefined ? { showReport } : {}),
      })
      .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)));

    res.json({ ok: true });
  } catch (e) {
    logger.error({ e }, "update public link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /organizations/:orgId/public-link — génère ou retourne le token ──────

router.post("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireOrgRole(["owner", "admin"]), requireWritableExerciseScope, async (req, res): Promise<void> => {
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

router.delete("/organizations/:orgId/public-link", requireAuth, requireOrgMembership, requireOrgRole(["owner", "admin"]), requireWritableExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  await db
    .delete(publicLinksTable)
    .where(and(eq(publicLinksTable.organizationId, orgId), eq(publicLinksTable.exerciseId, exercise.id)));

  res.json({ ok: true });
});

export default router;

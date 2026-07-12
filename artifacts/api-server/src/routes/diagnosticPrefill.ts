/**
 * Moteur de pré-remplissage intelligent du Diagnostic RSE.
 *
 * Pour chaque module de Cocci qui contient des données,
 * on infère des suggestions de réponses pour les questions diagnostiques.
 *
 * confidence: "auto"      → donnée certaine (ex: bilan carbone créé = question répondue)
 * confidence: "suggested" → donnée implique quelque chose (ex: plan d'actions = pilotage en place)
 */

import { eq, and, count, isNotNull } from "drizzle-orm";
import {
  db,
  carbonBilansTable,
  barometreCampaignsTable,
  employmentWorkforceTable,
  employmentDiversityTable,
  employmentTrainingTable,
  organizationActionPlansTable,
  suppliersTable,
  bioDependenciesTable,
  nrMetaTable,
  nrResponsesTable,
  stakeholdersTable,
  customIssuesTable,
} from "@workspace/db";

export interface PrefillSuggestion {
  questionId: string;
  suggestedLevel: number;
  source: string;
  confidence: "auto" | "suggested";
}

// ── Helper ──────────────────────────────────────────────────────────────────
function suggest(
  questionId: string,
  suggestedLevel: number,
  source: string,
  confidence: "auto" | "suggested",
): PrefillSuggestion {
  return { questionId, suggestedLevel, source, confidence };
}

// ── Moteur principal ────────────────────────────────────────────────────────
export async function computePrefillSuggestions(
  orgId: number,
  exerciseId: number,
): Promise<PrefillSuggestion[]> {
  // ── 1. Collecte des signaux en parallèle ─────────────────────────────────
  const [
    bilans,
    barometreRows,
    workforceRows,
    diversityRows,
    trainingRows,
    actionPlanCount,
    supplierRows,
    bioRows,
    nrMetaRows,
    nrCheckedCount,
    stakeholderCount,
    customIssuesCount,
  ] = await Promise.all([
    // Bilans carbone (tous exercices : le bilan peut avoir été fait une fois)
    db.select().from(carbonBilansTable).where(eq(carbonBilansTable.organizationId, orgId)),

    // Baromètre social
    db.select().from(barometreCampaignsTable).where(
      and(
        eq(barometreCampaignsTable.organizationId, orgId),
        eq(barometreCampaignsTable.exerciseId, exerciseId),
      ),
    ),

    // Capital humain — effectifs
    db.select().from(employmentWorkforceTable).where(
      and(
        eq(employmentWorkforceTable.organizationId, orgId),
        eq(employmentWorkforceTable.exerciseId, exerciseId),
      ),
    ),

    // Capital humain — diversité
    db.select().from(employmentDiversityTable).where(
      and(
        eq(employmentDiversityTable.organizationId, orgId),
        eq(employmentDiversityTable.exerciseId, exerciseId),
      ),
    ),

    // Capital humain — formation
    db.select().from(employmentTrainingTable).where(
      and(
        eq(employmentTrainingTable.organizationId, orgId),
        eq(employmentTrainingTable.exerciseId, exerciseId),
      ),
    ),

    // Plan d'actions
    db.select({ total: count() }).from(organizationActionPlansTable).where(
      and(
        eq(organizationActionPlansTable.organizationId, orgId),
        eq(organizationActionPlansTable.exerciseId, exerciseId),
      ),
    ),

    // Fournisseurs
    db.select().from(suppliersTable).where(
      and(
        eq(suppliersTable.organizationId, orgId),
        eq(suppliersTable.exerciseId, exerciseId),
      ),
    ),

    // Biodiversité
    db.select({ total: count() }).from(bioDependenciesTable).where(
      and(
        eq(bioDependenciesTable.organizationId, orgId),
        eq(bioDependenciesTable.exerciseId, exerciseId),
      ),
    ),

    // Numérique responsable — métadonnées
    db.select().from(nrMetaTable).where(
      and(
        eq(nrMetaTable.organizationId, orgId),
        eq(nrMetaTable.exerciseId, exerciseId),
      ),
    ),

    // Numérique responsable — critères cochés
    db.select({ total: count() }).from(nrResponsesTable).where(
      and(
        eq(nrResponsesTable.organizationId, orgId),
        eq(nrResponsesTable.exerciseId, exerciseId),
        eq(nrResponsesTable.checked, true),
      ),
    ),

    // Parties prenantes
    db.select({ total: count() }).from(stakeholdersTable).where(
      and(
        eq(stakeholdersTable.organizationId, orgId),
        eq(stakeholdersTable.exerciseId, exerciseId),
      ),
    ),

    // Enjeux matérialité (issues personnalisées)
    db.select({ total: count() }).from(customIssuesTable).where(
      and(
        eq(customIssuesTable.organizationId, orgId),
        eq(customIssuesTable.exerciseId, exerciseId),
      ),
    ),
  ]);

  // ── 2. Dériver les signaux booléens ──────────────────────────────────────
  const hasBilan               = bilans.length > 0;
  const hasValidatedBilan      = bilans.some((b) => b.status === "validated");
  const bilanHasScope3         = bilans.some((b) => b.scope === "1-2-3");
  const bilanHasEnergie        = bilans.some((b) => b.energie1 != null || b.energie2 != null);

  const hasBarometre           = barometreRows.length > 0;
  const hasClosedBarometre     = barometreRows.some((b) => b.status === "closed");

  const hasWorkforce           = workforceRows.length > 0 &&
                                  workforceRows.some((w) => w.totalHeadcount != null);
  const hasDiversity           = diversityRows.length > 0;
  const hasTraining            = trainingRows.length > 0;

  const hasActionPlan          = (actionPlanCount[0]?.total ?? 0) > 0;

  const hasSuppliers           = supplierRows.length > 0;
  const supplierWithRsePolicy  = supplierRows.filter((s) => s.rsePolicy != null).length;
  const hasRseSuppliers        = supplierWithRsePolicy > 0;

  const hasBio                 = (bioRows[0]?.total ?? 0) > 0;

  const hasNr                  = nrMetaRows.length > 0;
  const nrChecked              = nrCheckedCount[0]?.total ?? 0;
  const hasNrCriteria          = nrChecked > 0;

  const stakeholderTotal       = stakeholderCount[0]?.total ?? 0;
  const hasStakeholders        = stakeholderTotal > 0;

  const hasCustomIssues        = (customIssuesCount[0]?.total ?? 0) > 0;

  // ── 3. Construire les suggestions ─────────────────────────────────────────
  const s: PrefillSuggestion[] = [];

  // ── BILAN CARBONE → ENV-CLI (Climat) ──────────────────────────────────────
  if (hasBilan) {
    // "Avez-vous réalisé un bilan carbone ?"
    s.push(suggest("ENV-CLI-001", hasValidatedBilan ? 3 : 2, "Bilan Carbone", "auto"));
  }
  if (hasBilan && bilanHasScope3) {
    // "Les principales sources d'émissions sont-elles identifiées ?"
    s.push(suggest("ENV-CLI-002", 3, "Bilan Carbone", "auto"));
  } else if (hasBilan) {
    s.push(suggest("ENV-CLI-002", 2, "Bilan Carbone", "auto"));
  }
  if (hasValidatedBilan) {
    // "Votre entreprise mesure-t-elle les progrès réalisés en matière de climat ?"
    s.push(suggest("ENV-CLI-012", 2, "Bilan Carbone", "suggested"));
    // "Les résultats obtenus permettent-ils d'améliorer les actions ?"
    s.push(suggest("ENV-CLI-013", 2, "Bilan Carbone", "suggested"));
  }
  if (hasBilan && hasActionPlan) {
    // "Un plan d'actions est-il mis en œuvre pour réduire les émissions ?"
    s.push(suggest("ENV-CLI-004", 2, "Plan d'actions RSE", "suggested"));
  }

  // ── BILAN CARBONE → ENV-ENE (Énergie) ────────────────────────────────────
  if (bilanHasEnergie) {
    // "Votre entreprise suit-elle régulièrement ses consommations d'énergie ?"
    s.push(suggest("ENV-ENE-001", 2, "Bilan Carbone", "auto"));
  }

  // ── BIODIVERSITÉ → ENV-BIO ────────────────────────────────────────────────
  if (hasBio) {
    // "Votre entreprise a-t-elle identifié les principaux enjeux de biodiversité ?"
    s.push(suggest("ENV-BIO-001", 2, "Biodiversité", "auto"));
    // "Les impacts de votre activité sur la biodiversité sont-ils évalués ?"
    s.push(suggest("ENV-BIO-002", 2, "Biodiversité", "auto"));
    // "Les dépendances de votre activité à la biodiversité sont-elles identifiées ?"
    s.push(suggest("ENV-BIO-003", 2, "Biodiversité", "auto"));
    // "Des indicateurs permettent-ils de suivre les actions en faveur de la biodiversité ?"
    s.push(suggest("ENV-BIO-012", 2, "Biodiversité", "suggested"));
  }

  // ── FOURNISSEURS → ENV-ACH (Achats responsables) ─────────────────────────
  if (hasSuppliers) {
    // "Votre entreprise dispose-t-elle d'une politique d'achats responsables ?"
    s.push(suggest("ENV-ACH-001", 2, "Fournisseurs", "suggested"));
    // "Votre démarche d'achats responsables est-elle évaluée et améliorée ?"
    s.push(suggest("ENV-ACH-010", 2, "Fournisseurs", "suggested"));
  }
  if (hasRseSuppliers) {
    // "Les fournisseurs sont-ils évalués sur leurs engagements RSE ?"
    s.push(suggest("ENV-ACH-005", supplierWithRsePolicy >= 3 ? 3 : 2, "Fournisseurs", "auto"));
    // "Vos fournisseurs sont-ils sensibilisés à votre démarche RSE ?"
    s.push(suggest("ENV-ACH-009", 2, "Fournisseurs", "suggested"));
  }

  // ── CAPITAL HUMAIN → SOC-CH ───────────────────────────────────────────────
  if (hasWorkforce) {
    // "Votre entreprise suit-elle l'évolution de ses effectifs ?"
    s.push(suggest("SOC-CH-001", 2, "Capital Humain", "auto"));
    // "Disposez-vous d'indicateurs pour suivre les mouvements de personnel ?"
    s.push(suggest("SOC-CH-004", 2, "Capital Humain", "auto"));
    // "Les indicateurs RH sont-ils partagés avec la direction ?"
    s.push(suggest("SOC-CH-011", 2, "Capital Humain", "suggested"));
  }

  // ── FORMATION → SOC-FOR ──────────────────────────────────────────────────
  if (hasTraining) {
    // "Les besoins en formation des collaborateurs sont-ils identifiés régulièrement ?"
    s.push(suggest("SOC-FOR-001", 2, "Capital Humain", "auto"));
    // "Votre entreprise dispose-t-elle d'un plan de formation ?"
    s.push(suggest("SOC-FOR-002", 2, "Capital Humain", "auto"));
    // "Des indicateurs permettent-ils de suivre la politique de formation ?"
    s.push(suggest("SOC-FOR-011", 2, "Capital Humain", "auto"));
    // "Les obligations légales en matière de formation sont-elles respectées ?"
    s.push(suggest("SOC-FOR-010", 2, "Capital Humain", "suggested"));
  }

  // ── DIVERSITÉ → SOC-DIV ──────────────────────────────────────────────────
  if (hasDiversity) {
    // "Votre entreprise s'engage-t-elle en faveur de la diversité et de l'inclusion ?"
    s.push(suggest("SOC-DIV-001", 2, "Capital Humain", "auto"));
    // "Les recrutements garantissent-ils l'égalité des chances ?"
    s.push(suggest("SOC-DIV-002", 2, "Capital Humain", "suggested"));
  }

  // ── BAROMÈTRE SOCIAL → SOC-DIA, SOC-QVCT, SOC-CH ─────────────────────────
  if (hasBarometre) {
    // "Les collaborateurs sont-ils régulièrement informés de la vie et des projets ?"
    s.push(suggest("SOC-DIA-001", 2, "Baromètre Social", "suggested"));
    // "Les collaborateurs peuvent-ils facilement poser des questions ?"
    s.push(suggest("SOC-DIA-003", 2, "Baromètre Social", "suggested"));
  }
  if (hasClosedBarometre) {
    // "Le bien-être des collaborateurs est-il régulièrement évalué ?"
    s.push(suggest("SOC-QVCT-006", 2, "Baromètre Social", "auto"));
    // "Les collaborateurs peuvent-ils exprimer leurs difficultés ou proposer des améliorations ?"
    s.push(suggest("SOC-QVCT-009", 2, "Baromètre Social", "auto"));
    // "Des indicateurs permettent-ils de suivre la QVCT ?"
    s.push(suggest("SOC-QVCT-010", 2, "Baromètre Social", "auto"));
    // "Votre entreprise mesure-t-elle la satisfaction globale de ses collaborateurs ?"
    s.push(suggest("SOC-CH-010", 2, "Baromètre Social", "auto"));
  }

  // ── PARTIES PRENANTES → GOV-PP ────────────────────────────────────────────
  if (hasStakeholders) {
    // "Votre entreprise a-t-elle identifié ses parties prenantes ?"
    s.push(suggest("GOV-PP-001", stakeholderTotal >= 5 ? 3 : 2, "Parties Prenantes", "auto"));
    // "Les attentes des parties prenantes sont-elles régulièrement recueillies ?"
    s.push(suggest("GOV-PP-002", 2, "Parties Prenantes", "suggested"));
    // "Les parties prenantes sont-elles classées selon leur influence ?"
    s.push(suggest("GOV-PP-003", 2, "Parties Prenantes", "auto"));
  }

  // ── PLAN D'ACTIONS → GOV-PIL ──────────────────────────────────────────────
  if (hasActionPlan) {
    // "Votre entreprise dispose-t-elle d'un plan d'actions RSE ?"
    s.push(suggest("GOV-PIL-001", 2, "Plan d'actions RSE", "auto"));
    // "Les actions RSE sont-elles suivies dans le temps ?"
    s.push(suggest("GOV-PIL-002", 2, "Plan d'actions RSE", "auto"));
    // "Les progrès des actions RSE sont-ils mesurés ?"
    s.push(suggest("GOV-PIL-003", 2, "Plan d'actions RSE", "suggested"));
  }

  // ── ENJEUX MATÉRIALITÉ → GOV-RIS ─────────────────────────────────────────
  if (hasCustomIssues) {
    // "Les risques RSE de l'entreprise sont-ils identifiés ?"
    s.push(suggest("GOV-RIS-001", 2, "Matrice de matérialité", "auto"));
    // "Les risques RSE sont-ils priorisés ?"
    s.push(suggest("GOV-RIS-002", 2, "Matrice de matérialité", "suggested"));
  }

  // ── NUMÉRIQUE RESPONSABLE → GOV-DAT / mentions NR ─────────────────────────
  if (hasNr) {
    // "Votre entreprise a-t-elle engagé une démarche de numérique responsable ?"
    s.push(suggest("GOV-DAT-001", hasNrCriteria ? 2 : 1, "Numérique Responsable", "auto"));
  }
  if (hasNrCriteria) {
    // "Les émissions liées au numérique sont-elles évaluées ?" (ENV-CLI)
    s.push(suggest("ENV-CLI-011", 2, "Numérique Responsable", "auto"));
    // "Les équipements et logiciels sont-ils suivis ?"
    s.push(suggest("GOV-DAT-002", 2, "Numérique Responsable", "suggested"));
  }

  return s;
}

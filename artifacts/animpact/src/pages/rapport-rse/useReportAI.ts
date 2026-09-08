/**
 * Hook de génération d'analyses IA pour le rapport illustré.
 * Appelle le backend en parallèle pour chaque section.
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { getCurrentExerciseId } from "@/hooks/useCurrentExercise";
import type { ReportData } from "./useReportData";
import { apiUrl } from "@/lib/apiUrl";

export type AiAnalyses = Record<string, string | null>;

type AnyObj = Record<string, unknown>;

function buildContexts(data: ReportData): Record<string, string> {
  const {
    diagScores, stakeholders, bioDeps, issueAI,
    impactScore, carbon, captation, nrData, workforce, diversity,
    training, actions,
  } = data;
  const planSlots = (data as any).planSlots as AnyObj[] ?? [];

  const ds = diagScores as AnyObj[];
  const envScores = ds.filter((s) => s.categoryId === "ENV" && s.scorePercent != null);
  const socScores = ds.filter((s) => s.categoryId === "SOC" && s.scorePercent != null);
  const govScores = ds.filter((s) => s.categoryId === "GOV" && s.scorePercent != null);
  const avg = (arr: AnyObj[]) =>
    arr.length ? Math.round(arr.reduce((a, s) => a + Number(s.scorePercent ?? 0), 0) / arr.length) : null;

  const carbonFields = ["energie1","energie2","horsEnergie1","horsEnergie2","intrantsBiens",
    "intrantsServices","futursEmballages","fret","deplacements","dechetsDirects",
    "immobilisations","utilisation","finDeVie"];
  const carbonTotal = carbon
    ? carbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)
    : 0;

  const acts = actions as AnyObj[];
  const doneActions = acts.filter((a) => a.isChecked).length;
  const actionRate = acts.length > 0 ? Math.round((doneActions / acts.length) * 100) : 0;

  const contexts: Record<string, string> = {};

  const sks = stakeholders as AnyObj[];
  if (sks.length > 0) {
    const cats = [...new Set(sks.map((s) => String(s.category ?? "")).filter(Boolean))];
    contexts.stakeholders =
      `${sks.length} parties prenantes cartographiées. Catégories : ${cats.join(", ") || "diverses"}. ` +
      `Influence moyenne : ${Math.round(sks.reduce((a, s) => a + Number(s.influence ?? 3), 0) / sks.length * 10) / 10}/5. ` +
      `Identifie les enjeux relationnels clés et formule des recommandations.`;
  }

  const bios = bioDeps as AnyObj[];
  if (bios.length > 0) {
    const cats = [...new Set(bios.map((b) => String(b.category ?? "")).filter(Boolean))];
    const zones = [...new Set(bios.map((b) => String(b.chainPosition ?? "")).filter(Boolean))];
    contexts.biodiversity =
      `${bios.length} dépendances à la biodiversité identifiées. Catégories : ${cats.join(", ") || "diverses"}. ` +
      `Zones de la chaîne de valeur : ${zones.join(", ") || "non renseignées"}. ` +
      `Identifie les dépendances critiques et les implications stratégiques.`;
  }

  const ia = issueAI;
  if (ia?.superIssues) {
    const sis = (ia.superIssues as AnyObj[]).map((si) => String(si.title ?? "")).join(", ");
    contexts.materiality =
      `Super-enjeux identifiés : ${sis}. ` +
      `Synthétise les priorités RSE et formule les axes d'action prioritaires.`;
  } else if (envScores.length || socScores.length || govScores.length) {
    contexts.materiality =
      `Maturité RSE — ENV : ${avg(envScores) ?? "N/A"}%, SOC : ${avg(socScores) ?? "N/A"}%, GOV : ${avg(govScores) ?? "N/A"}%. ` +
      `Identifie les enjeux prioritaires et les axes d'amélioration.`;
  }

  if (envScores.length > 0) {
    contexts.diag_env =
      `Diagnostic environnemental — ${envScores.map((s) => `${s.label} : ${s.scorePercent}%`).join(", ")}. ` +
      `Score moyen ENV : ${avg(envScores)}%. Identifie les points forts, lacunes et actions prioritaires.`;
  }
  if (socScores.length > 0) {
    contexts.diag_soc =
      `Diagnostic social — ${socScores.map((s) => `${s.label} : ${s.scorePercent}%`).join(", ")}. ` +
      `Score moyen SOC : ${avg(socScores)}%. Formule des recommandations concrètes.`;
  }
  if (govScores.length > 0) {
    contexts.diag_gov =
      `Diagnostic de gouvernance — ${govScores.map((s) => `${s.label} : ${s.scorePercent}%`).join(", ")}. ` +
      `Score moyen GOV : ${avg(govScores)}%. Identifie les pratiques à renforcer.`;
  }

  if (carbonTotal > 0) {
    const cap = captation;
    contexts.carbon =
      `Bilan carbone — Émissions totales : ${Math.round(carbonTotal)} tCO₂e. ` +
      `${cap?.captationKgPerYear ? `Captation estimée : ${Number(cap.captationKgPerYear) / 1000} tCO₂/an.` : ""} ` +
      `Formule des recommandations de réduction et des axes de progression.`;
  }

  const nr = nrData;
  if (nr) {
    contexts.nr =
      `Numérique Responsable — Score : ${nr.score ?? "N/A"}%. ` +
      `${nr.certificationLabel ? `Niveau : ${String(nr.certificationLabel)}.` : ""} ` +
      `Identifie les axes de progression prioritaires en matière de numérique responsable.`;
  }

  const wf = workforce;
  if (wf) {
    const div = diversity;
    const tr = training;
    const n   = wf.totalHeadcount ? Number(wf.totalHeadcount) : null;
    const pct = (val: unknown) => (n && val != null) ? `${Math.round(Number(val) / n * 100)}%` : "N/A";
    const fmt = (val: unknown) => val != null ? String(val) : "N/A";

    // ── Synthèse effectifs ──────────────────────────────────────────────────
    const depLines: string[] = [];
    depLines.push(`Effectif total : ${fmt(wf.totalHeadcount)}`);
    if (wf.nbCdi    != null) depLines.push(`CDI : ${wf.nbCdi} (${pct(wf.nbCdi)})`);
    if (wf.nbCdd    != null) depLines.push(`CDD : ${wf.nbCdd} (${pct(wf.nbCdd)})`);
    if (wf.nbAlternants != null) depLines.push(`Alternants : ${wf.nbAlternants} (${pct(wf.nbAlternants)})`);
    if (wf.nbApprentis  != null) depLines.push(`Apprentis : ${wf.nbApprentis}`);
    if (wf.nbStagiaires != null) depLines.push(`Stagiaires : ${wf.nbStagiaires} (${pct(wf.nbStagiaires)})`);
    if (wf.nbInterimaires != null) depLines.push(`Intérimaires : ${wf.nbInterimaires}`);
    if (wf.nbTempsPlein  != null) depLines.push(`Temps plein : ${wf.nbTempsPlein} (${pct(wf.nbTempsPlein)})`);
    if (wf.nbTempsPartiel != null) depLines.push(`Temps partiel : ${wf.nbTempsPartiel} (${pct(wf.nbTempsPartiel)})`);
    if (wf.nbRecrutements != null) depLines.push(`Recrutements : ${wf.nbRecrutements}`);
    if (wf.nbDeparts      != null) {
      const turnover = n ? `${Math.round(Number(wf.nbDeparts) / n * 100)}%` : "N/A";
      depLines.push(`Départs : ${wf.nbDeparts} (turn-over ${turnover})`);
    }
    if (wf.avgAge != null) depLines.push(`Âge moyen : ${Math.round(Number(wf.avgAge) * 10) / 10} ans`);
    const agePyramid: string[] = [];
    if (wf.ageUnder25 != null) agePyramid.push(`< 25 ans : ${wf.ageUnder25}`);
    if (wf.age25to34  != null) agePyramid.push(`25-34 ans : ${wf.age25to34}`);
    if (wf.age35to44  != null) agePyramid.push(`35-44 ans : ${wf.age35to44}`);
    if (wf.age45to54  != null) agePyramid.push(`45-54 ans : ${wf.age45to54}`);
    if (wf.age55plus  != null) agePyramid.push(`55+ ans : ${wf.age55plus}`);
    if (agePyramid.length) depLines.push(`Pyramide des âges : ${agePyramid.join(", ")}`);
    if (wf.avgSeniority != null) depLines.push(`Ancienneté moyenne : ${Math.round(Number(wf.avgSeniority) * 10) / 10} ans`);
    const seniorityBreakdown: string[] = [];
    if (wf.seniorityUnder2 != null) seniorityBreakdown.push(`< 2 ans : ${wf.seniorityUnder2}`);
    if (wf.seniority2to5   != null) seniorityBreakdown.push(`2-5 ans : ${wf.seniority2to5}`);
    if (wf.seniority5to10  != null) seniorityBreakdown.push(`5-10 ans : ${wf.seniority5to10}`);
    if (wf.seniorityOver10 != null) seniorityBreakdown.push(`> 10 ans : ${wf.seniorityOver10}`);
    if (seniorityBreakdown.length) depLines.push(`Répartition ancienneté : ${seniorityBreakdown.join(", ")}`);

    contexts.wf_effectifs =
      depLines.join(". ") + ". " +
      "Analyse la composition et la dynamique des effectifs, identifie les tendances structurelles (pyramide des âges, stabilité, rotation) et formule des recommandations RH concrètes.";

    // ── Synthèse diversité & inclusion ──────────────────────────────────────
    if (div) {
      const divLines: string[] = [];
      if (div.nbFemmes  != null) divLines.push(`Femmes : ${div.nbFemmes} (${pct(div.nbFemmes)})`);
      if (div.nbHommes  != null) divLines.push(`Hommes : ${div.nbHommes} (${pct(div.nbHommes)})`);
      if (div.nbNonBinaire != null && Number(div.nbNonBinaire) > 0) divLines.push(`Non-binaires : ${div.nbNonBinaire}`);
      if (div.nbHandicap != null) divLines.push(`Situations de handicap : ${div.nbHandicap} (${pct(div.nbHandicap)})`);
      if (div.nbNationaliteFrancaise != null) divLines.push(`Nationalité française : ${div.nbNationaliteFrancaise}`);
      if (div.nbNationaliteUe     != null && Number(div.nbNationaliteUe) > 0)    divLines.push(`UE : ${div.nbNationaliteUe}`);
      if (div.nbNationaliteHorsUe != null && Number(div.nbNationaliteHorsUe) > 0) divLines.push(`Hors UE : ${div.nbNationaliteHorsUe}`);
      const policies: string[] = [];
      if (div.politiqueDiversite)          policies.push("politique diversité");
      if (div.referentHandicap)            policies.push("référent handicap");
      if (div.sensibilisationDiversite)    policies.push("sensibilisation diversité");
      if (div.politiqueContreDiscriminations) policies.push("politique anti-discrimination");
      if (div.politiqueEgaliteProfessionnelle) policies.push("égalité professionnelle");
      if (div.charteDiversite)             policies.push("charte diversité");
      if (div.teletravailAutorise)         policies.push("télétravail autorisé");
      if (policies.length) divLines.push(`Engagements actifs : ${policies.join(", ")}`);
      contexts.wf_diversite =
        divLines.join(". ") + ". " +
        "Évalue le niveau d'inclusion et d'égalité professionnelle, mesure l'écart par rapport aux bonnes pratiques sectorielles et formule des recommandations concrètes pour progresser.";
    }

    // ── Synthèse formation ──────────────────────────────────────────────────
    if (tr) {
      const trLines: string[] = [];
      if (tr.nbCollaborateursFormes != null) {
        const trainingRate = n ? Math.round(Number(tr.nbCollaborateursFormes) / n * 100) : null;
        trLines.push(`Collaborateurs formés : ${tr.nbCollaborateursFormes} (${trainingRate != null ? `${trainingRate}%` : "N/A"} de l'effectif)`);
      }
      if (tr.nbHeuresFormation != null) {
        const hPerCollab = n && Number(tr.nbHeuresFormation) > 0 ? Math.round(Number(tr.nbHeuresFormation) / n * 10) / 10 : null;
        trLines.push(`Heures de formation : ${tr.nbHeuresFormation}${hPerCollab != null ? ` (${hPerCollab} h/collab.)` : ""}`);
      }
      if (tr.budgetFormation != null) {
        const budgetPerCollab = n ? Math.round(Number(tr.budgetFormation) / n) : null;
        trLines.push(`Budget formation : ${Number(tr.budgetFormation).toLocaleString("fr-FR")} €${budgetPerCollab != null ? ` (${budgetPerCollab} €/collab.)` : ""}`);
      }
      if (tr.nbEntretiensAnnuels        != null) trLines.push(`Entretiens annuels : ${tr.nbEntretiensAnnuels} (${pct(tr.nbEntretiensAnnuels)})`);
      if (tr.nbEntretiensProfessionnels != null) trLines.push(`Entretiens professionnels : ${tr.nbEntretiensProfessionnels}`);
      if (tr.nbCertifications           != null) trLines.push(`Certifications obtenues : ${tr.nbCertifications}`);
      if (tr.nbEvolutionsInternes       != null) trLines.push(`Évolutions internes : ${tr.nbEvolutionsInternes}`);
      contexts.wf_formation =
        trLines.join(". ") + ". " +
        "Évalue l'investissement dans le développement des compétences, compare aux bonnes pratiques sectorielles (taux de formation ≥ 80%, ≥ 20 h/collab./an) et formule des recommandations ciblées.";
    }
  }

  const donePlanSlots = planSlots.filter((s) => s.isDone);
  if (acts.length > 0 || planSlots.length > 0) {
    const cats = [...new Set(acts.map((a) => String(a.actionCategory ?? a.category ?? "")).filter(Boolean))].slice(0, 5);
    const slotCats = [...new Set(planSlots.map((s) => String(s.actionCategory ?? "")).filter(Boolean))].slice(0, 5);
    contexts.actions =
      `Catalogue d'actions RSE — ${acts.length} actions totales, ${doneActions} réalisées (${actionRate}%). ` +
      (cats.length ? `Catégories catalogue : ${cats.join(", ")}. ` : "") +
      `Feuille de route — ${planSlots.length} actions planifiées, ${donePlanSlots.length} réalisées. ` +
      (slotCats.length ? `Catégories feuille de route : ${slotCats.join(", ")}. ` : "") +
      `Évalue séparément l'avancement du catalogue et de la feuille de route, identifie les priorités et les axes de progression.`;
  }

  const is_ = impactScore;
  if (is_) {
    contexts.impact =
      `Impact Score : ${is_.score}/100. Piliers — Limitation des impacts négatifs : ${is_.limitationImpactsNegatifs ?? "N/A"}/100, ` +
      `Partage de la valeur : ${is_.partageValeurPouvoir ?? "N/A"}/100, ` +
      `Stratégie à impact positif : ${is_.strategieImpactPositif ?? "N/A"}/100. ` +
      `Analyse les forces et les axes de progression.`;
  }

  const cap = captation;
  if (cap?.captationKgPerYear) {
    contexts.captation =
      `Captation carbone — Estimée à ${Number(cap.captationKgPerYear).toLocaleString("fr-FR")} kg CO₂/an. ` +
      `${cap.treeCount ? `Arbres : ${cap.treeCount}.` : ""} ` +
      `${carbonTotal > 0 ? `Ratio captation/émissions : ${Math.round(Number(cap.captationKgPerYear) / 1000 / carbonTotal * 100)}%.` : ""} ` +
      `Contextualise dans la stratégie carbone globale.`;
  }

  return contexts;
}

export function useReportAI(data: ReportData, orgId: number | null): AiAnalyses {
  const { getToken } = useAuth();
  const [analyses, setAnalyses] = useState<AiAnalyses>({});
  const fetched = useRef(false);

  useEffect(() => {
    if (!orgId || data.isLoading || fetched.current) return;
    fetched.current = true;

    const contexts = buildContexts(data);
    const exerciseId = getCurrentExerciseId();

    async function fetchAll() {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (exerciseId) headers["X-Exercise-Id"] = String(exerciseId);

      const entries = Object.entries(contexts);
      const results = await Promise.all(
        entries.map(async ([key, context]) => {
          try {
            const res = await fetch(apiUrl(`/api/organizations/${orgId}/report/ai-section`), {
              method: "POST",
              headers,
              body: JSON.stringify({ section: "analyse", context }),
            });
            if (!res.ok) return [key, null] as [string, null];
            const json = await res.json() as { content: string };
            return [key, json.content ?? null] as [string, string | null];
          } catch {
            return [key, null] as [string, null];
          }
        })
      );
      setAnalyses(Object.fromEntries(results));
    }

    void fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, data.isLoading]);

  return analyses;
}

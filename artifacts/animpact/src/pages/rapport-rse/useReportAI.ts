/**
 * Hook de génération d'analyses IA pour le rapport illustré.
 * Appelle le backend en parallèle pour chaque section.
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { getCurrentExerciseId } from "@/hooks/useCurrentExercise";
import type { ReportData } from "./useReportData";

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
    contexts.workforce =
      `Capital humain — Effectif : ${wf.totalHeadcount ?? "N/A"}, CDI : ${wf.nbCdi ?? "N/A"}, CDD : ${wf.nbCdd ?? "N/A"}. ` +
      `Recrutements : ${wf.nbRecrutements ?? "N/A"}, Départs : ${wf.nbDeparts ?? "N/A"}. ` +
      (div ? `Féminisation : ${wf.totalHeadcount && div.nbFemmes ? Math.round(Number(div.nbFemmes) / Number(wf.totalHeadcount) * 100) : "N/A"}%. ` : "") +
      (tr ? `Formés : ${tr.nbCollaborateursFormes ?? "N/A"}, heures : ${tr.nbHeuresFormation ?? "N/A"}.` : "") +
      ` Évalue la dynamique RH et formule des recommandations.`;
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
            const res = await fetch(`/api/organizations/${orgId}/report/ai-section`, {
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

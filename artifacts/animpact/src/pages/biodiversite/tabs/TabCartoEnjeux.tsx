import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioIssues,
  useGenerateBioIssues,
  useDeleteBioIssue,
  getListBioIssuesQueryKey,
  useListBioDependencies,
  type BioIssue,
  type Organization,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Grid3X3, List, Info, Loader2, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type View     = "matrix" | "list";
type Filter   = "all" | "amont" | "in-situ" | "aval";
type ChainPos = "amont" | "in-situ" | "aval";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matScore(issue: BioIssue): number | null {
  const org = issue.importanceOrg;
  const bio = issue.importanceBio;
  if (!org || !bio) return null;
  return (org + bio) / 2;
}

type ML = { label: string; color: string; bg: string; border: string };

function matLabel(score: number | null): ML {
  if (score === null) return { label: "Non classé", color: "#94a3b8", bg: "#f8fafc",  border: "#e2e8f0" };
  if (score >= 4)     return { label: "Critique",   color: "#dc2626", bg: "#fef2f2",  border: "#fca5a5" };
  if (score >= 3)     return { label: "Important",  color: "#ea580c", bg: "#fff7ed",  border: "#fdba74" };
  if (score >= 2)     return { label: "Modéré",     color: "#ca8a04", bg: "#fefce8",  border: "#fde047" };
  return                     { label: "Faible",     color: "#16a34a", bg: "#f0fdf4",  border: "#86efac" };
}

function cellBg(x: number, y: number): string {
  const s = (x + y) / 2;
  if (s >= 4) return "#fee2e2";
  if (s >= 3) return "#ffedd5";
  if (s >= 2) return "#fef9c3";
  return "#dcfce7";
}

const CHAIN_CFG: Record<ChainPos, { label: string; subtitle: string; icon: string; color: string }> = {
  "amont":   { label: "AMONT",   subtitle: "Chez vos fournisseurs et partenaires",   icon: "🏭", color: "#0284c7" },
  "in-situ": { label: "IN SITU", subtitle: "Sur vos sites et opérations directes",  icon: "🌿", color: "#16a34a" },
  "aval":    { label: "AVAL",    subtitle: "Chez vos clients et en fin de vie",      icon: "📦", color: "#7c3aed" },
};

// ─── BioMatrix ────────────────────────────────────────────────────────────────

function BioMatrix({
  issues, position, issueNum,
}: {
  issues: BioIssue[];
  position: ChainPos;
  issueNum: (id: number) => number;
}) {
  const cfg = CHAIN_CFG[position];
  const posIssues = issues.filter(i => i.chainPosition === position);
  const [hoverId, setHoverId] = useState<number | null>(null);

  const cellMap = new Map<string, BioIssue[]>();
  for (const iss of posIssues) {
    const x = iss.importanceBio;
    const y = iss.importanceOrg;
    if (!x || !y) continue;
    const key = `${x}-${y}`;
    cellMap.set(key, [...(cellMap.get(key) ?? []), iss]);
  }

  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-slate-100 text-center">
        <div className="text-xs font-bold tracking-widest" style={{ color: cfg.color }}>
          {cfg.icon} {cfg.label}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">{cfg.subtitle}</div>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="flex gap-1 items-stretch">
          {/* Y-axis label */}
          <div
            className="flex-shrink-0 text-[9px] text-slate-400 font-medium flex items-center justify-center"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minHeight: 140 }}
          >
            Importance pour l'organisation
          </div>

          <div className="flex-1">
            {[5, 4, 3, 2, 1].map(y => (
              <div key={y} className="flex gap-0.5 mb-0.5">
                <div className="w-3 text-[9px] text-slate-400 flex items-center justify-end pr-0.5 flex-shrink-0">{y}</div>
                {[1, 2, 3, 4, 5].map(x => {
                  const cellIssues = cellMap.get(`${x}-${y}`) ?? [];
                  return (
                    <div
                      key={x}
                      className="flex-1 rounded-sm flex flex-wrap items-center justify-center gap-0.5 relative"
                      style={{ backgroundColor: cellBg(x, y), minHeight: 34 }}
                    >
                      {cellIssues.map(iss => {
                        const num  = issueNum(iss.id);
                        const ml   = matLabel(matScore(iss));
                        const isH  = hoverId === iss.id;
                        return (
                          <div key={iss.id} className="relative" style={{ zIndex: isH ? 9999 : "auto" }}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoverId(iss.id)}
                              onMouseLeave={() => setHoverId(null)}
                              className="w-6 h-6 rounded-full text-[9px] font-bold border-2 flex items-center justify-center transition-transform hover:scale-125"
                              style={{ backgroundColor: ml.bg, borderColor: ml.border, color: ml.color }}
                            >
                              {num}
                            </button>
                            {isH && (
                              <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 pointer-events-none"
                                style={{ zIndex: 9999 }}
                              >
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span
                                    className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center border-2 flex-shrink-0"
                                    style={{ backgroundColor: ml.bg, borderColor: ml.border, color: ml.color }}
                                  >
                                    {num}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                                    {iss.name ?? "(sans nom)"}
                                  </span>
                                </div>
                                {iss.description && (
                                  <p className="text-[10px] text-slate-500 leading-snug mb-1.5">{iss.description}</p>
                                )}
                                <div className="flex gap-1 flex-wrap">
                                  <span className="text-[9px] bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-600">
                                    Org : {iss.importanceOrg}/5
                                  </span>
                                  <span className="text-[9px] bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-600">
                                    Bio : {iss.importanceBio}/5
                                  </span>
                                  <span
                                    className="text-[9px] rounded-md px-1.5 py-0.5 font-medium border"
                                    style={{ backgroundColor: ml.bg, color: ml.color, borderColor: ml.border }}
                                  >
                                    {ml.label}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* X ticks + label */}
            <div className="flex gap-0.5 mt-1 ml-3.5">
              {[1, 2, 3, 4, 5].map(x => (
                <div key={x} className="flex-1 text-center text-[9px] text-slate-400">{x}</div>
              ))}
            </div>
            <div className="text-center text-[9px] text-slate-400 mt-0.5">Impact sur la biodiversité</div>
          </div>
        </div>

        {posIssues.length === 0 && (
          <p className="text-center text-[10px] text-slate-400 mt-3 pb-1">
            Aucun enjeu positionné {cfg.label.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ value, label, sub, color }: { value: number; label: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex-1 min-w-0">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-0.5">{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  orgId: number;
  subsidiaries?: Organization[];
}

export function TabCartoEnjeux({ orgId, subsidiaries }: Props) {
  const queryClient = useQueryClient();
  const [view,     setView]     = useState<View>("matrix");
  const [filter,   setFilter]   = useState<Filter>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: issuesData, isLoading } = useListBioIssues(orgId);
  const { data: depsData }              = useListBioDependencies(orgId);
  const generateMut = useGenerateBioIssues();
  const deleteMut   = useDeleteBioIssue();

  const issues    = issuesData?.items ?? [];
  const depsCount = depsData?.items?.length ?? 0;

  // Sequential numbering
  const issueIndex = new Map(issues.map((iss, i) => [iss.id, i + 1]));
  const issueNum   = (id: number) => issueIndex.get(id) ?? 0;

  // KPIs
  const scores     = issues.map(matScore);
  const critiques  = scores.filter(s => s !== null && s >= 4).length;
  const importants = scores.filter(s => s !== null && s >= 3 && s < 4).length;
  const moderes    = scores.filter(s => s !== null && s >= 2 && s < 3).length;
  const faibles    = scores.filter(s => s !== null && s < 2).length;

  const positions: ChainPos[] = ["amont", "in-situ", "aval"];

  // Generate
  async function handleGenerate() {
    const subsidiaryOrgIds = subsidiaries?.map(s => s.id) ?? [];
    await generateMut.mutateAsync({
      orgId,
      data: subsidiaryOrgIds.length > 0 ? { subsidiaryOrgIds } : undefined,
    });
    await queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
  }

  // Delete
  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMut.mutateAsync({ orgId, id: deleteId });
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setDeleteId(null);
  }

  const isGenerating = generateMut.isPending;

  // ── Auto-generate in group mode ──────────────────────────────────────────
  const isGroupMode = !!subsidiaries && subsidiaries.length > 0;
  const subsidiaryIds = subsidiaries?.map(s => s.id).sort().join(",") ?? "";
  const triggeredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isGroupMode) return;
    const key = `${orgId}|${subsidiaryIds}`;
    if (triggeredKey.current === key) return; // already triggered for this config
    triggeredKey.current = key;

    const subsidiaryOrgIds = subsidiaries!.map(s => s.id);
    generateMut.mutate(
      { orgId, data: { subsidiaryOrgIds } },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
        },
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, subsidiaryIds]);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Cartographie des enjeux de biodiversité
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            {isGroupMode
              ? `Enjeux consolidés automatiquement à partir des dépendances de ${subsidiaries!.length} filiale${subsidiaries!.length > 1 ? "s" : ""}. La matrice se régénère à chaque ouverture.`
              : "Les enjeux sont générés par IA à partir de vos dépendances et évalués selon leur importance pour l'organisation et leur impact sur la biodiversité."}
          </p>
        </div>
        {isGroupMode ? (
          <Button variant="outline" onClick={handleGenerate} disabled={isGenerating} className="flex-shrink-0">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Consolidation…</>
              : <><Sparkles className="h-4 w-4 mr-2" />Reconsolider</>}
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || depsCount === 0}
            className="flex-shrink-0"
          >
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours…</>
              : <><Sparkles className="h-4 w-4 mr-2" />Générer les enjeux</>}
          </Button>
        )}
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard
          value={issues.length}
          label="Enjeux générés par l'IA"
          sub={depsCount > 0
            ? `À partir de ${depsCount} dépendance${depsCount > 1 ? "s" : ""}`
            : "Aucune dépendance saisie"}
          color="#0f172a"
        />
        <KpiCard value={critiques}  label="Enjeux critiques"  sub="Nécessitent une action prioritaire"  color="#dc2626" />
        <KpiCard value={importants} label="Enjeux importants" sub="À surveiller et à gérer"             color="#ea580c" />
        <KpiCard value={moderes}    label="Enjeux modérés"    sub="Surveillance recommandée"            color="#ca8a04" />
        <KpiCard value={faibles}    label="Enjeux faibles"    sub="Impact et importance limités"        color="#16a34a" />
      </div>

      {/* ── View toggle + position filter ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
          {(["matrix", "list"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === v
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "matrix"
                ? <><Grid3X3 className="h-3.5 w-3.5" />Matrice de matérialité</>
                : <><List     className="h-3.5 w-3.5" />Liste des enjeux générés</>}
            </button>
          ))}
        </div>

        {/* Position filter (matrix only) */}
        {view === "matrix" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Vue :</span>
            {(["all", "amont", "in-situ", "aval"] as const).map(f => {
              const labels: Record<Filter, string> = { all: "Tous", "in-situ": "In situ", amont: "Amont", aval: "Aval" };
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    filter === f
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center text-sm text-slate-400 py-16">Chargement…</div>

      ) : issues.length === 0 ? (
        /* Empty state */
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-16 px-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600 mb-1">
            {isGenerating ? "Consolidation en cours…" : "Aucun enjeu consolidé"}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {isGenerating
              ? "L'IA analyse les dépendances des filiales pour construire la matrice de matérialité groupe."
              : isGroupMode
                ? "Aucune dépendance n'a encore été saisie dans les filiales. Complétez l'onglet Saisie pour chaque filiale."
                : depsCount === 0
                  ? "Commencez par saisir vos dépendances à la biodiversité dans l'onglet Saisie."
                  : `Vous avez ${depsCount} dépendance${depsCount > 1 ? "s" : ""} saisie${depsCount > 1 ? "s" : ""}. Cliquez sur "Générer les enjeux" pour créer votre matrice.`}
          </p>
          {!isGroupMode && !isGenerating && depsCount > 0 && (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />Générer les enjeux
            </Button>
          )}
        </div>

      ) : view === "matrix" ? (
        /* ── Matrix view ────────────────────────────────────────────────── */
        <div>
          {/* Matrices */}
          {filter === "all" ? (
            <div className="flex flex-col md:flex-row gap-4 overflow-visible">
              {positions.map(pos => (
                <BioMatrix key={pos} issues={issues} position={pos} issueNum={issueNum} />
              ))}
            </div>
          ) : (
            <div className="max-w-sm">
              <BioMatrix
                issues={issues}
                position={filter as ChainPos}
                issueNum={issueNum}
              />
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-5 flex-wrap">
            <span className="text-xs font-medium text-slate-500">Niveau de matérialité :</span>
            {[
              { label: "Faible (1-2)",    color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
              { label: "Modéré (2-3)",    color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
              { label: "Important (3-4)", color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
              { label: "Critique (4-5)",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: l.color }}>
                <span
                  className="w-3 h-3 rounded-sm inline-block border"
                  style={{ backgroundColor: l.bg, borderColor: l.border }}
                />
                {l.label}
              </span>
            ))}
          </div>

          {/* Unpositioned issues warning */}
          {issues.some(i => !i.importanceOrg || !i.importanceBio) && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5">
                <Info className="h-3.5 w-3.5" />
                Enjeux non positionnés dans la matrice (importance manquante)
              </p>
              <div className="flex flex-wrap gap-2">
                {issues
                  .filter(i => !i.importanceOrg || !i.importanceBio)
                  .map(iss => {
                    const ml = matLabel(null);
                    return (
                      <span
                        key={iss.id}
                        className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{ backgroundColor: ml.bg, borderColor: ml.border, color: ml.color }}
                      >
                        {issueNum(iss.id)}. {iss.name ?? "(sans nom)"}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

      ) : (
        /* ── List view ──────────────────────────────────────────────────── */
        <div className="space-y-2">
          {issues.map(issue => {
            const num   = issueNum(issue.id);
            const score = matScore(issue);
            const ml    = matLabel(score);
            const chain = issue.chainPosition ? CHAIN_CFG[issue.chainPosition as ChainPos] : null;
            return (
              <div
                key={issue.id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-start gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Number */}
                <div
                  className="w-7 h-7 rounded-full text-sm font-bold border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: ml.bg, borderColor: ml.border, color: ml.color }}
                >
                  {num}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      {issue.name ?? "(sans nom)"}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: ml.bg, borderColor: ml.border, color: ml.color }}
                    >
                      {ml.label}
                    </span>
                    {chain && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {chain.icon} {chain.label}
                      </span>
                    )}
                  </div>

                  {issue.description && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{issue.description}</p>
                  )}

                  <div className="flex gap-4 mt-1.5">
                    {issue.importanceOrg != null && (
                      <span className="text-[10px] text-slate-500">
                        Importance org : <strong className="text-slate-700">{issue.importanceOrg}/5</strong>
                      </span>
                    )}
                    {issue.importanceBio != null && (
                      <span className="text-[10px] text-slate-500">
                        Impact biodiversité : <strong className="text-slate-700">{issue.importanceBio}/5</strong>
                      </span>
                    )}
                    {score !== null && (
                      <span className="text-[10px] text-slate-500">
                        Matérialité : <strong style={{ color: ml.color }}>{score.toFixed(1)}/5</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setDeleteId(issue.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors mt-0.5 flex-shrink-0"
                  title="Supprimer cet enjeu"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Info panel ─────────────────────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">Génération automatique par IA</p>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Cette matrice est générée automatiquement à partir de vos {depsCount}{" "}
              dépendance{depsCount > 1 ? "s" : ""} à la biodiversité, en analysant pour chaque enjeu :{" "}
              <span className="font-medium">son importance stratégique pour votre organisation</span>,{" "}
              <span className="font-medium">son impact potentiel sur la biodiversité</span>,{" "}
              <span className="font-medium">le contexte de vos activités, sites et chaîne de valeur</span>.
            </p>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet enjeu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enjeu sera supprimé définitivement.
              Vous pourrez toujours régénérer les enjeux à partir de vos dépendances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

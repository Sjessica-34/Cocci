import {
  useListBioDependencies,
  useListBioConnections,
  useListBioIssues,
  type BioDependency,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import {
  FAMILIES, elementLabel, familyIcon, familyColor, familyBg,
  importanceLabel, importanceBg, chainLabel,
} from "../data";

interface Props { orgId: number; }

export function TabSynthese({ orgId }: Props) {
  const { data: depsData,  isLoading: loadingDeps  } = useListBioDependencies(orgId);
  const { data: connData,  isLoading: loadingConns } = useListBioConnections(orgId);
  const { data: issuesData, isLoading: loadingIssues } = useListBioIssues(orgId);

  const elements    = depsData?.items    ?? [];
  const connections = connData?.items    ?? [];
  const issues      = issuesData?.items  ?? [];

  const isLoading = loadingDeps || loadingConns || loadingIssues;

  // ─── Statistiques par famille ─────────────────────────────────────────────

  const countByFamily = (family: string) => elements.filter(e => e.category === family).length;

  // ─── Éléments les plus connectés ─────────────────────────────────────────

  const connCount = new Map<number, number>();
  connections.forEach(c => {
    connCount.set(c.fromElementId, (connCount.get(c.fromElementId) ?? 0) + 1);
    connCount.set(c.toElementId,   (connCount.get(c.toElementId)   ?? 0) + 1);
  });
  const topElements = elements
    .map(el => ({ el, count: connCount.get(el.id) ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ─── Enjeux prioritaires ──────────────────────────────────────────────────

  const priorityIssues = [...issues]
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 5);

  // ─── Vue chaîne de valeur simplifiée ─────────────────────────────────────

  const chain: Record<"amont" | "in-situ" | "aval", BioDependency[]> = {
    "amont":   elements.filter(e => e.chainPosition === "amont"),
    "in-situ": elements.filter(e => e.chainPosition === "in-situ"),
    "aval":    elements.filter(e => e.chainPosition === "aval"),
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const total = elements.length + connections.length + issues.length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
        <p className="text-4xl">📊</p>
        <p className="text-sm max-w-xs">
          Aucune donnée à synthétiser. Commencez par ajouter des éléments dans l'onglet "Saisie".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Synthèse de la chaîne de valeur</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vue agrégée des éléments, connexions et enjeux biodiversité
          </p>
        </div>
        <Button variant="outline" size="sm" disabled title="Export PDF — bientôt disponible">
          <Download className="h-4 w-4 mr-1.5" />
          Exporter
        </Button>
      </div>

      {/* ── Statistiques ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FAMILIES.map(f => (
          <StatCard
            key={f.value}
            icon={f.icon}
            label={f.value + "s"}
            count={countByFamily(f.value)}
            color={f.color}
            bg={f.bg}
          />
        ))}
        <StatCard icon="↔" label="Connexions" count={connections.length} color="#94A3B8" bg="#F8FAFC" />
        <StatCard icon="⚠" label="Enjeux"     count={issues.length}     color="#6366F1" bg="#EEF2FF" />
      </div>

      {/* ── Vue simplifiée de la chaîne de valeur ─────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Chaîne de valeur</h3>
        <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-xl border shadow-sm">
          {(["amont", "in-situ", "aval"] as const).map((zone, i) => {
            const zoneEls = chain[zone];
            const styles = [
              { header: "bg-blue-50 border-blue-200 text-blue-700", col: "bg-blue-50/30" },
              { header: "bg-emerald-50 border-emerald-200 text-emerald-700", col: "bg-emerald-50/30" },
              { header: "bg-purple-50 border-purple-200 text-purple-700", col: "bg-purple-50/30" },
            ][i];
            return (
              <div key={zone} className={`flex flex-col ${i < 2 ? "border-r" : ""}`}>
                <div className={`py-2 px-3 border-b text-center text-[11px] font-bold uppercase tracking-wide ${styles.header}`}>
                  {chainLabel(zone)} ({zoneEls.length})
                </div>
                <div className={`flex-1 p-3 space-y-1.5 min-h-[120px] ${styles.col}`}>
                  {zoneEls.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center mt-4">—</p>
                  ) : zoneEls.map(el => {
                    const lbl = elementLabel(el.name, el.category, el.subCategory);
                    const conns = connCount.get(el.id) ?? 0;
                    return (
                      <div
                        key={el.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/80 border text-xs"
                        style={{ borderLeft: `3px solid ${familyColor(el.category)}` }}
                      >
                        <span className="shrink-0">{familyIcon(el.category)}</span>
                        <span className="flex-1 truncate font-medium text-slate-700">{lbl || "—"}</span>
                        {conns > 0 && (
                          <span className="text-[9px] text-slate-400 shrink-0">{conns}↔</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {elements.filter(e => !e.chainPosition || !["amont","in-situ","aval"].includes(e.chainPosition)).length > 0 && (
          <p className="text-xs text-muted-foreground">
            + {elements.filter(e => !e.chainPosition || !["amont","in-situ","aval"].includes(e.chainPosition)).length} élément(s) sans position définie
          </p>
        )}
      </section>

      {/* ── Éléments les plus connectés ───────────────────────────────────── */}
      {topElements.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Principaux flux — éléments les plus connectés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topElements.map(({ el, count }) => {
              const lbl   = elementLabel(el.name, el.category, el.subCategory);
              const color = familyColor(el.category);
              const bg    = familyBg(el.category);
              const maxConns = topElements[0]?.count ?? 1;
              return (
                <div
                  key={el.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border bg-white shadow-sm"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <span
                    className="text-xl shrink-0 rounded-lg flex items-center justify-center"
                    style={{ width: 36, height: 36, backgroundColor: bg }}
                  >
                    {familyIcon(el.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-800">{lbl || "—"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(count / maxConns) * 100}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {count} connexion{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Enjeux prioritaires ───────────────────────────────────────────── */}
      {priorityIssues.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Enjeux prioritaires</h3>
          <div className="space-y-2">
            {priorityIssues.map(issue => {
              const colors = importanceBg(issue.importance);
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <div
                    className="text-xs font-bold rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 28, height: 28,
                      backgroundColor: colors.border,
                      color: "white",
                    }}
                  >
                    {issue.importance ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                      {issue.name ?? "Enjeu sans nom"}
                    </p>
                    {issue.chainPosition && (
                      <p className="text-[10px] opacity-70" style={{ color: colors.text }}>
                        {chainLabel(issue.chainPosition)}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors.border, color: "white" }}
                  >
                    {importanceLabel(issue.importance)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, count, color, bg,
}: {
  icon: string; label: string; count: number; color: string; bg: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border p-4 text-center shadow-sm"
      style={{ backgroundColor: bg, borderColor: color + "40" }}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-2xl font-bold" style={{ color }}>{count}</span>
      <span className="text-[11px] text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

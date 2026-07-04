import { useRef, useState } from "react";
import type { IssueRatedItem } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  "Changements climatiques": "#14b8a6",
  "Biodiversité": "#22c55e",
  "Communication / Marketing": "#f97316",
  "Pratiques responsables des affaires": "#6366f1",
  "Diversité, égalité et inclusion": "#ec4899",
  "Santé et sécurité": "#ef4444",
  "Économie circulaire": "#84cc16",
  "Bien-être et vie quotidienne": "#8b5cf6",
  "Excellence opérationnelle": "#3b82f6",
  "Création de valeur locale": "#f59e0b",
  "Patrimoine et ancrage territorial": "#10b981",
  "Personnalisés": "#94a3b8",
};

const SVG_W = 560;
const SVG_H = 480;
const PAD = { top: 30, right: 30, bottom: 50, left: 50 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

function plotX(v: number) { return PAD.left + ((v - 1) / 4) * PLOT_W; }
function plotY(v: number) { return PAD.top + PLOT_H - ((v - 1) / 4) * PLOT_H; }

type Props = { items: IssueRatedItem[]; top12Keys: Set<string> };

export function TabMatriceViz({ items, top12Keys }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: IssueRatedItem } | null>(null);

  const rated = items.filter((i) => i.stakeholderScore != null && i.companyScore != null);

  if (rated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <p className="font-medium">Aucun enjeu noté</p>
        <p className="text-sm mt-1">Notez des enjeux dans l'onglet Bibliothèque pour voir la matrice.</p>
      </div>
    );
  }

  const categories = [...new Set(rated.map((i) => i.category))];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Matrice de matérialité</h2>
        <p className="text-sm text-muted-foreground">
          Les <span className="font-medium text-emerald-600">{Math.min(12, rated.length)} enjeux prioritaires</span> (entourés) seront analysés par l'IA.
        </p>
      </div>

      <div ref={containerRef} className="relative rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ maxHeight: 480 }} className="select-none">
          {/* Quadrant backgrounds */}
          <rect x={PAD.left} y={PAD.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="#f8fafc" />
          <rect x={PAD.left + PLOT_W / 2} y={PAD.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="#f0fdf4" />
          <rect x={PAD.left} y={PAD.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="#fef9f0" />
          <rect x={PAD.left + PLOT_W / 2} y={PAD.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="#fef2f2" />

          {/* Quadrant labels */}
          <text x={PAD.left + 6} y={PAD.top + 14} fontSize={9} fill="#94a3b8">Enjeux secondaires</text>
          <text x={PAD.left + PLOT_W / 2 + 6} y={PAD.top + 14} fontSize={9} fill="#16a34a">Enjeux stratégiques</text>
          <text x={PAD.left + 6} y={PAD.top + PLOT_H - 6} fontSize={9} fill="#94a3b8">Faible importance</text>
          <text x={PAD.left + PLOT_W / 2 + 6} y={PAD.top + PLOT_H - 6} fontSize={9} fill="#d97706">Enjeux à surveiller</text>

          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={plotX(v)} y1={PAD.top} x2={plotX(v)} y2={PAD.top + PLOT_H} stroke="#e2e8f0" strokeWidth={0.5} />
              <line x1={PAD.left} y1={plotY(v)} x2={PAD.left + PLOT_W} y2={plotY(v)} stroke="#e2e8f0" strokeWidth={0.5} />
              <text x={plotX(v)} y={PAD.top + PLOT_H + 15} textAnchor="middle" fontSize={10} fill="#94a3b8">{v}</text>
              <text x={PAD.left - 12} y={plotY(v)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#94a3b8">{v}</text>
            </g>
          ))}

          {/* Center dividers */}
          <line x1={plotX(3)} y1={PAD.top} x2={plotX(3)} y2={PAD.top + PLOT_H} stroke="#cbd5e1" strokeWidth={1.5} />
          <line x1={PAD.left} y1={plotY(3)} x2={PAD.left + PLOT_W} y2={plotY(3)} stroke="#cbd5e1" strokeWidth={1.5} />

          {/* Axis labels */}
          <text x={PAD.left + PLOT_W / 2} y={SVG_H - 8} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={600}>
            Importance pour les parties prenantes →
          </text>
          <text x={14} y={PAD.top + PLOT_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#475569" fontWeight={600} transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}>
            Importance pour l'entreprise →
          </text>

          {/* Points */}
          {rated.map((item) => {
            const cx = plotX(item.stakeholderScore!);
            const cy = plotY(item.companyScore!);
            const color = CATEGORY_COLORS[item.category] ?? "#94a3b8";
            const isPriority = top12Keys.has(item.key);
            return (
              <g
                key={item.key}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const svgEl = e.currentTarget.closest("svg")!;
                  const svgRect = svgEl.getBoundingClientRect();
                  setTooltip({
                    x: cx * (svgRect.width / SVG_W) + svgRect.left - rect.left,
                    y: cy * (svgRect.height / SVG_H) + svgRect.top - rect.top,
                    item,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {isPriority && (
                  <circle cx={cx} cy={cy} r={16} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
                )}
                <circle cx={cx} cy={cy} r={isPriority ? 9 : 6} fill={color} opacity={isPriority ? 0.9 : 0.5} />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs w-56"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 240),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <p className="font-semibold text-foreground text-sm mb-0.5 leading-snug">{tooltip.item.label}</p>
            <p className="text-muted-foreground mb-2">{tooltip.item.category}</p>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parties prenantes</span>
                <span className="font-medium">{tooltip.item.stakeholderScore}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entreprise</span>
                <span className="font-medium">{tooltip.item.companyScore}/5</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground">Moyenne</span>
                <span className="font-semibold text-foreground">
                  {(((tooltip.item.stakeholderScore ?? 0) + (tooltip.item.companyScore ?? 0)) / 2).toFixed(1)}/5
                </span>
              </div>
            </div>
            {top12Keys.has(tooltip.item.key) && (
              <p className="mt-2 text-[10px] text-emerald-600 font-medium">✓ Enjeu prioritaire (top 12)</p>
            )}
          </div>
        )}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#94a3b8" }} />
            <span className="text-xs text-muted-foreground">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

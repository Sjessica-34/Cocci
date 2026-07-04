import { useState, useRef } from "react";
import type { Stakeholder } from "@workspace/api-client-react";
import { STAKEHOLDER_CATEGORIES, CATEGORY_COLORS } from "../constants";
import { Users2 } from "lucide-react";

const W = 780;
const H = 780;
const CX = W / 2;
const CY = H / 2;
const CENTER_R = 48;
const NODE_R = 17;

const RING_RADII: Record<number, number> = {
  5: 98,
  4: 135,
  3: 172,
  2: 209,
  1: 246,
};
const ALL_INTEREST = [5, 4, 3, 2, 1] as const;
const LABEL_R = 295;

type PlacedNode = Stakeholder & {
  x: number;
  y: number;
  color: string;
  catLabel: string;
  catIcon: string;
};

function computePositions(stakeholders: Stakeholder[]): PlacedNode[] {
  const byCategory: Record<string, Stakeholder[]> = {};
  stakeholders.forEach((s) => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  const activeCats = STAKEHOLDER_CATEGORIES.filter((c) => (byCategory[c.key]?.length ?? 0) > 0);
  if (activeCats.length === 0) return [];

  const sectorAngle = (2 * Math.PI) / activeCats.length;
  const placed: PlacedNode[] = [];

  activeCats.forEach((cat, ci) => {
    const sectorCenter = ci * sectorAngle - Math.PI / 2;
    const items = byCategory[cat.key] ?? [];

    const byInterest: Record<number, Stakeholder[]> = {};
    items.forEach((s) => {
      const lvl = Math.max(1, Math.min(5, Math.round(s.interest)));
      if (!byInterest[lvl]) byInterest[lvl] = [];
      byInterest[lvl].push(s);
    });

    Object.entries(byInterest).forEach(([lvlStr, lvlItems]) => {
      const lvl = Number(lvlStr);
      const r = RING_RADII[lvl];
      const maxSpread = Math.min(sectorAngle * 0.72, (Math.PI * 2) / 5);
      lvlItems.forEach((s, si) => {
        const t = lvlItems.length === 1 ? 0.5 : si / (lvlItems.length - 1);
        const angle = sectorCenter + (t - 0.5) * maxSpread;
        placed.push({
          ...s,
          x: CX + r * Math.cos(angle),
          y: CY + r * Math.sin(angle),
          color: CATEGORY_COLORS[cat.key] ?? "#94a3b8",
          catLabel: cat.label,
          catIcon: cat.icon,
        });
      });
    });
  });

  return placed;
}

function wrapLabel(text: string, maxChars = 15): string[] {
  const upper = text.toUpperCase();
  const words = upper.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur += (cur ? " " : "") + w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

type TooltipData = { x: number; y: number; node: PlacedNode };
type Props = { stakeholders: Stakeholder[] };

export function TabCartographie({ stakeholders }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const placed = computePositions(stakeholders);
  const activeCats = STAKEHOLDER_CATEGORIES.filter((c) =>
    stakeholders.some((s) => s.category === c.key),
  );

  if (stakeholders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users2 className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune donnée à visualiser</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez des parties prenantes dans l'onglet Saisie pour générer la cartographie.
        </p>
      </div>
    );
  }

  const sectorAngle = (2 * Math.PI) / activeCats.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cartographie des parties prenantes</h2>
        <p className="text-sm text-muted-foreground">
          Classement par catégorie (secteur) et par intérêt (distance — plus proche du centre = intérêt plus élevé).
        </p>
      </div>

      <div ref={containerRef} className="relative bg-white dark:bg-muted/10 rounded-xl border border-border overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxHeight: 680 }}
          className="select-none"
        >
          {/* 5 concentric rings */}
          {ALL_INTEREST.map((lvl) => (
            <circle
              key={lvl}
              cx={CX}
              cy={CY}
              r={RING_RADII[lvl]}
              fill={lvl === 5 ? "rgba(20,184,166,0.04)" : "none"}
              stroke="#e2e8f0"
              strokeWidth={lvl === 3 ? 1.5 : 1}
              strokeDasharray={lvl === 3 ? "none" : "5 5"}
            />
          ))}

          {/* Interest level labels on rings */}
          {ALL_INTEREST.map((lvl) => (
            <text
              key={lvl}
              x={CX + RING_RADII[lvl] - 4}
              y={CY - 5}
              textAnchor="end"
              fontSize={8}
              fill="#94a3b8"
            >
              {lvl}
            </text>
          ))}

          {/* Sector dividers (subtle dashed lines) */}
          {activeCats.length > 1 &&
            activeCats.map((_, ci) => {
              const angle = ci * sectorAngle - Math.PI / 2 - sectorAngle / 2;
              return (
                <line
                  key={ci}
                  x1={CX + (CENTER_R + 2) * Math.cos(angle)}
                  y1={CY + (CENTER_R + 2) * Math.sin(angle)}
                  x2={CX + (RING_RADII[1] + 8) * Math.cos(angle)}
                  y2={CY + (RING_RADII[1] + 8) * Math.sin(angle)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
              );
            })}

          {/* Category labels (full name, uppercase, colored) */}
          {activeCats.map((cat, ci) => {
            const angle = ci * sectorAngle - Math.PI / 2;
            const lx = CX + LABEL_R * Math.cos(angle);
            const ly = CY + LABEL_R * Math.sin(angle);
            const color = CATEGORY_COLORS[cat.key] ?? "#94a3b8";
            const lines = wrapLabel(cat.label, 14);
            const lineH = 13;
            const totalH = lines.length * lineH;
            return (
              <text
                key={cat.key}
                textAnchor="middle"
                fontSize={10}
                fill={color}
                fontWeight={700}
                letterSpacing={0.3}
              >
                {lines.map((line, li) => (
                  <tspan
                    key={li}
                    x={lx}
                    y={ly - totalH / 2 + li * lineH + lineH / 2}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}

          {/* Center circle */}
          <circle cx={CX} cy={CY} r={CENTER_R} fill="hsl(175 60% 22%)" />
          <text textAnchor="middle" fontSize={8} fill="white" fontWeight={700} letterSpacing={0.5}>
            <tspan x={CX} y={CY - 5}>VOTRE</tspan>
            <tspan x={CX} y={CY + 7}>ENTREPRISE</tspan>
          </text>

          {/* Stakeholder nodes */}
          {placed.map((node) => {
            const label = node.subcategory ?? "";
            const truncated = label.length > 14 ? label.slice(0, 12) + "…" : label;
            return (
              <g
                key={node.id}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const svgEl = e.currentTarget.closest("svg")!;
                  const svgRect = svgEl.getBoundingClientRect();
                  setTooltip({
                    x: node.x * (svgRect.width / W) + svgRect.left - rect.left,
                    y: node.y * (svgRect.height / H) + svgRect.top - rect.top,
                    node,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-pointer"
              >
                <circle cx={node.x} cy={node.y} r={NODE_R + 4} fill={node.color} opacity={0.12} />
                <circle cx={node.x} cy={node.y} r={NODE_R} fill="white" stroke={node.color} strokeWidth={2} />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill={node.color}
                  fontWeight={700}
                >
                  {((node.subcategory ?? node.catLabel)[0] ?? "?").toUpperCase()}
                </text>
                {truncated && (
                  <text
                    x={node.x}
                    y={node.y + NODE_R + 9}
                    textAnchor="middle"
                    fontSize={7}
                    fill="#475569"
                  >
                    {truncated}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs w-52"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 224),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <div className="h-1.5 rounded-full mb-2" style={{ backgroundColor: tooltip.node.color }} />
            <p className="font-semibold text-foreground text-sm mb-0.5">
              {tooltip.node.subcategory ?? tooltip.node.catLabel}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {tooltip.node.catIcon} {tooltip.node.catLabel}
            </p>
            {tooltip.node.name && (
              <p className="text-muted-foreground text-[11px]">{tooltip.node.name}</p>
            )}
            <div className="mt-2 space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Influence</span>
                <span className="font-medium">{tooltip.node.influence}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intérêt</span>
                <span className="font-medium">{tooltip.node.interest}/5</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interest legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Intérêt :</span>
        {(["5 — Très élevé", "4 — Élevé", "3 — Moyen", "2 — Faible", "1 — Très faible"] as const).map((lbl) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full border border-border bg-muted" />
            <span className="text-[11px] text-muted-foreground">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-3">
        {activeCats.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.key] }} />
            <span className="text-xs text-muted-foreground">{cat.icon} {cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

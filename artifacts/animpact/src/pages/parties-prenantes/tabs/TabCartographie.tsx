import { useState, useRef } from "react";
import type { Stakeholder } from "@workspace/api-client-react";
import { STAKEHOLDER_CATEGORIES, CATEGORY_COLORS, getCategoryByKey } from "../constants";
import { Users2 } from "lucide-react";

const W = 560;
const H = 520;
const CX = W / 2;
const CY = H / 2 + 10;
const MIN_R = 70;
const MAX_R = 210;

type PlacedNode = Stakeholder & {
  x: number;
  y: number;
  bubbleR: number;
  color: string;
  catIcon: string;
  catLabel: string;
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
    const spread = activeCats.length === 1 ? Math.PI * 0.8 : Math.min(sectorAngle * 0.65, Math.PI / 2.5);

    items.forEach((s, si) => {
      const importance = (s.influence + s.interest) / 2;
      const radius = MAX_R - ((importance - 1) / 4) * (MAX_R - MIN_R);
      const t = items.length === 1 ? 0.5 : si / (items.length - 1);
      const angleOffset = (t - 0.5) * spread;
      const angle = sectorCenter + angleOffset;
      placed.push({
        ...s,
        x: CX + radius * Math.cos(angle),
        y: CY + radius * Math.sin(angle),
        bubbleR: Math.round(7 + importance * 2.5),
        color: CATEGORY_COLORS[cat.key] ?? "#94a3b8",
        catIcon: cat.icon,
        catLabel: cat.label,
      });
    });
  });

  return placed;
}

function getLabelPos(ci: number, total: number) {
  const angle = (ci * (2 * Math.PI)) / total - Math.PI / 2;
  const r = MAX_R + 38;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), angle };
}

type TooltipData = {
  x: number;
  y: number;
  node: PlacedNode;
};

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cartographie des parties prenantes</h2>
        <p className="text-sm text-muted-foreground">
          Visualisation radiale — plus une partie prenante est proche du centre, plus son importance est élevée.
        </p>
      </div>

      <div ref={containerRef} className="relative bg-muted/20 rounded-xl border border-border overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxHeight: 520 }}
          className="select-none"
        >
          {/* Concentric circle guides */}
          {[MIN_R, (MIN_R + MAX_R) / 2, MAX_R].map((r, i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              className="text-border/50"
              strokeDasharray="4 4"
            />
          ))}

          {/* Sector dividers */}
          {activeCats.length > 1 &&
            activeCats.map((_, ci) => {
              const angle = (ci * (2 * Math.PI)) / activeCats.length - Math.PI / 2;
              return (
                <line
                  key={ci}
                  x1={CX}
                  y1={CY}
                  x2={CX + (MAX_R + 10) * Math.cos(angle)}
                  y2={CY + (MAX_R + 10) * Math.sin(angle)}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-border/30"
                />
              );
            })}

          {/* Category labels */}
          {activeCats.map((cat, ci) => {
            const { x, y } = getLabelPos(ci, activeCats.length);
            const color = CATEGORY_COLORS[cat.key] ?? "#94a3b8";
            return (
              <text
                key={cat.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill={color}
                fontWeight={600}
              >
                {cat.icon} {cat.label.split(" ").slice(0, 2).join(" ")}
              </text>
            );
          })}

          {/* Company center */}
          <circle cx={CX} cy={CY} r={26} fill="hsl(175 73% 18%)" opacity={0.9} />
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="white"
            fontWeight={700}
          >
            Votre
          </text>
          <text
            x={CX}
            y={CY + 7}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="white"
            fontWeight={700}
          >
            entreprise
          </text>

          {/* Stakeholder nodes */}
          {placed.map((node) => (
            <g
              key={node.id}
              onMouseEnter={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const svgEl = e.currentTarget.closest("svg")!;
                const svgRect = svgEl.getBoundingClientRect();
                const scaleX = svgRect.width / W;
                const scaleY = svgRect.height / H;
                setTooltip({
                  x: node.x * scaleX + svgRect.left - rect.left,
                  y: node.y * scaleY + svgRect.top - rect.top,
                  node,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.bubbleR + 4}
                fill={node.color}
                opacity={0.15}
              />
              <circle cx={node.x} cy={node.y} r={node.bubbleR} fill={node.color} opacity={0.9} />
              {node.bubbleR > 11 && (
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill="white"
                  fontWeight={700}
                >
                  {((node.name ?? "?")[0] ?? "?").toUpperCase()}
                </text>
              )}
              <text
                x={node.x}
                y={node.y + node.bubbleR + 10}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                className="text-foreground/70"
              >
                {(node.name ?? "Sans nom").length > 14 ? (node.name ?? "Sans nom").slice(0, 12) + "…" : (node.name ?? "Sans nom")}
              </text>
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs w-52"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 220),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <div
              className="h-1.5 rounded-full mb-2"
              style={{ backgroundColor: tooltip.node.color }}
            />
            <p className="font-semibold text-foreground text-sm mb-0.5">{tooltip.node.name ?? "Sans nom"}</p>
            <p className="text-muted-foreground">
              {tooltip.node.catIcon} {tooltip.node.catLabel}
            </p>
            {tooltip.node.subcategory && (
              <p className="text-muted-foreground">{tooltip.node.subcategory}</p>
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {activeCats.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
            />
            <span className="text-xs text-muted-foreground">
              {cat.icon} {cat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

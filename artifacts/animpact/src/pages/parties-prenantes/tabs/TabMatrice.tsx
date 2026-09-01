import { useState, useRef, useCallback } from "react";
import type { Stakeholder } from "@workspace/api-client-react";
import { STAKEHOLDER_CATEGORIES, CATEGORY_COLORS, getCategoryByKey } from "../constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, RotateCcw, Download, Search, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

// SVG layout constants
const PAD = { left: 60, right: 30, top: 30, bottom: 60 };
const PLOT_W = 480;
const PLOT_H = 380;
const SVG_W = PAD.left + PLOT_W + PAD.right;
const SVG_H = PAD.top + PLOT_H + PAD.bottom;

function plotX(interest: number) {
  return PAD.left + ((interest - 1) / 4) * PLOT_W;
}
function plotY(influence: number) {
  return PAD.top + PLOT_H - ((influence - 1) / 4) * PLOT_H;
}

const MID_X = plotX(3);
const MID_Y = plotY(3);

const QUADRANTS = [
  {
    id: "tl",
    label: "À gérer avec attention",
    x: PAD.left,
    y: PAD.top,
    w: MID_X - PAD.left,
    h: MID_Y - PAD.top,
    fill: "#fff7ed",
    textColor: "#b45309",
  },
  {
    id: "tr",
    label: "Partenaires clés ⭐",
    x: MID_X,
    y: PAD.top,
    w: PAD.left + PLOT_W - MID_X,
    h: MID_Y - PAD.top,
    fill: "#f0fdf4",
    textColor: "#16a34a",
  },
  {
    id: "bl",
    label: "À surveiller",
    x: PAD.left,
    y: MID_Y,
    w: MID_X - PAD.left,
    h: PAD.top + PLOT_H - MID_Y,
    fill: "#f8fafc",
    textColor: "#64748b",
  },
  {
    id: "br",
    label: "À impliquer",
    x: MID_X,
    y: MID_Y,
    w: PAD.left + PLOT_W - MID_X,
    h: PAD.top + PLOT_H - MID_Y,
    fill: "#eff6ff",
    textColor: "#2563eb",
  },
];

type TooltipData = {
  x: number;
  y: number;
  stakeholder: Stakeholder;
};

type Props = { stakeholders: Stakeholder[] };

export function TabMatrice({ stakeholders }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const activeCats = STAKEHOLDER_CATEGORIES.filter((c) =>
    stakeholders.some((s) => s.category === c.key),
  );

  const filtered = filterCat === "all" ? stakeholders : stakeholders.filter((s) => s.category === filterCat);

  const searchLower = search.toLowerCase();

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({ x: dragStart.current.tx + dx, y: dragStart.current.ty + dy });
  }
  function onMouseUp() {
    isDragging.current = false;
  }

  function zoom(delta: number) {
    setScale((prev) => Math.min(3, Math.max(0.6, prev + delta)));
  }

  function reset() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function exportPng() {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    // Serialize the SVG
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ratio = 2;
    canvas.width = SVG_W * ratio;
    canvas.height = SVG_H * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SVG_W, SVG_H);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, SVG_W, SVG_H);
      const link = document.createElement("a");
      link.download = "matrice-influence-interet.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    img.src = URL.createObjectURL(blob);
  }

  if (stakeholders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users2 className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune donnée à visualiser</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez des parties prenantes dans l'onglet Saisie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Matrice Influence × Intérêt</h2>
          <p className="text-sm text-muted-foreground">
            Glissez pour déplacer · Zoomez pour explorer
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              className="pl-8 h-8 text-xs w-36"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoom(0.25)}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoom(-0.25)}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={exportPng}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category filter */}
      {activeCats.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={filterCat === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterCat("all")}
          >
            Tous
          </Button>
          {activeCats.map((cat) => (
            <Button
              key={cat.key}
              variant={filterCat === cat.key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilterCat(cat.key)}
            >
              {cat.icon}
            </Button>
          ))}
        </div>
      )}

      {/* SVG container */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-border bg-white overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: 480 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 0.15s ease",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="select-none w-full h-auto max-w-full"
            style={{ overflow: "visible" }}
          >
            {/* Quadrant backgrounds */}
            {QUADRANTS.map((q) => (
              <g key={q.id}>
                <rect
                  x={q.x}
                  y={q.y}
                  width={q.w}
                  height={q.h}
                  fill={q.fill}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={q.x + q.w / 2}
                  y={q.y + q.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={q.textColor}
                  opacity={0.6}
                  fontWeight={500}
                >
                  {q.label}
                </text>
              </g>
            ))}

            {/* Grid lines */}
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line
                  x1={plotX(v)}
                  y1={PAD.top}
                  x2={plotX(v)}
                  y2={PAD.top + PLOT_H}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <line
                  x1={PAD.left}
                  y1={plotY(v)}
                  x2={PAD.left + PLOT_W}
                  y2={plotY(v)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
              </g>
            ))}

            {/* Axes */}
            <line
              x1={PAD.left}
              y1={PAD.top + PLOT_H}
              x2={PAD.left + PLOT_W}
              y2={PAD.top + PLOT_H}
              stroke="#94a3b8"
              strokeWidth={1.5}
            />
            <line
              x1={PAD.left}
              y1={PAD.top}
              x2={PAD.left}
              y2={PAD.top + PLOT_H}
              stroke="#94a3b8"
              strokeWidth={1.5}
            />

            {/* Axis labels */}
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <text
                  x={plotX(v)}
                  y={PAD.top + PLOT_H + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#64748b"
                >
                  {v}
                </text>
                <text
                  x={PAD.left - 14}
                  y={plotY(v)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#64748b"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Axis titles */}
            <text
              x={PAD.left + PLOT_W / 2}
              y={SVG_H - 8}
              textAnchor="middle"
              fontSize={12}
              fill="#475569"
              fontWeight={600}
            >
              Intérêt →
            </text>
            <text
              x={14}
              y={PAD.top + PLOT_H / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fill="#475569"
              fontWeight={600}
              transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
            >
              Influence →
            </text>

            {/* Stakeholder dots */}
            {filtered.map((s) => {
              const cx = plotX(s.interest);
              const cy = plotY(s.influence);
              const color = CATEGORY_COLORS[s.category] ?? "#94a3b8";
              const isHighlighted =
                searchLower === "" ||
                (s.subcategory ?? "").toLowerCase().includes(searchLower) ||
                (s.name ?? "").toLowerCase().includes(searchLower);
              return (
                <g
                  key={s.id}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const svgEl = e.currentTarget.closest("svg")!;
                    const svgRect = svgEl.getBoundingClientRect();
                    const scaleX = svgRect.width / SVG_W;
                    const scaleY = svgRect.height / SVG_H;
                    setTooltip({
                      x: cx * scaleX * scale + translate.x + (containerRef.current!.offsetWidth / 2 - (SVG_W * scaleX * scale) / 2),
                      y: cy * scaleY * scale + translate.y + (240 - (SVG_H * scaleY * scale) / 2),
                      stakeholder: s,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={14}
                    fill={color}
                    opacity={isHighlighted ? 0.9 : 0.15}
                    stroke={isHighlighted ? "white" : "transparent"}
                    strokeWidth={1.5}
                  />
                  {isHighlighted && (
                    <text
                      x={cx}
                      y={cy - 18}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#334155"
                      fontWeight={500}
                    >
                      {(s.subcategory ?? "").length > 12 ? (s.subcategory ?? "").slice(0, 10) + "…" : (s.subcategory ?? "")}
                    </text>
                  )}
                  {isHighlighted && (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={8}
                      fill="white"
                      fontWeight={700}
                    >
                      {((s.subcategory ?? s.category)[0] ?? "?").toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs w-48"
            style={{
              left: Math.min(tooltip.x + 16, (containerRef.current?.offsetWidth ?? 400) - 210),
              top: Math.max(tooltip.y - 70, 4),
            }}
          >
            <p className="font-semibold text-foreground text-sm">
              {tooltip.stakeholder.subcategory ?? getCategoryByKey(tooltip.stakeholder.category)?.label}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {getCategoryByKey(tooltip.stakeholder.category)?.icon}{" "}
              {getCategoryByKey(tooltip.stakeholder.category)?.label}
            </p>
            {tooltip.stakeholder.name && (
              <p className="text-muted-foreground text-[11px] mb-2">{tooltip.stakeholder.name}</p>
            )}
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Influence</span>
                <span className="font-medium">{tooltip.stakeholder.influence}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intérêt</span>
                <span className="font-medium">{tooltip.stakeholder.interest}/5</span>
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

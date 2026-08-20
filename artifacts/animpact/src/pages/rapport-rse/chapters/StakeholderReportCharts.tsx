import { CATEGORY_COLORS, STAKEHOLDER_CATEGORIES } from "../../parties-prenantes/constants";
import { R } from "./_shared";

type RawStakeholder = Record<string, unknown>;

type StakeholderPoint = {
  id: string;
  category: string;
  label: string;
  influence: number;
  interest: number;
  color: string;
};

type PlacedStakeholder = StakeholderPoint & {
  x: number;
  y: number;
};

const REPORT_CATEGORIES = STAKEHOLDER_CATEGORIES;
const RADIAL = {
  width: 640,
  height: 600,
  cx: 320,
  cy: 300,
  centerRadius: 42,
  nodeRadius: 14,
  labelRadius: 232,
  radii: { 5: 74, 4: 106, 3: 138, 2: 170, 1: 202 } as Record<number, number>,
};

const MATRIX = {
  left: 70,
  right: 32,
  top: 32,
  bottom: 64,
  plotWidth: 510,
  plotHeight: 360,
};
const MATRIX_WIDTH = MATRIX.left + MATRIX.plotWidth + MATRIX.right;
const MATRIX_HEIGHT = MATRIX.top + MATRIX.plotHeight + MATRIX.bottom;

function clampScore(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(5, Math.round(numeric))) : 3;
}

function toPoints(stakeholders: RawStakeholder[]): StakeholderPoint[] {
  return stakeholders.map((stakeholder, index) => {
    const category = String(stakeholder.category ?? "other");
    return {
      id: String(stakeholder.id ?? index),
      category,
      label: String(stakeholder.subcategory ?? stakeholder.name ?? "Partie prenante"),
      influence: clampScore(stakeholder.influence),
      interest: clampScore(stakeholder.interest),
      color: CATEGORY_COLORS[category] ?? "#94A3B8",
    };
  });
}

function arcPath(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const large = a2 - a1 > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => [
    cx + radius * Math.cos(angle),
    cy + radius * Math.sin(angle),
  ] as const;
  const [x1, y1] = point(r1, a1);
  const [x2, y2] = point(r2, a1);
  const [x3, y3] = point(r2, a2);
  const [x4, y4] = point(r1, a2);
  return `M${x1},${y1} L${x2},${y2} A${r2},${r2},0,${large},1,${x3},${y3} L${x4},${y4} A${r1},${r1},0,${large},0,${x1},${y1}Z`;
}

function wrapLabel(text: string, maxCharacters = 15) {
  const words = text.toUpperCase().split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (current && current.length + word.length + 1 > maxCharacters) {
      lines.push(current);
      current = word;
      return;
    }
    current += `${current ? " " : ""}${word}`;
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function shortLabel(label: string, maxLength = 15) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function placeStakeholders(points: StakeholderPoint[], categories: typeof REPORT_CATEGORIES): PlacedStakeholder[] {
  const byCategory = new Map<string, StakeholderPoint[]>();
  points.forEach((point) => {
    const current = byCategory.get(point.category) ?? [];
    current.push(point);
    byCategory.set(point.category, current);
  });

  const sectorAngle = (Math.PI * 2) / categories.length;
  const placed: PlacedStakeholder[] = [];

  categories.forEach((category, categoryIndex) => {
    const items = byCategory.get(category.key) ?? [];
    const byInterest = new Map<number, StakeholderPoint[]>();
    items.forEach((item) => {
      const current = byInterest.get(item.interest) ?? [];
      current.push(item);
      byInterest.set(item.interest, current);
    });

    const sectorCenter = categoryIndex * sectorAngle - Math.PI / 2;
    byInterest.forEach((interestItems, interest) => {
      const radius = RADIAL.radii[interest];
      const spread = Math.min(sectorAngle * 0.68, (Math.PI * 2) / 5);
      interestItems.forEach((item, itemIndex) => {
        const ratio = interestItems.length === 1 ? 0.5 : itemIndex / (interestItems.length - 1);
        const angle = sectorCenter + (ratio - 0.5) * spread;
        placed.push({
          ...item,
          x: RADIAL.cx + radius * Math.cos(angle),
          y: RADIAL.cy + radius * Math.sin(angle),
        });
      });
    });
  });

  return placed;
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid #E2E8F0",
      backgroundColor: "white",
      borderRadius: 12,
      padding: "14px 16px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}>
      {children}
    </div>
  );
}

function ChartCaption({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{
        margin: 0,
        color: R.dark,
        fontFamily: "sans-serif",
        fontSize: 14,
        fontWeight: 700,
      }}>
        {title}
      </p>
      <p style={{
        margin: "3px 0 0",
        color: R.gray,
        fontFamily: "sans-serif",
        fontSize: 11,
        lineHeight: 1.45,
      }}>
        {children}
      </p>
    </div>
  );
}

function StakeholderCartography({ points }: { points: StakeholderPoint[] }) {
  const categories = REPORT_CATEGORIES.filter((category) => points.some((point) => point.category === category.key));
  const placed = placeStakeholders(points, categories);
  const sectorAngle = (Math.PI * 2) / categories.length;

  return (
    <ChartFrame>
      <ChartCaption title="Cartographie des parties prenantes">
        La distance par rapport à l’entreprise représente le niveau d’intérêt : plus une partie prenante est proche du centre, plus son intérêt est élevé.
      </ChartCaption>
      <svg
        viewBox={`0 0 ${RADIAL.width} ${RADIAL.height}`}
        width="100%"
        role="img"
        aria-label="Cartographie des parties prenantes par catégorie et niveau d’intérêt"
        style={{ display: "block", maxHeight: 520 }}
      >
        {categories.map((category, index) => {
          const halfSector = sectorAngle / 2;
          const startAngle = index * sectorAngle - Math.PI / 2 - halfSector;
          const endAngle = index * sectorAngle - Math.PI / 2 + halfSector;
          return (
            <path
              key={`${category.key}-sector`}
              d={arcPath(RADIAL.cx, RADIAL.cy, RADIAL.centerRadius + 2, RADIAL.radii[1] + 8, startAngle, endAngle)}
              fill={CATEGORY_COLORS[category.key] ?? "#94A3B8"}
              opacity={0.07}
            />
          );
        })}

        {[5, 4, 3, 2, 1].map((interest) => (
          <g key={interest}>
            <circle
              cx={RADIAL.cx}
              cy={RADIAL.cy}
              r={RADIAL.radii[interest]}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={interest === 3 ? 1.5 : 1}
              strokeDasharray={interest === 3 ? undefined : "5 5"}
            />
            <text
              x={RADIAL.cx + RADIAL.radii[interest] - 4}
              y={RADIAL.cy - 5}
              textAnchor="end"
              fill="#94A3B8"
              fontSize={9}
              fontFamily="sans-serif"
            >
              {interest}
            </text>
          </g>
        ))}

        {categories.length > 1 && categories.map((_, index) => {
          const angle = index * sectorAngle - Math.PI / 2 - sectorAngle / 2;
          return (
            <line
              key={`divider-${index}`}
              x1={RADIAL.cx + (RADIAL.centerRadius + 3) * Math.cos(angle)}
              y1={RADIAL.cy + (RADIAL.centerRadius + 3) * Math.sin(angle)}
              x2={RADIAL.cx + (RADIAL.radii[1] + 8) * Math.cos(angle)}
              y2={RADIAL.cy + (RADIAL.radii[1] + 8) * Math.sin(angle)}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {categories.map((category, index) => {
          const angle = index * sectorAngle - Math.PI / 2;
          const lines = wrapLabel(category.label);
          const x = RADIAL.cx + RADIAL.labelRadius * Math.cos(angle);
          const y = RADIAL.cy + RADIAL.labelRadius * Math.sin(angle);
          return (
            <text
              key={`${category.key}-label`}
              fill={CATEGORY_COLORS[category.key] ?? "#94A3B8"}
              fontFamily="sans-serif"
              fontSize={10}
              fontWeight={700}
              letterSpacing={0.25}
              textAnchor="middle"
            >
              {lines.map((line, lineIndex) => (
                <tspan key={line} x={x} y={y - ((lines.length - 1) * 6) + lineIndex * 12}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}

        <circle cx={RADIAL.cx} cy={RADIAL.cy} r={RADIAL.centerRadius} fill={R.green} />
        <g transform={`translate(${RADIAL.cx}, ${RADIAL.cy - 8})`} fill="white" opacity={0.94}>
          <rect x="-14" y="-14" width="12" height="22" rx="0.5" />
          <rect x="1" y="-8" width="13" height="16" rx="0.5" />
          {[-11, -6].flatMap((x) => [-11, -6, -1].map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="2.5" height="2.5" fill={R.green} rx="0.35" />
          )))}
          {[[4, -5], [9, -5], [4, 0], [9, 0]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="2.5" height="2.5" fill={R.green} rx="0.35" />
          ))}
        </g>
        <text
          x={RADIAL.cx}
          y={RADIAL.cy + 30}
          textAnchor="middle"
          fill="white"
          fontFamily="sans-serif"
          fontSize={7.5}
          fontWeight={700}
          letterSpacing={0.7}
        >
          ENTREPRISE
        </text>

        {placed.map((point) => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r={RADIAL.nodeRadius + 4} fill={point.color} opacity={0.12} />
            <circle cx={point.x} cy={point.y} r={RADIAL.nodeRadius} fill="white" stroke={point.color} strokeWidth={2} />
            <text
              x={point.x}
              y={point.y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={point.color}
              fontFamily="sans-serif"
              fontSize={9}
              fontWeight={700}
            >
              {point.label[0]?.toUpperCase() ?? "?"}
            </text>
            <text
              x={point.x}
              y={point.y + RADIAL.nodeRadius + 11}
              textAnchor="middle"
              fill="#475569"
              fontFamily="sans-serif"
              fontSize={8}
            >
              {shortLabel(point.label, 15)}
            </text>
          </g>
        ))}
      </svg>
      <p style={{ margin: "4px 0 0", color: R.gray, fontFamily: "sans-serif", fontSize: 10 }}>
        Intérêt : 5 (très élevé) → 1 (très faible)
      </p>
    </ChartFrame>
  );
}

function matrixX(interest: number) {
  return MATRIX.left + ((interest - 1) / 4) * MATRIX.plotWidth;
}

function matrixY(influence: number) {
  return MATRIX.top + MATRIX.plotHeight - ((influence - 1) / 4) * MATRIX.plotHeight;
}

function StakeholderInfluenceMatrix({ points }: { points: StakeholderPoint[] }) {
  const middleX = matrixX(3);
  const middleY = matrixY(3);
  const quadrants = [
    { key: "attention", label: "À gérer avec attention", x: MATRIX.left, y: MATRIX.top, width: middleX - MATRIX.left, height: middleY - MATRIX.top, fill: "#FFF7ED", text: "#B45309" },
    { key: "key", label: "Partenaires clés ★", x: middleX, y: MATRIX.top, width: MATRIX.left + MATRIX.plotWidth - middleX, height: middleY - MATRIX.top, fill: "#F0FDF4", text: "#16A34A" },
    { key: "watch", label: "À surveiller", x: MATRIX.left, y: middleY, width: middleX - MATRIX.left, height: MATRIX.top + MATRIX.plotHeight - middleY, fill: "#F8FAFC", text: "#64748B" },
    { key: "involve", label: "À impliquer", x: middleX, y: middleY, width: MATRIX.left + MATRIX.plotWidth - middleX, height: MATRIX.top + MATRIX.plotHeight - middleY, fill: "#EFF6FF", text: "#2563EB" },
  ];

  return (
    <ChartFrame>
      <ChartCaption title="Matrice Influence × Intérêt">
        Elle situe chaque partie prenante selon son niveau d’influence sur l’organisation et son niveau d’intérêt pour la démarche RSE.
      </ChartCaption>
      <svg
        viewBox={`0 0 ${MATRIX_WIDTH} ${MATRIX_HEIGHT}`}
        width="100%"
        role="img"
        aria-label="Matrice Influence par Intérêt des parties prenantes"
        style={{ display: "block", maxHeight: 420 }}
      >
        {quadrants.map((quadrant) => (
          <g key={quadrant.key}>
            <rect
              x={quadrant.x}
              y={quadrant.y}
              width={quadrant.width}
              height={quadrant.height}
              fill={quadrant.fill}
              stroke="#E2E8F0"
              strokeWidth={0.5}
            />
            <text
              x={quadrant.x + quadrant.width / 2}
              y={quadrant.y + quadrant.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={quadrant.text}
              fontFamily="sans-serif"
              fontSize={12}
              fontWeight={500}
              opacity={0.62}
            >
              {quadrant.label}
            </text>
          </g>
        ))}

        {[1, 2, 3, 4, 5].map((score) => (
          <g key={score}>
            <line x1={matrixX(score)} y1={MATRIX.top} x2={matrixX(score)} y2={MATRIX.top + MATRIX.plotHeight} stroke="#E2E8F0" />
            <line x1={MATRIX.left} y1={matrixY(score)} x2={MATRIX.left + MATRIX.plotWidth} y2={matrixY(score)} stroke="#E2E8F0" />
            <text x={matrixX(score)} y={MATRIX.top + MATRIX.plotHeight + 19} textAnchor="middle" fill="#64748B" fontFamily="sans-serif" fontSize={11}>
              {score}
            </text>
            <text x={MATRIX.left - 16} y={matrixY(score)} textAnchor="middle" dominantBaseline="middle" fill="#64748B" fontFamily="sans-serif" fontSize={11}>
              {score}
            </text>
          </g>
        ))}

        <line x1={MATRIX.left} y1={MATRIX.top + MATRIX.plotHeight} x2={MATRIX.left + MATRIX.plotWidth} y2={MATRIX.top + MATRIX.plotHeight} stroke="#94A3B8" strokeWidth={1.5} />
        <line x1={MATRIX.left} y1={MATRIX.top} x2={MATRIX.left} y2={MATRIX.top + MATRIX.plotHeight} stroke="#94A3B8" strokeWidth={1.5} />
        <text x={MATRIX.left + MATRIX.plotWidth / 2} y={MATRIX_HEIGHT - 8} textAnchor="middle" fill="#475569" fontFamily="sans-serif" fontSize={12} fontWeight={600}>
          Intérêt →
        </text>
        <text
          x={15}
          y={MATRIX.top + MATRIX.plotHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#475569"
          fontFamily="sans-serif"
          fontSize={12}
          fontWeight={600}
          transform={`rotate(-90, 15, ${MATRIX.top + MATRIX.plotHeight / 2})`}
        >
          Influence →
        </text>

        {points.map((point) => {
          const x = matrixX(point.interest);
          const y = matrixY(point.influence);
          return (
            <g key={point.id}>
              <circle cx={x} cy={y} r={14} fill={point.color} opacity={0.92} stroke="white" strokeWidth={1.5} />
              <text x={x} y={y - 19} textAnchor="middle" fill="#334155" fontFamily="sans-serif" fontSize={9} fontWeight={500}>
                {shortLabel(point.label, 18)}
              </text>
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="sans-serif" fontSize={8} fontWeight={700}>
                {point.label[0]?.toUpperCase() ?? "?"}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 4 }}>
        {REPORT_CATEGORIES.filter((category) => points.some((point) => point.category === category.key)).map((category) => (
          <span key={category.key} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: R.gray, fontFamily: "sans-serif", fontSize: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: CATEGORY_COLORS[category.key] }} />
            {category.label}
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

export function StakeholderReportCharts({ stakeholders }: { stakeholders: RawStakeholder[] }) {
  const points = toPoints(stakeholders);
  if (points.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <StakeholderCartography points={points} />
      <StakeholderInfluenceMatrix points={points} />
    </div>
  );
}
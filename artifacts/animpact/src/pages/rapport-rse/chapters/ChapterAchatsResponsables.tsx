/**
 * Chapitre Achats Responsables — réutilise directement le composant TabDashboard
 * du module Achats Responsables.
 */
import {
  ChapterWrapper, SectionTitle, ExplainerText, EditableAiBlock, KpiGrid, R, ReportTable,
} from "./_shared";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

const GEO_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const CATEGORY_COLORS = ["#6366f1", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6", "#ef4444", "#22c55e", "#a855f7", "#0ea5e9", "#84cc16"];
const CRIT_COLORS = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444"];

function computeGeo(suppliers: Array<Record<string, unknown>>) {
  let france = 0, europe = 0, horsEurope = 0;
  const EU_COUNTRIES = new Set(["Belgium","Bulgaria","Czech Republic","Denmark","Germany","Estonia","Ireland","Greece","Spain","France","Croatia","Italy","Cyprus","Latvia","Lithuania","Luxembourg","Hungary","Malta","Netherlands","Austria","Poland","Portugal","Romania","Slovenia","Slovakia","Finland","Sweden","Autriche","Belgique","Bulgarie","Croatie","Chypre","Danemark","Estonie","Finlande","Grèce","Hongrie","Irlande","Italie","Lettonie","Lituanie","Luxembourg","Malte","Pays-Bas","Pologne","Portugal","Roumanie","Slovaquie","Slovénie","Suède"]);
  for (const s of suppliers) {
    const country = (s.country as string ?? s.pays as string ?? "").trim();
    if (!country || country.toLowerCase() === "france") { france++; }
    else if (EU_COUNTRIES.has(country)) { europe++; }
    else { horsEurope++; }
  }
  return [
    { name: "France", value: france },
    { name: "Europe", value: europe },
    { name: "Hors Europe", value: horsEurope },
  ].filter(d => d.value > 0);
}

export function ChapterAchatsResponsables({
  data, ai, chapterNum,
}: {
  data: ReportData;
  ai: AiAnalyses;
  chapterNum: number;
}) {
  const suppliers = data.suppliers as Array<Record<string, unknown>>;
  const purchases = data.responsiblePurchases as Array<Record<string, unknown>>;

  if (suppliers.length === 0 && purchases.length === 0) return null;

  const total     = suppliers.length;
  const evaluated = suppliers.filter(s => s.criticality != null || s.riskLevel != null || s.dependency != null).length;
  const critical  = suppliers.filter(s => (s.criticality as number ?? 0) >= 4).length;
  const highRisk  = suppliers.filter(s => (s.riskLevel as number ?? 0) >= 4).length;
  const certified = suppliers.filter(s => !!s.certifications);
  const certPct   = total > 0 ? Math.round((certified.length / total) * 100) : 0;

  // Répartition géographique
  const geoData = computeGeo(suppliers);

  // Répartition par catégorie
  const catMap: Record<string, number> = {};
  for (const s of suppliers) {
    const cat = (s.category as string) ?? "Non catégorisé";
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const categoryData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Distribution criticité
  const critMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of suppliers) {
    const c = s.criticality as number;
    if (c && critMap[c] !== undefined) critMap[c]++;
  }
  const critData = [1, 2, 3, 4, 5].map(n => ({ name: `Criticité ${n}`, value: critMap[n] ?? 0 }));

  // Indicateurs Achats responsables
  let totalPurchases = 0;
  let responsiblePurchases = 0;
  let localPurchases = 0;
  let circularPurchases = 0;
  const purchasesByCategory: Record<string, { amount: number; responsible: number }> = {};
  for (const purchase of purchases) {
    const amount = Number(purchase.amount ?? 0);
    const responsible = amount * Number(purchase.responsiblePercent ?? 0) / 100;
    totalPurchases += amount;
    responsiblePurchases += responsible;
    localPurchases += amount * Number(purchase.localPercent ?? 0) / 100;
    circularPurchases += amount * Number(purchase.circularPercent ?? 0) / 100;
    const category = String(purchase.category ?? "Non catégorisé");
    const current = purchasesByCategory[category] ?? { amount: 0, responsible: 0 };
    current.amount += amount;
    current.responsible += responsible;
    purchasesByCategory[category] = current;
  }
  const purchaseCategoryData = Object.entries(purchasesByCategory)
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.amount - a.amount);
  const formatEur = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  const formatPct = (value: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " %";

  return (
    <ChapterWrapper num={chapterNum} title="Achats responsables">
      {suppliers.length > 0 && (
        <>
          <ExplainerText>
            La politique d'achats responsables vise à intégrer des critères environnementaux, sociaux et de gouvernance dans la sélection, l'évaluation et le suivi des fournisseurs. Elle contribue à la réduction des impacts indirects de l'organisation tout au long de sa chaîne d'approvisionnement et renforce la résilience de l'entreprise face aux risques fournisseurs.
          </ExplainerText>

          {/* KPIs */}
          <KpiGrid items={[
            { label: "Fournisseurs référencés", value: String(total),     color: "#3b82f6" },
            { label: "Fournisseurs évalués",    value: String(evaluated), unit: `${total > 0 ? Math.round((evaluated/total)*100) : 0}%`, color: R.green },
            { label: "Critiques (niv. ≥ 4)",   value: String(critical),  color: "#f97316" },
            { label: "À risque élevé",          value: String(highRisk),  color: "#ef4444" },
          ]} />

          {/* Certifications RSE */}
          {certified.length > 0 && (
            <>
              <SectionTitle>Certifications RSE fournisseurs</SectionTitle>
              <div style={{
                backgroundColor: R.greenBg, border: `1px solid ${R.greenBorder}`,
                borderRadius: 10, padding: "12px 16px", marginBottom: 12,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: R.green, fontFamily: "sans-serif" }}>
                  {certPct}%
                </span>
                <span style={{ fontSize: 13, color: R.dark, fontFamily: "sans-serif" }}>
                  de vos fournisseurs ({certified.length}/{total}) disposent d'une certification RSE renseignée.
                </span>
              </div>
              <ReportTable
                headers={["Fournisseur", "Catégorie", "Certifications"]}
                rows={certified.slice(0, 15).map(s => [
                  String(s.name ?? "—"),
                  String(s.category ?? "—"),
                  String(s.certifications ?? "—"),
                ])}
                widths={["35%", "25%", "40%"]}
              />
            </>
          )}

          {/* Graphiques répartition */}
          <SectionTitle>Répartition du portefeuille fournisseurs</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Répartition géographique */}
            {geoData.length > 0 && (
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: R.dark, margin: "0 0 8px 8px", fontFamily: "sans-serif" }}>
                  Répartition géographique
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={geoData}
                      cx="50%" cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {geoData.map((_, i) => <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} fournisseur${v !== 1 ? "s" : ""}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Répartition par catégorie */}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: R.dark, margin: "0 0 8px 8px", fontFamily: "sans-serif" }}>
                Répartition par catégorie
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [v, "fournisseurs"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


          {/* Distribution criticité */}
          {evaluated > 0 && critData.some(d => d.value > 0) && (
            <>
              <SectionTitle>Distribution de la criticité</SectionTitle>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={critData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, "fournisseurs"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {critData.map((_, i) => <Cell key={i} fill={CRIT_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Fournisseurs critiques */}
          {critical > 0 && (
            <>
              <SectionTitle>Fournisseurs à surveiller (criticité ≥ 4)</SectionTitle>
              <ReportTable
                headers={["Fournisseur", "Catégorie", "Criticité", "Risque"]}
                rows={suppliers
                  .filter(s => (s.criticality as number ?? 0) >= 4)
                  .slice(0, 10)
                  .map(s => [
                    String(s.name ?? "—"),
                    String(s.category ?? "—"),
                    `${s.criticality ?? "—"}/5`,
                    `${s.riskLevel ?? "—"}/5`,
                  ])}
                widths={["35%", "30%", "17%", "18%"]}
              />
            </>
          )}

          <EditableAiBlock id="suppliers" text={(ai as any).suppliers ?? null} label="Analyse des achats responsables" />
        </>
      )}

      {purchases.length > 0 && (
        <>
          <SectionTitle>Achats responsables</SectionTitle>
          <ExplainerText>
            Les montants responsables sont calculés automatiquement à partir de vos estimations.
          </ExplainerText>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Achats annuels", value: formatEur(totalPurchases), color: "#3b82f6" },
              { label: "Part responsable", value: formatPct(totalPurchases ? responsiblePurchases / totalPurchases * 100 : 0), sub: formatEur(responsiblePurchases), color: "#10b981" },
              { label: "Part locale", value: formatPct(totalPurchases ? localPurchases / totalPurchases * 100 : 0), sub: formatEur(localPurchases), color: "#f59e0b" },
              { label: "Part circulaire", value: formatPct(totalPurchases ? circularPurchases / totalPurchases * 100 : 0), sub: formatEur(circularPurchases), color: "#14b8a6" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", background: "#FFFFFF" }}>
                <div style={{ fontSize: 11, color: R.gray, fontFamily: "sans-serif" }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, fontFamily: "sans-serif", marginTop: 2 }}>{kpi.value}</div>
                {kpi.sub && <div style={{ fontSize: 11, color: R.gray, fontFamily: "sans-serif", marginTop: 2 }}>{kpi.sub}</div>}
              </div>
            ))}
          </div>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: R.dark, margin: "0 0 8px 8px", fontFamily: "sans-serif" }}>
              Répartition par catégorie
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={purchaseCategoryData} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" tickFormatter={(value) => formatEur(Number(value))} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatEur(Number(value))} />
                <Bar dataKey="amount" name="Achats annuels" fill="#A7DCCB" radius={[0, 4, 4, 0]} />
                <Bar dataKey="responsible" name="Achats responsables" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChapterWrapper>
  );
}

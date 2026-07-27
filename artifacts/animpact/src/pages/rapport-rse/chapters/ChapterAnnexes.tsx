import {
  ChapterWrapper, SectionTitle, ExplainerText, ReportTable, NoteBox, R,
} from "./_shared";
import type { ReportData } from "../useReportData";

const GLOSSAIRE = [
  { terme: "RSE", definition: "Responsabilité Sociétale des Entreprises. Démarche volontaire d'intégration des préoccupations sociales, environnementales et économiques dans les activités d'une organisation et dans ses interactions avec ses parties prenantes." },
  { terme: "Bilan carbone", definition: "Inventaire des émissions de gaz à effet de serre (GES) produites par une organisation. Il est exprimé en tonnes équivalent CO₂ (tCO₂e) et couvre les Scopes 1, 2 et 3 selon la méthodologie GHG Protocol ou Bilan Carbone®." },
  { terme: "Scope 1", definition: "Émissions directes de GES issues des sources appartenant à l'organisation ou contrôlées par elle (combustion de carburants, procédés industriels, etc.)." },
  { terme: "Scope 2", definition: "Émissions indirectes associées à la production d'électricité, de chaleur ou de vapeur achetée et consommée par l'organisation." },
  { terme: "Scope 3", definition: "Autres émissions indirectes qui surviennent dans la chaîne de valeur de l'organisation, en amont (achats, fret entrant) et en aval (utilisation des produits, fin de vie)." },
  { terme: "Matrice de matérialité", definition: "Outil de hiérarchisation des enjeux RSE selon leur importance pour les parties prenantes et pour l'organisation. Les enjeux les plus importants dans les deux dimensions constituent les « enjeux matériels »." },
  { terme: "Parties prenantes", definition: "Toute personne, groupe ou organisation susceptible d'affecter ou d'être affectée par les décisions, activités et performances de l'organisation (collaborateurs, clients, fournisseurs, riverains, pouvoirs publics, etc.)." },
  { terme: "Impact Score", definition: "Indicateur composite de performance globale mesurant la limitation des impacts négatifs, le partage de la valeur et la mise en œuvre d'une stratégie à impact positif." },
  { terme: "Captation carbone", definition: "Capacité d'un écosystème (forêt, haie, prairie) à absorber et stocker du CO₂ atmosphérique via la photosynthèse et les processus biologiques associés." },
  { terme: "NR", definition: "Numérique Responsable. Démarche visant à réduire l'empreinte environnementale, sociale et économique des usages numériques au sein de l'organisation." },
  { terme: "CSRD", definition: "Corporate Sustainability Reporting Directive. Directive européenne rendant obligatoire pour les grandes entreprises la publication d'informations de durabilité selon les normes ESRS." },
  { terme: "GRI", definition: "Global Reporting Initiative. Cadre international de référence pour le reporting RSE, définissant des indicateurs standardisés sur les enjeux économiques, environnementaux et sociaux." },
];

export function ChapterAnnexes({ data, chapterNum }: { data: ReportData; chapterNum: number }) {
  const draft = data.draft as Record<string, unknown> | null;
  const scope = draft?.reportScope as string | null;
  const methodology = draft?.reportMethodology as string | null;
  const additionalContent = draft?.annexeContent as string | null;
  const orgs = (data.orgs as Array<Record<string, unknown>>) ?? [];

  return (
    <ChapterWrapper num={chapterNum} title="Annexes &amp; Glossaire">
      <NoteBox>
        Les présentes annexes fournissent les informations complémentaires nécessaires à la compréhension des données présentées dans ce rapport, ainsi que les définitions des principaux termes utilisés.
      </NoteBox>

      {/* Périmètre détaillé */}
      {(scope || orgs.length > 0) && (
        <>
          <SectionTitle>Périmètre détaillé du rapport</SectionTitle>
          {scope && (
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontFamily: "sans-serif" }}>{scope}</p>
          )}
          {orgs.length > 0 && (
            <ReportTable
              headers={["Entité", "Type"]}
              rows={orgs.map((o) => [
                o.name as string ?? "—",
                o.parentId ? "Filiale" : "Entité racine",
              ])}
            />
          )}
        </>
      )}

      {/* Méthodologie */}
      {methodology && (
        <>
          <SectionTitle>Note méthodologique</SectionTitle>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontFamily: "sans-serif" }}>{methodology}</p>
        </>
      )}

      {/* Contenu annexe supplémentaire */}
      {additionalContent && (
        <>
          <SectionTitle>Informations complémentaires</SectionTitle>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontFamily: "sans-serif" }}>{additionalContent}</p>
        </>
      )}

      {/* Glossaire */}
      <SectionTitle>Glossaire RSE</SectionTitle>
      <ExplainerText>
        Les définitions ci-dessous visent à clarifier les termes techniques utilisés dans ce rapport et à faciliter la lecture pour l'ensemble des parties prenantes.
      </ExplainerText>
      <ReportTable
        headers={["Terme", "Définition"]}
        rows={GLOSSAIRE.map((g) => [
          <strong key="t" style={{ color: R.green, fontFamily: "sans-serif" }}>{g.terme}</strong>,
          g.definition,
        ])}
        widths={["20%", "80%"]}
      />

      {/* Pied de page légal */}
      <div style={{
        marginTop: 32, padding: "12px 16px",
        border: "1px solid #E2E8F0", borderRadius: 8,
        backgroundColor: "#F8FAFC",
      }}>
        <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif" }}>
          <strong>Avertissement.</strong> Ce rapport RSE est établi sur la base des informations disponibles au moment de sa rédaction. Il n'a pas vocation à constituer un document de reporting réglementaire au titre de la CSRD, de la DPEF (Déclaration de Performance Extra-Financière) ou de tout autre cadre normatif légalement contraignant. Les données présentées sont fournies à titre informatif et reflètent la démarche RSE volontaire de l'organisation.
        </p>
      </div>
    </ChapterWrapper>
  );
}

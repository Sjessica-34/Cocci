import { loadReportData } from "./generateReport";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  green: "0.122 0.420 0.227",
  dark: "0.110 0.137 0.251",
  muted: "0.357 0.408 0.471",
  light: "0.941 0.965 0.949",
};

function isWinAnsiCharacter(character: string): boolean {
  const code = character.charCodeAt(0);
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
}

function pdfSafe(value: string): string {
  const replacements: Record<string, string> = {
    "’": "'", "‘": "'", "“": "\"", "”": "\"", "–": "-", "—": "-",
    "•": "-", "…": "...", "œ": "oe", "Œ": "OE", "€": "EUR", "\u00a0": " ",
  };
  const encoded = Array.from(value)
    .map((character) => {
      const replacement = replacements[character];
      if (replacement) return replacement;
      if (isWinAnsiCharacter(character)) return character;
      const transliterated = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const latin1 = Array.from(transliterated)
        .map((candidate) => isWinAnsiCharacter(candidate) ? candidate : "?")
        .join("");
      return latin1 || "?";
    })
    .join("");
  return encoded.replace(/[\\()]/g, "\\$&");
}

function formatValue(value: unknown, fallback = "Non évalué"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
  return String(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function wrap(text: string, maxCharacters: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class PdfWriter {
  private pages: string[] = [];
  private commands: string[] = [];
  private y = PAGE_HEIGHT - MARGIN;

  constructor() {
    this.addPage();
  }

  addPage(): void {
    if (this.commands.length) this.pages.push(this.commands.join("\n"));
    this.commands = [];
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensure(height: number): void {
    if (this.y - height < MARGIN) this.addPage();
  }

  private draw(x: number, y: number, text: string, size: number, font: "F1" | "F2", color: string): void {
    this.commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfSafe(text)}) Tj ET`);
  }

  cover(title: string, organization: string, period: string, version: string): void {
    this.y = 650;
    this.center(title, 34, "F2", COLORS.green);
    this.y -= 44;
    this.center("Responsabilité Sociétale des Entreprises", 15, "F1", COLORS.green);
    this.y -= 70;
    this.center(organization, 28, "F2", COLORS.dark);
    this.y -= 32;
    this.center(period, 15, "F1", COLORS.muted);
    this.y -= 28;
    this.center(`Version ${version}`, 11, "F1", COLORS.muted);
    this.y -= 120;
    this.center("Construire une performance durable au service des personnes,", 12, "F1", COLORS.green);
    this.y -= 18;
    this.center("de la planète et d'une gouvernance responsable.", 12, "F1", COLORS.green);
  }

  private center(text: string, size: number, font: "F1" | "F2", color: string): void {
    const x = Math.max(MARGIN, (PAGE_WIDTH - Math.min(CONTENT_WIDTH, text.length * size * 0.5)) / 2);
    this.draw(x, this.y, text, size, font, color);
  }

  heading(title: string): void {
    this.ensure(46);
    this.draw(MARGIN, this.y, title, 18, "F2", COLORS.dark);
    this.y -= 11;
    this.commands.push(`${COLORS.green} RG ${MARGIN} ${this.y.toFixed(1)} ${CONTENT_WIDTH} 1.2 re f`);
    this.y -= 23;
  }

  subheading(title: string): void {
    this.ensure(32);
    this.draw(MARGIN, this.y, title, 13, "F2", COLORS.green);
    this.y -= 21;
  }

  paragraph(text: string): void {
    const lines = wrap(text, 94);
    for (const line of lines) {
      this.ensure(16);
      this.draw(MARGIN, this.y, line, 10.5, "F1", COLORS.dark);
      this.y -= 15;
    }
    if (lines.length) this.y -= 6;
  }

  keyValue(label: string, value: string): void {
    const lines = wrap(`${label} : ${value}`, 92);
    for (const [index, line] of lines.entries()) {
      this.ensure(16);
      this.draw(MARGIN, this.y, line, 10.5, index === 0 ? "F2" : "F1", index === 0 ? COLORS.dark : COLORS.muted);
      this.y -= 15;
    }
  }

  bullet(text: string): void {
    const lines = wrap(text, 88);
    for (const [index, line] of lines.entries()) {
      this.ensure(16);
      if (index === 0) this.draw(MARGIN, this.y, "•", 11, "F2", COLORS.green);
      this.draw(MARGIN + 14, this.y, line, 10.5, "F1", COLORS.dark);
      this.y -= 15;
    }
  }

  build(): Buffer {
    if (this.commands.length) this.pages.push(this.commands.join("\n"));

    const firstPageObject = 5;
    const pageObjects = this.pages.map((_, index) => firstPageObject + index * 2);
    const contentObjects = pageObjects.map((id) => id + 1);
    const objects: Buffer[] = [];
    const addObject = (body: Buffer | string): void => {
      objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, "latin1"));
    };

    addObject("<< /Type /Catalog /Pages 2 0 R >>");
    addObject(`<< /Type /Pages /Kids [${pageObjects.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjects.length} >>`);
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    this.pages.forEach((page, index) => {
      addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjects[index]} 0 R >>`);
      const stream = Buffer.from(page, "latin1");
      addObject(Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
        stream,
        Buffer.from("\nendstream", "ascii"),
      ]));
    });

    const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
    const chunks: Buffer[] = [header];
    const offsets = [0];
    let offset = header.length;
    objects.forEach((body, index) => {
      offsets[index + 1] = offset;
      const object = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, "ascii"), body, Buffer.from("\nendobj\n", "ascii")]);
      chunks.push(object);
      offset += object.length;
    });

    const xrefOffset = offset;
    chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, "ascii"));
    for (let index = 1; index <= objects.length; index += 1) {
      chunks.push(Buffer.from(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`, "ascii"));
    }
    chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "ascii"));
    return Buffer.concat(chunks);
  }
}

export async function generatePdfReport(orgId: number, exerciseId: number): Promise<Buffer> {
  const data = await loadReportData(orgId, exerciseId);
  const writer = new PdfWriter();
  const org = objectValue(data.org);
  const exercise = objectValue(data.exercise);
  const draft = objectValue(data.draft);
  const workforce = objectValue(data.wf);
  const diversity = objectValue(data.div);
  const training = objectValue(data.tr);
  const impact = objectValue(data.impactScore);
  const captation = objectValue(data.captation);
  const nrMeta = objectValue(data.nrMeta);
  const year = formatValue(exercise.year, String(new Date().getFullYear()));

  writer.cover(
    "RAPPORT RSE",
    formatValue(org.name, "Mon entreprise"),
    formatValue(draft.period, `Exercice ${year}`),
    formatValue(draft.version, "1.0"),
  );

  writer.addPage();
  writer.heading("Sommaire");
  [
    "Éditorial",
    "Qui sommes-nous ?",
    "Notre démarche RSE",
    "Agir pour la planète",
    "Placer l'humain au cœur de notre développement",
    "Piloter une entreprise responsable",
    "Notre feuille de route",
    "Nos labels et engagements",
    "Temps forts et perspectives",
    "Périmètre et méthodologie",
  ].forEach((item) => writer.bullet(item));

  writer.heading("1. Éditorial");
  writer.paragraph(formatValue(draft.editorialContent, "Aucun éditorial n'a été renseigné pour cet exercice."));

  writer.heading("2. Qui sommes-nous ?");
  writer.paragraph(formatValue(draft.companyDescription, "La présentation de l'entreprise n'a pas encore été renseignée."));
  writer.keyValue("Mission", formatValue(draft.companyMission));
  writer.keyValue("Vision", formatValue(draft.companyVision));
  writer.keyValue("Valeurs", formatValue(draft.companyValues));
  writer.keyValue("Chiffres clés", formatValue(draft.companyKeyFigures));
  const timeline = Array.isArray(draft.timeline) ? draft.timeline : [];
  if (timeline.length) {
    writer.subheading("Repères historiques");
    timeline.forEach((item) => {
      const event = objectValue(item);
      writer.bullet(`${formatValue(event.date, "")} — ${formatValue(event.title, "Événement")} : ${formatValue(event.description, "")}`);
    });
  }

  writer.heading("3. Notre démarche RSE");
  writer.keyValue("Score environnemental", data.envScore == null ? "Non évalué" : `${data.envScore}%`);
  writer.keyValue("Score social", data.socScore == null ? "Non évalué" : `${data.socScore}%`);
  writer.keyValue("Score gouvernance", data.govScore == null ? "Non évalué" : `${data.govScore}%`);
  writer.keyValue("Parties prenantes cartographiées", String(data.stakeholderItems.length));
  writer.keyValue("Dépendances à la biodiversité recensées", String(data.bioItems.length));
  writer.keyValue("Fournisseurs référencés", String(data.supplierItems.length));

  writer.heading("4. Agir pour la planète");
  writer.keyValue("Émissions carbone mesurées", data.carbonTotal > 0 ? `${formatValue(Math.round(data.carbonTotal))} tCO₂e` : "Non évalué");
  writer.keyValue("Bilans carbone renseignés", String(data.carbonRows.length));
  writer.keyValue("Dépendances biodiversité", String(data.bioItems.length));
  writer.keyValue("Score numérique responsable", data.nrScore > 0 ? `${data.nrScore}%` : "Non évalué");
  if (nrMeta.certificationLabel) writer.keyValue("Certification numérique responsable", formatValue(nrMeta.certificationLabel));

  writer.heading("5. Placer l'humain au cœur de notre développement");
  writer.keyValue("Effectif total", formatValue(workforce.totalHeadcount));
  writer.keyValue("Collaborateurs en CDI", formatValue(workforce.nbCdi));
  writer.keyValue("Collaborateurs en CDD", formatValue(workforce.nbCdd));
  writer.keyValue("Recrutements", formatValue(workforce.nbRecrutements));
  writer.keyValue("Départs", formatValue(workforce.nbDeparts));
  writer.keyValue("Femmes", formatValue(diversity.nbFemmes));
  writer.keyValue("Hommes", formatValue(diversity.nbHommes));
  writer.keyValue("Personnes en situation de handicap", formatValue(diversity.nbHandicap));
  writer.keyValue("Collaborateurs formés", formatValue(training.nbCollaborateursFormes));
  writer.keyValue("Heures de formation", formatValue(training.nbHeuresFormation));

  writer.heading("6. Piloter une entreprise responsable");
  writer.keyValue("Impact Score", impact.score == null ? "Non évalué" : `${formatValue(impact.score)}/100`);
  writer.keyValue("Labels et certifications obtenus", String(data.obtainedLabels.length));
  writer.keyValue("Actions RSE suivies", String(data.actionItems.length));
  writer.keyValue("Actions réalisées", `${data.doneActions} (${data.actionRate}%)`);

  writer.heading("7. Notre feuille de route");
  if (data.actionItems.length) {
    data.actionItems.forEach((action) => {
      writer.bullet(`${formatValue(action.customName ?? action.libraryName, "Action RSE")} — ${action.isChecked ? "réalisée" : "en cours"}`);
    });
  } else {
    writer.paragraph("Aucune action RSE n'a encore été enregistrée pour cet exercice.");
  }

  writer.heading("8. Nos labels et engagements");
  if (data.obtainedLabels.length) {
    data.obtainedLabels.forEach((label) => writer.bullet(formatValue(label.name, "Label ou certification")));
  } else {
    writer.paragraph("Aucun label ou engagement n'a été renseigné pour cet exercice.");
  }
  if (captation.captationKgPerYear || captation.treeCount) {
    writer.keyValue("Captation carbone estimée", `${formatValue(captation.captationKgPerYear)} kg CO₂/an`);
    writer.keyValue("Arbres recensés", formatValue(captation.treeCount));
  }

  const highlights = Array.isArray(draft.highlights) ? draft.highlights : [];
  writer.heading("9. Temps forts et perspectives");
  if (highlights.length) {
    writer.subheading("Temps forts");
    highlights.forEach((item) => {
      const highlight = objectValue(item);
      writer.bullet(`${formatValue(highlight.date, "")} — ${formatValue(highlight.title, "Temps fort")} : ${formatValue(highlight.description, "")}`);
    });
  }
  writer.subheading("Perspectives");
  writer.paragraph(formatValue(draft.perspectivesContent, "Les priorités des prochains exercices n'ont pas encore été renseignées."));

  writer.heading("10. Périmètre et méthodologie");
  writer.paragraph(formatValue(
    draft.reportScope,
    "Ce rapport couvre les données renseignées dans la plateforme Cocci pour l'organisation et l'exercice concernés.",
  ));
  writer.paragraph(formatValue(
    draft.reportMethodology,
    "Les données ont été collectées et consolidées via la plateforme Cocci. Ce rapport est produit à des fins internes de pilotage RSE et ne constitue pas un reporting réglementaire.",
  ));

  return writer.build();
}
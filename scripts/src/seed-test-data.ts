/**
 * Seed de données de test — Organisation fictive "Eco Solutions SAS"
 *
 * Crée :
 *  - 1 organisation PME (47 collaborateurs, secteur Services numériques)
 *  - 2 exercices : 2024 (clôturé, N-1) et 2025 (actif)
 *  - Bilan carbone (2 exercices)
 *  - Données RH : effectifs, diversité, formation (2 exercices)
 *  - Réponses diagnostic ISO 26000 (~120 questions)
 *  - Numérique Responsable (meta + réponses)
 *  - Impact Score
 *  - Captation carbone
 *  - Labels & certifications
 *  - Fournisseurs
 *  - Parties prenantes
 *  - Baromètre social : campagne + 18 réponses simulées
 *  - Plan d'actions (15 actions du référentiel)
 *  - Brouillon de rapport RSE (éditorial, perspectives, temps forts…)
 *
 * Idempotent : relancer le script ne crée pas de doublon.
 *
 * Usage : pnpm --filter @workspace/scripts run seed:test
 */

import { db } from "@workspace/db";
import {
  organizationsTable,
  exercisesTable,
  carbonBilansTable,
  employmentWorkforceTable,
  employmentDiversityTable,
  employmentTrainingTable,
  diagnosticResponsesTable,
  nrMetaTable,
  nrResponsesTable,
  impactScoreResultsTable,
  captationCarboneTable,
  labelsTable,
  suppliersTable,
  stakeholdersTable,
  barometreCampaignsTable,
  barometreResponsesTable,
  barometreAnswersTable,
  organizationActionPlansTable,
  rseReportDraftsTable,
  membersTable,
  usersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function rndF(min: number, max: number, dec = 1) {
  return parseFloat((min + Math.random() * (max - min)).toFixed(dec));
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ORG_NAME = "Eco Solutions SAS";

// IDs des actions du référentiel à inclure dans le plan
const LIBRARY_ACTION_IDS_DONE   = [1, 4, 6, 8, 20, 26, 27, 28, 46, 47, 100, 150, 160, 170];
const LIBRARY_ACTION_IDS_TODO   = [3, 11, 12, 22, 31, 40, 60, 80, 110, 120, 130, 140, 155, 165, 180, 190];

// Question IDs diagnostics (ENV / SOC / GOV) avec leur niveau (0-3)
const DIAGNOSTIC_RESPONSES: Array<[string, number]> = [
  // Environnement – Climat
  ["ENV-CLI-001", 2], ["ENV-CLI-002", 2], ["ENV-CLI-003", 2], ["ENV-CLI-004", 1],
  ["ENV-CLI-005", 2], ["ENV-CLI-006", 1], ["ENV-CLI-007", 1], ["ENV-CLI-008", 2],
  ["ENV-CLI-009", 1], ["ENV-CLI-010", 1], ["ENV-CLI-011", 1], ["ENV-CLI-012", 2],
  ["ENV-CLI-013", 1], ["ENV-CLI-014", 2], ["ENV-CLI-015", 1],
  // Énergie
  ["ENV-ENE-001", 2], ["ENV-ENE-002", 2], ["ENV-ENE-003", 1], ["ENV-ENE-004", 2],
  ["ENV-ENE-005", 1], ["ENV-ENE-006", 2], ["ENV-ENE-007", 1], ["ENV-ENE-008", 1],
  ["ENV-ENE-009", 1], ["ENV-ENE-010", 2], ["ENV-ENE-011", 1], ["ENV-ENE-012", 1],
  ["ENV-ENE-013", 2], ["ENV-ENE-014", 1], ["ENV-ENE-015", 1],
  // Eau
  ["ENV-EAU-001", 2], ["ENV-EAU-002", 2], ["ENV-EAU-003", 0], ["ENV-EAU-004", 1],
  ["ENV-EAU-005", 1], ["ENV-EAU-006", 0], ["ENV-EAU-007", 1], ["ENV-EAU-008", 2],
  ["ENV-EAU-009", 1], ["ENV-EAU-010", 1], ["ENV-EAU-011", 0], ["ENV-EAU-012", 1],
  // Déchets
  ["ENV-DEC-001", 2], ["ENV-DEC-002", 2], ["ENV-DEC-003", 1], ["ENV-DEC-004", 2],
  ["ENV-DEC-005", 1], ["ENV-DEC-006", 2], ["ENV-DEC-007", 1], ["ENV-DEC-008", 1],
  ["ENV-DEC-009", 1], ["ENV-DEC-010", 2], ["ENV-DEC-011", 0], ["ENV-DEC-012", 1],
  ["ENV-DEC-013", 2], ["ENV-DEC-014", 1], ["ENV-DEC-015", 1],
  // Biodiversité
  ["ENV-BIO-001", 1], ["ENV-BIO-002", 0], ["ENV-BIO-003", 0], ["ENV-BIO-004", 1],
  ["ENV-BIO-005", 1], ["ENV-BIO-006", 0], ["ENV-BIO-007", 1], ["ENV-BIO-008", 1],
  // Mobilité
  ["ENV-MOB-001", 2], ["ENV-MOB-002", 2], ["ENV-MOB-003", 1], ["ENV-MOB-004", 1],
  ["ENV-MOB-005", 2], ["ENV-MOB-006", 1], ["ENV-MOB-007", 2], ["ENV-MOB-008", 1],
  // Achats environnementaux
  ["ENV-ACH-001", 2], ["ENV-ACH-002", 1], ["ENV-ACH-003", 1], ["ENV-ACH-004", 2],
  ["ENV-ACH-005", 1], ["ENV-ACH-006", 1], ["ENV-ACH-007", 2], ["ENV-ACH-008", 1],
  // Social – Conditions humaines
  ["SOC-CH-001", 3], ["SOC-CH-002", 2], ["SOC-CH-003", 3], ["SOC-CH-004", 2],
  ["SOC-CH-005", 2], ["SOC-CH-006", 3], ["SOC-CH-007", 2], ["SOC-CH-008", 2],
  ["SOC-CH-009", 2], ["SOC-CH-010", 3], ["SOC-CH-011", 2], ["SOC-CH-012", 2],
  // Recrutement
  ["SOC-REC-001", 3], ["SOC-REC-002", 2], ["SOC-REC-003", 3], ["SOC-REC-004", 2],
  ["SOC-REC-005", 2], ["SOC-REC-006", 2], ["SOC-REC-007", 3], ["SOC-REC-008", 2],
  // Formation
  ["SOC-FOR-001", 3], ["SOC-FOR-002", 2], ["SOC-FOR-003", 3], ["SOC-FOR-004", 2],
  ["SOC-FOR-005", 2], ["SOC-FOR-006", 2], ["SOC-FOR-007", 3], ["SOC-FOR-008", 2],
  // QVCT
  ["SOC-QVCT-001", 3], ["SOC-QVCT-002", 3], ["SOC-QVCT-003", 2], ["SOC-QVCT-004", 2],
  ["SOC-QVCT-005", 3], ["SOC-QVCT-006", 2], ["SOC-QVCT-007", 2], ["SOC-QVCT-008", 3],
  // Diversité
  ["SOC-DIV-001", 2], ["SOC-DIV-002", 2], ["SOC-DIV-003", 1], ["SOC-DIV-004", 2],
  ["SOC-DIV-005", 2], ["SOC-DIV-006", 1], ["SOC-DIV-007", 2], ["SOC-DIV-008", 2],
  // Gouvernance – Vision
  ["GOV-VIS-001", 2], ["GOV-VIS-002", 2], ["GOV-VIS-003", 1], ["GOV-VIS-004", 2],
  ["GOV-VIS-005", 2], ["GOV-VIS-006", 1], ["GOV-VIS-007", 2], ["GOV-VIS-008", 1],
  // Pilotage
  ["GOV-PIL-001", 2], ["GOV-PIL-002", 2], ["GOV-PIL-003", 1], ["GOV-PIL-004", 2],
  ["GOV-PIL-005", 2], ["GOV-PIL-006", 1], ["GOV-PIL-007", 2], ["GOV-PIL-008", 2],
  // Éthique
  ["GOV-ETH-001", 3], ["GOV-ETH-002", 3], ["GOV-ETH-003", 2], ["GOV-ETH-004", 3],
  ["GOV-ETH-005", 2], ["GOV-ETH-006", 2], ["GOV-ETH-007", 3], ["GOV-ETH-008", 2],
  // Risques
  ["GOV-RIS-001", 2], ["GOV-RIS-002", 1], ["GOV-RIS-003", 2], ["GOV-RIS-004", 2],
  ["GOV-RIS-005", 1], ["GOV-RIS-006", 2], ["GOV-RIS-007", 1], ["GOV-RIS-008", 2],
  // Parties prenantes
  ["GOV-PP-001", 2], ["GOV-PP-002", 2], ["GOV-PP-003", 1], ["GOV-PP-004", 2],
  ["GOV-PP-005", 2], ["GOV-PP-006", 1], ["GOV-PP-007", 2],
];

// Critères NR cochés
const NR_CHECKED = [
  "p1-s1-0","p1-s1-1","p1-s1-2","p1-s1-3","p1-s2-0","p1-s2-1","p1-s2-2",
  "p2-s1-1","p2-s1-2","p2-s1-3","p2-s1-4","p2-s1-5","p2-s1-6","p2-s1-7",
  "p2-s1-14","p2-s1-15","p2-s1-18","p2-s1-19",
  "p2-s2-1","p2-s2-2","p2-s2-3","p2-s2-10","p2-s2-11","p2-s2-12",
  "p3-s1-1","p3-s1-2","p3-s1-3","p3-s1-4","p3-s2-1","p3-s2-2",
  "p4-s1-1","p4-s1-2",
];

// ─── Scores baromètre simulés par thème ─────────────────────────────────────
// q1-q36 : valeurs 1-5 pour 18 répondants fictifs
// Les questions couvrent : Management, Organisation, Relations, Communication,
// Sens/valeurs, Environnement de travail, Formation, Égalité, Équilibre vie pro/perso, etc.
const Q_MEAN: Record<string, number> = {
  q1: 3.8, q2: 4.1, q3: 3.5, q4: 3.9, q5: 4.2, q6: 3.7,
  q7: 3.4, q8: 3.6, q9: 4.0, q10: 3.8, q11: 3.9, q12: 4.1,
  q13: 3.2, q14: 3.4, q15: 3.7, q16: 3.9, q17: 4.0, q18: 3.6,
  q19: 3.5, q20: 3.8, q21: 3.7, q22: 4.0, q23: 3.4, q24: 3.6,
  q25: 4.1, q26: 3.8, q27: 3.9, q28: 4.0, q29: 3.7, q30: 3.5,
  q31: 3.3, q32: 3.6, q33: 3.8, q34: 3.9, q35: 4.0, q36: 3.7,
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Démarrage du seed de données de test…\n");

  // ── 1. Vérifier si l'org existe déjà ──────────────────────────────────────
  const existingOrg = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.name, ORG_NAME))
    .limit(1);

  if (existingOrg.length > 0) {
    console.log(`⚠️  L'organisation "${ORG_NAME}" existe déjà (id=${existingOrg[0].id}).`);
    console.log("   Supprimez-la manuellement pour relancer le seed.\n");
    process.exit(0);
  }

  // ── 2. Créer l'organisation ───────────────────────────────────────────────
  console.log("📋 Création de l'organisation…");
  const [org] = await db.insert(organizationsTable).values({
    name: ORG_NAME,
    legalName: "Eco Solutions SAS",
    siren: "842195067",
    siret: "84219506700019",
    address: "12 rue de la Transition, 44000 Nantes",
    sector: "Services numériques",
    size: "PME",
    contactName: "Sophie Laroche",
    contactEmail: "sophie.laroche@eco-solutions.fr",
    contactPhone: "02 40 55 12 34",
    employeeCount: 47,
    type: "entreprise",
  }).returning({ id: organizationsTable.id });

  const orgId = org.id;
  console.log(`   ✓ Organisation créée (id=${orgId})\n`);

  // ── 3. Exercices ──────────────────────────────────────────────────────────
  console.log("📅 Création des exercices…");

  const [ex24] = await db.insert(exercisesTable).values({
    organizationId: orgId,
    year: 2024,
    status: "closed",
  }).returning({ id: exercisesTable.id });

  const [ex25] = await db.insert(exercisesTable).values({
    organizationId: orgId,
    year: 2025,
    status: "active",
  }).returning({ id: exercisesTable.id });

  const exId24 = ex24.id;
  const exId25 = ex25.id;
  console.log(`   ✓ Exercice 2024 (id=${exId24}, clôturé)`);
  console.log(`   ✓ Exercice 2025 (id=${exId25}, actif)\n`);

  // ── 4. Bilan carbone ──────────────────────────────────────────────────────
  console.log("🌍 Bilan carbone…");

  await db.insert(carbonBilansTable).values({
    organizationId: orgId, exerciseId: exId24, year: 2024, mode: "saisie", status: "validated",
    methodology: "GHG Protocol",
    scope: "1-2-3",
    energie1: "12.4", energie2: "6.8", horsEnergie1: "2.3", horsEnergie2: "1.9",
    deplacements: "26.1", immobilisations: "6.2", fret: "4.1",
    intrantsBiens: "3.5", intrantsServices: "5.2",
    dechetsDirects: "1.4",
    // Total N-1 : ~70 tCO2e
  });

  await db.insert(carbonBilansTable).values({
    organizationId: orgId, exerciseId: exId25, year: 2025, mode: "saisie", status: "validated",
    methodology: "GHG Protocol",
    scope: "1-2-3",
    energie1: "10.8", energie2: "5.9", horsEnergie1: "2.0", horsEnergie2: "1.7",
    deplacements: "21.4", immobilisations: "5.5", fret: "3.6",
    intrantsBiens: "3.1", intrantsServices: "4.7",
    dechetsDirects: "1.2",
    // Total N : ~60 tCO2e (-14 % vs N-1)
  });

  console.log("   ✓ Bilans carbone 2024 et 2025\n");

  // ── 5. Effectifs ──────────────────────────────────────────────────────────
  console.log("👥 Données RH…");

  await db.insert(employmentWorkforceTable).values({
    organizationId: orgId, exerciseId: exId24,
    totalHeadcount: 42, nbCdi: 38, nbCdd: 3, nbAlternants: 2, nbStagiaires: 1,
    nbTempsPlein: 39, nbTempsPartiel: 3,
    nbRecrutements: 8, nbDeparts: 5,
    avgAge: 34.2,
    age25to34: 18, age35to44: 14, ageUnder25: 5, age45to54: 4, age55plus: 1,
    avgSeniority: 3.8,
    seniorityUnder2: 12, seniority2to5: 16, seniority5to10: 10, seniorityOver10: 4,
  });

  await db.insert(employmentWorkforceTable).values({
    organizationId: orgId, exerciseId: exId25,
    totalHeadcount: 47, nbCdi: 42, nbCdd: 3, nbAlternants: 3, nbStagiaires: 2,
    nbTempsPlein: 43, nbTempsPartiel: 4,
    nbRecrutements: 11, nbDeparts: 6,
    avgAge: 34.6,
    age25to34: 20, age35to44: 16, ageUnder25: 6, age45to54: 4, age55plus: 1,
    avgSeniority: 3.5,
    seniorityUnder2: 14, seniority2to5: 18, seniority5to10: 11, seniorityOver10: 4,
  });

  // Diversité
  await db.insert(employmentDiversityTable).values({
    organizationId: orgId, exerciseId: exId24,
    nbFemmes: 18, nbHommes: 24,
    nbHandicap: 2,
    politiqueDiversite: true, referentHandicap: false,
    sensibilisationDiversite: true, politiqueContreDiscriminations: true,
    politiqueEgaliteProfessionnelle: true, teletravailAutorise: true,
    charteDiversite: false,
  });

  await db.insert(employmentDiversityTable).values({
    organizationId: orgId, exerciseId: exId25,
    nbFemmes: 21, nbHommes: 26,
    nbHandicap: 3,
    politiqueDiversite: true, referentHandicap: true,
    sensibilisationDiversite: true, politiqueContreDiscriminations: true,
    politiqueEgaliteProfessionnelle: true, teletravailAutorise: true,
    charteDiversite: true,
  });

  // Formation
  await db.insert(employmentTrainingTable).values({
    organizationId: orgId, exerciseId: exId24,
    nbHeuresFormation: 312, budgetFormation: 14500,
    nbCollaborateursFormes: 32, nbEntretiensAnnuels: 38,
    nbEntretiensProfessionnels: 42, nbCertifications: 5,
    nbEvolutionsInternes: 4,
  });

  await db.insert(employmentTrainingTable).values({
    organizationId: orgId, exerciseId: exId25,
    nbHeuresFormation: 428, budgetFormation: 19200,
    nbCollaborateursFormes: 41, nbEntretiensAnnuels: 45,
    nbEntretiensProfessionnels: 47, nbCertifications: 8,
    nbEvolutionsInternes: 6,
  });

  console.log("   ✓ Effectifs, diversité, formation 2024 et 2025\n");

  // ── 6. Réponses diagnostics ───────────────────────────────────────────────
  console.log("📊 Réponses diagnostic ISO 26000…");

  await db.insert(diagnosticResponsesTable).values(
    DIAGNOSTIC_RESPONSES.map(([questionId, level]) => ({
      organizationId: orgId,
      exerciseId: exId25,
      questionId,
      level,
    }))
  ).onConflictDoNothing();

  console.log(`   ✓ ${DIAGNOSTIC_RESPONSES.length} réponses insérées\n`);

  // ── 7. Numérique Responsable ──────────────────────────────────────────────
  console.log("💻 Numérique Responsable…");

  await db.insert(nrMetaTable).values({
    organizationId: orgId,
    exerciseId: exId25,
    certificationLabel: "label-inr",
  }).onConflictDoNothing();

  await db.insert(nrResponsesTable).values(
    NR_CHECKED.map((criterionId) => ({
      organizationId: orgId,
      exerciseId: exId25,
      criterionId,
      checked: true,
    }))
  ).onConflictDoNothing();

  console.log(`   ✓ ${NR_CHECKED.length} critères NR cochés\n`);

  // ── 8. Impact Score ───────────────────────────────────────────────────────
  console.log("🏆 Impact Score…");

  await db.insert(impactScoreResultsTable).values({
    organizationId: orgId,
    exerciseId: exId25,
    score: 67,
    dateRealisation: "2025-06-15",
    commentaire: "Score obtenu lors de l'autoévaluation annuelle. Progression de 8 points vs N-1.",
    limitationImpactsNegatifs: 64,
    partageValeurPouvoir: 58,
    strategieImpactPositif: 71,
  }).onConflictDoNothing();

  console.log("   ✓ Impact Score : 67/100\n");

  // ── 9. Captation carbone ──────────────────────────────────────────────────
  console.log("🌿 Captation carbone…");

  await db.insert(captationCarboneTable).values({
    organizationId: orgId,
    exerciseId: exId25,
    year: 2025,
    mode: "arbres",
    treeCount: 480,
    captationValue: "480",
    captationUnit: "arbres",
    captationKgPerYear: "168000", // 480 arbres × 350 kg CO2/an
  });

  console.log("   ✓ 480 arbres, 168 tCO2 capturées/an\n");

  // ── 10. Labels ─────────────────────────────────────────────────────────────
  console.log("🏅 Labels & certifications…");

  await db.insert(labelsTable).values([
    {
      organizationId: orgId, exerciseId: exId25,
      name: "Lucie 26000", logoUrl: null,
      holder: "Association Lucie", year: 2024, score: "Niveau 2",
    },
    {
      organizationId: orgId, exerciseId: exId25,
      name: "EcoVadis", logoUrl: null,
      holder: "EcoVadis SAS", year: 2025, score: "Bronze – 48/100",
    },
    {
      organizationId: orgId, exerciseId: exId25,
      name: "Numérique Responsable INR", logoUrl: null,
      holder: "Institut du Numérique Responsable", year: 2025, score: "Niveau 1",
    },
  ]);

  console.log("   ✓ 3 labels (Lucie 26000, EcoVadis Bronze, INR)\n");

  // ── 11. Fournisseurs ───────────────────────────────────────────────────────
  console.log("🤝 Fournisseurs…");

  await db.insert(suppliersTable).values([
    {
      organizationId: orgId, exerciseId: exId25,
      name: "TechPrint Nantes", category: "Matériel bureautique",
      contactName: "Marc Dupuis", email: "m.dupuis@techprint44.fr",
      city: "Nantes", country: "France",
      annualAmount: "28000",
      criticality: 3, riskLevel: 2, dependency: 3,
      rsePolicy: "Politique RSE formalisée, certifié ISO 14001.",
      certifications: "ISO 14001",
    },
    {
      organizationId: orgId, exerciseId: exId25,
      name: "CleanCloud Infra", category: "Hébergement & Cloud",
      contactName: "Julie Martin", email: "julie@cleancloud.io",
      city: "Paris", country: "France",
      annualAmount: "54000",
      criticality: 5, riskLevel: 2, dependency: 5,
      rsePolicy: "Hébergement 100 % énergies renouvelables.",
      certifications: "ISO 27001, Hébergeur de données de santé",
    },
    {
      organizationId: orgId, exerciseId: exId25,
      name: "BioRestaurant Connect", category: "Restauration d'entreprise",
      contactName: "Camille Roux", email: "contact@biorestaurant.fr",
      city: "Nantes", country: "France",
      annualAmount: "12000",
      criticality: 2, riskLevel: 1, dependency: 2,
      rsePolicy: "Circuit court, 80 % de produits bio locaux.",
      certifications: "Label Cuisine durable",
    },
    {
      organizationId: orgId, exerciseId: exId25,
      name: "VertiMobi Solutions", category: "Mobilité durable",
      contactName: "Alexis Garnier", email: "alexis@vertimobi.fr",
      city: "Nantes", country: "France",
      annualAmount: "7500",
      criticality: 2, riskLevel: 1, dependency: 2,
      rsePolicy: "Location vélos électriques et covoiturage.",
    },
  ]);

  console.log("   ✓ 4 fournisseurs\n");

  // ── 12. Parties prenantes ─────────────────────────────────────────────────
  console.log("🗺  Parties prenantes…");

  await db.insert(stakeholdersTable).values([
    { organizationId: orgId, exerciseId: exId25, name: "Collaborateurs", category: "Interne", influence: 5, interest: 5, description: "Ensemble des salariés de l'entreprise.", notes: "Priorité max — engager et informer régulièrement." },
    { organizationId: orgId, exerciseId: exId25, name: "Clients grands comptes", category: "Externe", influence: 5, interest: 4, description: "Clients avec exigences RSE contractuelles.", notes: "Attentes fortes sur les données carbone et ESG." },
    { organizationId: orgId, exerciseId: exId25, name: "Actionnaires & investisseurs", category: "Financier", influence: 5, interest: 3, description: "Fonds d'investissement minoritaire.", notes: "Intérêt croissant pour les critères ESG." },
    { organizationId: orgId, exerciseId: exId25, name: "Fournisseurs stratégiques", category: "Externe", influence: 3, interest: 3, description: "Partenaires technologiques clés.", notes: "Sensibiliser à notre charte achats responsables." },
    { organizationId: orgId, exerciseId: exId25, name: "Collectivités locales", category: "Institutionnel", influence: 3, interest: 2, description: "Mairie de Nantes, Métropole.", notes: "Partenariats potentiels sur les mobilités douces." },
    { organizationId: orgId, exerciseId: exId25, name: "Associations environnementales", category: "Société civile", influence: 2, interest: 4, description: "Associations locales de protection de l'environnement.", notes: "Collaboration sur les projets de compensation carbone." },
  ]);

  console.log("   ✓ 6 parties prenantes\n");

  // ── 13. Baromètre social ──────────────────────────────────────────────────
  console.log("💬 Baromètre social…");

  const publicToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  const [campaign] = await db.insert(barometreCampaignsTable).values({
    organizationId: orgId,
    exerciseId: exId25,
    name: "Baromètre RSE 2025 – Eco Solutions",
    mode: "anonymous",
    status: "closed",
    openDate: "2025-03-01",
    closeDate: "2025-03-31",
    nbCollaborateurs: 47,
    publicToken,
  }).returning({ id: barometreCampaignsTable.id });

  const campaignId = campaign.id;
  const NB_REPONDANTS = 18;

  // Créer 18 réponses avec des scores réalistes (± bruit autour de Q_MEAN)
  for (let r = 0; r < NB_REPONDANTS; r++) {
    const [response] = await db.insert(barometreResponsesTable).values({
      campaignId,
      completed: true,
      submittedAt: new Date("2025-03-" + String(rnd(2, 28)).padStart(2, "0")),
    }).returning({ id: barometreResponsesTable.id });

    const answers = Object.entries(Q_MEAN).map(([code, mean]) => {
      const noise = rnd(-1, 1);
      const value = Math.min(5, Math.max(1, Math.round(mean + noise)));
      return { responseId: response.id, questionCode: code, scaleValue: value };
    });

    await db.insert(barometreAnswersTable).values(answers);
  }

  console.log(`   ✓ Campagne créée avec ${NB_REPONDANTS} réponses\n`);

  // ── 14. Plan d'actions ────────────────────────────────────────────────────
  console.log("✅ Plan d'actions…");

  const doneActions = LIBRARY_ACTION_IDS_DONE.map((id) => ({
    organizationId: orgId,
    exerciseId: exId25,
    libraryActionId: id,
    source: "library" as const,
    isChecked: true,
    completedAt: new Date("2025-" + String(rnd(1, 9)).padStart(2, "0") + "-" + String(rnd(1, 28)).padStart(2, "0")),
  }));

  const todoActions = LIBRARY_ACTION_IDS_TODO.map((id) => ({
    organizationId: orgId,
    exerciseId: exId25,
    libraryActionId: id,
    source: "library" as const,
    isChecked: false,
  }));

  await db.insert(organizationActionPlansTable).values([...doneActions, ...todoActions]).onConflictDoNothing();

  console.log(`   ✓ ${doneActions.length} actions complétées, ${todoActions.length} en cours\n`);

  // ── 15. Brouillon du rapport RSE ──────────────────────────────────────────
  console.log("📄 Brouillon du rapport RSE…");

  await db.insert(rseReportDraftsTable).values({
    organizationId: orgId,
    exerciseId: exId25,
    version: "1.0",
    period: "Exercice 2025 (janvier – décembre)",

    // Éditorial
    editorialMode: "manual",
    editorialAuthor: "Sophie Laroche",
    editorialAuthorRole: "Directrice Générale",
    editorialCoSigned: false,
    editorialTone: "inspirant",
    editorialContent: `L'année 2025 marque une étape décisive pour Eco Solutions. Après plusieurs années à construire les fondations de notre démarche RSE, nous avons cette année franchi un cap : réduire de 14 % nos émissions de carbone, engager 87 % de nos collaborateurs dans au moins une formation RSE, et obtenir notre première certification Numérique Responsable.\n\nCes résultats ne sont pas le fruit du hasard. Ils témoignent de l'implication de chacun d'entre vous — collaborateurs, partenaires, clients — qui portez au quotidien cette conviction : il est possible de concilier performance économique et responsabilité environnementale et sociale.\n\nNous avons encore beaucoup à faire. Notre feuille de route 2026-2030 fixe des objectifs ambitieux : neutralité carbone sur les scopes 1 et 2, parité dans les instances de direction, et déploiement d'une démarche biodiversité sur nos sites. Ce rapport est notre engagement de transparence envers toutes nos parties prenantes.`,

    // Présentation entreprise
    companyDescription: "Eco Solutions SAS est une PME nantaise spécialisée dans le conseil et l'intégration de solutions numériques responsables pour les entreprises de taille intermédiaire. Fondée en 2017, l'entreprise accompagne ses clients dans leur transformation digitale en plaçant la durabilité au cœur de chaque projet.",
    companyMission: "Accélérer la transformation numérique de nos clients tout en réduisant l'impact environnemental du numérique.",
    isMissionEntreprise: true,
    companyVision: "Devenir la référence du conseil numérique responsable dans le Grand Ouest d'ici 2030.",
    companyValues: "Sobriété numérique · Transparence · Innovation responsable · Engagement humain · Territoire",
    companyKeyFigures: "47 collaborateurs · 12 M€ de CA · 3 sites (Nantes, Rennes, Bordeaux) · 8 ans d'existence",

    // Frise chronologique
    timeline: [
      { id: "tl1", date: "2017", title: "Création d'Eco Solutions", description: "Fondation par Sophie Laroche à Nantes, avec 4 associés." },
      { id: "tl2", date: "2019", title: "Premier bilan carbone", description: "Réalisation du premier bilan GES — 82 tCO2e/an." },
      { id: "tl3", date: "2021", title: "Label Lucie 26000", description: "Obtention du label Lucie, premier engagement RSE formalisé." },
      { id: "tl4", date: "2023", title: "Ouverture du bureau de Bordeaux", description: "3e site en France, 12 recrutements supplémentaires." },
      { id: "tl5", date: "2024", title: "Plan de sobriété numérique", description: "Déploiement du plan NR sur l'ensemble des équipes et projets clients." },
      { id: "tl6", date: "2025", title: "Certification INR Niveau 1", description: "Première certification officielle Numérique Responsable." },
    ],

    // Temps forts
    highlights: [
      {
        id: "h1",
        date: "2025-03-21",
        title: "Journée de plantation d'arbres",
        category: "Environnement",
        description: "42 collaborateurs ont planté 480 arbres dans la forêt communale de Saint-Philbert-de-Grand-Lieu, en partenariat avec l'association Arbres & Territoires.",
        photos: [],
      },
      {
        id: "h2",
        date: "2025-06-05",
        title: "Journée Mondiale de l'Environnement",
        category: "Sensibilisation",
        description: "Organisation d'un fresque du climat et d'un atelier numérique responsable pour l'ensemble des collaborateurs des 3 sites.",
        photos: [],
      },
      {
        id: "h3",
        date: "2025-09-15",
        title: "Forum Achats Responsables",
        category: "Achats responsables",
        description: "Participation au Forum Achats Responsables de Nantes avec présentation de notre charte fournisseurs.",
        photos: [],
      },
      {
        id: "h4",
        date: "2025-10-10",
        title: "Obtention de la certification INR",
        category: "Numérique Responsable",
        description: "Eco Solutions obtient la certification Numérique Responsable Niveau 1 décernée par l'Institut du Numérique Responsable.",
        photos: [],
      },
    ],

    // Perspectives
    perspectivesMode: "manual",
    perspectivesContent: "En 2026, Eco Solutions s'engage à atteindre la neutralité carbone sur ses scopes 1 et 2, à obtenir le label EcoVadis Silver, et à déployer une politique de mobilité durable sur ses 3 sites. Sur le plan social, l'objectif est d'atteindre 45 % de femmes dans les postes de management intermédiaire.",

    // Périmètre
    reportScope: "Ce rapport couvre l'intégralité des 3 sites d'Eco Solutions SAS (Nantes, Rennes, Bordeaux) et représente 100 % des effectifs permanents. Les données RH incluent les alternants et stagiaires en mission longue (> 3 mois).",
    reportMethodology: "Les indicateurs présentés sont issus de la plateforme Cocci et basés sur les référentiels ISO 26000, GHG Protocol (scopes 1-2-3), et le cadre INR pour le numérique responsable. Le bilan carbone a été réalisé selon la méthode Bilan Carbone® de l'ADEME.",
  }).onConflictDoNothing();

  console.log("   ✓ Brouillon du rapport RSE créé\n");

  // ── 16. Attacher le premier super-admin comme owner ───────────────────────
  const superAdmin = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isSuperAdmin, true))
    .limit(1);

  if (superAdmin.length > 0) {
    const userId = superAdmin[0].id;
    await db.insert(membersTable).values({
      userId,
      organizationId: orgId,
      role: "owner",
      status: "active",
    }).onConflictDoNothing();
    console.log(`🔑 Super-admin (userId=${userId}) rattaché comme owner\n`);
  } else {
    console.log("⚠️  Aucun super-admin trouvé — connectez-vous puis rattachez l'organisation manuellement.\n");
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log(`✅ Seed terminé !`);
  console.log(`   Organisation : ${ORG_NAME} (id=${orgId})`);
  console.log(`   Exercice actif : 2025 (id=${exId25})`);
  console.log(`   Exercice N-1   : 2024 (id=${exId24})`);
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Erreur seed :", err);
  process.exit(1);
});

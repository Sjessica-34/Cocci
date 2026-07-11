/**
 * Seed the action_library table with the official Cocci referentiel.
 * Safe to run multiple times — skips existing system actions (is_system=true).
 *
 * Usage: pnpm --filter @workspace/scripts run seed:actions
 */
import { db, actionLibraryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

type Level = "quick" | "project" | "engagement";
type EsgPillar = "E" | "S" | "G";

interface ActionDef {
  name: string;
  description?: string;
  category: string;
  subcategory: string;
  esgPillar: EsgPillar;
  odd: string;
  level: Level;
}

const REFERENTIEL: ActionDef[] = [
  // ─── ENVIRONNEMENT — Énergie ────────────────────────────────────────────
  { name: "Passer aux ampoules LED", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Remplacer l'ensemble des ampoules par des modèles LED basse consommation." },
  { name: "Installer des détecteurs de présence", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Équiper les espaces communs de détecteurs pour éteindre automatiquement l'éclairage." },
  { name: "Réaliser un relamping complet", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "project", description: "Mettre à jour l'ensemble du système d'éclairage pour le rendre plus économe." },
  { name: "Éteindre automatiquement les postes informatiques", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Configurer une extinction automatique des PC en fin de journée." },
  { name: "Installer des multiprises à interrupteur", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Supprimer les veilles électriques en équipant les postes de travail de multiprises interruptibles." },
  { name: "Paramétrer la mise en veille des ordinateurs", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Configurer une mise en veille automatique après 5 à 10 minutes d'inactivité sur tous les postes." },
  { name: "Acheter des appareils basse consommation", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,12", level: "project", description: "Privilégier les équipements labellisés A+++ ou Energy Star lors des renouvellements." },
  { name: "Réduire le chauffage de 1°C", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Baisser d'un degré la température de consigne dans les locaux (économie d'environ 7 % sur la facture)." },
  { name: "Optimiser la climatisation", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Régler la climatisation à 26°C minimum en été et éviter les fenêtres ouvertes en fonctionnement." },
  { name: "Installer des thermostats programmables", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "project", description: "Automatiser la gestion thermique des locaux selon les horaires d'occupation." },
  { name: "Installer des panneaux photovoltaïques", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "engagement", description: "Produire une partie de l'électricité consommée grâce à des panneaux solaires." },
  { name: "Réaliser un audit énergétique", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "project", description: "Faire analyser les consommations d'énergie pour identifier les leviers d'économie." },
  { name: "Réaliser un suivi mensuel des consommations d'énergie", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Mettre en place un tableau de bord mensuel des consommations électriques et gaz." },
  { name: "Vérifier régulièrement les températures de chauffage", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Contrôler et ajuster les températures de consigne dans chaque zone des locaux." },
  { name: "Installer des rideaux ou stores thermiques", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "project", description: "Réduire les déperditions thermiques en équipant fenêtres et baies vitrées." },
  { name: "Isoler les combles ou les locaux", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "engagement", description: "Renforcer l'isolation thermique pour réduire significativement les besoins de chauffage/climatisation." },
  { name: "Remplacer les menuiseries énergivores", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "engagement", description: "Changer les fenêtres simple vitrage par du double ou triple vitrage." },
  { name: "Éteindre les enseignes lumineuses la nuit", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "quick", description: "Programmer l'extinction automatique des enseignes et éclairages extérieurs la nuit." },
  { name: "Installer des films solaires sur les vitrages", category: "Environnement", subcategory: "Énergie", esgPillar: "E", odd: "7,13", level: "project", description: "Réduire les apports solaires estivaux et limiter le recours à la climatisation." },
  // ─── ENVIRONNEMENT — Eau ────────────────────────────────────────────────
  { name: "Installer des mousseurs sur les robinets", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6", level: "quick", description: "Réduire le débit d'eau de 30 à 50 % en équipant les robinets d'économiseurs d'eau." },
  { name: "Détecter les fuites d'eau", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6", level: "quick", description: "Contrôler les installations pour identifier et réparer les fuites (robinets, chasses d'eau)." },
  { name: "Récupérer les eaux pluviales", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6,11", level: "project", description: "Installer une cuve de récupération pour arroser les espaces verts ou nettoyer les sols." },
  { name: "Installer une chasse d'eau double débit", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6", level: "project", description: "Remplacer les chasses d'eau classiques par des modèles à double bouton (3/6 litres)." },
  { name: "Réaliser un suivi mensuel des consommations d'eau", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6", level: "quick", description: "Suivre les consommations d'eau pour détecter les anomalies et les dérives." },
  { name: "Installer des compteurs divisionnaires", category: "Environnement", subcategory: "Eau", esgPillar: "E", odd: "6,7", level: "project", description: "Sous-compteurs eau et énergie pour identifier les postes de consommation les plus importants." },
  // ─── ENVIRONNEMENT — Déchets ─────────────────────────────────────────────
  { name: "Mettre en place le tri sélectif", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "project", description: "Organiser la collecte séparée des déchets recyclables dans les locaux." },
  { name: "Trier les biodéchets", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Mettre en place un bac dédié aux déchets alimentaires et organiques." },
  { name: "Installer des bacs de recyclage", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Déployer des corbeilles de tri dans chaque espace de travail et zone commune." },
  { name: "Recycler les cartouches d'encre", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Collecter les cartouches usagées et les remettre au fabricant ou à un collecteur agréé." },
  { name: "Recycler les piles", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Installer un bac de collecte des piles usagées et les déposer en point de collecte." },
  { name: "Recycler les DEEE", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "project", description: "Faire reprendre les équipements électriques et électroniques en fin de vie par un éco-organisme agréé." },
  { name: "Mettre en place le compostage", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12,15", level: "project", description: "Installer un composteur pour valoriser les déchets organiques de la cantine ou cuisine." },
  { name: "Réutiliser les cartons d'expédition", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Conserver les cartons reçus pour les réutiliser lors de futures expéditions." },
  { name: "Réduire les emballages fournisseurs", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "project", description: "Négocier avec les fournisseurs pour livrer en vrac ou avec des emballages recyclables." },
  { name: "Utiliser des emballages recyclés", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "project", description: "Passer à des emballages fabriqués à partir de matières recyclées pour les expéditions." },
  { name: "Installer une signalétique de tri", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Afficher clairement les consignes de tri sur chaque bac pour faciliter le geste." },
  { name: "Réaliser un audit déchets", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "project", description: "Analyser les flux de déchets produits pour identifier les gisements de réduction." },
  { name: "Valoriser les déchets organiques", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12,15", level: "project", description: "Orienter les déchets organiques vers la méthanisation ou le compostage externe." },
  { name: "Réutiliser les palettes", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Réparer et réemployer les palettes en bois plutôt que de les mettre au rebut." },
  { name: "Installer des cendriers de collecte", category: "Environnement", subcategory: "Déchets", esgPillar: "E", odd: "12", level: "quick", description: "Équiper les espaces fumeurs de cendriers permettant la collecte et le recyclage des mégots." },
  // ─── ENVIRONNEMENT — Papier & Impression ──────────────────────────────────
  { name: "Utiliser du papier recyclé", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12,15", level: "quick", description: "Remplacer le papier vierge par du papier 100 % recyclé pour toutes les impressions." },
  { name: "Utiliser du papier certifié FSC ou PEFC", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12,15", level: "quick", description: "S'approvisionner en papier issu de forêts gérées durablement (label FSC ou PEFC)." },
  { name: "Imprimer recto-verso par défaut", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12", level: "quick", description: "Configurer toutes les imprimantes en mode recto-verso par défaut pour diviser par deux la consommation de papier." },
  { name: "Réduire les impressions", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12", level: "quick", description: "Sensibiliser les équipes à n'imprimer que lorsque c'est indispensable." },
  { name: "Dématérialiser les documents", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12,9", level: "project", description: "Passer à la signature électronique et au stockage numérique pour supprimer les impressions courantes." },
  { name: "Réduire les consommations de papier toilette", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12", level: "quick", description: "Acheter du papier toilette recyclé ou issu de fibres certifiées." },
  { name: "Acheter des essuie-mains recyclés", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "12", level: "quick", description: "Remplacer les essuie-mains jetables par des modèles en papier recyclé ou des sèche-mains." },
  { name: "Installer des sèche-mains basse consommation", category: "Environnement", subcategory: "Papier & Impression", esgPillar: "E", odd: "7,12", level: "project", description: "Installer des sèche-mains électriques économes en énergie pour supprimer les essuie-mains jetables." },
  // ─── ENVIRONNEMENT — Plastiques & Vaisselle ──────────────────────────────
  { name: "Supprimer les gobelets jetables", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "12,14", level: "quick", description: "Retirer les distributeurs de gobelets plastiques et encourager l'usage de mugs réutilisables." },
  { name: "Utiliser de la vaisselle réutilisable", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "12", level: "quick", description: "Remplacer assiettes et couverts jetables par de la vaisselle lavable dans l'espace repas." },
  { name: "Acheter des couverts lavables", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "12", level: "quick", description: "Équiper l'espace cuisine de couverts en inox ou bambou pour remplacer les couverts plastiques." },
  { name: "Supprimer les bouteilles plastiques", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "12,14", level: "quick", description: "Arrêter l'achat de bouteilles d'eau en plastique et équiper les collaborateurs de gourdes." },
  { name: "Installer une fontaine à eau", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "6,12", level: "project", description: "Mettre à disposition une fontaine à eau froide et chaude pour supprimer définitivement les bouteilles plastiques." },
  { name: "Réduire l'utilisation du plastique", category: "Environnement", subcategory: "Plastiques & Vaisselle", esgPillar: "E", odd: "12,14", level: "quick", description: "Identifier et remplacer progressivement tous les plastiques à usage unique dans l'entreprise." },
  // ─── ENVIRONNEMENT — Achats & Produits ───────────────────────────────────
  { name: "Acheter des produits d'entretien écologiques", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12,14", level: "quick", description: "Remplacer les produits ménagers classiques par des équivalents écolabellisés (Écolabel européen, Nature & Progrès...)." },
  { name: "Réduire les emballages", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12", level: "quick", description: "Privilégier les achats en vrac ou les grands formats pour réduire les emballages unitaires." },
  { name: "Choisir des fournisseurs locaux", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12,11", level: "project", description: "Favoriser les fournisseurs et prestataires situés à moins de 100 km pour réduire l'empreinte carbone des achats." },
  { name: "Acheter des produits écolabellisés", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12", level: "quick", description: "Référencer des produits portant un label environnemental reconnu (NF Environnement, Écolabel européen...)." },
  { name: "Acheter des fournitures en vrac", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12", level: "quick", description: "Commander les fournitures de bureau en grandes quantités pour limiter les emballages individuels." },
  { name: "Utiliser des produits rechargeables", category: "Environnement", subcategory: "Achats & Produits", esgPillar: "E", odd: "12", level: "quick", description: "Passer aux stylos, cartouches et accessoires rechargeables plutôt qu'aux jetables." },
  // ─── ENVIRONNEMENT — Mobilier & Matériel ─────────────────────────────────
  { name: "Acheter du mobilier reconditionné", category: "Environnement", subcategory: "Mobilier & Matériel", esgPillar: "E", odd: "12", level: "project", description: "Acquérir du mobilier de bureau d'occasion ou reconditionné plutôt que du neuf." },
  { name: "Acheter du matériel informatique reconditionné", category: "Environnement", subcategory: "Mobilier & Matériel", esgPillar: "E", odd: "12", level: "project", description: "Choisir des ordinateurs, écrans et périphériques reconditionnés pour les renouvellements." },
  // ─── ENVIRONNEMENT — Carbone & Mobilité ──────────────────────────────────
  { name: "Réaliser un bilan carbone", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13", level: "project", description: "Mesurer les émissions de GES de l'entreprise (scopes 1, 2 et 3) selon la méthode Bilan Carbone®." },
  { name: "Sensibiliser aux écogestes", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13,12", level: "quick", description: "Organiser une session de sensibilisation aux gestes écoresponsables au bureau." },
  { name: "Organiser des défis écogestes", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13,12", level: "project", description: "Lancer un défi collectif (ex. : semaine sans voiture solo, semaine zéro déchet) pour mobiliser les équipes." },
  { name: "Mesurer les émissions de CO₂ des déplacements", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13,11", level: "project", description: "Calculer l'empreinte carbone des déplacements professionnels et domicile-travail." },
  { name: "Réaliser une fresque du climat", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13", level: "project", description: "Animer l'atelier collaboratif La Fresque du Climat pour comprendre les mécanismes du changement climatique." },
  { name: "Remplacer les véhicules thermiques par des véhicules électriques", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13,11", level: "engagement", description: "Intégrer progressivement des véhicules électriques ou hybrides rechargeables dans la flotte." },
  { name: "Installer des bornes de recharge", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13,11", level: "engagement", description: "Équiper le parking de bornes de recharge pour les véhicules électriques des collaborateurs." },
  { name: "Encourager l'éco-conduite", category: "Environnement", subcategory: "Carbone & Mobilité", esgPillar: "E", odd: "13", level: "quick", description: "Former et sensibiliser les conducteurs aux techniques d'éco-conduite pour réduire la consommation de carburant." },
  // ─── NUMÉRIQUE RESPONSABLE — Matériel ────────────────────────────────────
  { name: "Allonger la durée de vie du matériel", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12,9", level: "project", description: "Définir une politique de renouvellement plus longue (5+ ans pour les PC) pour réduire les déchets électroniques." },
  { name: "Réparer les équipements", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "quick", description: "Faire appel à un réparateur avant de remplacer tout équipement en panne." },
  { name: "Mettre en place une politique de réemploi", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "project", description: "Définir un processus de réaffectation interne des équipements encore fonctionnels." },
  { name: "Acheter des ordinateurs reconditionnés", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "project", description: "Choisir des PC reconditionnés certifiés pour les renouvellements et nouveaux arrivants." },
  { name: "Acheter des smartphones reconditionnés", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "project", description: "Intégrer les smartphones reconditionnés dans la politique de flotte mobile." },
  { name: "Réparer les smartphones", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "quick", description: "Faire réparer les téléphones (écran, batterie) avant de les remplacer." },
  { name: "Faire reprendre les anciens équipements", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "project", description: "Remettre les anciens équipements à un éco-organisme ou revendeur pour reconditionnement." },
  { name: "Donner les anciens ordinateurs à une association", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12,10", level: "quick", description: "Faire don des PC encore fonctionnels à une association de réinsertion numérique." },
  { name: "Réduire le nombre d'écrans par poste", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "quick", description: "Limiter les configurations multi-écrans aux usages qui le justifient réellement." },
  { name: "Éteindre les serveurs inutilisés", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "7,12", level: "quick", description: "Identifier et éteindre les serveurs en veille ou sous-utilisés dans la salle informatique." },
  { name: "Mettre en place une politique de renouvellement du matériel", category: "Numérique responsable", subcategory: "Matériel", esgPillar: "E", odd: "12", level: "project", description: "Formaliser les critères et cycles de renouvellement du parc informatique." },
  // ─── NUMÉRIQUE RESPONSABLE — Données & Stockage ───────────────────────────
  { name: "Réduire le stockage inutile", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12,13", level: "quick", description: "Libérer régulièrement de l'espace sur les serveurs et dans le cloud en supprimant les données inutiles." },
  { name: "Supprimer les fichiers obsolètes", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12", level: "quick", description: "Organiser une opération de nettoyage des disques partagés et des espaces cloud." },
  { name: "Nettoyer les boîtes mail", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12", level: "quick", description: "Supprimer les emails anciens, vider les corbeilles et se désabonner des newsletters inutiles." },
  { name: "Optimiser les sauvegardes", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12", level: "project", description: "Réviser la politique de sauvegarde pour ne conserver que les données utiles avec la bonne fréquence." },
  { name: "Réduire la durée de conservation des données", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12,16", level: "project", description: "Aligner les durées de rétention sur les obligations légales et supprimer ce qui n'est plus nécessaire." },
  { name: "Trier les espaces collaboratifs", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "12", level: "quick", description: "Supprimer les doublons et archiver les anciens projets dans les drives partagés." },
  { name: "Mutualiser les serveurs", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "7,12", level: "project", description: "Regrouper les services sur un nombre réduit de serveurs pour optimiser leur taux d'utilisation." },
  { name: "Virtualiser les infrastructures", category: "Numérique responsable", subcategory: "Données & Stockage", esgPillar: "E", odd: "7,12", level: "project", description: "Migrer vers des infrastructures virtualisées pour réduire le nombre de machines physiques." },
  // ─── NUMÉRIQUE RESPONSABLE — Communication numérique ──────────────────────
  { name: "Réduire les pièces jointes", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Remplacer les pièces jointes volumineuses par des liens vers des espaces de partage." },
  { name: "Utiliser des liens de téléchargement", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Partager les documents via des liens plutôt qu'en pièces jointes pour réduire les données transmises." },
  { name: "Compresser les pièces jointes", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Réduire le poids des fichiers avant envoi (images, PDF compressés)." },
  { name: "Désactiver les newsletters inutiles", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Se désabonner des newsletters commerciales et automatiques non lues." },
  { name: "Réduire les notifications automatiques", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Désactiver les notifications non essentielles des outils collaboratifs." },
  { name: "Optimiser les visioconférences", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12,13", level: "quick", description: "Couper la vidéo en réunion distante quand elle n'est pas nécessaire (réduit la bande passante et l'énergie)." },
  { name: "Désactiver la lecture automatique des vidéos", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Configurer navigateurs et outils pour ne pas lancer les vidéos automatiquement." },
  { name: "Réduire la qualité des vidéos internes", category: "Numérique responsable", subcategory: "Communication numérique", esgPillar: "E", odd: "12", level: "quick", description: "Diffuser les vidéos internes en 720p plutôt qu'en 4K pour réduire les transferts de données." },
  // ─── NUMÉRIQUE RESPONSABLE — Site & Logiciels ─────────────────────────────
  { name: "Optimiser le site internet", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "12,9", level: "project", description: "Réduire le poids des pages web pour diminuer la consommation d'énergie à chaque visite." },
  { name: "Réduire le poids des images", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "12", level: "quick", description: "Compresser et redimensionner toutes les images avant publication sur le web." },
  { name: "Limiter les vidéos en lecture automatique", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "12", level: "quick", description: "Supprimer l'autoplay des vidéos sur le site internet de l'entreprise." },
  { name: "Désinstaller les logiciels inutilisés", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "12", level: "quick", description: "Faire un inventaire et désinstaller les applications inutilisées sur tous les postes." },
  { name: "Choisir un hébergeur engagé", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "7,12", level: "project", description: "Migrer le site vers un hébergeur fonctionnant avec des énergies renouvelables." },
  { name: "Utiliser des logiciels open source lorsque pertinent", category: "Numérique responsable", subcategory: "Site & Logiciels", esgPillar: "E", odd: "9,12", level: "project", description: "Remplacer progressivement les logiciels propriétaires par des alternatives open source adaptées aux besoins." },
  // ─── NUMÉRIQUE RESPONSABLE — Impression ───────────────────────────────────
  { name: "Réduire le nombre d'imprimantes", category: "Numérique responsable", subcategory: "Impression", esgPillar: "E", odd: "12", level: "project", description: "Mutualiser les imprimantes pour en réduire le nombre et inciter à moins imprimer." },
  { name: "Mutualiser les équipements", category: "Numérique responsable", subcategory: "Impression", esgPillar: "E", odd: "12", level: "project", description: "Partager scanners, imprimantes et équipements audio-visuels entre plusieurs services." },
  { name: "Mettre en place une politique d'impression", category: "Numérique responsable", subcategory: "Impression", esgPillar: "E", odd: "12", level: "project", description: "Définir et communiquer des règles claires d'impression (noir & blanc, recto-verso, validation nécessaire)." },
  { name: "Limiter les impressions couleur", category: "Numérique responsable", subcategory: "Impression", esgPillar: "E", odd: "12", level: "quick", description: "Configurer les imprimantes pour utiliser le mode noir & blanc par défaut." },
  // ─── NUMÉRIQUE RESPONSABLE — Sensibilisation ──────────────────────────────
  { name: "Sensibiliser au numérique responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,12", level: "quick", description: "Organiser une session d'information sur l'empreinte environnementale du numérique." },
  { name: "Former les collaborateurs au numérique responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,12", level: "project", description: "Former l'ensemble des équipes aux bonnes pratiques numériques responsables." },
  { name: "Déployer une charte numérique responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "12", level: "project", description: "Rédiger et diffuser une charte interne définissant les engagements numériques responsables." },
  { name: "Réaliser une auto-évaluation Numérique Responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "12", level: "project", description: "Évaluer la maturité numérique responsable de l'organisation avec un outil de diagnostic." },
  { name: "Sensibiliser aux écogestes numériques", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,12", level: "quick", description: "Partager des fiches pratiques sur les gestes simples pour réduire l'empreinte numérique." },
  { name: "Réaliser un audit numérique responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "12", level: "project", description: "Faire analyser l'empreinte numérique de l'entreprise par un prestataire spécialisé." },
  { name: "Mesurer l'empreinte numérique de l'entreprise", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "12,13", level: "project", description: "Quantifier les émissions de GES liées aux usages numériques (équipements, datacenter, réseau)." },
  { name: "Réaliser une sensibilisation annuelle au numérique responsable", category: "Numérique responsable", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,12", level: "project", description: "Organiser chaque année un temps fort de sensibilisation pour renouveler l'engagement des équipes." },
  // ─── BIODIVERSITÉ — Faune ─────────────────────────────────────────────────
  { name: "Installer un hôtel à insectes", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "quick", description: "Placer un hôtel à insectes dans les espaces verts de l'entreprise pour accueillir les pollinisateurs." },
  { name: "Installer un nichoir", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "quick", description: "Fixer un nichoir à oiseaux sur un arbre ou façade pour favoriser la nidification." },
  { name: "Installer une mangeoire", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "quick", description: "Mettre en place une mangeoire pour nourrir les oiseaux en hiver." },
  { name: "Installer des gîtes à chauves-souris", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "quick", description: "Accueillir les chauves-souris, espèce protégée et prédatrice naturelle des moustiques." },
  { name: "Installer des abris à hérissons", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "quick", description: "Aménager un abri pour les hérissons, auxiliaires précieux de la biodiversité des jardins." },
  { name: "Créer une mare écologique", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "14,15", level: "project", description: "Aménager une mare pour favoriser amphibiens, odonates et autres espèces aquatiques." },
  { name: "Installer des corridors écologiques", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "project", description: "Créer des passages pour la faune (haies continues, passages en clôture) reliant les espaces naturels." },
  { name: "Remplacer les clôtures imperméables à la faune", category: "Biodiversité", subcategory: "Faune", esgPillar: "E", odd: "15", level: "project", description: "Aménager les clôtures pour permettre le passage des petits animaux (passages en bas de grillage)." },
  // ─── BIODIVERSITÉ — Végétation ─────────────────────────────────────────────
  { name: "Planter une haie locale", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Créer une haie champêtre avec des essences locales pour favoriser la biodiversité et séquestrer du carbone." },
  { name: "Supprimer les espèces invasives", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Identifier et éliminer les plantes invasives (Renouée du Japon, Buddleia...) des espaces verts." },
  { name: "Remplacer les plantes exotiques", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Substituer les espèces ornementales exotiques par des variétés locales adaptées au climat." },
  { name: "Installer une prairie fleurie", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Ensemencer une zone en prairies fleuries mellifères pour les pollinisateurs." },
  { name: "Réduire les tontes", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Adopter une gestion différenciée en tondant moins fréquemment certaines zones." },
  { name: "Créer une zone refuge", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Délimiter une zone laissée en libre évolution pour accueillir la faune et la flore sauvages." },
  { name: "Installer des plantes mellifères", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Planter des espèces très attractives pour les abeilles et pollinisateurs (lavande, phacélie, bourrache...)." },
  { name: "Planter des arbres", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "13,15", level: "project", description: "Ajouter des arbres dans les espaces extérieurs pour la biodiversité et la séquestration carbone." },
  { name: "Installer une haie champêtre", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "Planter une haie dense d'essences indigènes pour créer un refuge et un corridor écologique." },
  { name: "Préserver les arbres remarquables", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Identifier et protéger les arbres anciens ou de grandes dimensions sur le site." },
  { name: "Préserver les vieux arbres", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Conserver les arbres morts ou sénescents comme habitats essentiels pour de nombreuses espèces." },
  { name: "Favoriser les essences locales", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "project", description: "N'utiliser que des espèces végétales locales et adaptées au contexte climatique lors des plantations." },
  { name: "Installer des zones de friche volontaire", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Laisser une partie des espaces verts en friche pour y accueillir spontanément plantes et insectes." },
  { name: "Laisser des zones en libre évolution", category: "Biodiversité", subcategory: "Végétation", esgPillar: "E", odd: "15", level: "quick", description: "Délimiter des zones sans intervention humaine pour observer le retour naturel de la biodiversité." },
  // ─── BIODIVERSITÉ — Aménagement ───────────────────────────────────────────
  { name: "Désimperméabiliser une surface", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "11,15", level: "project", description: "Remplacer une surface imperméable (bitume, béton) par de la végétation ou des matériaux drainants." },
  { name: "Végétaliser les parkings", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "11,15", level: "project", description: "Intégrer de la végétation et des matériaux perméables dans les aires de stationnement." },
  { name: "Installer des récupérateurs d'eau", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "6,15", level: "quick", description: "Mettre en place des cuves récupération d'eau de pluie pour arroser les espaces verts." },
  { name: "Supprimer les pesticides", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "3,15", level: "quick", description: "Arrêter totalement l'utilisation de pesticides chimiques sur les espaces verts." },
  { name: "Réduire les produits phytosanitaires", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "3,15", level: "quick", description: "Diminuer progressivement l'usage des produits phytosanitaires en faveur de méthodes alternatives." },
  { name: "Réduire l'éclairage nocturne", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "7,15", level: "quick", description: "Éteindre ou baisser l'éclairage extérieur la nuit pour réduire la pollution lumineuse nuisible à la faune." },
  { name: "Installer des éclairages favorables à la biodiversité", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "7,15", level: "project", description: "Choisir des éclairages à spectre chaud, orientés vers le bas, pour limiter l'impact sur les espèces nocturnes." },
  { name: "Réaliser une gestion différenciée", category: "Biodiversité", subcategory: "Aménagement", esgPillar: "E", odd: "15", level: "project", description: "Adopter un plan de gestion différenciée des espaces verts (zones intensives, extensives, libres)." },
  // ─── BIODIVERSITÉ — Diagnostic ────────────────────────────────────────────
  { name: "Réaliser un diagnostic biodiversité", category: "Biodiversité", subcategory: "Diagnostic", esgPillar: "E", odd: "15", level: "project", description: "Faire réaliser un état des lieux de la biodiversité sur le site par un écologue." },
  { name: "Identifier les dépendances à la biodiversité", category: "Biodiversité", subcategory: "Diagnostic", esgPillar: "E", odd: "15", level: "project", description: "Analyser en quoi l'activité de l'entreprise dépend des services écosystémiques." },
  { name: "Cartographier les enjeux biodiversité", category: "Biodiversité", subcategory: "Diagnostic", esgPillar: "E", odd: "15", level: "project", description: "Identifier les espèces et habitats remarquables autour du site et les zones à enjeux." },
  { name: "Réaliser un inventaire des espèces", category: "Biodiversité", subcategory: "Diagnostic", esgPillar: "E", odd: "15", level: "project", description: "Recenser les espèces végétales et animales présentes sur le site." },
  { name: "Identifier les espèces protégées", category: "Biodiversité", subcategory: "Diagnostic", esgPillar: "E", odd: "15", level: "project", description: "Vérifier la présence d'espèces protégées et adapter la gestion du site en conséquence." },
  // ─── BIODIVERSITÉ — Sensibilisation ───────────────────────────────────────
  { name: "Sensibiliser à la biodiversité", category: "Biodiversité", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,15", level: "quick", description: "Organiser une session de sensibilisation sur les enjeux de la biodiversité et le rôle de l'entreprise." },
  { name: "Sensibiliser les collaborateurs à la faune locale", category: "Biodiversité", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,15", level: "quick", description: "Partager des contenus sur les espèces présentes sur le site et aux alentours." },
  { name: "Organiser une journée plantation", category: "Biodiversité", subcategory: "Sensibilisation", esgPillar: "E", odd: "15", level: "project", description: "Mobiliser les collaborateurs pour planter ensemble arbres et végétaux sur le site." },
  { name: "Participer à une opération de nettoyage de la nature", category: "Biodiversité", subcategory: "Sensibilisation", esgPillar: "E", odd: "15", level: "quick", description: "S'inscrire à une opération collective de ramassage des déchets dans la nature." },
  { name: "Installer des panneaux pédagogiques", category: "Biodiversité", subcategory: "Sensibilisation", esgPillar: "E", odd: "4,15", level: "project", description: "Mettre en place des panneaux expliquant la biodiversité du site dans les espaces verts." },
  // ─── SOCIAL — Bien-être & QVT ─────────────────────────────────────────────
  { name: "Organiser un baromètre social", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "8", level: "project", description: "Lancer une enquête anonyme pour mesurer le bien-être et l'engagement des collaborateurs." },
  { name: "Réaliser une enquête QVT", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "3,8", level: "project", description: "Mesurer la qualité de vie au travail via un questionnaire ciblé." },
  { name: "Organiser une semaine QVT", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "3,8", level: "project", description: "Organiser une semaine thématique dédiée à la qualité de vie au travail (ateliers, animations...)." },
  { name: "Réaliser un diagnostic QVT", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "3,8", level: "project", description: "Réaliser un diagnostic complet de la qualité de vie au travail avec des indicateurs objectifs." },
  { name: "Organiser un café d'équipe mensuel", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "8,16", level: "quick", description: "Réunir l'équipe chaque mois autour d'un café pour favoriser le lien et la communication informelle." },
  { name: "Organiser des petits-déjeuners collaborateurs", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "8", level: "quick", description: "Proposer des petits-déjeuners conviviaux pour renforcer la cohésion d'équipe." },
  { name: "Organiser des ateliers bien-être", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "3,8", level: "project", description: "Proposer des ateliers de bien-être (yoga, méditation, sophrologie) pendant le temps de travail." },
  { name: "Mettre à disposition des fruits", category: "Social", subcategory: "Bien-être & QVT", esgPillar: "S", odd: "3,8", level: "quick", description: "Installer une corbeille de fruits frais à disposition des collaborateurs chaque semaine." },
  // ─── SOCIAL — Formation ───────────────────────────────────────────────────
  { name: "Réaliser les entretiens annuels", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "8", level: "project", description: "Conduire un entretien annuel individuel avec chaque collaborateur pour faire le point sur les objectifs." },
  { name: "Réaliser les entretiens professionnels", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "4,8", level: "project", description: "Organiser tous les 2 ans les entretiens professionnels pour discuter des perspectives d'évolution." },
  { name: "Réaliser un plan de formation", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "4,8", level: "project", description: "Définir un plan de formation annuel aligné sur les besoins des collaborateurs et les objectifs de l'entreprise." },
  { name: "Former les managers", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "4,8", level: "project", description: "Former les responsables d'équipe aux bonnes pratiques de management bienveillant." },
  { name: "Former à la prévention des RPS", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "3,8", level: "project", description: "Former managers et RH à l'identification et à la prévention des risques psychosociaux." },
  { name: "Encourager la formation continue", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "4,8", level: "project", description: "Mettre en place un budget formation individuel et encourager les collaborateurs à se former." },
  { name: "Développer la mobilité interne", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "8,10", level: "project", description: "Favoriser les évolutions et mobilités internes avant de recruter en externe." },
  { name: "Organiser des événements de cohésion", category: "Social", subcategory: "Formation", esgPillar: "S", odd: "8", level: "quick", description: "Organiser régulièrement des moments de team building pour renforcer les liens entre collègues." },
  // ─── SOCIAL — Santé & Sécurité ────────────────────────────────────────────
  { name: "Former aux premiers secours", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Former des collaborateurs aux gestes de premiers secours (PSC1, SST)." },
  { name: "Former aux risques professionnels", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Informer et former les collaborateurs aux risques spécifiques à leurs postes de travail." },
  { name: "Mettre à jour le DUERP", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Actualiser le Document Unique d'Évaluation des Risques Professionnels au moins une fois par an." },
  { name: "Organiser une journée sécurité", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Dédier une journée à la sensibilisation à la sécurité au travail (ateliers, exercices, quiz)." },
  { name: "Réaliser des exercices incendie", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "quick", description: "Organiser les exercices d'évacuation incendie réglementaires avec retour d'expérience." },
  { name: "Créer une cellule d'écoute", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Mettre en place un dispositif d'écoute psychologique interne ou externe pour les collaborateurs en difficulté." },
  { name: "Sensibiliser au harcèlement", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "5,8", level: "quick", description: "Organiser une sensibilisation sur la prévention du harcèlement moral et sexuel." },
  { name: "Désigner un référent harcèlement", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "5,8", level: "quick", description: "Nommer un référent harcèlement sexuel et agissements sexistes (obligatoire dès 250 salariés)." },
  { name: "Adapter les postes de travail", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Réaliser une étude ergonomique et adapter les postes aux besoins des collaborateurs." },
  { name: "Mettre à disposition des équipements ergonomiques", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Équiper les postes de travail de sièges ergonomiques, repose-poignets, écrans réglables." },
  { name: "Installer des bureaux assis-debout", category: "Social", subcategory: "Santé & Sécurité", esgPillar: "S", odd: "3,8", level: "project", description: "Proposer des bureaux à hauteur variable pour réduire la sédentarité des collaborateurs." },
  // ─── SOCIAL — Inclusion & Diversité ──────────────────────────────────────
  { name: "Mettre en place un référent handicap", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "10", level: "quick", description: "Nommer un référent pour accompagner les collaborateurs en situation de handicap." },
  { name: "Sensibiliser aux discriminations", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "5,10", level: "quick", description: "Former et sensibiliser les équipes à la prévention de toute forme de discrimination." },
  { name: "Former à la diversité", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "5,10", level: "project", description: "Mettre en place une formation sur la diversité, l'équité et l'inclusion." },
  { name: "Mettre en place une charte diversité", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "5,10", level: "project", description: "Signer et diffuser la Charte de la Diversité pour s'engager formellement en faveur de l'inclusion." },
  { name: "Mettre en place une politique d'inclusion", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "5,10", level: "engagement", description: "Définir et mettre en œuvre une politique structurée d'inclusion (handicap, genres, origines, âges)." },
  { name: "Favoriser l'emploi des seniors", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "8,10", level: "project", description: "Mettre en place des actions pour recruter, former et maintenir en emploi les collaborateurs de plus de 50 ans." },
  { name: "Favoriser l'emploi des jeunes", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "8,10", level: "project", description: "Développer les alternances, stages et premières expériences pour l'insertion des jeunes." },
  { name: "Participer à DuoDay", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "10", level: "quick", description: "Accueillir une personne en situation de handicap en binôme pour la journée DuoDay." },
  { name: "Organiser Octobre Rose", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "3,5", level: "quick", description: "Participer à la campagne Octobre Rose pour sensibiliser au dépistage du cancer du sein." },
  { name: "Organiser Movember", category: "Social", subcategory: "Inclusion & Diversité", esgPillar: "S", odd: "3", level: "quick", description: "Participer à Movember pour sensibiliser à la santé masculine et aux cancers masculins." },
  // ─── SOCIAL — Intégration & Fidélisation ─────────────────────────────────
  { name: "Mettre en place un parcours d'intégration", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "8", level: "project", description: "Structurer un onboarding complet pour les nouveaux arrivants (programme de 1 à 3 mois)." },
  { name: "Organiser une journée d'intégration", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "8", level: "project", description: "Accueillir les nouveaux collaborateurs lors d'une journée dédiée à la découverte de l'entreprise." },
  { name: "Mettre en place du tutorat", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "4,8", level: "project", description: "Associer chaque nouvel arrivant à un tuteur expérimenté pour faciliter son intégration." },
  { name: "Créer un livret d'accueil", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "8", level: "project", description: "Rédiger un guide d'accueil présentant l'entreprise, les équipes, les pratiques et les valeurs RSE." },
  { name: "Réaliser une enquête d'intégration", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "8", level: "quick", description: "Interroger les nouveaux arrivants après 3 et 6 mois pour améliorer le processus d'intégration." },
  { name: "Réaliser des entretiens de départ", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "8", level: "quick", description: "Conduire un entretien de départ avec chaque collaborateur quittant l'entreprise pour recueillir ses retours." },
  { name: "Mettre en place un mentorat", category: "Social", subcategory: "Intégration", esgPillar: "S", odd: "4,8", level: "project", description: "Créer un programme de mentorat pour le développement professionnel et personnel des collaborateurs." },
  // ─── SOCIAL — Communication interne ──────────────────────────────────────
  { name: "Créer une boîte à idées", category: "Social", subcategory: "Communication interne", esgPillar: "S", odd: "8,16", level: "quick", description: "Mettre en place une boîte à idées (physique ou numérique) pour recueillir les suggestions des collaborateurs." },
  { name: "Mettre en place une newsletter interne", category: "Social", subcategory: "Communication interne", esgPillar: "S", odd: "8", level: "project", description: "Créer une lettre d'information interne régulière pour partager les actualités de l'entreprise." },
  { name: "Développer le télétravail", category: "Social", subcategory: "Communication interne", esgPillar: "S", odd: "8,11", level: "project", description: "Structurer et formaliser la politique de télétravail pour améliorer l'équilibre vie pro/perso." },
  // ─── SOCIAL — Mobilité ────────────────────────────────────────────────────
  { name: "Mettre en place un plan de mobilité", category: "Social", subcategory: "Mobilité", esgPillar: "S", odd: "11,13", level: "project", description: "Élaborer un plan de mobilité durable (PDME) pour réduire l'impact des déplacements domicile-travail." },
  { name: "Favoriser le covoiturage", category: "Social", subcategory: "Mobilité", esgPillar: "S", odd: "11,13", level: "quick", description: "Mettre en place un outil ou un groupe de covoiturage entre collaborateurs." },
  { name: "Installer un parking vélo", category: "Social", subcategory: "Mobilité", esgPillar: "S", odd: "11,13", level: "project", description: "Aménager un espace sécurisé pour stationner les vélos des collaborateurs." },
  { name: "Installer des douches pour cyclistes", category: "Social", subcategory: "Mobilité", esgPillar: "S", odd: "11,13", level: "project", description: "Équiper les vestiaires de douches pour encourager les déplacements à vélo." },
  // ─── SOCIAL — Solidarité ──────────────────────────────────────────────────
  { name: "Organiser une collecte solidaire", category: "Social", subcategory: "Solidarité", esgPillar: "S", odd: "1,17", level: "quick", description: "Organiser une collecte de denrées, vêtements ou jouets pour une association locale." },
  // ─── ACHATS RESPONSABLES — Fournisseurs ──────────────────────────────────
  { name: "Rédiger une charte achats responsables", category: "Achats responsables", subcategory: "Fournisseurs", esgPillar: "G", odd: "12,17", level: "project", description: "Formaliser les engagements RSE attendus des fournisseurs dans une charte achat." },
  { name: "Évaluer les fournisseurs", category: "Achats responsables", subcategory: "Fournisseurs", esgPillar: "G", odd: "12,17", level: "project", description: "Mettre en place un questionnaire ou un score RSE pour évaluer les fournisseurs existants." },
  { name: "Ajouter des critères RSE dans les appels d'offres", category: "Achats responsables", subcategory: "Fournisseurs", esgPillar: "G", odd: "12,17", level: "project", description: "Intégrer des critères environnementaux et sociaux dans les cahiers des charges et appels d'offres." },
  { name: "Référencer des fournisseurs locaux", category: "Achats responsables", subcategory: "Fournisseurs", esgPillar: "G", odd: "11,12", level: "project", description: "Identifier et référencer des alternatives locales pour les principaux postes d'achats." },
  { name: "Réduire le nombre de fournisseurs", category: "Achats responsables", subcategory: "Fournisseurs", esgPillar: "G", odd: "12,17", level: "project", description: "Consolider le panel fournisseurs pour mieux contrôler les critères RSE et faciliter le suivi." },
  // ─── ACHATS RESPONSABLES — Achats ────────────────────────────────────────
  { name: "Acheter des produits écolabellisés (achats)", category: "Achats responsables", subcategory: "Achats", esgPillar: "G", odd: "12", level: "quick", description: "Privilégier systématiquement les produits portant un écolabel reconnu lors des achats courants." },
  { name: "Acheter du mobilier durable", category: "Achats responsables", subcategory: "Achats", esgPillar: "G", odd: "12", level: "project", description: "Choisir des meubles fabriqués avec des matériaux durables, certifiés et conçus pour durer." },
  { name: "Acheter des fournitures recyclées", category: "Achats responsables", subcategory: "Achats", esgPillar: "G", odd: "12", level: "quick", description: "Opter pour des fournitures de bureau fabriquées à partir de matières recyclées." },
  { name: "Acheter des vêtements écoresponsables", category: "Achats responsables", subcategory: "Achats", esgPillar: "G", odd: "12", level: "project", description: "Choisir des vêtements de travail ou goodies en matières durables et certifiées (coton bio, GOTS...)." },
  { name: "Limiter les objets publicitaires", category: "Achats responsables", subcategory: "Achats", esgPillar: "G", odd: "12", level: "quick", description: "Réduire le nombre et le volume des goodies offerts, et choisir des objets durables et utiles." },
  // ─── GOUVERNANCE — Stratégie RSE ─────────────────────────────────────────
  { name: "Définir une politique RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16,17", level: "engagement", description: "Formaliser la stratégie RSE de l'entreprise en définissant vision, valeurs, axes prioritaires et engagements." },
  { name: "Nommer un référent RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16", level: "quick", description: "Désigner un responsable RSE interne chargé de piloter et coordonner la démarche." },
  { name: "Créer un comité RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16,17", level: "engagement", description: "Constituer un comité transversal réunissant les représentants de chaque service pour piloter la démarche RSE." },
  { name: "Définir des objectifs RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16", level: "project", description: "Fixer des objectifs mesurables à court, moyen et long terme pour chaque axe de la politique RSE." },
  { name: "Élaborer un plan d'actions RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16", level: "project", description: "Définir un plan d'actions concret avec des responsables, des délais et des indicateurs de suivi." },
  { name: "Réaliser un audit RSE", category: "Gouvernance", subcategory: "Stratégie RSE", esgPillar: "G", odd: "16", level: "project", description: "Faire évaluer la maturité RSE de l'entreprise par un organisme externe." },
  // ─── GOUVERNANCE — Pilotage ───────────────────────────────────────────────
  { name: "Mettre en place des indicateurs RSE", category: "Gouvernance", subcategory: "Pilotage", esgPillar: "G", odd: "16,17", level: "project", description: "Définir et suivre un tableau de bord d'indicateurs couvrant les dimensions E, S et G." },
  { name: "Suivre les KPI RSE", category: "Gouvernance", subcategory: "Pilotage", esgPillar: "G", odd: "16", level: "project", description: "Mettre en place un suivi régulier des indicateurs RSE et analyser les évolutions." },
  { name: "Réaliser une revue annuelle RSE", category: "Gouvernance", subcategory: "Pilotage", esgPillar: "G", odd: "16", level: "project", description: "Organiser un bilan annuel de la démarche RSE pour évaluer les progrès et réajuster les objectifs." },
  { name: "Cartographier les risques ESG", category: "Gouvernance", subcategory: "Pilotage", esgPillar: "G", odd: "16", level: "project", description: "Identifier et évaluer les risques environnementaux, sociaux et de gouvernance propres à l'activité." },
  // ─── GOUVERNANCE — Communication ─────────────────────────────────────────
  { name: "Publier un rapport RSE", category: "Gouvernance", subcategory: "Communication", esgPillar: "G", odd: "16,17", level: "project", description: "Rédiger et diffuser un rapport RSE annuel à destination des parties prenantes." },
  { name: "Sensibiliser la direction à la RSE", category: "Gouvernance", subcategory: "Communication", esgPillar: "G", odd: "16", level: "quick", description: "Organiser une session de sensibilisation de la direction aux enjeux RSE et à leurs impacts business." },
  { name: "Communiquer les engagements RSE", category: "Gouvernance", subcategory: "Communication", esgPillar: "G", odd: "16,17", level: "project", description: "Partager la politique et les réalisations RSE avec les parties prenantes (site web, réseaux sociaux, clients)." },
  // ─── GOUVERNANCE — Parties prenantes ─────────────────────────────────────
  { name: "Réaliser une analyse des parties prenantes", category: "Gouvernance", subcategory: "Parties prenantes", esgPillar: "G", odd: "16,17", level: "project", description: "Identifier et cartographier les parties prenantes de l'entreprise et analyser leurs attentes." },
  { name: "Réaliser une matrice de matérialité", category: "Gouvernance", subcategory: "Parties prenantes", esgPillar: "G", odd: "16,17", level: "project", description: "Prioriser les enjeux RSE en croisant l'importance pour les parties prenantes et l'impact sur l'entreprise." },
];

async function main() {
  console.log(`Seeding action library (${REFERENTIEL.length} actions)…`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < REFERENTIEL.length; i++) {
    const action = REFERENTIEL[i];
    // Check if already seeded (match on name + category + is_system)
    const existing = await db
      .select({ id: actionLibraryTable.id })
      .from(actionLibraryTable)
      .where(
        and(
          eq(actionLibraryTable.name, action.name),
          eq(actionLibraryTable.category, action.category),
          eq(actionLibraryTable.isSystem, true),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(actionLibraryTable).values({
      name: action.name,
      description: action.description ?? null,
      category: action.category,
      subcategory: action.subcategory ?? null,
      esgPillar: action.esgPillar,
      odd: action.odd ?? null,
      level: action.level,
      isSystem: true,
      isActive: true,
      sortOrder: i,
    });
    inserted++;
  }

  console.log(`✅ Done — ${inserted} inserted, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

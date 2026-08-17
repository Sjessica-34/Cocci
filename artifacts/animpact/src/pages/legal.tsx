import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearch } from "wouter";

const sections = {
  confidentialite: {
    title: "Politique de confidentialité",
    content: (
      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <p className="text-muted-foreground text-sm">Dernière mise à jour : juin 2025</p>
        <h2 className="text-base font-semibold">1. Responsable du traitement</h2>
        <p>Cocci est responsable du traitement des données personnelles collectées via la plateforme.</p>
        <h2 className="text-base font-semibold">2. Données collectées</h2>
        <p>Nous collectons les données suivantes : nom, prénom, adresse e-mail, données relatives à votre organisation (SIREN/SIRET, secteur, effectif), données RSE saisies dans la plateforme.</p>
        <h2 className="text-base font-semibold">3. Finalités</h2>
        <p>Ces données sont utilisées pour fournir et améliorer les services Cocci, gérer votre compte, vous accompagner dans votre démarche RSE et respecter nos obligations légales.</p>
        <h2 className="text-base font-semibold">4. Durée de conservation</h2>
        <p>Vos données sont conservées pendant la durée de votre abonnement, puis archivées pendant 3 ans conformément aux obligations légales, sauf demande de suppression anticipée.</p>
        <h2 className="text-base font-semibold">5. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition. Exercez ces droits depuis la page <strong>Mes paramètres → Confidentialité &amp; données</strong>.</p>
        <h2 className="text-base font-semibold">6. Contact</h2>
        <p>Pour toute question : <a href="mailto:bonjour@a-nim-pact.fr" className="text-primary underline">bonjour@a-nim-pact.fr</a></p>
      </div>
    ),
  },
  cgu: {
    title: "Conditions Générales d'Utilisation",
    content: (
      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <p className="text-muted-foreground text-sm">Dernière mise à jour : juin 2025</p>
        <h2 className="text-base font-semibold">1. Objet</h2>
        <p>Les présentes CGU définissent les conditions d'accès et d'utilisation de la plateforme Cocci, outil de pilotage RSE à destination des TPE et PME.</p>
        <h2 className="text-base font-semibold">2. Accès à la plateforme</h2>
        <p>L'accès à Cocci est réservé aux utilisateurs disposant d'un compte valide et d'un abonnement actif. Toute utilisation de la plateforme implique l'acceptation des présentes CGU.</p>
        <h2 className="text-base font-semibold">3. Obligations de l'utilisateur</h2>
        <p>L'utilisateur s'engage à fournir des informations exactes, à ne pas partager ses identifiants et à utiliser la plateforme conformément à sa destination.</p>
        <h2 className="text-base font-semibold">4. Propriété intellectuelle</h2>
        <p>La plateforme Cocci et son contenu sont protégés par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.</p>
        <h2 className="text-base font-semibold">5. Limitation de responsabilité</h2>
        <p>Cocci s'engage à fournir le service avec diligence mais ne peut être tenu responsable d'interruptions de service, de pertes de données ou de l'inexactitude des données saisies par l'utilisateur.</p>
        <h2 className="text-base font-semibold">6. Modification</h2>
        <p>Cocci se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification substantielle.</p>
      </div>
    ),
  },
  cgv: {
    title: "Conditions Générales de Vente",
    content: (
      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <p className="text-muted-foreground text-sm">Dernière mise à jour : juin 2025</p>
        <h2 className="text-base font-semibold">1. Objet</h2>
        <p>Les présentes CGV régissent les conditions de souscription aux offres d'abonnement Cocci.</p>
        <h2 className="text-base font-semibold">2. Offres et tarifs</h2>
        <p>Les offres disponibles, leurs fonctionnalités et leurs tarifs sont présentés sur le site Cocci. Cocci se réserve le droit de modifier ses tarifs avec un préavis de 30 jours.</p>
        <h2 className="text-base font-semibold">3. Durée et renouvellement</h2>
        <p>Les abonnements sont souscrits pour une durée déterminée et se renouvellent automatiquement sauf résiliation dans les conditions prévues.</p>
        <h2 className="text-base font-semibold">4. Résiliation</h2>
        <p>L'abonnement peut être résilié à tout moment. La résiliation prend effet à la fin de la période en cours. Aucun remboursement n'est effectué pour la période entamée.</p>
        <h2 className="text-base font-semibold">5. Paiement</h2>
        <p>Le paiement est effectué par carte bancaire ou virement. En cas d'impayé, l'accès à la plateforme peut être suspendu.</p>
      </div>
    ),
  },
  mentions: {
    title: "Mentions légales",
    content: (
      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <h2 className="text-base font-semibold">Éditeur</h2>
        <p>
          A-NIM-PACT SAS<br />
          Siège social : Clarensac (30870)<br />
          SIREN : 103 566 824<br />
          Présidente et directrice de la publication : Jessica Sutra
        </p>
        <h2 className="text-base font-semibold">Hébergement</h2>
        <p>La plateforme Cocci est hébergée par</p>
        <h2 className="text-base font-semibold">Propriété intellectuelle</h2>
        <p>L'ensemble des contenus de la plateforme (textes, graphismes, logiciels) est la propriété exclusive de A-NIM-PACT SAS.</p>
        <h2 className="text-base font-semibold">Contact</h2>
        <p><a href="mailto:bonjour@a-nim-pact.fr" className="text-primary underline">bonjour@a-nim-pact.fr</a></p>
      </div>
    ),
  },
  cookies: {
    title: "Politique de cookies",
    content: (
      <div className="prose prose-sm max-w-none text-foreground space-y-4">
        <p className="text-muted-foreground text-sm">Dernière mise à jour : juin 2025</p>
        <h2 className="text-base font-semibold">Cookies utilisés</h2>
        <p>Cocci utilise uniquement des cookies fonctionnels nécessaires au bon fonctionnement de la plateforme :</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Session Clerk</strong> — maintient votre session d'authentification. Durée : session navigateur.</li>
          <li><strong>Préférences d'organisation</strong> — mémorise l'organisation sélectionnée. Durée : localStorage, pas de cookie.</li>
        </ul>
        <h2 className="text-base font-semibold">Cookies tiers</h2>
        <p>Aucun cookie publicitaire ou de tracking tiers n'est déposé sur votre navigateur.</p>
        <h2 className="text-base font-semibold">Paramétrage</h2>
        <p>Les cookies fonctionnels ne peuvent pas être désactivés car ils sont indispensables au fonctionnement de la plateforme. Vous pouvez les supprimer via les paramètres de votre navigateur, ce qui entraînera votre déconnexion.</p>
      </div>
    ),
  },
};

export function LegalPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const section = (params.get("section") ?? "confidentialite") as keyof typeof sections;
  const active = sections[section] ? section : "confidentialite";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents légaux</h1>
          <p className="text-muted-foreground text-sm mt-1">Politique de confidentialité, CGU, CGV et mentions légales de Cocci.</p>
        </div>

        <Tabs defaultValue={active}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="confidentialite">Confidentialité</TabsTrigger>
            <TabsTrigger value="cgu">CGU</TabsTrigger>
            <TabsTrigger value="cgv">CGV</TabsTrigger>
            <TabsTrigger value="mentions">Mentions légales</TabsTrigger>
            <TabsTrigger value="cookies">Cookies</TabsTrigger>
          </TabsList>

          {Object.entries(sections).map(([key, s]) => (
            <TabsContent key={key} value={key} className="mt-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">{s.title}</h2>
                {s.content}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}

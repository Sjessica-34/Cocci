import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail } from "lucide-react";

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mt-2">
      <p className="text-xs font-semibold text-emerald-700 mb-1">Exemple concret</p>
      <p className="text-sm text-emerald-900">{children}</p>
    </div>
  );
}

export function TabDecouvrir() {
  const mailto =
    "mailto:bonjour@a-nim-pact.fr?subject=Demande%20d%27accompagnement%20-%20Biodiversit%C3%A9";

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Guide — Dépendances à la Biodiversité</h2>
        <p className="text-muted-foreground text-sm">
          Comprendre, cartographier et piloter vos dépendances à la biodiversité dans une démarche RSE.
        </p>
      </div>

      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
        <div className="text-amber-900">
          <p className="font-semibold mb-0.5">Cocci est un outil d'aide à la décision</p>
          <p className="text-amber-800">
            Il vous aide à structurer votre cartographie, mais ne remplace pas l'expertise d'un
            professionnel de la biodiversité ni l'analyse terrain de votre activité.
          </p>
        </div>
      </div>

      <Section number="1" title="Qu'est-ce qu'une dépendance à la biodiversité ?">
        <p>
          Une dépendance à la biodiversité désigne tout élément naturel dont votre activité a besoin
          pour fonctionner : eau douce, pollinisateurs, sols fertiles, régulation du climat, air pur…
        </p>
        <p>
          Sans ces ressources ou ces fonctions naturelles, votre activité serait ralentie, perturbée,
          voire impossible.
        </p>
        <ExampleBox>
          Une brasserie dépend de la disponibilité en eau douce pour produire sa bière. Si la nappe
          phréatique locale s'assèche, la production est directement menacée.
        </ExampleBox>
      </Section>

      <Section number="2" title="Quelle différence entre dépendance et impact ?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="font-semibold text-blue-800 text-xs mb-1">Dépendance</p>
            <p className="text-blue-700 text-xs">
              Ce que la nature vous <strong>apporte</strong>. Votre activité <em>reçoit</em> un
              service écosystémique. Ex : la pollinisation permet votre production agricole.
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
            <p className="font-semibold text-orange-800 text-xs mb-1">Impact</p>
            <p className="text-orange-700 text-xs">
              Ce que votre activité <strong>fait subir</strong> à la nature. Votre activité{" "}
              <em>affecte</em> un écosystème. Ex : vos rejets polluent une rivière.
            </p>
          </div>
        </div>
        <p className="mt-2">
          Ce module traite uniquement des <strong>dépendances</strong> — c'est-à-dire ce dont vous
          avez besoin de la nature.
        </p>
      </Section>

      <Section number="3" title="Pourquoi réaliser cette cartographie ?">
        <ul className="list-disc list-inside space-y-1">
          <li>Anticiper les risques liés à la dégradation des écosystèmes</li>
          <li>Identifier les maillons vulnérables de votre chaîne de valeur</li>
          <li>Répondre aux exigences de la CSRD (reporting biodiversité obligatoire)</li>
          <li>Prioriser vos actions de préservation et de résilience</li>
          <li>Communiquer avec vos parties prenantes sur vos enjeux naturels</li>
        </ul>
        <ExampleBox>
          Un fabricant de cosmétiques cartographie ses dépendances et découvre que 70 % de ses
          ingrédients actifs dépendent de la pollinisation. Cette information devient un enjeu RSE
          majeur à intégrer dans son rapport annuel.
        </ExampleBox>
      </Section>

      <Section number="4" title="Que sont les services écosystémiques ?">
        <p>
          Les services écosystémiques sont les bénéfices que les écosystèmes fournissent aux humains
          et aux entreprises, gratuitement. Ils se répartissent en grandes familles :
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {[
            { label: "Approvisionnement", ex: "Eau, bois, nourriture" },
            { label: "Régulation", ex: "Climat, inondations, polluants" },
            { label: "Culturels", ex: "Paysages, tourisme, bien-être" },
            { label: "Support", ex: "Cycles nutriments, sols, photosynthèse" },
            { label: "Pollinisation", ex: "Reproduction des cultures" },
            { label: "Protection", ex: "Ravageurs, maladies" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 border rounded-md p-2">
              <p className="font-semibold text-slate-700 text-xs">{s.label}</p>
              <p className="text-slate-500 text-xs">{s.ex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section number="5" title="Comment utiliser ce module ?">
        <ol className="list-decimal list-inside space-y-1">
          <li>
            <strong>Cartographie des dépendances</strong> — Listez toutes vos dépendances à la
            nature, en précisant leur position dans votre chaîne de valeur (Amont, In situ, Aval)
          </li>
          <li>
            <strong>Cartographie des enjeux</strong> — Utilisez l'IA pour regrouper vos dépendances
            en enjeux cohérents, puis validez et enrichissez les suggestions
          </li>
          <li>
            <strong>Résultats</strong> — Consultez votre tableau de bord et vos cartographies
          </li>
        </ol>
        <p className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
          Vous n'avez pas besoin de tout remplir d'un coup. Commencez par vos dépendances les plus
          évidentes et complétez progressivement.
        </p>
      </Section>

      <Section number="6" title="Comment interpréter les résultats ?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Dépendance élevée (4-5)", color: "bg-red-100 border-red-300 text-red-800", msg: "Risque fort. Votre activité est très exposée si cet écosystème se dégrade." },
            { label: "Dépendance modérée (3)", color: "bg-yellow-100 border-yellow-300 text-yellow-800", msg: "À surveiller. Un plan d'adaptation est recommandé." },
            { label: "Dépendance faible (1-2)", color: "bg-green-100 border-green-300 text-green-800", msg: "Risque limité. Une veille annuelle suffit." },
            { label: "Maîtrise élevée (4-5)", color: "bg-blue-100 border-blue-300 text-blue-800", msg: "Vous disposez de leviers pour agir sur cette dépendance." },
          ].map((item) => (
            <div key={item.label} className={`border rounded-md p-3 ${item.color}`}>
              <p className="font-semibold text-xs mb-1">{item.label}</p>
              <p className="text-xs">{item.msg}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-6">
        <h3 className="font-semibold text-base mb-3">Pour aller plus loin</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="text-2xl">📚</div>
              <p className="font-semibold text-sm">Guide de l'Office Français de la Biodiversité</p>
              <p className="text-xs text-muted-foreground">
                Cette fonctionnalité s'appuie sur les recommandations de l'Office Français de la
                Biodiversité. Vous pouvez consulter gratuitement le guide officiel afin d'approfondir
                votre démarche.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  window.open(
                    "https://www.ofb.gouv.fr/sites/default/files/Medias/Publications/guide-dependances-biodiversite-entreprises.pdf",
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Consulter le guide
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="text-2xl">💬</div>
              <p className="font-semibold text-sm">Besoin d'accompagnement ?</p>
              <p className="text-xs text-muted-foreground">
                Vous souhaitez être accompagné dans l'identification de vos dépendances ou de vos
                enjeux biodiversité ? A-NIM-PACT peut vous accompagner dans votre démarche.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(mailto, "_blank")}
              >
                <Mail className="h-3.5 w-3.5 mr-2" />
                Contacter A-NIM-PACT
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

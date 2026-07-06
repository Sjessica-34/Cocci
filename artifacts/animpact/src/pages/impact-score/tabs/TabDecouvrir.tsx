import { Button } from "@/components/ui/button";
import { ExternalLink, Target, BarChart3, Clock, Building2, Award, TrendingUp, CheckCircle, HelpCircle, Sparkles } from "lucide-react";

const IMPACT_SCORE_URL = "https://www.impactscore.fr/";

export function TabDecouvrir() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-8">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-100 dark:border-violet-900 p-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 mb-4">
          <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Qu'est-ce que l'Impact Score&nbsp;?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
          L'<strong>Impact Score</strong> est un outil d'autoévaluation qui mesure la performance sociale,
          environnementale et de gouvernance d'une entreprise. Il permet à toute organisation de se situer
          sur une échelle de 0 à 100, et d'identifier ses axes d'amélioration prioritaires.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard
          icon={<Target className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/30"
          title="À quoi sert-il ?"
          text="Il donne une vision claire et chiffrée de l'impact global de votre entreprise sur ses parties prenantes — employés, clients, fournisseurs, communauté et environnement."
        />
        <InfoCard
          icon={<HelpCircle className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          title="Pourquoi le réaliser ?"
          text="Pour objectiver votre démarche RSE, identifier vos points forts et les axes à améliorer, et communiquer de manière transparente avec vos parties prenantes."
        />
        <InfoCard
          icon={<Building2 className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-50 dark:bg-orange-950/30"
          title="À qui s'adresse-t-il ?"
          text="À toutes les entreprises, quelle que soit leur taille ou leur secteur d'activité — des TPE aux ETI. Il est particulièrement adapté aux PME souhaitant formaliser leur engagement RSE."
        />
        <InfoCard
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-950/30"
          title="Comment est calculé le score ?"
          text="Le score est calculé à partir d'un questionnaire structuré autour de 5 grandes thématiques : Gouvernance, Social, Environnement, Clients et Fournisseurs."
        />
      </div>

      {/* Benefits */}
      <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <TrendingUp className="h-5 w-5 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Bénéfices pour votre entreprise</h3>
        </div>
        <ul className="space-y-2.5">
          {[
            "Un score RSE objectif et reconnu pour valoriser vos engagements",
            "Un rapport détaillé avec des recommandations concrètes",
            "Un outil de communication crédible auprès de vos clients et partenaires",
            "Un point de comparaison avec les entreprises de votre secteur",
            "Un socle pour structurer et piloter votre démarche RSE dans Cocci",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Time + Cocci integration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4.5 w-4.5 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Durée à prévoir</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le questionnaire se complète en <strong className="text-foreground">30 à 45 minutes</strong> environ.
            Il peut être réalisé en plusieurs sessions et partagé entre collaborateurs.
          </p>
        </div>
        <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4.5 w-4.5 text-violet-600" />
            <h4 className="text-sm font-semibold text-foreground">Pourquoi l'intégrer dans Cocci&nbsp;?</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            En centralisant votre résultat dans Cocci, vous l'intégrez automatiquement à votre
            <strong className="text-foreground"> tableau de bord RSE</strong>, vos exports PDF
            et votre <strong className="text-foreground">Rapport RSE</strong> annuel.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-xs text-muted-foreground">
          Le questionnaire est réalisé directement sur la plateforme officielle
        </p>
        <Button
          asChild
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6"
        >
          <a href={IMPACT_SCORE_URL} target="_blank" rel="noopener noreferrer">
            Accéder à la plateforme Impact Score
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function InfoCard({
  icon, iconBg, title, text,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${iconBg} mb-3`}>
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1.5">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

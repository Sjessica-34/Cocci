import { Users2, HeartHandshake, GraduationCap, Sparkles, Info, ShieldCheck } from "lucide-react";

function IntroCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "amber" | "purple" | "emerald" | "teal" | "rose";
  children: React.ReactNode;
}) {
  const bg: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50/40",
    amber: "border-amber-100 bg-amber-50/40",
    purple: "border-purple-100 bg-purple-50/40",
    emerald: "border-emerald-100 bg-emerald-50/40",
    teal: "border-teal-100 bg-teal-50/40",
    rose: "border-rose-100 bg-rose-50/40",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export function TabGuide() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/5">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">
            Le module Capital Humain vous aide à structurer et suivre vos données sociales RSE.
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ce module regroupe toutes les données relatives à vos effectifs, à votre politique de
            diversité & inclusion et à vos actions de formation & développement. Toutes les
            données sont <strong>facultatives</strong> et rattachées à l'exercice en cours — vous
            pouvez les compléter progressivement, au fil de l'année ou lors de la préparation de
            votre rapport RSE.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IntroCard icon={<Users2 className="h-5 w-5 text-blue-600" />} title="Effectifs" color="blue">
          Renseignez la composition de vos effectifs (types de contrats, ancienneté, turnover,
          absentéisme...). Les taux et indicateurs clés sont calculés automatiquement à partir de
          vos données brutes — vous n'avez jamais à faire de calcul manuel.
        </IntroCard>

        <IntroCard icon={<HeartHandshake className="h-5 w-5 text-rose-600" />} title="Diversité & Inclusion" color="rose">
          Suivez la répartition de vos collaborateurs (genre, handicap, nationalités) ainsi que vos
          politiques internes (égalité professionnelle, référent handicap, charte diversité...).
        </IntroCard>

        <IntroCard icon={<GraduationCap className="h-5 w-5 text-purple-600" />} title="Formation & Développement" color="purple">
          Suivez votre investissement en formation (heures, budget, certifications) ainsi que les
          entretiens annuels/professionnels et les évolutions internes.
        </IntroCard>

        <IntroCard icon={<Sparkles className="h-5 w-5 text-emerald-600" />} title="Synthèse & indicateurs personnalisés" color="emerald">
          Retrouvez tous vos indicateurs clés en un coup d'œil, avec leur évolution par rapport à
          l'exercice précédent. Vous pouvez également créer vos propres indicateurs, calculés
          automatiquement à partir d'une formule composée avec vos données.
        </IntroCard>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Aide contextuelle</strong> — chaque champ dispose d'une info-bulle expliquant sa
          définition et son mode de calcul. Survolez l'icône d'aide à côté de chaque champ pour en
          savoir plus.
        </p>
      </div>
    </div>
  );
}

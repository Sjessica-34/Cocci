import { useListPlanAchievements } from "@workspace/api-client-react";
import type { PlanAchievement } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Calendar, MessageSquare, Link as LinkIcon } from "lucide-react";

interface Props {
  orgId: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  Environnement: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable": "bg-sky-100 text-sky-800 border-sky-200",
  Biodiversité: "bg-lime-100 text-lime-800 border-lime-200",
  Social: "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables": "bg-orange-100 text-orange-800 border-orange-200",
  Gouvernance: "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  Environnement: "🌍",
  "Numérique responsable": "💻",
  Biodiversité: "🌿",
  Social: "👥",
  "Achats responsables": "🤝",
  Gouvernance: "⚖️",
};

function AchievementCard({ item }: { item: PlanAchievement }) {
  const name = (item as any).actionName ?? `Action #${item.id}`;
  const category = (item as any).actionCategory ?? null;
  const subcategory = (item as any).actionSubcategory ?? null;
  const exerciseYear = item.exerciseYear ?? item.exerciseId;
  const exerciseName = `Exercice ${exerciseYear}`;

  return (
    <div className="rounded-lg border bg-card px-4 py-3.5 flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Trophy className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{name}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
          {category && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[category] ?? ""}`}
            >
              {CATEGORY_EMOJI[category]} {subcategory ?? category}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200">
            {exerciseName}
          </Badge>
          {item.completedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(item.completedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
          {item.comment && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              Commentaire
            </span>
          )}
          {item.justificationUrl && (
            <a
              href={item.justificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
            >
              <LinkIcon className="h-2.5 w-2.5" />
              Justificatif
            </a>
          )}
        </div>
        {item.comment && (
          <p className="mt-1.5 text-xs text-muted-foreground italic">"{item.comment}"</p>
        )}
      </div>
    </div>
  );
}

export function TabRealisations({ orgId }: Props) {
  const { data: achievements, isLoading } = useListPlanAchievements(orgId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = achievements ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Trophy className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Aucune réalisation pour le moment</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Les actions cochées dans votre plan apparaîtront ici comme réalisations de votre démarche RSE.
          </p>
        </div>
      </div>
    );
  }

  const byExercise = items.reduce<Record<string, PlanAchievement[]>>((acc, item) => {
    const key = (item as any).exerciseName ?? `Exercice ${item.exerciseId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 py-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{items.length}</span> action
        {items.length !== 1 ? "s" : ""} réalisée{items.length !== 1 ? "s" : ""} sur l'ensemble des exercices.
      </p>
      {Object.entries(byExercise).map(([exerciseName, exerciseItems]) => (
        <div key={exerciseName} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5" />
            {exerciseName} ({exerciseItems.length})
          </h3>
          {exerciseItems.map((item) => (
            <AchievementCard key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

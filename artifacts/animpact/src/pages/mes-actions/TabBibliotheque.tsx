import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useListActionLibrary,
  useListActionPlan,
  useAddActionToPlan,
} from "@workspace/api-client-react";
import { Search, Plus, Check, Zap, Wrench, Anchor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orgId: number;
}

const CATEGORIES = [
  "Environnement",
  "Numérique responsable",
  "Biodiversité",
  "Social",
  "Achats responsables",
  "Gouvernance",
];

const LEVEL_META: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
  quick: { label: "Rapide", icon: Zap, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  project: { label: "Projet", icon: Wrench, color: "text-amber-700", bg: "bg-amber-50 border-amber-200 text-amber-700" },
  engagement: { label: "Engagement", icon: Anchor, color: "text-violet-700", bg: "bg-violet-50 border-violet-200 text-violet-700" },
};

const ESG_COLOR: Record<string, string> = {
  E: "bg-green-100 text-green-800 border-green-200",
  S: "bg-blue-100 text-blue-800 border-blue-200",
  G: "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Environnement": "🌍",
  "Numérique responsable": "💻",
  "Biodiversité": "🌿",
  "Social": "👥",
  "Achats responsables": "🤝",
  "Gouvernance": "⚖️",
};

const CATEGORY_COLOR: Record<string, string> = {
  "Environnement": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable": "bg-sky-100 text-sky-800 border-sky-200",
  "Biodiversité": "bg-lime-100 text-lime-800 border-lime-200",
  "Social": "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables": "bg-orange-100 text-orange-800 border-orange-200",
  "Gouvernance": "bg-purple-100 text-purple-800 border-purple-200",
};

export function TabBibliotheque({ orgId }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());

  const { data: library = [], isLoading: libLoading } = useListActionLibrary(orgId);
  const { data: planItems = [] } = useListActionPlan(orgId);
  const { mutateAsync: addToPlan } = useAddActionToPlan();

  const planLibraryIds = useMemo(
    () => new Set((planItems as any[]).filter((p) => p.libraryActionId).map((p) => p.libraryActionId)),
    [planItems],
  );

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const subs = new Set<string>();
    (library as any[])
      .filter((a) => a.category === selectedCategory && a.subcategory)
      .forEach((a) => subs.add(a.subcategory));
    return Array.from(subs);
  }, [library, selectedCategory]);

  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (library as any[]).filter((action) => {
      if (selectedCategory && action.category !== selectedCategory) return false;
      if (selectedSubcategory && action.subcategory !== selectedSubcategory) return false;
      if (selectedLevel && action.level !== selectedLevel) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !action.name.toLowerCase().includes(q) &&
          !(action.description ?? "").toLowerCase().includes(q) &&
          !(action.subcategory ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [library, selectedCategory, selectedSubcategory, selectedLevel, search]);

  async function handleAdd(action: any) {
    if (addingIds.has(action.id)) return;
    setAddingIds((prev) => new Set(prev).add(action.id));
    try {
      await addToPlan({
        orgId,
        data: { libraryActionId: action.id, source: "library" },
      });
      toast({ title: "Action ajoutée au plan", description: action.name });
    } catch (e: any) {
      if (e?.status === 409) {
        toast({ title: "Déjà dans le plan", variant: "destructive" });
      } else {
        toast({ title: "Erreur", description: "Impossible d'ajouter l'action.", variant: "destructive" });
      }
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  }

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedLevel(null);
    setSearch("");
  }

  const hasFilters = selectedCategory || selectedLevel || search.trim();

  if (libLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              if (selectedCategory === cat) {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
              } else {
                setSelectedCategory(cat);
                setSelectedSubcategory(null);
              }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === cat
                ? CATEGORY_COLOR[cat]
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted",
            )}
          >
            <span>{CATEGORY_EMOJI[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Filtres sous-catégorie */}
      {selectedCategory && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                selectedSubcategory === sub
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Filtres niveau + recherche */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {Object.entries(LEVEL_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSelectedLevel(selectedLevel === key ? null : key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                selectedLevel === key
                  ? meta.bg
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              <meta.icon className="h-3 w-3" />
              {meta.label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Résultats */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} action{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucune action ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((action: any) => {
            const inPlan = planLibraryIds.has(action.id);
            const adding = addingIds.has(action.id);
            const levelMeta = LEVEL_META[action.level];
            const LevelIcon = levelMeta?.icon ?? Zap;
            return (
              <div
                key={action.id}
                className={cn(
                  "rounded-lg border bg-card p-4 flex flex-col gap-3 transition-colors",
                  inPlan && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{action.name}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {action.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={inPlan ? "outline" : "default"}
                    className={cn("shrink-0 h-7 px-2.5 text-xs gap-1", inPlan && "pointer-events-none")}
                    onClick={() => !inPlan && handleAdd(action)}
                    disabled={adding}
                  >
                    {adding ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : inPlan ? (
                      <><Check className="h-3 w-3" /> Dans le plan</>
                    ) : (
                      <><Plus className="h-3 w-3" /> Ajouter</>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[action.category] ?? ""}`}>
                    {CATEGORY_EMOJI[action.category]} {action.subcategory ?? action.category}
                  </Badge>
                  {levelMeta && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${levelMeta.bg} flex items-center gap-0.5`}>
                      <LevelIcon className="h-2.5 w-2.5" />
                      {levelMeta.label}
                    </Badge>
                  )}
                  {action.esgPillar && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ESG_COLOR[action.esgPillar] ?? ""}`}>
                      {action.esgPillar}
                    </Badge>
                  )}
                  {action.odd && (
                    <span className="text-[10px] text-muted-foreground">
                      ODD {action.odd}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

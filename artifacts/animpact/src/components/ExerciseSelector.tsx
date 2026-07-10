import { useEffect, useState } from "react";
import {
  useListExercises,
  useAdvanceExercise,
  useGetOrganization,
  getGetOrganizationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, ChevronsUpDown, Sparkles, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { cn } from "@/lib/utils";

export function ExerciseSelector({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: exercises } = useListExercises(orgId);
  const { data: org } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
  });
  const { currentExerciseId, setCurrentExercise } = useCurrentExercise();
  const [allOpen, setAllOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const advanceMutation = useAdvanceExercise();

  const current = exercises?.find((e) => e.id === currentExerciseId) ?? null;
  const recentExercises = exercises?.slice(0, 3) ?? [];
  const hasMoreExercises = (exercises?.length ?? 0) > recentExercises.length;

  const currentMonth = new Date().getMonth() + 1;
  const openingMonth = org?.exerciseOpeningMonth ?? 12;
  const canAdvance = !!current && current.status === "active" && currentMonth >= openingMonth;

  // Default to the most recent exercise when none is selected yet (or the
  // stored one no longer belongs to this organization).
  useEffect(() => {
    if (!exercises || exercises.length === 0) return;
    if (!exercises.some((e) => e.id === currentExerciseId)) {
      setCurrentExercise(exercises[0].id);
    }
  }, [exercises, currentExerciseId, setCurrentExercise]);

  function switchExercise(id: number) {
    if (id === currentExerciseId) return;
    setCurrentExercise(id);
    // Exercise id isn't part of any generated query key, so we invalidate
    // everything to force every module to refetch under the new scope.
    qc.invalidateQueries();
  }

  function handleAdvance() {
    advanceMutation.mutate(
      { orgId },
      {
        onSuccess: (created) => {
          qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "exercises"] });
          qc.invalidateQueries();
          setCurrentExercise(created.id);
          setConfirmOpen(false);
          toast({ title: `Exercice ${created.year} créé et activé` });
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : "Impossible de clôturer l'exercice et de créer le suivant";
          toast({ title: message, variant: "destructive" });
        },
      },
    );
  }

  if (!exercises) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 h-9 hover:bg-sidebar-accent/60 text-sidebar-foreground"
          >
            <CalendarRange className="h-4 w-4 mr-2 text-sidebar-foreground/60 shrink-0" />
            <span className="text-sm font-medium truncate flex-1 text-left">
              {current ? `Exercice ${current.year}` : "Exercice"}
            </span>
            {current && (
              <Badge
                variant={current.status === "active" ? "default" : "secondary"}
                className="mr-1.5 text-[10px] px-1.5 py-0 h-4"
              >
                {current.status === "active" ? "En cours" : "Clôturé"}
              </Badge>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Changer d'exercice</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {recentExercises.map((ex) => (
            <DropdownMenuItem
              key={ex.id}
              className={cn("cursor-pointer justify-between", ex.id === currentExerciseId && "bg-accent")}
              onClick={() => switchExercise(ex.id)}
            >
              <span>Exercice {ex.year}</span>
              <Badge
                variant={ex.status === "active" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {ex.status === "active" ? "En cours" : "Clôturé"}
              </Badge>
            </DropdownMenuItem>
          ))}
          {hasMoreExercises && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => setAllOpen(true)}>
              <ListFilter className="h-4 w-4 mr-2" />
              Voir tous les exercices…
            </DropdownMenuItem>
          )}
          {canAdvance && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => setConfirmOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Clôturer et créer l'exercice suivant
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer l'exercice {current?.year} et créer {current ? current.year + 1 : ""} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'exercice {current?.year} sera clôturé, et un nouvel exercice {current ? current.year + 1 : ""} sera
              créé avec l'ensemble des données de {current?.year} (fournisseurs, diagnostics, documents…) afin de
              vous permettre de démarrer directement dessus. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={advanceMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={advanceMutation.isPending}>
              {advanceMutation.isPending ? "Clôture en cours…" : "Clôturer et créer l'exercice suivant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tous les exercices</DialogTitle>
            <DialogDescription>Sélectionnez l'exercice sur lequel vous souhaitez travailler.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-1 pr-3">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent",
                    ex.id === currentExerciseId && "bg-accent",
                  )}
                  onClick={() => {
                    switchExercise(ex.id);
                    setAllOpen(false);
                  }}
                >
                  <span>Exercice {ex.year}</span>
                  <Badge
                    variant={ex.status === "active" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {ex.status === "active" ? "En cours" : "Clôturé"}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

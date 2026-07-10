import { useEffect, useState } from "react";
import {
  useListExercises,
  useCreateExercise,
  useUpdateExerciseStatus,
  useDeleteExercise,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  ChevronsUpDown,
  Plus,
  Lock,
  LockOpen,
  Trash2,
  ListFilter,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { cn } from "@/lib/utils";

export function ExerciseSelector({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: exercises } = useListExercises(orgId);
  const { currentExerciseId, setCurrentExercise } = useCurrentExercise();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [duplicate, setDuplicate] = useState(true);

  const createMutation = useCreateExercise();
  const updateStatusMutation = useUpdateExerciseStatus();
  const deleteMutation = useDeleteExercise();

  const current = exercises?.find((e) => e.id === currentExerciseId) ?? null;
  const recentExercises = exercises?.slice(0, 3) ?? [];
  const hasMoreExercises = (exercises?.length ?? 0) > recentExercises.length;

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

  function openCreateDialog() {
    setYear((current?.year ?? new Date().getFullYear()) + 1);
    setDuplicate(true);
    setCreateOpen(true);
  }

  function handleCreate() {
    createMutation.mutate(
      { orgId, data: { year, duplicatePreviousData: duplicate } },
      {
        onSuccess: (created) => {
          qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "exercises"] });
          qc.invalidateQueries();
          setCurrentExercise(created.id);
          setCreateOpen(false);
          toast({ title: `Exercice ${created.year} créé` });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Erreur lors de la création de l'exercice";
          toast({ title: message, variant: "destructive" });
        },
      },
    );
  }

  function handleToggleStatus() {
    if (!current) return;
    const nextStatus = current.status === "active" ? "closed" : "active";
    updateStatusMutation.mutate(
      { orgId, id: current.id, data: { status: nextStatus } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "exercises"] });
          toast({
            title: nextStatus === "closed" ? "Exercice clôturé" : "Exercice réouvert",
          });
        },
        onError: () => {
          toast({ title: "Impossible de modifier le statut de l'exercice", variant: "destructive" });
        },
      },
    );
  }

  function handleDelete() {
    if (!current) return;
    deleteMutation.mutate(
      { orgId, id: current.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/organizations", orgId, "exercises"] });
          setDeleteOpen(false);
          const remaining = exercises?.filter((e) => e.id !== current.id) ?? [];
          if (remaining.length > 0) setCurrentExercise(remaining[0].id);
          toast({ title: `Exercice ${current.year} supprimé` });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Impossible de supprimer cet exercice";
          setDeleteOpen(false);
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
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            ➕ Créer un exercice
          </DropdownMenuItem>
          {current && (
            <DropdownMenuItem className="cursor-pointer" onClick={handleToggleStatus}>
              {current.status === "active" ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Clôturer l'exercice
                </>
              ) : (
                <>
                  <LockOpen className="h-4 w-4 mr-2" />
                  Réouvrir l'exercice
                </>
              )}
            </DropdownMenuItem>
          )}
          {current && current.status === "active" && exercises.length > 1 && (
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer l'exercice
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel exercice</DialogTitle>
            <DialogDescription>
              Créez un nouvel exercice annuel. Vous pouvez reprendre les données de l'exercice précédent pour
              gagner du temps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="exercise-year">Année</Label>
              <Input
                id="exercise-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="exercise-duplicate"
                checked={duplicate}
                onCheckedChange={(checked) => setDuplicate(checked === true)}
              />
              <Label htmlFor="exercise-duplicate" className="font-normal cursor-pointer">
                Reprendre les données de l'exercice précédent
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'exercice {current?.year} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement toutes les données rattachées à cet exercice. Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
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

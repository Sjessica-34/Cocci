import { AppLayout } from "@/components/layout";

function ModuleStub({ title }: { title: string }) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center select-none">
        <p className="text-base font-medium text-foreground/40">{title}</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Module en cours de développement.</p>
      </div>
    </AppLayout>
  );
}

export function Biodiversite() { return <ModuleStub title="Mes dépendances à la biodiversité" />; }
export function AchatsResponsables() { return <ModuleStub title="Mes achats responsables" />; }

export function NumeriqueResponsable() { return <ModuleStub title="Ma démarche Numérique Responsable" />; }
export function ImpactScore() { return <ModuleStub title="Mon Impact Score" />; }

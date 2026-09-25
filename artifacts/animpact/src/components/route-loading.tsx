import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingFallback({
  message = "Chargement…",
}: {
  message?: string;
}) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[100dvh] items-center justify-center bg-background px-6"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </main>
  );
}

export function WorkspaceRouteLoadingFallback() {
  return (
    <AppLayout>
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="space-y-6"
      >
        <span className="sr-only">Chargement de votre espace…</span>
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
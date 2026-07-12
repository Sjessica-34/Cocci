import { AppLayout } from "@/components/layout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { AlertCircle, FileBarChart2 } from "lucide-react";

export function RapportRse() {
  const { currentOrgId } = useCurrentOrganization();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl pb-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-primary" />
            Mon rapport RSE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralisez ici tous vos rapports RSE, bilans de progrès et documents de communication externe.
          </p>
        </div>

        {!currentOrgId ? (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-1">Documents du rapport RSE</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Rapports annuels, bilans de progrès, déclarations de performance extra-financière (DPEF), synthèses RSE…
            </p>
            <DocumentUploader
              orgId={currentOrgId}
              category="rapport-rse"
              question="Ajoutez vos rapports RSE et bilans de progrès"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

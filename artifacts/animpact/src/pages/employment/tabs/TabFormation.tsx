import { useEffect, useState } from "react";
import {
  useGetEmploymentTraining,
  useUpsertEmploymentTraining,
  useGetEmploymentWorkforce,
  getGetEmploymentWorkforceQueryKey,
  getGetEmploymentTrainingQueryKey,
  getGetEmploymentResultsQueryKey,
  getGetOrganizationQueryKey,
  useGetOrganization,
  type EmploymentTrainingInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberField } from "@/components/employment/NumberField";
import { ConsistencyAlert } from "@/components/employment/ConsistencyAlert";
import { checkNotExceeding } from "../utils/consistency";
import { Save, Check } from "lucide-react";
import { CustomKpiSection } from "@/pages/employment/components/CustomKpiSection";

interface Props {
  orgId: number;
  readOnly: boolean;
}

type FormState = EmploymentTrainingInput;

export function TabFormation({ orgId, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data, isLoading } = useGetEmploymentTraining(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentTrainingQueryKey(orgId) },
  });
  const { data: workforceData } = useGetEmploymentWorkforce(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentWorkforceQueryKey(orgId) },
  });
  const { data: organization } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
  });
  const totalHeadcount = organization?.employeeCount ?? workforceData?.data?.totalHeadcount;

  useEffect(() => {
    if (data?.data) {
      const { id, organizationId, exerciseId, updatedAt, ...rest } = data.data;
      setForm(rest);
      setSavedAt(updatedAt);
    } else if (data && !data.data) {
      setForm({});
      setSavedAt(null);
    }
  }, [data]);

  const { mutate: save, isPending: saving } = useUpsertEmploymentTraining({
    mutation: {
      onSuccess: (saved) => {
        setSavedAt(saved.updatedAt);
        queryClient.invalidateQueries({ queryKey: getGetEmploymentTrainingQueryKey(orgId) });
        queryClient.invalidateQueries({ queryKey: getGetEmploymentResultsQueryKey(orgId) });
      },
    },
  });

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const warnings = [
    checkNotExceeding({
      sum: form.nbCollaborateursFormes ?? null,
      total: totalHeadcount,
      label: "Le nombre de collaborateurs formés",
    }),
    checkNotExceeding({
      sum: form.nbEntretiensAnnuels ?? null,
      total: totalHeadcount,
      label: "Le nombre d'entretiens annuels réalisés",
    }),
    checkNotExceeding({
      sum: form.nbEntretiensProfessionnels ?? null,
      total: totalHeadcount,
      label: "Le nombre d'entretiens professionnels réalisés",
    }),
    checkNotExceeding({
      sum: form.nbEvolutionsInternes ?? null,
      total: totalHeadcount,
      label: "Le nombre d'évolutions internes",
    }),
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsistencyAlert warnings={warnings} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField id="nbHeuresFormation" label="Nombre d'heures de formation" help="Total des heures de formation dispensées sur l'exercice, tous collaborateurs confondus." value={form.nbHeuresFormation} onChange={(v) => set("nbHeuresFormation", v)} unit="h" step="0.5" disabled={readOnly} />
          <NumberField id="budgetFormation" label="Budget formation" help="Budget total consacré à la formation professionnelle sur l'exercice." value={form.budgetFormation} onChange={(v) => set("budgetFormation", v)} unit="€" disabled={readOnly} />
          <NumberField id="nbCollaborateursFormes" label="Collaborateurs formés" help="Nombre de collaborateurs ayant suivi au moins une formation sur l'exercice." value={form.nbCollaborateursFormes} onChange={(v) => set("nbCollaborateursFormes", v)} disabled={readOnly} />
          <NumberField id="nbCertifications" label="Certifications obtenues" help="Nombre de certifications, diplômes ou qualifications obtenus par des collaborateurs sur l'exercice." value={form.nbCertifications} onChange={(v) => set("nbCertifications", v)} disabled={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entretiens & évolution</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField id="nbEntretiensAnnuels" label="Entretiens annuels réalisés" help="Nombre d'entretiens annuels d'évaluation réalisés sur l'exercice." value={form.nbEntretiensAnnuels} onChange={(v) => set("nbEntretiensAnnuels", v)} disabled={readOnly} />
          <NumberField id="nbEntretiensProfessionnels" label="Entretiens professionnels réalisés" help="Nombre d'entretiens professionnels (obligatoires tous les 2 ans) réalisés sur l'exercice." value={form.nbEntretiensProfessionnels} onChange={(v) => set("nbEntretiensProfessionnels", v)} disabled={readOnly} />
          <NumberField id="nbEvolutionsInternes" label="Évolutions internes" help="Nombre de collaborateurs ayant bénéficié d'une promotion ou d'une mobilité interne sur l'exercice." value={form.nbEvolutionsInternes} onChange={(v) => set("nbEvolutionsInternes", v)} disabled={readOnly} />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={() => save({ orgId, data: form })} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {savedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Enregistré le {new Date(savedAt).toLocaleString("fr-FR")}
            </span>
          )}
        </div>
      )}

      <CustomKpiSection orgId={orgId} category="formation" readOnly={readOnly} title="Indicateurs personnalisés — Formation & Développement" />
    </div>
  );
}

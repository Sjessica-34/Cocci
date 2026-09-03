import { useEffect, useState } from "react";
import {
  useGetEmploymentDiversity,
  useUpsertEmploymentDiversity,
  useGetEmploymentWorkforce,
  getGetEmploymentWorkforceQueryKey,
  getGetEmploymentDiversityQueryKey,
  getGetEmploymentResultsQueryKey,
  getGetOrganizationQueryKey,
  useGetOrganization,
  type EmploymentDiversityInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberField } from "@/components/employment/NumberField";
import { BooleanField } from "@/components/employment/BooleanField";
import { ConsistencyAlert } from "@/components/employment/ConsistencyAlert";
import { checkNotExceeding, sumFields } from "../utils/consistency";
import { Save, Check } from "lucide-react";
import { CustomKpiSection } from "@/pages/employment/components/CustomKpiSection";

interface Props {
  orgId: number;
  readOnly: boolean;
}

type FormState = EmploymentDiversityInput;

export function TabDiversite({ orgId, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data, isLoading } = useGetEmploymentDiversity(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentDiversityQueryKey(orgId) },
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

  const { mutate: save, isPending: saving } = useUpsertEmploymentDiversity({
    mutation: {
      onSuccess: (saved) => {
        setSavedAt(saved.updatedAt);
        queryClient.invalidateQueries({ queryKey: getGetEmploymentDiversityQueryKey(orgId) });
        queryClient.invalidateQueries({ queryKey: getGetEmploymentResultsQueryKey(orgId) });
      },
    },
  });

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const warnings = [
    checkNotExceeding({
      sum: sumFields([form.nbHommes, form.nbFemmes, form.nbNonBinaire, form.nbAutreGenre, form.nbPrefereNePasRepondreGenre]),
      total: totalHeadcount,
      label: "La somme de la répartition par genre",
    }),
    checkNotExceeding({
      sum: form.nbHandicap ?? null,
      total: totalHeadcount,
      label: "Le nombre de collaborateurs en situation de handicap",
    }),
    checkNotExceeding({
      sum: sumFields([form.nbNationaliteFrancaise, form.nbNationaliteUe, form.nbNationaliteHorsUe, form.nbDoubleNationalite, form.nbPrefereNePasRepondreNationalite]),
      total: totalHeadcount,
      label: "La somme de la répartition par nationalité",
    }),
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsistencyAlert warnings={warnings} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition par genre</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField id="nbHommes" label="Nombre d'hommes" help="Collaborateurs s'identifiant comme hommes." value={form.nbHommes} onChange={(v) => set("nbHommes", v)} disabled={readOnly} />
          <NumberField id="nbFemmes" label="Nombre de femmes" help="Collaboratrices s'identifiant comme femmes." value={form.nbFemmes} onChange={(v) => set("nbFemmes", v)} disabled={readOnly} />
          <NumberField id="nbNonBinaire" label="Nombre de non-binaires" help="Collaborateurs s'identifiant comme non-binaires." value={form.nbNonBinaire} onChange={(v) => set("nbNonBinaire", v)} disabled={readOnly} />
          <NumberField id="nbAutreGenre" label="Autre" help="Collaborateurs s'identifiant avec une autre identité de genre." value={form.nbAutreGenre} onChange={(v) => set("nbAutreGenre", v)} disabled={readOnly} />
          <NumberField id="nbPrefereNePasRepondreGenre" label="Préfère ne pas répondre" help="Collaborateurs n'ayant pas souhaité communiquer leur genre." value={form.nbPrefereNePasRepondreGenre} onChange={(v) => set("nbPrefereNePasRepondreGenre", v)} disabled={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Handicap</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField id="nbHandicap" label="Collaborateurs en situation de handicap" help="Nombre de collaborateurs bénéficiaires de l'obligation d'emploi (RQTH ou équivalent), déclarés volontairement." value={form.nbHandicap} onChange={(v) => set("nbHandicap", v)} disabled={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nationalités</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField id="nbNationaliteFrancaise" label="Nationalité française" help="Collaborateurs de nationalité française." value={form.nbNationaliteFrancaise} onChange={(v) => set("nbNationaliteFrancaise", v)} disabled={readOnly} />
          <NumberField id="nbNationaliteUe" label="Nationalité UE (hors France)" help="Collaborateurs ressortissants d'un autre État membre de l'Union Européenne." value={form.nbNationaliteUe} onChange={(v) => set("nbNationaliteUe", v)} disabled={readOnly} />
          <NumberField id="nbNationaliteHorsUe" label="Nationalité hors UE" help="Collaborateurs ressortissants d'un pays hors Union Européenne." value={form.nbNationaliteHorsUe} onChange={(v) => set("nbNationaliteHorsUe", v)} disabled={readOnly} />
          <NumberField id="nbDoubleNationalite" label="Double nationalité" help="Collaborateurs possédant une double nationalité." value={form.nbDoubleNationalite} onChange={(v) => set("nbDoubleNationalite", v)} disabled={readOnly} />
          <NumberField id="nbPrefereNePasRepondreNationalite" label="Préfère ne pas répondre" help="Collaborateurs n'ayant pas souhaité communiquer leur nationalité." value={form.nbPrefereNePasRepondreNationalite} onChange={(v) => set("nbPrefereNePasRepondreNationalite", v)} disabled={readOnly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Index & politiques internes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            L'indice de parité Femmes-Hommes est calculé automatiquement à partir de la répartition par genre ci-dessus et affiché dans l'onglet Synthèse.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pt-2">
            <BooleanField id="politiqueDiversite" label="Politique diversité formalisée" help="L'entreprise dispose d'une politique diversité écrite et diffusée en interne." value={form.politiqueDiversite} onChange={(v) => set("politiqueDiversite", v)} disabled={readOnly} />
            <BooleanField id="referentHandicap" label="Référent handicap désigné" help="Un référent handicap a été formellement désigné (obligatoire à partir de 250 salariés)." value={form.referentHandicap} onChange={(v) => set("referentHandicap", v)} disabled={readOnly} />
            <BooleanField id="sensibilisationDiversite" label="Actions de sensibilisation à la diversité" help="Des actions de sensibilisation (formations, ateliers, communications) ont été menées sur l'exercice." value={form.sensibilisationDiversite} onChange={(v) => set("sensibilisationDiversite", v)} disabled={readOnly} />
            <BooleanField id="politiqueContreDiscriminations" label="Politique de lutte contre les discriminations" help="L'entreprise dispose d'une politique ou d'une charte de lutte contre les discriminations." value={form.politiqueContreDiscriminations} onChange={(v) => set("politiqueContreDiscriminations", v)} disabled={readOnly} />
            <BooleanField id="politiqueEgaliteProfessionnelle" label="Accord ou plan d'action égalité professionnelle" help="Un accord collectif ou un plan d'action sur l'égalité professionnelle F/H est en vigueur." value={form.politiqueEgaliteProfessionnelle} onChange={(v) => set("politiqueEgaliteProfessionnelle", v)} disabled={readOnly} />
            <BooleanField id="teletravailAutorise" label="Télétravail autorisé" help="Le télétravail est proposé aux collaborateurs éligibles." value={form.teletravailAutorise} onChange={(v) => set("teletravailAutorise", v)} disabled={readOnly} />
            <BooleanField id="charteDiversite" label="Signataire de la Charte de la diversité" help="L'entreprise a signé la Charte de la diversité en entreprise." value={form.charteDiversite} onChange={(v) => set("charteDiversite", v)} disabled={readOnly} />
          </div>
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

      <CustomKpiSection orgId={orgId} category="diversite" readOnly={readOnly} title="Indicateurs personnalisés — Diversité & Inclusion" />
    </div>
  );
}

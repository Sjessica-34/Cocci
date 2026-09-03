import { useEffect, useState } from "react";
import {
  useGetEmploymentWorkforce,
  useUpsertEmploymentWorkforce,
  getGetEmploymentWorkforceQueryKey,
  getGetEmploymentResultsQueryKey,
  getGetOrganizationQueryKey,
  useGetOrganization,
  type EmploymentWorkforceInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberField } from "@/components/employment/NumberField";
import { ConsistencyAlert } from "@/components/employment/ConsistencyAlert";
import { checkNotExceeding, sumFields } from "../utils/consistency";
import { Save, Check, AlertTriangle, CheckCircle2 } from "lucide-react";

/** Affiche la somme des tranches vs l'effectif total avec un indicateur coloré. */
function BracketControl({ sum, total, label }: { sum: number | null; total: number | null | undefined; label: string }) {
  if (sum == null && total == null) return null;

  const hasTotal = total != null;
  const hasSum = sum != null;

  if (!hasSum && !hasTotal) return null;

  const isExact = hasTotal && hasSum && sum === total;
  const isOver  = hasTotal && hasSum && sum > total;
  const isUnder = hasTotal && hasSum && sum < total;

  return (
    <div className={`flex items-center gap-1.5 text-xs mt-1 ${
      isExact ? "text-emerald-700" :
      isOver  ? "text-red-600" :
      isUnder ? "text-amber-600" :
      "text-muted-foreground"
    }`}>
      {isExact && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
      {isOver  && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {isUnder && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span>
        {label} :{" "}
        <strong>{hasSum ? sum : "—"}</strong>
        {hasTotal && (
          <>
            {" "}/ {total}
            {isExact && " — correspond à l'effectif total ✓"}
            {isOver  && ` — dépasse l'effectif total de ${sum - total}`}
            {isUnder && ` — il manque ${total - sum!} collaborateur${total - sum! > 1 ? "s" : ""}`}
          </>
        )}
      </span>
    </div>
  );
}

interface Props {
  orgId: number;
  readOnly: boolean;
}

type FormState = EmploymentWorkforceInput;

function emptyForm(): FormState {
  return {};
}

export function TabEffectifs({ orgId, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data, isLoading } = useGetEmploymentWorkforce(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentWorkforceQueryKey(orgId) },
  });
  const { data: organization, isLoading: organizationLoading } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
  });

  useEffect(() => {
    if (data?.data) {
      const { id, organizationId, exerciseId, updatedAt, ...rest } = data.data;
      setForm(rest as FormState);
      setSavedAt(updatedAt);
    } else if (data && !data.data) {
      setForm(emptyForm());
      setSavedAt(null);
    }
  }, [data]);

  const { mutate: save, isPending: saving } = useUpsertEmploymentWorkforce({
    mutation: {
      onSuccess: (saved) => {
        setSavedAt(saved.updatedAt);
        queryClient.invalidateQueries({ queryKey: getGetEmploymentWorkforceQueryKey(orgId) });
        queryClient.invalidateQueries({ queryKey: getGetEmploymentResultsQueryKey(orgId) });
      },
    },
  });

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  // employeeCount est l'effectif de référence de l'organisation. La valeur
  // de l'exercice reste un secours pour les organisations historiques qui
  // n'ont pas encore renseigné leur effectif déclaré.
  const declaredEmployeeCount = organization?.employeeCount ?? null;
  const total = declaredEmployeeCount ?? form.totalHeadcount;
  const formToSave = declaredEmployeeCount !== null
    ? { ...form, totalHeadcount: declaredEmployeeCount }
    : form;
  const ageSum = sumFields([form.ageUnder25, form.age25to34, form.age35to44, form.age45to54, form.age55plus]);
  const senioritySum = sumFields([form.seniorityUnder2, form.seniority2to5, form.seniority5to10, form.seniorityOver10]);

  const warnings = [
    checkNotExceeding({
      sum: sumFields([form.nbCdi, form.nbCdd, form.nbAlternants, form.nbApprentis, form.nbInterimaires]),
      total,
      label: "La somme des types de contrats (CDI, CDD, alternants, apprentis, intérimaires)",
    }),
    checkNotExceeding({
      sum: sumFields([form.nbTempsPlein, form.nbTempsPartiel]),
      total,
      label: "La somme des temps pleins et temps partiels",
    }),
    checkNotExceeding({ sum: ageSum, total, label: "La somme des tranches d'âge" }),
    checkNotExceeding({ sum: senioritySum, total, label: "La somme des tranches d'ancienneté" }),
  ];

  if (isLoading || organizationLoading) {
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
          <CardTitle className="text-base">Effectifs & typologie de contrats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField
            id="totalHeadcount"
            label="Effectif total"
            help="Effectif déclaré de l'organisation, utilisé comme référence pour les contrôles de cohérence."
            value={total}
            onChange={(v) => set("totalHeadcount", v)}
            disabled={readOnly || declaredEmployeeCount !== null}
          />
          <NumberField
            id="nbCdi"
            label="Nombre de CDI"
            help="Collaborateurs en Contrat à Durée Indéterminée."
            value={form.nbCdi}
            onChange={(v) => set("nbCdi", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbCdd"
            label="Nombre de CDD"
            help="Collaborateurs en Contrat à Durée Déterminée."
            value={form.nbCdd}
            onChange={(v) => set("nbCdd", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbAlternants"
            label="Nombre d'alternants"
            help="Collaborateurs en contrat d'alternance (professionnalisation ou apprentissage confondus, hors ligne dédiée apprentis ci-dessous si vous distinguez les deux)."
            value={form.nbAlternants}
            onChange={(v) => set("nbAlternants", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbApprentis"
            label="Nombre d'apprentis"
            help="Collaborateurs en contrat d'apprentissage, si vous souhaitez les distinguer des autres alternants."
            value={form.nbApprentis}
            onChange={(v) => set("nbApprentis", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbStagiaires"
            label="Nombre de stagiaires"
            help="Stagiaires accueillis sur l'exercice (conventions de stage)."
            value={form.nbStagiaires}
            onChange={(v) => set("nbStagiaires", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbInterimaires"
            label="Nombre d'intérimaires"
            help="Collaborateurs en mission d'intérim (contrat porté par une agence)."
            value={form.nbInterimaires}
            onChange={(v) => set("nbInterimaires", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbTempsPlein"
            label="Nombre de temps pleins"
            help="Collaborateurs employés à temps plein."
            value={form.nbTempsPlein}
            onChange={(v) => set("nbTempsPlein", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbTempsPartiel"
            label="Nombre de temps partiels"
            help="Collaborateurs employés à temps partiel."
            value={form.nbTempsPartiel}
            onChange={(v) => set("nbTempsPartiel", v)}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mouvements de personnel</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField
            id="nbRecrutements"
            label="Nombre de recrutements"
            help="Nombre total d'embauches réalisées sur l'exercice, tous types de contrats confondus."
            value={form.nbRecrutements}
            onChange={(v) => set("nbRecrutements", v)}
            disabled={readOnly}
          />
          <NumberField
            id="nbDeparts"
            label="Nombre de départs"
            help="Nombre total de départs (démissions, licenciements, fins de contrat, ruptures conventionnelles...) sur l'exercice."
            value={form.nbDeparts}
            onChange={(v) => set("nbDeparts", v)}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pyramide des âges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField id="avgAge" label="Âge moyen" help="Âge moyen de l'ensemble des collaborateurs, en années." value={form.avgAge} onChange={(v) => set("avgAge", v)} unit="ans" step="0.1" disabled={readOnly} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Répartition par tranches d'âge (facultatif, en complément de l'âge moyen)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField id="ageUnder25" label="Moins de 25 ans" help="Nombre de collaborateurs âgés de moins de 25 ans." value={form.ageUnder25} onChange={(v) => set("ageUnder25", v)} disabled={readOnly} />
              <NumberField id="age25to34" label="25 à 34 ans" help="Nombre de collaborateurs âgés de 25 à 34 ans." value={form.age25to34} onChange={(v) => set("age25to34", v)} disabled={readOnly} />
              <NumberField id="age35to44" label="35 à 44 ans" help="Nombre de collaborateurs âgés de 35 à 44 ans." value={form.age35to44} onChange={(v) => set("age35to44", v)} disabled={readOnly} />
              <NumberField id="age45to54" label="45 à 54 ans" help="Nombre de collaborateurs âgés de 45 à 54 ans." value={form.age45to54} onChange={(v) => set("age45to54", v)} disabled={readOnly} />
              <NumberField id="age55plus" label="55 ans et plus" help="Nombre de collaborateurs âgés de 55 ans et plus." value={form.age55plus} onChange={(v) => set("age55plus", v)} disabled={readOnly} />
            </div>
            <BracketControl sum={ageSum} total={total} label="Somme des tranches d'âge" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ancienneté</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField id="avgSeniority" label="Ancienneté moyenne" help="Ancienneté moyenne de l'ensemble des collaborateurs, en années." value={form.avgSeniority} onChange={(v) => set("avgSeniority", v)} unit="ans" step="0.1" disabled={readOnly} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Répartition par tranches d'ancienneté (facultatif, en complément de l'ancienneté moyenne)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField id="seniorityUnder2" label="Moins de 2 ans" help="Nombre de collaborateurs ayant moins de 2 ans d'ancienneté." value={form.seniorityUnder2} onChange={(v) => set("seniorityUnder2", v)} disabled={readOnly} />
              <NumberField id="seniority2to5" label="2 à 5 ans" help="Nombre de collaborateurs ayant entre 2 et 5 ans d'ancienneté." value={form.seniority2to5} onChange={(v) => set("seniority2to5", v)} disabled={readOnly} />
              <NumberField id="seniority5to10" label="5 à 10 ans" help="Nombre de collaborateurs ayant entre 5 et 10 ans d'ancienneté." value={form.seniority5to10} onChange={(v) => set("seniority5to10", v)} disabled={readOnly} />
              <NumberField id="seniorityOver10" label="Plus de 10 ans" help="Nombre de collaborateurs ayant plus de 10 ans d'ancienneté." value={form.seniorityOver10} onChange={(v) => set("seniorityOver10", v)} disabled={readOnly} />
            </div>
            <BracketControl sum={senioritySum} total={total} label="Somme des tranches d'ancienneté" />
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={() => save({ orgId, data: formToSave })} disabled={saving}>
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
    </div>
  );
}

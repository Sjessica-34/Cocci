import { useEffect, useState } from "react";
import {
  useGetEmploymentWorkforce,
  useUpsertEmploymentWorkforce,
  getGetEmploymentWorkforceQueryKey,
  getGetEmploymentResultsQueryKey,
  type EmploymentWorkforceInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberField } from "@/components/employment/NumberField";
import { Save, Check } from "lucide-react";

interface Props {
  orgId: number;
  readOnly: boolean;
}

type FormState = EmploymentWorkforceInput;

function emptyForm(): FormState {
  return { ageMode: "precise", seniorityMode: "precise" };
}

export function TabEffectifs({ orgId, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data, isLoading } = useGetEmploymentWorkforce(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentWorkforceQueryKey(orgId) },
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
        queryClient.invalidateQueries({ queryKey: getGetEmploymentResultsQueryKey(orgId) });
      },
    },
  });

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Effectifs & typologie de contrats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField
            id="totalHeadcount"
            label="Effectif total"
            help="Nombre total de collaborateurs présents dans l'entreprise à la clôture de l'exercice, tous types de contrats confondus."
            value={form.totalHeadcount}
            onChange={(v) => set("totalHeadcount", v)}
            disabled={readOnly}
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
          <RadioGroup
            value={form.ageMode ?? "precise"}
            onValueChange={(v) => set("ageMode", v as FormState["ageMode"])}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="precise" id="ageModePrecise" disabled={readOnly} />
              <Label htmlFor="ageModePrecise" className="text-sm font-normal">Âge moyen</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="brackets" id="ageModeBrackets" disabled={readOnly} />
              <Label htmlFor="ageModeBrackets" className="text-sm font-normal">Répartition par tranches</Label>
            </div>
          </RadioGroup>

          {form.ageMode === "brackets" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField id="ageUnder25" label="Moins de 25 ans" help="Nombre de collaborateurs âgés de moins de 25 ans." value={form.ageUnder25} onChange={(v) => set("ageUnder25", v)} disabled={readOnly} />
              <NumberField id="age25to34" label="25 à 34 ans" help="Nombre de collaborateurs âgés de 25 à 34 ans." value={form.age25to34} onChange={(v) => set("age25to34", v)} disabled={readOnly} />
              <NumberField id="age35to44" label="35 à 44 ans" help="Nombre de collaborateurs âgés de 35 à 44 ans." value={form.age35to44} onChange={(v) => set("age35to44", v)} disabled={readOnly} />
              <NumberField id="age45to54" label="45 à 54 ans" help="Nombre de collaborateurs âgés de 45 à 54 ans." value={form.age45to54} onChange={(v) => set("age45to54", v)} disabled={readOnly} />
              <NumberField id="age55plus" label="55 ans et plus" help="Nombre de collaborateurs âgés de 55 ans et plus." value={form.age55plus} onChange={(v) => set("age55plus", v)} disabled={readOnly} />
            </div>
          ) : (
            <NumberField id="avgAge" label="Âge moyen" help="Âge moyen de l'ensemble des collaborateurs, en années." value={form.avgAge} onChange={(v) => set("avgAge", v)} unit="ans" step="0.1" disabled={readOnly} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ancienneté</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={form.seniorityMode ?? "precise"}
            onValueChange={(v) => set("seniorityMode", v as FormState["seniorityMode"])}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="precise" id="seniorityModePrecise" disabled={readOnly} />
              <Label htmlFor="seniorityModePrecise" className="text-sm font-normal">Ancienneté moyenne</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="brackets" id="seniorityModeBrackets" disabled={readOnly} />
              <Label htmlFor="seniorityModeBrackets" className="text-sm font-normal">Répartition par tranches</Label>
            </div>
          </RadioGroup>

          {form.seniorityMode === "brackets" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberField id="seniorityUnder2" label="Moins de 2 ans" help="Nombre de collaborateurs ayant moins de 2 ans d'ancienneté." value={form.seniorityUnder2} onChange={(v) => set("seniorityUnder2", v)} disabled={readOnly} />
              <NumberField id="seniority2to5" label="2 à 5 ans" help="Nombre de collaborateurs ayant entre 2 et 5 ans d'ancienneté." value={form.seniority2to5} onChange={(v) => set("seniority2to5", v)} disabled={readOnly} />
              <NumberField id="seniority5to10" label="5 à 10 ans" help="Nombre de collaborateurs ayant entre 5 et 10 ans d'ancienneté." value={form.seniority5to10} onChange={(v) => set("seniority5to10", v)} disabled={readOnly} />
              <NumberField id="seniorityOver10" label="Plus de 10 ans" help="Nombre de collaborateurs ayant plus de 10 ans d'ancienneté." value={form.seniorityOver10} onChange={(v) => set("seniorityOver10", v)} disabled={readOnly} />
            </div>
          ) : (
            <NumberField id="avgSeniority" label="Ancienneté moyenne" help="Ancienneté moyenne de l'ensemble des collaborateurs, en années." value={form.avgSeniority} onChange={(v) => set("avgSeniority", v)} unit="ans" step="0.1" disabled={readOnly} />
          )}
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
    </div>
  );
}

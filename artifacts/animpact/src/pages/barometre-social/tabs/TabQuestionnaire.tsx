import { useGetBarometreCampaign, getGetBarometreCampaignQueryKey } from "@workspace/api-client-react";
import { BAROMETRE_REFERENTIAL, BAROMETRE_THEMES, type BarometreTheme } from "@workspace/rse-referentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion } from "lucide-react";
import type { BarometreCampaign } from "@workspace/api-client-react";

interface Props {
  orgId: number;
  campaign: BarometreCampaign | null;
}

export function TabQuestionnaire({ orgId, campaign }: Props) {
  const { data: detail, isLoading } = useGetBarometreCampaign(orgId, campaign?.id ?? 0, {
    query: { enabled: !!campaign, queryKey: getGetBarometreCampaignQueryKey(orgId, campaign?.id ?? 0) },
  });

  if (!campaign) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        Sélectionnez ou créez une campagne dans l'onglet "Campagnes" pour voir son questionnaire.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileQuestion className="h-4 w-4" />
        Référentiel standard de {BAROMETRE_REFERENTIAL.length} questions, réparties en {BAROMETRE_THEMES.length} thématiques.
        Ce questionnaire est envoyé tel quel aux collaborateurs — il n'est pas modifiable après création de la campagne.
      </div>

      {BAROMETRE_THEMES.map((theme: BarometreTheme) => (
        <Card key={theme}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{theme}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {BAROMETRE_REFERENTIAL.filter((q) => q.theme === theme).map((q) => (
              <div key={q.code} className="flex items-start gap-2 text-sm py-1.5 border-b last:border-0">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                  {q.type === "scale" ? "Échelle 1-5" : "Libre"}
                </Badge>
                <span className="text-foreground">{q.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {!!detail?.customQuestions?.length && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Questions complémentaires (spécifiques à cette campagne)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.customQuestions.map((q) => (
              <div key={q.id} className="text-sm py-1.5 border-b last:border-0">{q.text}</div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

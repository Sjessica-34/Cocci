import { useState } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useListExercises } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { ClosedExerciseBanner } from "@/components/ClosedExerciseBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Users2,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { TabGuide } from "./tabs/TabGuide";
import { TabEffectifs } from "./tabs/TabEffectifs";
import { TabDiversite } from "./tabs/TabDiversite";
import { TabFormation } from "./tabs/TabFormation";
import { TabSynthese } from "./tabs/TabSynthese";
import { DocumentUploader } from "@/components/DocumentUploader";

const TABS = [
  { value: "guide",      label: "Guide",                     icon: <BookOpen       className="h-3.5 w-3.5" /> },
  { value: "effectifs",  label: "Effectifs",                 icon: <Users2         className="h-3.5 w-3.5" /> },
  { value: "diversite",  label: "Diversité & Inclusion",     icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { value: "formation",  label: "Formation & Développement", icon: <GraduationCap  className="h-3.5 w-3.5" /> },
  { value: "synthese",   label: "Synthèse",                  icon: <Sparkles       className="h-3.5 w-3.5" /> },
  { value: "documents",  label: "Documents",                 icon: <FolderOpen     className="h-3.5 w-3.5" /> },
];

export function CapitalHumain() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(effectiveOrgId ?? 0, {
    query: {
      queryKey: ["/api/organizations", effectiveOrgId, "exercises"],
      enabled: effectiveOrgId != null,
    },
  });
  const [activeTab, setActiveTab] = useState("guide");
  const current = exercises?.find((e) => e.id === currentExerciseId);
  const readOnly = current ? current.status !== "active" : false;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Capital Humain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez vos effectifs, votre politique de diversité &amp; inclusion et vos actions de
            formation, avec des indicateurs calculés automatiquement.
          </p>
        </div>

        <ClosedExerciseBanner />

        <>
          {!effectiveOrgId && (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Aucune organisation sélectionnée</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
                  </p>
                </div>
              </div>
            )}

            {!!effectiveOrgId && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-auto">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="guide" className="mt-0">
                  <TabGuide />
                </TabsContent>

                <TabsContent value="effectifs" className="mt-0">
                  <TabEffectifs orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="diversite" className="mt-0">
                  <TabDiversite orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="formation" className="mt-0">
                  <TabFormation orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="synthese" className="mt-0">
                  <TabSynthese orgId={effectiveOrgId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-sm font-semibold mb-1">Documents Capital Humain</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Bilan social, accords collectifs, rapport de formation, index égalité
                      femmes-hommes, organigrammes…
                    </p>
                    <DocumentUploader
                      orgId={effectiveOrgId}
                      category="capital-humain"
                      question="Ajoutez vos documents RH et sociaux"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
        </>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useListExercises } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { ClosedExerciseBanner } from "@/components/ClosedExerciseBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Users2,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { TabGuide } from "./tabs/TabGuide";
import { TabEffectifs } from "./tabs/TabEffectifs";
import { TabDiversite } from "./tabs/TabDiversite";
import { TabFormation } from "./tabs/TabFormation";
import { TabSynthese } from "./tabs/TabSynthese";
import { DocumentUploader } from "@/components/DocumentUploader";

const TABS = [
  { value: "guide",      label: "Guide",                     icon: <BookOpen       className="h-3.5 w-3.5" /> },
  { value: "effectifs",  label: "Effectifs",                 icon: <Users2         className="h-3.5 w-3.5" /> },
  { value: "diversite",  label: "Diversité & Inclusion",     icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { value: "formation",  label: "Formation & Développement", icon: <GraduationCap  className="h-3.5 w-3.5" /> },
  { value: "synthese",   label: "Synthèse",                  icon: <Sparkles       className="h-3.5 w-3.5" /> },
  { value: "documents",  label: "Documents",                 icon: <FolderOpen     className="h-3.5 w-3.5" /> },
];

export function CapitalHumain() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(effectiveOrgId ?? 0, {
    query: {
      queryKey: ["/api/organizations", effectiveOrgId, "exercises"],
      enabled: effectiveOrgId != null,
    },
  });
  const [activeTab, setActiveTab] = useState("guide");
  const current = exercises?.find((e) => e.id === currentExerciseId);
  const readOnly = current ? current.status !== "active" : false;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Capital Humain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez vos effectifs, votre politique de diversité &amp; inclusion et vos actions de
            formation, avec des indicateurs calculés automatiquement.
          </p>
        </div>

        <ClosedExerciseBanner />

        <>
          {!effectiveOrgId && (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Aucune organisation sélectionnée</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
                  </p>
                </div>
              </div>
            )}

            {!!effectiveOrgId && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-auto">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="guide" className="mt-0">
                  <TabGuide />
                </TabsContent>

                <TabsContent value="effectifs" className="mt-0">
                  <TabEffectifs orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="diversite" className="mt-0">
                  <TabDiversite orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="formation" className="mt-0">
                  <TabFormation orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="synthese" className="mt-0">
                  <TabSynthese orgId={effectiveOrgId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-sm font-semibold mb-1">Documents Capital Humain</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Bilan social, accords collectifs, rapport de formation, index égalité
                      femmes-hommes, organigrammes…
                    </p>
                    <DocumentUploader
                      orgId={effectiveOrgId}
                      category="capital-humain"
                      question="Ajoutez vos documents RH et sociaux"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
        </>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useListExercises } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { ClosedExerciseBanner } from "@/components/ClosedExerciseBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Users2,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { TabGuide } from "./tabs/TabGuide";
import { TabEffectifs } from "./tabs/TabEffectifs";
import { TabDiversite } from "./tabs/TabDiversite";
import { TabFormation } from "./tabs/TabFormation";
import { TabSynthese } from "./tabs/TabSynthese";
import { DocumentUploader } from "@/components/DocumentUploader";

const TABS = [
  { value: "guide",      label: "Guide",                     icon: <BookOpen       className="h-3.5 w-3.5" /> },
  { value: "effectifs",  label: "Effectifs",                 icon: <Users2         className="h-3.5 w-3.5" /> },
  { value: "diversite",  label: "Diversité & Inclusion",     icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { value: "formation",  label: "Formation & Développement", icon: <GraduationCap  className="h-3.5 w-3.5" /> },
  { value: "synthese",   label: "Synthèse",                  icon: <Sparkles       className="h-3.5 w-3.5" /> },
  { value: "documents",  label: "Documents",                 icon: <FolderOpen     className="h-3.5 w-3.5" /> },
];

export function CapitalHumain() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(effectiveOrgId ?? 0, {
    query: {
      queryKey: ["/api/organizations", effectiveOrgId, "exercises"],
      enabled: effectiveOrgId != null,
    },
  });
  const [activeTab, setActiveTab] = useState("guide");
  const current = exercises?.find((e) => e.id === currentExerciseId);
  const readOnly = current ? current.status !== "active" : false;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Capital Humain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez vos effectifs, votre politique de diversité &amp; inclusion et vos actions de
            formation, avec des indicateurs calculés automatiquement.
          </p>
        </div>

        <ClosedExerciseBanner />

        <>
          {!effectiveOrgId && (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Aucune organisation sélectionnée</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
                  </p>
                </div>
              </div>
            )}

            {!!effectiveOrgId && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-auto">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="guide" className="mt-0">
                  <TabGuide />
                </TabsContent>

                <TabsContent value="effectifs" className="mt-0">
                  <TabEffectifs orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="diversite" className="mt-0">
                  <TabDiversite orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="formation" className="mt-0">
                  <TabFormation orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="synthese" className="mt-0">
                  <TabSynthese orgId={effectiveOrgId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-sm font-semibold mb-1">Documents Capital Humain</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Bilan social, accords collectifs, rapport de formation, index égalité
                      femmes-hommes, organigrammes…
                    </p>
                    <DocumentUploader
                      orgId={effectiveOrgId}
                      category="capital-humain"
                      question="Ajoutez vos documents RH et sociaux"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
        </>
      </div>
    </AppLayout>
  );
}
import { useState } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useListExercises } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { ClosedExerciseBanner } from "@/components/ClosedExerciseBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Users2,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { TabGuide } from "./tabs/TabGuide";
import { TabEffectifs } from "./tabs/TabEffectifs";
import { TabDiversite } from "./tabs/TabDiversite";
import { TabFormation } from "./tabs/TabFormation";
import { TabSynthese } from "./tabs/TabSynthese";
import { DocumentUploader } from "@/components/DocumentUploader";

const TABS = [
  { value: "guide",      label: "Guide",                     icon: <BookOpen       className="h-3.5 w-3.5" /> },
  { value: "effectifs",  label: "Effectifs",                 icon: <Users2         className="h-3.5 w-3.5" /> },
  { value: "diversite",  label: "Diversité & Inclusion",     icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { value: "formation",  label: "Formation & Développement", icon: <GraduationCap  className="h-3.5 w-3.5" /> },
  { value: "synthese",   label: "Synthèse",                  icon: <Sparkles       className="h-3.5 w-3.5" /> },
  { value: "documents",  label: "Documents",                 icon: <FolderOpen     className="h-3.5 w-3.5" /> },
];

export function CapitalHumain() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(effectiveOrgId ?? 0, {
    query: {
      queryKey: ["/api/organizations", effectiveOrgId, "exercises"],
      enabled: effectiveOrgId != null,
    },
  });
  const [activeTab, setActiveTab] = useState("guide");
  const current = exercises?.find((e) => e.id === currentExerciseId);
  const readOnly = current ? current.status !== "active" : false;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Capital Humain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez vos effectifs, votre politique de diversité &amp; inclusion et vos actions de
            formation, avec des indicateurs calculés automatiquement.
          </p>
        </div>

        <ClosedExerciseBanner />

        <>
          {!effectiveOrgId && (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Aucune organisation sélectionnée</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
                  </p>
                </div>
              </div>
            )}

            {!!effectiveOrgId && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-auto">
                  {TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="guide" className="mt-0">
                  <TabGuide />
                </TabsContent>

                <TabsContent value="effectifs" className="mt-0">
                  <TabEffectifs orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="diversite" className="mt-0">
                  <TabDiversite orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="formation" className="mt-0">
                  <TabFormation orgId={effectiveOrgId} readOnly={readOnly} />
                </TabsContent>

                <TabsContent value="synthese" className="mt-0">
                  <TabSynthese orgId={effectiveOrgId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-sm font-semibold mb-1">Documents Capital Humain</h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Bilan social, accords collectifs, rapport de formation, index égalité
                      femmes-hommes, organigrammes…
                    </p>
                    <DocumentUploader
                      orgId={effectiveOrgId}
                      category="capital-humain"
                      question="Ajoutez vos documents RH et sociaux"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
        </>
      </div>
    </AppLayout>
  );
}

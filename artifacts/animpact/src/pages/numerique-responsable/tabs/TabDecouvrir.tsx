import { useState, useEffect } from "react";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Monitor, CheckCircle2, FileText, Clock, Star, ArrowRight,
  ShieldCheck, Info, Lightbulb, TrendingUp,
} from "lucide-react";
import type { NrMeta } from "@workspace/api-client-react";

const CERT_OPTIONS = [
  { value: "none",  label: "Aucun" },
  { value: "inr",   label: "Label Numérique Responsable (INR)" },
  { value: "nr1",   label: "NR Niveau 1" },
  { value: "nr2",   label: "NR Niveau 2" },
  { value: "other", label: "Autre" },
];

interface Props {
  orgId: number;
  meta: NrMeta;
  onSave: (meta: NrMeta) => void;
  onStart: () => void;
}

export function TabDecouvrir({ orgId, meta, onSave, onStart }: Props) {
  const [cert, setCert] = useState(meta.certificationLabel ?? "none");
  const [certOther, setCertOther] = useState(meta.certificationOther ?? "");

  useEffect(() => {
    setCert(meta.certificationLabel ?? "none");
    setCertOther(meta.certificationOther ?? "");
  }, [meta.certificationLabel, meta.certificationOther]);

  const handleCertChange = (value: string) => {
    setCert(value);
    onSave({ certificationLabel: value, certificationOther: value === "other" ? certOther : null });
  };

  const handleOtherChange = (value: string) => {
    setCertOther(value);
    onSave({ certificationLabel: "other", certificationOther: value });
  };

  return (
    <div className="space-y-6">
      {/* Certification card */}
      <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/5">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">
            Votre organisation est-elle déjà engagée dans une démarche Numérique Responsable ?
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">
              Disposez-vous d'un label ou d'une certification Numérique Responsable ?
            </Label>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleCertChange(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    cert === opt.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-border text-foreground hover:border-emerald-400 hover:text-emerald-700",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {cert === "other" && (
            <div className="space-y-1.5">
              <Label htmlFor="cert-other" className="text-sm">Précisez votre certification</Label>
              <Input
                id="cert-other"
                value={certOther}
                onChange={(e) => handleOtherChange(e.target.value)}
                placeholder="Nom de la certification..."
                className="max-w-sm"
              />
            </div>
          )}

          {/* Document upload for certification */}
          <div className="pt-1">
            <p className="text-sm text-muted-foreground mb-3">
              Déposez votre certificat ou justificatif ci-dessous. Il sera conservé dans votre GED et réutilisable dans le Rapport RSE.
            </p>
            <DocumentUploader
              orgId={orgId}
              category="numerique-responsable"
              question="Déposer le certificat ou le justificatif"
              compact
            />
          </div>
        </div>
      </div>

      {/* Introduction cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <IntroCard
          icon={<Monitor className="h-5 w-5 text-blue-600" />}
          title="Qu'est-ce que le Numérique Responsable ?"
          color="blue"
        >
          Le Numérique Responsable désigne l'ensemble des pratiques visant à réduire les impacts
          environnementaux et sociaux du numérique — équipements, logiciels, données, infrastructures —
          tout en valorisant le numérique comme levier d'action positif.
        </IntroCard>

        <IntroCard
          icon={<Lightbulb className="h-5 w-5 text-amber-600" />}
          title="Pourquoi réaliser cette évaluation ?"
          color="amber"
        >
          Cette évaluation vous permet d'identifier vos points forts et vos axes d'amélioration,
          de structurer votre démarche NR, de préparer une éventuelle certification, et d'alimenter
          votre Rapport RSE avec des données fiables.
        </IntroCard>

        <IntroCard
          icon={<FileText className="h-5 w-5 text-purple-600" />}
          title="Fonctionnement du questionnaire"
          color="purple"
        >
          Le questionnaire est organisé en <strong>7 piliers</strong>, chacun divisé en sous-thèmes
          et critères. Pour chaque critère, cochez les actions déjà mises en œuvre, ajoutez un
          commentaire libre et déposez des justificatifs si nécessaire.
        </IntroCard>

        <IntroCard
          icon={<Star className="h-5 w-5 text-emerald-600" />}
          title="Score sur 500 points"
          color="emerald"
        >
          Le score global est calculé sur 500 points, proportionnel aux critères positifs validés
          sur l'ensemble du référentiel. Un score par pilier (en %) vous permet d'identifier les
          domaines prioritaires à renforcer.
        </IntroCard>

        <IntroCard
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          title="Fonctionnement des justificatifs"
          color="teal"
        >
          Pour chaque critère, vous pouvez déposer un ou plusieurs justificatifs (PDF, Word, Excel,
          image). Ces documents sont liés au critère concerné et pourront être réutilisés directement
          dans votre Rapport RSE.
        </IntroCard>

        <IntroCard
          icon={<Clock className="h-5 w-5 text-rose-600" />}
          title="Temps estimé"
          color="rose"
        >
          Comptez <strong>2 à 4 heures</strong> pour une première évaluation complète. Vos réponses
          sont sauvegardées automatiquement à chaque interaction — vous pouvez quitter et reprendre
          à tout moment sans perte de données.
        </IntroCard>
      </div>

      {/* Sauvegarde info */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Sauvegarde automatique</strong> — À tout moment, vos réponses, commentaires et
          justificatifs sont sauvegardés. Vous pouvez reprendre l'évaluation quand vous le souhaitez.
        </p>
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <Button onClick={onStart} size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <TrendingUp className="h-4.5 w-4.5" />
          Commencer l'évaluation
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}

function IntroCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "amber" | "purple" | "emerald" | "teal" | "rose";
  children: React.ReactNode;
}) {
  const bg: Record<string, string> = {
    blue:    "border-blue-100 bg-blue-50/40",
    amber:   "border-amber-100 bg-amber-50/40",
    purple:  "border-purple-100 bg-purple-50/40",
    emerald: "border-emerald-100 bg-emerald-50/40",
    teal:    "border-teal-100 bg-teal-50/40",
    rose:    "border-rose-100 bg-rose-50/40",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

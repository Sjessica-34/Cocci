import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  useCreateBarometreCampaign,
  useDeleteBarometreCampaign,
  useUpdateBarometreCampaignStatus,
  getListBarometreCampaignsQueryKey,
  type BarometreCampaign,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, QrCode, Copy, Check, Users, Link as LinkIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  orgId: number;
  campaigns: BarometreCampaign[];
  isLoading: boolean;
  selectedCampaignId: number | null;
  onSelectCampaign: (id: number) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:  { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  active: { label: "En cours",  className: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Clôturée",  className: "bg-slate-200 text-slate-600" },
};

function publicUrl(token: string): string {
  return `${window.location.origin}/repondre/${token}`;
}

export function TabCampagnes({ orgId, campaigns, isLoading, selectedCampaignId, onSelectCampaign }: Props) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<"anonymous" | "identified">("anonymous");
  const [nbCollaborateurs, setNbCollaborateurs] = useState("");
  const [openDate, setOpenDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [closeDate, setCloseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  const addCustomQuestion = () => {
    const text = newQuestion.trim();
    if (!text) return;
    setCustomQuestions((prev) => [...prev, text]);
    setNewQuestion("");
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: getListBarometreCampaignsQueryKey(orgId) });

  const { mutate: createCampaign, isPending: isCreating } = useCreateBarometreCampaign({
    mutation: {
      onSuccess: (campaign) => {
        invalidateList();
        setCreateOpen(false);
        setName("");
        setNbCollaborateurs("");
        setCustomQuestions([]);
        setNewQuestion("");
        onSelectCampaign(campaign.id);
      },
    },
  });

  const { mutate: deleteCampaign } = useDeleteBarometreCampaign({
    mutation: { onSuccess: invalidateList },
  });

  const { mutate: updateStatus } = useUpdateBarometreCampaignStatus({
    mutation: { onSuccess: invalidateList },
  });

  const handleCreate = () => {
    if (!name.trim() || !nbCollaborateurs) return;
    createCampaign({
      orgId,
      data: {
        name: name.trim(),
        mode,
        openDate,
        closeDate,
        nbCollaborateurs: Number(nbCollaborateurs),
        customQuestions: customQuestions.length ? customQuestions : undefined,
      },
    });
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // clipboard unavailable — silently ignore, the link is still shown
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nouvelle campagne
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle campagne de baromètre social</DialogTitle>
              <DialogDescription>
                Les collaborateurs répondront via un lien ou un QR code sécurisé, sans compte Cocci.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="bs-name">Nom de la campagne</Label>
                <Input id="bs-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Baromètre social 2026" />
              </div>
              <div className="space-y-1.5">
                <Label>Mode de réponse</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as "anonymous" | "identified")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anonymous">Anonyme</SelectItem>
                    <SelectItem value="identified">Identifié (nom facultatif du répondant)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bs-nb">Nombre de collaborateurs concernés</Label>
                <Input
                  id="bs-nb"
                  type="number"
                  min={1}
                  value={nbCollaborateurs}
                  onChange={(e) => setNbCollaborateurs(e.target.value)}
                  placeholder="Ex. 25"
                />
                <p className="text-xs text-muted-foreground">
                  Saisie manuelle — utilisée pour calculer le taux de participation.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Questions personnalisées (facultatif)</Label>
                <p className="text-xs text-muted-foreground">
                  Ajoutées après les 36 questions du référentiel. Non modifiables après création.
                </p>
                {customQuestions.length > 0 && (
                  <ul className="space-y-1.5">
                    {customQuestions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-sm">
                        <span className="flex-1">{q}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => removeCustomQuestion(i)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ex. Que pensez-vous de notre nouvel outil interne ?"
                    className="min-h-9 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addCustomQuestion();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addCustomQuestion} disabled={!newQuestion.trim()}>
                    Ajouter
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bs-open">Date d'ouverture</Label>
                  <Input id="bs-open" type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bs-close">Date de clôture</Label>
                  <Input id="bs-close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !nbCollaborateurs}>
                Créer la campagne
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
          Aucune campagne pour cet exercice. Créez votre première campagne de baromètre social.
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const status = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft;
          const isSelected = campaign.id === selectedCampaignId;
          return (
            <Card
              key={campaign.id}
              className={`cursor-pointer transition-colors ${isSelected ? "border-primary ring-1 ring-primary/30" : ""}`}
              onClick={() => onSelectCampaign(campaign.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {campaign.name}
                    <Badge className={status.className}>{status.label}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {campaign.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus({ orgId, id: campaign.id, data: { status: "active" } })}>
                        Ouvrir la campagne
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus({ orgId, id: campaign.id, data: { status: "closed" } })}>
                        Clôturer
                      </Button>
                    )}
                    <Dialog open={qrToken === campaign.publicToken} onOpenChange={(open) => setQrToken(open ? campaign.publicToken : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5" title="Lien et QR code à partager">
                          <QrCode className="h-4 w-4" />
                          Lien / QR code
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Lien de la campagne</DialogTitle>
                          <DialogDescription>À partager avec les collaborateurs (aucun compte requis).</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-2">
                          <div className="p-3 bg-white rounded-lg border">
                            <QRCodeSVG value={publicUrl(campaign.publicToken)} size={200} />
                          </div>
                          <div className="flex w-full items-center gap-2">
                            <Input readOnly value={publicUrl(campaign.publicToken)} className="text-xs" />
                            <Button size="icon" variant="outline" onClick={() => handleCopy(campaign.publicToken)}>
                              {copiedToken === campaign.publicToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Supprimer la campagne">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette campagne ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {campaign.nbRepondants > 0
                              ? `Cette campagne contient ${campaign.nbRepondants} réponse${campaign.nbRepondants > 1 ? "s" : ""}. Toutes les données seront définitivement perdues.`
                              : "Cette action est irréversible."
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteCampaign({ orgId, id: campaign.id })}
                          >
                            Supprimer définitivement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {campaign.nbRepondants}/{campaign.nbCollaborateurs} répondants ({campaign.tauxParticipation.toFixed(0)}%)
                  </span>
                  <span>Du {campaign.openDate} au {campaign.closeDate}</span>
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {campaign.mode === "anonymous" ? "Anonyme" : "Identifié"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

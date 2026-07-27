import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import {
  useListAdminEchangesFeedback,
  useListAdminEchangesRatings,
  useGetAdminEchangesStats,
  useUpdateAdminFeedbackStatus,
  getAdminEchangesFeedbackQueryKey,
  getAdminEchangesRatingsQueryKey,
  getAdminEchangesStatsQueryKey,
} from "@workspace/api-client-react";
import type { AdminCocciFeedback, AdminCocciRating } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Star,
  Building2,
  User,
  Calendar,
  Paperclip,
  Phone,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUEST_TYPE_LABELS: Record<string, string> = {
  suggestion: "Suggestion d'amélioration",
  bug: "Signaler un problème",
  evolution: "Demande d'évolution",
  question: "Question",
  other: "Autre",
};

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  nouveau: { label: "Nouveau", class: "bg-blue-50 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", class: "bg-amber-50 text-amber-700 border-amber-200" },
  traite: { label: "Traité", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ferme: { label: "Fermé", class: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

const STATUS_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "en_cours", label: "En cours" },
  { value: "traite", label: "Traité" },
  { value: "ferme", label: "Fermé" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function userLabel(row: { userFirstName: string | null; userLastName: string | null; userEmail: string }) {
  const name = [row.userFirstName, row.userLastName].filter(Boolean).join(" ");
  return name || row.userEmail;
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function FeedbackDetailDialog({
  item,
  open,
  onClose,
}: {
  item: AdminCocciFeedback | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");

  const updateStatus = useUpdateAdminFeedbackStatus();

  if (!item) return null;

  const history = (item.history ?? []) as { date: string; status: string; note?: string }[];

  function handleUpdate() {
    if (!newStatus) return;
    updateStatus.mutate(
      { id: item!.id, data: { status: newStatus, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Statut mis à jour." });
          qc.invalidateQueries({ queryKey: getAdminEchangesFeedbackQueryKey() });
          qc.invalidateQueries({ queryKey: getAdminEchangesStatsQueryKey() });
          setNewStatus("");
          setNote("");
          onClose();
        },
        onError: () => toast({ title: "Erreur lors de la mise à jour.", variant: "destructive" }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <DialogTitle className="text-base leading-snug">{item.subject}</DialogTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] h-5 px-2 py-0 font-medium shrink-0",
                STATUS_CONFIG[item.status]?.class,
              )}
            >
              {STATUS_CONFIG[item.status]?.label ?? item.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium text-foreground">{item.organizationName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{userLabel(item)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>{REQUEST_TYPE_LABELS[item.requestType] ?? item.requestType}</span>
            </div>
            {item.wantsCallback && (
              <div className="flex items-center gap-2 text-primary col-span-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Demande de rappel</span>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{item.message}</p>
          </div>

          {/* Attachment — only render as link when URL is a safe https:// URL */}
          {item.attachmentUrl && (() => {
            let isSafe = false;
            try {
              const parsed = new URL(item.attachmentUrl);
              isSafe = parsed.protocol === "https:";
            } catch { /* invalid URL */ }
            return isSafe ? (
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <a
                  href={item.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Voir la pièce jointe
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Paperclip className="h-4 w-4" />
                <span className="italic">Pièce jointe invalide</span>
              </div>
            );
          })()}

          {/* History */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Historique de traitement
              </p>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <span className="text-muted-foreground text-xs">{formatDate(h.date)}</span>
                      {" — "}
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-4 px-1.5 py-0 font-medium", STATUS_CONFIG[h.status]?.class)}
                      >
                        {STATUS_CONFIG[h.status]?.label ?? h.status}
                      </Badge>
                      {h.note && <p className="text-muted-foreground mt-0.5">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Update status */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Modifier le statut</p>
            <div className="grid grid-cols-2 gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Nouveau statut…" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((s) => s.value !== item.status).map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-muted-foreground">
                Note interne (facultative)
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex : Transmis à l'équipe technique…"
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!newStatus || updateStatus.isPending}
          >
            {updateStatus.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Messages ────────────────────────────────────────────────────────────

function TabMessages() {
  const [selected, setSelected] = useState<AdminCocciFeedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: feedbacks, isLoading } = useListAdminEchangesFeedback();

  const filtered = (feedbacks ?? []).filter(
    (f) => statusFilter === "all" || f.status === statusFilter,
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "Tous" },
            { value: "nouveau", label: "Nouveau" },
            { value: "en_cours", label: "En cours" },
            { value: "traite", label: "Traité" },
            { value: "ferme", label: "Fermé" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} message{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
          <MessageSquare className="mx-auto h-10 w-10 opacity-20 mb-3" />
          <p className="text-sm">Aucun message{statusFilter !== "all" ? " avec ce statut" : ""}.</p>
        </div>
      ) : (
        <Card className="overflow-hidden border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Objet</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className="group hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(f)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateShort(f.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground truncate max-w-[140px]">
                    {f.organizationName}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground truncate max-w-[120px]">
                    {userLabel(f)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {REQUEST_TYPE_LABELS[f.requestType] ?? f.requestType}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground truncate max-w-[180px]">
                    {f.subject}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] h-4 px-1.5 py-0 font-medium", STATUS_CONFIG[f.status]?.class)}
                    >
                      {STATUS_CONFIG[f.status]?.label ?? f.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <FeedbackDetailDialog
        item={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

// ─── Tab: Avis ────────────────────────────────────────────────────────────────

function TabAvis() {
  const { data: ratings, isLoading: ratingsLoading } = useListAdminEchangesRatings();
  const { data: stats, isLoading: statsLoading } = useGetAdminEchangesStats();

  const isLoading = ratingsLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Note moyenne
            </p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-foreground">
                  {stats?.averageStars.toFixed(1) ?? "—"}
                </p>
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Nombre d'avis
            </p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{stats?.totalRatings ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Répartition
            </p>
            {statsLoading ? (
              <div className="space-y-1">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const cnt = stats?.distribution[String(n)] ?? 0;
                  const total = stats?.totalRatings ?? 0;
                  const pct = total > 0 ? (cnt / total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-3">{n}</span>
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-5 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Tous les avis</p>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !ratings || ratings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
            <Star className="mx-auto h-10 w-10 opacity-20 mb-3" />
            <p className="text-sm">Aucun avis pour l'instant.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Note</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {ratings.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateShort(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground truncate max-w-[140px]">
                      {r.organizationName}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground truncate max-w-[120px]">
                      {userLabel(r)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "h-3.5 w-3.5",
                              n <= r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20",
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[240px] truncate">
                      {r.comment ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export function AdminEchanges() {
  const [tab, setTab] = useState<"messages" | "avis">("messages");

  const { data: stats } = useGetAdminEchangesStats();
  const newCount = stats?.newFeedbackCount ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Échanges avec Cocci
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Messages envoyés par les utilisateurs et évaluations de la plateforme.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border gap-1">
          <button
            onClick={() => setTab("messages")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2",
              tab === "messages"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Nous écrire
            {newCount > 0 && (
              <span className="h-4.5 min-w-[1.125rem] rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("avis")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5",
              tab === "avis"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            Avis
          </button>
        </div>

        {/* Content */}
        {tab === "messages" ? <TabMessages /> : <TabAvis />}
      </div>
    </AdminLayout>
  );
}

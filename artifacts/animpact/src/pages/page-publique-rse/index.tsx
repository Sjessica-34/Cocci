import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { customFetch } from "@workspace/api-client-react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Globe, Link2, Copy, CheckCircle2, Trash2,
  ExternalLink, Loader2, Share2, Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PagePubliqueRse() {
  const { orgId, isReadOnly } = useModuleContext();

  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicUrl = token
    ? `${window.location.origin}${base}/p/${token}`
    : null;

  useEffect(() => {
    if (!orgId) return;
    customFetch<{ token: string } | null>(`/api/organizations/${orgId}/public-link`, { method: "GET" })
      .then((d) => setToken(d?.token ?? null))
      .catch(() => setToken(null));
  }, [orgId]);

  const generate = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const d = await customFetch<{ token: string }>(`/api/organizations/${orgId}/public-link`, { method: "POST" });
      setToken(d.token);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!orgId || !confirm("Révoquer le lien ? Les personnes qui ont le lien ne pourront plus accéder à votre page.")) return;
    setLoading(true);
    try {
      await customFetch(`/api/organizations/${orgId}/public-link`, { method: "DELETE" });
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Ma page publique RSE</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Partagez votre démarche RSE avec vos clients, partenaires et parties prenantes — sans compte requis, mise à jour automatiquement depuis vos données Cocci.
            </p>
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {token === undefined && (
          <div className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-[180px] bg-muted rounded-lg mx-auto w-[180px]" />
          </div>
        )}

        {/* ── Pas encore de lien ── */}
        {token === null && (
          <div className="rounded-xl border bg-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Share2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Votre page publique RSE n'est pas encore activée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Générez un lien unique pour partager votre démarche RSE en un clic.
              </p>
            </div>
            <Button onClick={generate} disabled={loading || isReadOnly} className="gap-2">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</>
                : <><Link2 className="h-4 w-4" /> Générer le lien de partage</>}
            </Button>
          </div>
        )}

        {/* ── Lien actif ── */}
        {token && publicUrl && (
          <div className="space-y-5">

            {/* Statut */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 text-green-700 border-green-200 bg-green-50">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                Page publique active
              </Badge>
            </div>

            {/* QR code */}
            <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">QR Code</p>
              <div className="rounded-xl border p-3 bg-white">
                <QRCodeSVG value={publicUrl} size={180} fgColor="#1d3a2f" />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Scannez pour accéder à votre page publique RSE. Idéal pour vos supports imprimés, stands et présentations.
              </p>
            </div>

            {/* Lien + actions */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Lien de partage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={publicUrl}
                    className="flex-1 h-9 rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground truncate font-mono"
                  />
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs shrink-0" onClick={copy}>
                    {copied
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Copié !</>
                      : <><Copy className="h-3.5 w-3.5" /> Copier</>}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" />
                    Ouvrir la page
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive ml-auto"
                  onClick={revoke}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Révoquer le lien
                </Button>
              </div>
            </div>

            {/* Infos */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">À propos de cette page</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Accessible à toute personne ayant le lien, sans compte requis</li>
                <li>Les données se mettent à jour automatiquement depuis Cocci</li>
                <li>Scores RSE, plan d'actions, labels, baromètre social et progression</li>
                <li>Révoquer le lien rend la page inaccessible immédiatement</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

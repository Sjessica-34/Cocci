import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListOrganizations } from "@workspace/api-client-react";
import { useListOrgResources, getListOrgResourcesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Search, Download, Link as LinkIcon, FileText } from "lucide-react";

const DOC_TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-700 border-red-200",
  Word: "bg-blue-50 text-blue-700 border-blue-200",
  Excel: "bg-green-50 text-green-700 border-green-200",
  Vidéo: "bg-violet-50 text-violet-700 border-violet-200",
  Lien: "bg-amber-50 text-amber-700 border-amber-200",
  Autre: "bg-muted text-muted-foreground border-border",
};

export function Resources() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === currentOrgId);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");

  const { data: resources, isLoading } = useListOrgResources(currentOrgId ?? 0, {
    query: {
      queryKey: getListOrgResourcesQueryKey(currentOrgId ?? 0),
      enabled: !!currentOrgId,
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources?.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    return (resources ?? []).filter((r) => {
      const matchesSearch =
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "__all__" || r.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [resources, search, categoryFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes ressources</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documents mis à disposition par cocci
            {currentOrg ? ` pour ${currentOrg.name}` : ""}.
          </p>
        </div>

        {!currentOrgId ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
            <p className="text-sm font-medium">Aucune entreprise sélectionnée</p>
            <p className="text-xs mt-1">Sélectionnez une entreprise dans la navigation pour accéder aux ressources.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes les catégories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm font-medium">
                  {resources?.length === 0
                    ? "Aucune ressource disponible pour l'instant."
                    : "Aucun document ne correspond à votre recherche."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((resource) => (
                  <Card key={resource.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    {resource.imageUrl && (
                      <div className="h-36 overflow-hidden bg-muted">
                        <img
                          src={resource.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex-1 flex flex-col p-4">
                      <div className="flex items-start gap-2 mb-2">
                        {!resource.imageUrl && (
                          <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                            {resource.title}
                          </p>
                        </div>
                      </div>

                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                          {resource.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {resource.category && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {resource.category}
                          </Badge>
                        )}
                        {resource.documentType && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${DOC_TYPE_COLORS[resource.documentType] ?? ""}`}
                          >
                            {resource.documentType}
                          </Badge>
                        )}
                      </div>

                      {resource.fileUrl && (
                        <div className="mt-auto">
                          <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              {resource.documentType === "Lien" ? (
                                <>
                                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                                  Ouvrir le lien
                                </>
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5 mr-1.5" />
                                  Télécharger
                                </>
                              )}
                            </Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

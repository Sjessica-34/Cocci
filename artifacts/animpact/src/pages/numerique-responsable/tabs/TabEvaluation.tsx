import { useState, useCallback, useRef, useEffect } from "react";
import { PILLARS, MACRO_PILLARS, scorableCriteria } from "../data";
import type { Criterion, Section, Pillar, MacroPillar } from "../data";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Paperclip, Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orgId:            number;
  responses:        Record<string, boolean>;
  comments:         Record<string, string>;
  onResponseChange: (criterionId: string, checked: boolean) => void;
  onCommentChange:  (criterionId: string, comment: string)  => void;
  onSave:           () => void;
}

// Pre-index pillars by id for O(1) lookup
const PILLAR_BY_ID = Object.fromEntries(PILLARS.map((p) => [p.id, p]));

export function TabEvaluation({
  orgId, responses, comments, onResponseChange, onCommentChange, onSave,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [openDocs, setOpenDocs] = useState<string | null>(null);

  const [collapsedMacro,   setCollapsedMacro]   = useState<Record<string, boolean>>({});
  const [collapsedPillars, setCollapsedPillars]  = useState<Record<string, boolean>>({});
  const [collapsedSections,setCollapsedSections] = useState<Record<string, boolean>>({});

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeSaveRef = useRef<() => void>(() => {});

  const executeSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setSaving(true);
    setSaved(false);
    onSave();
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 600);
  }, [onSave]);

  useEffect(() => {
    executeSaveRef.current = executeSave;
  }, [executeSave]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => executeSaveRef.current(), 800);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const handleCheck   = (cid: string, v: boolean) => { onResponseChange(cid, v); scheduleAutoSave(); };
  const handleComment = (cid: string, v: string)  => { onCommentChange(cid, v);  scheduleAutoSave(); };

  const toggleMacro   = (id: string) => setCollapsedMacro((s)   => ({ ...s, [id]: !s[id] }));
  const togglePillar  = (id: string) => setCollapsedPillars((s) => ({ ...s, [id]: !s[id] }));
  const toggleSection = (id: string) => setCollapsedSections((s)=> ({ ...s, [id]: !s[id] }));

  // ── Progress helpers ───────────────────────────────────────────────────────
  function sectionProgress(section: Section) {
    const scorable = scorableCriteria(section.criteria);
    const checked  = scorable.filter((c) => responses[c.id]).length;
    return { checked, total: scorable.length };
  }

  function pillarProgress(pillar: Pillar) {
    let checked = 0, total = 0;
    for (const s of pillar.sections) { const p = sectionProgress(s); checked += p.checked; total += p.total; }
    return { checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0 };
  }

  function macroPillarProgress(mp: MacroPillar) {
    let checked = 0, total = 0;
    for (const pid of mp.pillarIds) {
      const pillar = PILLAR_BY_ID[pid];
      if (!pillar) continue;
      const p = pillarProgress(pillar);
      checked += p.checked; total += p.total;
    }
    return { checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0 };
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Cochez les critères mis en œuvre. Sauvegarde automatique active.
        </p>
        <SaveIndicator saving={saving} saved={saved} />
      </div>

      {/* 5 macro-pillars */}
      {MACRO_PILLARS.map((mp) => {
        const mpProg    = macroPillarProgress(mp);
        const isOpen    = !collapsedMacro[mp.id];
        const pillars   = mp.pillarIds.map((pid) => PILLAR_BY_ID[pid]).filter(Boolean) as Pillar[];

        return (
          <div key={mp.id} className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden shadow-sm">
            {/* Macro-pillar header */}
            <button
              type="button"
              onClick={() => toggleMacro(mp.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{mp.emoji}</span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground text-left leading-snug">{mp.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 text-left">
                    {mpProg.checked}/{mpProg.total} critères
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${mpProg.pct}%`, backgroundColor: mp.color }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: mp.color }}>{mpProg.pct}%</span>
                </div>
                {isOpen
                  ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Pillars inside the macro */}
            {isOpen && (
              <>
                <div className="border-t border-border divide-y divide-border">
                  {pillars.map((pillar) => {
                    const prog      = pillarProgress(pillar);
                    const isPillarOpen = !collapsedPillars[pillar.id];

                    return (
                      <div key={pillar.id}>
                        {/* Pillar header */}
                        <button
                          type="button"
                          onClick={() => togglePillar(pillar.id)}
                          className="w-full flex items-center justify-between px-5 py-3 bg-muted/5 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                            <span className="text-sm font-medium text-foreground text-left leading-snug">{pillar.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, backgroundColor: pillar.color }} />
                              </div>
                              <span className="text-xs font-medium" style={{ color: pillar.color }}>{prog.pct}%</span>
                            </div>
                            <Badge variant="outline" className="text-xs font-normal">{prog.checked}/{prog.total}</Badge>
                            {isPillarOpen
                              ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>
                        </button>

                        {/* Sections */}
                        {isPillarOpen && (
                          <div className="divide-y divide-border/60">
                            {pillar.sections.map((section) => {
                              const sp = sectionProgress(section);
                              const isSectionOpen = !collapsedSections[section.id];

                              return (
                                <div key={section.id}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-6 py-2.5 bg-muted/[0.03] hover:bg-muted/10 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isSectionOpen
                                        ? <ChevronDown  className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                        : <ChevronRight className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                      }
                                      <span className="text-xs text-foreground/75 text-left leading-snug">{section.title}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{sp.checked}/{sp.total}</span>
                                  </button>

                                  {isSectionOpen && (
                                    <div className="divide-y divide-border/40">
                                      {section.criteria.map((criterion) => (
                                        <CriterionRow
                                          key={criterion.id}
                                          orgId={orgId}
                                          criterion={criterion}
                                          checked={!!responses[criterion.id]}
                                          comment={comments[criterion.id] ?? ""}
                                          docOpen={openDocs === criterion.id}
                                          onCheck={(v) => handleCheck(criterion.id, v)}
                                          onComment={(v) => handleComment(criterion.id, v)}
                                          onToggleDocs={() =>
                                            setOpenDocs((p) => (p === criterion.id ? null : criterion.id))
                                          }
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Save button per macro-pillar */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/5">
                  <span className="text-xs text-muted-foreground">
                    <strong>{mpProg.pct}%</strong> complété — {mpProg.checked}/{mpProg.total} critères
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={executeSave}
                    disabled={saving}
                    className="gap-1.5 text-xs h-8"
                  >
                    {saving
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</>
                      : <><Save    className="h-3 w-3" /> Enregistrer</>
                    }
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Global save button */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enregistrer toutes mes réponses</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vos réponses sont également sauvegardées automatiquement à chaque modification.
          </p>
        </div>
        <Button
          type="button"
          onClick={executeSave}
          disabled={saving}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 ml-4"
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
            : <><Save    className="h-4 w-4" /> Enregistrer</>
          }
        </Button>
      </div>
    </div>
  );
}

// ── Save indicator ─────────────────────────────────────────────────────────────

function SaveIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (!saving && !saved) return <span className="min-w-24" />;
  return (
    <div className="flex items-center gap-1.5 text-xs min-w-24 justify-end">
      {saving && <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Sauvegarde…</span></>}
      {saved && !saving && <><Check className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600 font-medium">Sauvegardé</span></>}
    </div>
  );
}

// ── Criterion row ──────────────────────────────────────────────────────────────

interface CriterionProps {
  orgId:        number;
  criterion:    Criterion;
  checked:      boolean;
  comment:      string;
  docOpen:      boolean;
  onCheck:      (v: boolean) => void;
  onComment:    (v: string)  => void;
  onToggleDocs: () => void;
}

function CriterionRow({ orgId, criterion, checked, comment, docOpen, onCheck, onComment, onToggleDocs }: CriterionProps) {
  const [showComment, setShowComment] = useState(!!comment);
  const isSpecial = criterion.isSpecial;

  useEffect(() => { if (checked || comment) setShowComment(true); }, [checked, comment]);

  return (
    <div className={cn(
      "px-6 py-3 transition-colors",
      isSpecial ? "bg-muted/10" : "bg-white dark:bg-transparent",
      checked && !isSpecial && "bg-emerald-50/40 dark:bg-emerald-950/10",
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={criterion.id}
          checked={checked}
          onCheckedChange={(v) => onCheck(!!v)}
          className={cn(
            "mt-0.5 shrink-0",
            isSpecial && "border-muted-foreground/40",
            checked && !isSpecial && "border-emerald-600 data-[state=checked]:bg-emerald-600",
          )}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <label
            htmlFor={criterion.id}
            className={cn(
              "text-sm leading-snug cursor-pointer select-none block",
              isSpecial ? "text-muted-foreground italic" : "text-foreground/90",
              checked && !isSpecial && "text-foreground font-medium",
            )}
          >
            {criterion.label}
          </label>

          {!isSpecial && showComment && (
            <Textarea
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              placeholder="Commentaire libre (facultatif)…"
              rows={2}
              className="text-xs resize-none min-h-0 py-2"
            />
          )}

          {!isSpecial && (
            <div className="flex items-center gap-3">
              {!showComment && (
                <button type="button" onClick={() => setShowComment(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  + Ajouter un commentaire
                </button>
              )}
              <button type="button" onClick={onToggleDocs}
                className={cn("flex items-center gap-1 text-[11px] transition-colors",
                  docOpen ? "text-blue-600" : "text-muted-foreground hover:text-blue-600")}>
                <Paperclip className="h-3 w-3" />
                Justificatifs
              </button>
            </div>
          )}

          {!isSpecial && docOpen && (
            <div className="pt-1">
              <DocumentUploader orgId={orgId} category={`nr:${criterion.id}`} question="Justificatifs liés à ce critère" compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { PILLARS, scorableCriteria } from "../data";
import type { Criterion, Section, Pillar } from "../data";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Paperclip, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NrResponseItem } from "@workspace/api-client-react";

interface Props {
  orgId: number;
  initialResponses: Record<string, boolean>;
  initialComments:  Record<string, string>;
  onSave: (responses: NrResponseItem[]) => void;
}

export function TabEvaluation({ orgId, initialResponses, initialComments, onSave }: Props) {
  const [responses, setResponses]   = useState<Record<string, boolean>>(initialResponses);
  const [comments,  setComments]    = useState<Record<string, string>>(initialComments);
  const [saving,    setSaving]      = useState(false);
  const [saved,     setSaved]       = useState(false);
  const [openDocs,  setOpenDocs]    = useState<string | null>(null); // criterionId with open doc uploader

  // Collapsed state: pillar → true = collapsed, section → true = collapsed
  const [collapsedPillars,  setCollapsedPillars]  = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Sync initial data
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && Object.keys(initialResponses).length > 0) {
      setResponses(initialResponses);
      setComments(initialComments);
      initializedRef.current = true;
    }
  }, [initialResponses, initialComments]);

  // Debounce save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (resp: Record<string, boolean>, cmts: Record<string, string>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaving(true);
        const items: NrResponseItem[] = Object.entries(resp).map(([criterionId, checked]) => ({
          criterionId,
          checked,
          comment: cmts[criterionId] ?? null,
        }));
        onSave(items);
        setTimeout(() => {
          setSaving(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }, 800);
      }, 800);
    },
    [onSave],
  );

  const handleCheck = (criterionId: string, checked: boolean) => {
    const next = { ...responses, [criterionId]: checked };
    setResponses(next);
    triggerSave(next, comments);
  };

  const handleComment = (criterionId: string, comment: string) => {
    const next = { ...comments, [criterionId]: comment };
    setComments(next);
    triggerSave(responses, next);
  };

  const togglePillar  = (pid: string) => setCollapsedPillars((s)  => ({ ...s, [pid]: !s[pid] }));
  const toggleSection = (sid: string) => setCollapsedSections((s) => ({ ...s, [sid]: !s[sid] }));

  // Section checked count
  function sectionProgress(section: Section) {
    const scorable = scorableCriteria(section.criteria);
    const checked  = scorable.filter((c) => responses[c.id]).length;
    return { checked, total: scorable.length };
  }

  // Pillar checked count
  function pillarProgress(pillar: Pillar) {
    let checked = 0, total = 0;
    for (const s of pillar.sections) {
      const p = sectionProgress(s);
      checked += p.checked;
      total   += p.total;
    }
    return { checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0 };
  }

  return (
    <div className="space-y-4">
      {/* Auto-save indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Cochez les critères que vous avez mis en œuvre. Sauvegarde automatique à chaque modification.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-24 justify-end">
          {saving && <><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</>}
          {saved  && !saving && <><Check className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">Sauvegardé</span></>}
        </div>
      </div>

      {/* Pillars */}
      {PILLARS.map((pillar) => {
        const prog = pillarProgress(pillar);
        const isCollapsed = collapsedPillars[pillar.id];

        return (
          <div key={pillar.id} className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
            {/* Pillar header */}
            <button
              onClick={() => togglePillar(pillar.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: pillar.color }}
                />
                <h2 className="text-sm font-semibold text-foreground text-left leading-snug">
                  {pillar.title}
                </h2>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${prog.pct}%`, backgroundColor: pillar.color }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: pillar.color }}>
                    {prog.pct}%
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  {prog.checked}/{prog.total}
                </Badge>
                {isCollapsed
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown  className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Sections */}
            {!isCollapsed && (
              <div className="border-t border-border divide-y divide-border">
                {pillar.sections.map((section) => {
                  const sp = sectionProgress(section);
                  const isSectionCollapsed = collapsedSections[section.id];

                  return (
                    <div key={section.id}>
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-5 py-3 bg-muted/5 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSectionCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                          <span className="text-sm text-foreground/80 text-left leading-snug">
                            {section.title}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {sp.checked}/{sp.total}
                        </span>
                      </button>

                      {/* Criteria */}
                      {!isSectionCollapsed && (
                        <div className="divide-y divide-border/50">
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
                                setOpenDocs((prev) => (prev === criterion.id ? null : criterion.id))
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
  );
}

// ── Criterion row ────────────────────────────────────────────────────────────

interface CriterionProps {
  orgId:       number;
  criterion:   Criterion;
  checked:     boolean;
  comment:     string;
  docOpen:     boolean;
  onCheck:     (v: boolean) => void;
  onComment:   (v: string)  => void;
  onToggleDocs:() => void;
}

function CriterionRow({
  orgId, criterion, checked, comment, docOpen, onCheck, onComment, onToggleDocs,
}: CriterionProps) {
  const [showComment, setShowComment] = useState(checked || !!comment);
  const isSpecial = criterion.isSpecial;

  // Show comment area when checked
  useEffect(() => {
    if (checked) setShowComment(true);
  }, [checked]);

  return (
    <div
      className={cn(
        "px-5 py-3 transition-colors",
        isSpecial ? "bg-muted/10" : "bg-white dark:bg-transparent",
        checked && !isSpecial && "bg-emerald-50/40 dark:bg-emerald-950/10",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
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

        {/* Label + actions */}
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

          {/* Comment area */}
          {!isSpecial && showComment && (
            <Textarea
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              placeholder="Commentaire libre (facultatif)…"
              rows={2}
              className="text-xs resize-none min-h-0 py-2"
            />
          )}

          {/* Actions row */}
          {!isSpecial && (
            <div className="flex items-center gap-2">
              {!showComment && (
                <button
                  onClick={() => setShowComment(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Ajouter un commentaire
                </button>
              )}
              <button
                onClick={onToggleDocs}
                className={cn(
                  "flex items-center gap-1 text-[11px] transition-colors",
                  docOpen ? "text-blue-600" : "text-muted-foreground hover:text-blue-600",
                )}
              >
                <Paperclip className="h-3 w-3" />
                Justificatifs
              </button>
            </div>
          )}

          {/* Inline doc uploader */}
          {!isSpecial && docOpen && (
            <div className="pt-1">
              <DocumentUploader
                orgId={orgId}
                category={`nr:${criterion.id}`}
                question="Justificatifs liés à ce critère"
                compact
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bloc de texte libre en fin de rapport.
 * Toujours éditable directement dans l'interface.
 */
import { ChapterWrapper, R } from "./_shared";
import { useReportEdit } from "../ReportEditContext";

export function ChapterNotesLibres({ chapterNum }: { chapterNum: number }) {
  const { overrides, setOverride } = useReportEdit();
  const key = "notes-libres";
  const value = overrides[key] ?? "";

  return (
    <ChapterWrapper num={chapterNum} title="Notes complémentaires">
      <p style={{ fontSize: 13, color: "#5B6878", lineHeight: 1.6, fontFamily: "sans-serif" }}>
        Ce bloc vous permet d'ajouter librement les remarques, informations ou commentaires de votre choix afin de personnaliser votre rapport avant son export.
      </p>

      <div style={{
        border: `1px solid ${value ? R.greenBorder : "#E2E8F0"}`,
        borderRadius: 10,
        backgroundColor: value ? R.greenBg : "#FAFAFA",
        padding: 4,
      }}>
        <textarea
          value={value}
          onChange={(e) => setOverride(key, e.target.value)}
          placeholder="Saisissez ici vos remarques, informations complémentaires, remerciements…"
          style={{
            width: "100%",
            minHeight: 180,
            fontSize: 14,
            color: "#1C2340",
            lineHeight: 1.8,
            fontFamily: "sans-serif",
            border: "none",
            outline: "none",
            resize: "vertical",
            backgroundColor: "transparent",
            padding: "12px 14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* En mode impression, on n'affiche le bloc que s'il y a du contenu */}
      <style>{`
        @media print {
          .notes-libres-hint { display: none !important; }
        }
      `}</style>
      <p className="notes-libres-hint" style={{
        fontSize: 11, color: R.muted ?? "#94A3B8",
        fontStyle: "italic", fontFamily: "sans-serif", margin: "4px 0 0",
      }}>
        Ce champ est modifiable directement. Le contenu est sauvegardé automatiquement.
      </p>
    </ChapterWrapper>
  );
}

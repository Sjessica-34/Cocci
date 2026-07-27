/**
 * Contexte d'édition du rapport illustré.
 * Permet d'activer le mode édition pour personnaliser les blocs de texte.
 * Les modifications sont sauvegardées dans localStorage.
 */
import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface ReportEditContextValue {
  editMode: boolean;
  overrides: Record<string, string>;
  setOverride: (key: string, value: string) => void;
  toggleEditMode: () => void;
}

export const ReportEditContext = createContext<ReportEditContextValue>({
  editMode: false,
  overrides: {},
  setOverride: () => {},
  toggleEditMode: () => {},
});

export function useReportEdit() {
  return useContext(ReportEditContext);
}

export function ReportEditProvider({
  orgId,
  children,
}: {
  orgId: number | null;
  children: React.ReactNode;
}) {
  const storageKey = orgId ? `rapport-overrides-${orgId}` : null;

  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    if (!storageKey) return {};
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  // Persiste à chaque changement
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(overrides));
    } catch {
      // ignore
    }
  }, [storageKey, overrides]);

  const setOverride = useCallback((key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleEditMode = useCallback(() => setEditMode((m) => !m), []);

  return (
    <ReportEditContext.Provider value={{ editMode, overrides, setOverride, toggleEditMode }}>
      {children}
    </ReportEditContext.Provider>
  );
}

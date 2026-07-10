import { useState, useEffect } from "react";
import { setExerciseOrgContext } from "./useCurrentExercise";

const STORAGE_KEY = "animpact:currentOrgId";

function readFromStorage(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

let listeners: Array<() => void> = [];
let currentValue: number | null = readFromStorage();
setExerciseOrgContext(currentValue);

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function setCurrentOrg(id: number | null) {
  currentValue = id;
  try {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  } catch {
    // ignore storage errors
  }
  setExerciseOrgContext(id);
  notifyListeners();
}

export function useCurrentOrganization() {
  const [orgId, setOrgId] = useState<number | null>(currentValue);

  useEffect(() => {
    const listener = () => setOrgId(currentValue);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return { currentOrgId: orgId, setCurrentOrg };
}

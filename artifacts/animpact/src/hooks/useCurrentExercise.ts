import { useState, useEffect } from "react";

const STORAGE_PREFIX = "animpact:currentExerciseId:";

function storageKey(orgId: number): string {
  return `${STORAGE_PREFIX}${orgId}`;
}

function readFromStorage(orgId: number): number | null {
  try {
    const raw = localStorage.getItem(storageKey(orgId));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

let listeners: Array<() => void> = [];
let currentOrgId: number | null = null;
let currentExerciseId: number | null = null;

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Sets the active organization for exercise resolution. Called by
 * useCurrentOrganization's setCurrentOrg to keep the exercise in sync
 * whenever the organization changes.
 */
export function setExerciseOrgContext(orgId: number | null) {
  if (orgId === currentOrgId) return;
  currentOrgId = orgId;
  currentExerciseId = orgId !== null ? readFromStorage(orgId) : null;
  notifyListeners();
}

export function setCurrentExercise(id: number | null) {
  currentExerciseId = id;
  if (currentOrgId !== null) {
    try {
      if (id === null) {
        localStorage.removeItem(storageKey(currentOrgId));
      } else {
        localStorage.setItem(storageKey(currentOrgId), String(id));
      }
    } catch {
      // ignore storage errors
    }
  }
  notifyListeners();
}

/** Returns the currently active exercise id, synchronously (for the api-client-react header getter). */
export function getCurrentExerciseId(): number | null {
  return currentExerciseId;
}

export function useCurrentExercise() {
  const [exerciseId, setExerciseId] = useState<number | null>(currentExerciseId);

  useEffect(() => {
    const listener = () => setExerciseId(currentExerciseId);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return { currentExerciseId: exerciseId, setCurrentExercise };
}

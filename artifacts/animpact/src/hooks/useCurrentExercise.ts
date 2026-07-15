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
 *
 * We deliberately do NOT read the stored exercise from localStorage here.
 * Stored values can be stale (e.g. a subsidiary that previously inherited the
 * group's exerciseId before it had its own exercise). Instead we reset to null
 * and let ExerciseSelector auto-select the correct exercise once the exercises
 * list loads. The no-header path in resolveExercise returns the org's latest
 * exercise automatically, so requests fired before the selection resolves are
 * handled gracefully on the backend.
 */
export function setExerciseOrgContext(orgId: number | null) {
  if (orgId === currentOrgId) return;
  currentOrgId = orgId;
  // Reset to null — ExerciseSelector will auto-select the right exercise
  // once useListExercises resolves. Do NOT read from localStorage: the stored
  // value may belong to a different org (stale after a migration or org switch).
  currentExerciseId = null;
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

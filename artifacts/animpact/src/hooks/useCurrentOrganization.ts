import { useState, useEffect } from "react";
import { setExerciseOrgContext } from "./useCurrentExercise";

const STORAGE_KEY = "animpact:currentOrgId";
let activeUserId: string | null = null;

function readFromStorage(userId = activeUserId): number | null {
  try {
    const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

let listeners: Array<() => void> = [];
let currentValue: number | null = null;
setExerciseOrgContext(currentValue);

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function setCurrentOrg(id: number | null) {
  currentValue = id;
  try {
    const key = activeUserId ? `${STORAGE_KEY}:${activeUserId}` : STORAGE_KEY;
    if (id === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(id));
    }
  } catch {
    // ignore storage errors
  }
  setExerciseOrgContext(id);
  notifyListeners();
}

export function setCurrentOrgUser(userId: string | null | undefined) {
  const nextUserId = userId ?? null;
  if (nextUserId === activeUserId) return;
  activeUserId = nextUserId;
  currentValue = readFromStorage(activeUserId);
  setExerciseOrgContext(currentValue);
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

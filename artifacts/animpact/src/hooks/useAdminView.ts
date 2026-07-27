/**
 * Admin-view impersonation context.
 *
 * When a superadmin clicks "Voir l'espace client" for a given org, this module
 * stores that org's id so the client-side GroupSwitcher can fetch its data via
 * the ?viewAs= query param instead of the admin's own orgs.
 *
 * The value is intentionally NOT persisted across page reloads — the admin
 * should always start impersonation from the admin panel.
 */

const STORAGE_KEY = "animpact:adminViewOrgId";

let listeners: Array<() => void> = [];
let currentValue: number | null = readFromSession();

function readFromSession(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function setAdminViewOrg(id: number | null) {
  currentValue = id;
  try {
    if (id === null) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, String(id));
    }
  } catch {
    // ignore
  }
  notifyListeners();
}

export function getAdminViewOrg(): number | null {
  return currentValue;
}

import { useState, useEffect } from "react";

export function useAdminViewOrg(): number | null {
  const [orgId, setOrgId] = useState<number | null>(currentValue);
  useEffect(() => {
    const listener = () => setOrgId(currentValue);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);
  return orgId;
}

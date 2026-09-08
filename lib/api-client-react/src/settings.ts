/**
 * API hooks for user settings (data export, account deletion).
 * Hand-written; not orval-generated.
 */
import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeletionRequestResponse {
  success: boolean;
  message: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Download user's personal data as a JSON file.
 * Returns a trigger function — call it directly (no mutation needed).
 */
export function useExportMyData() {
  async function triggerExport() {
    const blob = await customFetch<Blob>("/api/users/me/export", {
      responseType: "blob",
      headers: { Accept: "application/json" },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mes-donnees-cocci.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return { triggerExport };
}

/**
 * Request account deletion (GDPR Article 17).
 */
export function useRequestAccountDeletion(
  options?: UseMutationOptions<DeletionRequestResponse, Error, void>,
) {
  return useMutation<DeletionRequestResponse, Error, void>({
    mutationFn: async () => {
      return customFetch<DeletionRequestResponse>("/api/users/me/deletion-request", {
        method: "POST",
      });
    },
    ...options,
  });
}

import { useState, useCallback } from "react";
import { requestUploadUrl } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { apiUrl } from "@/lib/apiUrl";

interface UploadResult {
  objectPath: string;
  /** Ready-to-use serving URL: `/api/storage<objectPath>` */
  fileUrl: string;
}

interface UseStorageUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

function getUploadContentType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return byExtension[extension ?? ""] ?? "application/octet-stream";
}

/**
 * Two-step presigned-URL upload that uses the generated `customFetch`
 * (with the Clerk Bearer token) for step 1, then PUTs directly to GCS.
 */
export function useStorageUpload(options: UseStorageUploadOptions = {}) {
  const { currentOrgId } = useCurrentOrganization();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File, organizationId?: number | null): Promise<UploadResult | null> => {
      setError(null);
      setIsUploading(true);
      setProgress(10);
      try {
        const contentType = getUploadContentType(file);
        // Step 1 – get presigned URL (uses customFetch → Clerk Bearer token)
        const { uploadURL, objectPath } = await requestUploadUrl({
          name: file.name,
          size: file.size,
          contentType,
          organizationId: organizationId === undefined ? currentOrgId ?? undefined : organizationId ?? undefined,
        });

        setProgress(40);

        // Step 2 – upload directly to GCS (presigned URL, no auth header needed)
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });

        if (!putRes.ok) throw new Error("Échec de l'envoi vers le stockage.");
        await customFetch("/api/storage/uploads/complete", {
          method: "POST",
          body: JSON.stringify({ objectPath }),
        });

        setProgress(100);
        const result: UploadResult = {
          objectPath,
          fileUrl: apiUrl(`/api/storage${objectPath}`),
        };
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload échoué");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 600);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentOrgId],
  );

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}

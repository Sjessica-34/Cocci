import { useState, useCallback } from "react";
import { requestUploadUrl } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

interface UploadResult {
  objectPath: string;
  /** Ready-to-use serving URL: `/api/storage<objectPath>` */
  fileUrl: string;
}

interface UseStorageUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Two-step presigned-URL upload that uses the generated `customFetch`
 * (with the Clerk Bearer token) for step 1, then PUTs directly to GCS.
 */
export function useStorageUpload(options: UseStorageUploadOptions = {}) {
  const { currentOrgId } = useCurrentOrganization();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(10);
      try {
        // Step 1 – get presigned URL (uses customFetch → Clerk Bearer token)
        const { uploadURL, objectPath } = await requestUploadUrl({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          organizationId: currentOrgId ?? undefined,
        });

        setProgress(40);

        // Step 2 – upload directly to GCS (presigned URL, no auth header needed)
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!putRes.ok) throw new Error("Échec de l'envoi vers le stockage.");
        await customFetch("/api/storage/uploads/complete", {
          method: "POST",
          body: JSON.stringify({ objectPath }),
        });

        setProgress(100);
        const result: UploadResult = {
          objectPath,
          fileUrl: `/api/storage${objectPath}`,
        };
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload échoué");
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

  return { uploadFile, isUploading, progress };
}

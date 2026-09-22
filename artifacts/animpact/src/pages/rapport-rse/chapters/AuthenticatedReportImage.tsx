import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { getCurrentExerciseId, useCurrentExercise } from "@/hooks/useCurrentExercise";
import { apiUrl } from "@/lib/apiUrl";

type AuthenticatedReportImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  source: string | null | undefined;
};

function isProtectedDocumentUrl(source: string): boolean {
  try {
    const pathname = new URL(source, window.location.origin).pathname;
    return /\/api\/organizations\/\d+\/documents\/\d+\/download$/.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Renders external images directly and fetches protected document images with
 * the current user's credentials before creating a browser-safe blob URL.
 */
export function AuthenticatedReportImage({
  source,
  onError,
  ...props
}: AuthenticatedReportImageProps) {
  const { getToken } = useAuth();
  const { currentExerciseId } = useCurrentExercise();
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    setHasError(false);

    if (!source || !isProtectedDocumentUrl(source)) {
      setImageSource(source ?? null);
      return () => undefined;
    }

    setImageSource(null);

    const loadProtectedImage = async () => {
      try {
        const token = await getToken();
        const exerciseId = getCurrentExerciseId();
        const response = await fetch(apiUrl(source), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(exerciseId != null ? { "x-exercise-id": String(exerciseId) } : {}),
          },
        });

        if (!response.ok) throw new Error(`Image download failed: ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (disposed) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setImageSource(objectUrl);
        }
      } catch {
        if (!disposed) setHasError(true);
      }
    };

    void loadProtectedImage();

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentExerciseId, getToken, source]);

  if (!imageSource || hasError) return null;

  return (
    <img
      {...props}
      src={imageSource}
      alt={props.alt ?? ""}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
    />
  );
}
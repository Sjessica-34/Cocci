import { useEffect, useState, type ReactNode } from "react";

type OrganizationLogoProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallback: ReactNode;
};

export function OrganizationLogo({ src, alt, className, fallback }: OrganizationLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Builds an API URL without changing already-absolute URLs.
 *
 * Relative API paths remain usable in local development when VITE_API_URL is
 * not configured, while Render builds target the dedicated API service.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${configuredApiUrl}${normalizedPath}`;
}
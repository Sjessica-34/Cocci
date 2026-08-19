/**
 * URL publique et portable de la SPA.
 *
 * Elle est volontairement explicite : les retours Stripe et les liens envoyés
 * par email ne doivent dépendre ni du host de la requête API ni de l'hébergeur.
 */
export function getPublicAppUrl(): string {
  const configuredUrl = process.env.APP_URL?.trim();
  if (!configuredUrl) {
    throw new Error(
      "APP_URL is required for Stripe redirects and subscription emails.",
    );
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("APP_URL must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "APP_URL must not contain credentials, query parameters, or a fragment.",
    );
  }

  return url.toString().replace(/\/+$/, "");
}
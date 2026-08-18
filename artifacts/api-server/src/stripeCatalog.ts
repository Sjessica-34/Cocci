import { pool } from "@workspace/db";

/**
 * Catalogue serveur des offres vendables.
 *
 * Seuls les produits définis par Cocci sont autorisés au checkout :
 *   - formules d'onboarding par tranche d'effectif (metadata.kind = "onboarding")
 *   - formules du tableau de bord (metadata.tier ∈ tpe/pme/eti)
 * La formule (nom, plafond d'effectif) est TOUJOURS dérivée du produit Stripe —
 * jamais du client.
 */
export interface CatalogOffer {
  offerName: string;
  maxEmployees: string | null;
  effectifKey: string | null;
}

export async function resolveCatalogOffer(priceId: string): Promise<CatalogOffer | null> {
  const row = await pool.query<{
    product_name: string;
    metadata: Record<string, string> | null;
  }>(
    `SELECT p.name AS product_name, p.metadata
     FROM stripe.prices pr
     JOIN stripe.products p ON p.id = pr.product AND p.active = true
     WHERE pr.id = $1
       AND pr.active = true
       AND (
         p.metadata->>'kind' = 'onboarding'
         OR p.metadata->>'tier' IN ('tpe', 'pme', 'eti')
       )
     LIMIT 1`,
    [priceId],
  );
  if (!row.rows[0]) return null;
  const { product_name, metadata } = row.rows[0];
  return {
    offerName: product_name,
    maxEmployees: metadata?.max_employees ?? null,
    effectifKey: metadata?.effectif ?? null,
  };
}

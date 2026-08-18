/**
 * Test du catalogue serveur (resolveCatalogOffer) :
 *   1. un prix d'une formule Cocci (onboarding ou tier) est autorisé et la
 *      formule est dérivée du produit Stripe
 *   2. un prix actif mais HORS catalogue (produit sans metadata autorisée)
 *      est refusé — un admin ne peut pas souscrire à un prix arbitraire
 *
 * Usage : depuis scripts/ → pnpm exec tsx ../artifacts/api-server/src/test/stripeCatalog.test.ts
 */
import { pool } from "@workspace/db";
import { getUncachableStripeClient, getStripeSync } from "../stripeClient";
import { resolveCatalogOffer } from "../stripeCatalog";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

async function main() {
  const stripe = await getUncachableStripeClient();

  // 1. Prix autorisé (formule onboarding)
  console.log("Prix du catalogue Cocci");
  const allowedRow = await pool.query<{ id: string; name: string }>(
    `SELECT pr.id, p.name FROM stripe.prices pr
     JOIN stripe.products p ON p.id = pr.product
     WHERE pr.active AND p.active AND p.metadata->>'kind' = 'onboarding'
     LIMIT 1`,
  );
  if (!allowedRow.rows[0]) throw new Error("Aucun prix onboarding synchronisé");
  const allowed = await resolveCatalogOffer(allowedRow.rows[0].id);
  assert(allowed !== null, "prix onboarding accepté");
  assert(allowed?.offerName === allowedRow.rows[0].name, "formule dérivée du produit Stripe");
  assert(!!allowed?.maxEmployees, "plafond d'effectif dérivé des metadata produit");

  // 2. Prix actif hors catalogue → refusé
  console.log("Prix actif hors catalogue");
  const rogueProduct = await stripe.products.create({
    name: "__test_produit_hors_catalogue__",
    description: "Produit de test non autorisé au checkout",
  });
  const roguePrice = await stripe.prices.create({
    product: rogueProduct.id,
    unit_amount: 100,
    currency: "eur",
    recurring: { interval: "month" },
  });

  try {
    // Synchroniser vers stripe.* pour que le prix soit bien "actif en base"
    const sync = await getStripeSync();
    await sync.syncProducts();
    await sync.syncPrices();

    const inDb = await pool.query("SELECT 1 FROM stripe.prices WHERE id = $1 AND active", [roguePrice.id]);
    assert(inDb.rows.length === 1, "le prix hors catalogue est bien actif en base (précondition)");

    const rogue = await resolveCatalogOffer(roguePrice.id);
    assert(rogue === null, "prix actif hors catalogue REFUSÉ au checkout");

    // Prix totalement inconnu → refusé aussi
    const unknown = await resolveCatalogOffer("price_does_not_exist");
    assert(unknown === null, "prix inconnu refusé");
  } finally {
    await stripe.prices.update(roguePrice.id, { active: false }).catch(() => {});
    await stripe.products.update(rogueProduct.id, { active: false }).catch(() => {});
    await pool.query("DELETE FROM stripe.prices WHERE id = $1", [roguePrice.id]).catch(() => {});
    await pool.query("DELETE FROM stripe.products WHERE id = $1", [rogueProduct.id]).catch(() => {});
    await pool.end();
  }

  if (failures > 0) { console.error(`\n${failures} assertion(s) en échec`); process.exit(1); }
  console.log("\n✅ Test du catalogue OK");
}

main().catch((err) => { console.error(err); process.exit(1); });

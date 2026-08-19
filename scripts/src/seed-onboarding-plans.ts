/**
 * Crée dans Stripe les formules d'onboarding Cocci (une par tranche d'effectif).
 * Idempotent — recherche par metadata.effectif avant de créer.
 *
 * Usage : pnpm --filter @workspace/scripts exec tsx src/seed-onboarding-plans.ts
 *
 * Les IDs affichés en sortie sont à configurer dans les variables serveur
 * STRIPE_COCCI_PRODUCT_ID et STRIPE_COCCI_PRICE_* correspondantes.
 */
import { getUncachableStripeClient } from "./stripeClient.js";

const TRANCHES = [
  { key: "1-5",     label: "1 à 5 salariés",     amount: 1999,  maxEmployees: "5" },
  { key: "6-10",    label: "6 à 10 salariés",    amount: 2999,  maxEmployees: "10" },
  { key: "11-25",   label: "11 à 25 salariés",   amount: 3999,  maxEmployees: "25" },
  { key: "26-50",   label: "26 à 50 salariés",   amount: 5999,  maxEmployees: "50" },
  { key: "51-100",  label: "51 à 100 salariés",  amount: 8999,  maxEmployees: "100" },
  { key: "101-250", label: "101 à 250 salariés", amount: 12999, maxEmployees: "250" },
  // "250+" : sur devis — pas de prix Stripe
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  const results: { key: string; productId: string; priceId: string }[] = [];

  for (const t of TRANCHES) {
    // Produit existant ?
    const existing = await stripe.products.search({
      query: `metadata['effectif']:'${t.key}' AND active:'true'`,
    });

    let productId: string;
    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`✓ Produit "${t.label}" existe déjà (${productId})`);
    } else {
      const product = await stripe.products.create({
        name: `Cocci — ${t.label}`,
        description: `Abonnement Cocci pour les organisations de ${t.label.toLowerCase()}. Toutes les fonctionnalités incluses.`,
        metadata: { effectif: t.key, max_employees: t.maxEmployees, kind: "onboarding" },
      });
      productId = product.id;
      console.log(`✚ Produit créé : "${t.label}" (${productId})`);
    }

    // Prix mensuel existant ?
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
    let price = prices.data.find(
      (p) => p.recurring?.interval === "month" && p.unit_amount === t.amount && p.currency === "eur",
    );
    if (!price) {
      price = await stripe.prices.create({
        product: productId,
        unit_amount: t.amount,
        currency: "eur",
        recurring: { interval: "month" },
        nickname: `${(t.amount / 100).toFixed(2)} € TTC/mois`,
      });
      console.log(`   └─ Prix créé ${(t.amount / 100).toFixed(2)} €/mois → ${price.id}`);
    } else {
      console.log(`   └─ Prix existant → ${price.id}`);
    }

    results.push({ key: t.key, productId, priceId: price.id });
  }

  console.log("\n── Variables serveur du catalogue Stripe ──");
  for (const r of results) {
    console.log(`"${r.key}": productId=${r.productId} priceId=${r.priceId}`);
  }
}

seed().catch((err) => {
  console.error("Erreur :", err.message);
  process.exit(1);
});

/**
 * Crée les offres d'abonnement Cocci dans Stripe.
 * Idempotent — vérifie si les produits existent avant de les créer.
 *
 * Usage : pnpm --filter @workspace/scripts exec tsx src/seed-stripe-products.ts
 */
import { getUncachableStripeClient } from "./stripeClient.js";

const PLANS = [
  {
    name: "Cocci TPE",
    description: "Pour les TPE de moins de 50 salariés. Accès complet à toutes les fonctionnalités.",
    metadata: { tier: "tpe", max_employees: "50" },
    prices: [
      { amount: 4900, interval: "month" as const, label: "49 €/mois" },
      { amount: 49000, interval: "year" as const, label: "490 €/an (−17 %)" },
    ],
  },
  {
    name: "Cocci PME",
    description: "Pour les PME de 50 à 250 salariés. Fonctionnalités avancées + multi-entités.",
    metadata: { tier: "pme", max_employees: "250" },
    prices: [
      { amount: 9900, interval: "month" as const, label: "99 €/mois" },
      { amount: 99000, interval: "year" as const, label: "990 €/an (−17 %)" },
    ],
  },
  {
    name: "Cocci ETI",
    description: "Pour les ETI et grands groupes. Multi-entités illimité, accompagnement dédié.",
    metadata: { tier: "eti", max_employees: "5000" },
    prices: [
      { amount: 19900, interval: "month" as const, label: "199 €/mois" },
      { amount: 199000, interval: "year" as const, label: "1 990 €/an (−17 %)" },
    ],
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  for (const plan of PLANS) {
    // Vérifier si le produit existe déjà
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ "${plan.name}" existe déjà (${existing.data[0].id})`);
      continue;
    }

    // Créer le produit
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`✚ Produit créé : "${plan.name}" (${product.id})`);

    // Créer les prix
    for (const price of plan.prices) {
      const p = await stripe.prices.create({
        product: product.id,
        unit_amount: price.amount,
        currency: "eur",
        recurring: { interval: price.interval },
        nickname: price.label,
      });
      console.log(`   └─ Prix ${price.label} → ${p.id}`);
    }
  }

  console.log("\n✅ Produits Stripe créés.");
}

seedProducts().catch((err) => {
  console.error("Erreur :", err.message);
  process.exit(1);
});

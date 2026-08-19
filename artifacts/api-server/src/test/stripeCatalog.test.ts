/**
 * Test du catalogue Checkout privé.
 *
 * Les Price IDs sont lus uniquement depuis l'environnement serveur. Le client
 * n'envoie jamais d'identifiant Stripe : seulement une clé d'effectif ou une
 * action métier autorisée.
 *
 * Usage : pnpm exec tsx ../artifacts/api-server/src/test/stripeCatalog.test.ts
 */
import {
  configuredEffectifOffers,
  resolveCheckoutOffer,
} from "../stripeCatalog";

let failures = 0;

function assert(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

function main(): void {
  console.log("Catalogue des formules Cocci");
  const offers = configuredEffectifOffers();
  assert(offers.length === 6, "les six tranches payantes sont configurées côté serveur");
  assert(
    offers.every((offer) => offer.effectifKey && offer.productId && offer.priceId),
    "chaque tranche résout ses IDs Stripe depuis l'environnement",
  );

  const firstOffer = resolveCheckoutOffer({ effectifKey: "1-5" });
  assert(firstOffer?.effectifKey === "1-5", "une tranche valide résout une formule");

  assert(
    resolveCheckoutOffer({ effectifKey: "250+" }) === null,
    "la tranche sur devis ne crée pas de checkout",
  );
  assert(
    resolveCheckoutOffer({ effectifKey: "price_injected_by_client" }) === null,
    "un Price ID injecté ne peut pas sélectionner une formule",
  );
  assert(
    resolveCheckoutOffer({ action: "additional_user" })?.action === "additional_user",
    "l'extension utilisateur passe uniquement par son action métier",
  );
  assert(
    resolveCheckoutOffer({ action: "arbitrary_product" }) === null,
    "une action non autorisée est refusée",
  );

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) en échec`);
    process.exit(1);
  }
  console.log("\n✅ Test du catalogue serveur OK");
}

main();
import assert from "node:assert/strict";
import {
  calculateCarbonDetailTotals,
  calculateTravelEmissions,
  calculateUsageEmissions,
  TRAVEL_EMISSION_FACTORS,
  USAGE_EMISSION_FACTORS,
} from "../lib/rse-referentials/src/carbon.ts";

assert.equal(Object.values(TRAVEL_EMISSION_FACTORS).some((factor) => factor == null), false);

const train = {
  categoryKey: "train",
  label: "Train",
  quantity: 1000,
  unit: "km",
  emissionFactor: TRAVEL_EMISSION_FACTORS.train,
  scope: "3",
};
const product = {
  productName: "Produit électrique",
  unitsSold: 10,
  lifespanYears: 2,
  consumesEnergy: true,
  energyType: "kwh",
  consumptionPerYear: 100,
  unit: "kwh",
  country: "france",
  emissionFactor: USAGE_EMISSION_FACTORS.kwh.france,
};

assert.equal(calculateTravelEmissions("train", 1000), 0.003);
assert.equal(calculateTravelEmissions("voiture_thermique", 500), 0.071);
assert.equal(calculateUsageEmissions(product), 0.104);
assert.equal(calculateUsageEmissions({ ...product, consumesEnergy: false }), 0);

const detailed = calculateCarbonDetailTotals(
  { energie1: "1.5", utilisation: 99 },
  [train],
  [product],
);
assert.equal(detailed.travelTotal, 0.003);
assert.equal(detailed.usageTotal, 0.104);
assert.equal(detailed.byCategory.deplacements, 0.003);
assert.equal(detailed.byCategory.utilisation, 0.104);
assert.equal(detailed.globalTotal, 1.607);
assert.equal(detailed.scope1, 1.5);
assert.equal(detailed.scope3, 0.107);
assert.deepEqual(detailed.missingTravelFactors, []);

const legacy = calculateCarbonDetailTotals({
  energie1: 1,
  deplacements: 2,
  utilisation: 3,
});
assert.equal(legacy.globalTotal, 6);

console.log("carbon details tests: ok");
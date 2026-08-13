import assert from "node:assert/strict";
import test from "node:test";
import { estimateNoblePhantasmDamage } from "./calculate.js";

test("applies independent multiplicative groups", () => {
  const result = estimateNoblePhantasmDamage({
    attack: 10_000,
    npMultiplier: 12,
    cardModifier: 0.8,
    cardPerformanceUp: 50,
    attackUp: 20,
    noblePhantasmDamageUp: 30,
    specialAttackModifier: 1.5,
    classAdvantage: 2,
  });

  assert.equal(result.average, 673_920);
  assert.ok(result.minimum < result.average);
  assert.ok(result.maximum > result.average);
});

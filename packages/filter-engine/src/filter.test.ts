import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapServants } from "@fgo-wiki/domain";
import { filterServants } from "./filter.js";

test("filters Archer single-target Quick servants", () => {
  const result = filterServants(bootstrapServants, {
    classes: ["archer"],
    npColors: ["quick"],
    npScopes: ["single"],
    releasedOnly: true,
  });

  assert.deepEqual(result.map((servant) => servant.id), ["archer-baobhan-sith"]);
});

test("matches aliases and minimum charge", () => {
  const result = filterServants(bootstrapServants, {
    query: "图坦",
    minSelfCharge: 50,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "archer-tutankhamun");
});

test("filters independently evidenced NP strengthening state", () => {
  const result = filterServants(bootstrapServants, {
    npStrengthened: true,
  });

  assert.deepEqual(result.map((servant) => servant.id), ["archer-baobhan-sith"]);
});

test("requires color and scope to match the same Noble Phantasm", () => {
  const result = filterServants(bootstrapServants, {
    npColors: ["buster"],
    npScopes: ["aoe"],
  });

  assert.deepEqual(result, []);
});

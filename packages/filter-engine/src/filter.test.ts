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

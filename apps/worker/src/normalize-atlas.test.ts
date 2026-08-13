import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAtlasPayload } from "./normalize-atlas.js";

const fixture = [
  {
    id: 304400,
    collectionNo: 394,
    name: "托勒密",
    originalName: "プトレマイオス",
    className: "archer",
    rarity: 5,
    noblePhantasms: [
      {
        id: 1039401,
        name: "王之书库",
        card: "arts",
        strengthStatus: 0,
        npDistribution: [100, 200, 300, 400, 500],
        functions: [{ funcType: "damageNp", funcTargetType: "enemyAll" }],
      },
      {
        id: 1039402,
        name: "月は知らず、久遠の光",
        card: "buster",
        strengthStatus: 0,
        npDistribution: [200, 300, 500],
        functions: [{ funcType: "damageNp", funcTargetType: "enemy" }],
      },
    ],
  },
  {
    id: 990001,
    collectionNo: 0,
    name: "非图鉴对象",
    className: "unknown",
    rarity: 0,
    noblePhantasms: [],
  },
];

test("normalizes Atlas identity and NP targeting", () => {
  const { candidates, report } = normalizeAtlasPayload(fixture);
  assert.equal(report.inputCount, 2);
  assert.equal(report.acceptedCount, 1);
  assert.equal(report.skipped.length, 1);

  const servant = candidates[0];
  assert.equal(servant?.collectionNo, 394);
  assert.equal(servant?.className, "archer");
  assert.equal(servant?.noblePhantasms[0]?.color, "arts");
  assert.equal(servant?.noblePhantasms[0]?.scope, "aoe");
  assert.equal(servant?.noblePhantasms[0]?.hitCount, 5);
  assert.equal(servant?.noblePhantasms[1]?.scope, "single");
});

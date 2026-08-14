import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAtlasPayload } from "./normalize-atlas.js";

const ptolemy = {
  id: 205000,
  collectionNo: 394,
  name: "托勒密",
  originalName: "プトレマイオス",
  className: "archer",
  rarity: 5,
  noblePhantasms: [
    {
      id: 205001,
      num: 1,
      npNum: 1,
      priority: 101,
      name: "月所未知，久远之光",
      card: "2",
      strengthStatus: 0,
      npDistribution: [100, 200, 300, 400, 500],
      functions: [{ funcType: "damageNp", funcTargetType: "enemy" }],
    },
    {
      id: 205002,
      num: 1,
      npNum: 1,
      priority: 102,
      name: "王之书库",
      card: "1",
      strengthStatus: 0,
      npDistribution: [100, 200, 300, 400, 500],
      functions: [{ funcType: "damageNp", funcTargetType: "enemyAll" }],
    },
  ],
};

test("normalizes live Atlas numeric card values and NP targeting", () => {
  const { candidates, report } = normalizeAtlasPayload([
    ptolemy,
    {
      id: 990001,
      collectionNo: 0,
      name: "非图鉴对象",
      className: "unknown",
      rarity: 0,
      noblePhantasms: [],
    },
  ]);

  assert.equal(report.inputCount, 2);
  assert.equal(report.acceptedCount, 1);
  assert.equal(report.skipped.length, 1);
  assert.deepEqual(
    candidates[0]?.noblePhantasms.map((np) => [np.sourceId, np.color, np.scope]),
    [
      [205001, "buster", "single"],
      [205002, "arts", "aoe"],
    ],
  );
  assert.equal(candidates[0]?.noblePhantasms[0]?.hitCount, 5);
});

test("selects the current NP variant and ignores temporary high-priority placeholders", () => {
  const { candidates } = normalizeAtlasPayload([
    {
      id: 204300,
      collectionNo: 311,
      name: "芭万·希",
      className: "archer",
      rarity: 4,
      noblePhantasms: [
        {
          id: 204301,
          num: 1,
          npNum: 2,
          priority: 101,
          name: "痛幻哭奏",
          card: "3",
          strengthStatus: 1,
          npDistribution: [1, 1, 1, 1, 1, 1],
          functions: [{ funcType: "damageNp", funcTargetType: "enemy" }],
        },
        {
          id: 204302,
          num: 1,
          npNum: 2,
          priority: 102,
          name: "痛幻哭奏",
          card: "3",
          strengthStatus: 99,
          npDistribution: [1, 1, 1, 1, 1, 1],
          functions: [
            { funcType: "damageNpIndividualSum", funcTargetType: "enemy" },
          ],
        },
        {
          id: 204398,
          num: 98,
          npNum: 1,
          priority: 0,
          name: "战斗内临时宝具",
          card: "1",
          strengthStatus: 0,
          npDistribution: [1],
          functions: [{ funcType: "damageNp", funcTargetType: "enemyAll" }],
        },
        {
          id: 204399,
          num: 1,
          npNum: 2,
          priority: 199,
          name: "？？？",
          card: "3",
          strengthStatus: 0,
          npDistribution: [1],
          functions: [],
        },
      ],
    },
  ]);

  assert.deepEqual(candidates[0]?.noblePhantasms, [
    {
      sourceId: 204302,
      name: "痛幻哭奏",
      color: "quick",
      scope: "single",
      strengthened: true,
      hitCount: 6,
    },
  ]);
});

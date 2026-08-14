import assert from "node:assert/strict";
import test from "node:test";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import type { CnReleaseEvidenceManifest } from "./release-gate.js";
import { applyCnReleaseGate } from "./release-gate.js";

const candidates: AtlasServantCandidate[] = [
  {
    atlasId: 304400,
    collectionNo: 394,
    name: "托勒密",
    originalName: "プトレマイオス",
    className: "archer",
    rarity: 5,
    noblePhantasms: [],
  },
  {
    atlasId: 399999,
    collectionNo: 999,
    name: "未来从者",
    className: "archer",
    rarity: 5,
    noblePhantasms: [],
  },
];

const manifest: CnReleaseEvidenceManifest = {
  schemaVersion: 1,
  version: "test-r1",
  region: "CN",
  reviewedAt: "2026-08-13T00:00:00.000Z",
  entries: [
    {
      collectionNo: 394,
      servantId: "archer-ptolemy",
      displayName: "托勒密",
      aliases: ["老托"],
      expected: { className: "archer", rarity: 5 },
      release: {
        status: "released",
        releasedAt: "2024-10-24",
        evidence: {
          title: "从者介绍 - 托勒密",
          publisher: "命运-冠位指定",
          url: "https://www.bilibili.com/video/BV1Y31KYfEbp/",
          publishedAt: "2024-10-24",
        },
      },
      overrides: {
        charge: { self: 50, team: 0 },
        tags: ["变则"],
        role: ["main_dps", "sub_dps"],
        noblePhantasms: [
          {
            id: "ptolemy-buster-single",
            name: "月は知らず、久遠の光",
            color: "buster",
            scope: "single",
            strengthened: false,
            effects: ["无视防御"],
          },
        ],
      },
    },
  ],
};

test("publishes only servants with CN release source entries", () => {
  const { servants, report } = applyCnReleaseGate(candidates, manifest);
  assert.deepEqual(
    servants.map((servant) => servant.id),
    ["archer-ptolemy"],
  );
  assert.equal(servants[0]?.release.status, "released");
  assert.equal(servants[0]?.noblePhantasms[0]?.strengthened, false);
  assert.deepEqual(servants[0]?.strengthenings, []);
  assert.equal(report.passed.length, 1);
  assert.deepEqual(
    report.blocked.map((entry) => entry.collectionNo),
    [999],
  );
});

test("uses the shared official-source host rules", () => {
  const invalid = structuredClone(manifest);
  invalid.entries[0]!.release.evidence.url = "https://example.com/not-official";
  assert.throws(
    () => applyCnReleaseGate(candidates, invalid),
    /not an allowed CN official source/,
  );
});

test("rejects a pre-marked strengthening state at the release boundary", () => {
  const invalid = structuredClone(manifest);
  invalid.entries[0]!.overrides.noblePhantasms[0]!.strengthened = true;
  assert.throws(
    () => applyCnReleaseGate(candidates, invalid),
    /must be false before the CN strengthening gate/,
  );
});

test("requires a path-safe release source version", () => {
  const invalid = structuredClone(manifest);
  invalid.version = "../test-r2";
  assert.throws(
    () => applyCnReleaseGate(candidates, invalid),
    /path-safe version token/,
  );
});

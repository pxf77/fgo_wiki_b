import assert from "node:assert/strict";
import test from "node:test";
import {
  collectVersionContractErrors,
  type VersionContractInput,
  type VersionContractSide,
} from "./pr-version-contract.js";
import { rankingSourceFiles } from "./ranking-source.js";

const releaseSourcePath = "data/cn-release-evidence.json";
const strengtheningSourcePath =
  "data/cn-strengthening-evidence.json";
const productPolicyPath = "data/cn-product-policy.json";
const capabilityRulesPath = "apps/worker/src/capabilities.ts";
const rankingFormulaPath =
  "apps/worker/src/computed-rankings.ts";
const rankingLatestPath = "rankings/cn/latest.json";
const rankingDirectory = "2026-08-13";

function manifest(
  version: string,
  marker: string,
): Record<string, unknown> {
  return { version, entries: [{ marker }] };
}

function productPolicy(
  publicationPolicyVersion: string,
  capabilityRulesVersion: string,
  rankingFormulaVersion: string,
  autoPublishCollectionNoThrough = 438,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    region: "CN",
    publicationPolicyVersion,
    autoPublishCollectionNoThrough,
    capabilityRulesVersion,
    rankingFormulaVersion,
  };
}

function pointer(revision: number): Record<string, unknown> {
  return {
    asOf: "2026-08-13",
    revision,
    directory: rankingDirectory,
  };
}

function rankingFile(
  mode: string,
  revision: number,
  marker: string,
): Record<string, unknown> {
  return {
    id: `cn-2026-08-13-${mode}-r${revision}`,
    region: "CN",
    mode,
    asOf: "2026-08-13",
    revision,
    entries: [{ marker }],
  };
}

function rankingFiles(
  revision: number,
  farmingMarker: string,
): Record<string, unknown> {
  const modes: Record<
    (typeof rankingSourceFiles)[number],
    string
  > = {
    "farming-90pp.json": "farming_90pp",
    "high-difficulty.json": "high_difficulty",
    "support.json": "support",
  };
  return Object.fromEntries(
    rankingSourceFiles.map((fileName) => [
      `rankings/cn/${rankingDirectory}/${fileName}`,
      rankingFile(
        modes[fileName],
        revision,
        fileName === "farming-90pp.json"
          ? farmingMarker
          : fileName,
      ),
    ]),
  );
}

function contractInput(
  changedPaths: readonly string[],
  base: Record<string, unknown>,
  head: Record<string, unknown>,
): VersionContractInput {
  const values: Record<
    VersionContractSide,
    Record<string, unknown>
  > = {
    base,
    head,
  };
  return {
    changedPaths,
    readJson(side, path) {
      return values[side][path];
    },
  };
}

test("requires a release source version bump when semantic content changes", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [releaseSourcePath],
      {
        [releaseSourcePath]: manifest(
          "release-r1",
          "before",
        ),
      },
      {
        [releaseSourcePath]: manifest(
          "release-r1",
          "after",
        ),
      },
    ),
  );

  assert.match(
    errors.join("\n"),
    /without changing its explicit version/,
  );
});

test("accepts a source content change with an explicit version bump", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [strengtheningSourcePath],
      {
        [strengtheningSourcePath]: manifest(
          "strengthening-r1",
          "before",
        ),
      },
      {
        [strengtheningSourcePath]: manifest(
          "strengthening-r2",
          "after",
        ),
      },
    ),
  );

  assert.deepEqual(errors, []);
});

test("requires a publication policy version bump when its boundary changes", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [productPolicyPath],
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
          438,
        ),
      },
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
          439,
        ),
      },
    ),
  );

  assert.match(
    errors.join("\n"),
    /without increasing publicationPolicyVersion/,
  );
});

test("requires a ranking formula version bump when computed rules change", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [rankingFormulaPath],
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v1",
        ),
      },
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v1",
        ),
      },
    ),
  );

  assert.match(
    errors.join("\n"),
    /without increasing rankingFormulaVersion/,
  );
});

test("accepts a computed ranking change with a formula version bump", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [rankingFormulaPath, productPolicyPath],
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v1",
        ),
      },
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
        ),
      },
    ),
  );

  assert.deepEqual(errors, []);
});

test("requires a capability rule version bump when derivation code changes", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [capabilityRulesPath],
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
        ),
      },
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
        ),
      },
    ),
  );

  assert.match(
    errors.join("\n"),
    /without increasing capabilityRulesVersion/,
  );
});

test("allows the initial policy and rule version contract to be introduced", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [productPolicyPath, rankingFormulaPath],
      {},
      {
        [productPolicyPath]: productPolicy(
          "publication-v1",
          "capability-v1",
          "ranking-v2",
        ),
      },
    ),
  );

  assert.deepEqual(errors, []);
});

test("requires a ranking revision bump when ranking content changes", () => {
  const base = {
    [rankingLatestPath]: pointer(1),
    ...rankingFiles(1, "before"),
  };
  const head = {
    [rankingLatestPath]: pointer(1),
    ...rankingFiles(1, "after"),
  };
  const farmingPath =
    `rankings/cn/${rankingDirectory}/farming-90pp.json`;

  const errors = collectVersionContractErrors(
    contractInput([farmingPath], base, head),
  );

  assert.match(
    errors.join("\n"),
    /without increasing revision/,
  );
});

test("accepts ranking content after the latest revision advances", () => {
  const base = {
    [rankingLatestPath]: pointer(1),
    ...rankingFiles(1, "before"),
  };
  const head = {
    [rankingLatestPath]: pointer(2),
    ...rankingFiles(2, "after"),
  };
  const changedPaths = [
    rankingLatestPath,
    ...rankingSourceFiles.map(
      (fileName) =>
        `rankings/cn/${rankingDirectory}/${fileName}`,
    ),
  ];

  const errors = collectVersionContractErrors(
    contractInput(changedPaths, base, head),
  );

  assert.deepEqual(errors, []);
});

test("allows initial repository sources while validating the current ranking set", () => {
  const head = {
    [releaseSourcePath]: manifest("release-r1", "initial"),
    [strengtheningSourcePath]: manifest(
      "strengthening-r1",
      "initial",
    ),
    [rankingLatestPath]: pointer(1),
    ...rankingFiles(1, "initial"),
  };
  const changedPaths = [
    releaseSourcePath,
    strengtheningSourcePath,
    rankingLatestPath,
    ...rankingSourceFiles.map(
      (fileName) =>
        `rankings/cn/${rankingDirectory}/${fileName}`,
    ),
  ];

  const errors = collectVersionContractErrors(
    contractInput(changedPaths, {}, head),
  );

  assert.deepEqual(errors, []);
});

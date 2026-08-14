import assert from "node:assert/strict";
import test from "node:test";
import {
  collectVersionContractErrors,
  type VersionContractInput,
  type VersionContractSide,
} from "./pr-version-contract.js";
import { rankingSourceFiles } from "./ranking-source.js";

const releaseSourcePath = "data/cn-release-evidence.json";
const strengtheningSourcePath = "data/cn-strengthening-evidence.json";
const rankingLatestPath = "rankings/cn/latest.json";
const rankingDirectory = "2026-08-13";

function manifest(version: string, marker: string): Record<string, unknown> {
  return { version, entries: [{ marker }] };
}

function pointer(revision: number): Record<string, unknown> {
  return { asOf: "2026-08-13", revision, directory: rankingDirectory };
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
  const modes: Record<(typeof rankingSourceFiles)[number], string> = {
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
        fileName === "farming-90pp.json" ? farmingMarker : fileName,
      ),
    ]),
  );
}

function contractInput(
  changedPaths: readonly string[],
  base: Record<string, unknown>,
  head: Record<string, unknown>,
): VersionContractInput {
  const values: Record<VersionContractSide, Record<string, unknown>> = {
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
      { [releaseSourcePath]: manifest("release-r1", "before") },
      { [releaseSourcePath]: manifest("release-r1", "after") },
    ),
  );

  assert.match(errors.join("\n"), /without changing its explicit version/);
});

test("accepts a source content change with an explicit version bump", () => {
  const errors = collectVersionContractErrors(
    contractInput(
      [strengtheningSourcePath],
      {
        [strengtheningSourcePath]: manifest("strengthening-r1", "before"),
      },
      {
        [strengtheningSourcePath]: manifest("strengthening-r2", "after"),
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
  const farmingPath = `rankings/cn/${rankingDirectory}/farming-90pp.json`;

  const errors = collectVersionContractErrors(
    contractInput([farmingPath], base, head),
  );

  assert.match(errors.join("\n"), /without increasing revision/);
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
      (fileName) => `rankings/cn/${rankingDirectory}/${fileName}`,
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
    [strengtheningSourcePath]: manifest("strengthening-r1", "initial"),
    [rankingLatestPath]: pointer(1),
    ...rankingFiles(1, "initial"),
  };
  const changedPaths = [
    releaseSourcePath,
    strengtheningSourcePath,
    rankingLatestPath,
    ...rankingSourceFiles.map(
      (fileName) => `rankings/cn/${rankingDirectory}/${fileName}`,
    ),
  ];

  const errors = collectVersionContractErrors(
    contractInput(changedPaths, {}, head),
  );

  assert.deepEqual(errors, []);
});

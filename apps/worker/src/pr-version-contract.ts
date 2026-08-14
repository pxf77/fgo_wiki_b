import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { rankingSourceFiles } from "./ranking-source.js";

export type VersionContractSide = "base" | "head";

export interface VersionContractInput {
  changedPaths: readonly string[];
  readJson(side: VersionContractSide, path: string): unknown | undefined;
}

interface RankingPointer {
  asOf: string;
  revision: number;
  directory: string;
}

const releaseSourcePath = "data/cn-release-evidence.json";
const strengtheningSourcePath = "data/cn-strengthening-evidence.json";
const rankingLatestPath = "rankings/cn/latest.json";
const rankingPayloadPattern = /^rankings\/cn\/(?!latest\.json$).+\.json$/;

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const field = value[key];
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${context}.${key} must be a non-empty string`);
  }
  return field;
}

function withoutKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const ignored = new Set(keys);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !ignored.has(key)),
  );
}

function semanticChanged(
  baseValue: unknown,
  headValue: unknown,
  ignoredKeys: readonly string[],
  context: string,
): boolean {
  if (baseValue === undefined) return true;
  return !isDeepStrictEqual(
    withoutKeys(record(baseValue, `base:${context}`), ignoredKeys),
    withoutKeys(record(headValue, `head:${context}`), ignoredKeys),
  );
}

function headValue(input: VersionContractInput, path: string): unknown {
  const value = input.readJson("head", path);
  if (value === undefined) throw new Error(`versioned source cannot be deleted: ${path}`);
  return value;
}

function sourceVersion(value: unknown, path: string, side: VersionContractSide): string {
  return stringField(record(value, `${side}:${path}`), "version", `${side}:${path}`);
}

function rankingPointer(value: unknown, side: VersionContractSide): RankingPointer {
  const context = `${side}:${rankingLatestPath}`;
  const data = record(value, context);
  const asOf = stringField(data, "asOf", context);
  const directory = stringField(data, "directory", context);
  const revision = data.revision;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new TypeError(`${context}.asOf must use YYYY-MM-DD`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(directory)) {
    throw new TypeError(`${context}.directory must be path-safe`);
  }
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision <= 0) {
    throw new TypeError(`${context}.revision must be a positive integer`);
  }

  return { asOf, directory, revision };
}

function checkSourceVersion(
  input: VersionContractInput,
  changedPaths: ReadonlySet<string>,
  path: string,
  label: string,
): void {
  if (!changedPaths.has(path)) return;

  const head = headValue(input, path);
  const base = input.readJson("base", path);
  if (base === undefined) return;

  if (
    semanticChanged(base, head, ["version"], path) &&
    sourceVersion(base, path, "base") === sourceVersion(head, path, "head")
  ) {
    throw new Error(`${label} content changed without changing its explicit version`);
  }
}

function checkCurrentRankings(
  input: VersionContractInput,
  pointer: RankingPointer,
): void {
  for (const fileName of rankingSourceFiles) {
    const path = `rankings/cn/${pointer.directory}/${fileName}`;
    const data = record(headValue(input, path), `head:${path}`);
    if (data.asOf !== pointer.asOf || data.revision !== pointer.revision) {
      throw new Error(
        `${path} must match latest asOf/revision ${pointer.asOf}/r${pointer.revision}`,
      );
    }
  }
}

export function assertVersionContract(input: VersionContractInput): void {
  const changedPaths = new Set(input.changedPaths);
  checkSourceVersion(
    input,
    changedPaths,
    releaseSourcePath,
    "CN release source",
  );
  checkSourceVersion(
    input,
    changedPaths,
    strengtheningSourcePath,
    "CN strengthening source",
  );

  const rankingPaths = input.changedPaths.filter((path) =>
    rankingPayloadPattern.test(path),
  );
  if (!changedPaths.has(rankingLatestPath) && rankingPaths.length === 0) return;

  const latest = input.readJson("head", rankingLatestPath);
  if (latest === undefined) throw new Error(`${rankingLatestPath} is required`);
  const headPointer = rankingPointer(latest, "head");
  checkCurrentRankings(input, headPointer);

  const contentChanges = rankingPaths.filter((path) => {
    const head = headValue(input, path);
    return semanticChanged(
      input.readJson("base", path),
      head,
      ["id", "asOf", "revision"],
      path,
    );
  });
  if (contentChanges.length === 0) return;

  const currentPrefix = `rankings/cn/${headPointer.directory}/`;
  const historicalChange = contentChanges.find(
    (path) => !path.startsWith(currentPrefix),
  );
  if (historicalChange) {
    throw new Error(`ranking content changed outside the current directory: ${historicalChange}`);
  }

  const baseLatest = input.readJson("base", rankingLatestPath);
  if (baseLatest === undefined) return;
  const basePointer = rankingPointer(baseLatest, "base");

  if (headPointer.asOf < basePointer.asOf) {
    throw new Error("ranking content changed while latest asOf moved backwards");
  }
  if (
    headPointer.asOf === basePointer.asOf &&
    headPointer.revision <= basePointer.revision
  ) {
    throw new Error(
      `ranking content changed without increasing revision for ${headPointer.asOf}`,
    );
  }
}

export function collectVersionContractErrors(
  input: VersionContractInput,
): string[] {
  try {
    assertVersionContract(input);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function changedPaths(baseRef: string, headRef: string): string[] {
  const output = git([
    "diff",
    "--name-only",
    "--no-renames",
    `${baseRef}...${headRef}`,
  ]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function gitJsonReader(
  baseRef: string,
  headRef: string,
): VersionContractInput["readJson"] {
  const refs: Record<VersionContractSide, string> = { base: baseRef, head: headRef };
  const cache = new Map<string, unknown | undefined>();

  return (side, path) => {
    const key = `${side}:${path}`;
    if (cache.has(key)) return cache.get(key);

    let source: string;
    try {
      source = git(["show", `${refs[side]}:${path}`]);
    } catch {
      cache.set(key, undefined);
      return undefined;
    }

    const value: unknown = JSON.parse(source);
    cache.set(key, value);
    return value;
  };
}

function option(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function verifyGitVersionContract(baseRef: string, headRef: string): void {
  const paths = changedPaths(baseRef, headRef);
  assertVersionContract({
    changedPaths: paths,
    readJson: gitJsonReader(baseRef, headRef),
  });
  console.log(`Explicit version contract passed for ${paths.length} changed paths.`);
}

function main(args: readonly string[]): void {
  const normalized = args.filter((argument) => argument !== "--");
  verifyGitVersionContract(
    option(normalized, "--base"),
    option(normalized, "--head"),
  );
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(resolve(entryPoint)).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

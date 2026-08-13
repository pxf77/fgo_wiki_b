import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  NoblePhantasm,
  OfficialSource,
  Servant,
  ServantCharge,
  ServantClass,
} from "@fgo-wiki/domain";
import {
  asRecord,
  requireDate,
  requireNumber,
  requireString,
  requireStringArray,
} from "./json-validation.js";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import { assertOfficialSource } from "./official-evidence.js";

export interface CnReleaseEvidenceEntry {
  collectionNo: number;
  servantId: string;
  displayName: string;
  aliases: string[];
  expected: {
    className: ServantClass;
    rarity: Servant["rarity"];
  };
  release: {
    status: "released" | "announced";
    releasedAt: string;
    evidence: OfficialSource;
  };
  overrides: {
    charge: ServantCharge;
    tags: string[];
    role: Servant["role"];
    noblePhantasms: NoblePhantasm[];
  };
}

export interface CnReleaseEvidenceManifest {
  schemaVersion: 1;
  version: string;
  region: "CN";
  reviewedAt: string;
  entries: CnReleaseEvidenceEntry[];
}

export interface CnReleaseGateReport {
  evidenceVersion: string;
  reviewedAt: string;
  approved: Array<{
    collectionNo: number;
    servantId: string;
    atlasId: number;
    status: "released" | "announced";
    evidenceUrl: string;
  }>;
  blocked: Array<{
    collectionNo: number;
    atlasId: number;
    name: string;
    reason: string;
  }>;
}

const servantClasses = new Set<ServantClass>([
  "saber",
  "archer",
  "lancer",
  "rider",
  "caster",
  "assassin",
  "berserker",
  "ruler",
  "avenger",
  "moon_cancer",
  "alter_ego",
  "foreigner",
  "pretender",
  "shielder",
  "beast",
]);
const cardColors = new Set(["quick", "arts", "buster"]);
const noblePhantasmScopes = new Set(["single", "aoe", "support", "special"]);
const servantRoles = new Set(["main_dps", "sub_dps", "support", "plug_in", "sustain"]);

function assertNoblePhantasm(value: unknown, context: string): asserts value is NoblePhantasm {
  const record = asRecord(value, context);
  requireString(record, "id", context);
  requireString(record, "name", context);
  const color = requireString(record, "color", context);
  const scope = requireString(record, "scope", context);
  if (!cardColors.has(color)) {
    throw new TypeError(`${context}.color is invalid`);
  }
  if (!noblePhantasmScopes.has(scope)) {
    throw new TypeError(`${context}.scope is invalid`);
  }
  if (record.strengthened !== false) {
    throw new TypeError(
      `${context}.strengthened must be false before the CN strengthening gate`,
    );
  }
  requireStringArray(record, "effects", context);
  if (record.hitCount !== undefined && typeof record.hitCount !== "number") {
    throw new TypeError(`${context}.hitCount must be numeric when present`);
  }
  if (
    record.targetTraits !== undefined &&
    (!Array.isArray(record.targetTraits) ||
      record.targetTraits.some((entry) => typeof entry !== "string"))
  ) {
    throw new TypeError(`${context}.targetTraits must be a string array when present`);
  }
}

function assertEvidenceEntry(value: unknown, index: number): asserts value is CnReleaseEvidenceEntry {
  const context = `entries[${index}]`;
  const record = asRecord(value, context);
  const collectionNo = requireNumber(record, "collectionNo", context);
  if (!Number.isInteger(collectionNo) || collectionNo <= 0) {
    throw new TypeError(`${context}.collectionNo must be a positive integer`);
  }
  requireString(record, "servantId", context);
  requireString(record, "displayName", context);
  requireStringArray(record, "aliases", context);

  const expected = asRecord(record.expected, `${context}.expected`);
  const className = requireString(expected, "className", `${context}.expected`);
  const rarity = requireNumber(expected, "rarity", `${context}.expected`);
  if (!servantClasses.has(className as ServantClass)) {
    throw new TypeError(`${context}.expected.className is invalid`);
  }
  if (!Number.isInteger(rarity) || rarity < 1 || rarity > 5) {
    throw new TypeError(`${context}.expected.rarity is invalid`);
  }

  const release = asRecord(record.release, `${context}.release`);
  const status = requireString(release, "status", `${context}.release`);
  if (status !== "released" && status !== "announced") {
    throw new TypeError(`${context}.release.status is invalid`);
  }
  const releasedAt = requireString(release, "releasedAt", `${context}.release`);
  requireDate(releasedAt, `${context}.release.releasedAt`);
  assertOfficialSource(release.evidence, `${context}.release.evidence`);

  const overrides = asRecord(record.overrides, `${context}.overrides`);
  const charge = asRecord(overrides.charge, `${context}.overrides.charge`);
  for (const key of ["self", "team"] as const) {
    const amount = requireNumber(charge, key, `${context}.overrides.charge`);
    if (amount < 0 || amount > 100) {
      throw new TypeError(`${context}.overrides.charge.${key} is out of range`);
    }
  }
  if (charge.target !== undefined && typeof charge.target !== "number") {
    throw new TypeError(`${context}.overrides.charge.target must be numeric when present`);
  }
  requireStringArray(overrides, "tags", `${context}.overrides`);

  if (!Array.isArray(overrides.role) || overrides.role.length === 0) {
    throw new TypeError(`${context}.overrides.role must be a non-empty array`);
  }
  for (const role of overrides.role) {
    if (typeof role !== "string" || !servantRoles.has(role)) {
      throw new TypeError(`${context}.overrides.role contains an invalid value`);
    }
  }

  if (!Array.isArray(overrides.noblePhantasms) || overrides.noblePhantasms.length === 0) {
    throw new TypeError(`${context}.overrides.noblePhantasms must be a non-empty array`);
  }
  overrides.noblePhantasms.forEach((entry, npIndex) =>
    assertNoblePhantasm(entry, `${context}.overrides.noblePhantasms[${npIndex}]`),
  );
}

export function assertCnReleaseEvidenceManifest(
  value: unknown,
): asserts value is CnReleaseEvidenceManifest {
  const record = asRecord(value, "CN release evidence");
  if (record.schemaVersion !== 1 || record.region !== "CN") {
    throw new TypeError("CN release evidence schemaVersion or region is invalid");
  }
  requireString(record, "version", "CN release evidence");
  const reviewedAt = requireString(record, "reviewedAt", "CN release evidence");
  requireDate(reviewedAt, "CN release evidence.reviewedAt");
  if (!Array.isArray(record.entries)) {
    throw new TypeError("CN release evidence.entries must be an array");
  }
  record.entries.forEach(assertEvidenceEntry);
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => value !== undefined && value.length > 0),
    ),
  ];
}

function cloneNoblePhantasm(noblePhantasm: NoblePhantasm): NoblePhantasm {
  return {
    ...noblePhantasm,
    effects: [...noblePhantasm.effects],
    ...(noblePhantasm.targetTraits
      ? { targetTraits: [...noblePhantasm.targetTraits] }
      : {}),
  };
}

export function applyCnReleaseGate(
  candidates: readonly AtlasServantCandidate[],
  evidenceValue: unknown,
): { servants: Servant[]; report: CnReleaseGateReport } {
  assertCnReleaseEvidenceManifest(evidenceValue);
  const manifest = evidenceValue;
  const candidatesByCollectionNo = new Map(
    candidates.map((candidate) => [candidate.collectionNo, candidate] as const),
  );
  const collectionNoByServantId = new Map(
    manifest.entries.map((entry) => [entry.servantId, entry.collectionNo] as const),
  );
  const evidenceCollectionNumbers = new Set<number>();
  const servantIds = new Set<string>();
  const servants: Servant[] = [];
  const approved: CnReleaseGateReport["approved"] = [];

  for (const entry of manifest.entries) {
    if (evidenceCollectionNumbers.has(entry.collectionNo)) {
      throw new Error(`Duplicate CN release evidence for collectionNo ${entry.collectionNo}`);
    }
    if (servantIds.has(entry.servantId)) {
      throw new Error(`Duplicate CN servantId ${entry.servantId}`);
    }
    evidenceCollectionNumbers.add(entry.collectionNo);
    servantIds.add(entry.servantId);

    const candidate = candidatesByCollectionNo.get(entry.collectionNo);
    if (candidate === undefined) {
      throw new Error(`CN release evidence ${entry.servantId} has no Atlas candidate`);
    }
    if (
      candidate.className !== entry.expected.className ||
      candidate.rarity !== entry.expected.rarity
    ) {
      throw new Error(
        `Atlas identity mismatch for ${entry.servantId}: expected ${entry.expected.className}/${entry.expected.rarity}, got ${candidate.className}/${candidate.rarity}`,
      );
    }

    servants.push({
      id: entry.servantId,
      atlasId: candidate.atlasId,
      name: entry.displayName,
      aliases: uniqueStrings([
        ...entry.aliases,
        candidate.name,
        candidate.originalName,
      ]).filter((alias) => alias !== entry.displayName),
      className: candidate.className,
      rarity: candidate.rarity,
      release: {
        region: "CN",
        status: entry.release.status,
        releasedAt: entry.release.releasedAt,
        evidenceUrl: entry.release.evidence.url,
      },
      noblePhantasms: entry.overrides.noblePhantasms.map(cloneNoblePhantasm),
      strengthenings: [],
      charge: { ...entry.overrides.charge },
      tags: uniqueStrings(entry.overrides.tags),
      role: [...entry.overrides.role],
      updatedAt: manifest.reviewedAt.slice(0, 10),
    });
    approved.push({
      collectionNo: entry.collectionNo,
      servantId: entry.servantId,
      atlasId: candidate.atlasId,
      status: entry.release.status,
      evidenceUrl: entry.release.evidence.url,
    });
  }

  servants.sort(
    (left, right) =>
      (collectionNoByServantId.get(left.id) ?? 0) -
      (collectionNoByServantId.get(right.id) ?? 0),
  );

  const blocked = candidates
    .filter((candidate) => !evidenceCollectionNumbers.has(candidate.collectionNo))
    .map((candidate) => ({
      collectionNo: candidate.collectionNo,
      atlasId: candidate.atlasId,
      name: candidate.name,
      reason: "no reviewed CN official release evidence",
    }));

  return {
    servants,
    report: {
      evidenceVersion: manifest.version,
      reviewedAt: manifest.reviewedAt,
      approved,
      blocked,
    },
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCnReleaseGateFiles(
  candidatePath: string,
  evidencePath: string,
  servantPath: string,
  reportPath: string,
): Promise<CnReleaseGateReport> {
  const candidateValue: unknown = JSON.parse(await readFile(candidatePath, "utf8"));
  if (!Array.isArray(candidateValue)) {
    throw new TypeError("Atlas normalized candidates must be an array");
  }
  const evidenceValue: unknown = JSON.parse(await readFile(evidencePath, "utf8"));
  const { servants, report } = applyCnReleaseGate(
    candidateValue as AtlasServantCandidate[],
    evidenceValue,
  );
  await writeJson(servantPath, servants);
  await writeJson(reportPath, report);
  return report;
}

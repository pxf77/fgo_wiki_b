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
import type {
  AtlasNoblePhantasmCandidate,
  AtlasServantCandidate,
} from "./normalize-atlas.js";
import { assertOfficialSource } from "./official-evidence.js";

export interface CnReleaseEvidenceEntry {
  collectionNo: number;
  servantId: string;
  displayName: string;
  aliases: string[];
  expected: { className: ServantClass; rarity: Servant["rarity"] };
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
  autoPublishClasses?: ServantClass[];
  entries: CnReleaseEvidenceEntry[];
}

export interface CnReleaseGateReport {
  evidenceVersion: string;
  reviewedAt: string;
  passed: Array<{
    collectionNo: number;
    servantId: string;
    atlasId: number;
    status: "released" | "announced";
    source?: "atlas_cn" | "curated";
    evidenceUrl?: string;
  }>;
  blocked: Array<{
    collectionNo: number;
    atlasId: number;
    name: string;
    reason: string;
  }>;
}

const servantClasses = new Set<ServantClass>([
  "saber", "archer", "lancer", "rider", "caster", "assassin", "berserker",
  "ruler", "avenger", "moon_cancer", "alter_ego", "foreigner", "pretender",
  "shielder", "beast",
]);
const cardColors = new Set(["quick", "arts", "buster"]);
const noblePhantasmScopes = new Set(["single", "aoe", "support", "special"]);
const servantRoles = new Set(["main_dps", "sub_dps", "support", "plug_in", "sustain"]);

function assertNoblePhantasm(value: unknown, context: string): asserts value is NoblePhantasm {
  const record = asRecord(value, context);
  requireString(record, "id", context);
  const atlasSourceId = requireNumber(record, "atlasSourceId", context);
  if (!Number.isInteger(atlasSourceId) || atlasSourceId <= 0) {
    throw new TypeError(`${context}.atlasSourceId must be a positive integer`);
  }
  requireString(record, "name", context);
  const color = requireString(record, "color", context);
  const scope = requireString(record, "scope", context);
  if (!cardColors.has(color)) throw new TypeError(`${context}.color is invalid`);
  if (!noblePhantasmScopes.has(scope)) throw new TypeError(`${context}.scope is invalid`);
  if (record.strengthened !== false) {
    throw new TypeError(`${context}.strengthened must be false before the CN strengthening gate for curated release overrides`);
  }
  requireStringArray(record, "effects", context);
  if (record.hitCount !== undefined && typeof record.hitCount !== "number") {
    throw new TypeError(`${context}.hitCount must be numeric when present`);
  }
  if (
    record.targetTraits !== undefined &&
    (!Array.isArray(record.targetTraits) || record.targetTraits.some((entry) => typeof entry !== "string"))
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
  if (!servantClasses.has(className as ServantClass)) throw new TypeError(`${context}.expected.className is invalid`);
  if (!Number.isInteger(rarity) || rarity < 1 || rarity > 5) throw new TypeError(`${context}.expected.rarity is invalid`);

  const release = asRecord(record.release, `${context}.release`);
  const status = requireString(release, "status", `${context}.release`);
  if (status !== "released" && status !== "announced") throw new TypeError(`${context}.release.status is invalid`);
  const releasedAt = requireString(release, "releasedAt", `${context}.release`);
  requireDate(releasedAt, `${context}.release.releasedAt`);
  assertOfficialSource(release.evidence, `${context}.release.evidence`);

  const overrides = asRecord(record.overrides, `${context}.overrides`);
  const charge = asRecord(overrides.charge, `${context}.overrides.charge`);
  for (const key of ["self", "team"] as const) {
    const amount = requireNumber(charge, key, `${context}.overrides.charge`);
    if (amount < 0 || amount > 100) throw new TypeError(`${context}.overrides.charge.${key} is out of range`);
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

export function assertCnReleaseEvidenceManifest(value: unknown): asserts value is CnReleaseEvidenceManifest {
  const record = asRecord(value, "CN release evidence");
  if (record.schemaVersion !== 1 || record.region !== "CN") {
    throw new TypeError("CN release evidence schemaVersion or region is invalid");
  }
  requireString(record, "version", "CN release evidence");
  const reviewedAt = requireString(record, "reviewedAt", "CN release evidence");
  requireDate(reviewedAt, "CN release evidence.reviewedAt");
  if (record.autoPublishClasses !== undefined) {
    if (
      !Array.isArray(record.autoPublishClasses) ||
      record.autoPublishClasses.some((entry) => typeof entry !== "string" || !servantClasses.has(entry as ServantClass))
    ) {
      throw new TypeError("CN release evidence.autoPublishClasses is invalid");
    }
  }
  if (!Array.isArray(record.entries)) throw new TypeError("CN release evidence.entries must be an array");
  record.entries.forEach(assertEvidenceEntry);
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined && value.length > 0))];
}

function mergedCuratedNoblePhantasm(
  noblePhantasm: NoblePhantasm,
  atlasNp: AtlasNoblePhantasmCandidate,
): NoblePhantasm {
  return {
    ...noblePhantasm,
    effects: [...noblePhantasm.effects],
    ...(noblePhantasm.targetTraits ? { targetTraits: [...noblePhantasm.targetTraits] } : {}),
    ...(atlasNp.damageMultipliers ? { damageMultipliers: [...atlasNp.damageMultipliers] } : {}),
    ...(atlasNp.specialAttackMultiplier ? { specialAttackMultiplier: atlasNp.specialAttackMultiplier } : {}),
  };
}

function assertAtlasNoblePhantasmMappings(
  entry: CnReleaseEvidenceEntry,
  candidate: AtlasServantCandidate,
): Map<number, AtlasNoblePhantasmCandidate> {
  const atlasNps = new Map(candidate.noblePhantasms.map((np) => [np.sourceId, np] as const));
  const mappedSourceIds = new Set<number>();
  for (const noblePhantasm of entry.overrides.noblePhantasms) {
    const sourceId = noblePhantasm.atlasSourceId;
    if (sourceId === undefined) throw new Error(`${entry.servantId} NP ${noblePhantasm.id} has no Atlas source mapping`);
    if (mappedSourceIds.has(sourceId)) throw new Error(`${entry.servantId} maps Atlas NP ${sourceId} more than once`);
    mappedSourceIds.add(sourceId);
    const atlasNp = atlasNps.get(sourceId);
    if (!atlasNp) throw new Error(`${entry.servantId} NP ${noblePhantasm.id} references unknown Atlas NP ${sourceId}`);
    if (atlasNp.color !== noblePhantasm.color || atlasNp.scope !== noblePhantasm.scope) {
      throw new Error(`${entry.servantId} NP ${noblePhantasm.id} does not match Atlas card/scope`);
    }
    if (atlasNp.hitCount !== undefined && noblePhantasm.hitCount !== undefined && atlasNp.hitCount !== noblePhantasm.hitCount) {
      throw new Error(`${entry.servantId} NP ${noblePhantasm.id} does not match Atlas hit count`);
    }
  }
  return atlasNps;
}

function derivedTags(candidate: AtlasServantCandidate): string[] {
  const tags: string[] = [];
  const charge = candidate.charge ?? { self: 0, team: 0 };
  for (const np of candidate.noblePhantasms) {
    tags.push(np.scope === "single" ? "单体宝具" : np.scope === "aoe" ? "全体宝具" : "辅助宝具");
    tags.push(np.color === "quick" ? "Quick" : np.color === "arts" ? "Arts" : "Buster");
    if (np.strengthened) tags.push("已强化宝具");
    if ((np.specialAttackMultiplier ?? 1) > 1) tags.push("条件特攻");
  }
  if (charge.self > 0) tags.push(`${charge.self}自充`);
  if (charge.team > 0) tags.push("群充");
  if ((charge.target ?? 0) > 0) tags.push("单体充能");
  if (candidate.profile === "support") tags.push("辅助定位");
  if (candidate.profile === "hybrid") tags.push("攻辅混合");
  return uniqueStrings(tags);
}

function autoNoblePhantasm(
  candidate: AtlasServantCandidate,
  np: AtlasNoblePhantasmCandidate,
  index: number,
): NoblePhantasm {
  return {
    id: `${candidate.className}-c${candidate.collectionNo}-np-${index + 1}`,
    atlasSourceId: np.sourceId,
    name: np.name,
    color: np.color,
    scope: np.scope,
    strengthened: np.strengthened,
    effects: (np.specialAttackMultiplier ?? 1) > 1 ? ["条件特攻"] : [],
    ...(np.hitCount !== undefined ? { hitCount: np.hitCount } : {}),
    ...(np.damageMultipliers ? { damageMultipliers: [...np.damageMultipliers] } : {}),
    ...(np.specialAttackMultiplier ? { specialAttackMultiplier: np.specialAttackMultiplier } : {}),
  };
}

function autoRoles(candidate: AtlasServantCandidate): Servant["role"] {
  if (candidate.profile === "support") return ["support"];
  if (candidate.profile === "hybrid") return ["main_dps", "support"];
  return ["main_dps"];
}

function autoServant(candidate: AtlasServantCandidate, reviewedAt: string): Servant {
  return {
    id: `${candidate.className}-c${candidate.collectionNo}`,
    atlasId: candidate.atlasId,
    name: candidate.name,
    aliases: uniqueStrings([candidate.originalName]).filter((name) => name !== candidate.name),
    className: candidate.className,
    rarity: candidate.rarity,
    ...(candidate.atkMax !== undefined ? { atkMax: candidate.atkMax } : {}),
    release: { region: "CN", status: "released", source: "atlas_cn" },
    noblePhantasms: candidate.noblePhantasms.map((np, index) => autoNoblePhantasm(candidate, np, index)),
    strengthenings: [],
    charge: { ...(candidate.charge ?? { self: 0, team: 0 }) },
    ...(candidate.profile ? { profile: candidate.profile } : {}),
    ...(candidate.capabilities ? { capabilities: { ...candidate.capabilities } } : {}),
    tags: derivedTags(candidate),
    role: autoRoles(candidate),
    updatedAt: reviewedAt.slice(0, 10),
  };
}

export function applyCnReleaseGate(
  candidates: readonly AtlasServantCandidate[],
  evidenceValue: unknown,
): { servants: Servant[]; report: CnReleaseGateReport } {
  assertCnReleaseEvidenceManifest(evidenceValue);
  const manifest = evidenceValue;
  const candidatesByCollectionNo = new Map(candidates.map((candidate) => [candidate.collectionNo, candidate] as const));
  const evidenceCollectionNumbers = new Set<number>();
  const servantIds = new Set<string>();
  const servants: Servant[] = [];
  const passed: CnReleaseGateReport["passed"] = [];

  for (const entry of manifest.entries) {
    if (evidenceCollectionNumbers.has(entry.collectionNo)) throw new Error(`Duplicate CN release evidence for collectionNo ${entry.collectionNo}`);
    if (servantIds.has(entry.servantId)) throw new Error(`Duplicate CN servantId ${entry.servantId}`);
    evidenceCollectionNumbers.add(entry.collectionNo);
    servantIds.add(entry.servantId);
    const candidate = candidatesByCollectionNo.get(entry.collectionNo);
    if (!candidate) throw new Error(`CN release evidence ${entry.servantId} has no Atlas candidate`);
    if (candidate.className !== entry.expected.className || candidate.rarity !== entry.expected.rarity) {
      throw new Error(`Atlas identity mismatch for ${entry.servantId}: expected ${entry.expected.className}/${entry.expected.rarity}, got ${candidate.className}/${candidate.rarity}`);
    }
    const atlasNps = assertAtlasNoblePhantasmMappings(entry, candidate);
    servants.push({
      id: entry.servantId,
      atlasId: candidate.atlasId,
      name: entry.displayName,
      aliases: uniqueStrings([...entry.aliases, candidate.name, candidate.originalName]).filter((alias) => alias !== entry.displayName),
      className: candidate.className,
      rarity: candidate.rarity,
      ...(candidate.atkMax !== undefined ? { atkMax: candidate.atkMax } : {}),
      release: {
        region: "CN",
        status: entry.release.status,
        source: "curated",
        releasedAt: entry.release.releasedAt,
        evidenceUrl: entry.release.evidence.url,
        evidence: { ...entry.release.evidence },
      },
      noblePhantasms: entry.overrides.noblePhantasms.map((np) => mergedCuratedNoblePhantasm(np, atlasNps.get(np.atlasSourceId!)!)),
      strengthenings: [],
      charge: { ...entry.overrides.charge },
      ...(candidate.profile ? { profile: candidate.profile } : {}),
      ...(candidate.capabilities ? { capabilities: { ...candidate.capabilities } } : {}),
      tags: uniqueStrings([...entry.overrides.tags, ...derivedTags(candidate)]),
      role: [...entry.overrides.role],
      updatedAt: manifest.reviewedAt.slice(0, 10),
    });
    passed.push({
      collectionNo: entry.collectionNo,
      servantId: entry.servantId,
      atlasId: candidate.atlasId,
      status: entry.release.status,
      source: "curated",
      evidenceUrl: entry.release.evidence.url,
    });
  }

  const autoPublishClasses = new Set(manifest.autoPublishClasses ?? []);
  for (const candidate of candidates) {
    if (evidenceCollectionNumbers.has(candidate.collectionNo) || !autoPublishClasses.has(candidate.className)) continue;
    const servant = autoServant(candidate, manifest.reviewedAt);
    if (servantIds.has(servant.id)) throw new Error(`Duplicate auto CN servantId ${servant.id}`);
    servantIds.add(servant.id);
    servants.push(servant);
    passed.push({
      collectionNo: candidate.collectionNo,
      servantId: servant.id,
      atlasId: candidate.atlasId,
      status: "released",
      source: "atlas_cn",
    });
  }

  servants.sort((left, right) => (left.atlasId ?? 0) - (right.atlasId ?? 0));
  const passedCollectionNumbers = new Set(passed.map((entry) => entry.collectionNo));
  const blocked = candidates
    .filter((candidate) => !passedCollectionNumbers.has(candidate.collectionNo))
    .map((candidate) => ({
      collectionNo: candidate.collectionNo,
      atlasId: candidate.atlasId,
      name: candidate.name,
      reason: "class is not auto-published and has no curated CN release source",
    }));

  return {
    servants,
    report: { evidenceVersion: manifest.version, reviewedAt: manifest.reviewedAt, passed, blocked },
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
  if (!Array.isArray(candidateValue)) throw new TypeError("Atlas normalized candidates must be an array");
  const evidenceValue: unknown = JSON.parse(await readFile(evidencePath, "utf8"));
  const { servants, report } = applyCnReleaseGate(candidateValue as AtlasServantCandidate[], evidenceValue);
  await writeJson(servantPath, servants);
  await writeJson(reportPath, report);
  return report;
}

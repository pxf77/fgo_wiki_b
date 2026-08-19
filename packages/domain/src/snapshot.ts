import { servantClasses, type DatasetSnapshot } from "./model.js";
import {
  assertDatasetSourceVersions,
  assertDatasetVersion,
} from "./versioning.js";

type JsonRecord = Record<string, unknown>;

const cardColors = new Set(["quick", "arts", "buster"]);
const noblePhantasmScopes = new Set(["single", "aoe", "support", "special"]);
const releaseStatuses = new Set(["released", "announced", "unreleased"]);
const releaseSources = new Set(["atlas_cn", "curated"]);
const servantProfiles = new Set([
  "attacker_single",
  "attacker_aoe",
  "support",
  "hybrid",
]);
const servantRoles = new Set([
  "main_dps",
  "sub_dps",
  "support",
  "plug_in",
  "sustain",
]);
const rankingModes = new Set([
  "farming",
  "farming_90pp",
  "high_difficulty",
  "support",
  "np1_value",
  "np5_value",
]);
const tiers = new Set(["EX", "T0", "T0.5", "T1", "T1.5", "T2", "T3"]);
const confidences = new Set(["high", "medium", "provisional", "computed"]);
const rankingOrigins = new Set(["editorial", "computed", "mixed"]);
const craftEssenceProfiles = new Set(["none", "event_50", "black_grail"]);
const capabilityKeys = [
  "offense",
  "support",
  "survival",
  "control",
  "cleanse",
  "pierce",
  "cooldown",
  "critical",
] as const;
const rankingDimensionKeys = new Set([
  "damage",
  "charge",
  "looping",
  "multicore",
  "utility",
  "survivability",
  "stability",
]);

function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as JsonRecord;
}

function asArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${context} must be an array`);
  }
  return value;
}

function requireString(
  record: JsonRecord,
  key: string,
  context: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context}.${key} must be a non-empty string`);
  }
  return value.trim();
}

function assertOptionalString(
  value: unknown,
  context: string,
): asserts value is string | undefined {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    throw new TypeError(`${context} must be a non-empty string when present`);
  }
}

function requireFiniteNumber(
  record: JsonRecord,
  key: string,
  context: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${context}.${key} must be a finite number`);
  }
  return value;
}

function assertOptionalFiniteNumber(
  value: unknown,
  context: string,
): asserts value is number | undefined {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new TypeError(`${context} must be a finite number when present`);
  }
}

function requirePositiveInteger(
  record: JsonRecord,
  key: string,
  context: string,
): number {
  const value = requireFiniteNumber(record, key, context);
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${context}.${key} must be a positive integer`);
  }
  return value;
}

function requireBoolean(
  record: JsonRecord,
  key: string,
  context: string,
): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`${context}.${key} must be boolean`);
  }
  return value;
}

function assertEnum(
  value: unknown,
  allowed: ReadonlySet<string>,
  context: string,
): asserts value is string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TypeError(`${context} is invalid`);
  }
}

function assertStringArray(value: unknown, context: string): string[] {
  const entries = asArray(value, context);
  if (entries.some((entry) => typeof entry !== "string")) {
    throw new TypeError(`${context} must contain only strings`);
  }
  return entries as string[];
}

function assertDate(value: unknown, context: string): asserts value is string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${context} must be an ISO-compatible date`);
  }
}

function assertUrl(value: unknown, context: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${context} must be a URL`);
  }
  try {
    new URL(value);
  } catch {
    throw new TypeError(`${context} must be a URL`);
  }
}

function assertOfficialSource(value: unknown, context: string): void {
  const source = asRecord(value, context);
  requireString(source, "title", context);
  requireString(source, "publisher", context);
  assertUrl(source.url, `${context}.url`);
  assertDate(source.publishedAt, `${context}.publishedAt`);
}

function assertRelease(value: unknown, context: string): void {
  const release = asRecord(value, context);
  if (release.region !== "CN") {
    throw new TypeError(`${context}.region must be CN`);
  }
  assertEnum(release.status, releaseStatuses, `${context}.status`);
  if (release.source !== undefined) {
    assertEnum(release.source, releaseSources, `${context}.source`);
  }
  if (release.releasedAt !== undefined) {
    assertDate(release.releasedAt, `${context}.releasedAt`);
  }
  if (release.evidenceUrl !== undefined) {
    assertUrl(release.evidenceUrl, `${context}.evidenceUrl`);
  }
  if (release.evidence !== undefined) {
    assertOfficialSource(release.evidence, `${context}.evidence`);
  }
}

function assertNoblePhantasm(value: unknown, context: string): string {
  const noblePhantasm = asRecord(value, context);
  const id = requireString(noblePhantasm, "id", context);
  if (noblePhantasm.atlasSourceId !== undefined) {
    const sourceId = noblePhantasm.atlasSourceId;
    if (
      typeof sourceId !== "number" ||
      !Number.isInteger(sourceId) ||
      sourceId <= 0
    ) {
      throw new TypeError(`${context}.atlasSourceId must be a positive integer`);
    }
  }
  requireString(noblePhantasm, "name", context);
  assertEnum(noblePhantasm.color, cardColors, `${context}.color`);
  assertEnum(noblePhantasm.scope, noblePhantasmScopes, `${context}.scope`);
  requireBoolean(noblePhantasm, "strengthened", context);
  if (noblePhantasm.hitCount !== undefined) {
    const hitCount = noblePhantasm.hitCount;
    if (
      typeof hitCount !== "number" ||
      !Number.isInteger(hitCount) ||
      hitCount <= 0
    ) {
      throw new TypeError(`${context}.hitCount must be a positive integer`);
    }
  }
  if (noblePhantasm.targetTraits !== undefined) {
    assertStringArray(noblePhantasm.targetTraits, `${context}.targetTraits`);
  }
  assertStringArray(noblePhantasm.effects, `${context}.effects`);
  if (noblePhantasm.damageMultipliers !== undefined) {
    const multipliers = asArray(
      noblePhantasm.damageMultipliers,
      `${context}.damageMultipliers`,
    );
    if (
      multipliers.some(
        (entry) =>
          typeof entry !== "number" ||
          !Number.isFinite(entry) ||
          entry <= 0,
      )
    ) {
      throw new TypeError(
        `${context}.damageMultipliers must contain positive finite numbers`,
      );
    }
  }
  if (noblePhantasm.specialAttackMultiplier !== undefined) {
    const multiplier = noblePhantasm.specialAttackMultiplier;
    if (
      typeof multiplier !== "number" ||
      !Number.isFinite(multiplier) ||
      multiplier < 1
    ) {
      throw new TypeError(
        `${context}.specialAttackMultiplier must be at least 1`,
      );
    }
  }
  return id;
}

function assertStrengtheningEvent(
  value: unknown,
  context: string,
  noblePhantasmIds: ReadonlySet<string>,
): string {
  const event = asRecord(value, context);
  const id = requireString(event, "id", context);
  assertEnum(
    event.status,
    new Set(["released", "announced"]),
    `${context}.status`,
  );
  const target = asRecord(event.target, `${context}.target`);
  const targetType = requireString(target, "type", `${context}.target`);
  const targetId = requireString(target, "targetId", `${context}.target`);
  requireString(target, "targetName", `${context}.target`);
  if (targetType === "noble_phantasm") {
    if (!noblePhantasmIds.has(targetId)) {
      throw new TypeError(
        `${context}.target.targetId references an unknown Noble Phantasm`,
      );
    }
  } else if (targetType === "skill") {
    const slot = requirePositiveInteger(target, "slot", `${context}.target`);
    if (slot > 3) {
      throw new TypeError(`${context}.target.slot must be 1, 2 or 3`);
    }
  } else {
    throw new TypeError(`${context}.target.type is invalid`);
  }
  assertDate(event.releasedAt, `${context}.releasedAt`);
  assertOfficialSource(event.evidence, `${context}.evidence`);
  assertStringArray(event.summary, `${context}.summary`);
  return id;
}

function assertCharge(value: unknown, context: string): void {
  const charge = asRecord(value, context);
  for (const key of ["self", "team"] as const) {
    const amount = requireFiniteNumber(charge, key, context);
    if (amount < 0) {
      throw new TypeError(`${context}.${key} must be non-negative`);
    }
  }
  assertOptionalFiniteNumber(charge.target, `${context}.target`);
  if (typeof charge.target === "number" && charge.target < 0) {
    throw new TypeError(`${context}.target must be non-negative`);
  }
}

function assertCapabilities(value: unknown, context: string): void {
  const capabilities = asRecord(value, context);
  for (const key of capabilityKeys) {
    const score = requireFiniteNumber(capabilities, key, context);
    if (score < 0 || score > 100) {
      throw new TypeError(`${context}.${key} must be between 0 and 100`);
    }
  }
}

function assertUnique(values: readonly string[], context: string): void {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${context} must not contain duplicates`);
  }
}

function assertServant(
  value: unknown,
  index: number,
): { id: string; atlasId?: number; strengtheningIds: string[] } {
  const context = `Dataset snapshot servants[${index}]`;
  const servant = asRecord(value, context);
  const id = requireString(servant, "id", context);
  let atlasId: number | undefined;
  if (servant.atlasId !== undefined) {
    if (
      typeof servant.atlasId !== "number" ||
      !Number.isInteger(servant.atlasId) ||
      servant.atlasId <= 0
    ) {
      throw new TypeError(`${context}.atlasId must be a positive integer`);
    }
    atlasId = servant.atlasId;
  }
  requireString(servant, "name", context);
  assertStringArray(servant.aliases, `${context}.aliases`);
  assertEnum(
    servant.className,
    new Set<string>(servantClasses),
    `${context}.className`,
  );
  const rarity = requirePositiveInteger(servant, "rarity", context);
  if (rarity > 5) {
    throw new TypeError(`${context}.rarity must be between 1 and 5`);
  }
  if (servant.atkMax !== undefined) {
    if (
      typeof servant.atkMax !== "number" ||
      !Number.isFinite(servant.atkMax) ||
      servant.atkMax <= 0
    ) {
      throw new TypeError(`${context}.atkMax must be positive when present`);
    }
  }
  assertRelease(servant.release, `${context}.release`);

  const noblePhantasmIds = asArray(
    servant.noblePhantasms,
    `${context}.noblePhantasms`,
  ).map((entry, npIndex) =>
    assertNoblePhantasm(entry, `${context}.noblePhantasms[${npIndex}]`),
  );
  assertUnique(noblePhantasmIds, `${context} Noble Phantasm ids`);
  const noblePhantasmIdSet = new Set(noblePhantasmIds);

  const strengtheningIds =
    servant.strengthenings === undefined
      ? []
      : asArray(servant.strengthenings, `${context}.strengthenings`).map(
          (entry, eventIndex) =>
            assertStrengtheningEvent(
              entry,
              `${context}.strengthenings[${eventIndex}]`,
              noblePhantasmIdSet,
            ),
        );
  assertUnique(strengtheningIds, `${context} strengthening ids`);

  assertCharge(servant.charge, `${context}.charge`);
  if (servant.profile !== undefined) {
    assertEnum(servant.profile, servantProfiles, `${context}.profile`);
  }
  if (servant.capabilities !== undefined) {
    assertCapabilities(servant.capabilities, `${context}.capabilities`);
  }
  assertStringArray(servant.tags, `${context}.tags`);
  const roles = assertStringArray(servant.role, `${context}.role`);
  if (roles.length === 0 || roles.some((role) => !servantRoles.has(role))) {
    throw new TypeError(`${context}.role must contain supported roles`);
  }
  assertDate(servant.updatedAt, `${context}.updatedAt`);
  return {
    id,
    ...(atlasId !== undefined ? { atlasId } : {}),
    strengtheningIds,
  };
}

function assertRankingEntry(value: unknown, context: string): string {
  const entry = asRecord(value, context);
  const servantId = requireString(entry, "servantId", context);
  assertEnum(entry.tier, tiers, `${context}.tier`);
  assertOptionalFiniteNumber(entry.score, `${context}.score`);
  if (
    typeof entry.score === "number" &&
    (entry.score < 0 || entry.score > 100)
  ) {
    throw new TypeError(`${context}.score must be between 0 and 100`);
  }
  if (entry.dimensions !== undefined) {
    const dimensions = asRecord(entry.dimensions, `${context}.dimensions`);
    for (const [key, score] of Object.entries(dimensions)) {
      if (!rankingDimensionKeys.has(key)) {
        throw new TypeError(`${context}.dimensions.${key} is unknown`);
      }
      if (
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        throw new TypeError(
          `${context}.dimensions.${key} must be between 0 and 100`,
        );
      }
    }
  }
  assertStringArray(entry.conditions, `${context}.conditions`);
  assertStringArray(entry.strengths, `${context}.strengths`);
  assertStringArray(entry.weaknesses, `${context}.weaknesses`);
  requireString(entry, "rationale", context);
  assertEnum(entry.confidence, confidences, `${context}.confidence`);
  return servantId;
}

function assertRanking(
  value: unknown,
  index: number,
): {
  id: string;
  mode: string;
  revision: number;
  entryServantIds: string[];
} {
  const context = `Dataset snapshot rankings[${index}]`;
  const ranking = asRecord(value, context);
  const id = requireString(ranking, "id", context);
  if (ranking.region !== "CN") {
    throw new TypeError(`${context}.region must be CN`);
  }
  assertEnum(ranking.mode, rankingModes, `${context}.mode`);
  assertDate(ranking.asOf, `${context}.asOf`);
  const revision = requirePositiveInteger(ranking, "revision", context);
  if (ranking.origin !== undefined) {
    assertEnum(ranking.origin, rankingOrigins, `${context}.origin`);
  }
  const assumptions = asRecord(ranking.assumptions, `${context}.assumptions`);
  const npLevel = requirePositiveInteger(
    assumptions,
    "npLevel",
    `${context}.assumptions`,
  );
  if (npLevel > 5) {
    throw new TypeError(`${context}.assumptions.npLevel must be between 1 and 5`);
  }
  requireBoolean(assumptions, "swapAllowed", `${context}.assumptions`);
  assertEnum(
    assumptions.craftEssenceProfile,
    craftEssenceProfiles,
    `${context}.assumptions.craftEssenceProfile`,
  );
  requireBoolean(
    assumptions,
    "eventDamageBonus",
    `${context}.assumptions`,
  );

  const entryServantIds = asArray(ranking.entries, `${context}.entries`).map(
    (entry, entryIndex) =>
      assertRankingEntry(entry, `${context}.entries[${entryIndex}]`),
  );
  assertUnique(entryServantIds, `${context} servant references`);
  return { id, mode: ranking.mode, revision, entryServantIds };
}

export function assertDatasetSnapshot(
  value: unknown,
): asserts value is DatasetSnapshot {
  const snapshot = asRecord(value, "Dataset snapshot");
  const metadata = asRecord(snapshot.metadata, "Dataset snapshot metadata");

  if (metadata.region !== "CN") {
    throw new TypeError("Dataset snapshot metadata.region must be CN");
  }
  assertDatasetVersion(
    metadata.datasetVersion,
    "Dataset snapshot metadata.datasetVersion",
  );
  const rankingRevision = requirePositiveInteger(
    metadata,
    "rankingRevision",
    "Dataset snapshot metadata",
  );
  assertDate(
    metadata.publishedAt,
    "Dataset snapshot metadata.publishedAt",
  );
  const minimumAppVersion = requireString(
    metadata,
    "minimumAppVersion",
    "Dataset snapshot metadata",
  );
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(minimumAppVersion)) {
    throw new TypeError(
      "Dataset snapshot metadata.minimumAppVersion must be a semantic version",
    );
  }
  if (
    metadata.sourceStatus !== "bootstrap" &&
    metadata.sourceStatus !== "reviewed"
  ) {
    throw new TypeError("Dataset snapshot metadata.sourceStatus is invalid");
  }
  if (metadata.sourceVersions !== undefined) {
    assertDatasetSourceVersions(
      metadata.sourceVersions,
      "Dataset snapshot metadata.sourceVersions",
    );
  }
  if (
    metadata.sourceStatus === "reviewed" &&
    metadata.sourceVersions === undefined
  ) {
    throw new TypeError(
      "Reviewed dataset snapshot metadata.sourceVersions is required",
    );
  }

  const servants = asArray(
    snapshot.servants,
    "Dataset snapshot servants",
  ).map(assertServant);
  assertUnique(
    servants.map((servant) => servant.id),
    "Dataset snapshot servant ids",
  );
  const atlasIds = servants.flatMap((servant) =>
    servant.atlasId === undefined ? [] : [String(servant.atlasId)],
  );
  assertUnique(atlasIds, "Dataset snapshot Atlas servant ids");
  assertUnique(
    servants.flatMap((servant) => servant.strengtheningIds),
    "Dataset snapshot strengthening event ids",
  );

  const servantIds = new Set(servants.map((servant) => servant.id));
  const rankings = asArray(
    snapshot.rankings,
    "Dataset snapshot rankings",
  ).map(assertRanking);
  assertUnique(
    rankings.map((ranking) => ranking.id),
    "Dataset snapshot ranking ids",
  );
  assertUnique(
    rankings.map((ranking) => ranking.mode),
    "Dataset snapshot ranking modes",
  );
  for (const ranking of rankings) {
    if (ranking.revision !== rankingRevision) {
      throw new TypeError(
        `Ranking ${ranking.id} revision does not match metadata.rankingRevision`,
      );
    }
    for (const servantId of ranking.entryServantIds) {
      if (!servantIds.has(servantId)) {
        throw new TypeError(
          `Ranking ${ranking.id} references unknown servant ${servantId}`,
        );
      }
    }
  }

  assertStringArray(snapshot.changelog, "Dataset snapshot changelog");
}

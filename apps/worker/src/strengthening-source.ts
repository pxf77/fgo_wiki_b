import type {
  StrengtheningEvent,
  StrengtheningStatus,
  StrengtheningTarget,
} from "@fgo-wiki/domain";
import {
  asRecord,
  requireDate,
  requireNumber,
  requireString,
  requireStringArray,
} from "./json-validation.js";
import { assertOfficialSource } from "./official-evidence.js";

export interface CnStrengtheningSourceEntry extends StrengtheningEvent {
  servantId: string;
}

export interface CnStrengtheningSourceManifest {
  schemaVersion: 1;
  version: string;
  region: "CN";
  reviewedAt: string;
  events: CnStrengtheningSourceEntry[];
}

const statuses = new Set<StrengtheningStatus>(["released", "announced"]);

function assertTarget(value: unknown, context: string): asserts value is StrengtheningTarget {
  const record = asRecord(value, context);
  const type = requireString(record, "type", context);
  requireString(record, "targetId", context);
  requireString(record, "targetName", context);

  if (type === "noble_phantasm") {
    if (record.slot !== undefined) {
      throw new TypeError(`${context}.slot is only valid for skill targets`);
    }
    return;
  }

  if (type === "skill") {
    const slot = requireNumber(record, "slot", context);
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
      throw new TypeError(`${context}.slot must be 1, 2 or 3`);
    }
    return;
  }

  throw new TypeError(`${context}.type is invalid`);
}

function assertEvent(value: unknown, index: number): asserts value is CnStrengtheningSourceEntry {
  const context = `events[${index}]`;
  const record = asRecord(value, context);
  requireString(record, "id", context);
  requireString(record, "servantId", context);
  const status = requireString(record, "status", context);
  if (!statuses.has(status as StrengtheningStatus)) {
    throw new TypeError(`${context}.status is invalid`);
  }
  assertTarget(record.target, `${context}.target`);
  const releasedAt = requireString(record, "releasedAt", context);
  requireDate(releasedAt, `${context}.releasedAt`);
  assertOfficialSource(record.evidence, `${context}.evidence`);
  if (requireStringArray(record, "summary", context).length === 0) {
    throw new TypeError(`${context}.summary must not be empty`);
  }
}

export function assertCnStrengtheningSource(
  value: unknown,
): asserts value is CnStrengtheningSourceManifest {
  const record = asRecord(value, "CN strengthening source");
  if (record.schemaVersion !== 1 || record.region !== "CN") {
    throw new TypeError("CN strengthening source schemaVersion or region is invalid");
  }
  requireString(record, "version", "CN strengthening source");
  const reviewedAt = requireString(record, "reviewedAt", "CN strengthening source");
  requireDate(reviewedAt, "CN strengthening source.reviewedAt");
  if (!Array.isArray(record.events)) {
    throw new TypeError("CN strengthening source.events must be an array");
  }
  record.events.forEach(assertEvent);
}

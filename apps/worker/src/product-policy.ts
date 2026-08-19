import { readFile } from "node:fs/promises";
import { assertSourceVersionToken } from "@fgo-wiki/domain";

export interface CnProductPolicy {
  schemaVersion: 1;
  region: "CN";
  publicationPolicyVersion: string;
  autoPublishCollectionNoThrough: number;
  capabilityRulesVersion: string;
  rankingFormulaVersion: string;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function assertCnProductPolicy(
  value: unknown,
): asserts value is CnProductPolicy {
  const policy = asRecord(value, "CN product policy");
  if (policy.schemaVersion !== 1 || policy.region !== "CN") {
    throw new TypeError("CN product policy schemaVersion or region is invalid");
  }
  assertSourceVersionToken(
    policy.publicationPolicyVersion,
    "CN product policy.publicationPolicyVersion",
  );
  assertSourceVersionToken(
    policy.capabilityRulesVersion,
    "CN product policy.capabilityRulesVersion",
  );
  assertSourceVersionToken(
    policy.rankingFormulaVersion,
    "CN product policy.rankingFormulaVersion",
  );
  if (
    typeof policy.autoPublishCollectionNoThrough !== "number" ||
    !Number.isInteger(policy.autoPublishCollectionNoThrough) ||
    policy.autoPublishCollectionNoThrough <= 0
  ) {
    throw new TypeError(
      "CN product policy.autoPublishCollectionNoThrough must be a positive integer",
    );
  }
}

export async function readCnProductPolicy(
  path: string,
): Promise<CnProductPolicy> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  assertCnProductPolicy(value);
  return value;
}

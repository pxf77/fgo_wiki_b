import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Servant } from "@fgo-wiki/domain";
import type { AtlasServantCandidate } from "./normalize-atlas.js";
import {
  applyCnReleaseGate,
  assertCnReleaseEvidenceManifest,
  type CnReleaseGateReport,
} from "./release-gate.js";
import {
  assertCnProductPolicy,
  type CnProductPolicy,
} from "./product-policy.js";

export function applyCnPublicationGate(
  candidates: readonly AtlasServantCandidate[],
  evidenceValue: unknown,
  policyValue: unknown,
): { servants: Servant[]; report: CnReleaseGateReport } {
  assertCnReleaseEvidenceManifest(evidenceValue);
  assertCnProductPolicy(policyValue);
  const evidence = evidenceValue;
  const policy = policyValue;

  const curatedCollectionNumbers = new Set(
    evidence.entries.map((entry) => entry.collectionNo),
  );
  const eligible: AtlasServantCandidate[] = [];
  const heldForReview: AtlasServantCandidate[] = [];
  for (const candidate of candidates) {
    if (
      candidate.collectionNo <= policy.autoPublishCollectionNoThrough ||
      curatedCollectionNumbers.has(candidate.collectionNo)
    ) {
      eligible.push(candidate);
    } else {
      heldForReview.push(candidate);
    }
  }

  const result = applyCnReleaseGate(eligible, evidence);
  result.report.blocked.push(
    ...heldForReview.map((candidate) => ({
      collectionNo: candidate.collectionNo,
      atlasId: candidate.atlasId,
      name: candidate.name,
      reason:
        `collectionNo exceeds reviewed auto-publication ceiling ` +
        `${policy.autoPublishCollectionNoThrough}`,
    })),
  );
  result.report.blocked.sort(
    (left, right) => left.collectionNo - right.collectionNo,
  );
  return result;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCnPublicationGateFiles(
  candidatePath: string,
  evidencePath: string,
  policyPath: string,
  servantPath: string,
  reportPath: string,
): Promise<CnReleaseGateReport> {
  const candidateValue: unknown = JSON.parse(
    await readFile(candidatePath, "utf8"),
  );
  if (!Array.isArray(candidateValue)) {
    throw new TypeError("Atlas normalized candidates must be an array");
  }
  const evidenceValue: unknown = JSON.parse(
    await readFile(evidencePath, "utf8"),
  );
  const policyValue: unknown = JSON.parse(await readFile(policyPath, "utf8"));
  const { servants, report } = applyCnPublicationGate(
    candidateValue as AtlasServantCandidate[],
    evidenceValue,
    policyValue,
  );
  await writeJson(servantPath, servants);
  await writeJson(reportPath, report);
  return report;
}

export type { CnProductPolicy };

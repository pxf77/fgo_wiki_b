import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  Servant,
  StrengtheningEvent,
  StrengtheningStatus,
  StrengtheningTarget,
} from "@fgo-wiki/domain";
import {
  assertCnStrengtheningSource,
  type CnStrengtheningSourceEntry,
} from "./strengthening-source.js";

export interface CnStrengtheningGateReport {
  evidenceVersion: string;
  reviewedAt: string;
  applied: Array<{
    eventId: string;
    servantId: string;
    status: StrengtheningStatus;
    targetType: StrengtheningTarget["type"];
    targetId: string;
    releasedAt: string;
    evidenceUrl: string;
  }>;
}

function cloneServant(servant: Servant): Servant {
  return {
    ...servant,
    aliases: [...servant.aliases],
    release: {
      ...servant.release,
      ...(servant.release.evidence ? { evidence: { ...servant.release.evidence } } : {}),
    },
    noblePhantasms: servant.noblePhantasms.map((np) => ({
      ...np,
      effects: [...np.effects],
      ...(np.targetTraits ? { targetTraits: [...np.targetTraits] } : {}),
      ...(np.damageMultipliers ? { damageMultipliers: [...np.damageMultipliers] } : {}),
    })),
    strengthenings: [],
    charge: { ...servant.charge },
    tags: [...servant.tags],
    role: [...servant.role],
  };
}

function toPublicEvent(entry: CnStrengtheningSourceEntry): StrengtheningEvent {
  return {
    id: entry.id,
    status: entry.status,
    target: { ...entry.target },
    releasedAt: entry.releasedAt,
    evidence: { ...entry.evidence },
    summary: [...entry.summary],
  };
}

function compareDate(left: string, right: string): number {
  return Date.parse(left) - Date.parse(right);
}

export function applyCnStrengtheningGate(
  inputServants: readonly Servant[],
  sourceValue: unknown,
): { servants: Servant[]; report: CnStrengtheningGateReport } {
  assertCnStrengtheningSource(sourceValue);
  const manifest = sourceValue;

  for (const servant of inputServants) {
    if ((servant.strengthenings ?? []).length > 0) {
      throw new Error(`Release-gated servant ${servant.id} already has a strengthening timeline`);
    }
    if (
      servant.release.source !== "atlas_cn" &&
      servant.noblePhantasms.some((np) => np.strengthened)
    ) {
      throw new Error(`Curated release servant ${servant.id} premarks a strengthened NP`);
    }
  }

  const servants = inputServants.map(cloneServant);
  const servantsById = new Map(servants.map((servant) => [servant.id, servant] as const));
  const eventIds = new Set<string>();
  const applied: CnStrengtheningGateReport["applied"] = [];
  const reviewedAt = Date.parse(manifest.reviewedAt);

  for (const entry of manifest.events) {
    if (eventIds.has(entry.id)) throw new Error(`Duplicate CN strengthening event ${entry.id}`);
    eventIds.add(entry.id);

    const servant = servantsById.get(entry.servantId);
    if (!servant) {
      throw new Error(`CN strengthening event ${entry.id} references unknown servant`);
    }
    if (servant.release.releasedAt && compareDate(entry.releasedAt, servant.release.releasedAt) < 0) {
      throw new Error(`CN strengthening event ${entry.id} predates servant release`);
    }
    if (entry.status === "released" && Date.parse(entry.releasedAt) > reviewedAt) {
      throw new Error(`Released CN strengthening event ${entry.id} is after reviewedAt`);
    }

    if (entry.target.type === "noble_phantasm") {
      const np = servant.noblePhantasms.find((candidate) => candidate.id === entry.target.targetId);
      if (!np) {
        throw new Error(`CN strengthening event ${entry.id} references unknown NP ${entry.target.targetId}`);
      }
      if (entry.status === "released") np.strengthened = true;
    }

    const timeline = servant.strengthenings ?? (servant.strengthenings = []);
    timeline.push(toPublicEvent(entry));
    servant.updatedAt = manifest.reviewedAt.slice(0, 10);
    applied.push({
      eventId: entry.id,
      servantId: entry.servantId,
      status: entry.status,
      targetType: entry.target.type,
      targetId: entry.target.targetId,
      releasedAt: entry.releasedAt,
      evidenceUrl: entry.evidence.url,
    });
  }

  for (const servant of servants) {
    servant.strengthenings?.sort(
      (left, right) => compareDate(left.releasedAt, right.releasedAt) || left.id.localeCompare(right.id),
    );
  }

  return {
    servants,
    report: { evidenceVersion: manifest.version, reviewedAt: manifest.reviewedAt, applied },
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCnStrengtheningGateFiles(
  inputServantPath: string,
  sourcePath: string,
  outputServantPath: string,
  reportPath: string,
): Promise<CnStrengtheningGateReport> {
  const servantValue: unknown = JSON.parse(await readFile(inputServantPath, "utf8"));
  if (!Array.isArray(servantValue)) {
    throw new TypeError("Release-gated CN servants must be an array");
  }
  const sourceValue: unknown = JSON.parse(await readFile(sourcePath, "utf8"));
  const { servants, report } = applyCnStrengtheningGate(servantValue as Servant[], sourceValue);
  await writeJson(outputServantPath, servants);
  await writeJson(reportPath, report);
  return report;
}

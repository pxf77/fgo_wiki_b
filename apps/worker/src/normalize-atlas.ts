import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CardColor,
  NoblePhantasmScope,
  Servant,
  ServantClass,
} from "@fgo-wiki/domain";
import {
  parseAtlasNiceServants,
  type AtlasNiceFunction,
  type AtlasNiceNoblePhantasm,
} from "./atlas-schema.js";

export interface AtlasNoblePhantasmCandidate {
  sourceId: number;
  name: string;
  color: CardColor;
  scope: NoblePhantasmScope;
  strengthened: boolean;
  hitCount?: number;
}

export interface AtlasServantCandidate {
  atlasId: number;
  collectionNo: number;
  name: string;
  originalName?: string;
  className: ServantClass;
  rarity: Servant["rarity"];
  noblePhantasms: AtlasNoblePhantasmCandidate[];
}

export interface AtlasNormalizationIssue {
  atlasId: number;
  collectionNo: number;
  name: string;
  reason: string;
}

export interface AtlasNormalizationReport {
  inputCount: number;
  acceptedCount: number;
  skipped: AtlasNormalizationIssue[];
  warnings: AtlasNormalizationIssue[];
}

const classNames: Record<string, ServantClass> = {
  saber: "saber",
  archer: "archer",
  lancer: "lancer",
  rider: "rider",
  caster: "caster",
  assassin: "assassin",
  berserker: "berserker",
  ruler: "ruler",
  avenger: "avenger",
  mooncancer: "moon_cancer",
  alterego: "alter_ego",
  foreigner: "foreigner",
  pretender: "pretender",
  shielder: "shielder",
  beast: "beast",
};

function normalizedToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function normalizeClassName(value: string): ServantClass | undefined {
  return classNames[normalizedToken(value)];
}

function normalizeRarity(value: number): Servant["rarity"] | undefined {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return undefined;
  }
  return value as Servant["rarity"];
}

function normalizeCardColor(value: string): CardColor | undefined {
  const token = normalizedToken(value);
  if (token === "quick" || token === "arts" || token === "buster") {
    return token;
  }
  return undefined;
}

function isDamageFunction(func: AtlasNiceFunction): boolean {
  const type = normalizedToken(func.funcType);
  return type.includes("damage") && !type.includes("cut") && !type.includes("resist");
}

function inferNoblePhantasmScope(functions: readonly AtlasNiceFunction[]): NoblePhantasmScope {
  const damageFunctions = functions.filter(isDamageFunction);
  if (damageFunctions.length === 0) {
    return "support";
  }

  const targets = damageFunctions.map((func) => normalizedToken(func.funcTargetType));
  if (targets.some((target) => target.includes("all"))) {
    return "aoe";
  }
  if (
    targets.some(
      (target) =>
        target.includes("enemy") ||
        target.includes("one") ||
        target.includes("single") ||
        target.includes("individual"),
    )
  ) {
    return "single";
  }
  return "special";
}

function normalizeNoblePhantasm(
  servant: { id: number; collectionNo: number; name: string },
  noblePhantasm: AtlasNiceNoblePhantasm,
  warnings: AtlasNormalizationIssue[],
): AtlasNoblePhantasmCandidate | undefined {
  const color = normalizeCardColor(noblePhantasm.card);
  if (color === undefined) {
    warnings.push({
      atlasId: servant.id,
      collectionNo: servant.collectionNo,
      name: servant.name,
      reason: `ignored NP ${noblePhantasm.id}: unsupported card ${noblePhantasm.card}`,
    });
    return undefined;
  }

  const candidate: AtlasNoblePhantasmCandidate = {
    sourceId: noblePhantasm.id,
    name: noblePhantasm.name,
    color,
    scope: inferNoblePhantasmScope(noblePhantasm.functions),
    strengthened: noblePhantasm.strengthStatus > 0,
  };
  if (noblePhantasm.npDistribution.length > 0) {
    candidate.hitCount = noblePhantasm.npDistribution.length;
  }
  return candidate;
}

export function normalizeAtlasPayload(value: unknown): {
  candidates: AtlasServantCandidate[];
  report: AtlasNormalizationReport;
} {
  const input = parseAtlasNiceServants(value);
  const candidates: AtlasServantCandidate[] = [];
  const skipped: AtlasNormalizationIssue[] = [];
  const warnings: AtlasNormalizationIssue[] = [];

  for (const servant of input) {
    const issueBase = {
      atlasId: servant.id,
      collectionNo: servant.collectionNo,
      name: servant.name,
    };
    if (!Number.isInteger(servant.collectionNo) || servant.collectionNo <= 0) {
      skipped.push({ ...issueBase, reason: "collectionNo is not a playable servant number" });
      continue;
    }

    const className = normalizeClassName(servant.className);
    if (className === undefined) {
      skipped.push({ ...issueBase, reason: `unsupported class ${servant.className}` });
      continue;
    }

    const rarity = normalizeRarity(servant.rarity);
    if (rarity === undefined) {
      skipped.push({ ...issueBase, reason: `unsupported rarity ${servant.rarity}` });
      continue;
    }

    const candidate: AtlasServantCandidate = {
      atlasId: servant.id,
      collectionNo: servant.collectionNo,
      name: servant.name,
      className,
      rarity,
      noblePhantasms: servant.noblePhantasms.flatMap((noblePhantasm) => {
        const normalized = normalizeNoblePhantasm(servant, noblePhantasm, warnings);
        return normalized === undefined ? [] : [normalized];
      }),
    };
    if (servant.originalName !== undefined) {
      candidate.originalName = servant.originalName;
    }
    candidates.push(candidate);
  }

  candidates.sort((left, right) => left.collectionNo - right.collectionNo);
  return {
    candidates,
    report: {
      inputCount: input.length,
      acceptedCount: candidates.length,
      skipped,
      warnings,
    },
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function normalizeAtlasFile(
  inputPath: string,
  candidatePath: string,
  reportPath: string,
): Promise<AtlasNormalizationReport> {
  const value: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const { candidates, report } = normalizeAtlasPayload(value);
  await writeJson(candidatePath, candidates);
  await writeJson(reportPath, report);
  return report;
}

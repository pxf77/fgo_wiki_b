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

interface NormalizedNoblePhantasmVariant {
  candidate: AtlasNoblePhantasmCandidate;
  conceptKey: string;
  priority: number;
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
  if (token === "1" || token === "arts" || token === "cardarts") return "arts";
  if (token === "2" || token === "buster" || token === "cardbuster") return "buster";
  if (token === "3" || token === "quick" || token === "cardquick") return "quick";
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

function atlasStatusIsStrengthened(strengthStatus: number): boolean {
  return strengthStatus !== 0 && strengthStatus !== 1;
}

function normalizeNoblePhantasm(
  servant: { id: number; collectionNo: number; name: string },
  noblePhantasm: AtlasNiceNoblePhantasm,
  warnings: AtlasNormalizationIssue[],
): NormalizedNoblePhantasmVariant | undefined {
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

  const scope = inferNoblePhantasmScope(noblePhantasm.functions);
  const candidate: AtlasNoblePhantasmCandidate = {
    sourceId: noblePhantasm.id,
    name: noblePhantasm.name,
    color,
    scope,
    strengthened: atlasStatusIsStrengthened(noblePhantasm.strengthStatus),
  };
  if (noblePhantasm.npDistribution.length > 0) {
    candidate.hitCount = noblePhantasm.npDistribution.length;
  }

  return {
    candidate,
    conceptKey: `${noblePhantasm.num}:${noblePhantasm.npNum}:${color}`,
    priority: noblePhantasm.priority,
  };
}

function currentNoblePhantasms(
  servant: {
    id: number;
    collectionNo: number;
    name: string;
    noblePhantasms: AtlasNiceNoblePhantasm[];
  },
  warnings: AtlasNormalizationIssue[],
): AtlasNoblePhantasmCandidate[] {
  const ordinaryVariants = servant.noblePhantasms.filter(
    (noblePhantasm) =>
      noblePhantasm.priority > 0 && noblePhantasm.priority < 190,
  );
  const positivePriorityVariants = servant.noblePhantasms.filter(
    (noblePhantasm) => noblePhantasm.priority > 0,
  );
  const variants =
    ordinaryVariants.length > 0
      ? ordinaryVariants
      : positivePriorityVariants.length > 0
        ? positivePriorityVariants
        : servant.noblePhantasms;
  const currentByConcept = new Map<string, NormalizedNoblePhantasmVariant>();

  for (const noblePhantasm of variants) {
    const normalized = normalizeNoblePhantasm(servant, noblePhantasm, warnings);
    if (!normalized) continue;

    const existing = currentByConcept.get(normalized.conceptKey);
    if (
      !existing ||
      normalized.priority > existing.priority ||
      (normalized.priority === existing.priority &&
        normalized.candidate.sourceId > existing.candidate.sourceId)
    ) {
      currentByConcept.set(normalized.conceptKey, normalized);
    }
  }

  return [...currentByConcept.values()]
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.candidate.sourceId - right.candidate.sourceId,
    )
    .map((entry) => entry.candidate);
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
      noblePhantasms: currentNoblePhantasms(servant, warnings),
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

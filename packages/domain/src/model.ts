export const servantClasses = [
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
] as const;

export type ServantClass = (typeof servantClasses)[number];
export type CardColor = "quick" | "arts" | "buster";
export type NoblePhantasmScope = "single" | "aoe" | "support" | "special";
export type ReleaseStatus = "released" | "announced" | "unreleased";
export type RankingMode =
  | "farming"
  | "farming_90pp"
  | "high_difficulty"
  | "support"
  | "np1_value";
export type Tier = "EX" | "T0" | "T0.5" | "T1" | "T1.5" | "T2" | "T3";
export type Confidence = "high" | "medium" | "provisional";

export interface OfficialSource {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
}

export interface RegionRelease {
  region: "CN";
  status: ReleaseStatus;
  releasedAt?: string;
  evidenceUrl?: string;
}

export interface NoblePhantasm {
  id: string;
  name: string;
  color: CardColor;
  scope: NoblePhantasmScope;
  strengthened: boolean;
  hitCount?: number;
  targetTraits?: string[];
  effects: string[];
}

export type StrengtheningStatus = "released" | "announced";

export type StrengtheningTarget =
  | {
      type: "noble_phantasm";
      targetId: string;
      targetName: string;
    }
  | {
      type: "skill";
      targetId: string;
      targetName: string;
      slot: 1 | 2 | 3;
    };

export interface StrengtheningEvent {
  id: string;
  status: StrengtheningStatus;
  target: StrengtheningTarget;
  releasedAt: string;
  evidence: OfficialSource;
  summary: string[];
}

export interface ServantCharge {
  self: number;
  team: number;
  target?: number;
}

export interface Servant {
  id: string;
  atlasId?: number;
  name: string;
  aliases: string[];
  className: ServantClass;
  rarity: 1 | 2 | 3 | 4 | 5;
  release: RegionRelease;
  noblePhantasms: NoblePhantasm[];
  strengthenings?: StrengtheningEvent[];
  charge: ServantCharge;
  tags: string[];
  role: Array<"main_dps" | "sub_dps" | "support" | "plug_in" | "sustain">;
  updatedAt: string;
}

export interface RankingAssumptions {
  npLevel: 1 | 2 | 3 | 4 | 5;
  swapAllowed: boolean;
  craftEssenceProfile: "none" | "event_50" | "black_grail";
  eventDamageBonus: boolean;
}

export interface RankingDimensions {
  damage: number;
  charge: number;
  looping: number;
  multicore: number;
  utility: number;
  survivability: number;
  stability: number;
}

export interface RankingEntry {
  servantId: string;
  tier: Tier;
  score?: number;
  dimensions?: Partial<RankingDimensions>;
  conditions: string[];
  strengths: string[];
  weaknesses: string[];
  rationale: string;
  confidence: Confidence;
}

export interface RankingSnapshot {
  id: string;
  region: "CN";
  mode: RankingMode;
  asOf: string;
  revision: number;
  assumptions: RankingAssumptions;
  entries: RankingEntry[];
}

export interface DatasetSourceVersions {
  releaseEvidence: string;
  strengtheningEvidence: string;
}

export interface DatasetMetadata {
  region: "CN";
  datasetVersion: string;
  rankingRevision: number;
  publishedAt: string;
  minimumAppVersion: string;
  sourceStatus: "bootstrap" | "reviewed";
  sourceVersions?: DatasetSourceVersions;
}

export interface DatasetSnapshot {
  metadata: DatasetMetadata;
  servants: Servant[];
  rankings: RankingSnapshot[];
  changelog: string[];
}

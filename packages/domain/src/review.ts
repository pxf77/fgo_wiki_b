import type {
  DatasetMetadata,
  DatasetSourceVersions,
  OfficialSource,
  RankingMode,
  ServantClass,
  StrengtheningStatus,
  StrengtheningTarget,
} from "./model.js";

export type ReviewGateStatus = "approved" | "applied" | "not_applied";
export type ReviewPublicationStatus =
  | "ready"
  | "pending_publication"
  | "blocked"
  | "bootstrap";

export interface ReviewBlockedCandidate {
  collectionNo: number;
  atlasId: number;
  name: string;
  reason: string;
}

export interface ReviewReleaseSource {
  collectionNo: number;
  servantId: string;
  displayName: string;
  className: ServantClass;
  rarity: 1 | 2 | 3 | 4 | 5;
  status: "released" | "announced";
  releasedAt: string;
  evidence: OfficialSource;
  gateStatus: Extract<ReviewGateStatus, "approved" | "not_applied">;
}

export interface ReviewStrengtheningSource {
  id: string;
  servantId: string;
  status: StrengtheningStatus;
  target: StrengtheningTarget;
  releasedAt: string;
  evidence: OfficialSource;
  summary: string[];
  gateStatus: Extract<ReviewGateStatus, "applied" | "not_applied">;
}

export interface ReviewRankingSummary {
  mode: RankingMode;
  asOf: string;
  revision: number;
  entryCount: number;
}

export interface ReviewPublicationSummary {
  status: ReviewPublicationStatus;
  datasetVersion: string;
  sourceStatus: DatasetMetadata["sourceStatus"];
  reviewedSourceVersions: DatasetSourceVersions;
  gateSourceVersions: DatasetSourceVersions;
  publishedSourceVersions?: DatasetSourceVersions;
  pendingSourceVersions: Array<keyof DatasetSourceVersions>;
  blockers: string[];
}

export interface ReviewDashboard {
  generatedAt: string;
  counts: {
    atlasCandidates: number;
    approvedReleases: number;
    blockedCandidates: number;
    strengtheningEvents: number;
    rankingEntries: number;
  };
  normalization: {
    inputCount: number;
    acceptedCount: number;
    skippedCount: number;
    warningCount: number;
  };
  publication: ReviewPublicationSummary;
  blockedCandidates: ReviewBlockedCandidate[];
  releaseSources: ReviewReleaseSource[];
  strengtheningSources: ReviewStrengtheningSource[];
  rankings: ReviewRankingSummary[];
}

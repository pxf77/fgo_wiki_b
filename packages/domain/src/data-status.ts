import type {
  DatasetMetadata,
  DatasetSourceVersions,
  OfficialSource,
  RankingMode,
  ServantClass,
  StrengtheningStatus,
  StrengtheningTarget,
} from "./model.js";

export type DataGateStatus = "passed" | "applied" | "pending";
export type DataPublicationStatus = "ready" | "stale" | "blocked" | "bootstrap";

export interface DataMissingSourceCandidate {
  collectionNo: number;
  atlasId: number;
  name: string;
  reason: string;
}

export interface DataReleaseSource {
  collectionNo: number;
  servantId: string;
  displayName: string;
  className: ServantClass;
  rarity: 1 | 2 | 3 | 4 | 5;
  status: "released" | "announced";
  releasedAt: string;
  evidence: OfficialSource;
  gateStatus: Extract<DataGateStatus, "passed" | "pending">;
}

export interface DataStrengtheningSource {
  id: string;
  servantId: string;
  status: StrengtheningStatus;
  target: StrengtheningTarget;
  releasedAt: string;
  evidence: OfficialSource;
  summary: string[];
  gateStatus: Extract<DataGateStatus, "applied" | "pending">;
}

export interface DataRankingSummary {
  mode: RankingMode;
  asOf: string;
  revision: number;
  entryCount: number;
}

export interface DataClassCoverage {
  className: ServantClass;
  atlasCandidates: number;
  passedReleases: number;
  missingReleaseSources: number;
  atlasStrengthenedNps: number;
  evidencedReleasedNps: number;
  missingStrengtheningEvents: number;
}

export interface DataPublicationSummary {
  status: DataPublicationStatus;
  datasetVersion: string;
  sourceStatus: DatasetMetadata["sourceStatus"];
  sourceManifestVersions: DatasetSourceVersions;
  gateSourceVersions: DatasetSourceVersions;
  publishedSourceVersions?: DatasetSourceVersions;
  staleSourceVersions: Array<keyof DatasetSourceVersions>;
  blockers: string[];
}

export interface DataStatusDashboard {
  generatedAt: string;
  counts: {
    atlasCandidates: number;
    passedReleases: number;
    missingSourceCandidates: number;
    strengtheningEvents: number;
    rankingEntries: number;
  };
  normalization: {
    inputCount: number;
    acceptedCount: number;
    skippedCount: number;
    warningCount: number;
  };
  publication: DataPublicationSummary;
  classCoverage: DataClassCoverage[];
  missingSourceCandidates: DataMissingSourceCandidate[];
  releaseSources: DataReleaseSource[];
  strengtheningSources: DataStrengtheningSource[];
  rankings: DataRankingSummary[];
}

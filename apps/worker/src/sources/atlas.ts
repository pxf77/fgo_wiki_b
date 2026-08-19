import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { assertSourceVersionToken } from "@fgo-wiki/domain";

export interface AtlasCnSourceMetadata {
  schemaVersion: 1;
  region: "CN";
  revision: string;
  upstreamHash: string;
  upstreamTimestamp: number;
  fetchedAt: string;
  servantsUrl: string;
  infoUrl: string;
}

export interface FetchAtlasCnServantsOptions {
  servantsUrl: string;
  destination: string;
  infoUrl: string;
  metadataDestination: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context}.${key} must be a non-empty string`);
  }
  return value.trim();
}

function revisionFromInfo(hash: string, timestamp: number): string {
  const compactTime = new Date(timestamp * 1_000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
  const revision = `cn-${compactTime}-${hash.slice(0, 12)}`;
  assertSourceVersionToken(revision, "Atlas CN source revision");
  return revision;
}

export function assertAtlasCnSourceMetadata(
  value: unknown,
): asserts value is AtlasCnSourceMetadata {
  const metadata = asRecord(value, "Atlas CN source metadata");
  if (metadata.schemaVersion !== 1 || metadata.region !== "CN") {
    throw new TypeError(
      "Atlas CN source metadata schemaVersion or region is invalid",
    );
  }
  assertSourceVersionToken(
    metadata.revision,
    "Atlas CN source metadata.revision",
  );
  requireString(metadata, "upstreamHash", "Atlas CN source metadata");
  if (
    typeof metadata.upstreamTimestamp !== "number" ||
    !Number.isInteger(metadata.upstreamTimestamp) ||
    metadata.upstreamTimestamp <= 0
  ) {
    throw new TypeError(
      "Atlas CN source metadata.upstreamTimestamp must be a positive integer",
    );
  }
  const fetchedAt = requireString(
    metadata,
    "fetchedAt",
    "Atlas CN source metadata",
  );
  if (Number.isNaN(Date.parse(fetchedAt))) {
    throw new TypeError(
      "Atlas CN source metadata.fetchedAt must be an ISO-compatible date",
    );
  }
  for (const key of ["servantsUrl", "infoUrl"] as const) {
    const url = requireString(metadata, key, "Atlas CN source metadata");
    try {
      new URL(url);
    } catch {
      throw new TypeError(`Atlas CN source metadata.${key} must be a URL`);
    }
  }
}

function parseCnRepoInfo(value: unknown): {
  hash: string;
  timestamp: number;
} {
  const info = asRecord(value, "Atlas data version response");
  const cn = asRecord(info.CN, "Atlas data version response.CN");
  const hash = requireString(cn, "hash", "Atlas data version response.CN");
  const timestamp = cn.timestamp;
  if (
    typeof timestamp !== "number" ||
    !Number.isInteger(timestamp) ||
    timestamp <= 0
  ) {
    throw new TypeError(
      "Atlas data version response.CN.timestamp must be a positive integer",
    );
  }
  return { hash, timestamp };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function fetchAtlasCnServants(
  options: FetchAtlasCnServantsOptions,
): Promise<AtlasCnSourceMetadata> {
  const fetcher = options.fetcher ?? fetch;
  const [servantsResponse, infoResponse] = await Promise.all([
    fetcher(options.servantsUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "fgo-cn-meta-worker/0.2",
      },
    }),
    fetcher(options.infoUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "fgo-cn-meta-worker/0.2",
      },
    }),
  ]);

  if (!servantsResponse.ok) {
    throw new Error(`Atlas CN request failed: ${servantsResponse.status}`);
  }
  if (!infoResponse.ok) {
    throw new Error(
      `Atlas data version request failed: ${infoResponse.status}`,
    );
  }

  const body = await servantsResponse.text();
  JSON.parse(body);
  const { hash, timestamp } = parseCnRepoInfo(await infoResponse.json());
  const metadata: AtlasCnSourceMetadata = {
    schemaVersion: 1,
    region: "CN",
    revision: revisionFromInfo(hash, timestamp),
    upstreamHash: hash,
    upstreamTimestamp: timestamp,
    fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
    servantsUrl: options.servantsUrl,
    infoUrl: options.infoUrl,
  };
  assertAtlasCnSourceMetadata(metadata);

  await mkdir(dirname(options.destination), { recursive: true });
  await writeFile(options.destination, body, "utf8");
  await writeJson(options.metadataDestination, metadata);
  return metadata;
}

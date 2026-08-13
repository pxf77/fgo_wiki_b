import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  bootstrapServants,
  type DatasetMetadata,
  type RankingMode,
  type RankingSnapshot,
} from "@fgo-wiki/domain";
import { buildSnapshot } from "./build-snapshot.js";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ranking(mode: RankingMode): RankingSnapshot {
  return {
    id: `test-${mode}`,
    region: "CN",
    mode,
    asOf: "2026-08-13",
    revision: 1,
    assumptions: {
      npLevel: 1,
      swapAllowed: true,
      craftEssenceProfile: "none",
      eventDamageBonus: false,
    },
    entries: [],
  };
}

test("publishes evidence versions in metadata and release descriptors", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "fgo-snapshot-"));
  try {
    const rankingRoot = join(temporaryRoot, "rankings");
    const rankingDirectory = join(rankingRoot, "2026-08-13");
    const outputRoot = join(temporaryRoot, "generated");
    const reviewedServantsPath = join(temporaryRoot, "servants.reviewed.json");
    const releaseGateReportPath = join(temporaryRoot, "cn-release-gate.json");
    const strengtheningGateReportPath = join(
      temporaryRoot,
      "cn-strengthening-gate.json",
    );

    await writeJson(join(rankingRoot, "latest.json"), {
      asOf: "2026-08-13",
      revision: 1,
      directory: "2026-08-13",
    });
    await writeJson(
      join(rankingDirectory, "farming-90pp.json"),
      ranking("farming_90pp"),
    );
    await writeJson(
      join(rankingDirectory, "high-difficulty.json"),
      ranking("high_difficulty"),
    );
    await writeJson(join(rankingDirectory, "support.json"), ranking("support"));
    await writeJson(reviewedServantsPath, bootstrapServants);
    await writeJson(releaseGateReportPath, {
      evidenceVersion: "release-r2",
      reviewedAt: "2026-08-13T00:00:00.000Z",
    });
    await writeJson(strengtheningGateReportPath, {
      evidenceVersion: "strengthening-r3",
      reviewedAt: "2026-08-13T00:00:00.000Z",
    });

    const versionDirectory = await buildSnapshot({
      rankingRoot,
      outputRoot,
      reviewedServantsPath,
      releaseGateReportPath,
      strengtheningGateReportPath,
      publicBaseUrl: "https://static.example.cn/snapshots",
      publishedAt: "2026-08-13T12:00:00.000Z",
    });

    const metadata = JSON.parse(
      await readFile(join(versionDirectory, "metadata.json"), "utf8"),
    ) as DatasetMetadata;
    const releaseDescriptor = JSON.parse(
      await readFile(join(versionDirectory, "release.json"), "utf8"),
    ) as Record<string, unknown>;
    const latestPointer = JSON.parse(
      await readFile(join(outputRoot, "latest.json"), "utf8"),
    ) as Record<string, unknown>;

    assert.equal(metadata.sourceStatus, "reviewed");
    assert.deepEqual(metadata.sourceVersions, {
      releaseEvidence: "release-r2",
      strengtheningEvidence: "strengthening-r3",
    });
    assert.deepEqual(releaseDescriptor.sourceVersions, metadata.sourceVersions);
    assert.deepEqual(latestPointer, releaseDescriptor);
    assert.equal(
      releaseDescriptor.snapshotUrl,
      "https://static.example.cn/snapshots/2026-08-13-r1/snapshot.json",
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

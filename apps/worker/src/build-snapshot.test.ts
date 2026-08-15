import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  bootstrapServants,
  type DatasetMetadata,
  type DatasetSnapshot,
  type RankingMode,
  type RankingSnapshot,
} from "@fgo-wiki/domain";
import { buildSnapshot } from "./build-snapshot.js";

interface SnapshotFixture {
  rankingRoot: string;
  outputRoot: string;
  reviewedServantsPath: string;
  releaseGateReportPath: string;
  strengtheningGateReportPath: string;
}

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

async function createFixture(temporaryRoot: string): Promise<SnapshotFixture> {
  const rankingRoot = join(temporaryRoot, "rankings");
  const rankingDirectory = join(rankingRoot, "2026-08-13");
  const fixture: SnapshotFixture = {
    rankingRoot,
    outputRoot: join(temporaryRoot, "generated"),
    reviewedServantsPath: join(temporaryRoot, "servants.reviewed.json"),
    releaseGateReportPath: join(temporaryRoot, "cn-release-gate.json"),
    strengtheningGateReportPath: join(
      temporaryRoot,
      "cn-strengthening-gate.json",
    ),
  };

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
  await writeJson(fixture.reviewedServantsPath, bootstrapServants);
  return fixture;
}

async function writeGateReports(
  fixture: SnapshotFixture,
  releaseVersion: string,
  strengtheningVersion: string,
): Promise<void> {
  await writeJson(fixture.releaseGateReportPath, {
    evidenceVersion: releaseVersion,
    reviewedAt: "2026-08-13T00:00:00.000Z",
  });
  await writeJson(fixture.strengtheningGateReportPath, {
    evidenceVersion: strengtheningVersion,
    reviewedAt: "2026-08-13T00:00:00.000Z",
  });
}

function buildFixture(fixture: SnapshotFixture): Promise<string> {
  return buildSnapshot({
    ...fixture,
    publicBaseUrl: "https://static.example.cn/snapshots",
    publishedAt: "2026-08-13T12:00:00.000Z",
  });
}

test("publishes source-aware immutable dataset paths and P1 shards", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "fgo-snapshot-"));
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeGateReports(fixture, "release-r2", "strengthening-r3");

    const versionDirectory = await buildFixture(fixture);
    const expectedVersion =
      "2026-08-13-r1--rel-release-r2--str-strengthening-r3";
    const metadata = JSON.parse(
      await readFile(join(versionDirectory, "metadata.json"), "utf8"),
    ) as DatasetMetadata;
    const releaseDescriptor = JSON.parse(
      await readFile(join(versionDirectory, "release.json"), "utf8"),
    ) as Record<string, unknown>;
    const latestPointer = JSON.parse(
      await readFile(join(fixture.outputRoot, "latest.json"), "utf8"),
    ) as Record<string, unknown>;
    const archerShard = JSON.parse(
      await readFile(join(versionDirectory, "classes", "archer.json"), "utf8"),
    ) as DatasetSnapshot;
    const detailShard = JSON.parse(
      await readFile(
        join(versionDirectory, "servants", `${bootstrapServants[0]!.id}.json`),
        "utf8",
      ),
    ) as DatasetSnapshot;
    const latestArcherShard = JSON.parse(
      await readFile(join(fixture.outputRoot, "latest", "classes", "archer.json"), "utf8"),
    ) as DatasetSnapshot;

    assert.equal(basename(versionDirectory), expectedVersion);
    assert.equal(metadata.datasetVersion, expectedVersion);
    assert.equal(metadata.sourceStatus, "reviewed");
    assert.deepEqual(metadata.sourceVersions, {
      releaseEvidence: "release-r2",
      strengtheningEvidence: "strengthening-r3",
    });
    assert.deepEqual(releaseDescriptor.sourceVersions, metadata.sourceVersions);
    assert.deepEqual(latestPointer, releaseDescriptor);
    assert.equal(
      releaseDescriptor.snapshotUrl,
      `https://static.example.cn/snapshots/${expectedVersion}/snapshot.json`,
    );
    assert.equal(archerShard.servants.length, bootstrapServants.length);
    assert.equal(latestArcherShard.servants.length, bootstrapServants.length);
    assert.equal(detailShard.servants.length, 1);
    assert.ok(
      archerShard.rankings.some(
        (entry) => entry.mode === "np1_value" && entry.entries.length === bootstrapServants.length,
      ),
    );
    assert.ok(
      archerShard.rankings.some(
        (entry) => entry.mode === "np5_value" && entry.entries.length === bootstrapServants.length,
      ),
    );
    assert.ok(detailShard.rankings.every((entry) => entry.entries.length <= 1));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("changes the immutable path when only a source version changes", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "fgo-snapshot-"));
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeGateReports(fixture, "release-r2", "strengthening-r3");
    const firstDirectory = await buildFixture(fixture);

    await writeGateReports(fixture, "release-r3", "strengthening-r3");
    const secondDirectory = await buildFixture(fixture);

    assert.notEqual(firstDirectory, secondDirectory);
    assert.equal(
      basename(firstDirectory),
      "2026-08-13-r1--rel-release-r2--str-strengthening-r3",
    );
    assert.equal(
      basename(secondDirectory),
      "2026-08-13-r1--rel-release-r3--str-strengthening-r3",
    );
    await readFile(join(firstDirectory, "snapshot.json"), "utf8");
    await readFile(join(secondDirectory, "snapshot.json"), "utf8");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects source versions that cannot be used in object paths", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "fgo-snapshot-"));
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeGateReports(fixture, "../release-r2", "strengthening-r3");

    await assert.rejects(
      () => buildFixture(fixture),
      /path-safe version token/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

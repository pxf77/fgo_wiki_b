import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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
  atlasSourceMetadataPath: string;
  productPolicyPath: string;
  releaseGateReportPath: string;
  strengtheningGateReportPath: string;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
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

async function createFixture(
  temporaryRoot: string,
): Promise<SnapshotFixture> {
  const rankingRoot = join(temporaryRoot, "rankings");
  const rankingDirectory = join(rankingRoot, "2026-08-13");
  const fixture: SnapshotFixture = {
    rankingRoot,
    outputRoot: join(temporaryRoot, "generated"),
    reviewedServantsPath: join(
      temporaryRoot,
      "servants.reviewed.json",
    ),
    atlasSourceMetadataPath: join(
      temporaryRoot,
      "atlas-source.json",
    ),
    productPolicyPath: join(
      temporaryRoot,
      "cn-product-policy.json",
    ),
    releaseGateReportPath: join(
      temporaryRoot,
      "cn-release-gate.json",
    ),
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
  await writeJson(
    join(rankingDirectory, "support.json"),
    ranking("support"),
  );
  await writeJson(
    fixture.reviewedServantsPath,
    bootstrapServants,
  );
  await writeJson(fixture.productPolicyPath, {
    schemaVersion: 1,
    region: "CN",
    publicationPolicyVersion: "publication-v1",
    autoPublishCollectionNoThrough: 438,
    capabilityRulesVersion: "capability-v1",
    rankingFormulaVersion: "ranking-v2",
  });
  return fixture;
}

async function writeSourceInputs(
  fixture: SnapshotFixture,
  releaseVersion: string,
  strengtheningVersion: string,
  atlasRevision = "fixture-atlas-v1",
): Promise<void> {
  await writeJson(fixture.atlasSourceMetadataPath, {
    schemaVersion: 1,
    region: "CN",
    revision: atlasRevision,
    upstreamHash: "fixture",
    upstreamTimestamp: 1,
    fetchedAt: "2026-08-13T00:00:00.000Z",
    servantsUrl:
      "https://fixtures.invalid/atlas-cn/nice_servant.json",
    infoUrl: "https://fixtures.invalid/atlas-cn/info",
  });
  await writeJson(fixture.releaseGateReportPath, {
    evidenceVersion: releaseVersion,
    reviewedAt: "2026-08-13T00:00:00.000Z",
  });
  await writeJson(fixture.strengtheningGateReportPath, {
    evidenceVersion: strengtheningVersion,
    reviewedAt: "2026-08-13T00:00:00.000Z",
  });
}

function buildFixture(
  fixture: SnapshotFixture,
): Promise<string> {
  return buildSnapshot({
    ...fixture,
    publicBaseUrl: "https://static.example.cn/snapshots",
    publishedAt: "2026-08-13T12:00:00.000Z",
  });
}

test("publishes complete source-aware immutable paths and P1 shards", async () => {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "fgo-snapshot-"),
  );
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeSourceInputs(
      fixture,
      "release-r2",
      "strengthening-r3",
    );

    const versionDirectory = await buildFixture(fixture);
    const expectedVersion =
      "2026-08-13-r1" +
      "--atlas-fixture-atlas-v1" +
      "--rel-release-r2" +
      "--str-strengthening-r3" +
      "--pub-publication-v1" +
      "--cap-capability-v1" +
      "--rank-ranking-v2";
    const metadata = JSON.parse(
      await readFile(
        join(versionDirectory, "metadata.json"),
        "utf8",
      ),
    ) as DatasetMetadata;
    const releaseDescriptor = JSON.parse(
      await readFile(
        join(versionDirectory, "release.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const latestPointer = JSON.parse(
      await readFile(
        join(fixture.outputRoot, "latest.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const archerShard = JSON.parse(
      await readFile(
        join(versionDirectory, "classes", "archer.json"),
        "utf8",
      ),
    ) as DatasetSnapshot;
    const detailShard = JSON.parse(
      await readFile(
        join(
          versionDirectory,
          "servants",
          `${bootstrapServants[0]!.id}.json`,
        ),
        "utf8",
      ),
    ) as DatasetSnapshot;
    const latestArcherShard = JSON.parse(
      await readFile(
        join(
          fixture.outputRoot,
          "latest",
          "classes",
          "archer.json",
        ),
        "utf8",
      ),
    ) as DatasetSnapshot;

    assert.equal(basename(versionDirectory), expectedVersion);
    assert.equal(metadata.datasetVersion, expectedVersion);
    assert.equal(metadata.sourceStatus, "reviewed");
    assert.deepEqual(metadata.sourceVersions, {
      atlasCn: "fixture-atlas-v1",
      releaseEvidence: "release-r2",
      strengtheningEvidence: "strengthening-r3",
      publicationPolicy: "publication-v1",
      capabilityRules: "capability-v1",
      rankingFormula: "ranking-v2",
    });
    assert.deepEqual(
      releaseDescriptor.sourceVersions,
      metadata.sourceVersions,
    );
    assert.deepEqual(latestPointer, releaseDescriptor);
    assert.equal(
      releaseDescriptor.snapshotUrl,
      `https://static.example.cn/snapshots/${expectedVersion}/snapshot.json`,
    );
    assert.equal(
      archerShard.servants.length,
      bootstrapServants.length,
    );
    assert.equal(
      latestArcherShard.servants.length,
      bootstrapServants.length,
    );
    assert.equal(detailShard.servants.length, 1);
    assert.ok(
      archerShard.rankings.some(
        (entry) =>
          entry.mode === "np1_value" &&
          entry.entries.length === bootstrapServants.length,
      ),
    );
    assert.ok(
      archerShard.rankings.some(
        (entry) =>
          entry.mode === "np5_value" &&
          entry.entries.length === bootstrapServants.length,
      ),
    );
    assert.ok(
      detailShard.rankings.every(
        (entry) => entry.entries.length <= 1,
      ),
    );
  } finally {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});

test("changes the immutable path when only a source version changes", async () => {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "fgo-snapshot-"),
  );
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeSourceInputs(
      fixture,
      "release-r2",
      "strengthening-r3",
    );
    const firstDirectory = await buildFixture(fixture);

    await writeSourceInputs(
      fixture,
      "release-r3",
      "strengthening-r3",
    );
    const secondDirectory = await buildFixture(fixture);

    assert.notEqual(firstDirectory, secondDirectory);
    assert.match(
      basename(firstDirectory),
      /--rel-release-r2--/,
    );
    assert.match(
      basename(secondDirectory),
      /--rel-release-r3--/,
    );
    await readFile(
      join(firstDirectory, "snapshot.json"),
      "utf8",
    );
    await readFile(
      join(secondDirectory, "snapshot.json"),
      "utf8",
    );
  } finally {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});

test("rejects source versions that cannot be used in object paths", async () => {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "fgo-snapshot-"),
  );
  try {
    const fixture = await createFixture(temporaryRoot);
    await writeSourceInputs(
      fixture,
      "../release-r2",
      "strengthening-r3",
    );

    await assert.rejects(
      () => buildFixture(fixture),
      /path-safe version token/,
    );
  } finally {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});

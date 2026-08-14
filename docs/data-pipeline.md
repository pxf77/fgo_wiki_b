# CN data ingestion and evidence gates

## Goal

The worker turns Atlas Academy CN data into a versioned snapshot without treating an upstream row as proof of CN release or proof that a strengthening is available in CN.

```text
Atlas CN export
    ↓
data/raw/atlas-cn/nice_servant.json
    ↓ normalize objective fields
data/staged/atlas-cn/servant-candidates.json
    ↓ join by collectionNo
data/cn-release-evidence.json
    ↓ release gate
data/normalized/cn/servants.release-reviewed.json
    ↓ join by servantId + targetId
data/cn-strengthening-evidence.json
    ↓ strengthening gate
data/normalized/cn/servants.reviewed.json
    ↓ validate ranking references
data/generated/<dataset-version>/
```

## Fact owners

| Fact | Owner |
|---|---|
| Atlas IDs, collection number, class, rarity, upstream NP card/target shape | Atlas normalized candidate |
| CN servant availability and release evidence | `data/cn-release-evidence.json` |
| CN skill/NP strengthening status, release date and event evidence | `data/cn-strengthening-evidence.json` |
| Display aliases, charge summary, product tags and curated NP presentation | release-evidence overrides |
| Tier and rationale | `rankings/cn` |
| Published immutable dataset | Worker snapshot compiler |

Generated files are outputs, not new fact owners.

## Commands

Deterministic fixture verification:

```bash
pnpm data:prepare:fixture
pnpm snapshot:build
```

Live Atlas candidate verification:

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

The live path writes reports to:

```text
data/reports/atlas-normalization.json
data/reports/cn-release-gate.json
data/reports/cn-strengthening-gate.json
```

## Shared source validation

Release and strengthening manifests use the same `assertOfficialSource` boundary. The shared rule validates required source fields, ISO-compatible publication dates, HTTPS, and the allowed CN publishing host set.

Do not copy the host set or source parser into another gate. A new source policy must be changed once in `apps/worker/src/official-evidence.ts` and covered through each consuming gate.

## Release gate rules

A servant is emitted from the release gate only when all conditions pass:

1. Atlas exposes a playable candidate with a positive `collectionNo`.
2. `collectionNo` exists exactly once in the version-controlled CN release manifest.
3. Atlas class and rarity match the source expectation.
4. The source URL uses HTTPS and an allowed CN publishing host.
5. Each curated NP keeps the base `strengthened=false` state.

Candidates without a CN release source entry remain in the blocked report. They do not fail the whole job because Atlas may contain future or otherwise irrelevant records. A reviewed entry that cannot find its Atlas candidate does fail the job because that indicates stale identity data or an upstream contract change.

The strengthening gate remains the only stage allowed to derive a released `NoblePhantasm.strengthened=true` state.

## Strengthening gate rules

A strengthening event is applied only when all conditions pass:

1. `event.id` is unique in the version-controlled strengthening manifest.
2. `servantId` references a servant that passed the release gate.
3. A Noble Phantasm event references an existing curated NP `targetId`.
4. A skill event declares a stable `targetId`, display name and slot 1–3.
5. The event does not predate the servant's CN release.
6. A `released` event is not dated after the manifest review time.
7. The source URL uses HTTPS and an allowed CN publishing host.

Released NP events derive `NoblePhantasm.strengthened=true`. Announced events enter the timeline but do not change the current strengthened state. Skill events are exposed in the same timeline even though a full public skill model is not yet part of the P0 domain contract.

## Snapshot publication contract

A source-backed snapshot must read evidence versions from the generated gate reports, rather than copying them into another source file:

```json
{
  "sourceStatus": "reviewed",
  "sourceVersions": {
    "releaseEvidence": "2026-08-13-r1",
    "strengtheningEvidence": "2026-08-13-strengthening-r1"
  }
}
```

The same `sourceStatus` and `sourceVersions` are written to:

```text
data/generated/<dataset-version>/metadata.json
data/generated/<dataset-version>/snapshot.json
data/generated/<dataset-version>/release.json
data/generated/latest.json
```

`release.json` is the immutable version-scoped release descriptor. `latest.json` is the short-cache pointer and must be published only after the immutable version directory is available.

A source-backed snapshot without both evidence versions fails validation. Bootstrap snapshots may omit them.

## Current boundary

This iteration independently gates **servant availability** and **skill/NP strengthening events**. Curated charge, tags, NP names and effect summaries remain version-controlled overrides. Exact skill effects and full NP effect functions are not yet derived from Atlas functions, and should not be described as fully automatic facts.

The dataset path still uses the ranking date/revision as its external version. Evidence versions are now visible in metadata and release descriptors; changing the path identity when only evidence revisions change remains a separate release-versioning decision.

## Publication safety

The scheduled workflow only builds and uploads verification artifacts. It does not update editorial tiers or publish to COS. The manual publish workflow retains a separate COS upload boundary so immutable version objects, including `release.json`, succeed before `latest.json` is replaced.

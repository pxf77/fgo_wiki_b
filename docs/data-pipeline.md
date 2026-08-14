# CN data ingestion and evidence gates

## Goal

The worker turns Atlas Academy CN data into a versioned snapshot without treating an upstream row as proof of CN release or proof that a strengthening is available in CN.

```text
Atlas CN export
    ↓
data/raw/atlas-cn/nice_servant.json
    ↓ normalize objective fields and current NP variants
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
| Atlas IDs, collection number, class, rarity, NP card/target shape | Atlas normalized candidate |
| CN servant availability and release evidence | `data/cn-release-evidence.json` |
| CN skill/NP strengthening status, date and evidence | `data/cn-strengthening-evidence.json` |
| Display aliases, charge summary, product tags and curated NP presentation | release-source overrides |
| Tier and rationale | `rankings/cn` |
| Published immutable dataset | Worker snapshot compiler |

Generated files are outputs, not new fact owners.

## Commands

Deterministic fixture verification:

```bash
pnpm data:prepare:fixture
pnpm snapshot:build
```

Live Atlas verification:

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

Pull-request explicit version verification:

```bash
pnpm version:check -- --base <base-sha> --head <head-sha>
```

The live path writes:

```text
data/reports/atlas-normalization.json
data/reports/cn-release-gate.json
data/reports/cn-strengthening-gate.json
data/reports/cn-class-catalog.json
```

## Atlas CN normalization contract

### Card values

The live CN export represents NP cards as numeric strings:

```text
1 -> Arts
2 -> Buster
3 -> Quick
```

The normalizer also accepts textual card names so focused fixtures remain readable when useful.

### Current NP variant selection

Atlas may expose several records for one conceptual NP: base and strengthened variants, hidden-name variants, or battle-only placeholders. The normalizer:

1. Prefers records with `0 < priority < 190`.
2. Groups records by `num`, `npNum` and normalized card color.
3. Chooses the highest `priority` in each group; Atlas NP ID is the tie-breaker.
4. Falls back to other positive-priority or all records only when no ordinary record exists.

Grouping does not include target scope. This prevents a placeholder with missing damage functions from becoming a second NP while still preserving genuine dual-NP servants with different cards, such as Ptolemy and Melusine. Mash remains dual-NP because her `npNum` values differ.

`strengthStatus` values `0/1` are treated as base records; other live values are strengthening hints for the class catalog only. CN published strengthening still requires an event in `data/cn-strengthening-evidence.json`.

### Live baseline

The 2026-08-14 live run normalized:

```text
454 Atlas rows
438 playable candidates
50 Archer candidates
0 normalization warnings
```

The live run is required before production `atlasSourceId` values are changed. Fixture IDs are not production evidence.

## Shared source validation

Release and strengthening manifests use the same `assertOfficialSource` boundary. It validates required source fields, publication dates, HTTPS and the allowed CN publishing host set.

Source manifest `version` values use the path-safe version contract from `packages/domain/src/versioning.ts`.

## Release gate rules

A servant is emitted only when all conditions pass:

1. Atlas exposes a playable candidate with a positive `collectionNo`.
2. `collectionNo` exists exactly once in the CN release manifest.
3. Atlas class and rarity match the source expectation.
4. The source URL uses HTTPS and an allowed CN publishing host.
5. Every curated NP declares an `atlasSourceId` belonging to that Atlas servant.
6. Curated and Atlas NP card/scope match; available Hit counts also match.
7. The same Atlas NP is not mapped twice.
8. Curated NPs keep the base `strengthened=false` state.
9. The release source version is path-safe.

Candidates without a CN release source remain in the blocked report. They do not fail the whole job. A source entry with no matching Atlas candidate does fail the job because it indicates stale identity data or an upstream contract change.

## Strengthening gate rules

A strengthening event is applied only when:

1. `event.id` is unique.
2. `servantId` references a release-gated servant.
3. An NP event references an existing curated NP `targetId`.
4. A skill event declares a stable target ID, display name and slot 1–3.
5. The event does not predate servant release.
6. A released event is not after the manifest review time.
7. The source URL passes the shared source boundary.
8. The strengthening source version is path-safe.

Released NP events derive `NoblePhantasm.strengthened=true`. Announced events enter the timeline but do not change current state.

## Snapshot publication contract

A source-backed snapshot reads source versions from the gate reports:

```json
{
  "sourceStatus": "reviewed",
  "sourceVersions": {
    "releaseEvidence": "2026-08-14-r3",
    "strengtheningEvidence": "2026-08-13-strengthening-r1"
  }
}
```

The same identity is written to metadata, snapshot, version-level `release.json` and short-cache `latest.json`.

Production dataset identity:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

Current live-verified output:

```text
2026-08-13-r1--rel-2026-08-14-r3--str-2026-08-13-strengthening-r1
```

Publish immutable version objects before replacing `latest.json`. This project does not derive path identity from hashes or fingerprints.

## Pull request version contract

PR CI compares parsed JSON between base and head:

1. Semantic release-source changes require a new top-level version.
2. Semantic strengthening-source changes require a new top-level version.
3. Semantic ranking changes require a later date or higher same-day revision.
4. Current ranking files must match the latest pointer.
5. Historical ranking edits and source deletion are rejected.

Formatting-only changes do not require a version bump. The gate reads Git objects directly and does not create checksums, database counters or approval records.

## Current boundary

The live-verified pipeline currently publishes 3 Archer servants from 50 Atlas Archer candidates. The remaining 47 are source gaps, not automatically released data. Curated charge, tags, NP presentation and effect summaries remain version-controlled overrides. Exact skill effects and complete NP function derivation are not yet automatic.

## Publication safety

The scheduled upstream workflow builds and uploads diagnostics. It does not modify source manifests, publish editorial tiers or update COS. Diagnostic artifacts are uploaded even when a live gate fails so the raw/staged contract can be inspected.

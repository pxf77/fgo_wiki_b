# Engineering constraints

## Product boundary

This repository is a CN-region FGO ranking and decision product, not a full encyclopedia clone.
The canonical output is a versioned CN data snapshot consumed by Web, PWA and native shells.

## Ownership

- `packages/domain` owns public data contracts.
- `packages/filter-engine` owns deterministic servant filtering.
- `packages/ranking-engine` owns ranking selection and ordering, not editorial tier decisions.
- `packages/damage-engine` owns deterministic calculations.
- `rankings/cn` owns Git-reviewed ranking entries.
- `data/cn-release-evidence.json` owns CN servant release decisions and their official evidence.
- `data/cn-strengthening-evidence.json` owns CN skill/NP strengthening events and their official evidence.
- `data/fixtures` is test input only and must never be published as production data.
- `apps/worker` owns Atlas ingestion, normalization, evidence gates and snapshot compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated work products. Do not edit them as facts or commit them as source data.

A fact must have one owner. Do not duplicate validation or introduce hash/fingerprint chains. Use schema validation at input boundaries, database transactions for writes, and HTTP ETag/cache semantics for published snapshots.

Official source parsing and host policy are owned by `apps/worker/src/official-evidence.ts`. Release and strengthening gates must reuse that boundary rather than copy it.

## Ranking policy

AI may draft change explanations, but may not publish a tier. Every published ranking snapshot requires a Git-reviewed source file and a change reason.

## Region policy

CN release status must be gated by CN official release evidence. Presence in Atlas or another upstream dataset only creates a candidate; it is never proof of CN availability.

Use Atlas `collectionNo` as the primary cross-source identity. A name fallback may only be used during an explicit migration and must not become a second identity owner.

Release overrides must keep `NoblePhantasm.strengthened` at the base value `false`; the strengthening gate rejects pre-marked input. Only `data/cn-strengthening-evidence.json` may derive a released `true` state and timeline entries.

A released strengthening event must target a release-gated servant and valid NP/skill identity. Announced events may be shown in the timeline but must not mutate current strengthened state.

## Publication policy

A source-backed snapshot must derive `metadata.sourceVersions` from the release-gate and strengthening-gate reports. Do not manually repeat source versions in ranking files, environment variables or another manifest.

Dataset path identity must include both ranking identity and source identity:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

Bootstrap output uses `<ranking-date>-r<ranking-revision>--bootstrap`.

Source manifest versions must be path-safe tokens and must be incremented whenever their source content changes. Do not replace this explicit version contract with content hashes, SHA fingerprints or another hidden identity system.

The version-scoped `release.json` and short-cache `latest.json` must carry the same source status and source versions as the snapshot metadata. Publish immutable version objects before replacing `latest.json`, and never overwrite an existing version directory with different source versions.

## Pull request version contract

Pull-request CI compares the base and head revisions directly:

- Semantic changes in `data/cn-release-evidence.json` require its top-level `version` to change.
- Semantic changes in `data/cn-strengthening-evidence.json` require its top-level `version` to change.
- Semantic ranking changes require `rankings/cn/latest.json` to advance by date or by a strictly higher revision on the same date.
- Every current ranking file must match the `asOf` and `revision` declared by `rankings/cn/latest.json`.
- Ranking changes outside the current ranking directory are rejected.

The comparison uses parsed JSON with identity fields excluded. It must not be replaced with content hashes, checksums, database counters or a second release identity.

## Human review boundary

GitHub Pull Requests are the only human approval boundary. CI gates validate deterministic contracts; `apps/admin` only projects read-only data status.

Do not add approval tables, approval APIs, browser decision state, approval state machines, or Git/database synchronization. Network access controls for internal status endpoints are infrastructure concerns, not a second approval system.

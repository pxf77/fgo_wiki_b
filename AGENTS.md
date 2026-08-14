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
- `apps/worker` owns Atlas ingestion, normalization, evidence gates, class coverage catalog generation and snapshot compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated work products. Do not edit them as facts or commit them as source data.

A fact must have one owner. Do not duplicate validation or introduce hash/fingerprint chains. Use schema validation at input boundaries, database transactions for writes, and HTTP ETag/cache semantics for published snapshots.

Official source parsing and host policy are owned by `apps/worker/src/official-evidence.ts`. Release and strengthening gates must reuse that boundary rather than copy it.

## Ranking policy

AI may draft change explanations, but may not publish a tier. Every published ranking snapshot requires a Git-reviewed source file and a change reason.

## Region policy

CN release status must be gated by CN official release evidence. Presence in Atlas or another upstream dataset only creates a candidate; it is never proof of CN availability.

Use Atlas `collectionNo` as the primary cross-source servant identity. A name fallback may only be used during an explicit migration and must not become a second identity owner.

Every curated Noble Phantasm in `data/cn-release-evidence.json` must declare `atlasSourceId`. The release gate must verify that the Atlas NP exists and that card, scope and available hit-count facts match. Product NP IDs remain stable public IDs; Atlas source IDs are cross-source identities, not replacement public IDs.

Release overrides must keep `NoblePhantasm.strengthened` at the base value `false`; the strengthening gate rejects pre-marked input. Only `data/cn-strengthening-evidence.json` may derive a released `true` state and timeline entries.

A released strengthening event must target a release-gated servant and valid NP/skill identity. Announced events may be shown in the timeline but must not mutate current strengthened state.

## Class expansion catalog

`data/reports/cn-class-catalog.json` is a generated work queue derived from Atlas candidates, release sources, gate reports and strengthening sources. It is not a fact owner and must never be copied directly into a production source manifest without Git review.

The catalog may generate incomplete release-source drafts with `release=null`, `charge=null` and empty product tags/effects. These placeholders intentionally fail the production source schema until a maintainer supplies verified CN facts.

Coverage gaps are informational. Missing source candidates do not block publication of already gated servants.

## Client snapshot policy

`apps/web` must load the generated `DatasetSnapshot` during static generation. Business pages and client components must receive that snapshot as data and must not import `bootstrapSnapshot` directly.

`apps/mobile` must embed the generated `DatasetSnapshot` during the Vite build. The shipped Capacitor Web bundle must start from that embedded reviewed snapshot and must not import `bootstrapSnapshot` as its normal initial dataset.

Normal Web and Mobile builds require `metadata.sourceStatus=reviewed`. Missing, malformed or Bootstrap snapshot input must fail the build. `ALLOW_BOOTSTRAP_DATA=true` is an explicit development-only fallback, not a production default.

The mobile cache may replace the bundled snapshot only when it has the same dataset identity or a later publication time. An older device cache must not downgrade data shipped in a newer app bundle. Online refreshes must also reject Bootstrap responses.

Generate `data/generated/latest/snapshot.json` before running the Next.js and Vite builds. CI and release workflows must preserve this order:

```text
prepare facts -> build snapshot -> build Web/PWA and Mobile bundle
```

CI must verify that the final Mobile JavaScript bundle contains the reviewed dataset version and every released servant ID from the input snapshot. Bootstrap data remains valid for isolated tests and explicit local development only.

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

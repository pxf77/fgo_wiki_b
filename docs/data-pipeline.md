# CN data ingestion and release gate

## Goal

The worker turns Atlas Academy CN data into a versioned snapshot without treating an upstream row as proof of CN release.

```text
Atlas CN export
    ↓
data/raw/atlas-cn/nice_servant.json
    ↓ normalize objective fields
data/staged/atlas-cn/servant-candidates.json
    ↓ join by collectionNo
versioned CN official evidence
    ↓
data/normalized/cn/servants.reviewed.json
    ↓ validate ranking references
data/generated/<dataset-version>/
```

## Fact owners

| Fact | Owner |
|---|---|
| Atlas IDs, collection number, class, rarity, upstream NP card/target shape | Atlas normalized candidate |
| CN servant availability and evidence URL | `data/cn-release-evidence.json` |
| Display aliases, charge summary, product tags and current curated NP presentation | reviewed evidence override |
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
```

## Gate rules

A servant is emitted only when all conditions pass:

1. Atlas exposes a playable candidate with a positive `collectionNo`.
2. `collectionNo` exists exactly once in the reviewed CN evidence manifest.
3. Atlas class and rarity match the reviewed expectation.
4. The evidence URL uses HTTPS and an approved official CN publishing host.
5. The ranking source references only emitted servant IDs.

Candidates without reviewed evidence remain in the blocked report. They do not fail the whole job because Atlas may contain future or otherwise irrelevant records. A reviewed entry that cannot find its Atlas candidate does fail the job because that indicates stale identity data or an upstream contract change.

## Current boundary

This iteration gates **servant availability**. Curated charge, tag and Noble Phantasm presentation fields still come from reviewed overrides. In particular, a `strengthened` value is not yet independently verified by an official strengthening-evidence record. The next fact-model extension should add event-scoped evidence for skill and Noble Phantasm strengthening before those fields are described as fully automatic.

## Publication safety

The scheduled workflow only builds and uploads verification artifacts. It does not update editorial tiers or publish to COS. The manual publish workflow retains a separate COS upload boundary so `latest.json` can be uploaded only after immutable version objects have succeeded.

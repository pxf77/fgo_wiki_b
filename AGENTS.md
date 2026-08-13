# Engineering constraints

## Product boundary

This repository is a CN-region FGO ranking and decision product, not a full encyclopedia clone.
The canonical output is a versioned CN data snapshot consumed by Web, PWA and native shells.

## Ownership

- `packages/domain` owns public data contracts.
- `packages/filter-engine` owns deterministic servant filtering.
- `packages/ranking-engine` owns ranking selection and ordering, not editorial tier decisions.
- `packages/damage-engine` owns deterministic calculations.
- `rankings/cn` owns human-reviewed ranking entries.
- `data/cn-release-evidence.json` owns CN servant release decisions and their official evidence.
- `data/fixtures` is test input only and must never be published as production data.
- `apps/worker` owns Atlas ingestion, normalization, release gating and snapshot compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated work products. Do not edit them as facts or commit them as source data.

A fact must have one owner. Do not duplicate validation or introduce hash/fingerprint chains. Use schema validation at input boundaries, database transactions for writes, and HTTP ETag/cache semantics for published snapshots.

## Ranking policy

AI may draft change explanations, but may not publish a tier. Every published ranking snapshot requires a human-reviewed source file and a change reason.

## Region policy

CN release status must be gated by CN official release evidence. Presence in Atlas or another upstream dataset only creates a candidate; it is never proof of CN availability.

Use Atlas `collectionNo` as the primary cross-source identity. A name fallback may only be used during an explicit migration and must not become a second identity owner.

The current release gate covers servant availability. Skill and Noble Phantasm strengthening evidence remains an editorial override until a dedicated fact-evidence contract is added; do not claim that strengthening fields are automatically official-gated.

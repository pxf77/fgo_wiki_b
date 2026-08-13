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
- `data/cn-strengthening-evidence.json` owns CN skill/NP strengthening events and their official evidence.
- `data/fixtures` is test input only and must never be published as production data.
- `apps/worker` owns Atlas ingestion, normalization, evidence gates and snapshot compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated work products. Do not edit them as facts or commit them as source data.

A fact must have one owner. Do not duplicate validation or introduce hash/fingerprint chains. Use schema validation at input boundaries, database transactions for writes, and HTTP ETag/cache semantics for published snapshots.

## Ranking policy

AI may draft change explanations, but may not publish a tier. Every published ranking snapshot requires a human-reviewed source file and a change reason.

## Region policy

CN release status must be gated by CN official release evidence. Presence in Atlas or another upstream dataset only creates a candidate; it is never proof of CN availability.

Use Atlas `collectionNo` as the primary cross-source identity. A name fallback may only be used during an explicit migration and must not become a second identity owner.

Release overrides must keep `NoblePhantasm.strengthened` at the base value `false`; the strengthening gate rejects pre-marked input. Only `data/cn-strengthening-evidence.json` may derive a released `true` state and timeline entries.

A released strengthening event must target a release-gated servant and valid NP/skill identity. Announced events may be shown in the timeline but must not mutate current strengthened state.

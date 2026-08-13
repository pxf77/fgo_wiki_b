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
- `apps/worker` owns snapshot compilation and Atlas ingestion.
- `apps/api` owns dynamic HTTP interfaces.

A fact must have one owner. Do not duplicate validation or introduce hash/fingerprint chains. Use schema validation at input boundaries, database transactions for writes, and HTTP ETag/cache semantics for published snapshots.

## Ranking policy

AI may draft change explanations, but may not publish a tier. Every published ranking snapshot requires a human-reviewed source file and a change reason.

## Region policy

CN release status must be gated by CN official release evidence. Presence in an upstream dataset alone is not proof of CN availability.

# Engineering constraints

## Product boundary

This repository is a CN-region FGO ranking and decision product, not a full encyclopedia clone. The canonical publication is a versioned CN dataset with catalog, class and servant shards plus a compatibility full snapshot.

## Ownership

- `packages/domain` owns public data contracts.
- `packages/filter-engine` owns deterministic servant filtering.
- `packages/ranking-engine` owns ranking selection/order, not editorial conclusions.
- `apps/worker/src/computed-rankings.ts` owns transparent computed fallback rankings.
- `rankings/cn` owns Git-reviewed editorial ranking overrides.
- Atlas Academy CN export owns current objective game facts for explicitly auto-published classes.
- `data/cn-release-evidence.json` owns the allowlist of auto-published classes plus curated release/display overrides and official links.
- `data/cn-strengthening-evidence.json` owns dated strengthening timeline evidence where curated timeline detail is available.
- `data/fixtures` is deterministic test input only.
- `apps/worker` owns Atlas ingestion, normalization, publication gates, coverage catalog and snapshot/shard compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated products. Do not edit them as facts.

A fact must have one owner. Do not add hash/fingerprint chains or duplicate validation. Use boundary schemas, explicit source versions and HTTP cache/ETag semantics.

## Region policy

Atlas **CN** data may establish current playable roster and objective fields only for classes listed in `autoPublishClasses`. Currently this is used for Archer P0. A class not listed there remains blocked unless it has a curated source entry.

Use Atlas `collectionNo` as the servant cross-source identity. Product servant IDs remain stable public IDs. Curated Noble Phantasms must declare `atlasSourceId`; their card, scope and available hit-count facts must match Atlas.

For auto-published Atlas CN entries, current NP strengthening state may come from the current CN NP variant. Curated entries keep base `strengthened=false` and receive dated strengthening state/timeline from `data/cn-strengthening-evidence.json`. Do not invent historical dates from Atlas current-state data.

## Ranking policy

P0 requires complete Archer entries for `farming_90pp`, `high_difficulty`, `np1_value` and `np5_value`.

- NP1/NP5 are deterministic data rankings built from objective fields such as ATK, NP multiplier, card modifier and charge.
- 90++/high difficulty use a transparent computed fallback so every Archer is represented.
- Git-reviewed entries in `rankings/cn` override computed entries for the same servant/mode.
- Computed results must be marked `confidence=computed`; do not present them as human consensus.
- AI may draft editorial changes but may not silently publish an editorial Tier.

## Client data policy

P1 publication outputs:

```text
catalog.json
classes/<class>.json
servants/<servant-id>.json
rankings/<mode>.json
snapshot.json            # compatibility/API
```

Web should build list/filter pages from `classes/archer.json` and static detail pages from `servants/<id>.json`; do not serialize the global snapshot into the homepage client payload.

Mobile should ship an independent `data/initial-snapshot.json` class shard. Do not inline the entire dataset into the JavaScript bundle. Online refresh for the Archer client should use `/api/v1/classes/archer` rather than the global dataset endpoint.

Normal Web/Mobile builds require `sourceStatus=reviewed`. `ALLOW_BOOTSTRAP_DATA=true` is development-only.

Build order:

```text
prepare facts -> build snapshot/shards -> build Web and Mobile -> verify artifacts
```

## Publication/version policy

Source-backed dataset identity remains:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

Source manifest semantic changes require explicit version bumps. Editorial ranking semantic changes require ranking date/revision advancement. Do not replace these explicit identities with hashes or database counters.

Publish immutable version objects before changing `latest.json`.

## Human review boundary

GitHub Pull Requests are the only human approval boundary. `apps/admin` is read-only data status. Do not add approval tables/APIs/state machines or Git/database approval synchronization.

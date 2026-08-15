# Engineering constraints

## Product boundary

This repository is a CN-region FGO ranking and decision product, not a full encyclopedia clone. The canonical publication is a versioned CN dataset with catalog, class and servant shards plus a compatibility full snapshot.

## Ownership

- `packages/domain` owns public data contracts.
- `packages/filter-engine` owns deterministic servant filtering.
- `packages/ranking-engine` owns ranking selection/order, not editorial conclusions.
- `apps/worker/src/computed-rankings.ts` owns transparent computed fallback/data rankings.
- `rankings/cn` owns Git-reviewed editorial ranking overrides.
- Atlas Academy CN export owns current objective game facts for auto-published classes.
- `data/cn-release-evidence.json` owns the auto-published class policy plus curated official links, aliases and display corrections.
- `data/cn-strengthening-evidence.json` owns dated strengthening timeline evidence where explicitly verified.
- `data/fixtures` is deterministic test input only.
- `apps/worker` owns Atlas ingestion, normalization, publication gates, role/capability derivation, coverage catalog and snapshot/shard compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated products. Do not edit them as facts.

A fact must have one owner. Do not add hash/fingerprint chains, duplicate approval state or per-class copies of the same pipeline.

## Region and publication policy

Atlas **CN** data establishes current playable roster and objective fields for classes in `autoPublishClasses`. The production policy currently enables all 15 supported servant classes.

Use Atlas `collectionNo` as the servant cross-source identity. Product servant IDs remain stable public IDs. Curated Noble Phantasms must declare `atlasSourceId`; card, scope and available hit-count facts must match Atlas.

For auto-published entries, current NP strengthening state may come from the current CN NP variant. Curated dated timeline events remain owned by `data/cn-strengthening-evidence.json`. Never infer a historical strengthening date from current Atlas state.

Curated source entries are overlays, not a requirement to manually re-enter every servant. They should be used for official links, aliases, stable display corrections and facts that cannot be deterministically derived from Atlas CN.

## Role/capability policy

The ranking pipeline is role-based, not class-specific. Do not implement separate Saber/Caster/etc. ranking engines.

Supported profiles:

```text
attacker_single
attacker_aoe
support
hybrid
```

Capability fields are deterministic current-state projections:

```text
offense
support
survival
control
cleanse
pierce
cooldown
critical
```

Add new capability parsing at the Atlas normalization boundary and keep ranking formulas consuming the normalized capability contract.

## Ranking policy

- `farming_90pp` and `high_difficulty` provide transparent computed coverage within each class; Git-reviewed entries override the same servant/mode.
- `support` only includes `support` and `hybrid` profiles.
- `np1_value` and `np5_value` only include servants with an attacking Noble Phantasm.
- Computed scores are normalized within the servant's class so class population and class role remain the comparison boundary.
- Computed results must use `confidence=computed`; never present them as human consensus.
- AI may draft editorial changes but may not silently publish an editorial Tier.

## Client data policy

Publication outputs:

```text
catalog.json
classes/<class>.json
servants/<servant-id>.json
rankings/<mode>.json
snapshot.json            # compatibility/API/internal tools
```

Web root consumes the catalog, each `/classes/<class>/` page consumes only its class shard, and `/servants/<id>/` uses the servant detail shard. Do not serialize the global snapshot into the homepage client payload.

Mobile ships independent data files:

```text
data/catalog.json
data/classes/<class>.json
```

The JavaScript bundle must not contain the dataset body. Mobile loads the selected class on demand and uses a separate cache per class. Online refresh uses `/api/v1/classes/:className`.

Normal Web/Mobile builds require `sourceStatus=reviewed`. `ALLOW_BOOTSTRAP_DATA=true` is development-only.

Build order:

```text
prepare facts -> build snapshot/shards -> build Web and Mobile -> verify artifacts
```

## Verification policy

Deterministic PR CI uses a stable all-class smoke fixture rather than committing the entire Atlas raw export. It must cover all 15 classes and keep the full 50-Archer slice.

The live upstream workflow is the source of truth for current total coverage. A live run must pass Atlas sync, normalization, gates and snapshot compilation; diagnostic artifacts must expose class coverage and generated shards.

Do not turn the current live count (for example 438) into a permanent production gate; upstream CN roster growth is expected.

## Publication/version policy

Source-backed dataset identity remains:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

Source manifest semantic changes require explicit version bumps. Editorial ranking semantic changes require ranking date/revision advancement. Do not replace these explicit identities with custom content hashes or database counters.

If pure Atlas upstream changes need their own immutable dataset identity, introduce a readable upstream revision owned by the source boundary rather than a locally computed fingerprint.

Publish immutable version objects before changing `latest.json`.

## Human review boundary

GitHub Pull Requests are the only human approval boundary. `apps/admin` is read-only data status. Do not add approval tables/APIs/state machines or Git/database approval synchronization.

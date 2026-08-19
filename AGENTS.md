# Engineering constraints

## Product boundary

This repository is a CN-region FGO ranking and decision product, not a full encyclopedia clone. The canonical publication is a versioned CN dataset with catalog, class and servant shards plus a compatibility full snapshot.

The current application version is `0.2.0`.

## Ownership

- `packages/domain` owns public data contracts and full runtime snapshot validation.
- `packages/filter-engine` owns deterministic servant filtering.
- `packages/ranking-engine` owns ranking selection/order, not editorial conclusions.
- `apps/worker/src/computed-rankings.ts` owns transparent computed fallback/data rankings.
- `rankings/cn` owns Git-reviewed editorial ranking overrides.
- Atlas Academy CN export owns current objective game facts for auto-published classes.
- Atlas Academy `/info` owns the upstream CN revision used in dataset identity; `data/reports/atlas-source.json` is its generated local record.
- `data/cn-product-policy.json` owns the reviewed auto-publication boundary plus explicit publication, capability and ranking-rule versions.
- `data/cn-release-evidence.json` owns curated official links, aliases, stable display corrections and facts that cannot be deterministically derived from Atlas CN.
- `data/cn-strengthening-evidence.json` owns dated strengthening timeline evidence where explicitly verified.
- `data/fixtures` is deterministic test input only.
- `apps/worker` owns Atlas ingestion, normalization, publication gates, role/capability derivation, coverage catalog and snapshot/shard compilation.
- `apps/api` owns dynamic HTTP interfaces.

`data/raw`, `data/staged`, `data/normalized`, `data/reports` and `data/generated` are generated products. Do not edit them as facts.

A fact must have one owner. Do not add hash/fingerprint chains, duplicate approval state or per-class copies of the same pipeline. Use readable upstream or rule revisions owned at the relevant boundary.

## Region and publication policy

Atlas **CN** data establishes current objective fields for classes in `autoPublishClasses`. It does not by itself authorize every newly observed collection number for publication.

`data/cn-product-policy.json:autoPublishCollectionNoThrough` is the reviewed roster boundary. A candidate beyond that boundary must remain blocked unless a curated release entry explicitly covers it. Advancing the boundary is a Git-reviewed policy change and requires a new `publicationPolicyVersion`.

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

Add new capability parsing at the Atlas normalization boundary and keep ranking formulas consuming the normalized capability contract. Semantic changes to `apps/worker/src/capabilities.ts` require a new `capabilityRulesVersion` in `data/cn-product-policy.json`.

## Ranking policy

- `farming_90pp` and `high_difficulty` provide transparent computed coverage within each class; Git-reviewed entries override the same servant/mode.
- `support` only includes `support` and `hybrid` profiles and must not multiply support value by servant ATK.
- `np1_value` and `np5_value` only include servants with an attacking Noble Phantasm and use a neutral conditional-special-attack assumption.
- 90++ and high-difficulty formulas may use explicit scenario weights for conditional special attack; the rationale must state those weights.
- Small classes must not receive a forced T0 solely because the sample has one or a few servants.
- Computed scores are normalized within the servant's class so class population and class role remain the comparison boundary.
- Computed results must use `confidence=computed`; never present them as human consensus.
- AI may draft editorial changes but may not silently publish an editorial Tier.
- Semantic changes to `apps/worker/src/computed-rankings.ts` require a new `rankingFormulaVersion` in `data/cn-product-policy.json`.

## Strengthening coverage policy

Keep these states distinct:

```text
evidenced      # curated NP with a released dated event
atlas_current  # auto-published current Atlas state without a dated timeline claim
missing_event  # curated NP is currently strengthened but lacks a released dated event
unassessed     # servant has not passed publication
```

Do not count `atlas_current` as dated evidence. `missingStrengtheningEvents` must contain the concrete curated NP candidates that require source completion.

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
sync Atlas facts + revision -> prepare facts -> build snapshot/shards -> build Web and Mobile -> verify artifacts
```

Every API, Web, Mobile and cache read of a full `DatasetSnapshot` must pass the shared deep runtime validator. Do not replace it with shallow root-array checks or duplicate ad hoc validators in clients.

## Verification policy

Deterministic PR CI uses a stable all-class smoke fixture rather than committing the entire Atlas raw export. It must cover all 15 classes and keep the full 50-Archer slice. The fixture must also write a deterministic Atlas source revision so the reviewed build follows the production identity contract.

The live upstream workflow is the source of truth for current total coverage. A live run must pass Atlas sync, normalization, gates and snapshot compilation; diagnostic artifacts must expose Atlas source metadata, class coverage and generated shards.

Do not turn the current live count (for example 438) into a permanent count gate. The reviewed collection-number ceiling is a publication policy that advances through PR review as the CN roster grows.

## Publication/version policy

Reviewed dataset identity is:

```text
<ranking-date>-r<ranking-revision>
--atlas-<atlas-cn-revision>
--rel-<release-source-version>
--str-<strengthening-source-version>
--pub-<publication-policy-version>
--cap-<capability-rules-version>
--rank-<ranking-formula-version>
```

Atlas upstream changes, source manifest changes and deterministic rule changes must therefore create a new immutable dataset path without custom content hashes or database counters.

Source manifest semantic changes require explicit version bumps. Editorial ranking semantic changes require ranking date/revision advancement. Publication policy, capability derivation and ranking formula semantic changes require their matching product-policy version bump. PR CI enforces these rules.

Publish immutable version objects before changing `latest.json`.

## Human review boundary

GitHub Pull Requests are the only human approval boundary. `apps/admin` is read-only data status. Do not add approval tables/APIs/state machines or Git/database approval synchronization.

# CN data pipeline

## P0 current-state contract

```text
Atlas Academy CN export
  -> normalize playable roster + current skills/NP variants
  -> current objective facts
  -> release policy (`autoPublishClasses` + curated overrides)
  -> dated strengthening timeline enrichment
  -> complete Archer rankings
  -> snapshot + catalog/class/servant/ranking shards
```

## Fact owners

| Fact | Owner |
|---|---|
| Current CN playable roster for auto-published classes | Atlas Academy CN export |
| collectionNo, class, rarity, ATK, current skills/NP structures | Atlas CN normalization |
| Which classes may auto-publish | `data/cn-release-evidence.json:autoPublishClasses` |
| Official release links, aliases, display corrections | curated entries in `data/cn-release-evidence.json` |
| Dated strengthening timeline where verified | `data/cn-strengthening-evidence.json` |
| Editorial Tier overrides | `rankings/cn` |
| Computed fallback/data rankings | `apps/worker/src/computed-rankings.ts` |

Generated reports and snapshots are not fact owners.

## Atlas normalization

The live CN export uses NP card values `1=Arts`, `2=Buster`, `3=Quick`. The normalizer selects the current ordinary NP variant (`0 < priority < 190`) by conceptual NP identity, preserving genuine multi-NP servants while excluding battle placeholders.

It derives:

- current NP color, target scope and Hit count;
- current NP strengthening state;
- NP damage multipliers and simple conditional special multiplier when exposed in the damage function;
- max ATK;
- current self/team/target NP charge from current skill functions.

Current live baseline: 454 Atlas rows, 438 playable candidates, 50 Archer candidates.

## Release policy

`data/cn-release-evidence.json` contains:

```json
{
  "autoPublishClasses": ["archer"]
}
```

For an auto-published class, Atlas CN establishes current playable membership and objective facts. Curated entries are optional overlays for official links, stable display IDs/names, aliases and richer labels.

Classes not listed in `autoPublishClasses` are not automatically published; they continue to require curated release entries.

Curated NPs must still map to Atlas via `atlasSourceId`, and card/scope/hit facts must match.

## Strengthening policy

For auto-published Atlas CN entries, current NP strengthening status comes from the selected current CN NP variant. This is a **current-state fact**, not historical evidence.

`data/cn-strengthening-evidence.json` remains the owner for dated strengthening history. Where an event is available it enriches the servant timeline; current-state Atlas data must never be used to invent an event date.

## Ranking generation

Archer P0 publishes complete:

- `farming_90pp`
- `high_difficulty`
- `np1_value`
- `np5_value`

NP1/NP5 are deterministic data rankings. 90++/high difficulty use a transparent computed fallback for full coverage. Git-reviewed entries replace computed entries for the same servant/mode and keep their own confidence/rationale.

## P1 publication output

Each dataset version emits:

```text
metadata.json
catalog.json
snapshot.json
servants.json
rankings/<mode>.json
classes/<class>.json
servants/<servant-id>.json
release.json
```

The same consumable shards are mirrored under `data/generated/latest/`. Full `snapshot.json` remains for API compatibility/internal tools, but Web list pages and the mobile initial dataset use the class shard.

Dataset identity remains:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

No content hashes or fingerprint identities are introduced.

## Commands

```bash
pnpm data:prepare:fixture   # deterministic 50-Archer normalized candidate fixture
pnpm snapshot:build
pnpm typecheck
pnpm test
pnpm build
```

Production:

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
pnpm build
```

Scheduled upstream verification remains diagnostic only; it does not modify Git facts, editorial rankings or COS publication pointers.

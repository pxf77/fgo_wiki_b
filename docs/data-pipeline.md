# CN data pipeline

## Current contract

```text
Atlas Academy CN export
  -> normalize playable roster + current skills/NP variants
  -> derive current charge / role / capabilities
  -> all-class publication policy
  -> curated display/source overlays
  -> dated strengthening timeline enrichment
  -> role-aware computed rankings + editorial overrides
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
| Role/capability projections | worker normalization boundary |
| Editorial Tier overrides | `rankings/cn` |
| Computed fallback/data rankings | `apps/worker/src/computed-rankings.ts` |

Generated reports and snapshots are outputs, not new fact owners.

## Atlas normalization

The live CN export uses NP card values `1=Arts`, `2=Buster`, `3=Quick`. The normalizer selects current ordinary NP variants while preserving genuine multi-NP servants and excluding battle placeholders.

It derives:

- current NP color, target scope, Hit count and strengthening state;
- NP damage multipliers and simple conditional special multiplier;
- max ATK;
- current self/team/target NP charge;
- normalized capability signals from current skill functions/buffs;
- `attacker_single / attacker_aoe / support / hybrid` profile.

Capability contract:

```text
offense / support / survival / control
cleanse / pierce / cooldown / critical
```

Ranking code consumes this normalized contract instead of maintaining per-class skill parsers.

## Release policy

`data/cn-release-evidence.json` currently auto-publishes all 15 supported classes. Atlas CN establishes current playable membership and objective facts; curated entries are optional overlays for official links, aliases, stable IDs and richer labels.

Curated NPs must still map to Atlas via `atlasSourceId`, and card/scope/hit facts must match.

## Strengthening policy

For auto-published Atlas CN entries, current NP strengthening status comes from the selected current CN NP variant. This is a current-state fact, not historical evidence.

`data/cn-strengthening-evidence.json` remains the owner for dated strengthening history. Never invent an event date from current-state Atlas data.

## Ranking generation

The generated ranking set is role-aware and class-relative:

- `farming_90pp`: all published servants, normalized inside each class;
- `high_difficulty`: all published servants, normalized inside each class;
- `support`: only `support` / `hybrid` profiles;
- `np1_value` / `np5_value`: only servants with an attacking NP.

Git-reviewed entries replace computed entries for the same servant/mode and retain their own confidence/rationale.

Latest live validation produced:

```text
farming_90pp       438
high_difficulty    438
support            107
np1_value          392
np5_value          392
```

## Publication output

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

`latest/` mirrors the consumable shards. Full `snapshot.json` remains for compatibility/API/internal tools; Web and Mobile load catalog/class/detail data at the smallest useful granularity.

## Verification

Deterministic PR CI uses:

```text
50 real Archer normalized candidates
+ 14 non-Archer representatives
= 64 candidates covering all 15 classes
```

This avoids committing a large upstream export while exercising every class through the same release/ranking/shard compiler.

Production/live verification always starts from Atlas raw:

```bash
pnpm data:sync:atlas
pnpm data:prepare
pnpm snapshot:build
```

Latest live result:

```text
454 raw Atlas rows
438 playable CN candidates
438 published servants
15 classes
0 blocked
15 class shards
438 servant detail shards
```

The current count is diagnostic, not a permanent gate; Atlas roster growth is expected.

## Dataset identity

Current identity remains:

```text
<ranking-date>-r<ranking-revision>--rel-<release-source-version>--str-<strengthening-source-version>
```

No local content hashes or fingerprint identities are introduced. If pure Atlas changes need a distinct immutable identity, add a readable source-owned upstream revision rather than a locally calculated digest.

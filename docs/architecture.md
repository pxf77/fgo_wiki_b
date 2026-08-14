# Architecture

## Runtime topology

```text
Atlas CN + CN official announcements
              |
              v
       ingestion worker
              |
              v
        normalized data ----> PostgreSQL
              |
              v
       deterministic engines
              |
              v
        editorial review
              |
              v
 immutable snapshot in COS/CDN
       |          |          |
      Web        PWA       Mobile

Dynamic user/account functions -> Fastify API -> PostgreSQL
```

## Snapshot contract

The release pointer (`latest.json`) is mutable and short-cache. Every referenced dataset path is immutable and long-cache.

```text
snapshots/{datasetVersion}/snapshot.json
snapshots/{datasetVersion}/metadata.json
snapshots/{datasetVersion}/servants.json
snapshots/{datasetVersion}/rankings/{mode}.json
snapshots/latest.json
```

Clients start from their local snapshot, check `latest.json`, then replace local data only after the complete snapshot has parsed successfully. No custom cryptographic consistency chain is required.

## Write path

1. Worker detects upstream or CN announcement changes.
2. Deterministic tags and derived values are recalculated.
3. A review candidate is generated.
4. An editor updates `rankings/cn` and records a reason.
5. CI validates references and compiles a new snapshot.
6. Snapshot files are uploaded before `latest.json` is switched.

## Read path

- Public servant and ranking browsing is local/CDN-first.
- API handles user collections, personalized recommendations and admin writes.
- Web pages are statically generated for SEO and shareability.
- Mobile bundles a bootstrap snapshot and updates it independently of App Store releases.

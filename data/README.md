# Data directories

Source facts and policy committed to Git:

- `data/cn-product-policy.json`: reviewed automatic-publication boundary plus publication, capability and ranking-formula versions.
- `data/cn-release-evidence.json`: version-controlled CN servant availability and official release evidence.
- `data/cn-strengthening-evidence.json`: version-controlled CN skill/NP strengthening events and official evidence.
- `rankings/cn`: Git-reviewed editorial ranking source files.
- `data/fixtures`: deterministic upstream-shaped test input only.

Generated work products, ignored by Git:

- `data/raw`: upstream captures for normalization.
- `data/staged`: normalized Atlas candidates.
- `data/normalized`: publication-gated and strengthening-gated servant output.
- `data/reports/atlas-source.json`: Atlas `/info` CN revision captured with the raw export.
- `data/reports`: normalization, evidence-gate and class-coverage reports.
- `data/reports/cn-class-catalog.json`: per-class coverage, missing-source candidates, missing dated-strengthening candidates and incomplete source-entry drafts.
- `data/generated`: immutable compiled snapshots.

Generated files are never fact owners and must not be edited as source data. In particular, a class-catalog draft is only a work item; verified release dates, official URLs, charge summaries, tags, roles and effect descriptions must be added through a GitHub Pull Request to the actual source manifest.

A new Atlas servant beyond `autoPublishCollectionNoThrough` remains blocked until the product-policy boundary is reviewed and advanced, or a curated release entry explicitly covers that servant.

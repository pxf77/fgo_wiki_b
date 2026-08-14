# Data directories

Source facts committed to Git:

- `data/cn-release-evidence.json`: version-controlled CN servant availability and official release evidence.
- `data/cn-strengthening-evidence.json`: version-controlled CN skill/NP strengthening events and official evidence.
- `rankings/cn`: Git-reviewed editorial ranking source files.
- `data/fixtures`: deterministic upstream-shaped test input only.

Generated work products, ignored by Git:

- `data/raw`: upstream captures for normalization.
- `data/staged`: normalized Atlas candidates.
- `data/normalized`: release-gated and strengthening-gated servant output.
- `data/reports`: normalization, evidence-gate and class-coverage reports.
- `data/reports/cn-class-catalog.json`: per-class coverage, missing-source candidates and incomplete source-entry drafts.
- `data/generated`: immutable compiled snapshots.

Generated files are never fact owners and must not be edited as source data. In particular, a class-catalog draft is only a work item; verified release dates, official URLs, charge summaries, tags, roles and effect descriptions must be added through a GitHub Pull Request to the actual source manifest.

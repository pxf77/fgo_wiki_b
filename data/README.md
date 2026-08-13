# Data directories

Source facts committed to Git:

- `data/cn-release-evidence.json`: reviewed CN servant availability and official release evidence.
- `data/cn-strengthening-evidence.json`: reviewed CN skill/NP strengthening events and official evidence.
- `rankings/cn`: reviewed editorial ranking source files.
- `data/fixtures`: deterministic upstream-shaped test input only.

Generated work products, ignored by Git:

- `data/raw`: upstream captures for normalization.
- `data/staged`: normalized Atlas candidates.
- `data/normalized`: release-gated and strengthening-gated servant output.
- `data/reports`: normalization and evidence-gate reports.
- `data/generated`: immutable compiled snapshots.

Generated files are never fact owners and must not be edited as source data.

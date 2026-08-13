# Data directories

- `data/cn-release-evidence.json`: human-reviewed CN servant release decisions and official evidence.
- `data/fixtures`: deterministic test input. Never publish fixture data.
- `data/raw`: upstream Atlas captures; generated and ignored by Git.
- `data/staged`: normalized Atlas candidates; generated and ignored by Git.
- `data/normalized`: release-gated CN records; generated and ignored by Git.
- `data/reports`: normalization and gate reports; generated and ignored by Git.
- `data/generated`: immutable compiled snapshots; generated and ignored by Git.
- `rankings/cn`: human-reviewed editorial ranking source files committed to Git.

The production flow is `raw -> staged -> CN release gate -> normalized -> snapshot`. Upstream presence alone never marks a servant as released in CN.

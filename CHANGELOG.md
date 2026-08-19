# Changelog

## 0.2.0 - 2026-08-19

### Added

- Added Atlas CN upstream revision, publication-policy version, capability-rules version and ranking-formula version to immutable dataset identity.
- Added a shared deep runtime validator for metadata, servants, Noble Phantasms, strengthening events and ranking references.
- Added a reviewed `collectionNo` ceiling for automatic CN publication.
- Added concrete strengthening coverage for dated evidence, Atlas current state and missing dated events.

### Changed

- NP1/NP5 data rankings now use neutral conditional-special-attack assumptions.
- 90++ and high-difficulty rankings use explicit conditional-special-attack scenario weights.
- Support ranking no longer scales with servant ATK.
- Small classes no longer receive a forced T0 solely because of sample size.
- Admin data status now exposes all source/rule versions and separate strengthening coverage counts.

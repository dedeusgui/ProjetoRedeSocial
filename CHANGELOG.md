# Changelog

All notable changes to this project should be documented in this file.

## 2026-03-04

### Added

- Added root `CHANGELOG.md` to track notable project updates.
- Created a full engineering documentation hub at `docs/README.md`.
- Added architecture documentation:
  - `docs/architecture/system-overview.md`
  - `docs/architecture/backend-modules.md`
  - `docs/architecture/frontend-overview.md`
  - `docs/architecture/diagrams.md` (Mermaid diagrams)
- Added API documentation:
  - `docs/api/http-contract.md`
  - `docs/api/endpoints.md`
- Added engineering workflow documentation:
  - `docs/workflows/bugfix-process.md`
  - `docs/workflows/feature-process.md`
  - `docs/workflows/release-notes.md`
- Added operational runbook:
  - `docs/runbook/local-development.md`
- Added documentation governance:
  - `docs/governance/documentation-policy.md`
- Added reusable templates:
  - `docs/templates/bug-report.md`
  - `docs/templates/feature-rfc.md`
- Added root `AGENTS.md` with collaboration rules focused on agent behavior.

### Changed

- Updated `README.md` to include the Engineering docs hub link (`docs/README.md`).
- Updated `README.md` with explicit agent/dev decision-gate policy.
- Updated `docs/README.md` onboarding flow to require `AGENTS.md` first.
- Updated governance/workflow/template docs to enforce docs-first + developer decision gate:
  - `docs/governance/documentation-policy.md`
  - `docs/workflows/feature-process.md`
  - `docs/workflows/bugfix-process.md`
  - `docs/templates/feature-rfc.md`
- Updated frontend docs to document delegated button-based navigation (`data-nav-href` + `components/navigation.js`):
  - `docs/architecture/frontend-overview.md`
  - `src/public/js/README.frontend.md`
- Updated root frontend overview in `README.md` to reflect the shared navigation pattern.
- Refined moderation trend calculation to use a unified validation score (`approvalRate - rejectionRate`) while preserving `positive|neutral|negative` outcomes.
- Updated profile UI to show a single derived "Score geral" metric based on private approval/rejection percentages.
- Updated feed/post tendency labels and review feedback text to use localized tendency labels (`positiva`, `neutra`, `negativa`).
- Removed redundant approval/rejection cards from profile UI, keeping only the consolidated score and tendency.

### Notes

- This update focused on documentation and process assets for better idea refinement, bugfix workflows, and feature implementation consistency.

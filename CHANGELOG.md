# Changelog

All notable changes to this project should be documented in this file.

## 2026-03-05

### Added

- Added `admin` backend module with layered structure (`routes/controllers/services/repositories`).
- Added admin endpoints:
  - `GET /api/v1/admin/users`
  - `GET /api/v1/admin/moderator-eligibility`
  - `PATCH /api/v1/admin/users/:id/moderator`
  - `DELETE /api/v1/admin/users/:id`
- Added admin-only deletion endpoints:
  - `DELETE /api/v1/posts/:id`
  - `DELETE /api/v1/comments/:id`
- Added moderator-governance logic:
  - balanced eligibility requirements (`minPosts=5`, `minAccountAgeDays=14`, `minApprovalRate=70`)
  - admin-only grant/revoke flow for `moderator`
- Added environment-driven admin bootstrap via `ADMIN_EMAILS`.
- Added admin management UI inside `src/public/pages/admin/reviews.html` to list eligible users and active moderators with grant/revoke actions.
- Added admin tools panel in `profile.html` to list users and their current roles for testing.
- Added admin delete action in profile admin tools for removing non-admin users.
- Added admin delete controls in feed and post pages for posts/comments.

### Changed

- Enforced role authorization on moderation endpoint (`POST /api/v1/posts/:id/review`) using `roles("moderator", "admin")`.
- Updated `DELETE /api/v1/posts/:id` authorization to allow post owner or admin deletion.
- Updated moderation flow to persist per-post moderation metrics (`approvedCount`, `notRelevantCount`, `totalReviews`, `likePercentage`, `dislikePercentage`) and return them in feed/post endpoints.
- Updated private profile metrics to include decision counters and to compute approval/rejection rates as averages across authored posts.
- Updated moderator eligibility requirement `minApprovalRate` from `70` to `90`.
- Enforced moderation rule preventing authors from reviewing their own posts.
- Updated auth middleware to resolve role from current database user on each authenticated request (prevents stale JWT role issues after role changes).
- Updated feed/post/profile/admin UIs to display new moderation metrics and owner-or-admin post deletion controls.
- Updated auth service to ensure users whose email is in `ADMIN_EMAILS` receive role `admin` on register/login.
- Updated docs and architecture references to include the new admin module, routes, and role-governance contract.
- Replaced post edit `prompt` UX with a shared modal controller (`create | edit`) on feed/post pages, including state reset on close/cancel.
- Replaced comment edit `prompt` UX with inline editing in post details (`Salvar`/`Cancelar`, `Esc` cancela, `Ctrl+Enter` salva) without page reload.
- Updated API docs to include existing edit endpoints `PATCH /api/v1/posts/:id` and `PATCH /api/v1/comments/:id`.
- Updated moderation authorization/rules so any authenticated user (`user` or higher), including the post author, can submit `POST /api/v1/posts/:id/review`.

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
- Updated tendency rule: `neutral` is now only the exact 50/50 split; any imbalance becomes `positive` or `negative`.

### Notes

- This update focused on documentation and process assets for better idea refinement, bugfix workflows, and feature implementation consistency.

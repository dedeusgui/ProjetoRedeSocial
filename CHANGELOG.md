# Changelog

All notable changes to this project should be documented in this file.

## 2026-03-11

### Added

- Added post sequencing with:
  - `GET /api/v1/me/posts`
  - `GET /api/v1/posts/:id/sequence`
  - optional `previousPostId` on post create/update
- Added public collections with:
  - `GET /api/v1/collections/:id`
  - `GET /api/v1/me/collections`
  - `POST /api/v1/collections`
  - `PATCH /api/v1/collections/:id`
  - `DELETE /api/v1/collections/:id`
  - `POST /api/v1/collections/:id/items`
  - `DELETE /api/v1/collections/:id/items/:postId`
  - `PATCH /api/v1/collections/:id/items/reorder`
- Added public collection page and profile collection-management UI.
- Added sequence-aware create/edit support in the shared post modal.
- Added RFC `docs/rfcs/collections-post-sequencing.md`.

### Changed

- Extended feed, owned-post, and post-detail payloads with `sequence` and `collections[]` context.
- Extended feed search so both feed modes may also match collection tags while preserving chronological ordering.
- Updated post deletion and admin user deletion flows to remove post references from collections.

### Docs

- Updated architecture, API, frontend, and frontend-guide docs to describe collections, sequencing, and their UI/API surfaces.

## 2026-03-10

### Added

- Added owner-managed profile avatar support with:
  - `POST /api/v1/me/avatar`
  - `DELETE /api/v1/me/avatar`
- Added local-disk avatar storage and a profile-page avatar upload/remove workflow.
- Added public author chips on feed, post detail, and comments showing avatar, username, and reputation tier without public profile navigation.
- Added post image upload support with:
  - `POST /api/v1/posts/:id/media`
  - `DELETE /api/v1/posts/:id/media/:mediaId`
- Added local-disk upload storage served from `/uploads`, with post `media[]` metadata stored in MongoDB.
- Added post create/edit modal support for selecting images and removing existing post images.
- Added feed/post rendering for uploaded post images and RFC `docs/rfcs/post-image-uploads.md`.
- Added protected followed-tag endpoints:
  - `GET /api/v1/me/followed-tags`
  - `POST /api/v1/me/followed-tags`
  - `DELETE /api/v1/me/followed-tags/:tag`
- Added protected chronological followed-tags feed endpoint `GET /api/v1/feed/following`.
- Added feed-page `Tags que sigo` mode with manual tag follow form and visible followed-tag list.
- Added follow/unfollow actions on tag chips in both the feed and post detail views.
- Added RFC `docs/rfcs/follow-tags-feed.md` for the implemented feature.
- Added optional post questionnaires with:
  - single-choice questions and one correct answer per question
  - questionnaire authoring in the shared post create/edit modal
  - first-question preview on feed cards
  - full questionnaire self-check flow on post detail for signed-in users
- Added RFC `docs/rfcs/post-questionnaires.md` for the implemented feature.

### Changed

- Extended `GET /api/v1/me/profile` to include avatar preview data and public-reputation preview data.
- Extended feed/post/comment author payloads to include avatar URLs and derived reputation tiers.
- Enlarged the profile-page username header and repositioned profile identity content around the new avatar controls.
- Extended post and feed responses to include uploaded post `media[]`.
- Extended post create/update/feed/detail payloads to include optional `questionnaire` data.
- Updated post deletion flow to clean up uploaded files from disk.
- Extended the user model with canonical lowercase `followedTags` storage.
- Kept personalization chronological by filtering followed tags without changing the default public feed behavior.
- Updated feed and post renderers to expose tag-based follow controls for authenticated users.
- Improved user-facing validation/auth/upload error messages with clearer PT-BR descriptions and actionable upload limits/details.
- Tightened post title/content validation to `100` / `3000` characters and enforced the same limits on both post create and edit flows.
- Improved shared post/comment wrapping and spacing so long text no longer breaks feed/post layouts, with clearer separation between post detail and comments.
- Reorganized the shared post create/edit modal into clearer sections with explicit post-type selection (`post normal` vs `post com questionário`) while preserving existing creation, edit, image upload, and questionnaire capabilities.
- Updated the questionnaire editor UI with cleaner hierarchy, clearer limits, and improved action labels for pergunta/alternativa management.
- Replaced native-looking file inputs in post/profile flows with a custom file-picker presentation that keeps real upload behavior and accessibility.

### Docs

- Updated architecture, API, frontend, and RFC docs to describe private-profile avatar management and the limited public author summary contract.
- Updated architecture and API docs to describe post media upload storage, routes, and response changes.
- Updated architecture, API, and frontend docs to describe followed tags and the new personalized feed flow.
- Updated architecture, API, frontend, and RFC docs to describe optional post questionnaires and their current self-check tradeoff.
- Corrected endpoint docs for post/comment deletion authorization to match current code behavior.
- Updated post validation limits and backend-module rules in the docs to match the current implementation.

### Fixed

- Corrected Portuguese accentuation in key frontend labels, status messages, and modal copy.
- Reduced frontend duplication by centralizing shared auth/status text and followed-tag normalization used by feed and post pages.
- Simplified feed card click orchestration by consolidating redundant event listeners into a single delegated handler.

## 2026-03-09

### Fixed

- Removed the self-referential `Feed` button from `src/public/pages/feed.html` and the self-referential `Meu perfil` button from `src/public/pages/profile.html`.
- Cleaned `src/public/js/pages/profile.js` so the profile page no longer queries/passes a navbar profile-link hook that was removed from its own markup.
- Removed the redundant session summary card from `src/public/pages/index.html` and cleaned the home-page script so it no longer queries or toggles session/nav elements that are absent on that page.
- Preserved home notices by rendering redirect/logout messages through the existing auth status area after the session card removal.

## 2026-03-06

### Added

- Added public feed search on `GET /api/v1/feed` with optional `search` filtering across post `title`, `content`, and `tags`.
- Added feed-page search UI with reset support while preserving chronological pagination for matched posts.

### Changed

- Reworked the shared frontend background into a subtle animated starfield across all pages, with slow CSS drift/twinkle and `prefers-reduced-motion` fallback.

### Fixed

- Corrected author approval calculation to use `approvedVotes / totalVotes * 100`, clamped to `0..100` and rounded to the nearest integer.
- Removed redundant "Não relevante" post metric from feed/post rendering, leaving only approval percentage visible.
- Removed redundant profile score display and aligned profile/admin UI labels with approval percentage semantics.
- Updated architecture/API/frontend docs to describe approval percentage fields and current moderation behavior.
- Removed redundant explanatory sections and load-success status copy across feed, post, profile, and admin pages while preserving error/loading feedback.

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
- Replaced split private profile metrics (`approvalRate/rejectionRate` and per-decision counts) with a unified `score` metric plus `totalReviews`.
- Updated admin moderator eligibility from `minApprovalRate` to `minScore` and aligned admin/profile UI cards with unified score display.

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

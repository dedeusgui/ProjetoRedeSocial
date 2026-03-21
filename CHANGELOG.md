# Changelog

All notable changes to this project should be documented in this file.

## 2026-03-21

### Fixed

- Fixed the post detail gallery so it now keeps one consistent grid for every media count: a single image spans the full row in `16:9`, two and four images stay in square tiles, and a three-image gallery promotes the first image without switching to a separate JS-driven layout path.

### Changed

- Unified post and collection tag handling around one canonical rule set: comma-separated input still feeds `tags[]`, but stored tags are now normalized to lowercase without leading `#`, internal spaces become hyphens, unsupported characters are removed, each tag is capped at `10` characters, and both posts and collections are capped at `5` tags.
- Upgraded the shared post modal and the collection modal with realtime normalized-tag previews, visible rule indicators, and submit-blocking tag validation before API requests are sent.
- Changed the shared post modal so repeated image selections now accumulate up to 4 temporary uploads with local previews and per-item removal, while edit mode keeps saved images ahead of newly selected ones.
- Reframed shared post-image surfaces around a balanced `4:3` crop so feed previews and post-detail gallery items no longer look flattened when users upload vertical or square images.
- Tightened the post-detail image gallery into a stable two-column grid with a one-column fallback on narrow screens so multiple images read as one cohesive block instead of loose individual tiles.
- Changed feed post-image previews so posts with multiple saved images now show a compact `+N` overlay on the first preview instead of helper text below the image.

### Added

- Added shared backend/frontend tag utilities plus a reusable frontend tag-input component so post and collection forms no longer duplicate parsing, normalization, or validation rules.
- Added unit coverage for the shared tag utilities to keep frontend and backend limits aligned.

### Docs

- Updated API, backend architecture, frontend architecture, and frontend guide docs to describe the unified post/collection tag rules and the new realtime validation flow.

## 2026-03-20

### Fixed

- Restored `PATCH /api/v1/posts/:id` for the real post author after a backend ownership-check regression in the post edit flow started reading a populated `authorId` during the author comparison.

### Added

- Added `GET /api/v1/admin/users/:id/delete-preview` so the admin tools can load a risk-gated deletion summary before any destructive action runs.

### Changed

- Replaced the direct `Delete user` action in the profile admin tools with a native confirmation modal that now has two levels: summary-only for low-impact accounts, and impact-preview plus exact `@username` confirmation for users with posts, collections, or meaningful visible-comment activity.
- Narrowed admin-side account deletion so only standard users (`role: user`) can be deleted from the admin tools; `moderator` and `admin` accounts no longer expose that action.
- Added a hybrid visible-comment threshold to the admin delete preview so active non-posting users can still fall into `level_2` without forcing the strong modal for only a few comments.

### Docs

- Updated API, backend architecture, frontend architecture, and frontend guide docs to describe the new admin delete-preview endpoint and the two-level admin deletion modal.

## 2026-03-19

### Fixed

- Restored tag follow/unfollow actions on `collection.html`, so authenticated users can manage followed tags directly from the public collection detail page instead of only from feed cards or post detail.
- Restored tag follow/unfollow actions on `collections.html`, so owner collection cards in `My collections` now match the collection feed and collection detail behavior.
- Removed collection navigation buttons from post-context surfaces, so posts still show collection membership but no longer use embedded links to open `collection.html`.
- Removed the remaining static collection pills from post and collection surfaces, including `Collection(s)`, collection-title pills, and `Manual order`, without changing collection CRUD or navigation entry points.

### Changed

- Added an owner-only `Manage collection` shortcut to public collection cards and the public collection detail hero, both routing to `collections.html` without adding a new route or inline CRUD surface.
- Refined the owner collection-card action hierarchy on `collections.html` so `Open collection` stays primary, `Edit` remains secondary, and `Delete` sits in its own destructive row instead of sharing equal visual weight.
- Tightened the spacing and divider around the owner collection-card `Delete` row so the destructive action stays separated without feeling detached from `Open collection`, `Edit`, and `Add a post`.
- Added a lightweight native confirmation modal for collection deletion on `collections.html`, with dynamic impact copy, safer default focus on `Cancel`, and button-level loading state while the existing delete API runs.
- Compacted the collection-delete confirmation modal into a narrower, denser danger dialog so it reads less like a wide banner and more like the existing account-delete modal.

## 2026-03-18

### Fixed

- Mirrored the backend comment-length rule on `post.html` so both the comment composer and inline edit textarea now stop at 2000 characters and show a simple live counter before any invalid request reaches the API.
- Refined `feed.html` responsiveness for small phones so the segmented `Posts` / `Collections` switch stays on its own row and the `Followed tags` toggle stays on a separate full-width row across the mobile S through mobile L range, while the banner and followed-tags dropdown remain readable without horizontal squeeze or overflow.
- Restored the `Confirm password` field and its frontend hooks on `index.html` so account creation once again blocks submission locally when the repeated password does not match.
- Fixed the owner collections `Add to collection` flow so the CTA stays disabled until a post is selected, re-disables when the selection is cleared, and shows explicit feedback instead of failing silently when triggered without a valid post.

## 2026-03-17

### Changed

- Added a `Confirm password` field to the account-creation form on `index.html` and blocked registration submission until the repeated password matches.
- Removed the `Search` submit button from `feed.html` and changed feed search to debounced real-time loading with `Enter` still available as an immediate keyboard submit.
- Restyled `Posts` / `Collections` on `feed.html` as a single segmented control so content-type switching reads as one mutually exclusive filter group instead of competing with the search field.
- Added a lightweight followed-tags state banner below the feed filter row that appears only while the followed-tags filter is active and previews a few followed tags plus a `+N` overflow count.

### Fixed

- Prevented stale feed-search responses from overwriting newer results by ignoring out-of-order realtime search requests in `src/public/js/pages/feed.js`.

### Docs

- Updated frontend architecture and the frontend guide to describe the account-creation password confirmation check on `index.html`.
- Updated frontend architecture and the frontend guide to describe the current feed discovery surface, including the debounced search flow, segmented content-type control, and followed-tags state banner.
- Updated the feed-search RFC and followed-tags RFC to reflect the current feed discovery behavior.

## 2026-03-16

### Changed

- Restored the original compact feed-page followed-tags dropdown as the list container, moved the improved chip-based management UI into it, and kept the manual follow form outside the dropdown.
- Standardized followed-tag normalization across frontend and backend to trim input, collapse repeated whitespace before validation, lowercase stored values, and restrict canonical followed tags to 32 characters using only letters, numbers, hyphen, and underscore.

### Fixed

- Removed the followed-tags management XSS vector by replacing the unsafe `innerHTML` rendering path with DOM-based chip rendering via `createElement` and `textContent`.
- Prevented oversized or invalid followed tags from breaking the feed management layout by truncating chip labels visually, keeping the list inside a bounded scroll area, and letting touch users preview the full tag value without resizing the chip.

### Docs

- Updated architecture, frontend, API, and RFC docs to reflect the compact followed-tags dropdown flow and the stricter canonical followed-tag validation rules.

## 2026-03-13

### Added

- Added authenticated self-service account deletion with `DELETE /api/v1/me`.
- Added a profile-page danger zone and confirmation modal that requires the exact word `DELETE` before permanent account deletion.
- Added RFC `docs/rfcs/profile-account-deletion.md`.

### Changed

- Unified self-delete and admin delete behind shared backend cleanup so both flows now remove avatar files, authored post-media files, authored content, remaining collection references, and then recalculate derived stats.
- Blocked `admin` accounts from self-delete on the profile page and in `DELETE /api/v1/me`.

### Fixed

- Updated the `index.html` sign-in and registration forms to use browser-recognizable autocomplete semantics so saved credentials can be suggested again after logout without any JavaScript-managed password handling.
- Updated the `index.html` boot flow to validate any stored token with `GET /api/v1/me/profile` before redirecting to `feed.html`, so stale or invalid local sessions no longer block the sign-in screen.

### Docs

- Documented the new self-delete endpoint, shared backend cleanup path, and profile danger-zone UX.
- Documented the frontend rule that auth forms must rely on standard HTML autocomplete tokens instead of manual password autofill logic.
- Documented the authenticated home-page boot rule that treats stored tokens as tentative until backend validation succeeds.

## 2026-03-12

### Added

- Added `npm run test:populate`, a destructive local-only heavy seed + smoke runner that resets an explicit seed database, creates fake users/content/media, verifies key API flows, and leaves the seeded data available for later manual browsing.

### Changed

- Unified the `feed.html` page header and search/discovery controls into a single header surface, removed the redundant feed helper copy, and hid the inline search label text while preserving the existing search behavior.
- Refactored the shared post create/edit modal to remove the explicit `regular` vs `questionnaire` post-type selector.
- Integrated questionnaire authoring into one optional expandable `Add questionnaire / poll` section inside the same modal while preserving the existing post payload shape and backend behavior.
- Kept questionnaire removal on edit tied to clearing the questionnaire draft and saving, instead of using the expand/collapse control as a destructive toggle.
- Repositioned the optional poll section below `Post images` and restyled it as a neutral disclosure row so it no longer competes visually with uploads or the `Publish` action.
- Refined the profile avatar controls into a compact avatar-attached contextual menu with `Upload photo` and `Remove photo`, preserving the existing avatar upload/remove endpoints and owner-only behavior.
- Realigned collection feed cards, owner collection cards, public collection detail, and questionnaire blocks to the same spacing and chip rhythm used by post/feed cards.
- Replaced remaining collection-facing `reading path` copy with consistent `collection` terminology and shifted collection/questionnaire accent labels to the existing Patrick typography treatment.

### Fixed

- Kept the post detail comment composer collapsed on initial load so opening a post no longer auto-expands the comment area before the user explicitly chooses to comment.
- Fixed the profile avatar upload action so the file picker is no longer interrupted by an immediate menu rerender, and removed the obsolete profile-image helper panel from the profile card.
- Kept the profile reputation badge and approval line compact so they no longer stretch across empty space after the avatar-card refactor.
- Kept the private moderation metric card full-width while centering its content so low-content states no longer look visually empty on the profile page.

### Docs

- Updated frontend docs to describe the feed page as one unified header/discovery surface instead of a separate header plus discovery panel.
- Updated frontend architecture and frontend guide docs to describe the integrated expandable questionnaire flow.
- Updated frontend and RFC docs to describe the profile avatar contextual action menu.
- Updated the questionnaire RFC with the March 12, 2026 UI decision record.
- Updated the collections/questionnaire frontend docs and RFCs to record the visual unification with the post/feed card system.

## 2026-03-11

### Added

- Added collections-feed groundwork endpoints:
  - `GET /api/v1/collections/feed`
  - `GET /api/v1/collections/feed/following`
- Added a dedicated owner collections management page to replace feed-embedded collection CRUD.

### Changed

- Removed owner collection CRUD from `feed.html` and turned the page into the shared browsing surface for `Posts` vs `Collections` switching.
- Simplified collection CTA flow so `feed.html` keeps a single `My collections` link and `collections.html` keeps a single `New collection` trigger.
- Documented that the future followed-tags mode for the collections feed matches collection tags only.
- Consolidated the feed search and followed-tags controls into one compact discovery panel below the header, replaced the always-visible followed-tags list with a dropdown, and removed redundant helper copy from that panel.

### Docs

- Updated architecture and API docs to describe the dedicated owner collections page and the collections-feed groundwork endpoints.
- Updated frontend docs to describe the compact feed discovery panel and followed-tags dropdown behavior.

### Fixed

- Registered feed routes before generic collection-detail routes so `GET /api/v1/collections/feed` is no longer misread as `/collections/:id`.
- Removed the committed root-level scratch helper scripts (`tmp_check.mjs`, `tmp_fix_encoding.mjs`, `tmp_update_css.mjs`, `tmp_write_renderer.mjs`) because they were one-off developer utilities with no runtime or npm-script role.

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
- Moved owner collection management from the profile page to the feed page while keeping the collections API unchanged.
- Restyled collection and questionnaire surfaces to match the main project UI more closely, with flatter cards and white modal copy.
- Simplified sequence context chips to a single shorter label.

### Docs

- Updated architecture, API, frontend, and frontend-guide docs to describe collections, sequencing, and their UI/API surfaces.
- Updated agent/process guidance to require removing or promoting temporary helper scripts before handoff.

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
- Added feed-page `Followed tags` mode with manual tag follow form and visible followed-tag list.
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
- Improved user-facing validation/auth/upload error messages with clearer English descriptions and actionable upload limits/details.
- Tightened post title/content validation to `100` / `3000` characters and enforced the same limits on both post create and edit flows.
- Improved shared post/comment wrapping and spacing so long text no longer breaks feed/post layouts, with clearer separation between post detail and comments.
- Reorganized the shared post create/edit modal into clearer sections with explicit post-type selection (`regular post` vs `questionnaire post`) while preserving existing creation, edit, image upload, and questionnaire capabilities.
- Updated the questionnaire editor UI with cleaner hierarchy, clearer limits, and improved action labels for question/option management.
- Replaced native-looking file inputs in post/profile flows with a custom file-picker presentation that keeps real upload behavior and accessibility.

### Docs

- Updated architecture, API, frontend, and RFC docs to describe private-profile avatar management and the limited public author summary contract.
- Updated architecture and API docs to describe post media upload storage, routes, and response changes.
- Updated architecture, API, and frontend docs to describe followed tags and the new personalized feed flow.
- Updated architecture, API, frontend, and RFC docs to describe optional post questionnaires and their current self-check tradeoff.
- Corrected endpoint docs for post/comment deletion authorization to match current code behavior.
- Updated post validation limits and backend-module rules in the docs to match the current implementation.

### Fixed

- Corrected remaining localization inconsistencies in key frontend labels, status messages, and modal copy.
- Reduced frontend duplication by centralizing shared auth/status text and followed-tag normalization used by feed and post pages.
- Simplified feed card click orchestration by consolidating redundant event listeners into a single delegated handler.

## 2026-03-09

### Fixed

- Removed the self-referential `Feed` button from `src/public/pages/feed.html` and the self-referential `My profile` button from `src/public/pages/profile.html`.
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
- Removed redundant "Not relevant" post metric from feed/post rendering, leaving only approval percentage visible.
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
- Replaced comment edit `prompt` UX with inline editing in post details (`Save`/`Cancel`, `Esc` cancels, `Ctrl+Enter` saves) without page reload.
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
- Updated profile UI to show a single derived "Overall score" metric based on private approval/rejection percentages.
- Updated feed/post tendency labels and review feedback text to use localized tendency labels (`positive`, `neutral`, `negative`).
- Removed redundant approval/rejection cards from profile UI, keeping only the consolidated score and tendency.
- Updated tendency rule: `neutral` is now only the exact 50/50 split; any imbalance becomes `positive` or `negative`.

### Notes

- This update focused on documentation and process assets for better idea refinement, bugfix workflows, and feature implementation consistency.

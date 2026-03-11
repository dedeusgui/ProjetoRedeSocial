# Frontend Overview

## Runtime Context

The frontend is static and served from `src/public` by Express:

- pages: `src/public/pages`
- scripts: `src/public/js`
- styles: `src/public/css/style.css`
- shared visual background: global CSS starfield layers with reduced-motion fallback

The frontend consumes backend endpoints at `/api/v1`.

## JS Architecture

Folder responsibilities:

- `api.js`
  - HTTP client facade for API calls.
- `core/`
  - session handling, formatter helpers, shared UI copy, and API error-to-UI state mapping.
- `components/`
  - reusable UI behavior (navbar state, delegated navigation, flash messages).
- `features/<domain>/renderers.js`
  - render functions grouped by feature domain.
- `pages/*.js`
  - page bootstrap, event bindings, orchestration.

Reference guide:
- `src/public/js/README.frontend.md`

## UI Pages

- `index.html`: authentication entrypoint.
- `feed.html`: chronological public feed with search, authenticated `Followed tags` mode, manual tag follow form, tag follow/unfollow actions, post create/edit image upload, explicit post-type selection (`regular` vs `questionnaire`) in the shared post modal, questionnaire authoring, questionnaire first-question preview on cards, visible sequence membership on cards, and public author chips (avatar, username, reputation tier).
- `post.html`: post detail with comments, approval percentage, tag follow/unfollow actions, sequence context links, full sequence panel, collection membership links, post edit image upload/removal, full questionnaire rendering with logged-in self-check, and public author chips for the post author and comment authors.
- `profile.html`: authenticated profile with private approval metrics, avatar upload/removal controls, owner post management, collection CRUD/item management, and admin tools for admins.
- `collection.html`: public collection page with ordered collection items and sequence context for each item.
- `admin/reviews.html`: moderation review flow and admin-only moderator management panel.

## Navigation Pattern

- Internal page navigation uses buttons with `data-nav-href`.
- `components/navigation.js` exposes `bindNavigation()` for delegated click-to-navigation behavior.
- Page bootstraps should call `bindNavigation()` in `init()` when page markup includes `data-nav-href`.
- Keep semantic buttons (`<button type="button">`) for nav actions to preserve explicit disabled-state behavior.
- Header branding should live in `header-copy` (outside `.app-nav`) to avoid compressing auth/navigation actions.
- Shared brand asset path: `src/public/images/logo-transparent.png`.

## Frontend Guardrails

- Page scripts should orchestrate, not implement rendering templates directly.
- Session/token handling should go through `core/session.js`.
- API error messages should be normalized through `core/http-state.js`.
- User-facing frontend copy should stay in English and be consistent with surfaced backend validation/auth messages.
- Prefer shared `bindNavigation()` for internal navigation controls.
- Live regions and helper text should be reserved for loading, error, and non-obvious action feedback, not for restating visible page context.
- Ambient visual effects should live in shared CSS and stay behind content, subtle by default, and safe under `prefers-reduced-motion`.
- Post-level approval percentage is allowed in feed/post pages; user aggregate approval metrics stay private to profile/admin contexts.
- Public author UI on feed/post/comment surfaces must remain non-navigable and limited to avatar, username, and derived reputation tier.
- Feed cards may show the first uploaded post image, while post detail can show the full image gallery.
- Feed cards may preview only the first questionnaire question; the full questionnaire answer flow belongs to `post.html`.
- The shared post modal is responsible for create/edit plus optional sequence selection for owned posts; page scripts should only orchestrate it.
- Profile collection management stays owner-only on `profile.html`; public collection reads stay on `collection.html`.
- Questionnaire answers are checked locally in the browser for v1, so frontend state must avoid inventing score persistence or cross-user history.
- Feed personalization must stay chronological; `Followed tags` filters by followed tags but does not replace the public feed with ranked results.

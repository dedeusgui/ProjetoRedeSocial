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
  - session handling, formatter helpers, API error-to-UI state mapping.
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
- `feed.html`: chronological feed with post approval percentage plus title/content/tag search.
- `post.html`: post detail with comments and approval percentage.
- `profile.html`: authenticated profile with private approval metrics; admins also see user/role testing panel.
- `admin/reviews.html`: moderation review flow + admin-only moderator management panel.

## Navigation Pattern

- Internal page navigation uses buttons with `data-nav-href` (instead of inline anchor-driven logic).
- `components/navigation.js` exposes `bindNavigation()` for delegated click-to-navigation behavior.
- Page bootstraps should call `bindNavigation()` in `init()` when page markup includes `data-nav-href`.
- Keep semantic buttons (`<button type="button">`) for nav actions to preserve explicit disabled-state behavior.
- Header branding should live in `header-copy` (outside `.app-nav`) to avoid compressing auth/navigation actions.
- Shared brand asset path: `src/public/images/logo-transparent.png`.

## Frontend Guardrails

- Page scripts should orchestrate, not implement rendering templates directly.
- Session/token handling should go through `core/session.js`.
- API error messages should be normalized through `core/http-state.js`.
- Prefer shared `bindNavigation()` for internal navigation controls.
- Live regions and helper text should be reserved for loading, error, and non-obvious action feedback, not for restating visible page context.
- Ambient visual effects should live in shared CSS and stay behind content, subtle by default, and safe under `prefers-reduced-motion`.
- Post-level approval percentage is allowed in feed/post pages; user aggregate approval metrics stay private to profile/admin contexts.

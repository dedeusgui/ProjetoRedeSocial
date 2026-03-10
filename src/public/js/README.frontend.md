# Frontend Architecture Guide

## Goal
Keep page scripts small and focused on orchestration. Reuse shared modules for session, API error handling, and rendering.

## Folder layout
- `api.js`: HTTP client and endpoint facade for `/api/v1`
- `core/`: shared helpers (session, formatters, API error mapping)
- `components/`: reusable UI behaviors used across pages
- `features/<domain>/renderers.js`: domain-specific rendering
- `pages/`: page bootstrap + event binding + orchestration
- `features/admin/renderers.js`: admin-oriented renderers (user/role list for testing)

## Responsibilities
- `pages/*`: no duplicated rendering templates and no direct localStorage handling.
- `features/*/renderers.js`: receive data and return/update DOM.
- `core/session.js`: token lifecycle and auth checks.
- `core/formatters.js`: shared formatting utilities for percentages, dates, and localized labels used by renderers.
- `core/http-state.js`: normalize API error messages for UI.
- `components/navigation.js`: delegated internal navigation for elements using `data-nav-href`.
- `components/navbar.js`: auth-aware nav state and logout behavior.
- `components/flash.js`: transient status/feedback messaging.
- `features/authors/renderers.js`: shared author avatar/reputation markup used by feed, post, comments, and profile.

## Conventions
- Use `data-*` selectors for DOM hooks.
- For internal page-to-page actions, use `<button type="button" data-nav-href="...">` and shared navigation binding.
- Always show user feedback for async actions: loading, success, or error.
- Prefer concise status text and avoid keeping explanatory copy that duplicates what the screen already shows after render.
- Keep each module small and single-purpose.
- Keep API contract aligned with `{ ok, data/error }`.

## Session and authorization
- Use `initNavbar()` for auth-aware nav state and logout binding.
- Use `bindNavigation()` when the page contains `data-nav-href` controls.
- Use `hasSession()`/`requireSession()` for protected actions.
- For admin pages, verify role by calling `api.users.meProfile()` and enforcing `role === "admin"` before admin API calls.
- For the feed page, keep `All posts` and `Tags que sigo` orchestration in `pages/feed.js`; renderer code should stay limited to card/tag markup.
- Keep public author surfaces non-clickable; the product does not expose public profile pages.

## Review checklist for new pages
1. Page script only orchestrates flow.
2. Rendering logic lives in `features` or `components`.
3. API errors are mapped through `core/http-state.js`.
4. Public post-level approval percentage is allowed in feed/post; user aggregate metrics stay private to profile/admin screens, except for the coarse public reputation tier derived by the backend.
5. Direct URL access works without broken dependencies.

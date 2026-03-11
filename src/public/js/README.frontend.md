# Frontend Architecture Guide

## Goal
Keep page scripts small and focused on orchestration. Reuse shared modules for session, API error handling, and rendering.

## Folder layout
- `api.js`: HTTP client and endpoint facade for `/api/v1`
- `core/`: shared helpers (session, formatters, API error mapping, shared UI copy)
- `components/`: reusable UI behaviors used across pages
- `features/<domain>/renderers.js`: domain-specific rendering
- `pages/`: page bootstrap + event binding + orchestration
- `features/admin/renderers.js`: admin-oriented renderers
- `features/posts/post-modal.js`: shared create/edit modal orchestration, including sequence selection for owned posts
- `features/profile/content-renderers.js`: owner post and collection management surfaces
- `features/collections/renderers.js`: public collection detail rendering

## Responsibilities
- `pages/*`: no duplicated rendering templates and no direct localStorage handling.
- `features/*/renderers.js`: receive data and return/update DOM.
- `core/session.js`: token lifecycle and auth checks.
- `core/formatters.js`: shared formatting utilities for percentages, dates, and labels used by renderers.
- `core/http-state.js`: normalize API error messages for UI.
- `core/followed-tags.js`: shared normalization for followed-tag values.
- `core/ui-text.js`: shared English UI copy for auth/session/status feedback.
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
- For the feed page, keep `All posts` and `Followed tags` orchestration in `pages/feed.js`; renderer code should stay limited to card, tag, sequence, and collection context markup.
- Keep collection management on `pages/profile.js` and public collection reads on `pages/collection.js`.
- Keep the shared post modal explicit about post type (`regular` vs `questionnaire`) and avoid mixing questionnaire controls into the base post fields visually.
- Feed, profile, and collection cards should show concise sequence membership when a post belongs to a sequence, while the full ordered sequence stays on `post.html`.
- Keep public author surfaces non-clickable; the product does not expose public profile pages.

## Review checklist for new pages
1. Page script only orchestrates flow.
2. Rendering logic lives in `features` or `components`.
3. API errors are mapped through `core/http-state.js`.
4. Public post-level approval percentage is allowed in feed/post; user aggregate metrics stay private to profile/admin screens, except for the coarse public reputation tier derived by the backend.
5. Direct URL access works without broken dependencies.

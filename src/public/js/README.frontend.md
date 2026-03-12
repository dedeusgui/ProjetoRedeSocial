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
- `features/profile/content-renderers.js`: owner post cards and reusable collection-management surfaces
- `features/collections/renderers.js`: public collection detail rendering
- `features/collections/feed-renderers.js`: collection-feed card rendering for `feed.html`

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
- For the feed page, keep the unified header/discovery behavior in `pages/feed.js`, including `Posts` vs `Collections` switching, the authenticated followed-tags toggle, manual follow form, and followed-tags dropdown; renderer code should stay limited to card, tag, sequence, and collection context markup.
- Keep owner collection management on `pages/collections.js`, collection-feed browsing on `pages/feed.js`, and public collection reads on `pages/collection.js`; avoid duplicating collection-create CTAs across those pages.
- Keep the shared post modal ordered as base post fields, post images, then a neutral disclosure-style `Add poll (optional)` section without changing the post payload contract or making the poll compete with the primary publish action.
- Keep profile avatar management attached to the avatar itself on `profile.html`; `pages/profile.js` should orchestrate the contextual upload/remove menu and outside-click closing while reusing the existing avatar API methods.
- Feed, profile, and collection cards should show concise sequence membership when a post belongs to a sequence, while the full ordered sequence stays on `post.html`.
- Keep public author surfaces non-clickable; the product does not expose public profile pages.
- Keep collection and questionnaire blocks visually aligned with post/feed cards by reusing the same spacing rhythm, chip treatment, and Patrick accent labels.

## Review checklist for new pages
1. Page script only orchestrates flow.
2. Rendering logic lives in `features` or `components`.
3. API errors are mapped through `core/http-state.js`.
4. Public post-level approval percentage is allowed in feed/post; user aggregate metrics stay private to profile/admin screens, except for the coarse public reputation tier derived by the backend.
5. Direct URL access works without broken dependencies.


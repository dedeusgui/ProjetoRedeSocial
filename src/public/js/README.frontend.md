# Frontend Architecture Guide

## Goal
Keep page scripts small and focused on orchestration. Reuse shared modules for session, API error handling, and rendering.

## Folder layout
- `api.js`: HTTP client and endpoint facade for `/api/v1`
- `core/`: shared helpers (session, formatters, API error mapping, shared UI copy)
- `components/`: reusable UI behaviors used across pages
- `features/<domain>/renderers.js`: domain-specific rendering
- `features/followed-tags/renderers.js`: safe DOM rendering for the followed-tags dropdown chip list and active-filter banner
- `pages/`: page bootstrap + event binding + orchestration
- `features/admin/renderers.js`: admin-oriented renderers
- `features/posts/post-modal.js`: shared create/edit modal orchestration, including sequence selection for owned posts
- `features/profile/content-renderers.js`: owner post cards and reusable collection-management surfaces, including owner-collection tag follow/unfollow actions plus grouped safe collection actions with a separate destructive `Delete` row
- `features/collections/renderers.js`: public collection detail rendering, including collection-tag follow/unfollow actions for authenticated users and an owner-only `Manage collection` shortcut
- `features/collections/feed-renderers.js`: collection-feed card rendering for `feed.html`, including an owner-only `Manage collection` shortcut back to `collections.html`

## Responsibilities
- `pages/*`: no duplicated rendering templates and no direct localStorage handling.
- `features/*/renderers.js`: receive data and return/update DOM.
- `core/session.js`: token lifecycle and auth checks.
- `core/formatters.js`: shared formatting utilities for percentages, dates, and labels used by renderers.
- `core/content-tags.js`: shared parse/normalize/validate helpers for post and collection tag inputs, including the current 5-tag and 10-character normalized-tag limits.
- `core/http-state.js`: normalize API error messages for UI.
- `core/followed-tags.js`: shared normalization for followed-tag values.
- `core/ui-text.js`: shared English UI copy for auth/session/status feedback.
- `components/tag-input.js`: reusable realtime preview + validation UI for simple comma-separated tag inputs, including rule indicators, normalized-tag chips, and submit-time validation feedback.
- `components/navigation.js`: delegated internal navigation for elements using `data-nav-href`.
- `components/navbar.js`: auth-aware nav state and logout behavior.
- `components/flash.js`: transient status/feedback messaging.
- `features/authors/renderers.js`: shared author avatar/reputation markup used by feed, post, comments, and profile.

## Conventions
- Use `data-*` selectors for DOM hooks.
- For internal page-to-page actions, use `<button type="button" data-nav-href="...">` and shared navigation binding.
- Use `modal-form-layout`, `modal-form-section`, and `modal-form-section-copy` as shared modal layout primitives; keep `danger-zone-card` semantic and let `.card` plus `danger-zone-*` own the visible danger styling.
- Keep auth forms browser-friendly: use standard field names plus HTML autocomplete tokens such as `email`, `current-password`, and `new-password`; account-creation password confirmation should be checked locally before the register request, and the frontend must not try to read or repopulate saved passwords from JavaScript.
- On `index.html`, treat a stored token as tentative: validate it with `api.users.meProfile()` before redirecting to the authenticated experience, and clear the local session if validation fails.
- Always show user feedback for async actions: loading, success, or error.
- Prefer concise status text and avoid keeping explanatory copy that duplicates what the screen already shows after render.
- Keep each module small and single-purpose.
- Keep API contract aligned with `{ ok, data/error }`.

## Session and authorization
- Use `initNavbar()` for auth-aware nav state and logout binding.
- Use `bindNavigation()` when the page contains `data-nav-href` controls.
- Use `hasSession()`/`requireSession()` for protected actions.
- For admin pages, verify role by calling `api.users.meProfile()` and enforcing `role === "admin"` before admin API calls.
- For the feed page, keep the unified header/discovery behavior in `pages/feed.js`, including debounced real-time search, the grouped `Posts` vs `Collections` segmented control with immediate switching, the authenticated followed-tags toggle, the lightweight active-filter banner below that row, the manual follow form, and the compact followed-tags dropdown; renderer code should stay limited to card, tag, sequence, collection context, and safe followed-tags dropdown markup.
- Keep owner collection management on `pages/collections.js`, collection-feed browsing on `pages/feed.js`, and public collection reads on `pages/collection.js`; owner-facing shortcuts on public/feed collection surfaces may link back to `collections.html`, but creation and CRUD orchestration still belong there, including the lightweight native confirmation modal used for collection deletion.
- On `post.html`, keep the `Collections with this post` panel read-only for non-owners; owners may get per-collection `Open` actions plus a shortcut back to `collections.html`, but collection mutation orchestration still does not live on the post-detail page.
- Keep the shared post modal ordered as base post fields, post images, then a neutral disclosure-style `Add poll (optional)` section without changing the post payload contract or making the poll compete with the primary publish action; post-image picking should accumulate across repeated selections up to 4 files, preserve insertion order, and in edit mode keep already-saved images before newly selected uploads.
- Keep feed post-image previews close to `4:3` so the first-image card preview stays balanced for vertical, square, and landscape uploads; keep the post-detail gallery itself as one stable two-column grid with a one-column fallback on narrow screens, default post-detail tiles to `1:1`, promote a single image to a full-width `16:9` row, promote the first tile in a 3-image gallery to a wider lead row, and when feed cards have more than one saved image, keep the overflow cue as a compact `+N` overlay on the first preview instead of extra helper copy below it.
- Keep post and collection tag entry on a single comma-separated text input backed by `core/content-tags.js` and `components/tag-input.js`; current shared limits are 5 tags per item and 10 characters per normalized tag.
- Keep profile avatar management attached to the avatar itself on `profile.html`; `pages/profile.js` should orchestrate the contextual upload/remove menu and outside-click closing while reusing the existing avatar API methods.
- Keep permanent account deletion on `profile.html` inside the existing native dialog pattern; require the exact uppercase word `DELETE`, clear the local session after success, and redirect away from the protected screen.
- Keep admin-side user deletion on `profile.html` inside the same native danger-dialog language; fetch a backend preview first, keep `level_1` for low-impact accounts, and require exact `@username` confirmation for `level_2` once the backend flags posts, collections, or meaningful visible-comment activity.
- Feed, profile, and collection cards should show concise sequence membership when a post belongs to a sequence, while the full ordered sequence stays on `post.html`.
- Keep public author surfaces non-clickable; the product does not expose public profile pages.
- Keep collection and questionnaire blocks visually aligned with post/feed cards by reusing the same spacing rhythm, chip treatment, and Patrick accent labels.

## Review checklist for new pages
1. Page script only orchestrates flow.
2. Rendering logic lives in `features` or `components`.
3. API errors are mapped through `core/http-state.js`.
4. Public post-level approval percentage is allowed in feed/post; user aggregate metrics stay private to profile/admin screens, except for the coarse public reputation tier derived by the backend.
5. Direct URL access works without broken dependencies.


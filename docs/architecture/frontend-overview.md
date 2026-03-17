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

- `index.html`: authentication entrypoint, with browser-recognizable email/password autocomplete semantics for sign-in and account creation, plus startup session validation against the authenticated profile endpoint before redirecting to `feed.html`.
- `feed.html`: unified chronological browsing page for public posts and public collections, with one unified header/discovery surface for debounced real-time search, a grouped `Posts` vs `Collections` segmented control for immediate content-type switching, an authenticated followed-tags toggle, a lightweight followed-tags state banner below the filter row while that filter is active, a manual follow form outside the followed-tags dropdown, and the original compact followed-tags dropdown upgraded with a counter, a scrollable chip list, and tap-to-preview full tag labels for touch devices; plus tag follow/unfollow actions, post create/edit image upload, and a neutral disclosure-style `Add poll (optional)` section placed below `Post images` inside the shared post modal, questionnaire authoring, questionnaire first-question preview on post cards, visible sequence membership on post cards, public author chips (avatar, username, reputation tier), and collection cards styled to follow the same spacing and chip rhythm as post cards.
- `post.html`: post detail with comments, approval percentage, tag follow/unfollow actions, sequence context links, full sequence panel, collection membership links, post edit image upload/removal, full questionnaire rendering with logged-in self-check, and public author chips for the post author and comment authors.
- `profile.html`: authenticated profile with private approval metrics, an avatar-attached contextual image menu for upload/removal, owner post management, a profile-bottom danger zone for permanent self-delete, and admin tools for admins.
- `collections.html`: authenticated owner page for collection creation and collection-item management, with a single in-page `New collection` modal trigger and owner cards that keep the same visual cadence as feed/post cards.
- `collection.html`: public collection page with ordered collection items and sequence context for each item, using collection terminology and post-card-like spacing instead of a separate reading-path presentation.
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
- The profile self-delete flow should reuse the existing native `<dialog>` modal pattern, require the exact uppercase word `DELETE`, and clear the local session before redirecting away from the protected screen on success.
- Feed cards may show the first uploaded post image, while post detail can show the full image gallery.
- Feed cards may preview only the first questionnaire question; the full questionnaire answer flow belongs to `post.html`.
- The shared post modal is responsible for create/edit plus optional sequence selection and a neutral disclosure-style questionnaire/poll section placed below `Post images`; page scripts should only orchestrate it.
- Owner collection management lives on `collections.html`; public collection reads stay on `collection.html`.
- `feed.html` is the shared browsing surface for feed switching and renders both `Posts` and `Collections` behind the same unified header/discovery surface, alongside the authenticated followed-tags toggle, the lightweight active-filter banner, the manual follow form, and the compact followed-tags dropdown; owner collection creation stays on `collections.html`, which is linked from a single `My collections` header action.
- Questionnaire answers are checked locally in the browser for v1, so frontend state must avoid inventing score persistence or cross-user history.
- Feed personalization must stay chronological; `Followed tags` filters by followed tags but does not replace the public feed with ranked results.
- On the collections feed inside `feed.html`, the followed-tags toggle matches collection tags only, not tags on posts inside the collection.
- Collection and questionnaire surfaces should reuse the shared post/feed card spacing, chip hierarchy, and Patrick accent typography instead of introducing a separate visual language.



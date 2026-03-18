# Profile Account Deletion

## Metadata

- Title: Self-service account deletion from the profile page
- Date: 2026-03-13
- Author: Codex
- Status: implemented

## Problem Statement

Authenticated users can manage profile images and authored content, but they cannot permanently delete their own account from the product. The only existing user-deletion path is admin-only, which is not appropriate for normal user offboarding and did not fully clean up authored post media from local storage.

## Goals

- Add a self-service permanent account deletion flow on `profile.html`.
- Reuse one backend deletion path for self-delete and admin delete so data/file cleanup stays consistent.
- Keep the existing profile page behavior intact while adding explicit confirmation for destructive account removal.

## Non-Goals

- Add account recovery or soft-delete behavior.
- Change JWT/session semantics beyond clearing the local client token after deletion.
- Allow `admin` accounts to self-delete from the profile page.

## Proposal

Add a protected `DELETE /api/v1/me` endpoint in the `users` module and delegate the destructive cleanup to a shared account-deletion service/repository pair under `src/common/users/`. The shared service is used by both the new self-delete endpoint and the existing admin delete path so that avatar files, authored post media, collections, posts, comments, reviews, collection references, and derived moderation metrics are all cleaned up in one consistent flow.

On the frontend, add a `Danger zone` card at the bottom of `profile.html` and a confirmation modal that requires the exact word `DELETE` before the destructive action becomes available.

## Scope

- In scope:
  - `DELETE /api/v1/me`
  - shared backend account-deletion cleanup logic
  - profile-page danger zone UI and confirmation dialog
  - docs and release notes for the new endpoint and UX
- Out of scope:
  - account restoration
  - soft deletion
  - admin self-delete

## Decisions Requested From Developer

- Decision 1: backend ownership for self-delete
  - Options:
    - `1A`: add `DELETE /api/v1/me` in `users` and extract shared deletion logic
    - `1B`: add `DELETE /api/v1/me` in `users` with duplicated deletion logic
    - `1C`: add `DELETE /api/v1/me` in `users` but call admin service directly
  - Recommended option: `1A`
  - Tradeoffs:
    - `1A`: cleanest long-term ownership and consistent cleanup
    - `1B`: smallest first diff, highest drift risk
    - `1C`: less duplication than `1B`, weaker module boundaries
- Decision 2: admin self-delete rule
  - Options:
    - `2A`: block self-delete for `admin` accounts
    - `2B`: allow self-delete for every role
    - `2C`: block only config-managed bootstrap admins
  - Recommended option: `2A`
  - Tradeoffs:
    - `2A`: safest operational default
    - `2B`: simplest behavior, highest admin-lockout risk
    - `2C`: more flexible, more rule complexity

## Chosen Decisions and Rationale

- Chosen option: `1A + 2A`
- Why this option:
  - keeps owner-facing deletion in the `users` module
  - removes cleanup drift between self-delete and admin delete
  - avoids accidental loss of admin access from the profile page
- Assumptions (if any):
  - redirecting to `index.html` after deletion is acceptable for the offboarding flow

## API and Interface Impact

- New/changed endpoints:
  - added `DELETE /api/v1/me`
- Request/response contract changes:
  - success returns the normal `{ ok: true, data }` envelope with a deletion summary
- Auth/role implications:
  - authenticated `user` and `moderator` accounts may self-delete
  - `admin` accounts receive `403 FORBIDDEN` on self-delete

## Data Model Impact

- Model/schema/index changes:
  - none
- Migration/backfill needs:
  - none

## Alternatives Considered

- Reuse only the admin route:
  - rejected because it exposes the wrong boundary and requires admin privileges
- Keep admin delete and self-delete as separate implementations:
  - rejected because file and relation cleanup would drift again

## Risks and Mitigations

- Risk:
  - destructive cleanup can leave orphaned local files or stale derived metrics
- Mitigation:
  - centralize deletion logic and derived-stat recalculation in one shared service
- Risk:
  - accidental deletion from the UI
- Mitigation:
  - require a modal confirmation plus exact `DELETE` text entry

## Rollout Plan

Ship the backend endpoint, shared cleanup service, profile-page danger zone, and docs in one change. Rollback is code rollback only because no schema migration is involved.

## Acceptance Criteria

1. The profile page shows a danger zone card with a permanent-delete action without removing existing profile functionality.
2. The confirmation modal stays disabled until the user types the exact uppercase word `DELETE`.
3. Confirming deletion calls `DELETE /api/v1/me`, clears the client session, and redirects away from the protected profile page.
4. The backend removes authored collections, posts, comments, reviews, avatar files, post-media files, and collection references, then recalculates derived stats.
5. `admin` accounts cannot self-delete from the profile page.

## Test Plan

- Unit/service tests:
  - verify shared deletion service behavior when target user is missing or forbidden
- API integration checks:
  - `DELETE /api/v1/me` succeeds for authenticated `user`/`moderator`
  - `DELETE /api/v1/me` returns `403` for authenticated `admin`
- Frontend/manual checks:
  - button is disabled until `DELETE`
  - outside click and `Escape` close the modal when not submitting
  - redirect after deletion clears the local session

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes

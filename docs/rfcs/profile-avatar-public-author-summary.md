# Feature RFC

## Metadata

- Title: Private Profile Avatar and Public Author Summary
- Date: 2026-03-10
- Author: Codex
- Status: implemented

## Problem Statement

The product needed a stronger profile identity without breaking the project rule that users cannot browse other users' profiles. Owners should be able to manage a profile picture, and other users should only see a constrained public author summary when reading posts and comments.

## Goals

- Let the authenticated owner upload, replace, and remove a profile picture.
- Increase profile identity emphasis by enlarging the username on `profile.html`.
- Show a limited public author summary on feed, post detail, and comment surfaces.

## Non-Goals

- Adding any public user profile page or public user-detail endpoint.
- Exposing exact private approval percentages publicly.

## Proposal

- Store a single `profileImage` object on the `User` model with local-disk metadata.
- Add `POST /api/v1/me/avatar` and `DELETE /api/v1/me/avatar` for owner-managed avatar changes.
- Extend public author payloads in feed/post/comment responses to include:
  - `avatarUrl`
  - `reputation: { tier, label }`
- Keep public author UI non-navigable.

## Scope

- In scope:
  - user avatar upload/removal
  - profile page layout update
  - public author chip rendering in feed/post/comments
  - docs and release notes
- Out of scope:
  - public profile browsing
  - public exposure of exact `privateMetrics.score`

## Decisions Requested From Developer

- Public reputation exposure:
  - Options: exact score, coarse tier, none
  - Recommended option: coarse tier
  - Tradeoffs: preserves privacy better while still reflecting project metrics
- Surface scope:
  - Options: posts only, posts+comments, mini public card
  - Recommended option: posts+comments
  - Tradeoffs: satisfies the request without introducing public profile navigation
- Avatar UX:
  - Options: replace only, replace+remove, defer UI
  - Recommended option: replace+remove
  - Tradeoffs: minimal extra scope for a complete owner workflow

## Chosen Decisions and Rationale

- Chosen option: coarse reputation tier
- Why this option: keeps private metrics private while allowing limited public reputation
- Assumptions (if any):
  - thresholds are fixed at `0-39`, `40-69`, `70-100`

## API and Interface Impact

- New endpoints:
  - `POST /api/v1/me/avatar`
  - `DELETE /api/v1/me/avatar`
- Request/response contract changes:
  - `GET /api/v1/me/profile` now includes `avatarUrl` and `publicReputation`
  - feed/post/comment author payloads now include `avatarUrl` and `reputation`
- Auth/role implications:
  - avatar routes remain owner-only
  - no auth change for public feed/post access

## Data Model Impact

- Model/schema/index changes:
  - `User.profileImage` stores avatar metadata
- Migration/backfill needs:
  - none; existing users default to no avatar

## Alternatives Considered

- Exact public score:
  - simpler contract, weaker privacy
- Public profile route:
  - richer identity surface, conflicts with the requested philosophy

## Risks and Mitigations

- Risk:
  - public UI could accidentally expose more user data than intended
- Mitigation:
  - author payloads are explicitly restricted to avatar, username, and coarse reputation

## Rollout Plan

- Ship backend and frontend together.
- Roll back by removing avatar endpoints and author payload extensions if needed.

## Acceptance Criteria

1. The owner can upload, replace, and remove a profile picture from `profile.html`.
2. The profile page shows a larger username and keeps private metrics visible only to the owner/admin contexts.
3. Feed, post detail, and comments show only avatar, username, and coarse reputation for other users.
4. There is no public profile route or clickable author navigation.

## Decision Record

- 2026-03-12:
  - Changed:
    - moved the owner avatar controls on `profile.html` from a large standalone upload panel to a compact avatar-attached contextual menu with `Upload photo` and `Remove photo`
  - Why:
    - keeps the avatar action contextual and compact without changing the existing avatar API contract or owner-only behavior
  - Impact:
    - frontend-only UX refinement; `POST /api/v1/me/avatar` and `DELETE /api/v1/me/avatar` remain unchanged

## Test Plan

- Unit/service tests:
  - validate avatar upload/removal error handling and public reputation mapping
- API integration checks:
  - verify new avatar endpoints and enriched author payloads
- Frontend/manual checks:
  - verify profile avatar controls and public author chips render consistently

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes

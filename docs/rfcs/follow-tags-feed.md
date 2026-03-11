# Feature RFC

## Metadata

- Title: Followed Tags Feed
- Date: 2026-03-10
- Author: Codex
- Status: implemented

## Problem Statement

The project already supports post tags and feed search, but users cannot subscribe to the topics they care about. The current product therefore lacks a lightweight personalization loop that still respects the chronological-feed principle.

## Goals

- Let authenticated users follow and unfollow tags.
- Add a separate signed-in feed view that shows only posts matching followed tags.
- Preserve reverse-chronological ordering, cursor pagination, and the existing response envelope.
- Reuse current module boundaries by keeping follow-tag persistence in `users` and feed retrieval in `feed`.

## Non-Goals

- Replacing the default public feed.
- Relevance ranking or algorithmic recommendations.
- Profile-based tag management beyond the feed page.
- Onboarding suggestions or starter-topic wizards.

## Proposal

Extend the `users` module with protected followed-tag endpoints and store canonical lowercase followed tags on the user document. Add a protected `GET /api/v1/feed/following` endpoint in the `feed` module that returns published posts matching any followed tag while keeping chronological ordering and the current pagination contract.

On the frontend, enhance `src/public/pages/feed.html` and `src/public/js/pages/feed.js` with:

- an `All posts` / `Followed tags` mode toggle for authenticated users
- a manual follow-tag form
- a visible list of followed tags
- quick follow/unfollow controls on tag chips in feed cards

Also expose the same tag-chip follow/unfollow action on `post.html` so users can subscribe while reading a post.

## Scope

- In scope:
  - user-level followed-tag persistence
  - follow/unfollow endpoints
  - followed-only chronological feed endpoint
  - feed and post tag-chip follow actions
  - feed-page mode toggle and manual tag entry
  - docs and release notes updates
- Out of scope:
  - profile page management UI
  - notifications
  - feed ranking changes

## Decisions Requested From Developer

- Feed mode:
  - Options: separate filter view, default to following, discovery only
  - Recommended option: separate filter view
  - Tradeoffs: preserves the public feed and adds personalization with minimal product risk
- v1 scope:
  - Options: follow plus filtered feed, add profile management, add onboarding suggestions
  - Recommended option: follow plus filtered feed
  - Tradeoffs: delivers the core behavior without widening UI scope
- Tag acquisition:
  - Options: from existing tag chips, manual entry, both
  - Recommended option: from existing tag chips
  - Tradeoffs: simpler validation, but less flexible than allowing manual subscription
- Search behavior:
  - Options: search inside followed feed, search entire public feed, disable search in followed mode
  - Recommended option: search inside followed feed
  - Tradeoffs: keeps the feed experience consistent while preserving chronology
- Followed-tag normalization:
  - Options: trim plus lowercase, trim only, store raw plus compare lowercase
  - Recommended option: trim plus lowercase
  - Tradeoffs: simplest way to avoid duplicates such as `AI` and `ai`

## Chosen Decisions and Rationale

- Chosen option: separate `Followed tags` feed view
- Why this option: it preserves the existing public feed while adding a clear personalized mode for authenticated users
- Chosen option: `follow + filtered feed` only for v1
- Why this option: it delivers the main user value without profile or onboarding expansion
- Chosen option: both chip-based follow and manual tag entry
- Why this option: it keeps follow actions convenient in context while letting users pre-subscribe to topics
- Chosen option: search stays available inside the followed-tag feed
- Why this option: it keeps search behavior consistent across feed modes
- Chosen option: canonical `trim + lowercase` storage for followed tags
- Why this option: it prevents duplicates and makes manual entry predictable

## API and Interface Impact

- New endpoints:
  - `GET /api/v1/me/followed-tags`
  - `POST /api/v1/me/followed-tags`
  - `DELETE /api/v1/me/followed-tags/:tag`
  - `GET /api/v1/feed/following`
- Request/response contract changes:
  - followed-tag CRUD uses the existing `{ ok, data/error }` envelope
  - `GET /api/v1/feed/following` keeps the same `items[]` and `pageInfo` shape as `GET /api/v1/feed`
- Auth/role implications:
  - all followed-tag endpoints require authentication
  - the public feed remains public and unchanged

## Data Model Impact

- User model stores `followedTags: string[]`
- Stored values are canonical lowercase tags without leading `#`
- No migration or backfill is required for v1

## Alternatives Considered

- Option A: replace the home feed with followed tags for authenticated users
  - rejected because it weakens the public shared experience and changes current product behavior too aggressively
- Option B: create a separate `tag-follows` module and collection
  - rejected for v1 because the relationship is simple and fits cleanly in the current user document
- Option C: recommend tags algorithmically
  - rejected because it conflicts with the project's no-algorithm direction

## Risks and Mitigations

- Risk: existing posts may contain tags with inconsistent casing or a leading `#`
- Mitigation: normalize followed tags to lowercase and match stored post tags case-insensitively with optional leading `#`
- Risk: users may enter manual tags that currently have no matching posts
- Mitigation: allow the follow, but show a clear empty-state message in the followed-tag feed

## Rollout Plan

Ship as one incremental feature:

1. backend user/feed changes
2. feed and post frontend wiring
3. docs and changelog updates
4. smoke verification

Rollback is low risk: remove the followed-tag field/endpoints and the followed feed toggle, restoring the previous feed-only behavior.

## Acceptance Criteria

1. Authenticated users can follow and unfollow tags from tag chips and manual entry.
2. `GET /api/v1/feed/following` returns only published posts matching any followed tag in reverse-chronological order.
3. Cursor pagination works the same way in the followed-tag feed as it does in the public feed.
4. Search inside the followed-tag feed narrows only the followed-tag result set.
5. Users who do not follow any tags see an explicit empty state in `Followed tags`.

## Test Plan

- API/smoke checks:
  - follow a tag and verify canonical lowercase storage
  - request `/api/v1/feed/following` and confirm matching posts are returned
  - confirm followed-tag routes require authentication
- Frontend/manual checks:
  - follow and unfollow from feed tag chips
  - follow and unfollow from post-detail tag chips
  - add a manual tag in the feed panel
  - switch between public feed and followed-tag feed
  - search while in followed-tag mode

## Documentation Updates Required

- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [x] `CHANGELOG.md`
- [x] RFC entry under `docs/rfcs/`


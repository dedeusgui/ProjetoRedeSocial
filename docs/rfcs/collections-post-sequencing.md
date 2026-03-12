# Collections + Post Sequencing

## Metadata

- Title: Collections + Post Sequencing
- Date: 2026-03-11
- Author: Codex
- Status: implemented

## Problem Statement

The project needed a way to relate posts without changing the chronological feed model. The previous implementation was removed from `dev`, but the product need remained: authors need linear post continuations and curated public collections of their own posts.

## Goals

- Add linear same-author post sequencing.
- Add public collections with owner-only management.
- Extend feed and post payloads so sequence and collection context can be rendered without changing chronological ordering.
- Keep the feature aligned with existing module layering and response envelopes.

## Non-Goals

- No recommendation or ranking behavior.
- No branching story graphs.
- No private collections.
- No automatic collection ordering by date or score.

## Proposal

Add `sequence.previousPostId` to posts, enforced by a sparse unique index so a post can only have one direct continuation. Add a dedicated `collections` backend module with owner-managed CRUD plus ordered item management. Compose collection summaries and sequence summaries into post/feed/detail payloads through services. Add a public collection page and extend the shared post modal so authors can pick a previous post when creating or editing their own content.

## Scope

- In scope:
  - `GET /api/v1/me/posts`
  - `GET /api/v1/posts/:id/sequence`
  - full `collections` CRUD + item management routes
  - feed search extension for collection tags
  - feed collection management and collection public page
- Out of scope:
  - collection privacy modes
  - branching sequences
  - recommendation or ranking changes

## Decisions Requested From Developer

- Current `dev` remains the baseline.
- Search by collection tags is enabled on both `GET /feed` and `GET /feed/following`.
- Delivery is incremental: backend/docs first, then shared modal/page integration.

## Chosen Decisions and Rationale

- Chosen option: preserve current `dev` behavior and layer the feature back in.
- Why this option: it minimizes regressions in the newer feed, questionnaire, avatar, and profile work while still restoring the intended feature set.
- Assumptions:
  - collections are public to read and owner-only to manage
  - sequencing is linear only
  - collection order is manual only

## Visual Consistency Update

- Date:
  - 2026-03-12
- What changed:
  - collection feed cards, owner collection cards, and the public collection page were visually realigned to the same spacing, chip rhythm, and typography treatment used by post/feed cards
  - collection-facing copy now consistently uses `collection` terminology instead of mixing in `reading path` presentation
- Why it changed:
  - the earlier collection surfaces still felt visually separate from the main feed and post detail screens, especially when opening a collection
- Impact:
  - no API or data-model changes
  - renderer markup and shared CSS now treat collection surfaces as part of the same frontend design system as posts

## API and Interface Impact

- New endpoints:
  - `GET /api/v1/me/posts`
  - `GET /api/v1/posts/:id/sequence`
  - `GET /api/v1/collections/:id`
  - `GET /api/v1/me/collections`
  - `POST /api/v1/collections`
  - `PATCH /api/v1/collections/:id`
  - `DELETE /api/v1/collections/:id`
  - `POST /api/v1/collections/:id/items`
  - `DELETE /api/v1/collections/:id/items/:postId`
  - `PATCH /api/v1/collections/:id/items/reorder`
- Changed post payloads:
  - optional `previousPostId` on create/update
  - `sequence` summary on post/feed/detail responses
  - `collections[]` summaries on post/feed/detail responses
- Auth/role implications:
  - only owners manage sequence links and collections
  - collection reads remain public

## Data Model Impact

- `Post.sequence.previousPostId` added with sparse unique index.
- New `Collection` model with ordered `items[]`.
- No backfill is required; existing posts remain independent posts with `sequence = null`.

## Alternatives Considered

- Keep sequences in a separate model:
  - rejected because linear continuation is naturally tied to the post and needs direct uniqueness enforcement.
- Embed collections inside the user model:
  - rejected because collections are public resources with their own route surface and item hydration rules.

## Risks and Mitigations

- Risk: duplicate or cyclic sequence links.
- Mitigation: service validation plus sparse unique index.
- Risk: collection hydration loses manual order.
- Mitigation: preserve `items[]` order after post lookup.
- Risk: search extension breaks chronological semantics.
- Mitigation: collection-tag search only expands match candidates; sort and cursor rules stay unchanged.

## Rollout Plan

1. Add docs, models, repositories, services, and routes.
2. Extend shared frontend API/modal flows.
3. Integrate feed, post, profile, and collection pages.
4. Verify with syntax checks and smoke test.

Rollback: remove the collections router/module and the post sequence field/index, then revert the frontend surfaces that depend on those endpoints.

## Acceptance Criteria

1. Authors can create/update a post with an optional previous post from their own visible posts.
2. Public feeds and post detail expose sequence and collection context without changing chronological ordering.
3. Owners can create, edit, delete, and reorder public collections of their own visible posts.
4. Collection-tag matches participate in feed search for both feed modes.

## Test Plan

- Unit/service tests:
  - sequence validation, collection ownership, duplicate prevention, reorder validation
- API integration checks:
  - all new routes, post create/update with `previousPostId`, search by collection tag, post/user deletion cleanup
- Frontend/manual checks:
  - shared modal sequence selection, feed collection management, collection public page, post sequence panel

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes



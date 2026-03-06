# Feature RFC

## Metadata

- Title: Feed Post Search
- Date: 2026-03-06
- Author: Codex
- Status: implemented

## Problem Statement

The public feed already lists all published posts, but users have no way to narrow the list when they are looking for a topic, keyword, or tag across the website.

## Goals

- Add a public search flow for posts from the existing feed page.
- Preserve the current feed contract, reverse-chronological ordering, and cursor pagination.
- Keep the implementation inside the existing `feed` module boundaries and current frontend orchestration pattern.

## Non-Goals

- Full-text relevance ranking.
- Searching hidden or pending posts.
- A separate dedicated search page.

## Proposal

Extend `GET /api/v1/feed` with an optional `search` query parameter. When present and non-blank, the feed module filters published posts by a case-insensitive partial match on `title`, `content`, or `tags`, while keeping the response envelope and result ordering unchanged.

On the frontend, add a search form to `src/public/pages/feed.html` and reuse the existing `loadFeed()` path in `src/public/js/pages/feed.js` so search, pagination, create/edit/delete refreshes, and normal feed loading all go through the same orchestration flow.

## Scope

- In scope:
  - backend filtering in the `feed` module
  - feed-page search input, submit, and reset controls
  - docs and release notes updates
- Out of scope:
  - relevance scoring
  - new auth behavior
  - schema migration or search index rollout

## Decisions Requested From Developer

- Search UI location:
  - Options: feed only, dedicated page, feed plus dedicated page
  - Recommended option: feed only
  - Tradeoffs: minimal change and reuse of current feed flow vs more navigation/maintenance work
- Search fields:
  - Options: title only, title/content/tags, title/content/tags/author
  - Recommended option: title/content/tags
  - Tradeoffs: useful topic search without turning the feature into people search

## Chosen Decisions and Rationale

- Chosen option: search on the existing feed page only
- Why this option: it reuses the current page, endpoint, pagination, and renderer flow with the lowest implementation risk
- Chosen option: match `title`, `content`, and `tags`
- Why this option: it covers how posts are described publicly today without adding author-search semantics
- Assumptions:
  - search is limited to `status: "published"` posts
  - blank search behaves like the normal feed
  - simple regex matching is acceptable for v1

## API and Interface Impact

- New/changed endpoints:
  - changed `GET /api/v1/feed` to accept optional `search`
- Request/response contract changes:
  - new query parameter only; response envelope remains `{ ok, data }`
- Auth/role implications:
  - none; search remains public

## Data Model Impact

- Model/schema/index changes:
  - none in v1
- Migration/backfill needs:
  - none

## Alternatives Considered

- Option A: dedicated search endpoint
  - rejected because it duplicates feed behavior and documentation for little gain
- Option B: Mongo text index and relevance sorting
  - rejected for v1 because it changes ordering semantics and adds more operational/design choices

## Risks and Mitigations

- Risk: regex search may be slower than indexed search on larger datasets
- Mitigation: keep v1 simple and chronological; move to indexed search only if real dataset size justifies it
- Risk: editing a post while a search filter is active can leave stale cards in the UI
- Mitigation: reload the filtered feed after post edits when search is active

## Rollout Plan

Ship as a single incremental change:

1. backend query support
2. feed-page UI and orchestration
3. docs and changelog updates

Rollback is low risk: remove the optional query handling and feed-page controls to restore the previous unfiltered feed behavior.

## Acceptance Criteria

1. Users can search published posts from the feed page by keyword.
2. Search matches `title`, `content`, and `tags` and keeps reverse-chronological ordering.
3. Cursor pagination continues to work for both filtered and unfiltered feed requests.
4. Empty search results show a clear message on the feed page.

## Test Plan

- Unit/service tests:
  - validate blank search normalization to unfiltered feed behavior
- API integration checks:
  - verify `GET /api/v1/feed?search=...` returns only matching published posts in chronological order
  - verify `limit` and `cursor` still paginate correctly inside filtered results
- Frontend/manual checks:
  - submit search, clear search, and load more on filtered results
  - verify filtered feed refresh after post edit/create/delete

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes

# Post Questionnaires

## Metadata

- Title: Post questionnaires
- Date: 2026-03-10
- Author: Codex
- Status: implemented

## Problem Statement

Some posts need a lightweight way to test readers on the topic being discussed. The project already supports optional post images, but it did not support an optional interactive learning element inside the post itself.

## Goals

- Allow post authors to attach one optional questionnaire to a post.
- Keep the feature inside the existing posts module and post modal workflow.
- Let signed-in readers answer and immediately self-check without adding score persistence.

## Non-Goals

- Saving quiz scores or building a leaderboard.
- Supporting multiple questionnaires per post.
- Free-text answers or multi-select questions.

## Proposal

Extend the `Post` document with an optional `questionnaire` object stored directly on the post. Keep post creation and editing on the existing JSON routes. Expose questionnaire data through feed/post responses, render a compact first-question preview in the feed, and render the full questionnaire on post detail with client-side answer checking for logged-in users.

## Scope

- In scope:
  - one questionnaire per post
  - single-choice questions with exactly one correct answer
  - questionnaire editing in the existing post modal
  - first-question preview on the feed
  - full answer + self-check flow on post detail
- Out of scope:
  - persisted scores
  - anonymous answer submission
  - moderation/profile metrics based on questionnaire results

## Decisions Requested From Developer

- Answer model:
  - Options: single correct; multiple correct; free-text
  - Recommended option: single correct
  - Tradeoffs: smallest validation and rendering surface
- Reader flow:
  - Options: self-check only; view-only; saved score
  - Recommended option: self-check only
  - Tradeoffs: delivers interaction without new persistence/privacy rules
- Attachment coexistence:
  - Options: image-or-questionnaire; both allowed; questionnaire replaces images
  - Recommended option: both allowed
  - Tradeoffs: keeps current image feature intact while adding a second optional post capability
- Answer access:
  - Options: everyone; logged-in only; author-only preview
  - Recommended option: everyone
  - Chosen by developer: logged-in only
- Feed display:
  - Options: badge only; first-question preview; full questionnaire
  - Recommended option: badge only
  - Chosen by developer: first-question preview

## Chosen Decisions and Rationale

- Chosen option:
  - one questionnaire per post
  - single-choice questions
  - self-check only, no persistence
  - images and questionnaires can coexist
  - logged-in-only answering
  - first-question feed preview
- Why this option:
  - it adds meaningful interactivity without introducing new modules, scoring storage, or cross-user result ownership rules
- Assumptions (if any):
  - correct answers remain in the API payload for v1 so the browser can self-check locally
  - answer gating is a frontend interaction rule because there is no answer-submission endpoint

## Decision Update

- Date:
  - 2026-03-12
- What changed:
  - the shared post modal no longer asks the author to choose between `regular` and `questionnaire` post types
  - questionnaire authoring now lives inside a neutral disclosure-style section below `Post images` in the shared post modal
- Why it changed:
  - the explicit type split added extra branching to the modal without changing the backend payload or data model
  - the integrated expandable section keeps the questionnaire optional while reducing UI friction for normal posts
- Impact:
  - no API, auth, or data-model changes
  - post create/update still use the same optional `questionnaire` field

## Visual Consistency Update

- Date:
  - 2026-03-12
- What changed:
  - questionnaire preview, detail, and editor surfaces were restyled to match the post/feed card spacing and chip hierarchy more closely
  - questionnaire accent labels now consistently use the project's Patrick typography treatment
- Why it changed:
  - the questionnaire UI still looked visually separate from the core post/feed experience even after the modal-flow simplification
- Impact:
  - no API, auth, or data-model changes
  - questionnaire renderer markup and shared CSS now keep the interaction inside the same visual system as post and collection cards

## API and Interface Impact

- New/changed endpoints:
  - no new routes
  - `POST /api/v1/posts`
  - `PATCH /api/v1/posts/:id`
  - `GET /api/v1/feed`
  - `GET /api/v1/feed/following`
  - `GET /api/v1/posts/:id`
- Request/response contract changes:
  - post create/update accepts optional `questionnaire`
  - feed/post responses include optional `questionnaire`
- Auth/role implications:
  - only post authors can create/edit/remove questionnaires because they reuse post ownership rules
  - signed-in users can answer questionnaires in the frontend UI

## Data Model Impact

- Model/schema/index changes:
  - `Post.questionnaire`
  - `Post.questionnaire.questions[]`
  - each question stores `prompt`, `options[]`, and `correctOptionIndex`
- Migration/backfill needs:
  - none; existing posts default to `null`

## Alternatives Considered

- Option A:
  - separate questionnaire collection/module
- Option B:
  - dedicated answer-check endpoint that hides correct answers from read responses

## Risks and Mitigations

- Risk:
  - correct answers are visible in the API response
- Mitigation:
  - document the tradeoff explicitly and keep v1 limited to local self-check without persistence
- Risk:
  - modal complexity increases with dynamic question editing
- Mitigation:
  - keep one questionnaire per post and constrain questions/options with small limits

## Rollout Plan

Ship as a normal feature update. Rollback is removing the optional questionnaire field from posts, removing the modal/detail/feed UI, and deleting the shared questionnaire renderer/editor helpers.

## Acceptance Criteria

1. A post author can create or edit a post with images, a questionnaire, or both.
2. Feed and post detail responses expose `questionnaire` when present.
3. Feed shows a first-question preview and post detail shows the full questionnaire.
4. A signed-in reader can answer and immediately see correct/incorrect feedback without creating stored results.

## Test Plan

- Unit/service tests:
  - validate questionnaire shape, limits, and correct-answer indexing
- API integration checks:
  - create/update with questionnaire succeeds
  - malformed questionnaire payload fails with `VALIDATION_ERROR`
  - feed/post reads include questionnaire payload
- Frontend/manual checks:
  - modal create/edit/remove questionnaire flow
  - logged-out reader sees the questionnaire but cannot answer
  - logged-in reader can answer and reset answers locally

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes

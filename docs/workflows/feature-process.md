# Feature Process

## Goal

Refine ideas into implementable, reviewable features with explicit decisions and acceptance criteria.

## Required Input

- feature RFC based on `docs/templates/feature-rfc.md`
- relevant architecture/API docs reviewed first
- explicit developer decisions for high-impact tradeoffs

## Workflow

1. Docs-First Review
  - read `AGENTS.md` and relevant docs under `docs/`.
  - summarize constraints from architecture/API/workflow docs.
2. Decision Gate
  - ask developer for high-impact decisions before implementation.
  - provide options, recommendation, and tradeoffs.
3. Draft RFC
  - define problem, scope, proposal, alternatives, risks.
  - include API/data/auth implications.
4. Validate Against Product Principles
  - keep chronological feed invariant.
  - expose only post-level moderation percentages publicly when the feature requires it.
  - preserve user aggregate metrics as private profile/admin data.
5. Define Acceptance Criteria
  - write testable behavioral outcomes.
  - include failure and edge cases.
6. Implement
  - keep module boundaries (`routes/controllers/services/repositories`).
  - prefer incremental PRs when risk is high.
7. Verify
  - test happy path, invalid inputs, and auth role boundaries.
  - validate frontend orchestration for changed screens.
8. Document and Release Notes
  - update architecture/API docs.
  - add release note entry under "Added" or "Changed".

## Ready-for-Implementation Gate

An RFC is ready when:

- [ ] objective and non-objectives are explicit
- [ ] in-scope and out-of-scope are explicit
- [ ] decision requests and chosen options are explicit
- [ ] API/interface impact is documented
- [ ] data model impact is documented
- [ ] acceptance criteria are testable
- [ ] rollout and rollback strategy exist

## Decision Records

When implementation changes behavior from the approved RFC, update the RFC with:

- decision date
- what changed
- why it changed
- impact on contracts or workflows

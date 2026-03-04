# Feature Process

## Goal

Refine ideas into implementable, reviewable features with explicit decisions and acceptance criteria.

## Required Input

- feature RFC based on `docs/templates/feature-rfc.md`

## Workflow

1. Draft RFC
  - define problem, scope, proposal, alternatives, risks.
  - include API/data/auth implications.
2. Validate Against Product Principles
  - keep chronological feed invariant.
  - avoid public validation metrics.
  - preserve private-metrics-only profile rule.
3. Define Acceptance Criteria
  - write testable behavioral outcomes.
  - include failure and edge cases.
4. Implement
  - keep module boundaries (`routes/controllers/services/repositories`).
  - prefer incremental PRs when risk is high.
5. Verify
  - test happy path, invalid inputs, and auth role boundaries.
  - validate frontend orchestration for changed screens.
6. Document and Release Notes
  - update architecture/API docs.
  - add release note entry under "Added" or "Changed".

## Ready-for-Implementation Gate

An RFC is ready when:

- [ ] objective and non-objectives are explicit
- [ ] in-scope and out-of-scope are explicit
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

# Documentation Policy

## Purpose

Keep architecture and API documentation synchronized with code so bugfixes and feature work stay predictable.
Enforce a docs-first and decision-first workflow for agents and developers.

## Ownership

- Every contributor owns docs updates for their changes.
- PR reviewers must enforce docs completeness before merge.
- Agents must follow `AGENTS.md` before proposing implementation.

## Mandatory Decision Gate

Before implementation, ask the developer to confirm high-impact decisions that affect:

- architecture/module boundaries
- API contract or payload shape
- auth/role behavior
- core business rules
- scope boundaries (in/out)

Each decision request must include:

- 2-4 concrete options
- one recommended option
- short tradeoff per option

## Mandatory Update Triggers

Update docs in the same PR when changing:

- route method/path
- request/response payload shape
- authentication or role constraints
- module responsibilities or dependencies
- core business rules (feed order, moderation, private metrics behavior)
- environment variables or run commands
- agent collaboration rules or decision protocol

## Required Files by Change Type

API behavior change:

- `docs/api/http-contract.md`
- `docs/api/endpoints.md`

Architecture/module change:

- `docs/architecture/system-overview.md`
- `docs/architecture/backend-modules.md`
- `docs/architecture/diagrams.md` when flow changed

Frontend structure/flow change:

- `docs/architecture/frontend-overview.md`

Process change:

- `docs/workflows/*.md`
- corresponding templates under `docs/templates/`

Agent behavior/process change:

- `AGENTS.md`
- `docs/README.md` when onboarding order changes

## Review Checklist

- [ ] docs reflect real behavior in code
- [ ] examples use correct endpoint paths
- [ ] auth/role notes match middleware usage
- [ ] diagrams are still valid
- [ ] links in `docs/README.md` are valid
- [ ] decision gate was applied before implementation
- [ ] decision options + recommendation are documented when relevant

## Conflict Resolution

When docs and implementation conflict:

1. correct implementation to match intended documented behavior, or
2. update docs with explicit decision and rationale in the same PR

No PR should merge with unresolved drift.

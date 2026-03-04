# Documentation Policy

## Purpose

Keep architecture and API documentation synchronized with code so bugfixes and feature work stay predictable.

## Ownership

- Every contributor owns docs updates for their changes.
- PR reviewers must enforce docs completeness before merge.

## Mandatory Update Triggers

Update docs in the same PR when changing:

- route method/path
- request/response payload shape
- authentication or role constraints
- module responsibilities or dependencies
- core business rules (feed order, moderation, private metrics behavior)
- environment variables or run commands

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

## Review Checklist

- [ ] docs reflect real behavior in code
- [ ] examples use correct endpoint paths
- [ ] auth/role notes match middleware usage
- [ ] diagrams are still valid
- [ ] links in `docs/README.md` are valid

## Conflict Resolution

When docs and implementation conflict:

1. correct implementation to match intended documented behavior, or
2. update docs with explicit decision and rationale in the same PR

No PR should merge with unresolved drift.

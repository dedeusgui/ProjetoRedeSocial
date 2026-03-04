# Engineering Documentation Hub

This directory is the source of truth for architecture, API behavior, and delivery workflows.

## Start Here

1. Read [architecture/system-overview.md](architecture/system-overview.md).
2. Read [api/http-contract.md](api/http-contract.md).
3. Use [workflows/bugfix-process.md](workflows/bugfix-process.md) or [workflows/feature-process.md](workflows/feature-process.md) before implementation.

## Documentation Map

- Architecture
  - [architecture/system-overview.md](architecture/system-overview.md)
  - [architecture/backend-modules.md](architecture/backend-modules.md)
  - [architecture/frontend-overview.md](architecture/frontend-overview.md)
  - [architecture/diagrams.md](architecture/diagrams.md)
- API
  - [api/http-contract.md](api/http-contract.md)
  - [api/endpoints.md](api/endpoints.md)
- Engineering Workflows
  - [workflows/bugfix-process.md](workflows/bugfix-process.md)
  - [workflows/feature-process.md](workflows/feature-process.md)
  - [workflows/release-notes.md](workflows/release-notes.md)
- Operations
  - [runbook/local-development.md](runbook/local-development.md)
- Governance
  - [governance/documentation-policy.md](governance/documentation-policy.md)
- Templates
  - [templates/bug-report.md](templates/bug-report.md)
  - [templates/feature-rfc.md](templates/feature-rfc.md)

## Rules of Use

- If a route, payload, auth rule, or module responsibility changes, update docs in the same PR.
- If implementation and docs conflict, fix code or docs before merge.
- Keep docs concrete and tied to real paths and behaviors in this repository.

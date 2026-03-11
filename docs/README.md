# Engineering Documentation Hub

This directory is the source of truth for architecture, API behavior, and delivery workflows.

## Start Here

1. Read the agent collaboration policy at [../AGENTS.md](../AGENTS.md).
2. Read [architecture/system-overview.md](architecture/system-overview.md).
3. Read [api/http-contract.md](api/http-contract.md).
4. Use [workflows/bugfix-process.md](workflows/bugfix-process.md) or [workflows/feature-process.md](workflows/feature-process.md) before implementation.

## Documentation Map

- Architecture
  - [architecture/system-overview.md](architecture/system-overview.md)
  - [architecture/backend-modules.md](architecture/backend-modules.md)
  - [architecture/frontend-overview.md](architecture/frontend-overview.md)
  - [architecture/diagrams.md](architecture/diagrams.md)
- API
  - [api/http-contract.md](api/http-contract.md)
  - [api/endpoints.md](api/endpoints.md)
- RFCs
  - [rfcs/feed-post-search.md](rfcs/feed-post-search.md)
  - [rfcs/follow-tags-feed.md](rfcs/follow-tags-feed.md)
  - [rfcs/post-image-uploads.md](rfcs/post-image-uploads.md)
  - [rfcs/post-questionnaires.md](rfcs/post-questionnaires.md)
  - [rfcs/collections-post-sequencing.md](rfcs/collections-post-sequencing.md)
  - [rfcs/profile-avatar-public-author-summary.md](rfcs/profile-avatar-public-author-summary.md)
- Engineering Workflows
  - [workflows/bugfix-process.md](workflows/bugfix-process.md)
  - [workflows/feature-process.md](workflows/feature-process.md)
  - [workflows/release-notes.md](workflows/release-notes.md)
- Operations
  - [runbook/local-development.md](runbook/local-development.md)
- Governance
  - [governance/documentation-policy.md](governance/documentation-policy.md)
  - [../AGENTS.md](../AGENTS.md)
- Templates
  - [templates/bug-report.md](templates/bug-report.md)
  - [templates/feature-rfc.md](templates/feature-rfc.md)

## Rules of Use

- Apply the Decision Gate: ask the developer for high-impact decisions before implementation.
- For each decision request, provide concrete options plus one recommended path.
- If a route, payload, auth rule, or module responsibility changes, update docs in the same PR.
- If implementation and docs conflict, fix code or docs before merge.
- Keep docs concrete and tied to real paths and behaviors in this repository.

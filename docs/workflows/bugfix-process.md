# Bugfix Process

## Goal

Fix defects quickly without breaking architecture, API contracts, or product principles.

## Required Inputs

- completed bug report based on `docs/templates/bug-report.md`
- clear reproduction steps
- expected and actual behavior
- impact assessment
- relevant docs reviewed first (`AGENTS.md`, architecture/API/workflow as needed)

## Workflow

1. Reproduce
  - reproduce issue locally with exact steps.
  - capture request/response and UI state when applicable.
2. Isolate
  - identify the failing module and layer (`route`, `service`, `repository`, frontend page).
  - classify root cause type: validation, auth, business logic, data access, UI orchestration.
3. Decision Gate
  - when fix changes contract/scope/rules, ask developer before patching.
  - provide options, recommendation, and tradeoffs.
4. Patch
  - implement minimal, targeted change.
  - preserve response envelope and role rules.
5. Verify
  - run manual checks on affected endpoints/pages.
  - validate no regressions in neighboring flows.
6. Document
  - update impacted docs in `docs/` and root `README.md` if needed.
  - add release note entry under "Fixed".

## Completion Checklist

- [ ] root cause identified and documented
- [ ] decision gate used when high-impact choices existed
- [ ] fix validated against reproduction steps
- [ ] no contract drift (or drift explicitly documented)
- [ ] docs updated in same PR
- [ ] release note drafted

## Escalation Rules

Escalate to RFC (`docs/templates/feature-rfc.md`) when:

- fix requires behavior change visible to clients
- fix introduces new route, payload, or permission model
- fix changes core product principles

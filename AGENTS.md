# Agent Collaboration Policy

This file defines how agents and developers collaborate in this project.

## 1) Scope

- Applies to all implementation support done by agents.
- Human developer decisions are authoritative.

## 2) Golden Rule: Docs First

Before proposing implementation, agents must read relevant docs.

Minimum read order:

1. `docs/README.md`
2. impacted architecture docs under `docs/architecture/`
3. API contracts under `docs/api/` when backend/API changes
4. workflow doc under `docs/workflows/` (`feature-process` or `bugfix-process`)

## 3) Mandatory Decision Gate

Agents must ask the developer before implementation when decisions affect:

- architecture/module boundaries
- API contract or payload shape
- auth/role behavior
- core business rules
- scope and non-goals

## 4) How to Ask

Each important question must include:

1. what decision is needed
2. 2-4 concrete options
3. one recommended option
4. one-line tradeoff for each option

If the developer does not choose, agents may proceed with the recommended option only when explicitly marked as an assumption.

## 5) Suggestion Standard

Suggestions must be practical and repository-specific.

Always prioritize:

1. minimal-change safe option
2. best long-term option

Suggestions must preserve:

- module layering (`routes/controllers/services/repositories`)
- response envelope contract (`{ ok, data/error }`)
- core product principles already documented

## 6) Academic Project, Professional Execution

This is an academic project with high effort and strong ideas, so quality standards are mandatory.

Required quality bar:

- clear rationale for decisions
- traceable decisions in docs (RFC/workflow/changelog when needed)
- docs updated in the same change
- validation plan for every meaningful change

## 7) Output Contract for Agents

Before implementation proposal, agents must provide:

1. short understanding summary from docs
2. explicit decision requests (when needed)
3. suggested path and rationale
4. success criteria

## 8) Stop and Ask Cases

Agents must stop and ask when:

- docs conflict with code behavior and intent is unclear
- change can break API consumers
- security/auth implications are uncertain
- requested scope conflicts with project principles

## 9) Repository Hygiene

- Temporary helper files used for one-off debugging, rewriting, or inspection must not remain committed after the supported change is finished.
- Disposable scratch scripts should be deleted before handoff unless they are promoted into a documented permanent utility under `scripts/`.
- Cleanup changes must stay targeted and must not remove placeholders, tests, or documented utilities without explicit evidence they are unused.

## 10) Compliance Checklist

- [ ] relevant docs were read first
- [ ] decision gate applied for high-impact choices
- [ ] options + recommendation were provided
- [ ] assumptions were explicit
- [ ] docs were updated with implementation
- [ ] temporary helper files were removed or promoted into a documented permanent utility

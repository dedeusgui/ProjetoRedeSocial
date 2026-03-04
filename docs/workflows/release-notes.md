# Release Notes Guide

## Goal

Maintain a concise, reliable summary of changes that affect engineering and product behavior.

## Suggested Format

Use one section per release date:

```markdown
## YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Fixed
- ...
### Docs
- ...
```

## Writing Rules

- Describe user-visible or integrator-visible impact.
- Reference endpoint paths when API behavior changed.
- Mention migration or compatibility notes when applicable.
- Keep each bullet factual and short.

## Mandatory Cases for a Release Note Entry

- new endpoint, payload field, auth rule, or role change
- bugfix in business logic
- moderation policy or trend calculation change
- any docs correction that prevents implementation mistakes

## Suggested Storage

Option A:
- maintain a `CHANGELOG.md` at repo root.

Option B:
- maintain release sections in this file.

Pick one and keep it consistent.

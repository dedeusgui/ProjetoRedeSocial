# Local Development Runbook

## Prerequisites

- Node.js 18+
- MongoDB reachable from `MONGO_URI`

## Environment Variables

Loaded in `src/config/env.js`:

- `PORT` (default: `3000`)
- `MONGO_URI` (default: `mongodb://localhost:27017/thesocial`)
- `JWT_SECRET` (default development value exists; override for non-local use)
- `JWT_EXPIRES_IN_SECONDS` (default: `43200`)
- `ADMIN_EMAILS` (optional, comma-separated; matching users are promoted to `admin`)

## Install

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

## Build and Run

```bash
npm run build
npm start
```

Notes:

- build script uses `xcopy`, designed for Windows shell.
- static frontend is served from `src/public` in development and from `dist/public` after build.

## Smoke Test Checklist

1. `GET /` returns API metadata envelope.
2. Register and login succeed.
3. Feed returns `items` and `pageInfo`.
4. Auth-protected endpoint `/api/v1/me/profile` rejects missing token and accepts valid token.
5. Moderation endpoint enforces role restrictions.
6. Admin endpoints reject non-admin users and return eligibility data for admins.
7. Admin can list users and delete posts/comments through admin-only routes.
8. Admin user deletion endpoint recalculates trends/private metrics after removal.

## Heavy Seed + Smoke Runner

Use `npm run test:populate` when you need a resettable local dataset with fake users, posts, collections, comments, reviews, avatars, and post images plus a smoke verification pass.

Required environment:

- `SEED_MONGO_URI`: explicit Mongo database to reset for the seed run
- `SEED_ALLOW_RESET=true`: required destructive-reset safeguard
- `ADMIN_EMAILS`: must include at least one email; the first one becomes the seeded admin account

Optional environment:

- `SEED_PORT` (default: `3101`)
- `SEED_UPLOAD_ROOT` (default: `uploads/seed-populate`)
- `SEED_PASSWORD` (default: `SeedPass123!`)

PowerShell example:

```powershell
$env:SEED_MONGO_URI="mongodb://localhost:27017/thesocial_seed"
$env:SEED_ALLOW_RESET="true"
$env:ADMIN_EMAILS="admin@seed.local"
npm run test:populate
```

Convenience defaults for video/demo prep:

- `npm run demo:seed`
  - uses `mongodb://localhost:27017/thesocial_seed`
  - uses `admin@seed.local`
  - uses port `3101`
  - keeps uploads under `uploads/seed-populate`
- `npm run demo:start`
  - starts the app against that same seeded demo dataset for manual browsing

These demo scripts still respect pre-set environment overrides if you need a different demo database, port, upload root, or admin email.

Behavior:

- drops only the database referenced by `SEED_MONGO_URI`
- clears only the configured seed upload root
- seeds a heavy dataset and recalculates derived moderation/private metrics
- starts the app locally, runs smoke assertions through the real HTTP API, then shuts the temporary server down cleanly
- leaves the seeded Mongo data and upload files in place for later manual browsing

Manual browsing after the run:

- start the app again with the same `MONGO_URI`, `UPLOAD_ROOT`, `PORT`, and `ADMIN_EMAILS`
- use the credentials printed by the runner summary
- or run `npm run demo:start` when you used the default demo seed settings above

## Common Issues

Mongo connection failure:

- verify MongoDB is running.
- verify `MONGO_URI`.

401 on protected routes:

- verify `Authorization: Bearer <token>` format.
- ensure token is signed with current `JWT_SECRET`.

404 on `/api/v1/*`:

- confirm module route was mounted in `src/server.js`.

Validation errors:

- check required fields and object IDs.
- see `src/common/validation/index.js`.

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

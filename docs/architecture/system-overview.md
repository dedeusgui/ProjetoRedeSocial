# System Overview

## Product Context

The system is a social network API and static frontend focused on knowledge sharing:

- chronological feed (no recommendation algorithm)
- binary moderation decisions on posts (`approved`, `not_relevant`)
- post-level like/dislike percentages are public in feed and post detail
- user aggregate metrics remain private to authenticated profile/admin endpoints

## Runtime Architecture

- Backend: Node.js + Express 5 + MongoDB (Mongoose)
- Frontend: static HTML/CSS/JS served by Express static middleware
- API base path: `/api/v1`
- Root metadata endpoint: `GET /`

Core backend entrypoint:
- `src/server.js`

## Module Style (Backend)

Each module follows the same layers:

- `routes`: HTTP route wiring
- `controllers`: request/response translation
- `services`: business logic and orchestration
- `repositories`: database access

Active modules:

- `auth`
- `users`
- `posts`
- `comments`
- `feed`
- `admin`
- `moderation`

## Request Lifecycle

1. Express receives request in `src/server.js`.
2. Route module matches endpoint under `/api/v1`.
3. Middleware executes (`auth`, `roles`) when required.
4. Controller delegates to service.
5. Service validates input and invokes repositories/other services.
6. Controller returns `{ ok: true, data }` via `sendSuccess`.
7. Any thrown `AppError` or runtime error flows to `errorHandler` and returns `{ ok: false, error }`.

## Cross-Module Dependencies

- `posts` depends on `comments` service for post detail responses with visible comments.
- `posts` depends on `users` service to refresh author private metrics after post deletion.
- `moderation` depends on `posts` service to:
  - update post trend and post moderation metrics
  - recalculate author private metrics

These dependencies are composed at application startup in `src/server.js`.

## Source of Truth

For behavior-level truth, prioritize:

1. `src/modules/*/routes/*.js`
2. `src/modules/*/services/*.js`
3. `src/common/http/*.js`, `src/common/validation/index.js`, `src/middleware/*.js`

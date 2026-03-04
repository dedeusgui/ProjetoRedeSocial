# Backend Modules

## Module Inventory

| Module | Main Routes | Service Responsibilities | Key Dependencies |
|---|---|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login` | Create users, validate credentials, issue JWT | `AuthRepository`, JWT signer |
| `users` | `GET /me/profile` | Return authenticated profile and private metrics; update metrics | `UserRepository` |
| `posts` | `POST /posts`, `GET /posts/:id` | Create post, fetch post details with visible comments, update post trend | `PostRepository`, `CommentService` |
| `comments` | `GET /posts/:id/comments`, `POST /posts/:id/comments` | Create visible comments and list visible comments by post | `CommentRepository` |
| `feed` | `GET /feed` | Return chronological published posts with cursor pagination | `FeedRepository` |
| `moderation` | `POST /posts/:id/review` | Upsert review, recompute trend, recompute author private metrics | `ModerationRepository`, `PostService`, `UserService` |

## Composition Flow

Module construction is centralized in `src/server.js`:

1. Create users module.
2. Create comments module.
3. Create posts module with comments service.
4. Create feed module.
5. Create moderation module with posts + users services.
6. Create auth module with JWT config.

## Shared Infrastructure

- Validation helpers: `src/common/validation/index.js`
- HTTP response helpers: `src/common/http/responses.js`
- Error boundary: `src/common/http/errorHandler.js`
- Auth middleware: `src/middleware/auth.js`
- Role middleware: `src/middleware/roles.js`

## Key Business Rules by Module

- `feed`: strictly chronological ordering and cursor pagination.
- `posts`: hidden posts are not returned by detail endpoint.
- `moderation`: post author cannot review own post.
- `moderation`: trend thresholds are:
  - `positive` if approval rate >= 60%
  - `negative` if approval rate <= 40%
  - `neutral` otherwise
- `users`: private metrics only exposed through authenticated profile endpoint.

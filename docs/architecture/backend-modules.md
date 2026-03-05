# Backend Modules

## Module Inventory

| Module | Main Routes | Service Responsibilities | Key Dependencies |
|---|---|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login` | Create users, validate credentials, issue JWT | `AuthRepository`, JWT signer |
| `users` | `GET /me/profile` | Return authenticated profile and private metrics; update metrics | `UserRepository` |
| `posts` | `POST /posts`, `GET /posts/:id`, `DELETE /posts/:id` | Create post, fetch post details with visible comments, update post trend, admin delete post with relations | `PostRepository`, `CommentService` |
| `comments` | `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id` | Create visible comments, list visible comments by post, admin delete comments | `CommentRepository` |
| `feed` | `GET /feed` | Return chronological published posts with cursor pagination | `FeedRepository` |
| `admin` | `GET /admin/users`, `GET /admin/moderator-eligibility`, `PATCH /admin/users/:id/moderator`, `DELETE /admin/users/:id` | Sync bootstrap admins from environment, list users/roles, manage moderator eligibility/promotion, and delete users for testing with stat recalculation | `AdminRepository`, `roles` middleware |
| `moderation` | `POST /posts/:id/review` | Upsert review, recompute trend, recompute author private metrics | `ModerationRepository`, `PostService`, `UserService` |

## Composition Flow

Module construction is centralized in `src/server.js`:

1. Create users module.
2. Create comments module.
3. Create posts module with comments service.
4. Create feed module.
5. Create admin module with admin-email bootstrap config.
6. Create moderation module with posts + users services.
7. Create auth module with JWT config + admin-email bootstrap config.

## Shared Infrastructure

- Validation helpers: `src/common/validation/index.js`
- HTTP response helpers: `src/common/http/responses.js`
- Error boundary: `src/common/http/errorHandler.js`
- Auth middleware: `src/middleware/auth.js`
- Role middleware: `src/middleware/roles.js`

## Key Business Rules by Module

- `feed`: strictly chronological ordering and cursor pagination.
- `posts`: hidden posts are not returned by detail endpoint.
- `admin`: `admin` role is bootstrap-managed through `ADMIN_EMAILS`; API can only grant/revoke `moderator`.
- `admin`: moderator eligibility requires minimum posts, minimum account age, and minimum approval rate.
- `moderation`: post author cannot review own post.
- `moderation`: trend is derived from validation score `approvalRate - rejectionRate`:
  - `neutral` only when approval and rejection are exactly tied (50/50)
  - `positive` when approval is greater than rejection
  - `negative` when rejection is greater than approval
- `users`: private metrics only exposed through authenticated profile endpoint.

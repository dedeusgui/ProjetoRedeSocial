# Backend Modules

## Module Inventory

| Module | Main Routes | Service Responsibilities | Key Dependencies |
|---|---|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login` | Create users, validate credentials, issue JWT | `AuthRepository`, JWT signer |
| `users` | `GET /me/profile`, `GET/POST/DELETE /me/followed-tags` | Return authenticated profile/private metrics; persist followed tags; update metrics | `UserRepository` |
| `posts` | `POST /posts`, `GET /posts/:id`, `PATCH /posts/:id`, `POST /posts/:id/media`, `DELETE /posts/:id/media/:mediaId`, `DELETE /posts/:id` | Create/edit post, persist image metadata, manage post image uploads/removals, fetch post details with visible comments, update post moderation metrics, delete posts by owner/moderator/admin with private metric recalculation and file cleanup | `PostRepository`, `CommentService`, `UserService`, local disk storage |
| `comments` | `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id` | Create visible comments, list visible comments by post, edit comments by owner, delete comments by owner/moderator/admin | `CommentRepository` |
| `feed` | `GET /feed`, `GET /feed/following` | Return chronological published posts with cursor pagination and optional search; return a chronological followed-tags feed for authenticated users | `FeedRepository`, `UserService` |
| `admin` | `GET /admin/users`, `GET /admin/moderator-eligibility`, `PATCH /admin/users/:id/moderator`, `DELETE /admin/users/:id` | Sync bootstrap admins from environment, list users/roles, manage moderator eligibility/promotion, and delete users for testing with stat recalculation | `AdminRepository`, `roles` middleware |
| `moderation` | `POST /posts/:id/review` | Upsert review, recompute post trend + approval percentages, recompute author private metrics | `ModerationRepository`, `PostService` |

## Composition Flow

Module construction is centralized in `src/server.js`:

1. Create users module.
2. Create comments module.
3. Create posts module with comments + users services.
4. Create feed module.
5. Create admin module with admin-email bootstrap config.
6. Create moderation module with posts service.
7. Create auth module with JWT config + admin-email bootstrap config.

## Shared Infrastructure

- Validation helpers: `src/common/validation/index.js`
- HTTP response helpers: `src/common/http/responses.js`
- Error boundary: `src/common/http/errorHandler.js`
- Auth middleware: `src/middleware/auth.js`
- Role middleware: `src/middleware/roles.js`

## Key Business Rules by Module

- `feed`: strictly chronological ordering and cursor pagination, even when search filters are applied.
- `feed`: followed-tag filtering matches any followed tag, keeps public feed behavior unchanged, and never introduces recommendation ranking.
- `feed`: public search is limited to published posts and matches `title`, `content`, and `tags`.
- `posts`: hidden posts are not returned by detail endpoint.
- `posts`: post images are stored on local disk and only image metadata/URLs are stored in MongoDB.
- `posts`: a post can have at most 4 images.
- `posts`: only the post author can add or remove post images.
- `posts`: authenticated post deletion is allowed for post author, moderator, or admin.
- `comments`: authenticated comment deletion is allowed for comment author, moderator, or admin.
- `admin`: `admin` role is bootstrap-managed through `ADMIN_EMAILS`; API can only grant/revoke `moderator`.
- `admin`: moderator eligibility requires minimum posts, minimum account age, and minimum approval percentage (`privateMetrics.score`) of 40%.
- `moderation`: any authenticated user can review posts, including own posts.
- `moderation`: trend is derived from post moderation percentages (`approvalPercentage - notRelevantPercentage`):
  - `neutral` only when approval and rejection are exactly tied (50/50)
  - `positive` when approval is greater than rejection
  - `negative` when rejection is greater than approval
- `users`: private metrics use approval percentage (`privateMetrics.score`, range `0` to `100`) plus total review volume, exposed only through authenticated profile/admin endpoints.
- `users`: followed tags are stored as canonical lowercase values without leading `#`.

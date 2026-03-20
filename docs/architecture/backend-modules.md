# Backend Modules

## Module Inventory

| Module | Main Routes | Service Responsibilities | Key Dependencies |
|---|---|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login` | Create users, validate credentials, issue JWT | `AuthRepository`, JWT signer |
| `users` | `GET /me/profile`, `DELETE /me`, `POST/DELETE /me/avatar`, `GET/POST/DELETE /me/followed-tags` | Return authenticated profile/private metrics, delete the authenticated non-admin account with shared cleanup, manage owner avatar uploads/removal, persist followed tags, update metrics, and format public author summaries | `UserRepository`, shared account deletion service, local disk storage |
| `posts` | `POST /posts`, `GET /posts/:id`, `PATCH /posts/:id`, `POST /posts/:id/media`, `DELETE /posts/:id/media/:mediaId`, `DELETE /posts/:id` | Create/edit post, persist optional questionnaire data and image metadata, manage post image uploads/removals, fetch post details with visible comments and public author summaries, update post moderation metrics, delete posts by owner/moderator/admin with private metric recalculation and file cleanup | `PostRepository`, `CommentService`, `UserService`, local disk storage |
| `comments` | `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id` | Create visible comments, list visible comments by post with public author summaries, edit comments by owner, delete comments by owner/moderator/admin | `CommentRepository` |
| `collections` | `GET /collections/:id`, `GET /me/collections`, `POST /collections`, `PATCH /collections/:id`, `DELETE /collections/:id`, `POST /collections/:id/items`, `DELETE /collections/:id/items/:postId`, `PATCH /collections/:id/items/reorder` | Create public collections, manage ordered collection items, validate owner-only collection rules, preserve manual item order, and resolve collection summaries/search matches for other modules | `CollectionRepository`, `Post` model |
| `feed` | `GET /feed`, `GET /feed/following`, `GET /collections/feed`, `GET /collections/feed/following` | Return chronological published posts with cursor pagination and optional search, including public author summaries, optional questionnaire payload, media, sequence summaries, and collection summaries; return a chronological followed-tags post feed for authenticated users; provide chronological collection-feed groundwork with optional search and followed-tag filtering by collection tags | `FeedRepository`, `UserService`, `CollectionService` |
| `admin` | `GET /admin/users`, `GET /admin/users/:id/delete-preview`, `GET /admin/moderator-eligibility`, `PATCH /admin/users/:id/moderator`, `DELETE /admin/users/:id` | Sync bootstrap admins from environment, list users/roles, provide admin-side user-deletion impact previews, manage moderator eligibility/promotion, and delete standard users through the shared account-deletion flow | `AdminRepository`, shared account deletion service, `roles` middleware |
| `moderation` | `POST /posts/:id/review` | Upsert review, recompute post trend + approval percentages, recompute author private metrics | `ModerationRepository`, `PostService` |

## Composition Flow

Module construction is centralized in `src/server.js`:

1. Create users module.
2. Create comments module.
3. Create collections module.
4. Create posts module with comments + users + collections services.
5. Create feed module with users + collections services.
6. Create admin module with admin-email bootstrap config.
7. Create moderation module with posts service.
8. Create auth module with JWT config + admin-email bootstrap config.

Shared account deletion is also composed in `src/server.js` and injected into the `users` and `admin` modules so both flows use the same cleanup logic.

## Shared Infrastructure

- Validation helpers: `src/common/validation/index.js`
- HTTP response helpers: `src/common/http/responses.js`
- Error boundary: `src/common/http/errorHandler.js`
- Auth middleware: `src/middleware/auth.js`
- Role middleware: `src/middleware/roles.js`

## Key Business Rules by Module

- `feed`: strictly chronological ordering and cursor pagination, even when search filters are applied.
- `feed`: followed-tag filtering matches any followed tag, keeps public feed behavior unchanged, and never introduces recommendation ranking.
- `feed`: public search is limited to published posts and matches `title`, `content`, `tags`, and collection tags through resolved collection post ids.
- `feed`: chronological collection-feed groundwork is separate from the posts feed and orders published collections by `createdAt` without mixing posts and collections in one stream.
- `feed`: collection-feed search matches collection `title`, `description`, and `tags`.
- `feed`: collection-feed followed-tag mode uses the authenticated user's followed tags against collection tags only.
- `feed`: public author data in feed responses is limited to avatar URL, username, and derived reputation tier.
- `feed`: questionnaire posts stay in normal chronological ordering; the feed may preview only the first questionnaire question while the full answer flow lives on post detail.
- `posts`: hidden posts are not returned by detail endpoint.
- `posts`: optional `sequence.previousPostId` links a post to one earlier visible post by the same author and remains linear.
- `posts`: sequence updates reject self-links, cross-author links, duplicate continuations, and cycles.
- `posts`: post/feed/detail summaries include `sequence` and `collections` context when applicable.
- `posts`: post images are stored on local disk and only image metadata/URLs are stored in MongoDB.
- `posts`: a post can have at most 4 images.
- `posts`: a post can also include one optional questionnaire stored directly on the post document.
- `posts`: questionnaires are limited to 10 questions, each with 2 to 6 options and exactly one correct answer.
- `posts`: post `title` is limited to 100 characters and `content` is limited to 3000 characters on create/edit; questionnaire title is limited to 120 characters.
- `posts`: only the post author can add or remove post images.
- `posts`: only the post author can create, edit, or remove a questionnaire because it follows post ownership rules.
- `posts`: authenticated post deletion is allowed for post author, moderator, or admin.
- `posts`: post detail author data is limited to avatar URL, username, and derived reputation tier.
- `collections`: collection reads are public; create/edit/delete/item management are owner-only.
- `collections`: only the owner's visible posts may be added, duplicates are rejected, and reorder requests must contain the exact same post set.
- `collections`: owner CRUD is exposed on a dedicated authenticated management page, while public collection browsing remains read-only.
- `comments`: authenticated comment deletion is allowed for comment author, moderator, or admin.
- `comments`: comment author data is limited to avatar URL, username, and derived reputation tier.
- `admin`: `admin` role is bootstrap-managed through `ADMIN_EMAILS`; API can only grant/revoke `moderator`.
- `admin`: moderator eligibility requires minimum posts, minimum account age, and minimum approval percentage (`privateMetrics.score`) of 40%.
- `admin`: only standard users (`role: user`) can be deleted through admin tools; moderators and admins are blocked.
- `admin`: admin delete preview classifies the modal as `level_1` when the target user has no posts, no collections, and stays below the visible-comment thresholds.
- `admin`: visible comments promote the delete preview to `level_2` only when the target user has `10+` visible comments total or `5+` visible comments in the last `30` days.
- `admin`: deleting a user removes authored collections, removes authored posts from all remaining collections, deletes avatar/post-media files, and recalculates remaining derived stats through the shared account-deletion flow.
- `moderation`: any authenticated user can review posts, including own posts.
- `moderation`: trend is derived from post moderation percentages (`approvalPercentage - notRelevantPercentage`):
  - `neutral` only when approval and rejection are exactly tied (50/50)
  - `positive` when approval is greater than rejection
  - `negative` when rejection is greater than approval
- `users`: private metrics use approval percentage (`privateMetrics.score`, range `0` to `100`) plus total review volume, exposed only through authenticated profile/admin endpoints.
- `users`: authenticated self-deletion is allowed for `user` and `moderator`, but blocked for `admin`.
- `users`: self-delete and admin delete both remove authored collections, posts, comments, reviews, avatar files, post-media files, remaining collection references, and then recalculate derived stats.
- `users`: avatar uploads are owner-managed, stored on local disk, and exposed publicly only as an image URL on post/comment author summaries.
- `users`: public reputation is derived server-side from `privateMetrics.score` bands (`0-39 low`, `40-69 medium`, `70-100 high`) and does not expose the exact percentage publicly.
- `users`: followed tags are stored as canonical lowercase values without leading `#`, limited to 32 characters, and restricted to letters, numbers, hyphen, and underscore.

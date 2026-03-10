# Endpoints Reference

Source of truth:

- route definitions in `src/modules/*/routes/*.js`
- service behavior in `src/modules/*/services/*.js`

## Public Metadata

### `GET /`

- Auth: none
- Description: API metadata

## Auth

### `POST /api/v1/auth/register`

- Auth: none
- Body:
  - `username` (required)
  - `email` (required)
  - `password` (required)
- Success: `201`
- Returns: token + user summary

Example request:

```json
{
  "username": "ana",
  "email": "ana@email.com",
  "password": "123456"
}
```

### `POST /api/v1/auth/login`

- Auth: none
- Body:
  - `email` (required)
  - `password` (required)
- Success: `200`
- Returns: token + user summary

## Feed

### `GET /api/v1/feed`

- Auth: none
- Query:
  - `cursor` (optional): `<createdAtMillis>_<postId>`
  - `limit` (optional): default `20`, max `50`
  - `search` (optional): case-insensitive partial match on `title`, `content`, or `tags`
- Success: `200`
- Returns:
  - matched published posts in reverse chronological order
  - `items[]` with post summary
    - includes `author`:
      - `id`
      - `username`
      - `avatarUrl` (`string | null`)
      - `reputation`:
        - `tier` (`low | medium | high`)
        - `label`
    - includes `media[]`
    - includes `trend`
    - includes `moderationMetrics`:
      - `approvedCount`
      - `notRelevantCount`
      - `totalReviews`
      - `approvalPercentage`
      - `notRelevantPercentage`
  - `pageInfo.nextCursor` (`string | null`)
  - `pageInfo.limit`
- Notes:
  - blank or missing `search` returns the normal unfiltered feed
  - cursor pagination applies within the filtered result set when `search` is used

### `GET /api/v1/feed/following`

- Auth: required (`user` or higher)
- Query:
  - `cursor` (optional): `<createdAtMillis>_<postId>`
  - `limit` (optional): default `20`, max `50`
  - `search` (optional): case-insensitive partial match on `title`, `content`, or `tags`, applied only inside posts matching followed tags
- Success: `200`
- Returns:
  - published posts in reverse chronological order whose `tags` match any followed tag
  - same `items[]` and `pageInfo` shape as `GET /api/v1/feed`
- Notes:
  - if the user follows no tags, the endpoint returns an empty `items[]`
  - followed-tag matching is case-insensitive and tolerates a leading `#` in stored post tags

## Posts

### `POST /api/v1/posts`

- Auth: required (`user` or higher)
- Body:
  - `title` (required)
  - `content` (required)
  - `tags` (optional array of strings)
- Success: `201`
- Returns:
  - created post summary including `media[]` (empty on initial JSON create)
- Side effects:
  - creates post with `status: "published"` and `trend: "neutral"`
  - initializes moderation metrics counters/percentages with zeros

### `DELETE /api/v1/posts/:id`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Rules:
  - only post author, `moderator`, or `admin` can delete
- Side effects:
  - permanently deletes the post
  - removes uploaded post images from local storage
  - permanently deletes related comments and reviews
  - recomputes post-author private metrics

### `PATCH /api/v1/posts/:id`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Body (at least one field required):
  - `title` (optional string, non-empty, max `120`)
  - `content` (optional string, non-empty, max `5000`)
  - `tags` (optional array of strings)
- Success: `200`
- Rules:
  - only post author can edit
- Returns:
  - updated post summary including `media[]`

### `POST /api/v1/posts/:id/media`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Content type:
  - `multipart/form-data`
- Body:
  - `media` (required file field, one or more images)
- Success: `201`
- Returns:
  - `id`
  - `media[]`
  - `updatedAt`
- Rules:
  - only post author can upload media
  - a post can have up to `4` images total
  - allowed formats: JPG, PNG, WebP
  - max size: `5 MB` per image

### `DELETE /api/v1/posts/:id/media/:mediaId`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
  - `mediaId` is the stored media item id
- Success: `200`
- Returns:
  - `id`
  - `media[]`
  - `updatedAt`
- Rules:
  - only post author can remove media

### `GET /api/v1/posts/:id`

- Auth: none
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Returns:
  - post detail
  - `author`:
    - `id`
    - `username`
    - `avatarUrl` (`string | null`)
    - `reputation`:
      - `tier` (`low | medium | high`)
      - `label`
  - `media[]` with uploaded post image metadata
  - embedded `comments` list with visible comments only
    - each `comment.author` includes:
      - `id`
      - `username`
      - `avatarUrl` (`string | null`)
      - `reputation`:
        - `tier` (`low | medium | high`)
        - `label`
  - includes `moderationMetrics`:
    - `approvedCount`
    - `notRelevantCount`
    - `totalReviews`
    - `approvalPercentage`
    - `notRelevantPercentage`
- Error:
  - `404 NOT_FOUND` if post does not exist or is hidden

## Comments

### `GET /api/v1/posts/:id/comments`

- Auth: none
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Returns: visible comments for post, where each comment includes:
  - `author`:
    - `id`
    - `username`
    - `avatarUrl` (`string | null`)
    - `reputation`:
      - `tier` (`low | medium | high`)
      - `label`

### `POST /api/v1/posts/:id/comments`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Body:
  - `content` (required)
- Success: `201`
- Side effects:
  - creates comment with `status: "visible"`

### `DELETE /api/v1/comments/:id`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Rules:
  - comment author, `moderator`, or `admin` can delete
- Side effects:
  - permanently deletes the comment

### `PATCH /api/v1/comments/:id`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Body:
  - `content` (required string, non-empty, max `2000`)
- Success: `200`
- Rules:
  - only comment author can edit

## Admin

### `GET /api/v1/admin/users`

- Auth: required (`admin`)
- Success: `200`
- Returns:
  - list of users with:
    - `id`
    - `username`
    - `email`
    - `role`
    - `score` (`0-100`, approval percentage for authored-post reviews)
    - `totalReviews`
    - `postCount`
    - `createdAt`

### `GET /api/v1/admin/moderator-eligibility`

- Auth: required (`admin`)
- Success: `200`
- Returns:
  - `requirements`:
    - `minPosts`
    - `minAccountAgeDays`
    - `minScore` (minimum approval percentage threshold)
  - `eligibleUsers[]` (users eligible for moderator promotion; includes approval percentage and review volume)
  - `moderators[]` (current moderators; includes approval percentage and review volume)

### `PATCH /api/v1/admin/users/:id/moderator`

- Auth: required (`admin`)
- Path params:
  - `id` must be a valid ObjectId
- Body:
  - `action` (required): `grant | revoke`
- Success: `200`
- Rules:
  - `grant` requires user to satisfy eligibility requirements
  - `admin` role cannot be assigned or removed by this endpoint

### `DELETE /api/v1/admin/users/:id`

- Auth: required (`admin`)
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Rules:
  - admins cannot delete their own account
  - config-managed admins cannot be deleted
- Side effects:
  - deletes user-authored posts, comments, and reviews
  - deletes user-authored comments and reviews on other posts
  - recomputes post trends and private metrics for remaining data

## Moderation

### `POST /api/v1/posts/:id/review`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Body:
  - `decision` (required): `approved | not_relevant`
  - `reason` (optional)
- Success: `201`
- Rules:
  - one review per `(postId, reviewerId)` pair is upserted
- Side effects:
  - recomputes post trend and moderation metrics (approval percentage + counters)
  - recomputes author private metrics using `approvedVotes / totalVotes * 100`

## Users

### `GET /api/v1/me/profile`

- Auth: required (`user` or higher)
- Success: `200`
- Returns:
  - user identity and role
  - `avatarUrl` (`string | null`)
  - `publicReputation`:
    - `tier` (`low | medium | high`)
    - `label`
  - private metrics:
    - `score` (approval percentage in range `0` to `100` using `approvedCount / totalReviews * 100`)
    - `totalReviews`

### `POST /api/v1/me/avatar`

- Auth: required (`user` or higher)
- Content type:
  - `multipart/form-data`
- Body:
  - `avatar` (required file field, single image)
- Success: `201`
- Returns:
  - `avatarUrl` (`string | null`)
  - `publicReputation`
  - `updatedAt`
- Rules:
  - owner-only route
  - allowed formats: JPG, PNG, WebP
  - max size: `5 MB`

### `DELETE /api/v1/me/avatar`

- Auth: required (`user` or higher)
- Success: `200`
- Returns:
  - `avatarUrl` (`null`)
  - `publicReputation`
  - `updatedAt`
- Rules:
  - owner-only route

### `GET /api/v1/me/followed-tags`

- Auth: required (`user` or higher)
- Success: `200`
- Returns:
  - `followedTags[]` stored as canonical lowercase values without leading `#`

### `POST /api/v1/me/followed-tags`

- Auth: required (`user` or higher)
- Body:
  - `tag` (required string)
- Success: `201`
- Behavior:
  - trims the value
  - removes leading `#`
  - lowercases the stored tag
  - deduplicates the followed-tag list
- Returns:
  - `tag` (canonical stored tag)
  - `followedTags[]`

### `DELETE /api/v1/me/followed-tags/:tag`

- Auth: required (`user` or higher)
- Path params:
  - `tag` is the canonical or URL-encoded tag value to remove
- Success: `200`
- Returns:
  - `removedTag`
  - `followedTags[]`

## Representative Error Examples

Missing required field:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Preencha os campos obrigatórios: título.",
    "details": {
      "missing": ["title"],
      "missingLabels": ["título"]
    }
  }
}
```

Missing bearer token:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Autenticação necessária."
  }
}
```

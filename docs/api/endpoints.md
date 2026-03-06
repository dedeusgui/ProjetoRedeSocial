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
- Success: `200`
- Returns:
  - `items[]` with post summary
    - includes `trend`
    - includes `moderationMetrics`:
      - `approvedCount`
      - `notRelevantCount`
      - `totalReviews`
      - `likePercentage`
      - `dislikePercentage`
  - `pageInfo.nextCursor` (`string | null`)
  - `pageInfo.limit`

## Posts

### `POST /api/v1/posts`

- Auth: required (`user` or higher)
- Body:
  - `title` (required)
  - `content` (required)
  - `tags` (optional array of strings)
- Success: `201`
- Side effects:
  - creates post with `status: "published"` and `trend: "neutral"`
  - initializes moderation metrics counters/percentages with zeros

### `DELETE /api/v1/posts/:id`

- Auth: required (`user` or higher)
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Rules:
  - only post author or `admin` can delete
- Side effects:
  - permanently deletes the post
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

### `GET /api/v1/posts/:id`

- Auth: none
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Returns:
  - post detail
  - embedded `comments` list with visible comments only
  - includes `moderationMetrics`:
    - `approvedCount`
    - `notRelevantCount`
    - `totalReviews`
    - `likePercentage`
    - `dislikePercentage`
- Error:
  - `404 NOT_FOUND` if post does not exist or is hidden

## Comments

### `GET /api/v1/posts/:id/comments`

- Auth: none
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
- Returns: visible comments for post

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

- Auth: required (`admin`)
- Path params:
  - `id` must be a valid ObjectId
- Success: `200`
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
    - `approvalRate`
    - `rejectionRate`
    - `approvedCount`
    - `notRelevantCount`
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
    - `minApprovalRate`
  - `eligibleUsers[]` (users eligible for moderator promotion; includes approval/rejection rates and decision counters)
  - `moderators[]` (current moderators; includes approval/rejection rates and decision counters)

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
  - recomputes post trend and moderation metrics (like/dislike percentages + counters)
  - recomputes author private metrics using per-post average percentages

## Users

### `GET /api/v1/me/profile`

- Auth: required (`user` or higher)
- Success: `200`
- Returns:
  - user identity and role
  - private metrics:
    - `approvalRate` (average approval percentage across authored posts)
    - `rejectionRate` (average not-relevant percentage across authored posts)
    - `approvedCount`
    - `notRelevantCount`
    - `totalReviews`

## Representative Error Examples

Missing required field:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: title",
    "details": {
      "missing": ["title"]
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
    "message": "Authentication required"
  }
}
```

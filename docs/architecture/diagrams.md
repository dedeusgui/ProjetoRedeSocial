# Architecture Diagrams

## Component View

```mermaid
flowchart TD
  Client[Browser Pages in src/public/pages] --> API[Express App in src/server.js]
  API --> Auth[Auth Module]
  API --> Users[Users Module]
  API --> Posts[Posts Module]
  API --> Comments[Comments Module]
  API --> Feed[Feed Module]
  API --> Moderation[Moderation Module]
  Auth --> Mongo[(MongoDB)]
  Users --> Mongo
  Posts --> Mongo
  Comments --> Mongo
  Feed --> Mongo
  Moderation --> Mongo
  Moderation --> Posts
  Moderation --> Users
  Posts --> Comments
```

## Sequence: Register/Login

```mermaid
sequenceDiagram
  participant U as User
  participant A as AuthController
  participant S as AuthService
  participant R as AuthRepository
  U->>A: POST /api/v1/auth/register
  A->>S: register(payload)
  S->>R: findByEmail + findByUsername
  S->>R: createUser(passwordHash)
  S-->>A: token + user
  A-->>U: 201 { ok: true, data }

  U->>A: POST /api/v1/auth/login
  A->>S: login(payload)
  S->>R: findByEmail
  S-->>A: token + user
  A-->>U: 200 { ok: true, data }
```

## Sequence: Create Review

```mermaid
sequenceDiagram
  participant M as Moderator/Admin
  participant C as ModerationController
  participant S as ModerationService
  participant MR as ModerationRepository
  participant PS as PostService
  participant US as UserService
  M->>C: POST /api/v1/posts/:id/review
  C->>S: createReview(postId, reviewerId, decision, reason)
  S->>PS: getPostForModeration(postId)
  S->>MR: upsertReview(...)
  S->>MR: countPostDecisions(postId)
  S->>PS: updatePostTrend(postId, trend)
  S->>MR: countAuthorDecisions(authorId)
  S->>US: updatePrivateMetrics(authorId, metrics)
  S-->>C: review summary + trend
  C-->>M: 201 { ok: true, data }
```

## Sequence: Feed Pagination

```mermaid
sequenceDiagram
  participant U as User
  participant FC as FeedController
  participant FS as FeedService
  participant FR as FeedRepository
  U->>FC: GET /api/v1/feed?cursor=...&limit=...
  FC->>FS: getFeed(cursor, limit)
  FS->>FR: findChronologicalFeed(cursor, resolvedLimit)
  FS-->>FC: items + pageInfo.nextCursor
  FC-->>U: 200 { ok: true, data }
```

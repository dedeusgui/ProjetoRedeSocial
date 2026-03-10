# HTTP Contract

## Base Information

- API prefix: `/api/v1`
- Content type: `application/json` by default; `multipart/form-data` is used for `POST /api/v1/posts/:id/media`
- Auth scheme for protected routes: `Authorization: Bearer <token>`

## Success Envelope

All successful responses follow:

```json
{
  "ok": true,
  "data": {}
}
```

## Error Envelope

All errors follow:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Notes:

- `details` is optional and used in validation scenarios.
- Validation/upload errors should prefer actionable `message` text and may include limits or allowed values in `details`.
- `AppError` is mapped directly by `src/common/http/errorHandler.js`.
- unknown runtime failures return:
  - `code: "INTERNAL_ERROR"`
  - `message: "Ocorreu um erro interno inesperado."`

## Common Error Codes

- `VALIDATION_ERROR` (400)
- `UNAUTHENTICATED` (401)
- `INVALID_CREDENTIALS` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

## Validation Rules

From `src/common/validation/index.js`:

- `requireFields` rejects missing, null, and empty-string required fields.
- `ensureObjectId` rejects invalid MongoDB object IDs.
- `parseLimit` applies defaults and max cap for pagination.

## Authentication and Authorization

- `src/middleware/auth.js`
  - requires Bearer token
  - decodes JWT and loads current user role from database before assigning `req.user = { id, role, username }`
- `src/middleware/roles.js`
  - checks `req.user.role` against allowed roles
- admin bootstrap
  - environment variable `ADMIN_EMAILS` (comma-separated emails) promotes matching users to `admin`
  - admin role assignment is config-managed; API role-management only grants/revokes `moderator`

## Contract Drift Policy

If one of these changes, update docs in the same pull request:

- route path/method
- request payload requirements
- response envelope shape
- auth or role requirements
- error code semantics

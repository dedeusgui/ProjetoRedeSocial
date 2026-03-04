# HTTP Contract

## Base Information

- API prefix: `/api/v1`
- Content type: `application/json`
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
- `AppError` is mapped directly by `src/common/http/errorHandler.js`.
- unknown runtime failures return:
  - `code: "INTERNAL_ERROR"`
  - `message: "Unexpected server error"`

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
  - decodes JWT and assigns `req.user = { id, role, username }`
- `src/middleware/roles.js`
  - checks `req.user.role` against allowed roles

## Contract Drift Policy

If one of these changes, update docs in the same pull request:

- route path/method
- request payload requirements
- response envelope shape
- auth or role requirements
- error code semantics

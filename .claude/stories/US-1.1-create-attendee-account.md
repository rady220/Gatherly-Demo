# US-1.1 — Create an attendee account

**Epic:** Epic 1 — User Account & Authentication Management

## User Story

As a new user, I want to sign up for an attendee account so that I can browse and register for conferences.

## Acceptance Criteria

1. `POST /api/auth/register` accepts `name`, `email`, `password`.
2. Default role is `ATTENDEE`.
3. Validates email format (must contain `@`) and password strength (≥ 8 characters).
4. Email must be unique (case-insensitive); duplicate returns 409.
5. Returns a JWT access token, refresh token, and user profile (without password hash).
6. Invalid or missing input returns 400 with clear validation errors.
7. Password is hashed before storage (bcrypt).

## Role / Permissions

| Role | Access |
|------|--------|
| Anonymous | ✅ Allowed (no token required) |

## Dependencies

- Existing auth infrastructure (`tokens.ts`, `auth.ts` middleware)
- Users table in SQLite store

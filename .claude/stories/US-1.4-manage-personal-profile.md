# US-1.4 — Manage a personal profile

**Epic:** Epic 1 — User Account & Authentication Management

## User Story

As an authenticated user, I want to view and edit my personal profile details so that my account information is accurate.

## Acceptance Criteria

1. `GET /api/me` returns the current user's profile (id, name, email, role, bio, avatar, organization, isVerified).
2. `PATCH /api/me` accepts and updates: `name`, `bio`, `avatar` (URL), `organization`.
3. Cannot update `role`, `email`, or `password` via this route (ignored or 400).
4. Invalid avatar URL format returns 400.
5. Returns the full updated user profile on success.
6. Only the authenticated user can view/edit their own profile.

## Role / Permissions

| Role | Access |
|------|--------|
| Any authenticated user | ✅ Can view and edit own profile |
| Unauthenticated | ❌ 401 |

## Dependencies

- US-1.1 (user account exists)
- New columns on users table: `bio`, `organization`, `is_verified`

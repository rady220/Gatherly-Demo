# US-1.3 — Reset or change a password

**Epic:** Epic 1 — User Account & Authentication Management

## User Story

As a user, I want to reset my password if I forget it or change it from my settings so that my account remains secure.

## Acceptance Criteria

1. `POST /api/auth/forgot-password` accepts `email`; always returns 200 (no email enumeration).
2. If the email exists, a reset token (UUID) is generated and stored with a 1-hour expiry.
3. `POST /api/auth/reset-password` accepts `token` + `newPassword`; validates token, updates password, marks token as used.
4. Expired or already-used reset token returns 400.
5. `POST /api/auth/change-password` (authenticated) accepts `currentPassword` + `newPassword`.
6. Change-password verifies current password; wrong password returns 401.
7. New password must meet strength requirements (≥ 8 chars).

## Role / Permissions

| Role | Access |
|------|--------|
| Anonymous | ✅ `forgot-password` (no auth needed) |
| Token holder | ✅ `reset-password` (validated via token) |
| Authenticated user | ✅ `change-password` (own account only) |

## Dependencies

- US-1.1 (user account exists)
- New `password_reset_tokens` table (user_id, token, expires_at, used)

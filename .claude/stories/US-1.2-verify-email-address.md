# US-1.2 — Verify an email address

**Epic:** Epic 1 — User Account & Authentication Management

## User Story

As a registered user, I want to verify my email address so that my account becomes fully active.

## Acceptance Criteria

1. `POST /api/auth/verify-email` accepts a `token` (UUID string).
2. Valid token sets `isVerified = true` on the user record.
3. Expired or already-used token returns 400.
4. Unverified users cannot register for conferences (`POST /api/conferences/:id/register` returns 403).
5. `POST /api/auth/resend-verification` generates and stores a new verification token.
6. Verification tokens expire after 24 hours.

## Role / Permissions

| Role | Access |
|------|--------|
| Account owner (authenticated) | ✅ Can verify own email |
| Other users | ❌ Cannot verify another user's email |

## Dependencies

- US-1.1 (user must have an account)
- New `verification_tokens` table (user_id, token, expires_at, used)
- `isVerified` column on users table

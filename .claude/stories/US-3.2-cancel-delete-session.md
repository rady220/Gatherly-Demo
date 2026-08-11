# US-3.2 — Cancel or delete a session

**Epic:** Epic 3 — Session & Schedule Operations

## User Story

As an Organizer, I want to cancel or delete a session if schedule changes occur so that the program stays accurate.

## Acceptance Criteria

1. `POST /api/sessions/:id/cancel` sets the session's status to `CANCELLED`; returns the updated session.
2. `DELETE /api/sessions/:id` performs a hard delete — allowed only if the session has zero agenda entries.
3. Delete of a session with agenda entries returns 409 (`HAS_AGENDA_ENTRIES`).
4. Cancelled sessions are excluded from room conflict checks.
5. Cancelled sessions cannot be added to a user's agenda (409 on toggle).
6. Already-cancelled sessions cannot be cancelled again (409, idempotency).
7. Returns 404 if session not found.

## Role / Permissions

| Role | Access |
|------|--------|
| Conference owner (ORGANIZER) | ✅ Can cancel/delete sessions in own conferences |
| ADMIN | ✅ Can cancel/delete any session |
| SPEAKER / ATTENDEE | ❌ 403 |

## Dependencies

- US-3.1 (session must exist)
- Agenda table (check for entries before delete)

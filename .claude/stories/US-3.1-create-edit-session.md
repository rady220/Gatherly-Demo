# US-3.1 — Create and edit a session

**Epic:** Epic 3 — Session & Schedule Operations

## User Story

As an Organizer, I want to create and update session details within a conference so that I can build the program schedule.

## Acceptance Criteria

1. `POST /api/conferences/:id/sessions` creates a new session with: `title`, `abstract`, `track`, `room`, `startsAt`, `endsAt`, `capacity`, `speakerId`.
2. `PATCH /api/sessions/:id` updates an existing session's fields.
3. Session time must fall within the parent conference's `startsAt`/`endsAt` range.
4. `endsAt > startsAt` is required (400 otherwise).
5. Room conflict check: rejects if the same room has an overlapping session (409, `ROOM_CONFLICT`).
6. Returns 201 on create, 200 on update.
7. Only non-cancelled sessions can be edited (cancelled → 400).
8. Conference must exist (404 if not found).

## Role / Permissions

| Role | Access |
|------|--------|
| Conference owner (ORGANIZER) | ✅ Can create/edit sessions |
| ADMIN | ✅ Can create/edit sessions for any conference |
| SPEAKER / ATTENDEE | ❌ 403 |

## Dependencies

- US-2.1 (conference must exist)
- Room conflict detection logic (existing `checkRoomConflictFn`)
- Sessions table

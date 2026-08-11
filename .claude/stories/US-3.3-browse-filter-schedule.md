# US-3.3 — Browse and filter the schedule

**Epic:** Epic 3 — Session & Schedule Operations

## User Story

As an Attendee, I want to browse and filter conference sessions by day, track, room, speaker, or keyword so that I can find relevant sessions quickly.

## Acceptance Criteria

1. `GET /api/conferences/:id/sessions?day=&track=&room=&speaker=&q=` supports optional filter query parameters.
2. All filter params are optional; no filters returns all sessions for the conference.
3. Multiple filters combine with AND logic.
4. `day` filters by date portion of `startsAt` (format: `YYYY-MM-DD`).
5. `q` performs case-insensitive search on `title` and `abstract`.
6. `speaker` matches against speaker name (LIKE).
7. Draft conference sessions return 403 for non-ADMIN/ORGANIZER users.
8. Returns `Session[]` with `status` field included.
9. Frontend syncs filter selections to URL query params for shareable links.
10. Frontend provides dropdowns for day, track, room and a text search input.

## Role / Permissions

| Role | Access |
|------|--------|
| Any authenticated user | ✅ Can browse published conference schedules |
| ADMIN / ORGANIZER | ✅ Can also browse draft conference schedules |
| Unauthenticated | ❌ 401 |

## Dependencies

- US-3.1 (sessions must exist)
- Sessions table with filter-friendly columns (track, room, starts_at, speaker_id)
- Frontend schedule-browser component with URL param sync

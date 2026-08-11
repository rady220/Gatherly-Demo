# US-2.2 — Configure rooms and tracks

**Epic:** Epic 2 — Conference Lifecycle Management

## User Story

As an Organizer, I want to add rooms and tracks to my conference so that sessions can be organized properly.

## Acceptance Criteria

1. `POST /api/conferences/:id/rooms` — adds a room with `name` (unique within conference) and `capacity` (positive integer).
2. `GET /api/conferences/:id/rooms` — lists all rooms for the conference.
3. `DELETE /api/conferences/:id/rooms/:roomId` — removes a room (only if no sessions are assigned to it; otherwise 409).
4. `POST /api/conferences/:id/tracks` — adds a track with `name` (unique within conference) and `color` (hex string, e.g. `#6d5dfc`).
5. `GET /api/conferences/:id/tracks` — lists all tracks for the conference.
6. `DELETE /api/conferences/:id/tracks/:trackId` — removes a track (only if no sessions reference it; otherwise 409).
7. Returns 404 if conference not found.
8. Validates input: name required, capacity > 0, color matches hex pattern.

## Role / Permissions

| Role | Access |
|------|--------|
| Conference owner (ORGANIZER) | ✅ Full CRUD |
| ADMIN | ✅ Full CRUD |
| SPEAKER / ATTENDEE | ❌ 403 |

## Dependencies

- US-2.1 (conference must exist)
- New `rooms` table: id, conference_id, name, capacity
- New `tracks` table: id, conference_id, name, color

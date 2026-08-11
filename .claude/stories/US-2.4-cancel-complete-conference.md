# US-2.4 — Cancel or complete a conference

**Epic:** Epic 2 — Conference Lifecycle Management

## User Story

As an Organizer, I want to mark a conference as completed or cancelled so that users know its final status.

## Acceptance Criteria

1. `POST /api/conferences/:id/status` accepts body `{ status: "CANCELLED" | "COMPLETED" }`.
2. `CANCELLED` is allowed from `DRAFT` or `PUBLISHED` states.
3. `COMPLETED` is allowed only if the conference `endsAt` date has passed (400 otherwise).
4. Invalid transition (e.g., CANCELLED → PUBLISHED) returns 400.
5. Cancelled or completed conferences reject new registrations (409 on register attempts).
6. Returns the updated Conference object.
7. Only the conference owner or ADMIN can change status.

## Role / Permissions

| Role | Access |
|------|--------|
| Conference owner (ORGANIZER) | ✅ Can cancel/complete own conferences |
| ADMIN | ✅ Can cancel/complete any conference |
| SPEAKER / ATTENDEE | ❌ 403 |

## Dependencies

- US-2.3 (conference must be published to be completed; or DRAFT/PUBLISHED to be cancelled)
- Status state machine: DRAFT → PUBLISHED → COMPLETED; DRAFT/PUBLISHED → CANCELLED

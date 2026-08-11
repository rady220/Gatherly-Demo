# US-2.3 — Preview and publish a conference

**Epic:** Epic 2 — Conference Lifecycle Management

## User Story

As an Organizer, I want to preview and publish my conference draft so that attendees can discover and register for it.

## Acceptance Criteria

1. `POST /api/conferences/:id/publish` transitions status from `DRAFT` to `PUBLISHED`.
2. Rejects (400) if conference has no rooms defined.
3. Rejects (400) if conference has no valid start/end dates.
4. Already-published conference returns 409 (`ALREADY_PUBLISHED`).
5. Published conferences appear in the public conference listing (`GET /api/conferences`).
6. Returns the updated Conference object with `status: "PUBLISHED"`.
7. Only the conference owner or ADMIN can publish.

## Role / Permissions

| Role | Access |
|------|--------|
| Conference owner (ORGANIZER) | ✅ Can publish own conferences |
| ADMIN | ✅ Can publish any conference |
| SPEAKER / ATTENDEE | ❌ 403 |

## Dependencies

- US-2.1 (conference exists in DRAFT status)
- US-2.2 (rooms must be configured before publish)

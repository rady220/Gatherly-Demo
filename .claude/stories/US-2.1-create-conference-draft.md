# US-2.1 — Create a conference draft

**Epic:** Epic 2 — Conference Lifecycle Management

## User Story

As an Organizer or Admin, I want to create a new conference draft so that I can set up its details before publishing.

## Acceptance Criteria

1. `POST /api/conferences` accepts `title`, `summary`, `startsAt`, `endsAt`, `city`, `venue`, `capacity`.
2. Restricted to `ORGANIZER` and `ADMIN` roles (403 for others).
3. Validates `startsAt < endsAt` and `capacity > 0`.
4. Creates conference in `DRAFT` status with an auto-generated slug (from title).
5. Sets `organizerId` from the authenticated user's ID.
6. Returns 201 with the full Conference object.
7. Duplicate slug (from similar title) returns 409.

## Role / Permissions

| Role | Access |
|------|--------|
| ORGANIZER | ✅ Can create conferences |
| ADMIN | ✅ Can create conferences |
| SPEAKER | ❌ 403 |
| ATTENDEE | ❌ 403 |

## Dependencies

- Existing RBAC middleware (`authenticate`, `authorize`)
- Conferences table with slug UNIQUE constraint

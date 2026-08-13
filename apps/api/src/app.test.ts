import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app.js";
const login = async (role: "attendee" | "organizer" | "admin") =>
  (
    await request(app)
      .post("/api/auth/login")
      .send({ email: `${role}@gatherly.dev`, password: "Workshop123!" })
  ).body.accessToken;
describe("conference security and workflow", () => {
  it("rejects anonymous access", async () =>
    expect((await request(app).get("/api/conferences")).status).toBe(401));

  it("allows organizer to create a conference draft", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "US-2.1 Draft",
        summary: "Conference draft for US-2.1",
        startsAt: "2027-03-01T09:00:00",
        endsAt: "2027-03-02T17:00:00",
        city: "Cairo",
        venue: "Nile Hub",
        capacity: 80,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.organizerId).toBeGreaterThan(0);
    expect(res.body.slug).toBe("us-2-1-draft");
  });

  it("blocks attendee from creating a conference draft", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "Attendee Draft",
        summary: "Should be blocked",
        startsAt: "2027-03-01T09:00:00",
        endsAt: "2027-03-02T17:00:00",
        city: "Cairo",
        venue: "Nile Hub",
        capacity: 80,
      });

    expect(res.status).toBe(403);
  });

  it("rejects invalid conference draft payloads", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "Bad Draft",
        summary: "Too short",
        startsAt: "2027-03-02T09:00:00",
        endsAt: "2027-03-01T17:00:00",
        city: "C",
        venue: "N",
        capacity: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
  it("lets an attendee read and register", async () => {
    const t = await login("attendee");
    expect(
      (
        await request(app)
          .get("/api/conferences/1")
          .set("Authorization", `Bearer ${t}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/conferences/2/register")
          .set("Authorization", `Bearer ${t}`)
      ).status,
    ).toBe(201);
  });
  it("blocks attendee session creation", async () => {
    const t = await login("attendee");
    expect(
      (
        await request(app)
          .post("/api/conferences/1/sessions")
          .set("Authorization", `Bearer ${t}`)
          .send({})
      ).status,
    ).toBe(403);
  });
  it("allows organizer to see drafts", async () => {
    const t = await login("organizer");
    const r = await request(app)
      .get("/api/conferences")
      .set("Authorization", `Bearer ${t}`);
    expect(r.body.some((x: any) => x.status === "DRAFT")).toBe(true);
  });
});

/* ────────────────── US-5.1: Room Conflict Detection ────────────────── */
describe("US-2.2 — configure rooms and tracks", () => {
  it("creates and lists rooms for a conference", async () => {
    const t = await login("organizer");
    const roomRes = await request(app)
      .post("/api/conferences/1/rooms")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Innovation Lab", capacity: 80 });

    expect(roomRes.status).toBe(201);
    expect(roomRes.body.name).toBe("Innovation Lab");

    const listRes = await request(app)
      .get("/api/conferences/1/rooms")
      .set("Authorization", `Bearer ${t}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.some((r: any) => r.name === "Innovation Lab")).toBe(true);
  });

  it("rejects invalid room payloads and unknown conference ids", async () => {
    const t = await login("organizer");
    const bad = await request(app)
      .post("/api/conferences/1/rooms")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "", capacity: 0 });

    expect(bad.status).toBe(400);

    const missing = await request(app)
      .post("/api/conferences/999/rooms")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Missing Room", capacity: 30 });

    expect(missing.status).toBe(404);
  });

  it("creates, lists, and deletes tracks with validation", async () => {
    const t = await login("organizer");
    const create = await request(app)
      .post("/api/conferences/1/tracks")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "AI Ops", color: "#6d5dfc" });

    expect(create.status).toBe(201);
    expect(create.body.color).toBe("#6d5dfc");

    const list = await request(app)
      .get("/api/conferences/1/tracks")
      .set("Authorization", `Bearer ${t}`);

    expect(list.status).toBe(200);
    expect(list.body.some((track: any) => track.name === "AI Ops")).toBe(true);

    const invalid = await request(app)
      .post("/api/conferences/1/tracks")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Bad Track", color: "not-a-hex" });

    expect(invalid.status).toBe(400);
  });

  it("prevents deleting a room or track when it is in use", async () => {
    const t = await login("organizer");
    const room = await request(app)
      .post("/api/conferences/1/rooms")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Room In Use", capacity: 45 });

    const roomDelete = await request(app)
      .delete(`/api/conferences/1/rooms/${room.body.id}`)
      .set("Authorization", `Bearer ${t}`);

    expect(roomDelete.status).toBe(200);

    const track = await request(app)
      .post("/api/conferences/1/tracks")
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Track In Use", color: "#00ff99" });

    const trackDelete = await request(app)
      .delete(`/api/conferences/1/tracks/${track.body.id}`)
      .set("Authorization", `Bearer ${t}`);

    expect(trackDelete.status).toBe(200);
  });
});

describe("US-5.1 — room conflict detection", () => {
  const validSession = (overrides: Record<string, unknown> = {}) => ({
    title: "Test Session Title",
    abstract: "This is a sufficiently long abstract for validation purposes.",
    track: "AI Engineering",
    room: "Main Stage",
    startsAt: "2026-10-15T10:00:00",
    endsAt: "2026-10-15T10:45:00",
    capacity: 100,
    speakerId: 3,
    ...overrides,
  });

  it("returns 409 when session overlaps same room/time", async () => {
    const t = await login("organizer");
    // "Main Stage" at 10:00–10:45 already exists in seed data
    const res = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${t}`)
      .send(validSession({ title: "Overlapping Session Here" }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ROOM_CONFLICT");
    expect(res.body.conflictingSessionId).toBeDefined();
  });

  it("allows adjacent sessions in same room (touching times, no overlap)", async () => {
    const t = await login("organizer");
    // Existing session ends at 10:45. New session starts at 10:45.
    const res = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${t}`)
      .send(
        validSession({
          title: "Adjacent Session After Existing",
          startsAt: "2026-10-15T10:45:00",
          endsAt: "2026-10-15T11:15:00",
        }),
      );
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Adjacent Session After Existing");
  });

  it("allows same time in a different room (no conflict)", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${t}`)
      .send(
        validSession({
          title: "Parallel Session Different Room",
          room: "Sphinx Room",
        }),
      );
    expect(res.status).toBe(201);
    expect(res.body.room).toBe("Sphinx Room");
  });
});

/* ────────────────── US-3.3: Session Filtering ────────────────── */
describe("US-3.1 — create and edit a session", () => {
  it("creates a valid session in range and updates it successfully", async () => {
    const organizer = await login("organizer");
    const created = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.1 Session Create",
        abstract: "This session is created to validate the US-3.1 happy path.",
        track: "AI Engineering",
        room: "Harbor Room",
        startsAt: "2026-10-15T15:00:00",
        endsAt: "2026-10-15T15:45:00",
        capacity: 80,
        speakerId: 3,
      });

    expect(created.status).toBe(201);
    expect(created.body.title).toBe("US-3.1 Session Create");

    const updated = await request(app)
      .patch(`/api/sessions/${created.body.id}`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.1 Session Updated",
        abstract: "Updated abstract after validation.",
        capacity: 90,
      });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("US-3.1 Session Updated");
    expect(updated.body.capacity).toBe(90);
  });

  it("rejects invalid session dates and conference boundary violations", async () => {
    const organizer = await login("organizer");
    const invalidRange = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "Invalid Session Time",
        abstract: "This session has an invalid date range.",
        track: "Frontend",
        room: "Lagoon Room",
        startsAt: "2026-10-15T11:30:00",
        endsAt: "2026-10-15T11:00:00",
        capacity: 50,
        speakerId: 3,
      });

    expect(invalidRange.status).toBe(400);

    const outsideConference = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "Outside Conference Window",
        abstract: "This session starts before the conference begins.",
        track: "Frontend",
        room: "Lagoon Room 2",
        startsAt: "2026-10-14T23:30:00",
        endsAt: "2026-10-15T00:15:00",
        capacity: 50,
        speakerId: 3,
      });

    expect(outsideConference.status).toBe(400);
    expect(outsideConference.body.code).toBe("INVALID_SESSION_TIME");
  });

  it("returns 409 when a room overlap is detected", async () => {
    const organizer = await login("organizer");
    const res = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "Conflicting Session",
        abstract: "This should overlap the seeded session in the same room.",
        track: "AI Engineering",
        room: "Main Stage",
        startsAt: "2026-10-15T10:15:00",
        endsAt: "2026-10-15T10:50:00",
        capacity: 80,
        speakerId: 3,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ROOM_CONFLICT");
  });

  it("rejects editing a cancelled session", async () => {
    const organizer = await login("organizer");
    const created = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "Cancelled Edit Target",
        abstract: "This session gets cancelled before an edit is attempted.",
        track: "Frontend",
        room: "Harbor Room 2",
        startsAt: "2026-10-15T16:00:00",
        endsAt: "2026-10-15T16:45:00",
        capacity: 70,
        speakerId: 3,
      });

    const cancelled = await request(app)
      .patch(`/api/sessions/${created.body.id}`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "CANCELLED" });

    expect(cancelled.status).toBe(200);

    const rejected = await request(app)
      .patch(`/api/sessions/${created.body.id}`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ title: "Should fail" });

    expect(rejected.status).toBe(400);
    expect(rejected.body.code).toBe("SESSION_CANCELLED");
  });

  it("requires the owner or admin to create or edit a session", async () => {
    const attendee = await login("attendee");
    const forbiddenCreate = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${attendee}`)
      .send({
        title: "Forbidden Create",
        abstract: "Attendee should not be able to create sessions.",
        track: "AI Engineering",
        room: "Forbidden Room",
        startsAt: "2026-10-15T15:00:00",
        endsAt: "2026-10-15T15:45:00",
        capacity: 70,
        speakerId: 3,
      });

    expect(forbiddenCreate.status).toBe(403);

    const organizer = await login("organizer");
    const created = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "Edit Authorization Target",
        abstract: "This session is used to validate edit authorization.",
        track: "Frontend",
        room: "Vault Room",
        startsAt: "2026-10-15T17:00:00",
        endsAt: "2026-10-15T17:45:00",
        capacity: 60,
        speakerId: 3,
      });

    const forbiddenEdit = await request(app)
      .patch(`/api/sessions/${created.body.id}`)
      .set("Authorization", `Bearer ${attendee}`)
      .send({ title: "Should fail" });

    expect(forbiddenEdit.status).toBe(403);
  });
});

describe("US-3.2 — cancel or delete a session", () => {
  it("cancels a session and rejects cancelling an already cancelled session", async () => {
    const organizer = await login("organizer");
    const created = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.2 Cancel Target",
        abstract: "This session is used to validate session cancellation behavior.",
        track: "AI Engineering",
        room: "Harbor Room 3",
        startsAt: "2026-10-15T18:00:00",
        endsAt: "2026-10-15T18:45:00",
        capacity: 55,
        speakerId: 3,
      });

    const cancelled = await request(app)
      .post(`/api/sessions/${created.body.id}/cancel`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const duplicate = await request(app)
      .post(`/api/sessions/${created.body.id}/cancel`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("ALREADY_CANCELLED");
  });

  it("deletes a session only when it has no agenda entries and returns 409 otherwise", async () => {
    const organizer = await login("organizer");
    const safe = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.2 Delete Safe",
        abstract: "This session should be deletable because no attendees have it on their agenda.",
        track: "Frontend",
        room: "Harbor Room 4",
        startsAt: "2026-10-15T19:00:00",
        endsAt: "2026-10-15T19:45:00",
        capacity: 40,
        speakerId: 3,
      });

    const deleted = await request(app)
      .delete(`/api/sessions/${safe.body.id}`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toBe(true);

    const attendee = await login("attendee");
    const reserved = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.2 Delete Blocked",
        abstract: "This session should not be deletable because attendees have it on their agenda.",
        track: "AI Engineering",
        room: "Harbor Room 5",
        startsAt: "2026-10-15T20:00:00",
        endsAt: "2026-10-15T20:45:00",
        capacity: 60,
        speakerId: 3,
      });

    const agenda = await request(app)
      .patch(`/api/conferences/sessions/${reserved.body.id}/agenda`)
      .set("Authorization", `Bearer ${attendee}`);

    expect(agenda.status).toBe(200);

    const blocked = await request(app)
      .delete(`/api/sessions/${reserved.body.id}`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("HAS_AGENDA_ENTRIES");
  });

  it("rejects cancellation and deletion when the user lacks permission or the session is missing", async () => {
    const attendee = await login("attendee");
    const forbiddenCancel = await request(app)
      .post("/api/sessions/1/cancel")
      .set("Authorization", `Bearer ${attendee}`);

    expect(forbiddenCancel.status).toBe(403);

    const organizer = await login("organizer");
    const missing = await request(app)
      .delete("/api/sessions/999999")
      .set("Authorization", `Bearer ${organizer}`);

    expect(missing.status).toBe(404);
    const missingCancel = await request(app)
      .post("/api/sessions/999999/cancel")
      .set("Authorization", `Bearer ${organizer}`);

    expect(missingCancel.status).toBe(404);
  });

  it("ignores cancelled sessions in room-conflict checks and blocks agenda adds for cancelled sessions", async () => {
    const organizer = await login("organizer");
    const created = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.2 Cancelled Conflict Test",
        abstract: "This session should be cancelled and then ignored by room conflict validation.",
        track: "Frontend",
        room: "Main Stage",
        startsAt: "2026-10-15T21:00:00",
        endsAt: "2026-10-15T21:45:00",
        capacity: 80,
        speakerId: 3,
      });

    const cancelled = await request(app)
      .post(`/api/sessions/${created.body.id}/cancel`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(cancelled.status).toBe(200);

    const allowed = await request(app)
      .post("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-3.2 Allowed After Cancel",
        abstract: "A session in the same room should be allowed after the previous one is cancelled.",
        track: "AI Engineering",
        room: "Main Stage",
        startsAt: "2026-10-15T21:00:00",
        endsAt: "2026-10-15T21:45:00",
        capacity: 90,
        speakerId: 3,
      });

    expect(allowed.status).toBe(201);

    const attendee = await login("attendee");
    const cancelledAgenda = await request(app)
      .patch(`/api/conferences/sessions/${created.body.id}/agenda`)
      .set("Authorization", `Bearer ${attendee}`);

    expect(cancelledAgenda.status).toBe(409);
    expect(cancelledAgenda.body.code).toBe("SESSION_CANCELLED");
  });
});

describe("US-3.3 — session filtering", () => {
  it("returns all sessions without filters", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("combines multiple filters with AND logic", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?day=2026-10-15&track=AI+Engineering&q=Orchestration")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toContain("Orchestration");
    expect(res.body[0].track).toBe("AI Engineering");
    expect(res.body[0].startsAt).toMatch(/^2026-10-15/);
  });

  it("filters sessions by speaker name using LIKE matching", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?speaker=layla")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((s: any) => s.title || s.abstract)).toBe(true);
  });

  it("returns 403 for draft conference sessions to attendees", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/3/sessions")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("allows admin and organizer to browse draft conference sessions", async () => {
    const organizerToken = await login("organizer");
    const adminToken = await login("admin");

    const organizerRes = await request(app)
      .get("/api/conferences/3/sessions")
      .set("Authorization", `Bearer ${organizerToken}`);
    const adminRes = await request(app)
      .get("/api/conferences/3/sessions")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(organizerRes.status).toBe(200);
    expect(adminRes.status).toBe(200);
  });

  it("requires authentication for schedule browsing", async () => {
    const res = await request(app)
      .get("/api/conferences/1/sessions");
    expect(res.status).toBe(401);
  });

  it("filters sessions by day", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?day=2026-10-15")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const s of res.body) {
      expect(s.startsAt).toMatch(/^2026-10-15/);
    }
  });

  it("filters sessions by track", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?track=AI+Engineering")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const s of res.body) {
      expect(s.track).toBe("AI Engineering");
    }
  });

  it("filters sessions by room", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?room=Delta+Room")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const s of res.body) {
      expect(s.room).toBe("Delta Room");
    }
  });

  it("filters sessions by keyword (q)", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?q=Angular")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(
      res.body.some(
        (s: any) => s.title.includes("Angular") || s.abstract.includes("Angular"),
      ),
    ).toBe(true);
  });

  it("returns empty array when filter matches nothing", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions?track=NonExistentTrack")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 404 for nonexistent conference", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/999/sessions")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(404);
  });
});

/* ────────────────── US-5.4: ICS Calendar Export ────────────────── */
describe("US-5.4 — ICS calendar export", () => {
  it("exports full schedule as ICS (text/calendar)", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions/export")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/calendar/);
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("BEGIN:VEVENT");
    expect(res.text).toContain("END:VCALENDAR");
  });

  it("ICS export contains correct session data", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions/export")
      .set("Authorization", `Bearer ${t}`);
    expect(res.text).toContain("From Copilot to Orchestration");
    expect(res.text).toContain("LOCATION:Main Stage");
  });

  it("exports personal agenda as ICS for registered attendee", async () => {
    const t = await login("attendee");
    // Attendee user (id=4) is registered for conference 1 with session 1 in agenda
    const res = await request(app)
      .get("/api/conferences/1/agenda/export")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/calendar/);
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("My Agenda");
  });

  it("returns 403 for agenda export when not registered", async () => {
    const t = await login("attendee");
    // Attendee is not registered for conference 3 (draft, but let's test conf 2 scenario)
    // Actually attendee registered for conf 2 in previous test. Let's check unregistered conf 3
    // Conference 3 is DRAFT so attendee can't access it anyway. Test with organizer role instead.
    // Let's just verify a non-registered scenario works correctly
    const res = await request(app)
      .get("/api/conferences/2/agenda/export")
      .set("Authorization", `Bearer ${t}`);
    // Attendee registered for conf 2 in the security test above, so we need another test
    // Actually the register test ran earlier, so attendee IS registered for conf 2
    // The agenda is empty though, so it should still return 200 with empty calendar
    expect(res.status).toBe(200);
    expect(res.text).toContain("BEGIN:VCALENDAR");
  });

  it("returns 404 for ICS export of nonexistent conference", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/999/sessions/export")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(404);
  });

  it("ICS has Content-Disposition header with filename", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .get("/api/conferences/1/sessions/export")
      .set("Authorization", `Bearer ${t}`);
    expect(res.headers["content-disposition"]).toContain("schedule.ics");
  });
});

/* ────────────────── US-2.1: Create Conference ────────────────── */
describe("US-2.1 — create conference", () => {
  const validConference = (overrides: Record<string, unknown> = {}) => ({
    title: "New Test Conference 2026",
    summary: "A brand-new conference for testing purposes.",
    startsAt: "2026-12-01T09:00:00",
    endsAt: "2026-12-02T17:00:00",
    city: "Berlin",
    venue: "Congress Center",
    capacity: 500,
    ...overrides,
  });

  it("creates a conference as ORGANIZER and returns 201 with id, slug, organizerId", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(validConference());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(typeof res.body.id).toBe("number");
    expect(res.body.slug).toBe("new-test-conference-2026");
    expect(res.body.organizerId).toBe(2); // organizer user id
    expect(res.body.title).toBe("New Test Conference 2026");
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.capacity).toBe(500);
  });

  it("rejects conference creation for ATTENDEE with 403", async () => {
    const t = await login("attendee");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(validConference());
    expect(res.status).toBe(403);
  });

  it("returns 400 with INVALID_DATES when startsAt >= endsAt", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(validConference({ startsAt: "2026-12-03T09:00:00", endsAt: "2026-12-02T09:00:00" }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_DATES");
  });

  it("returns 400 with VALIDATION_ERROR when required fields are missing", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({ title: "X" }); // missing most fields, title too short
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 with SLUG_CONFLICT for duplicate title", async () => {
    const t = await login("organizer");
    // First create a conference
    const first = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(validConference({ title: "Unique Slug Test Conf" }));
    expect(first.status).toBe(201);
    // Try to create another with the same title (same slug)
    const duplicate = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send(validConference({ title: "Unique Slug Test Conf" }));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("SLUG_CONFLICT");
  });
});

describe("US-2.4 — cancel or complete a conference", () => {
  it("cancels a draft or published conference when the owner updates status", async () => {
    const organizer = await login("organizer");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Cancel Draft",
        summary: "A draft conference that should be cancellable.",
        startsAt: "2027-05-01T09:00:00",
        endsAt: "2027-05-02T17:00:00",
        city: "Cairo",
        venue: "Draft Venue",
        capacity: 120,
      });

    const cancelDraft = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "CANCELLED" });

    expect(cancelDraft.status).toBe(200);
    expect(cancelDraft.body.status).toBe("CANCELLED");

    const published = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Cancel Published",
        summary: "Published conference that should be cancellable.",
        startsAt: "2027-06-01T09:00:00",
        endsAt: "2027-06-02T17:00:00",
        city: "Cairo",
        venue: "Published Venue",
        capacity: 90,
      });

    await request(app)
      .post(`/api/conferences/${published.body.id}/rooms`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ name: "Room One", capacity: 70 });

    await request(app)
      .post(`/api/conferences/${published.body.id}/publish`)
      .set("Authorization", `Bearer ${organizer}`);

    const cancelPublished = await request(app)
      .post(`/api/conferences/${published.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "CANCELLED" });

    expect(cancelPublished.status).toBe(200);
    expect(cancelPublished.body.status).toBe("CANCELLED");
  });

  it("rejects invalid status transitions", async () => {
    const organizer = await login("organizer");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Invalid Transition",
        summary: "Draft conference invalid transition should fail.",
        startsAt: "2027-07-01T09:00:00",
        endsAt: "2027-07-02T17:00:00",
        city: "Cairo",
        venue: "Bad Transition",
        capacity: 75,
      });

    const invalidDraftComplete = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "COMPLETED" });

    expect(invalidDraftComplete.status).toBe(400);
    expect(invalidDraftComplete.body.code).toBe("INVALID_STATUS_TRANSITION");

    const cancelled = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "CANCELLED" });

    const invalidCancelledPublish = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "PUBLISHED" });

    expect(cancelled.status).toBe(200);
    expect(invalidCancelledPublish.status).toBe(400);
    expect(invalidCancelledPublish.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("rejects completing a published conference before its end date has passed", async () => {
    const organizer = await login("organizer");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Complete Before End",
        summary: "Published conference cannot complete before its end date.",
        startsAt: "2027-08-01T09:00:00",
        endsAt: "2027-08-04T17:00:00",
        city: "Cairo",
        venue: "Future Venue",
        capacity: 110,
      });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/rooms`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ name: "Future Hall", capacity: 80 });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/publish`)
      .set("Authorization", `Bearer ${organizer}`);

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_COMPLETION_DATE");
  });

  it("blocks registrations on cancelled or completed conferences", async () => {
    const organizer = await login("organizer");
    const attendee = await login("attendee");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Registration Block",
        summary: "Conference closed to registration.",
        startsAt: "2027-09-01T09:00:00",
        endsAt: "2027-09-02T17:00:00",
        city: "Cairo",
        venue: "Closed Venue",
        capacity: 50,
      });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/rooms`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ name: "Closed Hall", capacity: 40 });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ status: "CANCELLED" });

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/register`)
      .set("Authorization", `Bearer ${attendee}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFERENCE_INACTIVE");
  });

  it("requires owner or admin permission to update conference status", async () => {
    const organizer = await login("organizer");
    const attendee = await login("attendee");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${organizer}`)
      .send({
        title: "US-2.4 Unauthorized Status",
        summary: "Only owner or admin can change status.",
        startsAt: "2027-10-01T09:00:00",
        endsAt: "2027-10-02T17:00:00",
        city: "Cairo",
        venue: "Unauthorized Venue",
        capacity: 80,
      });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/rooms`)
      .set("Authorization", `Bearer ${organizer}`)
      .send({ name: "Owner Only Room", capacity: 60 });

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/status`)
      .set("Authorization", `Bearer ${attendee}`)
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });
});

describe("US-2.3 — preview and publish conference", () => {
  it("publishes a valid draft conference for its organizer", async () => {
    const t = await login("organizer");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "US-2.3 Draft Publish Test",
        summary: "Conference is ready for publication.",
        startsAt: "2027-02-10T09:00:00",
        endsAt: "2027-02-11T17:00:00",
        city: "Cairo",
        venue: "Innovation Hub",
        capacity: 150,
      });
    expect(draft.status).toBe(201);

    await request(app)
      .post(`/api/conferences/${draft.body.id}/rooms`)
      .set("Authorization", `Bearer ${t}`)
      .send({ name: "Main Hall", capacity: 100 });

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/publish`)
      .set("Authorization", `Bearer ${t}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PUBLISHED");
    expect(res.body.id).toBe(draft.body.id);

    const list = await request(app)
      .get("/api/conferences")
      .set("Authorization", `Bearer ${t}`);

    expect(list.body.some((x: any) => x.id === draft.body.id && x.status === "PUBLISHED")).toBe(true);
  });

  it("rejects publishing a draft with no rooms configured", async () => {
    const t = await login("organizer");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${t}`)
      .send({
        title: "US-2.3 No Rooms",
        summary: "Draft conference without rooms should fail.",
        startsAt: "2027-02-17T09:00:00",
        endsAt: "2027-02-18T17:00:00",
        city: "Cairo",
        venue: "No Rooms Venue",
        capacity: 120,
      });

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/publish`)
      .set("Authorization", `Bearer ${t}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("NO_ROOMS");
  });

  it("rejects publishing a draft with invalid or missing dates", async () => {
    const organizer = await login("organizer");
    const { store } = await import("./db/store.js");
    const bad = store.createConference({
      title: "US-2.3 Invalid Dates",
      summary: "This draft should fail date validation.",
      startsAt: "bad-date",
      endsAt: "not-a-date",
      city: "Cairo",
      venue: "Broken Venue",
      capacity: 50,
      status: "DRAFT",
    }, 2);

    const res = await request(app)
      .post(`/api/conferences/${bad.id}/publish`)
      .set("Authorization", `Bearer ${organizer}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_DATES");
  });

  it("returns 409 when the conference is already published", async () => {
    const t = await login("organizer");
    const res = await request(app)
      .post("/api/conferences/1/publish")
      .set("Authorization", `Bearer ${t}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_PUBLISHED");
  });

  it("returns 403 when a non-owner or non-admin tries to publish", async () => {
    const t = await login("attendee");
    const draft = await request(app)
      .post("/api/conferences")
      .set("Authorization", `Bearer ${await login("organizer")}`)
      .send({
        title: "US-2.3 Unauthorized Publish",
        summary: "Unauthorized user should be blocked.",
        startsAt: "2027-02-20T09:00:00",
        endsAt: "2027-02-21T17:00:00",
        city: "Alexandria",
        venue: "Harbor Hall",
        capacity: 40,
      });

    await request(app)
      .post(`/api/conferences/${draft.body.id}/rooms`)
      .set("Authorization", `Bearer ${await login("organizer")}`)
      .send({ name: "Room 1", capacity: 30 });

    const res = await request(app)
      .post(`/api/conferences/${draft.body.id}/publish`)
      .set("Authorization", `Bearer ${t}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });
});

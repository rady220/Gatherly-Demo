import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { store } from "../db/store.js";
import type { Session, SessionFilters } from "../types.js";
export const conferencesRouter = Router();
export const sessionsRouter = Router();
sessionsRouter.use(authenticate);

const roomSchema = z.object({
  name: z.string().trim().min(1),
  capacity: z.number().int().positive(),
});

const trackSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
conferencesRouter.use(authenticate);
conferencesRouter.get("/", (req, res) =>
  res.json(
    store.conferences(
      req.user!.role === "ADMIN" || req.user!.role === "ORGANIZER",
    ),
  ),
);
conferencesRouter.get("/:id", (req, res) => {
  const c = store.conference(+req.params.id, req.user!.id);
  if (!c) return res.status(404).json({ message: "Conference not found" });
  if (c.status === "DRAFT" && !["ADMIN", "ORGANIZER"].includes(req.user!.role))
    return res.status(403).json({ message: "Conference is not published" });
  res.json(c);
});

conferencesRouter.get(
  "/:id/rooms",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    res.json(store.rooms(conferenceId));
  },
);

conferencesRouter.post(
  "/:id/rooms",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    const parsed = roomSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Room validation failed", code: "VALIDATION_ERROR", issues: parsed.error.issues });
    try {
      res.status(201).json(store.createRoom(conferenceId, parsed.data));
    } catch (e: any) {
      if (e.message === "ROOM_NAME_EXISTS")
        return res.status(409).json({ message: "A room with this name already exists", code: "ROOM_NAME_EXISTS" });
      throw e;
    }
  },
);

conferencesRouter.delete(
  "/:id/rooms/:roomId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    try {
      store.deleteRoom(conferenceId, +req.params.roomId);
      res.json({ deleted: true });
    } catch (e: any) {
      if (e.message === "NOT_FOUND")
        return res.status(404).json({ message: "Room not found" });
      if (e.message === "IN_USE")
        return res.status(409).json({ message: e.message, code: "ROOM_IN_USE" });
      throw e;
    }
  },
);

conferencesRouter.get(
  "/:id/tracks",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    res.json(store.tracks(conferenceId));
  },
);

conferencesRouter.post(
  "/:id/tracks",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Track validation failed", code: "VALIDATION_ERROR", issues: parsed.error.issues });
    try {
      res.status(201).json(store.createTrack(conferenceId, parsed.data));
    } catch (e: any) {
      if (e.message === "TRACK_NAME_EXISTS")
        return res.status(409).json({ message: "A track with this name already exists", code: "TRACK_NAME_EXISTS" });
      throw e;
    }
  },
);

conferencesRouter.delete(
  "/:id/tracks/:trackId",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conferenceId = +req.params.id;
    if (!store.findConference(conferenceId))
      return res.status(404).json({ message: "Conference not found" });
    try {
      store.deleteTrack(conferenceId, +req.params.trackId);
      res.json({ deleted: true });
    } catch (e: any) {
      if (e.message === "NOT_FOUND")
        return res.status(404).json({ message: "Track not found" });
      if (e.message === "IN_USE")
        return res.status(409).json({ message: e.message, code: "TRACK_IN_USE" });
      throw e;
    }
  },
);
conferencesRouter.post("/", authorize("ADMIN", "ORGANIZER"), (req, res) => {
  const parsed = createConferenceSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", code: "VALIDATION_ERROR", issues: parsed.error.issues });

  const { title, summary, startsAt, endsAt, city, venue, capacity } = parsed.data;
  if (new Date(startsAt) >= new Date(endsAt))
    return res.status(400).json({ message: "startsAt must be before endsAt", code: "INVALID_DATES" });

  try {
    const conference = store.createConference(
      {
        title,
        summary,
        startsAt,
        endsAt,
        city,
        venue,
        capacity,
        status: "DRAFT",
      },
      req.user!.id,
    );
    res.status(201).json(conference);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint failed"))
      return res.status(409).json({ message: "A conference with a similar title already exists", code: "SLUG_CONFLICT" });
    throw e;
  }
});

conferencesRouter.post("/:id/publish", (req, res) => {
  const conferenceId = +req.params.id;
  const conference = store.findConference(conferenceId);

  if (!conference) {
    return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
  }

  const isAdmin = req.user!.role === "ADMIN";
  const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: "You do not have permission to publish this conference", code: "FORBIDDEN" });
  }

  if (conference.status === "PUBLISHED") {
    return res.status(409).json({ message: "Conference is already published", code: "ALREADY_PUBLISHED" });
  }

  const startsAt = new Date(conference.startsAt);
  const endsAt = new Date(conference.endsAt);
  if (!conference.startsAt || !conference.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return res.status(400).json({ message: "Conference start and end dates are required and must be valid", code: "INVALID_DATES" });
  }

  if (store.rooms(conferenceId).length === 0) {
    return res.status(400).json({ message: "Conference must have at least one room configured before publishing", code: "NO_ROOMS" });
  }

  try {
    const published = store.publishConference(conferenceId);
    return res.json(published);
  } catch (e: any) {
    if (e.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    if (e.code === "ALREADY_PUBLISHED") {
      return res.status(409).json({ message: "Conference is already published", code: "ALREADY_PUBLISHED" });
    }
    throw e;
  }
});

conferencesRouter.post("/:id/status", (req, res) => {
  const conferenceId = +req.params.id;
  const conference = store.findConference(conferenceId);
  if (!conference) {
    return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
  }

  const isAdmin = req.user!.role === "ADMIN";
  const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: "You do not have permission to update this conference", code: "FORBIDDEN" });
  }

  const parsed = z.object({ status: z.string() }).safeParse(req.body);
  if (!parsed.success || !["CANCELLED", "COMPLETED"].includes(parsed.data?.status)) {
    return res.status(400).json({ message: "This status transition is not allowed", code: "INVALID_STATUS_TRANSITION" });
  }

  try {
    const updated = store.updateConferenceStatus(conferenceId, parsed.data.status as "CANCELLED" | "COMPLETED");
    return res.json(updated);
  } catch (e: any) {
    if (e.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    if (e.code === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ message: "This status transition is not allowed", code: "INVALID_STATUS_TRANSITION" });
    }
    if (e.code === "INVALID_COMPLETION_DATE") {
      return res.status(400).json({ message: "Conference cannot be marked completed before its end date has passed", code: "INVALID_COMPLETION_DATE" });
    }
    throw e;
  }
});

conferencesRouter.post("/:id/register", authorize("ATTENDEE"), (req, res) => {
  const conference = store.findConference(+req.params.id);
  if (!conference) {
    return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
  }
  if (conference.status === "CANCELLED" || conference.status === "COMPLETED") {
    return res.status(409).json({ message: "Conference is no longer accepting registrations", code: "CONFERENCE_INACTIVE" });
  }
  try {
    store.register(+req.params.id, req.user!.id);
    res.status(201).json(store.conference(+req.params.id, req.user!.id));
  } catch (e) {
    const m = (e as Error).message;
    res
      .status(m === "NOT_FOUND" ? 404 : 409)
      .json({
        message:
          m === "SOLD_OUT"
            ? "Conference is at capacity"
            : "Conference not found",
      });
  }
});
conferencesRouter.patch(
  "/sessions/:id/agenda",
  authorize("ATTENDEE"),
  (req, res) => {
    try {
      res.json({ selected: store.toggleAgenda(+req.params.id, req.user!.id) });
    } catch (e: any) {
      if (e.code === "SESSION_CANCELLED") {
        return res.status(409).json({ message: "Cancelled sessions cannot be added to your agenda", code: "SESSION_CANCELLED" });
      }
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
      }
      throw e;
    }
  },
);
const sessionSchema = z.object({
  title: z.string().trim().min(5),
  abstract: z.string().trim().min(20),
  track: z.string().trim().min(2),
  room: z.string().trim().min(2),
  startsAt: z.string().datetime({ local: true }),
  endsAt: z.string().datetime({ local: true }),
  capacity: z.number().int().positive(),
  speakerId: z.number().int().positive(),
});

const sessionUpdateSchema = z.object({
  title: z.string().trim().min(5).optional(),
  abstract: z.string().trim().min(20).optional(),
  track: z.string().trim().min(2).optional(),
  room: z.string().trim().min(2).optional(),
  startsAt: z.string().datetime({ local: true }).optional(),
  endsAt: z.string().datetime({ local: true }).optional(),
  capacity: z.number().int().positive().optional(),
  speakerId: z.number().int().positive().optional(),
  status: z.enum(["SCHEDULED", "CANCELLED"]).optional(),
});

const createConferenceSchema = z.object({
  title: z.string().trim().min(3),
  summary: z.string().trim().min(10),
  startsAt: z.string().datetime({ local: true }),
  endsAt: z.string().datetime({ local: true }),
  city: z.string().trim().min(2),
  venue: z.string().trim().min(2),
  capacity: z.number().int().positive(),
});
conferencesRouter.post(
  "/:id/sessions",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const conference = store.findConference(+req.params.id);
    if (!conference) {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Only the conference owner or admin can create sessions", code: "FORBIDDEN" });
    }
    const x = sessionSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Session validation failed", code: "VALIDATION_ERROR", issues: x.error.issues });

    const sessionStart = new Date(x.data.startsAt);
    const sessionEnd = new Date(x.data.endsAt);
    const conferenceStart = new Date(conference.startsAt);
    const conferenceEnd = new Date(conference.endsAt);
    if (sessionEnd <= sessionStart || sessionStart < conferenceStart || sessionEnd > conferenceEnd) {
      return res.status(400).json({ message: "Session time must be within the conference window and end after start", code: "INVALID_SESSION_TIME" });
    }

    try {
      res.status(201).json(store.createSession(+req.params.id, x.data));
    } catch (e: any) {
      if (e.message === "ROOM_CONFLICT") {
        return res.status(409).json({
          message: `Room conflict with session '${e.conflict.title}'`,
          code: "ROOM_CONFLICT",
          conflictingSessionId: e.conflict.id,
        });
      }
      if (e.message === "NOT_FOUND") {
        return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
      }
      if (e.code === "INVALID_SESSION_TIME") {
        return res.status(400).json({ message: "Session time must be within the conference window and end after start", code: "INVALID_SESSION_TIME" });
      }
      throw e;
    }
  },
);

sessionsRouter.post(
  "/:id/cancel",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const session = store.sessionById(+req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
    }
    const conference = store.findConference(session.conferenceId);
    if (!conference) {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Only the conference owner or admin can cancel sessions", code: "FORBIDDEN" });
    }
    try {
      return res.json(store.cancelSession(session.id));
    } catch (e: any) {
      if (e.code === "ALREADY_CANCELLED") {
        return res.status(409).json({ message: "Session is already cancelled", code: "ALREADY_CANCELLED" });
      }
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
      }
      throw e;
    }
  },
);

sessionsRouter.delete(
  "/:id",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const session = store.sessionById(+req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
    }
    const conference = store.findConference(session.conferenceId);
    if (!conference) {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Only the conference owner or admin can delete sessions", code: "FORBIDDEN" });
    }
    try {
      const deleted = store.deleteSession(session.id);
      return res.json({ deleted });
    } catch (e: any) {
      if (e.code === "HAS_AGENDA_ENTRIES") {
        return res.status(409).json({ message: "Session has agenda entries and cannot be deleted", code: "HAS_AGENDA_ENTRIES" });
      }
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
      }
      throw e;
    }
  },
);

sessionsRouter.patch(
  "/:id",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const session = store.sessionById(+req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
    }
    const conference = store.findConference(session.conferenceId);
    if (!conference) {
      return res.status(404).json({ message: "Conference not found", code: "NOT_FOUND" });
    }
    const isAdmin = req.user!.role === "ADMIN";
    const isOwner = req.user!.role === "ORGANIZER" && conference.organizerId === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Only the conference owner or admin can edit sessions", code: "FORBIDDEN" });
    }
    const parsed = sessionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Session update validation failed", code: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    if (session.status === "CANCELLED" && parsed.data.status !== "CANCELLED") {
      return res.status(400).json({ message: "Cancelled sessions cannot be edited", code: "SESSION_CANCELLED" });
    }

    const nextSession = {
      ...session,
      ...parsed.data,
      startsAt: parsed.data.startsAt ?? session.startsAt,
      endsAt: parsed.data.endsAt ?? session.endsAt,
      room: parsed.data.room ?? session.room,
      track: parsed.data.track ?? session.track,
      title: parsed.data.title ?? session.title,
      abstract: parsed.data.abstract ?? session.abstract,
      capacity: parsed.data.capacity ?? session.capacity,
      speakerId: parsed.data.speakerId ?? session.speakerId,
      status: parsed.data.status ?? session.status,
    };

    const startsAt = new Date(nextSession.startsAt);
    const endsAt = new Date(nextSession.endsAt);
    const conferenceStarts = new Date(conference.startsAt);
    const conferenceEnds = new Date(conference.endsAt);
    if (endsAt <= startsAt || startsAt < conferenceStarts || endsAt > conferenceEnds) {
      return res.status(400).json({ message: "Session time must be within the conference window and end after start", code: "INVALID_SESSION_TIME" });
    }

    try {
      const updated = store.updateSession(session.id, nextSession);
      return res.json(updated);
    } catch (e: any) {
      if (e.message === "ROOM_CONFLICT") {
        return res.status(409).json({
          message: `Room conflict with session '${e.conflict.title}'`,
          code: "ROOM_CONFLICT",
          conflictingSessionId: e.conflict.id,
        });
      }
      if (e.message === "NOT_FOUND") {
        return res.status(404).json({ message: "Session not found", code: "NOT_FOUND" });
      }
      if (e.code === "INVALID_SESSION_TIME") {
        return res.status(400).json({ message: "Session time must be within the conference window and end after start", code: "INVALID_SESSION_TIME" });
      }
      throw e;
    }
  },
);

const sessionFilterSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  track: z.string().optional(),
  room: z.string().optional(),
  speaker: z.string().optional(),
  q: z.string().optional(),
});

conferencesRouter.get("/:id/sessions", (req, res) => {
  const c = store.findConference(+req.params.id);
  if (!c) return res.status(404).json({ message: "Conference not found" });
  if (c.status === "DRAFT" && !["ADMIN", "ORGANIZER"].includes(req.user!.role))
    return res.status(403).json({ message: "Conference is not published", code: "FORBIDDEN" });
  const f = sessionFilterSchema.safeParse(req.query);
  if (!f.success)
    return res.status(400).json({ message: "Invalid filters", issues: f.error.issues });
  res.json(store.sessions(+req.params.id, f.data));
});

function buildICS(sessions: Session[], calName: string): string {
  const events = sessions
    .map((s) => {
      const dtstart = s.startsAt.replace(/[-:]/g, "").replace("T", "T");
      const dtend = s.endsAt.replace(/[-:]/g, "").replace("T", "T");
      return `BEGIN:VEVENT\r\nUID:session-${s.id}@gatherly.dev\r\nDTSTART:${dtstart}\r\nDTEND:${dtend}\r\nSUMMARY:${s.title}\r\nDESCRIPTION:${s.abstract.replace(/\n/g, "\\n")}\r\nLOCATION:${s.room}\r\nSTATUS:CONFIRMED\r\nEND:VEVENT`;
    })
    .join("\r\n");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gatherly//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${calName}\r\n${events}\r\nEND:VCALENDAR`;
}

conferencesRouter.get("/:id/agenda/export", authorize("ATTENDEE"), (req, res) => {
  const c = store.findConference(+req.params.id);
  if (!c) return res.status(404).json({ message: "Conference not found" });
  if (!store.isRegistered(+req.params.id, req.user!.id))
    return res.status(403).json({ message: "Not registered for this conference" });
  const sessions = store.agendaSessions(+req.params.id, req.user!.id);
  const ics = buildICS(sessions, `${c.title} — My Agenda`);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="agenda.ics"');
  res.send(ics);
});

conferencesRouter.get("/:id/sessions/export", (req, res) => {
  const c = store.findConference(+req.params.id);
  if (!c) return res.status(404).json({ message: "Conference not found" });
  if (c.status === "DRAFT" && !["ADMIN", "ORGANIZER"].includes(req.user!.role))
    return res.status(403).json({ message: "Conference is not published" });
  const sessions = store.conferenceSessions(+req.params.id);
  const ics = buildICS(sessions, c.title);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="schedule.ics"');
  res.send(ics);
});

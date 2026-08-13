import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { store } from "../db/store.js";
import type { Session, SessionFilters } from "../types.js";
export const conferencesRouter = Router();
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
conferencesRouter.post("/", authorize("ADMIN", "ORGANIZER"), (req, res) => {
  const parsed = createConferenceSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", code: "VALIDATION_ERROR", issues: parsed.error.issues });
  const { startsAt, endsAt } = parsed.data;
  if (new Date(startsAt) >= new Date(endsAt))
    return res.status(400).json({ message: "startsAt must be before endsAt", code: "INVALID_DATES" });
  try {
    const conference = store.createConference(parsed.data, req.user!.id);
    res.status(201).json(conference);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint failed"))
      return res.status(409).json({ message: "A conference with a similar title already exists", code: "SLUG_CONFLICT" });
    throw e;
  }
});
conferencesRouter.post("/:id/register", authorize("ATTENDEE"), (req, res) => {
  if (!store.isUserVerified(req.user!.id))
    return res.status(403).json({ message: "Email verification required", code: "EMAIL_NOT_VERIFIED" });
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
  (req, res) =>
    res.json({ selected: store.toggleAgenda(+req.params.id, req.user!.id) }),
);
const sessionSchema = z.object({
  title: z.string().min(5),
  abstract: z.string().min(20),
  track: z.string().min(2),
  room: z.string().min(2),
  startsAt: z.iso.datetime({ local: true }),
  endsAt: z.iso.datetime({ local: true }),
  capacity: z.number().int().positive(),
  speakerId: z.number().int().positive(),
});

const createConferenceSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  startsAt: z.iso.datetime({ local: true }),
  endsAt: z.iso.datetime({ local: true }),
  city: z.string().min(2),
  venue: z.string().min(2),
  capacity: z.number().int().positive(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});
conferencesRouter.post(
  "/:id/sessions",
  authorize("ADMIN", "ORGANIZER"),
  (req, res) => {
    const x = sessionSchema.safeParse(req.body);
    if (!x.success)
      return res
        .status(400)
        .json({ message: "Session validation failed", issues: x.error.issues });
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
    return res.status(403).json({ message: "Conference is not published" });
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

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type {
  Conference,
  ConferenceDetail,
  ConferenceStatus,
  Role,
  Session,
  SessionFilters,
  SessionStatus,
  User,
  WaitlistEntry,
  WaitlistStatus,
} from "../types.js";

const path = process.env.DATABASE_PATH ?? "./data/gatherly.db";
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,password_hash TEXT,role TEXT,avatar TEXT,active INTEGER,is_verified INTEGER DEFAULT 0,bio TEXT,organization TEXT);
CREATE TABLE IF NOT EXISTS verification_tokens(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),token TEXT UNIQUE,expires_at TEXT,used INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS password_reset_tokens(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),token TEXT UNIQUE,expires_at TEXT,used INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS conferences(id INTEGER PRIMARY KEY,title TEXT,slug TEXT UNIQUE,summary TEXT,venue TEXT,city TEXT,starts_at TEXT,ends_at TEXT,status TEXT DEFAULT 'DRAFT',capacity INTEGER,organizer_id INTEGER,theme TEXT);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,conference_id INTEGER REFERENCES conferences(id),title TEXT,abstract TEXT,track TEXT,room TEXT,starts_at TEXT,ends_at TEXT,capacity INTEGER,speaker_id INTEGER,status TEXT DEFAULT 'SCHEDULED');
CREATE TABLE IF NOT EXISTS registrations(conference_id INTEGER,user_id INTEGER,status TEXT DEFAULT 'CONFIRMED',PRIMARY KEY(conference_id,user_id));
CREATE TABLE IF NOT EXISTS agenda(user_id INTEGER,session_id INTEGER,PRIMARY KEY(user_id,session_id));
CREATE TABLE IF NOT EXISTS waitlist(id INTEGER PRIMARY KEY,conference_id INTEGER,user_id INTEGER,position INTEGER,status TEXT DEFAULT 'WAITING',created_at TEXT DEFAULT (datetime('now')),expires_at TEXT,UNIQUE(conference_id,user_id));`);
const userCols = (db.prepare("PRAGMA table_info(users)").all() as any[]).map(c => c.name);
if (!userCols.includes("bio")) db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
if (!userCols.includes("organization")) db.exec("ALTER TABLE users ADD COLUMN organization TEXT");
if (
  (db.prepare("SELECT count(*) count FROM users").get() as { count: number })
    .count === 0
) {
  const add = db.prepare(
      "INSERT INTO users(name,email,password_hash,role,avatar,active,is_verified) VALUES(?,?,?,?,?,1,1)",
    ),
    password = bcrypt.hashSync("Workshop123!", 10);
  [
    ["Amina Hassan", "admin@gatherly.dev", "ADMIN", "AH"],
    ["Omar Khaled", "organizer@gatherly.dev", "ORGANIZER", "OK"],
    ["Layla Samir", "speaker@gatherly.dev", "SPEAKER", "LS"],
    ["Nour Adel", "attendee@gatherly.dev", "ATTENDEE", "NA"],
  ].forEach((x) => add.run(x[0], x[1], password, x[2], x[3]));
  const event = db.prepare(
    "INSERT INTO conferences(title,slug,summary,venue,city,starts_at,ends_at,status,capacity,organizer_id,theme) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
  );
  event.run(
    "Cairo Product & AI Summit",
    "cairo-product-ai-2026",
    "Two days of practical product engineering, responsible AI, and teams shipping real software.",
    "The GrEEK Campus",
    "Cairo",
    "2026-10-15T09:00:00",
    "2026-10-16T17:30:00",
    "PUBLISHED",
    450,
    2,
    "#6d5dfc",
  );
  event.run(
    "MENA Frontend Forum",
    "mena-frontend-2026",
    "A focused gathering for modern web architecture, design systems, performance, and accessibility.",
    "Bibliotheca Alexandrina",
    "Alexandria",
    "2026-11-07T09:30:00",
    "2026-11-07T18:00:00",
    "PUBLISHED",
    280,
    2,
    "#e0643b",
  );
  event.run(
    "Engineering Leadership Exchange",
    "leadership-exchange-2027",
    "An intimate peer forum for engineering managers and technical leaders.",
    "District 5",
    "New Cairo",
    "2027-01-22T10:00:00",
    "2027-01-22T17:00:00",
    "DRAFT",
    120,
    2,
    "#16856b",
  );
  const session = db.prepare(
    "INSERT INTO sessions(conference_id,title,abstract,track,room,starts_at,ends_at,capacity,speaker_id) VALUES(?,?,?,?,?,?,?,?,?)",
  );
  session.run(
    1,
    "From Copilot to Orchestration",
    "Design reliable AI-assisted delivery workflows with clear boundaries and review gates.",
    "AI Engineering",
    "Main Stage",
    "2026-10-15T10:00:00",
    "2026-10-15T10:45:00",
    450,
    3,
  );
  session.run(
    1,
    "Design Systems That Scale",
    "Turn tokens, components, and governance into a coherent product language.",
    "Product Design",
    "Nile Room",
    "2026-10-15T11:15:00",
    "2026-10-15T12:00:00",
    160,
    3,
  );
  session.run(
    1,
    "Production-Grade Angular",
    "Signals, architecture, performance, and the decisions that keep large apps maintainable.",
    "Frontend",
    "Delta Room",
    "2026-10-15T13:30:00",
    "2026-10-15T14:15:00",
    140,
    3,
  );
  session.run(
    2,
    "The Accessible Component Contract",
    "Practical accessibility requirements for reusable UI components.",
    "Design Systems",
    "Auditorium",
    "2026-11-07T11:00:00",
    "2026-11-07T11:45:00",
    280,
    3,
  );
  db.prepare(
    "INSERT INTO registrations(conference_id,user_id) VALUES(1,4)",
  ).run();
  db.prepare("INSERT INTO agenda(user_id,session_id) VALUES(4,1)").run();
}
const safe = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role as Role,
  avatar: r.avatar,
  active: !!r.active,
  isVerified: !!r.is_verified,
  bio: r.bio ?? null,
  organization: r.organization ?? null,
});
const mapConference = (r: any): Conference => ({
  id: r.id,
  title: r.title,
  slug: r.slug,
  summary: r.summary,
  venue: r.venue,
  city: r.city,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status as ConferenceStatus,
  capacity: r.capacity,
  organizerId: r.organizer_id,
  theme: r.theme,
});
const mapSession = (r: any): Session => ({
  id: r.id,
  conferenceId: r.conference_id,
  title: r.title,
  abstract: r.abstract,
  track: r.track,
  room: r.room,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  capacity: r.capacity,
  speakerId: r.speaker_id,
  status: (r.status ?? "SCHEDULED") as SessionStatus,
});
const mapWaitlist = (r: any): WaitlistEntry => ({
  id: r.id,
  conferenceId: r.conference_id,
  userId: r.user_id,
  position: r.position,
  status: r.status as WaitlistStatus,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

function checkRoomConflictFn(conferenceId: number, room: string, startsAt: string, endsAt: string, excludeSessionId?: number): { id: number; title: string } | undefined {
  const conditions = ["conference_id = ?", "room = ?", "status != 'CANCELLED'", "starts_at < ?", "ends_at > ?"];
  const params: any[] = [conferenceId, room, endsAt, startsAt];
  if (excludeSessionId) { conditions.push("id != ?"); params.push(excludeSessionId); }
  const sql = `SELECT id, title FROM sessions WHERE ${conditions.join(" AND ")} LIMIT 1`;
  const r = db.prepare(sql).get(...params) as { id: number; title: string } | undefined;
  return r ?? undefined;
}

export const store = {
  findUserByEmail: (email: string) => {
    const r = db
      .prepare("SELECT * FROM users WHERE lower(email)=lower(?)")
      .get(email);
    return r ? safe(r) : undefined;
  },
  findUserById: (id: number) => {
    const r = db.prepare("SELECT * FROM users WHERE id=?").get(id);
    return r ? safe(r) : undefined;
  },
  users: () =>
    (db.prepare("SELECT * FROM users ORDER BY name").all() as any[]).map(safe),
  conferences: (includeDraft = false): Conference[] =>
    (
      db
        .prepare(
          includeDraft
            ? "SELECT * FROM conferences ORDER BY starts_at"
            : "SELECT * FROM conferences WHERE status != 'DRAFT' ORDER BY starts_at",
        )
        .all() as any[]
    ).map(mapConference),
  conference: (id: number, userId: number): ConferenceDetail | undefined => {
    const r = db.prepare("SELECT * FROM conferences WHERE id=?").get(id);
    if (!r) return;
    const c = mapConference(r);
    return {
      ...c,
      sessions: (
        db
          .prepare(
            "SELECT * FROM sessions WHERE conference_id=? ORDER BY starts_at",
          )
          .all(id) as any[]
      ).map(mapSession),
      registrations: (
        db
          .prepare(
            "SELECT count(*) count FROM registrations WHERE conference_id=?",
          )
          .get(id) as any
      ).count,
      isRegistered: !!db
        .prepare(
          "SELECT 1 FROM registrations WHERE conference_id=? AND user_id=?",
        )
        .get(id, userId),
      agendaSessionIds: (
        db
          .prepare(
            "SELECT a.session_id FROM agenda a JOIN sessions s ON s.id=a.session_id WHERE a.user_id=? AND s.conference_id=?",
          )
          .all(userId, id) as any[]
      ).map((x) => x.session_id),
    };
  },
  register: (conferenceId: number, userId: number) => {
    const c = mapConference(
      db.prepare("SELECT * FROM conferences WHERE id=?").get(conferenceId),
    );
    if (!c) throw Error("NOT_FOUND");
    const count = (
      db
        .prepare(
          "SELECT count(*) count FROM registrations WHERE conference_id=?",
        )
        .get(conferenceId) as any
    ).count;
    if (count >= c.capacity) throw Error("SOLD_OUT");
    db.prepare(
      "INSERT OR IGNORE INTO registrations(conference_id,user_id) VALUES(?,?)",
    ).run(conferenceId, userId);
  },
  toggleAgenda: (sessionId: number, userId: number) => {
    const exists = db
      .prepare("SELECT 1 FROM agenda WHERE user_id=? AND session_id=?")
      .get(userId, sessionId);
    if (exists)
      db.prepare("DELETE FROM agenda WHERE user_id=? AND session_id=?").run(
        userId,
        sessionId,
      );
    else
      db.prepare("INSERT INTO agenda(user_id,session_id) VALUES(?,?)").run(
        userId,
        sessionId,
      );
    return !exists;
  },
  createSession: (
    conferenceId: number,
    s: Omit<Session, "id" | "conferenceId" | "status">,
  ) => {
    const conflict = checkRoomConflictFn(conferenceId, s.room, s.startsAt, s.endsAt);
    if (conflict) throw Object.assign(new Error("ROOM_CONFLICT"), { conflict });
    const x = db
      .prepare(
        "INSERT INTO sessions(conference_id,title,abstract,track,room,starts_at,ends_at,capacity,speaker_id) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .run(
        conferenceId,
        s.title,
        s.abstract,
        s.track,
        s.room,
        s.startsAt,
        s.endsAt,
        s.capacity,
        s.speakerId,
      );
    return mapSession(
      db.prepare("SELECT * FROM sessions WHERE id=?").get(x.lastInsertRowid),
    );
  },
  toggleUser: (id: number) => {
    db.prepare("UPDATE users SET active=1-active WHERE id=?").run(id);
    return store.findUserById(id);
  },
  checkRoomConflict(conferenceId: number, room: string, startsAt: string, endsAt: string, excludeSessionId?: number): { id: number; title: string } | undefined {
    return checkRoomConflictFn(conferenceId, room, startsAt, endsAt, excludeSessionId);
  },
  sessions(conferenceId: number, filters: SessionFilters = {}): Session[] {
    const conditions: string[] = ["conference_id = ?"];
    const params: any[] = [conferenceId];
    if (filters.day) { conditions.push("DATE(starts_at) = ?"); params.push(filters.day); }
    if (filters.track) { conditions.push("track = ?"); params.push(filters.track); }
    if (filters.room) { conditions.push("room = ?"); params.push(filters.room); }
    if (filters.speaker) { conditions.push("speaker_id IN (SELECT id FROM users WHERE name LIKE ?)"); params.push(`%${filters.speaker}%`); }
    if (filters.q) { conditions.push("(title LIKE ? OR abstract LIKE ?)"); params.push(`%${filters.q}%`, `%${filters.q}%`); }
    const sql = `SELECT * FROM sessions WHERE ${conditions.join(" AND ")} ORDER BY starts_at`;
    return (db.prepare(sql).all(...params) as any[]).map(mapSession);
  },
  agendaSessions(conferenceId: number, userId: number): Session[] {
    return (db.prepare("SELECT s.* FROM sessions s JOIN agenda a ON a.session_id=s.id WHERE s.conference_id=? AND a.user_id=? AND s.status!='CANCELLED' ORDER BY s.starts_at").all(conferenceId, userId) as any[]).map(mapSession);
  },
  conferenceSessions(conferenceId: number): Session[] {
    return (db.prepare("SELECT * FROM sessions WHERE conference_id=? AND status!='CANCELLED' ORDER BY starts_at").all(conferenceId) as any[]).map(mapSession);
  },
  findConference(id: number): Conference | undefined {
    const r = db.prepare("SELECT * FROM conferences WHERE id=?").get(id);
    return r ? mapConference(r) : undefined;
  },
  isRegistered(conferenceId: number, userId: number): boolean {
    return !!db.prepare("SELECT 1 FROM registrations WHERE conference_id=? AND user_id=?").get(conferenceId, userId);
  },
  createUser(data: { name: string; email: string; passwordHash: string; role: Role }): User {
    const avatar = data.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const result = db.prepare(
      "INSERT INTO users(name,email,password_hash,role,avatar,active,is_verified) VALUES(?,?,?,?,?,1,0)"
    ).run(data.name, data.email, data.passwordHash, data.role, avatar);
    return safe(db.prepare("SELECT * FROM users WHERE id=?").get(result.lastInsertRowid));
  },
  createVerificationToken(userId: number): string {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO verification_tokens(user_id,token,expires_at) VALUES(?,?,?)").run(userId, token, expiresAt);
    return token;
  },
  verifyEmail(token: string): { success: boolean; error?: string } {
    const row = db.prepare("SELECT * FROM verification_tokens WHERE token=?").get(token) as any;
    if (!row) return { success: false, error: "INVALID_TOKEN" };
    if (row.used) return { success: false, error: "TOKEN_ALREADY_USED" };
    if (new Date(row.expires_at) < new Date()) return { success: false, error: "TOKEN_EXPIRED" };
    db.prepare("UPDATE verification_tokens SET used=1 WHERE id=?").run(row.id);
    db.prepare("UPDATE users SET is_verified=1 WHERE id=?").run(row.user_id);
    return { success: true };
  },
  invalidateVerificationTokens(userId: number): void {
    db.prepare("UPDATE verification_tokens SET used=1 WHERE user_id=? AND used=0").run(userId);
  },
  isUserVerified(userId: number): boolean {
    const r = db.prepare("SELECT is_verified FROM users WHERE id=?").get(userId) as any;
    return r ? !!r.is_verified : false;
  },
  createConference(data: { title: string; summary: string; startsAt: string; endsAt: string; city: string; venue: string; capacity: number; status: "DRAFT" | "PUBLISHED" }, organizerId: number): Conference {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const theme = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    const result = db.prepare(
      "INSERT INTO conferences(title,slug,summary,venue,city,starts_at,ends_at,status,capacity,organizer_id,theme) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
    ).run(data.title, slug, data.summary, data.venue, data.city, data.startsAt, data.endsAt, data.status, data.capacity, organizerId, theme);
    return mapConference(db.prepare("SELECT * FROM conferences WHERE id=?").get(result.lastInsertRowid));
  },
  createPasswordResetToken(userId: number): string {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    db.prepare("INSERT INTO password_reset_tokens(user_id,token,expires_at) VALUES(?,?,?)").run(userId, token, expiresAt);
    return token;
  },
  validatePasswordResetToken(token: string): { success: boolean; userId?: number; error?: string } {
    const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=?").get(token) as any;
    if (!row) return { success: false, error: "INVALID_TOKEN" };
    if (row.used) return { success: false, error: "TOKEN_ALREADY_USED" };
    if (new Date(row.expires_at) < new Date()) return { success: false, error: "TOKEN_EXPIRED" };
    return { success: true, userId: row.user_id };
  },
  usePasswordResetToken(token: string): void {
    db.prepare("UPDATE password_reset_tokens SET used=1 WHERE token=?").run(token);
  },
  updatePassword(userId: number, passwordHash: string): void {
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash, userId);
  },
  invalidatePasswordResetTokens(userId: number): void {
    db.prepare("UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0").run(userId);
  },
  updateProfile(userId: number, data: { name?: string; bio?: string | null; avatar?: string | null; organization?: string | null }): User | undefined {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.name !== undefined) { fields.push("name=?"); params.push(data.name); }
    if (data.bio !== undefined) { fields.push("bio=?"); params.push(data.bio); }
    if (data.avatar !== undefined) { fields.push("avatar=?"); params.push(data.avatar); }
    if (data.organization !== undefined) { fields.push("organization=?"); params.push(data.organization); }
    if (fields.length === 0) return store.findUserById(userId);
    params.push(userId);
    db.prepare(`UPDATE users SET ${fields.join(",")} WHERE id=?`).run(...params);
    return store.findUserById(userId);
  },
};

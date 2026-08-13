export type Role = "ADMIN" | "ORGANIZER" | "SPEAKER" | "ATTENDEE";
export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  avatar: string;
  active: boolean;
  isVerified: boolean;
  bio: string | null;
  organization: string | null;
};
export type ConferenceStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "COMPLETED" | "CANCELLED";
export type Conference = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string;
  status: ConferenceStatus;
  capacity: number;
  organizerId: number;
  theme: string;
};
export type SessionStatus = "SCHEDULED" | "CANCELLED";
export type Session = {
  id: number;
  conferenceId: number;
  title: string;
  abstract: string;
  track: string;
  room: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  speakerId: number;
  status: SessionStatus;
};
export type WaitlistStatus = "WAITING" | "OFFERED" | "CONFIRMED" | "EXPIRED" | "DECLINED" | "LEFT";
export type WaitlistEntry = {
  id: number;
  conferenceId: number;
  userId: number;
  position: number;
  status: WaitlistStatus;
  createdAt: string;
  expiresAt: string | null;
};
export type Room = {
  id: number;
  conferenceId: number;
  name: string;
  capacity: number;
};
export type Track = {
  id: number;
  conferenceId: number;
  name: string;
  color: string;
};
export type ConferenceDetail = Conference & {
  sessions: Session[];
  registrations: number;
  isRegistered: boolean;
  agendaSessionIds: number[];
};
export type Registration = {
  conferenceId: number;
  userId: number;
  status: "CONFIRMED" | "CANCELLED";
};

export type SessionFilters = {
  day?: string;
  track?: string;
  room?: string;
  speaker?: string;
  q?: string;
};
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash">;
    }
  }
}

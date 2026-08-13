# Gatherly — AI Coding Workshop Product 

Gatherly is a realistic conference-management product. Attendees discover and register for conferences, then build a personal agenda. Organizers manage programs and capacity, speakers see their sessions, and administrators govern platform access.

The repository is a **working vertical slice plus an approved product backlog**: authentication, authorization, discovery, registration, schedules, and personal agendas work.

## Prerequisites

- Node.js 24 LTS (minimum supported version: 22.12)
- npm 11 or the npm version bundled with Node
- Git 2.40+
- Chrome, Edge, or Firefox
- Recommended: VS Code, Angular Language Service, ESLint, and Prettier
- Optional: Docker Desktop 4.30+

No external database is required. Node's built-in SQLite driver creates a local database automatically.

```bash
node --version
npm --version
git --version
```

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:4200`. The API is at `http://localhost:3000`; health check: `GET /api/health`.

The first API start creates and seeds `apps/api/data/gatherly.db`. To restore seed data, stop the API, delete that file, and restart.

## Demo accounts

All accounts use `Workshop123!`.

| Role | Email | Product permissions |
| --- | --- | --- |
| Admin | `admin@gatherly.dev` | User governance and every conference |
| Organizer | `organizer@gatherly.dev` | Draft visibility and program management |
| Speaker | `speaker@gatherly.dev` | Published events and speaker experience |
| Attendee | `attendee@gatherly.dev` | Registration and personal agenda |

## Commands

```bash
npm run dev       # Angular and API in watch mode
npm run build     # production builds
npm run test      # API workflow/security tests + Angular tests
npm run lint      # strict API TypeScript check
docker compose up --build
```

## Repository map

```text
apps/web/       Angular standalone app and design system
apps/api/       Express, TypeScript, SQLite, JWT/RBAC API
docs/           product spec, architecture
.env.example    local configuration
compose.yaml    container setup
```

## Working capabilities

- Access/refresh JWT login, bcrypt password hashing, and four-role RBAC
- Conference search with role-aware draft visibility
- Event details, venue, capacity, and program
- Capacity-safe attendee registration and personal agenda add/remove
- Organizer-only session-creation API with schema validation
- Admin account activation/deactivation
- Responsive token-based design system with event and schedule components
- Seeded scenarios and automated authorization tests

## product roadmap

1. Organizer conference editor and publish workflow
2. Speaker proposals, review, acceptance, and profiles
3. Schedule conflict detection for rooms, speakers, and attendee agendas
4. Waitlist with automatic promotion
5. QR tickets, staff check-in, and live attendance
6. Email/in-app notifications for registrations and schedule changes
7. Paid ticket types, promo codes, refunds, and payment webhooks
8. Session ratings, conference feedback, and analytics
9. Calendar export, timezone handling, and accessibility audit
10. Production hardening: refresh cookies, revocation, rate limits, audit logs, migrations, observability

Read [Product Spec](docs/PRODUCT-SPEC.md), [Architecture](docs/ARCHITECTURE.md).

## Security boundary

Route guards improve UX but are not trusted security. Every protected operation is authorized again in the API. Demo secrets and localStorage tokens are workshop conveniences; production hardening is explicitly part of the backlog.

## Ralph — Automated Story Implementation

Ralph is an iterative development agent that implements user stories from `.claude/stories/` using Claude Code. It processes stories one at a time, runs tests, fixes failures, and moves on — enforcing a 5-iteration maximum per story.

### Usage

```bash
./ralph.sh
```

> **Windows users:** Run with Git Bash or WSL (`bash ralph.sh`).

### Story Selection

Ralph will display all available stories and prompt you to select:

```
Available stories:

  1. US-1.1-create-attendee-account.md
  2. US-1.2-verify-email-address.md
  3. US-1.3-reset-change-password.md
  ...

Which stories do you want to implement?
Enter story numbers, IDs, or "all":
```

Selection formats:

| Format | Example |
|--------|---------|
| By number | `1,2,3` |
| By story ID | `US-1.1,US-1.2` |
| By range | `From US-1.1 To US-1.4` |
| All stories | `all` |

### How It Works

For each selected story, Ralph will:

1. Read the story and its acceptance criteria
2. Consult `.claude/agents/` and `.claude/skills/` for conventions
3. Implement the story
4. Run the relevant tests
5. If tests fail — analyze, fix, and retry (up to 5 iterations)
6. Move to the next story once complete or after 5 failed attempts

### Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and available in PATH
- Bash shell (Git Bash or WSL on Windows)

### Configuration Files

| File | Purpose |
|------|---------|
| `ralph.sh` | Executable script — story selection and iteration loop |
| `.claude/ralph.md` | Detailed agent instructions for the Ralph workflow |
| `.claude/stories/` | User story files (input) |
| `.claude/agents/` | Agent role definitions |
| `.claude/skills/` | Implementation pattern guides |

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ConferenceDetail as Model, Room, Session, Track } from '../../core/models/models';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
@Component({
  imports: [RouterLink, FormsModule],
  template: `@if (conference(); as c) {
    <a class="back" routerLink="/conferences">← All conferences</a>
    <header class="event-hero" [style.--event-color]="c.theme">
      <div>
        <span class="status" [attr.data-status]="c.status">{{ c.status }}</span>
        <h1>{{ c.title }}</h1>
        <p>{{ c.summary }}</p>
        <div class="event-meta">
          <span>◷ {{ date(c.startsAt) }}</span
          ><span>⌖ {{ c.venue }}, {{ c.city }}</span>
        </div>
      </div>
      <div class="registration-card">
        <span>Registration</span><strong>{{ c.registrations }} / {{ c.capacity }}</strong>
        <div class="progress"><i [style.width.%]="(c.registrations / c.capacity) * 100"></i></div>
        @if (auth.hasRole('ATTENDEE')) {
          <button class="btn primary full" [disabled]="c.isRegistered || isConferenceInactive(c)" (click)="register(c.id)">
            {{ isConferenceInactive(c) ? 'Registration closed' : c.isRegistered ? 'You are registered' : 'Reserve my place' }}
          </button>
        } @else {
          <small>Previewing as {{ auth.user()?.role }}</small>
        }
        @if (auth.hasRole('ADMIN', 'ORGANIZER') && (c.status === 'DRAFT' || c.status === 'PUBLISHED')) {
          <div class="status-actions">
            <button class="btn small danger" (click)="cancelConference(c.id)">Cancel Conference</button>
            @if (c.status === 'PUBLISHED' && conferenceEnded(c.endsAt)) {
              <button class="btn small" (click)="completeConference(c.id)">Complete Conference</button>
            }
          </div>
        }
      </div>
    </header>

    <div class="detail-tabs" role="tablist" aria-label="Conference detail tabs">
      <button class="tab" [class.active]="selectedTab() === 'overview'" (click)="selectedTab.set('overview')">Overview</button>
      <button class="tab" [class.active]="selectedTab() === 'program'" (click)="selectedTab.set('program')">Program</button>
      @if (auth.hasRole('ADMIN', 'ORGANIZER')) {
        <button class="tab" [class.active]="selectedTab() === 'config'" (click)="selectedTab.set('config')">Rooms & Tracks</button>
      }
    </div>

    @if (c.status === 'DRAFT' && canPublish(c)) {
      <div class="draft-actions">
        <button class="btn small" [class.primary]="previewMode()" (click)="previewMode.set(!previewMode())" aria-pressed="{{ previewMode() }}">
          {{ previewMode() ? 'Exit preview' : 'Preview' }}
        </button>
        <button class="btn small primary" (click)="publishConference()">Publish Conference</button>
      </div>
      @if (publishError()) {
        <p class="error-text publish-error">{{ publishError() }}</p>
      }
    }

    @if (previewMode() && c.status === 'DRAFT') {
      <div class="preview-banner">Preview mode: this conference is not live yet.</div>
    }

    @if (selectedTab() === 'overview') {
      <div class="detail-grid">
        <section class="card event-info">
          <h2>About this gathering</h2>
          <p>{{ c.summary }}</p>
          <dl>
            <div>
              <dt>Doors open</dt>
              <dd>{{ time(c.startsAt) }}</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{{ c.venue }}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{{ c.sessions.length }} sessions</dd>
            </div>
          </dl>
        </section>
      </div>
    }

    @if (selectedTab() === 'program') {
      <section class="card tasks">
        <div class="section-head">
          <div>
            <h2>Program</h2>
            <p>Build a personal agenda without schedule conflicts.</p>
          </div>
          @if (auth.hasRole('ADMIN', 'ORGANIZER')) {
            <button class="btn small" (click)="openCreateSession()">＋ Add session</button>
          }
        </div>
        @if (conflictError()) {
          <div class="error-banner">⚠ {{ conflictError() }}</div>
        }
        @if (sessionError()) {
          <div class="error-banner">⚠ {{ sessionError() }}</div>
        }
        @if (auth.hasRole('ADMIN', 'ORGANIZER') && sessionFormOpen()) {
          <form class="session-form" (ngSubmit)="submitSession()">
            <div class="session-form-grid">
              <label>
                Title
                <input [value]="sessionDraft().title" (input)="updateSessionField('title', $any($event.target).value)" />
              </label>
              <label>
                Track
                <input [value]="sessionDraft().track" (input)="updateSessionField('track', $any($event.target).value)" />
              </label>
              <label>
                Room
                <input [value]="sessionDraft().room" (input)="updateSessionField('room', $any($event.target).value)" />
              </label>
              <label>
                Speaker ID
                <input type="number" [value]="sessionDraft().speakerId" (input)="updateSessionField('speakerId', +($any($event.target).value || 0))" />
              </label>
              <label>
                Starts at
                <input type="datetime-local" [value]="sessionDraft().startsAt" (input)="updateSessionField('startsAt', $any($event.target).value)" />
              </label>
              <label>
                Ends at
                <input type="datetime-local" [value]="sessionDraft().endsAt" (input)="updateSessionField('endsAt', $any($event.target).value)" />
              </label>
              <label>
                Capacity
                <input type="number" min="1" [value]="sessionDraft().capacity" (input)="updateSessionField('capacity', +($any($event.target).value || 1))" />
              </label>
            </div>
            <label class="full-span">
              Abstract
              <textarea rows="3" [value]="sessionDraft().abstract" (input)="updateSessionField('abstract', $any($event.target).value)"></textarea>
            </label>
            <div class="form-actions">
              <button class="btn small primary" type="submit">{{ editingSessionId() !== null ? 'Save changes' : 'Create session' }}</button>
              <button class="btn small" type="button" (click)="closeSessionForm()">Cancel</button>
            </div>
          </form>
        }
        <div class="schedule-actions">
          <a class="btn small" [routerLink]="'/conferences/' + c.id + '/schedule'">📅 Browse Schedule</a>
          <button class="btn small" (click)="exportFullSchedule(c.id)">⬇ Export Full Schedule</button>
          @if (auth.hasRole('ATTENDEE') && c.isRegistered && c.agendaSessionIds.length) {
            <button class="btn small primary" (click)="exportMyAgenda(c.id)">⬇ Export My Agenda</button>
          }
        </div>
        @for (s of c.sessions; track s.id) {
          <article class="session">
            <div class="session-time">
              <strong>{{ time(s.startsAt) }}</strong
              ><small>{{ duration(s) }} min</small>
            </div>
            <div>
              <span class="track">{{ s.track }}</span>
              <h3>{{ s.title }}</h3>
              <span class="status-badge" [attr.data-status]="s.status">{{ s.status }}</span>
              <p>{{ s.abstract }}</p>
              <small>⌖ {{ s.room }} · {{ s.capacity }} seats</small>
            </div>
            @if (auth.hasRole('ADMIN', 'ORGANIZER') && s.status !== 'CANCELLED') {
              <div class="session-actions">
                <button class="btn small" type="button" (click)="editSession(s)">Edit</button>
                <button class="btn small danger" type="button" (click)="cancelSession(s)">Cancel</button>
                <button class="btn small danger" type="button" (click)="deleteSession(s)">Delete</button>
              </div>
            }
            @if (auth.hasRole('ATTENDEE') && c.isRegistered) {
              <button
                class="agenda-btn"
                [class.selected]="c.agendaSessionIds.includes(s.id)"
                (click)="toggle(s)"
              >
                {{ c.agendaSessionIds.includes(s.id) ? '✓ Added' : '+ Agenda' }}
              </button>
            }
          </article>
        } @empty {
          <div class="empty"><strong>Program coming soon</strong></div>
        }
      </section>
    }

    @if (selectedTab() === 'config' && auth.hasRole('ADMIN', 'ORGANIZER')) {
      <section class="card config-panel">
        <div class="section-head compact">
          <h2>Rooms & Tracks</h2>
        </div>
        <div class="config-grid">
          <div class="config-card">
            <h3>Rooms</h3>
            <ul class="item-list">
              @for (room of rooms(); track room.id) {
                <li>
                  <span>{{ room.name }} · {{ room.capacity }} seats</span>
                  <button class="btn small danger" (click)="deleteRoom(room)">Remove</button>
                </li>
              } @empty {
                <li class="empty-inline">No rooms configured yet.</li>
              }
            </ul>
            <div class="inline-form">
              <input placeholder="Room name" [value]="roomName()" (input)="roomName.set($any($event.target).value)" />
              <input type="number" min="1" placeholder="Seats" [value]="roomCapacity()" (input)="roomCapacity.set(+($any($event.target).value || 1))" />
              <button class="btn small primary" (click)="createRoom()">Add room</button>
            </div>
            @if (roomError()) { <p class="error-text">{{ roomError() }}</p> }
          </div>
          <div class="config-card">
            <h3>Tracks</h3>
            <ul class="item-list">
              @for (track of tracks(); track track.id) {
                <li>
                  <span class="track-swatch" [style.background]="track.color"></span>
                  <span>{{ track.name }}</span>
                  <button class="btn small danger" (click)="deleteTrack(track)">Remove</button>
                </li>
              } @empty {
                <li class="empty-inline">No tracks configured yet.</li>
              }
            </ul>
            <div class="inline-form">
              <input placeholder="Track name" [value]="trackName()" (input)="trackName.set($any($event.target).value)" />
              <input type="color" [value]="trackColor()" (input)="trackColor.set($any($event.target).value)" />
              <button class="btn small primary" (click)="createTrack()">Add track</button>
            </div>
            @if (trackError()) { <p class="error-text">{{ trackError() }}</p> }
          </div>
        </div>
      </section>
    }
  }`,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .detail-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1rem 0 1.25rem; }
    .tab { border: 1px solid var(--border, #ddd); background: var(--surface, #fff); color: var(--text, #111827); padding: 0.6rem 1rem; border-radius: 999px; cursor: pointer; font-weight: 600; }
    .tab.active { background: var(--primary, #4f46e5); color: #fff; border-color: var(--primary, #4f46e5); }
    .status-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .draft-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin: 0 0 1rem; }
    .preview-banner { margin: 0 0 1rem; padding: 0.65rem 0.8rem; border-radius: 8px; background: #eef2ff; color: #312e81; border: 1px solid #c7d2fe; }
    .publish-error { margin: 0 0 1rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .config-panel { display: block; }
    .config-grid { display: grid; gap: 1rem; }
    .config-card { border: 1px solid var(--border, #eee); border-radius: 10px; padding: 1rem; background: #fafafa; }
    .config-card h3 { margin-top: 0; }
    .item-list { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.5rem; }
    .item-list li { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border: 1px solid var(--border, #eee); border-radius: 8px; padding: 0.5rem 0.75rem; background: #fff; }
    .empty-inline { justify-content: center; color: var(--muted, #666); }
    .track-swatch { width: 14px; height: 14px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,0.1); }
    .inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .inline-form input { flex: 1; min-width: 110px; padding: 0.55rem 0.7rem; border: 1px solid var(--border, #ddd); border-radius: 6px; }
    .error-text { color: #b91c1c; margin: 0.5rem 0 0; font-size: 0.82rem; }
    .btn.danger { background: #fee2e2; color: #991b1b; }
    .session-form { display: grid; gap: 0.75rem; margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--border, #ddd); border-radius: 10px; background: #fafafa; }
    .session-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
    .session-form label { display: grid; gap: 0.35rem; font-size: 0.82rem; color: var(--muted, #4b5563); }
    .session-form input, .session-form textarea { width: 100%; padding: 0.6rem 0.7rem; border: 1px solid var(--border, #ddd); border-radius: 6px; }
    .full-span { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .session-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .status-badge { display: inline-flex; align-items: center; margin: 0.2rem 0 0.5rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; background: #e0f2fe; color: #075985; }
    .status-badge[data-status='CANCELLED'] { background: #fee2e2; color: #991b1b; }
    .status-badge[data-status='SCHEDULED'] { background: #dcfce7; color: #166534; }
  `],
})
export class ProjectDetail {
  p = inject(ActivatedRoute);
  api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  router = inject(Router);
  conference = signal<Model | null>(null);
  selectedTab = signal<'overview' | 'program' | 'config'>('overview');
  previewMode = signal(false);
  publishError = signal('');
  rooms = signal<Room[]>([]);
  tracks = signal<Track[]>([]);
  roomName = signal('');
  roomCapacity = signal(25);
  trackName = signal('');
  trackColor = signal('#6d5dfc');
  roomError = signal('');
  trackError = signal('');
  conflictError = signal<string>('');
  sessionError = signal('');
  sessionFormOpen = signal(false);
  editingSessionId = signal<number | null>(null);
  sessionDraft = signal({
    title: '',
    abstract: '',
    track: '',
    room: '',
    startsAt: '',
    endsAt: '',
    capacity: 50,
    speakerId: 3,
  });
  constructor() {
    this.load();
  }
  load() {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    if (!conferenceId) return;
    this.api.conference(conferenceId).subscribe((x) => {
      this.conference.set(x);
      this.loadConfig();
    });
  }
  loadConfig() {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    if (!conferenceId) return;
    this.api.rooms(conferenceId).subscribe({
      next: (x) => this.rooms.set(x),
      error: () => this.rooms.set([]),
    });
    this.api.tracks(conferenceId).subscribe({
      next: (x) => this.tracks.set(x),
      error: () => this.tracks.set([]),
    });
  }
  isConferenceInactive(conference: Model | null): boolean {
    return !!conference && (conference.status === 'CANCELLED' || conference.status === 'COMPLETED');
  }
  conferenceEnded(endsAt: string): boolean {
    return new Date(endsAt).getTime() < Date.now();
  }
  cancelConference(id: number) {
    if (!window.confirm('Cancel this conference? This action cannot be undone.')) return;
    this.api.updateConferenceStatus(id, 'CANCELLED').subscribe({
      next: (updated) => this.conference.update((current) => current ? { ...current, status: updated.status } : current),
      error: (err: HttpErrorResponse) => this.publishError.set(err.error?.message || 'Unable to cancel conference.'),
    });
  }
  completeConference(id: number) {
    if (!window.confirm('Mark this conference as complete?')) return;
    this.api.updateConferenceStatus(id, 'COMPLETED').subscribe({
      next: (updated) => this.conference.update((current) => current ? { ...current, status: updated.status } : current),
      error: (err: HttpErrorResponse) => this.publishError.set(err.error?.message || 'Unable to complete conference.'),
    });
  }
  register(id: number) {
    if (this.conference()?.status === 'CANCELLED' || this.conference()?.status === 'COMPLETED') {
      this.publishError.set('Registration is closed for this conference.');
      return;
    }
    this.api.register(id).subscribe((x) => this.conference.set(x));
    this.api.register(id).subscribe({
      next: (x) => this.conference.set(x),
      error: (err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.toast.warning('⚠️ Please verify your email address before registering for conferences. Check your inbox or resend the verification link.');
          setTimeout(() => this.router.navigateByUrl('/verify-email'), 3000);
        } else {
          this.toast.error(err.error?.message ?? 'Registration failed. Please try again.');
        }
      },
    });
  }
  canPublish(conference: Model): boolean {
    const user = this.auth.user();
    return user?.role === 'ADMIN' || (user?.role === 'ORGANIZER' && user.id === conference.organizerId);
  }
  publishConference() {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    if (!conferenceId) return;
    this.publishError.set('');
    this.api.publishConference(conferenceId).subscribe({
      next: (updated) => {
        this.conference.update((current) => current ? { ...current, status: updated.status } : current);
        this.previewMode.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.publishError.set(err.error?.message || 'Unable to publish conference.');
      },
    });
  }
  updateSessionField<K extends keyof typeof this.sessionDraft extends never ? never : keyof ReturnType<typeof this.sessionDraft>>(field: K, value: any) {
    this.sessionDraft.update((draft) => ({ ...draft, [field]: value }));
  }
  openCreateSession() {
    this.sessionError.set('');
    this.sessionFormOpen.set(true);
    this.editingSessionId.set(null);
    this.sessionDraft.set({
      title: '',
      abstract: '',
      track: '',
      room: '',
      startsAt: '',
      endsAt: '',
      capacity: 50,
      speakerId: this.auth.user()?.id ?? 3,
    });
  }
  closeSessionForm() {
    this.sessionFormOpen.set(false);
    this.editingSessionId.set(null);
    this.sessionError.set('');
  }
  editSession(session: Session) {
    this.sessionError.set('');
    this.sessionFormOpen.set(true);
    this.editingSessionId.set(session.id);
    this.sessionDraft.set({
      title: session.title,
      abstract: session.abstract,
      track: session.track,
      room: session.room,
      startsAt: session.startsAt.slice(0, 16),
      endsAt: session.endsAt.slice(0, 16),
      capacity: session.capacity,
      speakerId: session.speakerId,
    });
  }
  submitSession() {
    const draft = this.sessionDraft();
    if (!draft.title.trim() || !draft.abstract.trim() || !draft.track.trim() || !draft.room.trim() || !draft.startsAt || !draft.endsAt) {
      this.sessionError.set('Please complete all session fields before saving.');
      return;
    }
    // Ensure datetime-local values include seconds for ISO compliance
    const startsAt = draft.startsAt.length === 16 ? draft.startsAt + ':00' : draft.startsAt;
    const endsAt = draft.endsAt.length === 16 ? draft.endsAt + ':00' : draft.endsAt;
    const payload = { ...draft, startsAt, endsAt };
    const request = this.editingSessionId() !== null
      ? this.api.updateSession(this.editingSessionId()!, payload)
      : this.api.createSession(this.p.snapshot.paramMap.get('id') ?? 0, payload);
    request.subscribe({
      next: () => {
        this.closeSessionForm();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409 && err.error?.code === 'ROOM_CONFLICT') {
          this.sessionError.set(err.error.message || 'This room is already booked at that time.');
        } else if (err.status === 400) {
          this.sessionError.set(err.error?.message || 'Session date or time is invalid.');
        } else {
          this.sessionError.set(err.error?.message || 'Unable to save session.');
        }
      },
    });
  }
  cancelSession(session: Session) {
    if (!window.confirm('Cancel this session?')) return;
    this.api.cancelSession(session.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        const code = err.error?.code;
        if (code === 'ALREADY_CANCELLED') {
          this.sessionError.set('This session is already cancelled.');
        } else {
          this.sessionError.set(err.error?.message || 'Unable to cancel session.');
        }
      },
    });
  }
  deleteSession(session: Session) {
    if (!window.confirm('Delete this session permanently? This action cannot be undone.')) return;
    this.api.deleteSession(session.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        const code = err.error?.code;
        if (code === 'HAS_AGENDA_ENTRIES') {
          this.sessionError.set('This session has agenda entries and cannot be deleted.');
        } else {
          this.sessionError.set(err.error?.message || 'Unable to delete session.');
        }
      },
    });
  }
  createRoom() {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    const name = this.roomName().trim();
    if (!conferenceId || !name) {
      this.roomError.set('Room name is required.');
      return;
    }
    this.roomError.set('');
    this.api.createRoom(conferenceId, { name, capacity: Number(this.roomCapacity()) || 1 }).subscribe({
      next: () => {
        this.roomName.set('');
        this.roomCapacity.set(25);
        this.loadConfig();
      },
      error: (err: HttpErrorResponse) => {
        this.roomError.set(err.error?.message || 'Unable to create room.');
      },
    });
  }
  deleteRoom(room: Room) {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    if (!conferenceId) return;
    this.api.deleteRoom(conferenceId, room.id).subscribe({
      next: () => this.loadConfig(),
      error: (err: HttpErrorResponse) => {
        this.roomError.set(err.error?.message || 'Unable to remove room.');
      },
    });
  }
  createTrack() {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    const name = this.trackName().trim();
    if (!conferenceId || !name) {
      this.trackError.set('Track name is required.');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(this.trackColor())) {
      this.trackError.set('Select a valid hex color.');
      return;
    }
    this.trackError.set('');
    this.api.createTrack(conferenceId, { name, color: this.trackColor() }).subscribe({
      next: () => {
        this.trackName.set('');
        this.trackColor.set('#6d5dfc');
        this.loadConfig();
      },
      error: (err: HttpErrorResponse) => {
        this.trackError.set(err.error?.message || 'Unable to create track.');
      },
    });
  }
  deleteTrack(track: Track) {
    const conferenceId = this.p.snapshot.paramMap.get('id');
    if (!conferenceId) return;
    this.api.deleteTrack(conferenceId, track.id).subscribe({
      next: () => this.loadConfig(),
      error: (err: HttpErrorResponse) => {
        this.trackError.set(err.error?.message || 'Unable to remove track.');
      },
    });
  }
  toggle(s: Session) {
    this.conflictError.set('');
    this.api.toggleAgenda(s.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409 && err.error?.code === 'ROOM_CONFLICT') {
          this.conflictError.set(err.error.message || 'This session conflicts with another session in your agenda.');
        } else if (err.status === 409) {
          this.conflictError.set('Schedule conflict: this session overlaps with one already in your agenda.');
        } else {
          this.conflictError.set('Failed to update agenda. Please try again.');
        }
      },
    });
  }
  exportMyAgenda(conferenceId: number) {
    this.api.exportAgenda(conferenceId).subscribe((blob) => this.downloadBlob(blob, 'my-agenda.ics'));
  }
  exportFullSchedule(conferenceId: number) {
    this.api.exportSchedule(conferenceId).subscribe((blob) => this.downloadBlob(blob, 'schedule.ics'));
  }
  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  date = (x: string) =>
    new Date(x).toLocaleDateString('en', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  time = (x: string) =>
    new Date(x).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  duration = (s: Session) =>
    (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000;
}

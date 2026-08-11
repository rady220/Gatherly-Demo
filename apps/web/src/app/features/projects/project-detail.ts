import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { ConferenceDetail as Model, Session } from '../../core/models/models';
import { AuthService } from '../../core/auth/auth.service';
@Component({
  imports: [RouterLink],
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
          <button class="btn primary full" [disabled]="c.isRegistered" (click)="register(c.id)">
            {{ c.isRegistered ? 'You are registered' : 'Reserve my place' }}
          </button>
        } @else {
          <small>Previewing as {{ auth.user()?.role }}</small>
        }
      </div>
    </header>
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
      <section class="card tasks">
        <div class="section-head">
          <div>
            <h2>Program</h2>
            <p>Build a personal agenda without schedule conflicts.</p>
          </div>
          @if (auth.hasRole('ADMIN', 'ORGANIZER')) {
            <button class="btn small">＋ Add session</button>
          }
        </div>
        @if (conflictError()) {
          <div class="error-banner">⚠ {{ conflictError() }}</div>
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
              <p>{{ s.abstract }}</p>
              <small>⌖ {{ s.room }} · {{ s.capacity }} seats</small>
            </div>
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
    </div>
  }`,
})
export class ProjectDetail {
  p = inject(ActivatedRoute);
  api = inject(ApiService);
  auth = inject(AuthService);
  conference = signal<Model | null>(null);
  conflictError = signal<string>('');
  constructor() {
    this.load();
  }
  load() {
    this.api
      .conference(this.p.snapshot.paramMap.get('id')!)
      .subscribe((x) => this.conference.set(x));
  }
  register(id: number) {
    this.api.register(id).subscribe((x) => this.conference.set(x));
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

import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Session } from '../../core/models/models';

interface Filters { q: string; speaker: string; track: string; room: string; day: string; }

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="back" [routerLink]="'/conferences/' + conferenceId">← Back to conference</a>
    <header class="section-head">
      <h1>Schedule</h1>
      <button class="btn primary small" (click)="exportSchedule()">⬇ Export Full Schedule</button>
    </header>

    <div class="filter-bar">
      <input
        type="text"
        placeholder="Speaker"
        [value]="filters().speaker"
        (input)="updateFilter('speaker', $any($event.target).value)"
      />
      <input
        type="text"
        placeholder="Keyword search"
        [value]="filters().q"
        (input)="updateFilter('q', $any($event.target).value)"
      />
      <select [value]="filters().track" (change)="updateFilter('track', $any($event.target).value)">
        <option value="">All tracks</option>
        @for (t of tracks(); track t) {
          <option [value]="t">{{ t }}</option>
        }
      </select>
      <select [value]="filters().room" (change)="updateFilter('room', $any($event.target).value)">
        <option value="">All rooms</option>
        @for (r of rooms(); track r) {
          <option [value]="r">{{ r }}</option>
        }
      </select>
      <input
        type="date"
        [value]="filters().day"
        (change)="updateFilter('day', $any($event.target).value)"
      />
    </div>

    @if (loading()) {
      <div class="empty"><p>Loading sessions…</p></div>
    } @else {
      @for (s of sessions(); track s.id) {
        <article class="card session" [class.cancelled]="s.status === 'CANCELLED'">
          <div class="session-time">
            <strong>{{ time(s.startsAt) }}</strong>
            <small>{{ duration(s) }} min</small>
          </div>
          <div class="session-body">
            <div class="session-badges">
              <span class="track">{{ s.track }}</span>
              <span class="room-badge">⌖ {{ s.room }}</span>
              @if (s.status === 'CANCELLED') {
                <span class="badge cancelled">CANCELLED</span>
              }
            </div>
            <h3 [class.strikethrough]="s.status === 'CANCELLED'">{{ s.title }}</h3>
            <p>{{ s.abstract }}</p>
            <small>{{ s.capacity }} seats</small>
          </div>
        </article>
      } @empty {
        <div class="empty"><strong>No sessions match your filters</strong></div>
      }
    }
  `,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    .back { display: inline-block; margin-bottom: 1rem; color: var(--primary); text-decoration: none; }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .section-head h1 { margin: 0; }
    .filter-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .filter-bar input, .filter-bar select {
      padding: 0.5rem 0.75rem; border: 1px solid var(--border, #ddd); border-radius: 6px;
      font-size: 0.9rem; background: var(--surface, #fff);
    }
    .filter-bar input[type="text"] { flex: 1; min-width: 180px; }
    .session { display: flex; gap: 1rem; padding: 1rem; margin-bottom: 0.75rem; }
    .session.cancelled { opacity: 0.6; }
    .session-time { min-width: 70px; text-align: center; }
    .session-time strong { display: block; font-size: 0.95rem; }
    .session-time small { color: var(--muted, #888); }
    .session-body { flex: 1; }
    .session-badges { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem; }
    .track { background: var(--primary-light, #e0e7ff); color: var(--primary, #4f46e5);
      padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .room-badge { font-size: 0.75rem; color: var(--muted, #888); }
    .badge.cancelled { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .session-body h3 { margin: 0.25rem 0; }
    .session-body p { margin: 0.25rem 0; color: var(--muted, #555); font-size: 0.9rem; }
    .strikethrough { text-decoration: line-through; }
    .empty { text-align: center; padding: 3rem 1rem; color: var(--muted, #888); }
  `],
})
export class ScheduleBrowser implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  conferenceId = '';
  sessions = signal<Session[]>([]);
  loading = signal(false);
  tracks = signal<string[]>([]);
  rooms = signal<string[]>([]);
  filters = signal<Filters>({ q: '', speaker: '', track: '', room: '', day: '' });

  ngOnInit() {
    this.conferenceId = this.route.snapshot.paramMap.get('id')!;
    const qp = this.route.snapshot.queryParams;
    this.filters.set({
      q: qp['q'] || '',
      speaker: qp['speaker'] || '',
      track: qp['track'] || '',
      room: qp['room'] || '',
      day: qp['day'] || '',
    });
    this.fetchSessions();
  }

  updateFilter(key: keyof Filters, value: string) {
    this.filters.update((f) => ({ ...f, [key]: value }));
    const next = { ...this.filters() };
    this.router.navigate([], { queryParams: next, queryParamsHandling: 'merge' });
    this.fetchSessions();
  }

  fetchSessions() {
    this.loading.set(true);
    const f = this.filters();
    const params: Record<string, string> = { q: f.q, speaker: f.speaker, track: f.track, room: f.room, day: f.day };
    this.api.sessions(this.conferenceId, params).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.tracks.set([...new Set(data.map((s) => s.track).filter(Boolean))]);
        this.rooms.set([...new Set(data.map((s) => s.room).filter(Boolean))]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  exportSchedule() {
    this.api.exportSchedule(+this.conferenceId).subscribe((blob) => {
      this.downloadBlob(blob, 'schedule.ics');
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  time = (x: string) =>
    new Date(x).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  duration = (s: Session) =>
    Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
}

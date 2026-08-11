import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Conference } from '../../core/models/models';
import { AuthService } from '../../core/auth/auth.service';
import { CreateConferenceDialog } from './create-conference-dialog';
@Component({
  imports: [RouterLink, CreateConferenceDialog],
  template: `<header class="page-head">
      <div>
        <span class="eyebrow">Program directory</span>
        <h1>Conferences</h1>
        <p>Find the rooms where your next useful idea—and collaborator—might be waiting.</p>
      </div>
      @if (auth.hasRole('ADMIN', 'ORGANIZER')) {
        <button class="btn primary" (click)="showCreateDialog.set(true)">＋ Create conference</button>
      }
    </header>
    <div class="toolbar">
      <input
        placeholder="Search by title or city…"
        (input)="query.set($any($event.target).value)"
      />
      <div class="segmented">
        <button class="active">Upcoming</button><button>My events</button>
      </div>
    </div>
    <div class="project-grid">
      @for (c of filtered(); track c.id) {
        <a
          class="card project-card event-card"
          [routerLink]="['/conferences', c.id]"
          [style.--event-color]="c.theme"
          ><div class="event-date">
            <strong>{{ day(c.startsAt) }}</strong
            ><span>{{ month(c.startsAt) }}</span>
          </div>
          <span class="status" [attr.data-status]="c.status">{{ c.status }}</span>
          <h3>{{ c.title }}</h3>
          <p>{{ c.summary }}</p>
          <footer>
            <span>⌖ {{ c.venue }}, {{ c.city }}</span
            ><span>{{ c.capacity }} seats</span>
          </footer></a
        >
      } @empty {
        <div class="empty">
          <strong>No conference found</strong>
          <p>Try a different title or city.</p>
        </div>
      }
    </div>
    @if (showCreateDialog()) {
      <app-create-conference-dialog
        (created)="onCreated($event)"
        (closed)="showCreateDialog.set(false)"
      />
    }`,
})
export class Projects {
  api = inject(ApiService);
  auth = inject(AuthService);
  conferences = signal<Conference[]>([]);
  query = signal('');
  showCreateDialog = signal(false);
  filtered = () =>
    this.conferences().filter((c) =>
      (c.title + ' ' + c.city).toLowerCase().includes(this.query().toLowerCase()),
    );
  day = (x: string) => new Date(x).getDate();
  month = (x: string) => new Date(x).toLocaleString('en', { month: 'short' });
  constructor() {
    this.api.conferences().subscribe((x) => this.conferences.set(x));
  }
  onCreated(c: Conference) {
    this.conferences.update((list) => [c, ...list]);
    this.showCreateDialog.set(false);
  }
}

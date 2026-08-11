import { Component, signal, output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Conference } from '../../core/models/models';

@Component({
  selector: 'app-create-conference-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="close()" (keydown.escape)="close()">
      <div class="dialog-content card" (click)="$event.stopPropagation()">
        <header>
          <h2>Create New Conference</h2>
          <button class="close-btn" (click)="close()">✕</button>
        </header>
        <form (submit)="submit($event)">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" [(ngModel)]="title" name="title" required placeholder="Conference title" />
          </div>
          <div class="form-group">
            <label for="summary">Summary</label>
            <textarea id="summary" [(ngModel)]="summary" name="summary" required rows="3" placeholder="Brief description"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="startsAt">Starts At</label>
              <input id="startsAt" type="datetime-local" [(ngModel)]="startsAt" name="startsAt" required />
            </div>
            <div class="form-group">
              <label for="endsAt">Ends At</label>
              <input id="endsAt" type="datetime-local" [(ngModel)]="endsAt" name="endsAt" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="city">City</label>
              <input id="city" [(ngModel)]="city" name="city" required placeholder="City" />
            </div>
            <div class="form-group">
              <label for="venue">Venue</label>
              <input id="venue" [(ngModel)]="venue" name="venue" required placeholder="Venue name" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="capacity">Capacity</label>
              <input id="capacity" type="number" [(ngModel)]="capacity" name="capacity" required min="1" placeholder="Max attendees" />
            </div>
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" [(ngModel)]="status" name="status" required>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
          <footer>
            <button type="button" class="btn" (click)="close()">Cancel</button>
            <button type="submit" class="btn primary" [disabled]="loading()">
              @if (loading()) { Creating… } @else { Create }
            </button>
          </footer>
        </form>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .dialog-content {
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 1.5rem;
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    header h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-muted, #666);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .close-btn:hover {
      background: var(--surface-hover, #f0f0f0);
    }
    .form-group {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted, #555);
    }
    .form-group input,
    .form-group textarea,
    .form-group select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border, #ddd);
      border-radius: 6px;
      font-size: 0.9rem;
      font-family: inherit;
      background: var(--surface, #fff);
      transition: border-color 0.15s;
    }
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary, #4f46e5);
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border, #eee);
    }
    .error {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #dc2626;
      font-size: 0.85rem;
    }
  `],
})
export class CreateConferenceDialog {
  private api = inject(ApiService);

  created = output<Conference>();
  closed = output<void>();

  loading = signal(false);
  error = signal('');

  title = '';
  summary = '';
  startsAt = '';
  endsAt = '';
  city = '';
  venue = '';
  capacity = 100;
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';

  close() {
    this.closed.emit();
  }

  submit(e: Event) {
    e.preventDefault();
    this.error.set('');

    if (!this.title || !this.summary || !this.startsAt || !this.endsAt || !this.city || !this.venue || !this.capacity) {
      this.error.set('All fields are required.');
      return;
    }

    if (new Date(this.startsAt) >= new Date(this.endsAt)) {
      this.error.set('Start date must be before end date.');
      return;
    }

    this.loading.set(true);
    this.api.createConference({
      title: this.title,
      summary: this.summary,
      startsAt: new Date(this.startsAt).toISOString(),
      endsAt: new Date(this.endsAt).toISOString(),
      city: this.city,
      venue: this.venue,
      capacity: this.capacity,
      status: this.status,
    }).subscribe({
      next: (conference) => {
        this.loading.set(false);
        this.created.emit(conference);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Failed to create conference.');
      },
    });
  }
}

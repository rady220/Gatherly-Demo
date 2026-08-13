import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { ProjectDetail } from './features/projects/project-detail';
import { ScheduleBrowser } from './features/schedule/schedule-browser';
import { ApiService } from './core/services/api.service';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  it('creates the root', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});

describe('ProjectDetail room and track configuration', () => {
  it('renders the organizer configuration tools and loads room and track data', async () => {
    const api = {
      conference: () => of({
        id: 1,
        title: 'Demo',
        slug: 'demo',
        summary: 'Example conference',
        venue: 'Venue',
        city: 'Cairo',
        startsAt: '2026-10-15T10:00:00',
        endsAt: '2026-10-15T12:00:00',
        status: 'PUBLISHED',
        capacity: 100,
        organizerId: 1,
        theme: '#6d5dfc',
        sessions: [],
        registrations: 10,
        isRegistered: false,
        agendaSessionIds: [],
      }),
      rooms: () => of([{ id: 1, conferenceId: 1, name: 'Main Hall', capacity: 80 }]),
      tracks: () => of([{ id: 1, conferenceId: 1, name: 'AI', color: '#6d5dfc' }]),
      register: () => of(),
      toggleAgenda: () => of({ selected: true }),
      exportAgenda: () => of(new Blob()),
      exportSchedule: () => of(new Blob()),
      createRoom: () => of({ id: 2, conferenceId: 1, name: 'Room 2', capacity: 40 }),
      deleteRoom: () => of({ deleted: true }),
      createTrack: () => of({ id: 2, conferenceId: 1, name: 'Ops', color: '#00ff99' }),
      deleteTrack: () => of({ deleted: true }),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: ApiService, useValue: api },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ role: 'ORGANIZER' }),
            hasRole: (...roles: string[]) => roles.includes('ORGANIZER'),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProjectDetail);
    fixture.detectChanges();

    const tab = Array.from(fixture.nativeElement.querySelectorAll('.tab')).find(
      (el: unknown) => (el as Element).textContent?.includes('Rooms & Tracks'),
    ) as HTMLElement | undefined;

    tab?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rooms & Tracks');
    expect(fixture.nativeElement.textContent).toContain('Main Hall');
    expect(fixture.nativeElement.textContent).toContain('AI');
  });
});

describe('ScheduleBrowser filter sync', () => {
  it('renders speaker and keyword filters and syncs them to URL query params', async () => {
    const api = {
      sessions: () => of([
        { id: 1, conferenceId: 1, title: 'Angular Patterns', abstract: 'Building robust frontends', track: 'Frontend', room: 'Delta Room', startsAt: '2026-10-15T10:00:00', endsAt: '2026-10-15T10:45:00', capacity: 120, speakerId: 3, status: 'SCHEDULED' },
      ]),
      exportSchedule: () => of(new Blob()),
    };

    const navigate = (..._args: any[]) => Promise.resolve(true);

    await TestBed.configureTestingModule({
      imports: [ScheduleBrowser],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' }, queryParams: { q: 'Angular', speaker: 'Layla' } } } },
        { provide: Router, useValue: { navigate } },
        { provide: ApiService, useValue: api },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ScheduleBrowser);
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    const speakerInput = native.querySelector('input[placeholder="Speaker"]') as HTMLInputElement | null;
    const keywordInput = native.querySelector('input[placeholder="Keyword search"]') as HTMLInputElement | null;

    expect(speakerInput).not.toBeNull();
    expect(keywordInput).not.toBeNull();
    expect(speakerInput?.value).toBe('Layla');
    expect(keywordInput?.value).toBe('Angular');
  });
});

# Angular State Management

Standards for state in the Angular standalone frontend using Signals, RxJS interoperability, and focused injectable services.

## When to Use

Reference this skill when adding UI state, data loading, derived values, shared feature state, or RxJS-to-Signal bridges in `apps/web/src/app/`.

---

## Patterns

### Use Signals for component-owned state

Use `signal` for short-lived state owned by one component: dialog visibility, selected tabs, filters, form state, and loading flags. Derive values with `computed`; do not store values that can be calculated from other state.

```typescript
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ visibleConferences().length }}`,
})
export class ConferenceListComponent {
  readonly searchTerm = signal('');
  readonly conferences = signal<Conference[]>([]);
  readonly visibleConferences = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.conferences().filter(({ title }) => title.toLowerCase().includes(term));
  });
}
```

- Expose `asReadonly()` signals to consumers when mutation must remain internal.
- Update arrays and objects immutably with `set` or `update`.
- Use `effect` only for imperative effects such as persistence or logging, not for derived state.

### Bridge RxJS deliberately

Use `toSignal` to consume a service observable in a signal-based component. Supply an `initialValue` unless the observable is guaranteed to emit synchronously.

```typescript
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({ standalone: true, template: `{{ conferences().length }}` })
export class ConferenceBrowserComponent {
  private readonly api = inject(ApiService);
  readonly searchTerm = signal('');

  readonly conferences = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => this.api.getConferences({ search: term })),
    ),
    { initialValue: [] },
  );
}
```

- Use `toObservable` only when an RxJS consumer needs a signal value.
- Keep HTTP orchestration, caching, retries, and multi-consumer streams in services.
- Use `switchMap` for superseded searches; use `concatMap` when writes must execute in order.
- Model loading and error states explicitly. An unhandled observable error must not silently terminate the UI stream.

### Select the narrowest state scope

Keep state in the **component** when it is local, short-lived, and unnecessary after navigation. Use an injectable **feature or global store/service** when several components share it, it must survive navigation, it coordinates caching/requests, or it represents application-wide state such as authentication or toasts.

```typescript
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly currentUserState = signal<User | null>(null);
  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  setUser(user: User | null): void {
    this.currentUserState.set(user);
  }
}
```

- Scope feature stores with route/component providers when each feature instance needs isolation.
- Store domain data and request status, never component references or rendered HTML.
- Expose explicit mutations such as `load`, `refresh`, `setUser`, and `clear` for testability.

---

## Anti-patterns

```typescript
// ❌ Duplicate derived state that can become stale.
readonly fullName = signal('');
effect(() => this.fullName.set(`${this.firstName()} ${this.lastName()}`));

// ✅ Make it declarative.
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);

// ❌ Put local dialog state in a root store.
@Injectable({ providedIn: 'root' })
export class GlobalStore { readonly dialogOpen = signal(false); }

// ✅ Keep local UI state with its owner.
readonly dialogOpen = signal(false);

// ❌ Subscribe manually without lifecycle cleanup for template state.
this.api.getConferences().subscribe((items) => this.conferences.set(items));

// ✅ Use toSignal, or use takeUntilDestroyed when a subscription is necessary.
readonly conferences = toSignal(this.api.getConferences(), { initialValue: [] });
```

---

## References

- `apps/web/src/app/core/services/`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/features/`
- `.claude/skills/frontend-patterns.md`
- [Angular Signals](https://angular.dev/guide/signals)
- [RxJS interoperability](https://angular.dev/ecosystem/rxjs-interop)

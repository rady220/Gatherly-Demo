# Frontend Patterns

Standards for Angular standalone components, signals, reactive forms, and HTTP services.

## When to Use

Reference this skill when implementing any UI feature in `apps/web/`.

---

## Standalone Component Pattern

```typescript
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <p>Loading...</p>
    } @else {
      <ul>
        @for (item of items(); track item.id) {
          <li>{{ item.name }}</li>
        }
      </ul>
    }
  `,
  styles: [`
    :host { display: block; padding: 1rem; }
  `]
})
export class FeatureComponent {
  private api = inject(ApiService);

  items = signal<Item[]>([]);
  loading = signal(true);

  constructor() {
    this.loadItems();
  }

  async loadItems() {
    this.loading.set(true);
    const result = await this.api.getItems();
    this.items.set(result);
    this.loading.set(false);
  }
}
```

---

## Service Pattern

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  async getItems(): Promise<Item[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: Item[] }>(`${this.baseUrl}/items`)
    );
    return res.data;
  }

  async createItem(input: CreateItemInput): Promise<Item> {
    const res = await firstValueFrom(
      this.http.post<{ data: Item }>(`${this.baseUrl}/items`, input)
    );
    return res.data;
  }
}
```

---

## Reactive Forms Pattern

```typescript
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" placeholder="Name" />
      @if (form.controls.name.errors?.['required']) {
        <span class="error">Name is required</span>
      }
      <button type="submit" [disabled]="form.invalid">Save</button>
    </form>
  `
})
export class CreateFeatureComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['']
  });

  onSubmit() {
    if (this.form.valid) {
      // submit form.value
    }
  }
}
```

---

## Route Guard Pattern

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
```

---

## Anti-patterns

```typescript
// ❌ Constructor injection (old style)
constructor(private api: ApiService) {}

// ✅ inject() function
private api = inject(ApiService);

// ❌ NgModule-based components
@NgModule({ declarations: [MyComponent] })

// ✅ Standalone components
@Component({ standalone: true, imports: [...] })

// ❌ Manual subscriptions without cleanup
ngOnInit() { this.http.get(...).subscribe(data => this.data = data); }

// ✅ Use signals or async pipe / toSignal()
data = toSignal(this.http.get<Data>(...));

// ❌ Direct HTTP calls in components
this.http.get('/api/items')...

// ✅ Use ApiService
this.api.getItems()
```

---

## References

- `apps/web/src/app/core/services/api.service.ts`
- `apps/web/src/app/core/guards/auth.guard.ts`
- `apps/web/src/app/core/models/models.ts`
- `apps/web/src/app/app.routes.ts`
- `docs/PRODUCT-SPEC.md`

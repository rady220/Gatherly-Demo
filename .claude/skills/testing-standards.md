# Testing Standards

Guidelines for unit testing API endpoints and Angular components.

## When to Use

Reference this skill when writing any tests for `apps/api` or `apps/web`.

---

## Backend Testing (Vitest)

### Test File Location

Co-locate tests next to source: `feature.test.ts` beside `feature.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('GET /api/conferences', () => {
  it('should return a list of conferences', async () => {
    // Arrange — setup test data if needed

    // Act
    const res = await request(app).get('/api/conferences');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .get('/api/conferences')
      .set('Authorization', '');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 404 for non-existent conference', async () => {
    const res = await request(app)
      .get('/api/conferences/non-existent-id')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

### What to Test (Backend)

| Layer | Test Type | Example |
|-------|-----------|---------|
| Routes | Integration | HTTP status, response shape, auth |
| Store | Unit | Query results, null handling |
| Middleware | Unit | Next() called, error responses |
| Utils | Unit | Pure function I/O |

---

## Frontend Testing (Angular)

### Test File Location

Co-locate tests: `feature.spec.ts` beside `feature.ts`

### Component Test Structure

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FeatureComponent } from './feature';

describe('FeatureComponent', () => {
  let component: FeatureComponent;
  let fixture: ComponentFixture<FeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureComponent],
      providers: [provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display items when loaded', () => {
    component.items.set([{ id: '1', name: 'Test' }]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Test');
  });
});
```

---

## Coverage Expectations

| Area | Minimum Coverage |
|------|-----------------|
| API routes | 80% line coverage |
| Store functions | 90% line coverage |
| Angular services | 80% line coverage |
| Angular components | 70% line coverage |

---

## Test Naming Convention

Use descriptive, behavior-focused names:

```typescript
// ✅ Good
it('should return 404 when conference not found')
it('should disable submit button when form is invalid')
it('should redirect to login when token expired')

// ❌ Bad
it('test1')
it('works')
it('should work correctly')
```

---

## Anti-patterns

```typescript
// ❌ Testing implementation details
expect(component.privateMethod).toHaveBeenCalled();

// ✅ Test observable behavior
expect(fixture.nativeElement.textContent).toContain('Expected text');

// ❌ Shared mutable state between tests
let sharedData = [];
beforeAll(() => { sharedData = [...]; });

// ✅ Fresh setup per test
beforeEach(() => { const data = [...]; });

// ❌ No assertions
it('should load data', async () => {
  await service.loadData();
  // forgot to assert!
});

// ✅ Always assert
it('should load data', async () => {
  const result = await service.loadData();
  expect(result).toHaveLength(3);
});

// ❌ Overly broad assertions
expect(res.body).toBeDefined();

// ✅ Specific assertions
expect(res.body.data).toHaveLength(2);
expect(res.body.data[0].name).toBe('Conference A');
```

---

## Running Tests

```bash
# Backend
cd apps/api && npx vitest run

# Backend watch mode
cd apps/api && npx vitest

# Frontend
cd apps/web && npx ng test

# Type check (both)
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

---

## References

- `apps/api/vitest.config.ts`
- `apps/api/vitest.global-setup.ts`
- `apps/api/src/app.test.ts`
- `apps/web/tsconfig.spec.json`

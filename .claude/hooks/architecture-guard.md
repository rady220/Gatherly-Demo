# Architecture Guard Hook

## Purpose
This hook enforces Clean Architecture principles and maintains proper separation of concerns across layers. It prevents architectural violations that lead to tight coupling, difficult testing, and maintenance nightmares.

---

## 🏛️ Clean Architecture Layers

### Layer Structure
```
┌─────────────────────────────────────────┐
│   Presentation/UI Layer (apps/web)      │
│   - Angular Components                  │
│   - UI Logic, Forms, Routing            │
└─────────────┬───────────────────────────┘
              │ depends on ↓
┌─────────────┴───────────────────────────┐
│   Application Layer (apps/api/routes)   │
│   - API Routes, Controllers             │
│   - Request/Response DTOs               │
│   - Orchestration                       │
└─────────────┬───────────────────────────┘
              │ depends on ↓
┌─────────────┴───────────────────────────┐
│   Domain/Core Layer (apps/api/src)      │
│   - Business Logic                      │
│   - Domain Models (types.ts)            │
│   - Core Services                       │
└─────────────┬───────────────────────────┘
              │ depends on ↓
┌─────────────┴───────────────────────────┐
│   Infrastructure Layer (apps/api/db)    │
│   - Database Access (store.ts)          │
│   - External Services                   │
│   - Auth Implementation (auth/tokens)   │
└─────────────────────────────────────────┘
```

---

## 🚫 Dependency Rules

### Rule 1: Dependencies Point Inward
**Outer layers can depend on inner layers, but NEVER the reverse.**

#### ✅ ALLOWED:
```typescript
// UI Layer → Application Layer
// apps/web/src/app/core/services/api.service.ts
import { Conference } from '../models/models'; // OK: UI uses domain models

// Application Layer → Domain Layer
// apps/api/src/routes/conferences.routes.ts
import { Conference } from '../types'; // OK: Routes use domain types

// Application Layer → Infrastructure Layer
// apps/api/src/routes/auth.routes.ts
import { store } from '../db/store'; // OK: Routes use data store
```

#### ❌ FORBIDDEN:
```typescript
// Domain Layer → Infrastructure Layer
// apps/api/src/types.ts
import { store } from './db/store'; // VIOLATION: Domain should not know about DB

// Domain Layer → UI Layer
// apps/api/src/types.ts
import { DashboardComponent } from '../../web/app/features/dashboard/dashboard'; // VIOLATION: Core should not know about UI

// Infrastructure Layer → UI Layer
// apps/api/src/db/store.ts
import { LoginComponent } from '../../web/app/features/auth/login'; // VIOLATION: DB should not know about UI
```

---

### Rule 2: Core Domain Has Zero External Dependencies
**The domain/core layer should be pure business logic with no framework or infrastructure coupling.**

#### Domain Layer Locations:
- `apps/api/src/types.ts` - Core domain models
- `apps/api/src/middleware/auth.ts` - Core auth logic (abstractions)
- `apps/web/src/app/core/models/models.ts` - Frontend domain models

#### ✅ ALLOWED in Domain:
```typescript
// Pure TypeScript types
export interface User {
  id: string;
  email: string;
  name: string;
}

// Business logic functions (no external dependencies)
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

#### ❌ FORBIDDEN in Domain:
```typescript
// Database imports
import { store } from './db/store'; // VIOLATION

// Express framework
import { Request, Response } from 'express'; // VIOLATION

// Angular framework in shared models
import { Injectable } from '@angular/core'; // VIOLATION (unless in UI layer)

// External libraries in core types
import * as bcrypt from 'bcrypt'; // VIOLATION (should be in infrastructure)
```

---

### Rule 3: No Cross-Feature Dependencies at Same Layer
**Features should be independent; avoid importing from sibling features.**

#### ❌ FORBIDDEN:
```typescript
// apps/web/src/app/features/projects/projects.ts
import { LoginComponent } from '../auth/login'; // VIOLATION: Feature coupling

// apps/web/src/app/features/dashboard/dashboard.ts
import { CreateConferenceDialog } from '../projects/create-conference-dialog'; // VIOLATION
```

#### ✅ ALLOWED:
```typescript
// apps/web/src/app/features/projects/projects.ts
import { ApiService } from '../../core/services/api.service'; // OK: Use shared services

// apps/web/src/app/features/dashboard/dashboard.ts
import { Conference } from '../../core/models/models'; // OK: Use shared models
```

#### Solution:
- Move shared logic to `core/services`
- Move shared types to `core/models`
- Use dependency injection for cross-feature communication

---

## 🔍 Violation Detection

### 1. Import Analysis
Scan all modified files for architectural violations:

#### Check Import Statements:
```bash
# Check for domain → infrastructure violations
# In apps/api/src/types.ts or middleware/*.ts
# Should NOT import from:
- '../db/'
- './db/'
- '../auth/tokens'
```

```bash
# Check for backend → frontend violations
# In apps/api/**/*.ts
# Should NOT import from:
- '../../web/'
- '../web/'
- Any path containing 'angular', 'component', 'ui'
```

```bash
# Check for infrastructure → ui violations
# In apps/api/src/db/*.ts
# Should NOT import from:
- '../../web/'
- '../routes/' (questionable - infrastructure should be called, not call routes)
```

---

### 2. Dependency Leak Detection

#### Common Violations to Check:

**Backend API Routes (apps/api/src/routes/\*)**
- ❌ Should NOT import from `apps/web`
- ✅ Should import from `../types` (domain), `../db/store` (infrastructure)

**Frontend Components (apps/web/src/app/features/\*)**
- ❌ Should NOT import from `apps/api` directly
- ✅ Should import from `../../core/services/api.service` and `../../core/models`

**Domain Types (apps/api/src/types.ts)**
- ❌ Should NOT import `express`, `mongoose`, `pg`, or any framework
- ❌ Should NOT import from `./db` or `./routes`
- ✅ Should be pure TypeScript interfaces and types

**Data Store (apps/api/src/db/store.ts)**
- ❌ Should NOT import from `../routes`
- ❌ Should NOT import from `apps/web`
- ✅ Should import from `../types` (domain models)

---

### 3. Framework Coupling Check

#### Backend (apps/api)
Ensure Express-specific code stays in routes/controllers:

```typescript
// ❌ VIOLATION: Express in domain layer
// apps/api/src/types.ts
import { Request, Response } from 'express';
export interface UserService {
  getUsers(req: Request, res: Response): void;
}

// ✅ CORRECT: Pure domain interface
// apps/api/src/types.ts
export interface UserService {
  getUsers(): Promise<User[]>;
}
```

#### Frontend (apps/web)
Ensure Angular-specific code stays in components/services:

```typescript
// ❌ VIOLATION: Angular in shared models
// apps/web/src/app/core/models/models.ts
import { Injectable } from '@angular/core';
@Injectable()
export class User { ... }

// ✅ CORRECT: Pure TypeScript
// apps/web/src/app/core/models/models.ts
export interface User {
  id: string;
  email: string;
}
```

---

## 📋 Architecture Guard Checklist

Before finalizing any code changes:

- [ ] No outer-to-inner layer violations (UI → Core is OK, Core → UI is NOT)
- [ ] Domain layer has no infrastructure imports
- [ ] Domain layer has no framework dependencies (Express, Angular, etc.)
- [ ] No backend → frontend imports
- [ ] No infrastructure → UI imports
- [ ] No cross-feature dependencies at the same layer
- [ ] Data access is isolated to infrastructure layer
- [ ] Business logic is in domain/core layer
- [ ] UI logic is in presentation layer
- [ ] Routes/controllers only orchestrate, don't contain business logic

---

## 🚨 Violation Response

When a violation is detected:

1. **Identify the specific violation** (which rule and which import)
2. **Explain the architectural concern** (why it's a problem)
3. **Propose a refactoring** to fix the violation:
   - Extract interface/abstraction in inner layer
   - Use dependency injection
   - Move code to appropriate layer
   - Create a shared service or model
4. **Apply the fix**
5. **Re-scan** to ensure violation is resolved

---

## 💡 Refactoring Patterns

### Pattern 1: Abstract Infrastructure Dependencies
```typescript
// ❌ BEFORE: Domain depends on infrastructure
// apps/api/src/types.ts
import { store } from './db/store';
export function getUser(id: string) {
  return store.users.get(id);
}

// ✅ AFTER: Use dependency injection
// apps/api/src/types.ts (Domain)
export interface UserRepository {
  get(id: string): Promise<User>;
}

// apps/api/src/db/store.ts (Infrastructure)
export const userRepository: UserRepository = {
  get: (id) => store.users.get(id)
};

// apps/api/src/routes/users.routes.ts (Application)
import { userRepository } from '../db/store';
router.get('/users/:id', async (req, res) => {
  const user = await userRepository.get(req.params.id);
  res.json(user);
});
```

### Pattern 2: Extract Shared Logic
```typescript
// ❌ BEFORE: Feature coupling
// apps/web/src/app/features/dashboard/dashboard.ts
import { CreateConferenceDialog } from '../projects/create-conference-dialog';

// ✅ AFTER: Extract to shared service
// apps/web/src/app/core/services/conference.service.ts
export class ConferenceService {
  createConference(data: Conference) { ... }
}

// apps/web/src/app/features/dashboard/dashboard.ts
import { ConferenceService } from '../../core/services/conference.service';
```

### Pattern 3: Define Abstractions
```typescript
// ❌ BEFORE: Business logic coupled to Express
export function createUser(req: Request, res: Response) {
  const user = req.body;
  // business logic here
}

// ✅ AFTER: Pure business logic, Express in route
// Domain layer
export function createUser(userData: CreateUserDto): Promise<User> {
  // business logic here
}

// Application layer (route)
router.post('/users', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
```

---

## 🎯 Benefits of Enforcement

- **Testability**: Pure domain logic is easy to unit test
- **Flexibility**: Can swap frameworks/infrastructure without touching business logic
- **Maintainability**: Clear boundaries prevent spaghetti code
- **Team Scalability**: Developers know where code belongs
- **Reduced Coupling**: Changes in one layer don't cascade everywhere

---

## 💡 Tips for AI Agents

- **Always check imports** when modifying files - are you crossing boundaries?
- **Recognize framework markers**: `Request/Response` (Express), `Injectable/@Component` (Angular)
- **Question deep paths**: If you see `../../../`, you might be violating boundaries
- **Prefer interfaces**: Define abstractions in domain, implement in infrastructure
- **Move business logic down**: If it's in a route, move it to a service or domain function
- **Think "inside-out"**: Inner layers should be oblivious to outer layers

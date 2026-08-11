# Backend Patterns

Standards for Express routes, error handling, auth middleware, and store invariants.

## When to Use

Reference this skill when implementing any server-side feature in `apps/api/`.

---

## Route Definition Pattern

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

export const featureRouter = Router();

featureRouter.use(authMiddleware);

// GET collection
featureRouter.get('/', async (req: Request, res: Response) => {
  try {
    const items = await store.getAllItems();
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to fetch items' } });
  }
});

// GET by ID
featureRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await store.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: { message: 'Not found' } });
    }
    res.json({ data: item });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to fetch item' } });
  }
});

// POST create
featureRouter.post('/', async (req: Request, res: Response) => {
  try {
    const newItem = await store.createItem(req.body);
    res.status(201).json({ data: newItem });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to create item' } });
  }
});
```

---

## Response Envelope

```typescript
// Success
res.json({ data: result });
res.status(201).json({ data: created });

// Error
res.status(400).json({ error: { message: '...', code: 'VALIDATION_ERROR' } });
res.status(401).json({ error: { message: '...', code: 'UNAUTHORIZED' } });
res.status(404).json({ error: { message: '...', code: 'NOT_FOUND' } });
res.status(500).json({ error: { message: '...', code: 'INTERNAL_ERROR' } });
```

---

## Store (Database) Pattern

```typescript
// In src/db/store.ts — one function per query
export async function getConferenceById(id: string): Promise<Conference | null> {
  // Return null for not-found, throw for actual errors
}

export async function createConference(data: CreateConferenceInput): Promise<Conference> {
  // Return the created entity with its generated ID
}
```

---

## Middleware Pattern

```typescript
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: result.error.issues }
      });
    }
    req.body = result.data;
    next();
  };
}
```

---

## Anti-patterns

```typescript
// ❌ Business logic in route handlers
featureRouter.post('/', async (req, res) => {
  // 50+ lines of logic...
});

// ✅ Delegate to store/service functions
featureRouter.post('/', async (req, res) => {
  const result = await createFeature(req.body);
  res.status(201).json({ data: result });
});

// ❌ Inconsistent response shapes
res.json(items);                    // raw array
res.json({ success: true, items }); // non-standard

// ✅ Always use { data } or { error }
res.json({ data: items });

// ❌ Swallowing errors
try { ... } catch (e) { res.json({}); }

// ✅ Proper error responses
try { ... } catch (e) { res.status(500).json({ error: { message: e.message } }); }
```

---

## References

- `apps/api/src/routes/conferences.routes.ts`
- `apps/api/src/db/store.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/types.ts`
- `docs/ARCHITECTURE.md`

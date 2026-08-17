# API Sync Hook

## Purpose
This hook ensures consistency between backend API endpoints and frontend contracts whenever APIs are created or modified. It prevents integration issues, type mismatches, and undocumented API changes.

---

## 🔄 Backend ↔ Frontend Synchronization

### When This Hook Applies
Trigger API sync checks when:

- ✅ Creating a new API endpoint
- ✅ Modifying existing endpoint (path, method, parameters, response)
- ✅ Adding/removing/changing request/response DTOs
- ✅ Modifying authentication/authorization requirements
- ✅ Changing error responses or status codes
- ✅ Adding/removing query parameters or headers

---

## 📡 Backend API Changes

### 1. API Endpoint Verification

#### Location: `apps/api/src/routes/*.routes.ts`

When modifying routes, verify:

```typescript
// Example: apps/api/src/routes/conferences.routes.ts
router.post('/conferences', authMiddleware, async (req, res) => {
  // Endpoint details to document:
  // - Method: POST
  // - Path: /conferences
  // - Auth: Required (authMiddleware)
  // - Request Body: CreateConferenceDto
  // - Response: Conference
  // - Status Codes: 201 (created), 400 (validation), 401 (unauthorized)
});
```

#### Checklist for Backend Changes:
- [ ] Document HTTP method (GET, POST, PUT, DELETE, PATCH)
- [ ] Document full path including route parameters
- [ ] Document authentication requirements
- [ ] Document request body schema
- [ ] Document query parameters
- [ ] Document response body schema
- [ ] Document all possible status codes
- [ ] Document error response formats

---

### 2. Request/Response DTO Updates

#### Backend Types: `apps/api/src/types.ts`

When creating or modifying DTOs:

```typescript
// Example DTO changes that require frontend sync
export interface CreateConferenceDto {
  title: string;         // Required
  description?: string;  // Optional - note the ?
  startDate: string;     // ISO 8601 format
  endDate: string;
  location: string;
  // NEW FIELD - must sync to frontend
  capacity?: number;     // Added in v2
}

export interface Conference {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string;
  capacity: number | null;  // NEW - must sync
  createdAt: string;
  updatedAt: string;
}
```

#### Action Required:
When backend types change, **immediately check** if corresponding frontend types need updates.

---

## 🎨 Frontend Contract Updates

### 3. Frontend Model Synchronization

#### Location: `apps/web/src/app/core/models/models.ts`

**CRITICAL**: Frontend models must match backend types **exactly**.

```typescript
// Example: Must match apps/api/src/types.ts
export interface Conference {
  id: string;
  title: string;
  description: string | null;
  startDate: string;        // Must match backend format (ISO 8601)
  endDate: string;
  location: string;
  capacity: number | null;  // SYNC: Add this if backend added it
  createdAt: string;
  updatedAt: string;
}

export interface CreateConferenceDto {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity?: number;        // SYNC: Add this if backend added it
}
```

#### Verification Steps:
1. Compare frontend models with backend types field-by-field
2. Verify nullable fields match (`| null` vs `?` optional)
3. Check date/time formats are consistent
4. Ensure enums match exactly
5. Validate array types match

---

### 4. API Service Updates

#### Location: `apps/web/src/app/core/services/api.service.ts`

When backend endpoints change, update API service methods:

```typescript
// Example: Update service when endpoint changes
@Injectable()
export class ApiService {
  private baseUrl = '/api';

  // BEFORE: Old endpoint
  getConferences(): Observable<Conference[]> {
    return this.http.get<Conference[]>(`${this.baseUrl}/conferences`);
  }

  // AFTER: New endpoint with query params
  getConferences(params?: { 
    page?: number; 
    limit?: number;
    status?: 'active' | 'archived';  // NEW query param - sync from backend
  }): Observable<Conference[]> {
    const httpParams = new HttpParams({ fromObject: params as any });
    return this.http.get<Conference[]>(`${this.baseUrl}/conferences`, { params: httpParams });
  }

  // NEW: Sync new backend endpoint
  getConferenceById(id: string): Observable<Conference> {
    return this.http.get<Conference>(`${this.baseUrl}/conferences/${id}`);
  }
}
```

#### Checklist for Frontend Service Updates:
- [ ] Add/update methods for new/modified endpoints
- [ ] Update method signatures (parameters, return types)
- [ ] Update HTTP method if changed (GET → POST, etc.)
- [ ] Update URL paths
- [ ] Add query parameters if backend added them
- [ ] Update request body types
- [ ] Update response types
- [ ] Update error handling if error format changed

---

## 📚 Documentation Updates

### 5. Swagger/OpenAPI Specification

#### Recommended Location: `docs/api/openapi.yaml` or inline decorators

**When backend APIs change, update API documentation:**

```yaml
# Example: Document new endpoint
/api/conferences:
  post:
    summary: Create a new conference
    tags:
      - Conferences
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateConferenceDto'
    responses:
      '201':
        description: Conference created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Conference'
      '400':
        description: Validation error
      '401':
        description: Unauthorized

components:
  schemas:
    CreateConferenceDto:
      type: object
      required:
        - title
        - startDate
        - endDate
        - location
      properties:
        title:
          type: string
          minLength: 3
          maxLength: 100
        description:
          type: string
          maxLength: 500
        startDate:
          type: string
          format: date-time
        endDate:
          type: string
          format: date-time
        location:
          type: string
        capacity:
          type: number
          minimum: 1
```

#### Action Required:
- [ ] Create/update Swagger documentation for modified endpoints
- [ ] Document all request/response schemas
- [ ] Include validation rules (min, max, required, format)
- [ ] Document authentication requirements
- [ ] List all possible response codes with descriptions
- [ ] Include example requests/responses

---

## 🔍 Sync Verification Checks

### Automated Checks

#### 1. Type Comparison
Compare backend and frontend types for consistency:

```bash
# Generate type report (conceptual - implement as needed)
# Compare apps/api/src/types.ts with apps/web/src/app/core/models/models.ts
```

#### 2. Endpoint Inventory
List all backend endpoints and verify frontend coverage:

**Backend Endpoints** (apps/api/src/routes/):
- `auth.routes.ts`: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
- `conferences.routes.ts`: `/api/conferences`, `/api/conferences/:id`
- `admin.routes.ts`: `/api/admin/users`

**Frontend API Calls** (apps/web/src/app/core/services/api.service.ts):
- Verify methods exist for each backend endpoint
- Check for orphaned methods (no backend endpoint)

---

### Manual Checks

#### 3. Field-by-Field Comparison
For each modified type, verify:

| Backend Field | Frontend Field | Match? | Notes |
|---------------|----------------|--------|-------|
| `id: string` | `id: string` | ✅ | OK |
| `capacity?: number` | `capacity: number \| null` | ⚠️ | Optional vs nullable - verify intent |
| `createdAt: Date` | `createdAt: string` | ❌ | Type mismatch - backend should use string for JSON |

#### 4. Validation Rules
Ensure frontend validation matches backend:

```typescript
// Backend validation
if (!title || title.length < 3 || title.length > 100) {
  return res.status(400).json({ error: 'Title must be 3-100 characters' });
}

// Frontend validation - MUST MATCH
const titleControl = new FormControl('', [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(100)
]);
```

---

## 📋 API Sync Checklist

When API changes are made:

### Backend Checklist:
- [ ] API route created/modified in `apps/api/src/routes/*.routes.ts`
- [ ] Request/response types defined in `apps/api/src/types.ts`
- [ ] Validation logic implemented
- [ ] Error responses standardized
- [ ] Authentication/authorization applied correctly
- [ ] Endpoint tested with actual HTTP requests

### Frontend Checklist:
- [ ] Models updated in `apps/web/src/app/core/models/models.ts`
- [ ] API service method created/updated in `api.service.ts`
- [ ] TypeScript types match backend exactly
- [ ] HTTP method, path, and parameters correct
- [ ] Request/response types specified
- [ ] Error handling implemented
- [ ] Form validation matches backend rules (if applicable)

### Documentation Checklist:
- [ ] Swagger/OpenAPI spec updated (if exists)
- [ ] API documentation reflects new/changed endpoints
- [ ] Request/response examples provided
- [ ] Authentication requirements documented
- [ ] Error responses documented

---

## 🚨 Sync Failure Response

When inconsistencies are detected:

1. **Identify the mismatch**:
   - Which field/endpoint/type differs?
   - Backend vs frontend discrepancy

2. **Determine the source of truth**:
   - Usually backend is authoritative
   - Unless it's a backend bug

3. **Update the target**:
   - Update frontend models to match backend
   - Or fix backend if there's an error

4. **Verify end-to-end**:
   - Test the API call from frontend
   - Verify data flows correctly
   - Check error handling

5. **Update documentation**:
   - Reflect changes in Swagger/OpenAPI
   - Update any API guides or READMEs

---

## 🧪 Integration Testing

After syncing backend and frontend:

### Test API Integration:
```typescript
// Example integration test
describe('Conference API Integration', () => {
  it('should create a conference with matching types', async () => {
    const createDto: CreateConferenceDto = {
      title: 'Tech Conference 2026',
      description: 'A great tech event',
      startDate: '2026-09-01T09:00:00Z',
      endDate: '2026-09-03T17:00:00Z',
      location: 'San Francisco',
      capacity: 500  // NEW FIELD - ensure backend accepts it
    };

    const response = await apiService.createConference(createDto).toPromise();
    
    // Verify response matches Conference interface
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('capacity');
    expect(response.title).toBe(createDto.title);
  });
});
```

---

## 💡 Tips for AI Agents

- **Backend changes first, then frontend**: Make backend changes, then sync frontend to match
- **Be precise with types**: `string` vs `string | null` vs `string?` all mean different things
- **Check existing code**: Before adding a new endpoint method, check if one already exists
- **Maintain consistency**: Use the same field names, casing, and formats everywhere
- **Don't assume**: If you're unsure if types match, read both files and compare explicitly
- **Test the integration**: After syncing, suggest testing the actual API call
- **Document as you go**: Update Swagger/docs in the same commit as code changes
- **Watch for breaking changes**: Adding required fields or removing fields are breaking changes
- **Version if needed**: Consider API versioning for major breaking changes (`/api/v2/...`)

---

## 🎯 Success Criteria

API sync is complete when:

- ✅ Backend types and frontend models are identical
- ✅ All backend endpoints have corresponding frontend API service methods
- ✅ Request/response types are correctly specified
- ✅ Validation rules match on both sides
- ✅ Documentation reflects current API state
- ✅ Integration tests pass
- ✅ No TypeScript compilation errors related to API types

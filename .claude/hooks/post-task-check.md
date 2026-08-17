# Post-Task Check Hook

## Purpose
This hook ensures code quality and project hygiene after completing a task. It verifies that changes don't break existing functionality and that the codebase remains clean and maintainable.

---

## 🧪 Test Execution

### 1. Run Relevant Tests
Execute tests that cover modified code and related functionality to prevent regressions.

#### Determine Test Scope
Identify which tests to run based on changes:

- **Backend changes** (`apps/api/**`): Run API tests
- **Frontend changes** (`apps/web/**`): Run web tests
- **Shared models/types**: Run both API and web tests
- **Authentication/Authorization**: Run security-related tests
- **Database changes**: Run integration tests

---

#### Backend Tests (API)
```bash
cd apps/api

# Run all tests
npm test

# Run specific test suite
npm test -- app.test.ts

# Run tests with coverage
npm run test:coverage
```

#### Frontend Tests (Web)
```bash
cd apps/web

# Run all tests
npm test

# Run specific test suite
npm test -- profile.spec.ts

# Run tests in watch mode for iterative fixes
npm test -- --watch
```

---

#### Test Success Criteria
✅ **PASS**: All tests pass (exit code 0)  
⚠️ **WARN**: Tests pass but coverage decreased  
❌ **FAIL**: Any test failure or error

#### Common Test Issues
- **Broken tests**: Fix the tests if they're outdated, or fix the code if logic is wrong
- **Mock issues**: Update mocks to reflect new signatures or behavior
- **Async timing**: Ensure proper `async/await` or promise handling
- **Missing test data**: Update test fixtures/mocks for new fields

---

### 2. Regression Check
Specifically verify that:

- [ ] Existing features still work as expected
- [ ] No previously passing tests now fail
- [ ] No new errors appear in test output
- [ ] Authentication/authorization flows remain intact
- [ ] API contracts haven't broken existing clients

#### Action Required:
✅ **PASS**: Zero regressions detected  
❌ **FAIL**: Fix breaking changes or update tests appropriately

---

## 🧹 Code Cleanup

### 3. Remove Temporary Files
Check for and remove temporary/debug files:

#### Files to Remove:
- Debug logs: `debug.log`, `*.log`
- Temporary files: `temp.ts`, `test-*.ts`, `scratch.*`
- Editor artifacts: `.DS_Store`, `Thumbs.db`, `*.swp`
- Build artifacts in source: `*.js`, `*.js.map` in `/src` directories
- Backup files: `*.bak`, `*.orig`, `*.tmp`

#### Exceptions (Keep):
- Intentional log files in `/data` or `/logs` directories
- Test fixtures: `/test-data`, `/__mocks__`, `/__screenshots__`
- Configuration files: `.env.example`, `.env.template`

```bash
# Check for temporary files (run from project root)
Get-ChildItem -Recurse -Include *.tmp,*.bak,*.orig,debug.log,temp.* -Exclude node_modules,dist,build
```

#### Action Required:
✅ **PASS**: No temporary files found  
⚠️ **WARN**: Temporary files found but may be intentional (verify)  
❌ **FAIL**: Remove all unintentional temporary files

---

### 4. Remove Unused Imports
Clean up import statements to keep code lean and maintainable.

#### TypeScript/JavaScript
```bash
# Backend cleanup
cd apps/api
npm run lint -- --fix

# Frontend cleanup
cd apps/web
npm run lint -- --fix
```

#### Manual Check:
Look for unused imports that auto-fix may miss:
```typescript
// ❌ BAD: Unused imports
import { SomeService } from './some.service';
import { UnusedType } from './types';

// ✅ GOOD: Only what's actually used
import { ApiService } from './api.service';
```

#### Action Required:
✅ **PASS**: All imports are used  
⚠️ **WARN**: Run `--fix` to auto-remove unused imports  
❌ **FAIL**: Manually remove imports that can't be auto-fixed

---

### 5. Remove Dead Code
Identify and remove unreachable or unused code.

#### Check for:
- **Commented-out code blocks**: Remove or document why kept
- **Unused functions/methods**: Delete if not part of public API
- **Unreachable code**: Code after `return`, `throw`, or unconditional branches
- **Unused variables**: Parameters or locals that are never read
- **Obsolete implementations**: Old code replaced by new logic

#### Examples:
```typescript
// ❌ BAD: Dead code
function processUser(user: User) {
  return user.name;
  console.log('This never runs'); // Unreachable
}

// ❌ BAD: Unused function
function oldGetUsers() { // No callers
  // ... old implementation
}

// ❌ BAD: Commented-out code
// function deprecatedFeature() {
//   // ... 50 lines of old code
// }

// ✅ GOOD: Clean, used code
function processUser(user: User) {
  return user.name;
}
```

#### Action Required:
✅ **PASS**: No dead code detected  
⚠️ **WARN**: Found commented code with explanation (e.g., "Temporarily disabled for debugging")  
❌ **FAIL**: Remove all dead code

---

### 6. Console & Debug Statements
Remove or properly guard debug statements.

#### Check for:
```typescript
// ❌ Remove these:
console.log('Debug:', variable);
console.dir(object);
debugger;
// TODO: remove this
```

#### Allowed (Intentional Logging):
```typescript
// ✅ Production logging (structured)
logger.info('User logged in', { userId });
logger.error('Database error', { error });

// ✅ Development-only (properly guarded)
if (process.env.NODE_ENV === 'development') {
  console.log('Dev mode data:', data);
}
```

#### Action Required:
✅ **PASS**: No debug statements or properly guarded  
❌ **FAIL**: Remove or guard all debug statements

---

## 📋 Post-Task Checklist

After completing any task, verify:

- [ ] All relevant tests pass (backend and/or frontend)
- [ ] No test regressions introduced
- [ ] Test coverage maintained or improved
- [ ] Temporary files removed
- [ ] Unused imports cleaned up
- [ ] Dead code removed
- [ ] Console/debug statements removed or guarded
- [ ] Code is production-ready

---

## 🚨 Failure Response

If any check fails:

1. **Document the failure** with specific details
2. **Fix the issue** before marking task complete
3. **Re-run tests** after fixes
4. **Verify cleanup** was successful
5. Only mark task complete when **all checks pass**

---

## 💡 Tips for AI Agents

- **Run tests early and often** during development, not just at the end
- **Read test failure messages carefully** - they often indicate exactly what's broken
- **Update tests when intentionally changing behavior** - don't just make tests pass without understanding why they failed
- **Be thorough with cleanup** - temporary debug code left behind accumulates over time
- **Use linting tools** - they catch most unused imports and simple issues automatically
- **Preserve intentional logging** - production logging is different from debug `console.log`
- **Consider side effects** - cleanup should not remove code that's used elsewhere

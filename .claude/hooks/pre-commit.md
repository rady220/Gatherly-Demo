# Pre-Commit Hook

## Purpose
This hook ensures code quality, security, and build integrity before any code changes are finalized. All checks must pass before considering a task complete.

---

## 🔒 Security Checks

### 1. Prevent Hardcoded Secrets
**CRITICAL**: Scan all modified files for sensitive information.

#### Check for:
- **API Keys**: `api_key`, `apiKey`, `API_KEY`, `x-api-key`
- **Secrets**: `secret`, `SECRET`, `password`, `PASSWORD`, `passwd`
- **Tokens**: `token`, `TOKEN`, `auth_token`, `access_token`, `refresh_token`
- **Connection Strings**: 
  - Database: `mongodb://`, `postgresql://`, `mysql://`, `Server=`, `Data Source=`
  - Redis: `redis://`
  - Any connection string with embedded credentials
- **Private Keys**: `private_key`, `PRIVATE_KEY`, `-----BEGIN`, `-----END`
- **AWS Credentials**: `aws_access_key`, `aws_secret`, `AWS_ACCESS_KEY_ID`
- **JWT Secrets**: `jwt_secret`, `jwtSecret`, `JWT_SECRET`

#### Exceptions (Allowed):
- Environment variable references: `process.env.API_KEY`, `Environment.GetEnvironmentVariable("SECRET")`
- Configuration placeholders: `<your-api-key>`, `YOUR_SECRET_HERE`, `example.com`
- Test mocks with clearly fake values: `test-token-12345`, `mock-api-key`
- Comments explaining where to set secrets

#### Action Required:
✅ **PASS**: All secrets are externalized to environment variables or secure configuration  
❌ **FAIL**: Halt commit, prompt user to move secrets to `.env` or Azure Key Vault

---

## 📝 Code Syntax & Style

### 2. Syntax Validation
Run language-specific syntax checks:

#### TypeScript/JavaScript
```bash
# Backend (API)
cd apps/api
npm run lint

# Frontend (Web)
cd apps/web
npm run lint
```

#### Action Required:
✅ **PASS**: Zero linting errors  
⚠️ **WARN**: Report warnings but allow commit  
❌ **FAIL**: Fix all syntax errors before proceeding

---

### 3. Naming Conventions

Verify adherence to project standards:

#### TypeScript/JavaScript
- **Files**: 
  - Components: `kebab-case.ts` (e.g., `create-conference-dialog.ts`)
  - Services: `kebab-case.service.ts` (e.g., `api.service.ts`)
  - Routes: `kebab-case.routes.ts` (e.g., `auth.routes.ts`)
  
- **Classes**: `PascalCase` (e.g., `ConferenceService`, `AuthGuard`)
- **Interfaces/Types**: `PascalCase` (e.g., `User`, `Conference`)
- **Functions/Methods**: `camelCase` (e.g., `getUsers()`, `validateToken()`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`, `MAX_RETRIES`)
- **Variables**: `camelCase` (e.g., `userId`, `isAuthenticated`)

#### Action Required:
✅ **PASS**: All names follow conventions  
⚠️ **WARN**: Document any intentional deviations  
❌ **FAIL**: Rename files/symbols to match standards

---

## 🏗️ Build Verification

### 4. Compilation Check
Ensure the project builds successfully with **zero errors**.

#### Backend Build
```bash
cd apps/api
npm run build
```

#### Frontend Build
```bash
cd apps/web
npm run build
```

#### Expected Output:
- **Exit code**: 0
- **Errors**: 0
- **Warnings**: Acceptable (document if new warnings introduced)

#### Common Issues to Check:
- Missing imports
- Type mismatches
- Undefined variables/functions
- Circular dependencies
- Missing dependencies in `package.json`

#### Action Required:
✅ **PASS**: Build completes successfully (exit code 0)  
❌ **FAIL**: Fix all compilation errors, re-run build until clean

---

## 📋 Pre-Commit Checklist

Before finalizing any code changes, verify:

- [ ] No hardcoded secrets, API keys, or connection strings
- [ ] All sensitive data uses environment variables
- [ ] Code passes linting checks (zero errors)
- [ ] Naming conventions are followed
- [ ] Backend builds successfully (apps/api)
- [ ] Frontend builds successfully (apps/web)
- [ ] Zero compilation errors
- [ ] New warnings are documented and justified

---

## 🚨 Failure Response

If any check fails:

1. **Stop immediately** - Do not proceed with commit
2. **Report specific failures** to the user with clear error messages
3. **Provide actionable remediation steps**
4. **Re-run all checks** after fixes are applied
5. **Only proceed** when all checks pass

---

## 💡 Tips for AI Agents

- Always run checks in the **correct project directory** (`apps/api` or `apps/web`)
- Use `npm run` commands rather than raw `tsc` or `ng` commands
- When secrets are found, suggest specific `.env` variable names
- If build fails, read the full error output to diagnose root cause
- Remember: **Security > Speed** - Never skip security checks to save time

# Database Concurrency and Transactions

Standards for atomic store operations, transaction boundaries, optimistic concurrency, and race-safe backend behavior.

## When to Use

Reference this skill when changing `apps/api/src/db/store.ts`, writing multi-step persistence operations, allocating limited resources, or handling competing writes in Node.js.

---

## Patterns

### Define transaction boundaries around one business operation

A transaction must cover every read and write that must succeed or fail together. Begin and commit/rollback it in the service/store method that owns the business operation; pass the transaction client to lower-level store functions rather than opening nested independent transactions.

```typescript
type DbClient = TransactionClient | DatabaseClient;

export async function createRegistration(input: CreateRegistrationInput) {
  return db.transaction(async (tx) => {
    const conference = await getConferenceById(input.conferenceId, tx);
    if (!conference) throw new NotFoundError('Conference not found');
    if (conference.remainingCapacity < 1) throw new ConflictError('Conference is full');

    const registration = await insertRegistration(input, tx);
    await decrementCapacity(conference.id, tx);
    return registration;
  });
}
```

- Store functions accept an optional/client parameter so all work shares the same transaction.
- Keep transaction callbacks short: no HTTP calls, emails, file work, or slow computation inside them.
- Roll back by throwing; translate driver-specific errors at the store boundary into application errors.
- Use the database's documented transaction/isolation API. Do not emulate transactions with application-level flags.

### Use optimistic concurrency for competing updates

Add a `version` or `updatedAt` concurrency token to mutable records. Update only when the client/read version matches, and treat zero affected rows as a conflict.

```typescript
export async function updateConference(
  id: string,
  expectedVersion: number,
  patch: UpdateConferenceInput,
): Promise<Conference> {
  const updated = await db.conferences.updateWhere({
    where: { id, version: expectedVersion },
    data: { ...patch, version: expectedVersion + 1 },
  });

  if (!updated) {
    throw new ConflictError('Conference was changed by another request');
  }
  return updated;
}
```

- Return `409 CONFLICT` with code `CONFLICT` for stale writes, capacity exhaustion, or uniqueness races that are valid business conflicts.
- Require clients to send the version for edits where overwriting a concurrent update is unsafe. Alternatively use HTTP `ETag` / `If-Match` consistently.
- For inventory/counters, prefer an atomic conditional update such as `remainingCapacity > 0` rather than read-then-write logic.

### Make races safe and test them

- Let database unique constraints enforce uniqueness; catch and map duplicate-key errors to `409`, never rely only on a prior existence check.
- Use row locks or a serializable transaction only for the narrow critical section that requires them. Handle serialization/deadlock failures with bounded retries when the driver supports it.
- Make retried writes idempotent with a request/idempotency key where clients may retry after timeouts.
- Test concurrent requests with Vitest using a barrier or `Promise.all`, asserting one succeeds and conflicts are returned safely.

```typescript
const results = await Promise.allSettled([
  registerForConference(input),
  registerForConference(input),
]);
expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
```

---

## Anti-patterns

```typescript
// ❌ Race: both requests can observe one remaining seat.
const conference = await getConferenceById(id);
if (conference.remainingCapacity > 0) {
  await updateCapacity(id, conference.remainingCapacity - 1);
}

// ✅ Use a conditional atomic update or transaction.
const updated = await decrementCapacityIfAvailable(id);
if (!updated) throw new ConflictError('Conference is full');

// ❌ Each function creates its own transaction; atomicity is lost.
await createOrder();
await decrementInventory();

// ✅ One owner shares one transaction client.
await db.transaction((tx) => createOrderAndReserveInventory(input, tx));

// ❌ Check then insert without a unique constraint.
if (!(await findByEmail(email))) await insertUser(email);

// ✅ Enforce uniqueness in the database and map duplicate errors to ConflictError.
```

---

## References

- `apps/api/src/db/store.ts`
- `apps/api/src/routes/`
- `apps/api/src/types.ts`
- `.claude/skills/async-error-handling.md`
- `.claude/skills/testing-standards.md`
- [Node.js race conditions](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/)

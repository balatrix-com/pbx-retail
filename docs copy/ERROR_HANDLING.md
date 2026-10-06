# Production Guide: Error Handling & Troubleshooting

This document covers critical errors that can occur in production, their root causes, and how to diagnose and fix them.

---

## Table of Contents
1. [Error Response Format](#1-error-response-format)
2. [Authentication & Authorization Errors](#2-authentication--authorization-errors)
3. [Billing & Stripe Errors](#3-billing--stripe-errors)
4. [Sub-Billing API Errors](#4-sub-billing-api-errors)
5. [Telecom & FreeSWITCH Errors](#5-telecom--freeswitch-errors)
6. [Redis Errors](#6-redis-errors)
7. [Database (PostgreSQL / Prisma) Errors](#7-database-postgresql--prisma-errors)
8. [WebSocket (Monitor) Errors](#8-websocket-monitor-errors)
9. [Rate Limiting Errors](#9-rate-limiting-errors)
10. [File Upload Errors](#10-file-upload-errors)
11. [Idempotency Errors](#11-idempotency-errors)
12. [Service Enforcement Errors](#12-service-enforcement-errors)
13. [Production Monitoring Checklist](#13-production-monitoring-checklist)
14. [Common Dev Setup Mistakes](#14-common-dev-setup-mistakes)

---

## 1. Error Response Format

All errors in the system use this standardized format, produced by the global `HttpExceptionFilter`:

```json
{
  "statusCode": 403,
  "message": "Plan expired",
  "error": "Forbidden",
  "timestamp": "2024-10-06T11:30:00.000Z",
  "path": "/api/telecom/dids"
}
```

Validation errors (from `ValidationPipe`) return an array of messages:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be at least 8 characters"],
  "error": "Bad Request",
  "timestamp": "...",
  "path": "..."
}
```

**Logging**:
- `5xx` errors → Logged with full stack trace (`logger.error()`)
- `4xx` errors → Logged as warnings without stack trace (`logger.warn()`)

---

## 2. Authentication & Authorization Errors

### `401 Unauthorized` — "Unauthorized"
**Cause**: Missing, expired, or malformed JWT token in the `Authorization: Bearer <token>` header.

**Fix**:
1. Ensure the frontend includes the token on every protected request.
2. If the token is expired, the frontend should call `POST /auth/refresh` to get a new one.
3. Check `JWT_SECRET` env var is the same on all backend instances (inconsistency causes token verification failures in scaled setups).

---

### `401 Unauthorized` — Login failure
**Cause**: Wrong email/password combination.

**Production Tip**: Do not expose whether the email exists. The auth service should return the same message for both "no account" and "wrong password" to prevent user enumeration attacks.

---

### `403 Forbidden` — "USER_SUSPENDED"
**Cause**: The user's account has been suspended by an admin.

**Fix**: An Admin or Super Admin must un-suspend the user via `PATCH /users/:id`.

---

### `403 Forbidden` — "TENANT_SUSPENDED"
**Cause**: The tenant's `serviceBlocked` field is set to `true`.

**Fix**: Super Admin must update the tenant via `PATCH /admin/tenants/:id` with `{ "serviceBlocked": false }`.

---

### `403 Forbidden` — "ADMIN_SUSPENDED"
**Cause**: A Support user's managing Admin account has been suspended.

**Fix**: Un-suspend the Admin, or reassign the Support user to a different Admin.

---

### JWT Token Signed with Different Secret (Cross-Instance)
**Symptom**: `401 Unauthorized` errors on some requests in a load-balanced deployment.

**Cause**: Multiple backend instances are using different `JWT_SECRET` values (e.g., auto-generated secrets instead of a fixed one).

**Fix**: Set `JWT_SECRET` and `JWT_REFRESH_SECRET` as fixed values in the deployment environment, shared across all instances.

---

## 3. Billing & Stripe Errors

### `500 Internal Server Error` — "Stripe not configured"
**Cause**: `STRIPE_SECRET_KEY` environment variable is missing or empty.

**Fix**: Set `STRIPE_SECRET_KEY` in your `.env` file. The app starts in **Mock Mode** if the key is absent (useful for local development without Stripe).

**Mock Mode Behavior**: Charges return a fake `ch_mock_*` ID. Checkouts return `https://checkout.stripe.com/mock-session`. No real money moves.

---

### `400 Bad Request` — "Webhook Error: No signatures found matching the expected signature"
**Cause**: Stripe webhook signature verification failed.

**Common Causes**:
1. `STRIPE_WEBHOOK_SECRET` is incorrect.
2. The webhook URL in Stripe Dashboard doesn't match the actual URL.
3. A proxy (Nginx, load balancer) is modifying the request body before it reaches NestJS.
4. The raw body preservation code in `main.ts` has been accidentally removed or modified.

**Fix**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches what's in Stripe Dashboard > Webhooks > Signing Secret.
2. Confirm the `/api/billing/webhook` route is **NOT** behind a body-transforming proxy.
3. Never add `JwtAuthGuard` to the webhook endpoint — Stripe sends no auth headers.
4. If testing locally, use [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3000/api/billing/webhook`

---

### `400 Bad Request` — "Charge failed: Your card was declined"
**Cause**: The tenant's saved card was declined by Stripe during an off-session payment.

**Fix**:
- Ask the tenant to update their payment method via the Billing page.
- Investigate via Stripe Dashboard for the specific decline reason (funds, fraud, etc.).

---

### `400 Bad Request` — "No payment method configured"
**Cause**: The tenant has no default payment method set on their Stripe customer.

**Fix**:
- Tenant must go through the checkout flow (`POST /billing/create-checkout`) to add a card.
- Check if the `setup_intent.succeeded` webhook was received and processed correctly.

---

## 4. Sub-Billing API Errors

### `400 Bad Request` — "Tenant not linked to a billing system customer"
**Cause**: The tenant's `subBillingCustomerId` field is `null` in the database.

**Root Cause**: The Sub-Billing customer creation step during onboarding failed (network issue, Sub-Billing API was down).

**Fix**:
1. Check Sub-Billing service status.
2. Manually trigger customer creation:
   ```
   POST /admin/tenants/:id/create-sub-billing-customer
   ```
3. Or call `WalletService.createSubBillingCustomer()` via a script.

---

### `400 Bad Request` — "Failed to adjust balance: ..."
**Cause**: The Sub-Billing API returned an error during balance adjustment.

**Diagnosis**:
1. Check NestJS logs for the detailed error from Sub-Billing.
2. Verify `SUB_BILLING_API_URL` is correct and the service is reachable.
3. Check if the customer exists in Sub-Billing for the given `customerId`.

---

### Sub-Billing API Down / Network Timeout
**Symptom**: `GET /wallet/balance` returns an error or stale data.

**Built-in Fallback**: `WalletService.getBalance()` falls back to the local PostgreSQL `Wallet` table when Sub-Billing is unreachable. However, this balance may be stale.

**Fix**: Restore Sub-Billing service connectivity. The system auto-recovers on the next request.

---

## 5. Telecom & FreeSWITCH Errors

### Extension or DID routing not working after update
**Symptom**: Calls still route to the old destination after updating DID/extension settings.

**Cause**: FreeSWITCH dialplan cache was not flushed, or the sync to FreeSWITCH DB failed.

**Diagnosis**:
1. Check NestJS logs for `FreeSwitchSyncService` errors.
2. Check `FREESWITCH_DB_URL` is configured and the DB is reachable.
3. Check if the `CacheFlushService.flushCustomer()` call succeeded.

**Fix**:
- Manually re-trigger sync (currently requires code or admin API).
- If cache flush fails, `sofia reload profile internal` in FreeSWITCH console forces a cache reload.
- Verify `FREESWITCH_DB_URL` PostgreSQL credentials.

---

### `403 Forbidden` — "Plan expired" when creating extension
**Cause**: The tenant has no active subscription in the `subscriptions` table.

**Fix**:
1. Super Admin must subscribe the tenant to a plan via `POST /wallet/subscription/switch`.
2. If Sub-Billing is the source of truth, ensure the plan switch was reflected locally.

---

### SIP Registration Failing for Extensions
**Symptom**: Desk phones or softphones cannot register with the SIP server.

**Cause**: Kamailio `subscriber` table was not updated when the extension was created/updated.

**Diagnosis**:
1. Check NestJS logs for `KamailioDBService.syncSubscriber()` errors.
2. Check `KAMAILIO_DB_URL` environment variable.
3. Query Kamailio DB: `SELECT * FROM subscriber WHERE username = '1001';`

**Fix**:
- Verify `KAMAILIO_DB_URL` is correct.
- Re-save the extension (trigger a PATCH) to force re-sync.
- Check that the SIP password matches what's stored in the Kamailio subscriber table.

---

### `403 Forbidden` — "Call recording feature is not allowed for your tenant"
**Cause**: `TenantFeature.recordingAllowed` is `false` for the tenant.

**Fix**: Super Admin must enable recording for the tenant via the admin panel or by updating `tenant_features` record directly: `recordingAllowed = true`.

---

### Inbound calls not being received (Firewall/Whitelist issue)
**Symptom**: Carrier sends calls but FreeSWITCH never receives the SIP INVITE.

**Cause**: The carrier's source IP is not in the `inbound_whitelist` table, causing the firewall or SIP proxy to drop the packets.

**Fix**:
1. Find the carrier's published SIP source IPs.
2. Add them to the `inbound_whitelist` via:
   ```
   POST /admin/inbound-whitelist
   { "ipAddress": "1.2.3.4", "port": 5060, "tag": "Telnyx Inbound" }
   ```

---

## 6. Redis Errors

### Call monitoring stops working / WebSocket events not arriving
**Symptom**: Live call dashboard shows no events despite active calls.

**Cause**: Redis `calls_stream` subscription dropped (Redis connection lost or restarted).

**Diagnosis**:
1. Check NestJS logs for Redis subscriber errors.
2. Verify Redis is running: `redis-cli ping` should return `PONG`.
3. Check `REDIS_URL` environment variable.
4. In the MonitorGateway, the subscription to `calls_stream` is established in `afterInit()`. If Redis was down at startup, the subscription is never created.

**Fix**:
1. Restore Redis connection.
2. **Restart the NestJS application** so `afterInit()` re-runs and re-establishes the subscription.
3. In production, use Redis Sentinel or Redis Cluster for high availability.

**Production Alert**: Set up monitoring on Redis connection pool health and memory usage.

---

### Redis LookupRedis Cache Stale
**Symptom**: New extensions don't work in routing lookups.

**Cause**: `LookupRedisService.updateExtensionLookup()` failed or was not called after extension creation.

**Fix**: Extensions are synced automatically. If the issue persists, check `REDIS_URL` and connectivity.

---

### Rate Limit Errors from Redis
**Symptom**: `429 Too Many Requests` for legitimate traffic.

**Cause**: `ThrottlerModule` is backed by Redis and enforces 300 req/min per client IP.

**Fix**:
- Ensure `REDIS_URL` points to a high-availability Redis instance.
- If you run multiple NestJS instances, they all share the rate limit count through Redis, which is the intended behavior.
- Adjust throttler config in `app.module.ts` if limits are too aggressive for your traffic patterns.

---

## 7. Database (PostgreSQL / Prisma) Errors

### "Timed out fetching a new connection from the connection pool"
**Cause**: All database connections are in use. Common under high traffic or long-running transactions.

**Fix**:
1. Add connection pool limit to `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=50&pool_timeout=10"
   ```
2. Use **PgBouncer** as a connection pooler in front of PostgreSQL.
3. Review long-running queries with `pg_stat_activity`.
4. Keep all database transactions as short as possible — avoid business logic inside `prisma.$transaction()`.

---

### "Unique constraint failed" on `users.email`
**Cause**: Attempting to create a user with an already-registered email.

**Fix**: Return `409 Conflict` to the client. The auth service should catch `Prisma.PrismaClientKnownRequestError` with code `P2002` and throw `ConflictException`.

---

### "Foreign key constraint failed"
**Cause**: Attempting to delete a parent record (e.g., Tenant) when child records still exist.

**Fix**: Delete child records first (cascade is configured for some relations) or use Prisma's `onDelete: Cascade`. Check the schema for explicit cascade rules.

---

### Migration Failures in Production
**Symptom**: `npx prisma migrate deploy` fails.

**Cause**: Pending migration SQL conflicts with existing data or schema state.

**Fix**:
1. Never run `prisma db push` in production (it can drop data). Always use `prisma migrate deploy`.
2. Back up the database before running migrations.
3. Test migrations on a staging environment first.
4. If a migration fails, check `_prisma_migrations` table for the failed entry and fix the SQL manually.

---

## 8. WebSocket (Monitor) Errors

### Client receives "Unauthorized" on connection
**Cause**: JWT token was not sent in the connection handshake, or the token is expired.

**Fix**:
```javascript
// Correct way to connect
const socket = io(backendUrl, {
  path: '/api/socket.io',
  auth: { token: accessToken },  // <-- Must be here
  namespace: 'monitor'
});
```

---

### Client receives "Unauthorized tenant access" on `join_room`
**Cause**: A non-SUPER_ADMIN user is trying to join a room for a different tenant.

**Fix**: Ensure the frontend sends the correct `tenantId` (their own). Super Admins can send `"all"` to monitor all tenants.

---

### WebSocket connection drops frequently
**Cause**: Nginx proxy timeout for WebSocket connections.

**Fix**: Add to your Nginx config:
```nginx
location /api/socket.io/ {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;  # 1 hour
    proxy_send_timeout 3600s;
}
```

---

## 9. Rate Limiting Errors

### `429 Too Many Requests`
**Cause**: Client exceeded 300 requests per 60 seconds.

**Response Body**:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "...",
  "path": "..."
}
```

**Fix for Legitimate Traffic**:
- Implement request batching on the frontend.
- Add debouncing to search inputs.
- Adjust `ThrottlerModule` config in `app.module.ts` if the limit is too low.

**Fix for Attacks**:
- Add IP-based blocking at the Nginx/WAF level before traffic reaches NestJS.

---

## 10. File Upload Errors

### Audio file upload fails (413 Payload Too Large)
**Cause**: File exceeds the configured Multer size limit.

**Fix**:
1. Check the Multer size limit in the audio upload controller.
2. If using Nginx, increase `client_max_body_size`:
   ```nginx
   client_max_body_size 20M;
   ```

### Audio files not accessible in production (404 on `/api/uploads/...`)
**Cause**: In a multi-instance deployment, files uploaded to Instance A are not available on Instance B.

**Fix**: Migrate audio storage to a shared volume (NFS) or an object storage service (AWS S3, Cloudflare R2). Update `storageUrl` in the `AudioFile` record to point to the CDN URL.

---

## 11. Idempotency Errors

### `409 Conflict` — Duplicate request
**Cause**: A request was submitted with an `Idempotency-Key` header that was already used.

**Current Implementation**: The `IdempotencyInterceptor` uses an in-memory Map (not Redis) to store used keys. This means:
- Keys are **not persisted** across server restarts.
- Keys are **not shared** across multiple NestJS instances.

**Production Risk**: In a multi-instance deployment, the same `Idempotency-Key` could be processed twice on different instances.

**Fix for Production**: Replace the in-memory `idempotencyStore` in `IdempotencyInterceptor` with Redis:
```typescript
// Store key in Redis with a TTL
await redisClient.set(`idem:${key}`, JSON.stringify(response), { EX: 86400 }); // 24h TTL
```

---

## 12. Service Enforcement Errors

### `403 Forbidden` — "Plan expired"
**Cause**: No active subscription found for the tenant.

**What is blocked**: Creating extensions, purchasing DIDs/TFNs, accessing monitoring.

**What still works**: Logging in, viewing billing, adding payment methods, topping up wallet.

**Fix**: Subscribe the tenant to a plan.

---

### `403 Forbidden` — "Wallet negative"
**Cause**: Wallet balance has gone below zero (usage exceeded balance).

**What is blocked**: Purchasing new numbers, creating resources.

**Fix**: Top up the wallet.

---

### `403 Forbidden` — "Insufficient funds to purchase TFN/DID"
**Cause**: Wallet balance is less than the price of the number being purchased.

**Fix**: Top up the wallet before purchasing.

---

## 13. Production Monitoring Checklist

### Services to Monitor

| Service             | What to Alert On                                               |
|---------------------|----------------------------------------------------------------|
| NestJS API          | HTTP 5xx error rate > 1%, response time > 2s                  |
| PostgreSQL (main)   | Connection pool > 80%, query time > 500ms, replication lag     |
| Redis               | Memory usage > 80%, connection drops, latency > 10ms           |
| Sub-Billing API     | Response time > 3s, connection errors                          |
| FreeSWITCH DB       | Connection errors, dialplan sync failures                      |
| Stripe Webhooks     | Failed webhook deliveries in Stripe Dashboard                  |

### Key Logs to Watch

```bash
# Watch for critical errors
grep '"level":"error"' /var/log/nestjs/app.log | tail -f

# Watch for Stripe webhook failures
grep 'Webhook Error' /var/log/nestjs/app.log

# Watch for FreeSWITCH sync failures
grep 'FreeSWITCH sync failed' /var/log/nestjs/app.log

# Watch for Sub-Billing failures
grep 'Failed to.*sub-billing\|Sub Billing.*failed' /var/log/nestjs/app.log
```

### Health Endpoint

```
GET /api/health
```

Returns `200 OK` if the service is healthy.

---

## 14. Common Dev Setup Mistakes

| Mistake                                    | Symptom                                                | Fix                                                          |
|--------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------|
| Missing `DATABASE_URL`                     | App crashes on startup                                  | Copy `.env.example` to `.env` and fill values               |
| Missing `REDIS_URL`                        | WebSocket monitoring does not work                     | Start Redis: `docker run -p 6379:6379 redis`                 |
| Missing `SUB_BILLING_API_URL`             | All wallet/billing calls fail                           | Set URL or run Sub-Billing service locally                   |
| Missing `STRIPE_SECRET_KEY`               | Stripe in Mock Mode — no real payments                  | Add Stripe test key from Stripe Dashboard                    |
| Missing `STRIPE_WEBHOOK_SECRET`           | Webhook signature verification fails                    | Use Stripe CLI for local testing                             |
| Not running `npx prisma db push`          | Database tables don't exist                             | Run `npx prisma db push` from `/backend`                     |
| Not running `npm run seed:ratecards`      | No rate cards → billing calculations fail              | Run seed scripts as documented in README                     |
| Frontend `VITE_API_URL` wrong             | All API calls 404                                       | Set `VITE_API_URL=http://localhost:3000/api` in `/frontend/.env` |
| Uploading large audio files without Nginx | 413 errors or timeouts                                  | Configure `client_max_body_size 20M` in Nginx               |
| FreeSWITCH DB not configured              | Extensions/DIDs don't ring                              | Set `FREESWITCH_DB_URL` to point to FS PostgreSQL DB         |

# API Reference

> Base URL: `http://localhost:3000/api` (development) | `https://yourdomain.com/api` (production)
>
> All protected endpoints require `Authorization: Bearer <access_token>` header.
> All request/response bodies are `Content-Type: application/json`.

---

## Table of Contents
1. [Authentication (`/auth`)](#authentication-auth)
2. [Tenants (`/tenants`)](#tenants-tenants)
3. [Users (`/users`)](#users-users)
4. [Telecom — DIDs (`/telecom/dids`)](#telecom--dids)
5. [Telecom — TFNs (`/telecom/tfns`)](#telecom--tfns)
6. [Telecom — Extensions (`/telecom/extensions`)](#telecom--extensions)
7. [Telecom — Ring Groups (`/telecom/ring-groups`)](#telecom--ring-groups)
8. [Telecom — IVRs (`/telecom/ivrs`)](#telecom--ivrs)
9. [Telecom — Schedules (`/telecom/schedules`)](#telecom--schedules)
10. [Telecom — Audio Files (`/telecom/audio`)](#telecom--audio-files)
11. [Telecom — Routing & Monitoring](#telecom--routing--monitoring)
12. [Wallet (`/wallet`)](#wallet-wallet)
13. [Billing (`/billing`)](#billing-billing)
14. [Plans (`/plans`)](#plans-plans)
15. [Admin (`/admin`)](#admin-admin)
16. [Monitor (WebSocket)](#monitor-websocket)
17. [Standard Error Responses](#standard-error-responses)

---

## Authentication (`/auth`)

### POST `/auth/signup`
Registers a new tenant admin user and creates the tenant.

**Auth Required**: No

**Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "tenantName": "Acme Corp"
}
```

**Response** `201 Created`:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "name": "John Doe",
    "role": "ADMIN",
    "tenantId": "tenant-uuid"
  }
}
```

---

### POST `/auth/login`
Authenticates a user with email/password.

**Auth Required**: No (uses Local Auth Guard with email/password)

**Request Body**:
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response** `200 OK`:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { "id": "...", "role": "ADMIN", "tenantId": "..." }
}
```

**Errors**:
- `401 Unauthorized` — Invalid credentials

---

### GET `/auth/me`
Returns the currently authenticated user's profile.

**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "email": "admin@company.com",
  "name": "John Doe",
  "role": "ADMIN",
  "tenant": { "id": "...", "name": "Acme Corp" },
  "monitoringEnabled": false
}
```

---

### POST `/auth/refresh`
Issues a new access token using a valid refresh token.

**Auth Required**: Yes (Refresh Token in Authorization header)

**Response** `200 OK`:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

---

### POST `/auth/logout`
Revokes the current user's refresh token.

**Auth Required**: Yes

**Response** `200 OK`: `{ "success": true }`

---

### POST `/auth/forgot-password`
Sends a password reset email.

**Auth Required**: No

**Request Body**: `{ "email": "user@example.com" }`

**Response** `200 OK`: `{ "message": "If that email exists, a reset link was sent." }`

---

### GET `/auth/verify-reset-token?token=<token>`
Validates a password reset token.

**Auth Required**: No

**Response** `200 OK`: `{ "valid": true }`

---

### POST `/auth/reset-password`
Resets the password using a valid reset token.

**Auth Required**: No

**Request Body**:
```json
{
  "token": "reset-token-value",
  "newPassword": "NewSecurePass123!"
}
```

**Response** `200 OK`: `{ "success": true }`

---

### POST `/auth/end-impersonation`
Ends an active impersonation session and returns to the Super Admin token.

**Auth Required**: Yes (must be in an impersonation session)

---

### PATCH `/auth/me`
Updates the authenticated user's profile.

**Auth Required**: Yes

**Request Body**:
```json
{
  "name": "Jane Doe"
}
```

---

## Tenants (`/tenants`)

### GET `/tenants/my`
Returns the current user's tenant details.

**Auth Required**: Yes

---

### PATCH `/tenants/my`
Updates tenant profile (name, settings).

**Auth Required**: Yes (ADMIN role)

---

### GET `/tenants/my/features`
Returns the feature flags and limits for the current tenant.

**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "ivrEnabled": true,
  "ivrLimit": 10,
  "ringGroupEnabled": true,
  "ringGroupLimit": 10,
  "schedulerEnabled": true,
  "didForwardEnabled": true,
  "monitorEnabled": true,
  "recordingEnabled": false,
  "recordingAllowed": false
}
```

---

## Users (`/users`)

### GET `/users`
Lists all users under the current tenant.

**Auth Required**: Yes (ADMIN)

**Response**: Array of user objects.

---

### POST `/users`
Creates a new user under the current tenant.

**Auth Required**: Yes (ADMIN)

**Request Body**:
```json
{
  "email": "support@company.com",
  "name": "Support Staff",
  "role": "SUPPORT"
}
```

---

### GET `/users/:id`
Returns a specific user.

**Auth Required**: Yes

---

### PATCH `/users/:id`
Updates a user (name, role, status).

**Auth Required**: Yes (ADMIN)

---

### DELETE `/users/:id`
Soft-deletes a user (sets status to DELETED).

**Auth Required**: Yes (ADMIN)

---

### POST `/users/:id/invite`
Sends or resends an invitation email to a user.

**Auth Required**: Yes (ADMIN)

---

## Telecom — DIDs

### GET `/telecom/dids`
Lists all DIDs assigned to the current tenant.

**Auth Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "number": "+12025551234",
    "routeType": "ivr",
    "routeTargetId": "ivr-uuid",
    "forwardEnabled": false,
    "monthlyFee": "2.00"
  }
]
```

---

### POST `/telecom/dids/:id/routing`
Updates the call routing configuration for a DID.

**Auth Required**: Yes

**Request Body**:
```json
{
  "routeType": "ring_group",
  "routeTargetId": "ring-group-uuid"
}
```
or for simple forwarding:
```json
{
  "forwardEnabled": true,
  "forwardNumber": "+14155551234"
}
```

**Valid `routeType` values**: `extension`, `ring_group`, `ivr`, `schedule`, `forward`, `did_forward`

---

## Telecom — TFNs

### GET `/telecom/tfns/search`
Lists all available (unassigned) Toll-Free Numbers.

**Auth Required**: Yes

---

### GET `/telecom/tfns/mine`
Lists all TFNs assigned to the current tenant.

**Auth Required**: Yes

---

### POST `/telecom/tfns/purchase`
Purchases a TFN for the current tenant (deducts wallet balance).

**Auth Required**: Yes (SUPER_ADMIN only)

**Request Body**:
```json
{
  "number": "+18005551234",
  "targetTenantId": "tenant-uuid"  // optional, for super admin
}
```

**Errors**:
- `403 Forbidden` — Plan expired or wallet negative
- `403 Forbidden` — Insufficient funds
- `400 Bad Request` — TFN not available

---

### POST `/telecom/tfns/:id/routing`
Updates TFN routing configuration.

**Auth Required**: Yes

**Request Body**: Same as DID routing.

---

## Telecom — Extensions

### GET `/telecom/extensions`
Lists all extensions for the current tenant.

**Auth Required**: Yes

**Response**:
```json
[
  {
    "id": "uuid",
    "extensionNumber": "1001",
    "name": "John's Phone",
    "sipUsername": "1001@sip.example.com",
    "sipPassword": "abc123",
    "sipAuthRealm": "sip.example.com",
    "recordingEnabled": false,
    "forwardAllEnabled": false
  }
]
```

---

### POST `/telecom/extensions`
Creates a new extension.

**Auth Required**: Yes

**Request Body**:
```json
{
  "extensionNumber": "1002",
  "name": "Jane's Phone",
  "sipPassword": "securepassword"
}
```

**Errors**:
- `400 Bad Request` — Extension number already exists for this tenant
- `403 Forbidden` — Plan expired

---

### PATCH `/telecom/extensions/:id`
Updates extension settings (forwarding, name, recording).

**Auth Required**: Yes

---

### DELETE `/telecom/extensions/:id`
Deletes an extension and removes it from FreeSWITCH/Kamailio.

**Auth Required**: Yes

---

## Telecom — Ring Groups

### GET `/telecom/ring-groups`
Lists all ring groups for the tenant.

**Auth Required**: Yes

---

### POST `/telecom/ring-groups`
Creates a new ring group.

**Auth Required**: Yes

**Request Body**:
```json
{
  "name": "Sales Team",
  "strategy": "simultaneous",
  "ringTimeout": 30,
  "members": ["extension-uuid-1", "extension-uuid-2"]
}
```

---

### PATCH `/telecom/ring-groups/:id`
Updates ring group configuration and members.

**Auth Required**: Yes

---

### DELETE `/telecom/ring-groups/:id`
Deletes a ring group.

**Auth Required**: Yes

---

## Telecom — IVRs

### GET `/telecom/ivrs`
Lists all IVRs for the tenant.

**Auth Required**: Yes

---

### POST `/telecom/ivrs`
Creates a new IVR.

**Auth Required**: Yes

**Request Body**:
```json
{
  "name": "Main Menu",
  "greetingAudioPath": "/api/uploads/audio/greeting.wav",
  "timeoutMs": 5000,
  "maxAttempts": 3,
  "menu": {
    "1": { "type": "ring_group", "targetId": "rg-uuid" },
    "2": { "type": "extension", "targetId": "ext-uuid" },
    "0": { "type": "forward", "targetNumber": "+18005551234" }
  }
}
```

---

### PATCH `/telecom/ivrs/:id`
Updates an IVR.

**Auth Required**: Yes

---

### DELETE `/telecom/ivrs/:id`
Deletes an IVR.

**Auth Required**: Yes

---

## Telecom — Schedules

### GET `/telecom/schedules`
Lists all operational schedules.

**Auth Required**: Yes

---

### POST `/telecom/schedules`
Creates a new operational schedule.

**Auth Required**: Yes

**Request Body**:
```json
{
  "name": "Business Hours",
  "timezone": "America/New_York",
  "startTime": "09:00",
  "endTime": "17:00",
  "daysMask": 31,
  "primaryRouteType": "ring_group",
  "primaryRouteTarget": "rg-uuid",
  "afterHoursRouteType": "ivr",
  "afterHoursRouteTarget": "ivr-uuid",
  "weekendRouteType": "forward",
  "weekendRouteTarget": "did_forward-uuid"
}
```

> **daysMask**: Bitmask where 1=Mon, 2=Tue, 4=Wed, 8=Thu, 16=Fri, 32=Sat, 64=Sun. `31` = Mon-Fri.

---

## Telecom — Audio Files

### GET `/telecom/audio`
Lists all audio files for the tenant.

**Auth Required**: Yes

---

### POST `/telecom/audio`
Uploads a new audio file (multipart/form-data).

**Auth Required**: Yes

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` — Audio file (WAV, MP3, etc.)
- `name` — Friendly name

**Response**:
```json
{
  "id": "uuid",
  "name": "Greeting Message",
  "storageUrl": "/api/uploads/audio/uuid.wav",
  "durationSeconds": 12.5
}
```

---

### DELETE `/telecom/audio/:id`
Deletes an audio file.

**Auth Required**: Yes

---

## Telecom — Routing & Monitoring

### GET `/telecom/routing-options`
Returns all available routing targets for the tenant (extensions, ring groups, IVRs, schedules, DID forwards).

**Auth Required**: Yes

**Response**:
```json
{
  "extensions": [{ "id": "...", "name": "John's Phone", "extensionNumber": "1001" }],
  "ringGroups": [{ "id": "...", "name": "Sales Team" }],
  "ivrs": [{ "id": "...", "name": "Main Menu" }],
  "schedules": [{ "id": "...", "name": "Business Hours" }],
  "didForwards": [{ "id": "...", "name": "After Hours Cell", "destinationNumber": "+1..." }]
}
```

---

### GET `/telecom/monitoring/live`
Returns mock live monitoring data (requires MonitoringAddOn to be active).

**Auth Required**: Yes

---

### POST `/telecom/monitoring/purchase`
Purchases the monitoring add-on ($5.00 from wallet).

**Auth Required**: Yes

---

### GET `/telecom/recording/status`
Returns whether call recording is enabled for the tenant.

**Auth Required**: Yes

---

### POST `/telecom/recording/toggle`
Enables or disables call recording (requires `recordingAllowed` feature flag).

**Auth Required**: Yes

**Request Body**: `{ "enabled": true }`

---

### GET `/telecom/recordings/:callUuid/check`
Checks if a recording exists for a given call UUID.

**Auth Required**: Yes

**Response**: `{ "hasRecording": true }`

---

### GET `/telecom/recordings/:callUuid/play`
Streams the audio recording for a given call UUID.

**Auth Required**: Yes

**Response**: Audio stream (MP3)

---

## Wallet (`/wallet`)

### GET `/wallet/balance`
Returns the current wallet balance from Sub-Billing API.

**Auth Required**: Yes

**Response**:
```json
{
  "balance": 45.50,
  "currency": "USD",
  "freeMins": 500,
  "creditLimit": 0,
  "autoRecharge": { "enabled": false, "threshold": 0, "amount": 0 }
}
```

---

### POST `/wallet/topup`
Initiates a wallet top-up via Sub-Billing Stripe checkout.

**Auth Required**: Yes

**Request Body**:
```json
{
  "amount": 50.00
}
```

**Response**:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "paymentId": "pay_..."
}
```

---

### GET `/wallet/transactions`
Lists wallet transaction history from Sub-Billing.

**Auth Required**: Yes

**Response**:
```json
[
  {
    "id": "tx_123",
    "amount": 50.00,
    "type": "CREDIT",
    "description": "Wallet top-up",
    "createdAt": "2024-01-01T10:00:00Z",
    "status": "SUCCESS"
  }
]
```

---

### GET `/wallet/subscription`
Returns the current subscription details from Sub-Billing.

**Auth Required**: Yes

---

### POST `/wallet/subscription/switch`
Switches the tenant to a different subscription plan.

**Auth Required**: Yes

**Request Body**:
```json
{
  "planId": "plan-id-or-name",
  "immediate": true
}
```

---

### PATCH `/wallet/auto-recharge`
Updates auto-recharge settings.

**Auth Required**: Yes

**Request Body**:
```json
{
  "enabled": true,
  "threshold": 10.00,
  "amount": 50.00
}
```

---

## Billing (`/billing`)

### POST `/billing/create-checkout`
Creates a Stripe Checkout Session to add a payment method.

**Auth Required**: Yes

**Response**: `{ "url": "https://checkout.stripe.com/..." }`

---

### POST `/billing/webhook`
Stripe webhook endpoint. Handles `setup_intent.succeeded` to save payment methods.

**Auth Required**: No (verified by Stripe signature)

**Headers**: `stripe-signature: <webhook-signature>`

> **CRITICAL**: Do NOT add `JwtAuthGuard` to this endpoint. Do NOT modify body parsing for this route.

---

### GET `/billing/payment-methods`
Lists saved payment methods for the current tenant (synced from Stripe).

**Auth Required**: Yes

**Response**:
```json
[
  {
    "id": "pm_xxx",
    "brand": "visa",
    "last4": "4242",
    "isDefault": true,
    "expMonth": 12,
    "expYear": 2027
  }
]
```

---

### POST `/billing/set-default-card`
Sets a payment method as the default for future charges.

**Auth Required**: Yes

**Request Body**: `{ "paymentMethodId": "pm_xxx" }`

---

## Plans (`/plans`)

### GET `/plans`
Lists all available subscription plans.

**Auth Required**: Yes

**Response**: Array of Plan objects.

---

## Admin (`/admin`)

> All Admin endpoints require `SUPER_ADMIN` role.

### GET `/admin/tenants`
Lists all tenants with billing summary.

### POST `/admin/tenants`
Creates a new tenant under a partner.

### GET `/admin/tenants/:id`
Returns detailed tenant information.

### PATCH `/admin/tenants/:id`
Updates a tenant (serviceBlocked, name, etc.).

### DELETE `/admin/tenants/:id`
Deletes a tenant and all associated resources.

### POST `/admin/tenants/:id/impersonate`
Creates an impersonation JWT for a tenant's admin user. Returns a new `accessToken`.

### GET `/admin/balances`
Returns wallet balances for all tenants.

### POST `/admin/tenants/:id/adjust-balance`
Manually credits or debits a tenant's wallet.

**Request Body**:
```json
{
  "amount": 25.00,
  "type": "CREDIT",
  "description": "Manual credit by support"
}
```

---

## Monitor (WebSocket)

WebSocket endpoint at: `wss://yourdomain.com/api/socket.io` (namespace: `monitor`)

### Connection

The client must authenticate on connection using the JWT access token:

```javascript
const socket = io('https://yourdomain.com', {
  path: '/api/socket.io',
  auth: { token: 'your_jwt_access_token' },
  namespace: 'monitor'
});
```

### Client → Server Events

| Event       | Payload              | Description                                    |
|-------------|----------------------|------------------------------------------------|
| `join_room` | `tenantId: string`   | Join a tenant's monitoring room. SUPER_ADMIN can pass `"all"` |
| `leave_room`| `tenantId: string`   | Leave a tenant's monitoring room               |
| `ping`      | (none)               | Health check ping                              |

### Server → Client Events

| Event                | Payload                                      | Description                             |
|----------------------|----------------------------------------------|-----------------------------------------|
| `room_joined`        | `{ room, rooms }`                            | Confirmation of joining                 |
| `room_left`          | `{ room }`                                   | Confirmation of leaving                 |
| `call_update`        | Call data object (see below)                 | Emitted on call state change from Redis |
| `analytics_snapshot` | Analytics data object (see below)            | Emitted every 30 seconds                |
| `error`              | `{ message: string }`                        | Error from server                       |

#### `call_update` payload
```json
{
  "uuid": "call-uuid",
  "bUuid": "b-leg-uuid",
  "caller": "+12025551234",
  "callee": "+14155551234",
  "status": "answered",
  "direction": "inbound",
  "destType": "extension",
  "destValue": "1001",
  "startTime": "1696581600",
  "answerTime": "1696581605",
  "duration": 30,
  "tenantId": "tenant-uuid"
}
```

**Status values**: `ringing`, `answered`, `connected`, `hangup`

#### `analytics_snapshot` payload
```json
{
  "tenantId": "tenant-uuid",
  "activeCalls": 3,
  "ringing": 1,
  "answered": 2,
  "inbound": 2,
  "outbound": 1,
  "timestamp": 1696581600000
}
```

---

## Standard Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "Bad Request",
  "timestamp": "2024-10-06T12:00:00.000Z",
  "path": "/api/the/endpoint/that/failed"
}
```

| HTTP Status | When Used                                                  |
|-------------|------------------------------------------------------------|
| `400`       | Invalid request body, business logic validation failures   |
| `401`       | Missing or invalid JWT token                               |
| `403`       | Insufficient permissions, plan expired, wallet insufficient|
| `404`       | Resource not found                                         |
| `409`       | Conflict (e.g., idempotency key collision)                 |
| `429`       | Rate limit exceeded (300 req/min)                          |
| `500`       | Unexpected server error                                    |

### Common Business Logic Errors

| Message                                       | Status | Cause                                    |
|-----------------------------------------------|--------|------------------------------------------|
| `Plan expired`                                | 403    | Active subscription not found            |
| `Wallet negative`                             | 403    | Wallet balance is below zero             |
| `Insufficient funds to purchase TFN`          | 403    | Wallet balance < TFN price               |
| `Extension X already exists`                  | 400    | Duplicate extension number in tenant     |
| `Invalid route type: X`                       | 400    | Unsupported routeType value              |
| `Tenant not linked to a billing system customer`| 400  | `subBillingCustomerId` not set on tenant |
| `Stripe not configured`                       | 500    | `STRIPE_SECRET_KEY` env var missing      |

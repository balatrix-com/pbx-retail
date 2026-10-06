# External Services Integration Guide

This document details every external service and third-party system that PBX-Whitelabel integrates with — what it does, how it connects, configuration required, and what breaks if it goes down.

---

## Table of Contents
1. [Stripe (Payment Processing)](#1-stripe-payment-processing)
2. [Sub-Billing API (Internal Billing System)](#2-sub-billing-api-internal-billing-system)
3. [FreeSWITCH (SIP Media Server)](#3-freeswitch-sip-media-server)
4. [Kamailio (SIP Proxy / Registrar)](#4-kamailio-sip-proxy--registrar)
5. [Redis (Pub/Sub & Cache)](#5-redis-pubsub--cache)
6. [SMTP / Email Service](#6-smtp--email-service)
7. [Telecom Carrier (Telnyx / SIP Provider)](#7-telecom-carrier-telnyx--sip-provider)
8. [Integration Dependency Map](#8-integration-dependency-map)
9. [Graceful Degradation Summary](#9-graceful-degradation-summary)

---

## 1. Stripe (Payment Processing)

### Purpose
Stripe is used specifically for **payment method setup** (saving credit/debit cards to a Stripe Customer). It is **not** used for the primary billing flow (that's handled by Sub-Billing). Think of Stripe here as the card vault.

### What It Does
- Creates Stripe Customers linked to PBX Tenants
- Provides hosted Checkout Sessions for secure card entry
- Notifies PBX of successful payment method setup via webhooks
- Charges the saved card on-demand for specific operations

### Connection Details
- **Library**: Official `stripe` npm SDK
- **Service**: `BillingService` (`/backend/src/billing/billing.service.ts`)
- **Initialization**: On `onModuleInit()`, initializes with `STRIPE_SECRET_KEY`
- **Mode**: If `STRIPE_SECRET_KEY` is not set, runs in **Mock Mode** (no real charges)

### Configuration

| Env Variable             | Description                                           | Where to Get                        |
|--------------------------|-------------------------------------------------------|-------------------------------------|
| `STRIPE_SECRET_KEY`      | Stripe secret key (starts with `sk_test_` or `sk_live_`) | Stripe Dashboard > API Keys     |
| `STRIPE_WEBHOOK_SECRET`  | Webhook signing secret (starts with `whsec_`)        | Stripe Dashboard > Webhooks > Signing Secret |
| `FRONTEND_URL`           | Used to build redirect URLs after checkout            | Your frontend URL                   |

### Key API Calls Made

| Operation                | Stripe API                               | When                                |
|--------------------------|------------------------------------------|-------------------------------------|
| Create customer          | `stripe.customers.create()`              | First time tenant creates checkout  |
| Create checkout session  | `stripe.checkout.sessions.create()`      | `POST /billing/create-checkout`     |
| Retrieve payment method  | `stripe.paymentMethods.retrieve()`       | After `setup_intent.succeeded` webhook |
| List payment methods     | `stripe.paymentMethods.list()`           | `GET /billing/payment-methods`      |
| Update default PM        | `stripe.customers.update()`              | When user sets a default card       |
| Charge customer          | `stripe.paymentIntents.create()`         | On-demand charges                   |
| Verify webhook           | `stripe.webhooks.constructEvent()`       | Every webhook received              |

### Webhook Events Handled

| Event                      | Action                                    |
|----------------------------|-------------------------------------------|
| `setup_intent.succeeded`   | Save payment method to `payment_methods` table |

### What Breaks if Stripe is Down
- Adding payment methods fails
- Direct Stripe charges fail
- Webhook events queue up in Stripe (retried for 3 days)
- **Not affected**: Wallet top-up (handled by Sub-Billing), basic login, call routing

### Testing Locally
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook

# Test with card numbers
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

---

## 2. Sub-Billing API (Internal Billing System)

### Purpose
The Sub-Billing API is the **primary billing engine** for the PBX platform. It manages:
- Wallet balances for all tenants
- Subscription plans and their usage/limits
- Top-up payment initiation (via its own Stripe integration)
- Per-minute usage billing
- Customer account management

PBX-Whitelabel acts as a **client** to Sub-Billing. PBX does not store authoritative balance data — it always queries Sub-Billing.

### Connection Details
- **Library**: NestJS `HttpService` (Axios wrapper)
- **Service**: `WalletService` (`/backend/src/wallet/wallet.service.ts`)
- **Base URL**: `SUB_BILLING_API_URL` env variable (e.g., `http://localhost:5005/api`)
- **Authentication**: None documented in code (likely IP-whitelisted or internal network)

### Configuration

| Env Variable          | Description                         |
|-----------------------|-------------------------------------|
| `SUB_BILLING_API_URL` | Base URL of the Sub-Billing service |

### Key API Calls Made

| Operation                   | Endpoint                                   | When                                         |
|-----------------------------|---------------------------------------------|----------------------------------------------|
| Get balance                 | `GET /pbx/balance/:customerId`              | `GET /wallet/balance`                        |
| Get transactions            | `GET /pbx/transactions/:customerId`         | `GET /wallet/transactions`                   |
| Initiate top-up             | `POST /payments/initiate`                   | `POST /wallet/topup`                         |
| Manual adjustment           | `POST /payments/manual`                     | Internal balance adjustments (purchase DID)  |
| Create customer             | `POST /customers`                           | During tenant onboarding                     |
| Get customer                | `GET /customers/:customerId`                | Profile sync                                 |
| Update customer             | `PUT /customers/:customerId`                | Profile updates                              |
| Delete customer             | `DELETE /customers/:customerId`             | Tenant deletion                              |
| Create subscription         | `POST /subscriptions`                       | New tenant subscription                      |
| Switch plan                 | `POST /subscriptions/switch-plan`           | Plan upgrades/downgrades                     |
| Get subscription            | `GET /pbx/subscription/:customerId`         | `GET /wallet/subscription`                   |
| Get plan details            | `GET /plans/:planId`                        | During plan switch to get extension limits   |
| Get cards                   | `GET /pbx/cards/:customerId`                | Payment methods listing                      |
| Get all balances            | `GET /pbx/all`                              | Super Admin dashboard                        |
| Get assets                  | `GET /pbx/assets/:customerId`               | Asset overview                               |
| Update credit limit         | `PUT /customers/:customerId/credit-limit`   | Admin credit limit management                |

### Country Codes Accepted by Sub-Billing

| Code   | Country       |
|--------|---------------|
| `IND`  | India         |
| `USA`  | United States |
| `CAD`  | Canada        |
| `PAK`  | Pakistan      |
| `PHI`  | Philippines   |
| `BNG`  | Bangladesh    |
| `OTHER`| Other         |

### Fallback Behavior
If Sub-Billing is unreachable, `WalletService.getBalance()` falls back to the local PostgreSQL `Wallet` table. All other Sub-Billing calls fail with a `400 Bad Request` (no local fallback).

### What Breaks if Sub-Billing is Down
- Wallet balance display (falls back to local DB)
- Wallet top-up (fails)
- Subscription changes (fail)
- DID/TFN purchases (fail — balance check fails)
- Tenant creation (partially fails — tenant created locally, not in Sub-Billing)

---

## 3. FreeSWITCH (SIP Media Server)

### Purpose
FreeSWITCH is the telephony engine that actually handles all phone calls. It reads dialplan XML from a PostgreSQL database to determine how to route each call.

### What PBX Does
PBX-Whitelabel does **not** communicate with FreeSWITCH via its API or ESL (Event Socket Library). Instead, it writes **XML dialplan records directly to FreeSWITCH's PostgreSQL database**.

FreeSWITCH continuously re-reads its XML configuration from this database.

### Connection Details
- **Service**: `FreeSwitchSyncService` (`/backend/src/freeswitch/freeswitch-sync.service.ts`)
- **DB Service**: `FreeSwitchDBService` — connects to a **separate PostgreSQL** instance (FreeSWITCH DB)
- **Dialplan Generation**: `DialplanGeneratorService` — generates XML strings for each routing scenario

### Configuration

| Env Variable         | Description                                        |
|----------------------|----------------------------------------------------|
| `FREESWITCH_DB_URL`  | PostgreSQL connection URL for the FreeSWITCH DB    |
| `SIP_SERVER`         | SIP server hostname (used as `sipAuthRealm` for extensions) |

### Dialplan Key Naming Convention

| Entity         | Key Format                        | Example                    |
|----------------|-----------------------------------|----------------------------|
| Extension      | `ext{n}_{customerCode}`           | `ext01_CUST001`            |
| Ring Group     | `rg{n}_{customerCode}`            | `rg01_CUST001`             |
| IVR            | `ivr{n}_{customerCode}`           | `ivr01_CUST001`            |
| DID            | `did_{number}`                    | `did_12025551234`          |
| TFN            | `tfn_{number}`                    | `tfn_18005551234`          |
| Schedule       | `sched{n}_{customerCode}`         | `sched01_CUST001`          |

### Sync Triggers

| Action                       | FreeSWITCH Sync Method             |
|------------------------------|------------------------------------|
| Create Extension             | `syncExtension(extensionId)`       |
| Update Extension             | `syncExtension(extensionId)`       |
| Delete Extension             | `deleteExtensionDialplan(key)`     |
| Create/Update Ring Group     | `syncRingGroup(ringGroupId)`       |
| Create/Update IVR            | `syncIVR(ivrId)`                   |
| Update DID routing           | `syncDID(didId)`                   |
| Update TFN routing           | `syncTFN(tfnId)`                   |
| Toggle call recording        | `syncAllDialplans(tenantId)`       |
| Switch subscription plan     | `syncAllDialplans(tenantId)`       |

### Cache Flush
After writing a dialplan, `CacheFlushService.flushCustomer(customerCode)` is called to clear FreeSWITCH's in-memory cache for that customer. This ensures calls are routed using the latest dialplan without requiring a FreeSWITCH restart.

### What Breaks if FreeSWITCH DB is Down
- Changes to routing, extensions, IVRs **do not take effect** (no dialplan sync)
- Error is logged but the API call **still succeeds** (best-effort sync)
- Existing calls continue to work using the last synced dialplan

---

## 4. Kamailio (SIP Proxy / Registrar)

### Purpose
Kamailio is the SIP proxy and registrar that sits in front of FreeSWITCH. It handles SIP endpoint registration (so desk phones and softphones can connect to the PBX).

### What PBX Does
When an extension is created or its password changes, PBX writes the SIP credentials directly into Kamailio's `subscriber` database table.

### Connection Details
- **Service**: `KamailioDBService` (`/backend/src/freeswitch/kamailio-db.service.ts`)
- **Connection**: Direct PostgreSQL connection to Kamailio's database

### Configuration

| Env Variable       | Description                                       |
|--------------------|---------------------------------------------------|
| `KAMAILIO_DB_URL`  | PostgreSQL connection URL for the Kamailio DB     |

### Sync Triggers

| Action                          | Kamailio Sync             |
|---------------------------------|---------------------------|
| Create Extension                | `syncSubscriber(username, password)` |
| Update Extension password       | `syncSubscriber(username, password)` |
| Delete Extension                | `deleteSubscriber(username)`         |

### What Breaks if Kamailio DB is Down
- New extension SIP credentials are **not registered** — phones cannot register
- Existing registered phones continue working until their registration expires
- Error is logged but the API call succeeds (best-effort sync)

---

## 5. Redis (Pub/Sub & Cache)

### Purpose
Redis serves three distinct roles in the system:

#### Role 1: Call Event Pub/Sub (Real-Time Monitoring)
FreeSWITCH publishes call state events to the `calls_stream` Redis channel. The NestJS `MonitorGateway` subscribes to this channel and forwards events to connected WebSocket clients.

**Channel**: `calls_stream`

**Published message format** (from FreeSWITCH):
```json
{
  "uuid": "call-uuid",
  "customer_id": "CUST001",
  "caller": "+12025551234",
  "callee": "1001",
  "call_status": "ringing",
  "direction": "inbound",
  "b_uuid": "",
  "dest_type": "extension",
  "dest_value": "1001",
  "start_ts": "1696581600",
  "answer_ts": "",
  "duration": "0"
}
```

**Active call state keys** (stored as Redis hashes by FreeSWITCH):
```
customer:{customerId}:call:{callUuid}
```

#### Role 2: Extension Lookup Cache (LookupRedisService)
Caches extension-to-tenant mappings for fast routing lookups during call processing.

**Operation**: `updateExtensionLookup(tenantId)` updates the cache whenever extensions change.

#### Role 3: Rate Limiting
The `ThrottlerModule` uses Redis as the backing store for distributed rate limiting counters.

### Connection Details
- **Module**: `RedisModule` (`/backend/src/redis/redis.module.ts`)
- **Two Clients**: 
  - `REDIS_CLIENT` — for commands and publishing
  - `REDIS_SUBSCRIBER` — dedicated subscriber (cannot run regular commands while subscribed)
- **Library**: `redis` npm package (node-redis)

### Configuration

| Env Variable | Description                                           |
|--------------|-------------------------------------------------------|
| `REDIS_URL`  | Redis connection URL (e.g., `redis://localhost:6379`) |

### What Breaks if Redis is Down

| Feature                    | Impact                                                |
|----------------------------|-------------------------------------------------------|
| Live call monitoring       | **Broken** — No call events reach the frontend         |
| Real-time analytics        | **Broken** — No analytics snapshots                   |
| Rate limiting              | Depends on ThrottlerModule failopen config            |
| Extension lookup cache     | **Degraded** — Falls back to DB queries               |
| WebSocket connections      | New connections may fail if Redis is needed for auth  |

**Recovery**: After Redis restores, restart NestJS to re-establish the `calls_stream` subscription.

---

## 6. SMTP / Email Service

### Purpose
Sends transactional emails to users:
- Password reset emails
- User invitation emails
- (Future) Billing alerts, low balance notifications

### Connection Details
- **Service**: `MailService` (`/backend/src/mail/`)
- **Library**: Nodemailer
- **Configuration source**: First checks `Partner` entity in DB (per-partner SMTP), falls back to global env vars

### Configuration

**Global (via env vars)**:

| Env Variable   | Description              |
|----------------|--------------------------|
| `SMTP_HOST`    | SMTP server hostname     |
| `SMTP_PORT`    | SMTP port (e.g., 587)    |
| `SMTP_SECURE`  | Use TLS: `true`/`false`  |
| `SMTP_USER`    | SMTP authentication user |
| `SMTP_PASS`    | SMTP authentication password |
| `SMTP_FROM`    | From email address       |

**Per-Partner (from DB)**: Partners can configure their own SMTP in the `Partner` entity (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFromEmail`, `smtpFromName`). This allows each Partner's emails to come from their own domain.

### What Breaks if SMTP is Down
- Password reset flow fails (user cannot receive reset link)
- User invitations fail
- **Not affected**: Login, call routing, billing, everything else

---

## 7. Telecom Carrier (Telnyx / SIP Provider)

### Purpose
The carrier (Telnyx by default) provides:
- Phone numbers (DID inventory)
- Inbound call delivery to the PBX FreeSWITCH server
- Outbound call termination

### Connection Details
PBX-Whitelabel does **not** have a direct API integration with Telnyx in the main codebase. Instead:
- **DID inventory** is managed manually (or pre-seeded) in the `dids` table
- **Inbound calls** arrive as SIP INVITE packets from the carrier's IP addresses
- **Outbound calls** are routed through the `OutboundEndpoint` configured per-tenant

### Configuration

| Configuration                  | Description                                      |
|--------------------------------|--------------------------------------------------|
| `InboundWhitelist` (DB table)  | Carrier source IPs whitelisted for inbound SIP   |
| `OutboundEndpoint` (DB table)  | SIP gateway hostname/port for outbound calls     |
| `OutboundCarrier` (DB table)   | Carrier entity (e.g., Telnyx, Twilio)            |

### Inbound Call Path
```
Carrier (e.g., 1.2.3.4:5060)
  --> [Firewall checks InboundWhitelist]
  --> Kamailio (SIP Proxy)
  --> FreeSWITCH (reads dialplan from DB)
  --> Routes call to Extension / Ring Group / IVR
```

### Outbound Call Path
```
Extension SIP Client
  --> Kamailio
  --> FreeSWITCH
  --> OutboundEndpoint (sipHost:sipPort)
  --> Carrier network
  --> Destination phone number
```

### What Breaks if the Carrier is Down
- No inbound calls can be received
- No outbound calls can be made
- Existing calls in progress may drop
- **Not affected**: PBX management UI, billing, user management

---

## 8. Integration Dependency Map

```
                              PBX-Whitelabel
                                    |
            +-----------+-----------+-----------+-----------+
            |           |           |           |           |
          Stripe    Sub-Billing  FreeSWITCH   Redis      SMTP
          (Cards)    (Billing)   PostgreSQL   (Events)  (Email)
                         |
                     Kamailio
                    PostgreSQL
                    (SIP Auth)
                         |
                     Carrier
                   (Telnyx/etc)
```

### Dependency Criticality

| Service         | Criticality | Impact if Down                                              |
|-----------------|-------------|-------------------------------------------------------------|
| PostgreSQL (main)| CRITICAL   | Entire application fails                                    |
| Redis           | HIGH        | Real-time monitoring fails, rate limiting affected          |
| Sub-Billing API | HIGH        | All billing operations fail, wallet balance unavailable     |
| Kamailio DB     | HIGH        | New SIP registrations fail                                  |
| FreeSWITCH DB   | HIGH        | Routing changes don't take effect                           |
| Stripe          | MEDIUM      | Card setup fails; existing balance still works              |
| SMTP            | LOW         | Emails not sent; login/calls still work                     |
| Carrier         | HIGH (ops)  | No calls in/out; purely operational impact                  |

---

## 9. Graceful Degradation Summary

| Scenario                    | System Behavior                                       | User Impact                                         |
|-----------------------------|-------------------------------------------------------|-----------------------------------------------------|
| Stripe down                 | Card setup and direct charges fail                    | Cannot add payment methods                          |
| Sub-Billing down            | Balance shows stale local data; top-up fails          | Cannot top up; balance may be inaccurate            |
| Redis down                  | WebSocket monitoring fails; rate limiting may fail    | Live call dashboard goes dark                       |
| FreeSWITCH DB unreachable   | API calls succeed; routing changes not applied        | Config changes don't take effect on calls           |
| Kamailio DB unreachable     | Extension creation succeeds; SIP registration fails   | New phones cannot register                          |
| SMTP down                   | Emails not sent                                       | Cannot reset password by email                     |
| Carrier down                | No calls                                              | No inbound/outbound calling                         |

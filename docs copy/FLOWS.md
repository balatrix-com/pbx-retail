# System Flows & Sequence Diagrams

This document explains the critical end-to-end workflows in PBX-Whitelabel — from onboarding a new tenant all the way through live call monitoring.

---

## Table of Contents
1. [Tenant Onboarding Flow](#1-tenant-onboarding-flow)
2. [Wallet Top-Up Flow (Sub-Billing)](#2-wallet-top-up-flow-sub-billing)
3. [Subscription Plan Switch Flow](#3-subscription-plan-switch-flow)
4. [Payment Method Setup (Stripe)](#4-payment-method-setup-stripe)
5. [Inbound Call Routing Flow](#5-inbound-call-routing-flow)
6. [Extension Provisioning & SIP Sync Flow](#6-extension-provisioning--sip-sync-flow)
7. [IVR Call Handling Flow](#7-ivr-call-handling-flow)
8. [DID/TFN Routing Configuration Flow](#8-didtfn-routing-configuration-flow)
9. [Live Call Monitoring (WebSocket) Flow](#9-live-call-monitoring-websocket-flow)
10. [Authentication & Token Refresh Flow](#10-authentication--token-refresh-flow)
11. [Service Enforcement Flow](#11-service-enforcement-flow)
12. [Stripe Webhook Processing Flow](#12-stripe-webhook-processing-flow)

---

## 1. Tenant Onboarding Flow

When a new business signs up for the PBX platform.

```
User (Browser)          NestJS API          Sub-Billing API       PostgreSQL       FreeSWITCH DB
      |                     |                      |                   |                 |
      |-- POST /auth/signup ->|                     |                   |                 |
      |                     |-- Validate DTO        |                   |                 |
      |                     |-- Hash password       |                   |                 |
      |                     |-- Create Tenant ------------------>|      |                 |
      |                     |-- Create Admin User ------------>--|      |                 |
      |                     |-- Create Wallet  ----------------->|     |                 |
      |                     |-- Create TenantFeature  ---------->|     |                 |
      |                     |                      |                   |                 |
      |                     |-- POST /customers  -->|                   |                 |
      |                     |   (register tenant    |                   |                 |
      |                     |    in sub-billing)    |                   |                 |
      |                     |<-- customerId --------|                   |                 |
      |                     |                       |                   |                 |
      |                     |-- Update Tenant.subBillingCustomerId ->|  |                 |
      |                     |-- Issue JWT (access + refresh tokens)     |                 |
      |<-- 201 {tokens, user}|                      |                   |                 |
```

**Key Points**:
- `Wallet` is auto-created with $0 balance.
- `TenantFeature` is auto-created with default limits.
- The `customerCode` is assigned by the Sub-Billing system and stored back.
- If Sub-Billing is down during signup, the tenant is created locally but `subBillingCustomerId` remains null — billing features won't work until resolved.

---

## 2. Wallet Top-Up Flow (Sub-Billing)

```
User (Browser)         NestJS API          Sub-Billing API         Stripe
      |                    |                      |                   |
      |-- POST /wallet/topup (amount: $50) ------>|                   |
      |                    |-- Get subBillingCustomerId from DB        |
      |                    |-- POST /payments/initiate  -->|           |
      |                    |   { customer_id, amount }    |           |
      |                    |                              |-- Create Stripe Checkout Session
      |                    |<-- { checkoutUrl, paymentId }|           |
      |<-- { checkoutUrl } |                              |           |
      |                    |                              |           |
      |-- (redirect to Stripe Checkout URL) ------------->|           |
      |-- (User enters card and pays) ---------------------------------------->|
      |                    |                              |<-- Payment Succeeded
      |                    |                              |-- Update balance in Sub-Billing
      |-- (Stripe redirects to /wallet?success=true)      |           |
      |-- GET /wallet/balance ------>|                    |           |
      |                    |-- GET /pbx/balance/:customerId  -->|     |
      |<-- { balance: 50.00 }        |<-- { f_balance: "USD 50.00" }  |
```

**Key Points**:
- PBX does **not** process payments directly. It delegates to Sub-Billing, which manages the Stripe checkout.
- Balance is stored in Sub-Billing, not in the PBX `Wallet` table (used only as fallback).
- The redirect URL is constructed from `FRONTEND_URL` env var.

---

## 3. Subscription Plan Switch Flow

```
User (Browser)         NestJS API          Sub-Billing API       PostgreSQL       FreeSWITCH DB / Kamailio
      |                    |                      |                   |                      |
      |-- POST /wallet/subscription/switch ------>|                   |                      |
      |   { planId, immediate: true }             |                   |                      |
      |                    |-- POST /subscriptions/switch-plan  -->|  |                      |
      |                    |   { customer_id, target_plan_id }    |  |                      |
      |                    |<-- { subscription_id, ... } ----------|  |                      |
      |                    |                      |                   |                      |
      |                    |-- GET /plans/:planId  -->|               |                      |
      |                    |<-- { extensions, free_mins, ... }  ---|  |                      |
      |                    |                      |                   |                      |
      |                    |-- Update local Subscription record  -->|  |                      |
      |                    |   (planId, remainingFreeMinutes)        |                      |
      |                    |                      |                   |                      |
      |                    |-- Auto-provision extensions if needed    |                      |
      |                    |   (create Extension records in DB)  -->| |                      |
      |                    |   (sync each to FreeSWITCH) --------------------------------->|
      |                    |   (sync each to Kamailio) ------------------------------------>|
      |                    |-- Update LookupRedis cache               |                      |
      |<-- Plan switched   |                      |                   |                      |
```

**Key Points**:
- Extension auto-provisioning happens automatically based on plan limits.
- Each new extension is immediately synced to FreeSWITCH (dialplan) and Kamailio (SIP subscriber).
- The local PostgreSQL `Subscription` record is updated to mirror the Sub-Billing system.

---

## 4. Payment Method Setup (Stripe)

```
User (Browser)          NestJS API              Stripe
      |                     |                      |
      |-- POST /billing/create-checkout  --------->|
      |                     |-- Stripe: create customer if needed
      |                     |-- Stripe: checkout.sessions.create (mode: 'setup')
      |<-- { url: "https://checkout.stripe.com/..." }
      |-- (redirect to Stripe hosted checkout page)  -->|
      |-- (User enters card details)  ----------------->|
      |                     |                      |-- SetupIntent created
      |-- (Stripe redirects to /billing?success=true)  |
      |                     |                      |
      |                     |<-------- POST /api/billing/webhook (setup_intent.succeeded)
      |                     |-- Verify Stripe signature with rawBody
      |                     |-- Retrieve PaymentMethod from Stripe
      |                     |-- Find Tenant by stripeCustomerId
      |                     |-- Save PaymentMethod to DB
      |                     |-- If first card: set as Stripe default
      |                     |-- Return { received: true } to Stripe
```

**Critical**: Stripe retries webhooks if it doesn't receive a `200 OK`. The `IdempotencyInterceptor` prevents duplicate payment method saves on retries.

---

## 5. Inbound Call Routing Flow

This happens entirely within FreeSWITCH/Kamailio, but PBX controls the configuration.

```
Phone Caller           Carrier/Telnyx        FreeSWITCH             PostgreSQL (FS DB)
      |                     |                      |                       |
      |-- Call to +12025551234 ->|                 |                       |
      |                     |-- SIP INVITE -------->|                      |
      |                     |                      |-- Lookup DID dialplan  |
      |                     |                      |   (key: did_{number})  |
      |                     |                      |<-- XML dialplan -------|
      |                     |                      |                       |
      |                     |   [Route Type = IVR]                         |
      |                     |                      |-- Play greeting.wav   |
      |                     |                      |-- Wait for DTMF       |
      |                     |                      |   (timeout: 5000ms)   |
      |-- DTMF "1" press -->|                      |                       |
      |                     |                      |-- Lookup IVR menu["1"]|
      |                     |                      |   = ring_group        |
      |                     |                      |-- Bridge to all extensions in group
      |<-- Ringing  --------|                      |                       |
      |                     |                      |-- Publish to Redis     |
      |                     |                      |   calls_stream channel |
```

**Redis Call Event Published**:
```json
{
  "uuid": "call-uuid",
  "customer_id": "CUST001",
  "caller": "+12025551234",
  "callee": "1001",
  "call_status": "ringing",
  "direction": "inbound",
  "dest_type": "extension",
  "dest_value": "1001",
  "start_ts": "1696581600"
}
```

---

## 6. Extension Provisioning & SIP Sync Flow

```
Admin (Browser)         NestJS API           PostgreSQL        FreeSWITCH DB      Kamailio DB
      |                     |                     |                   |                 |
      |-- POST /telecom/extensions  ------------>  |                   |                 |
      |   { extensionNumber, name, password }      |                   |                 |
      |                     |-- EnforcementService: check plan state   |                 |
      |                     |-- Validate extension number uniqueness    |                 |
      |                     |-- Create Extension record  ------------>  |                 |
      |                     |<-- Extension { id, sipUsername, ... } -   |                 |
      |                     |                     |                   |                 |
      |                     |-- FreeSwitchSyncService.syncExtension()   |                 |
      |                     |   |                 |                   |                 |
      |                     |   |-- KamailioDBService.syncSubscriber()            -->    |
      |                     |   |   (upsert into subscriber table)                       |
      |                     |   |                 |                   |                 |
      |                     |   |-- DialplanGeneratorService.generateSimpleExtensionXML()|
      |                     |   |-- FreeSwitchDBService.upsertDialplan() ----------->    |
      |                     |   |-- CacheFlushService.flushCustomer()   ----------->    |
      |                     |                     |                   |                 |
      |<-- { id, sipUsername, sipPassword }        |                   |                 |
```

**Key Points**:
- After creating the extension, users can immediately register their SIP client with `sipUsername` and `sipPassword`.
- `sipAuthRealm` is the SIP server hostname (set from `SIP_SERVER` env var).
- Cache flush ensures FreeSWITCH picks up the new dialplan immediately without a restart.

---

## 7. IVR Call Handling Flow

When a caller reaches an IVR:

```
[Caller dials DID]
       |
       v
[FreeSWITCH: DID dialplan lookup -> routeType = "ivr"]
       |
       v
[FreeSWITCH: Load IVR dialplan (key: ivr{n}_{customerCode})]
       |
       v
[Play greeting audio (greetingAudioPath)]
       |
       v
[Wait for DTMF input (timeoutMs = 5000ms)]
       |
       +--[No input after timeout]-->
       |   Increment attempt counter
       |   Play timeout/invalid audio
       |   If maxAttempts reached -> Hangup or transfer to operator
       |
       +--[Valid DTMF input (e.g., "1")]-->
           Look up menu["1"] = { type: "ring_group", targetId: "rg-uuid" }
           Execute routing to ring group
           |
           v
          [Ring all extensions in ring group simultaneously]
           If no answer after ringTimeout -> noAnswerAction
```

**IVR Menu JSON Structure**:
```json
{
  "1": { "type": "ring_group", "targetId": "ring-group-uuid" },
  "2": { "type": "extension", "targetId": "extension-uuid" },
  "3": { "type": "ivr", "targetId": "nested-ivr-uuid" },
  "0": { "type": "forward", "targetNumber": "+14155550000" }
}
```

---

## 8. DID/TFN Routing Configuration Flow

When an admin sets up call routing for a phone number:

```
Admin (Browser)          NestJS API            PostgreSQL          FreeSWITCH DB
      |                      |                     |                     |
      |-- POST /telecom/dids/:id/routing  -------> |                     |
      |   { routeType: "ivr", routeTargetId: "..." }                     |
      |                      |-- Find DID in DB     |                     |
      |                      |-- validateRouteTarget():                   |
      |                      |   Check IVR exists for this tenant         |
      |                      |-- Update DID.routeType & routeTargetId  -> |
      |                      |                     |                     |
      |                      |-- FreeSwitchSyncService.syncDID()          |
      |                      |   Generate DID XML dialplan                |
      |                      |   Upsert into FreeSWITCH dialplan table -> |
      |                      |   Flush FreeSWITCH cache  ----------->     |
      |<-- Updated DID       |                     |                     |
```

---

## 9. Live Call Monitoring (WebSocket) Flow

```
Admin (Browser)        Socket.io (NestJS)      Redis (Pub/Sub)       FreeSWITCH
      |                      |                      |                     |
      |-- WS Connect (with JWT token) ----------->  |                     |
      |                      |-- Verify JWT         |                     |
      |                      |-- Check monitoringEnabled                   |
      |                      |                      |                     |
      |-- emit join_room(tenantId) --------------> |                     |
      |                      |-- Join room "tenant:{tenantId}"            |
      |                      |-- Also join alias rooms (customerCode)     |
      |                      |-- Build & emit immediate analytics snapshot|
      |<-- room_joined + analytics_snapshot          |                     |
      |                      |                      |                     |
      |                      |   (ongoing)           |                     |
      |                      |<-- Redis subscribe "calls_stream"          |
      |                      |                      |<-- Publish call event|
      |                      |-- Parse call event   |                     |
      |                      |-- Route to tenant room                     |
      |<-- call_update event |                      |                     |
      |                      |                      |                     |
      |  (every 30 seconds)   |                      |                     |
      |                      |-- SCAN Redis keys: customer:*:call:*       |
      |                      |-- Aggregate stats    |                     |
      |<-- analytics_snapshot |                     |                     |
```

**Access Control**:
- `SUPER_ADMIN` and `ADMIN` with `monitoringEnabled=true` can connect.
- `SUPER_ADMIN` can join room `"all"` to monitor all tenants.
- Regular `ADMIN` can only join their own tenant room.

---

## 10. Authentication & Token Refresh Flow

```
User (Browser)           NestJS API
      |                      |
      |-- POST /auth/login  ->|
      |<-- { accessToken (15min), refreshToken (7days) }
      |                      |
      |  (use accessToken for 15 minutes)
      |                      |
      |-- API Request with expired accessToken ->|
      |<-- 401 Unauthorized  |
      |                      |
      |-- POST /auth/refresh (with refreshToken in Authorization header) ->|
      |                      |-- Verify refreshToken hash against DB
      |                      |-- Issue new access + refresh tokens
      |                      |-- Rotate refreshToken in DB
      |<-- { new accessToken, new refreshToken }
      |                      |
      |-- Retry failed request with new accessToken ->|
      |<-- 200 OK            |
```

**Frontend Behavior**: React Query's `onError` callback should detect 401 and trigger the refresh flow automatically.

---

## 11. Service Enforcement Flow

Every money-costing or resource-creating action checks `EnforcementService.getServiceState()` first.

```
[Tenant action request (e.g., purchase DID, create extension)]
       |
       v
[EnforcementService.getServiceState(tenantId)]
       |
       v
[Query: Get tenant.wallet and tenant.subscriptions (status: ACTIVE)]
       |
       +-- balance < 0  -->  ServiceState.WALLET_NEGATIVE  -->  403 Forbidden
       |
       +-- balance == 0 AND no free minutes  -->  ServiceState.WALLET_ZERO  -->  403 Forbidden
       |
       +-- No ACTIVE subscription  -->  ServiceState.PLAN_EXPIRED  -->  403 Forbidden
       |
       +-- balance > 0 OR has free minutes  -->  ServiceState.SERVICE_ACTIVE  -->  Allow action
```

**Note**: `WALLET_ZERO` and `WALLET_NEGATIVE` block *purchases* but not *login*. Users can still log in and manage their billing.

---

## 12. Stripe Webhook Processing Flow

```
Stripe                  NestJS API (/api/billing/webhook)        PostgreSQL
   |                              |                                    |
   |-- POST /webhook (setup_intent.succeeded) -->|                     |
   |   Headers: stripe-signature: t=...,v1=...   |                     |
   |   Body: Raw Buffer (NOT parsed JSON)        |                     |
   |                              |-- stripe.webhooks.constructEvent(rawBody, signature, secret)
   |                              |   (throws if signature invalid)    |
   |                              |                                    |
   |                              |-- event.type == "setup_intent.succeeded"
   |                              |-- Retrieve PaymentMethod from Stripe
   |                              |-- Find Tenant by stripeCustomerId  |
   |                              |-- Check if PM already exists in DB |
   |                              |-- Create PaymentMethod record  --> |
   |                              |-- If first card: set as default    |
   |                              |-- Update Stripe customer default PM|
   |<-- 200 OK { received: true } |                                    |
   |                              |                                    |
   | (Stripe stops retrying on 200)                                    |
```

**Why Raw Body Matters**:
Stripe signature verification requires the **exact** raw bytes of the request body. The standard Express JSON parser modifies the body. The custom verification in `main.ts` captures `req.rawBody = buf` specifically for the `/billing/webhook` path.

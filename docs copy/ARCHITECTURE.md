# System Architecture

> **PBX-Whitelabel** — A multi-tenant, cloud-based, whitelabel Private Branch Exchange (PBX) platform.

---

## Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture Diagram](#high-level-architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Backend Module Map](#backend-module-map)
5. [Frontend Architecture](#frontend-architecture)
6. [External Services & Integrations](#external-services--integrations)
7. [Security Architecture](#security-architecture)
8. [Rate Limiting & Middleware Pipeline](#rate-limiting--middleware-pipeline)
9. [Global Error Handling](#global-error-handling)
10. [Deployment Architecture](#deployment-architecture)

---

## Overview

PBX-Whitelabel is a **full-stack, multi-tenant** platform that lets **Partners** (whitelabel operators) provision and brand a PBX service for their **Tenants** (businesses). Each Tenant can:

- Buy and manage local phone numbers (DIDs) and Toll-Free Numbers (TFNs)
- Set up SIP Extensions for desk phones and softphones
- Build visual Call Flows using drag-and-drop IVR editors
- Manage billing, wallets, and subscriptions
- Monitor live calls in real-time via WebSockets

The system is divided into two core services:
- **Backend**: A NestJS REST API + Socket.io server
- **Frontend**: A React 19 single-page application (SPA)

---

## High-Level Architecture Diagram

```
+--------------------------------------------------------------------------+
|                         CLIENT LAYER (Browser)                           |
|  +--------------------------------------------------------------------+  |
|  |          React 19 SPA (Vite + Tailwind CSS + React Query)          |  |
|  |   - Visual Call Flow Builder (@xyflow/react)                       |  |
|  |   - Real-time Dashboard (socket.io-client)                         |  |
|  +-----------------------------+--------------------+------------------+  |
+------------------------------+|-+------------------+|-------------------+
                               |  HTTPS REST (JSON)  |  WebSocket (Socket.io)
                               v                     v
+--------------------------------------------------------------------------+
|                   API LAYER  (NestJS @ port 3000)                        |
|   Global Prefix: /api                                                    |
|  +------------+ +----------+ +-----------+ +------------------------+   |
|  | AuthModule | |TelecomMod| |BillingMod | |  MonitorGateway        |   |
|  | WalletMod  | | TenantsM | | AdminMod  | |  (Socket.io namespace) |   |
|  +-----+------+ +----+-----+ +-----+-----+ +----------+-------------+   |
|        |              |             |                   |                |
|  +-----v--------------v-------------v-------------------v-----------+   |
|  |                       SERVICE LAYER                               |   |
|  |  EnforcementService | WalletService | FreeSwitchSyncService       |   |
|  |  BillingService     | TelecomService| AuditInterceptor            |   |
|  +----------+--------------------+-------------------+---------------+   |
+--------------|--------------------|--------------------|-------------------+
               |                    |                    |
   +-----------v------+  +----------v------+  +----------v------------------+
   |  PostgreSQL DB   |  |    Redis        |  |  FreeSWITCH + Kamailio      |
   |  (via Prisma)    |  |  (Pub/Sub +     |  |  (SIP Telephony Server)     |
   |                  |  |   Cache)        |  |                             |
   +------------------+  +-----------------+  +-----------------------------+
               |
   +-----------v---------------------------------------------------------------------+
   |                         EXTERNAL SERVICES                                       |
   |   Stripe API  |  Sub-Billing API  |  SMTP (Mail)  |  Telecom Carriers           |
   +---------------------------------------------------------------------------------+
```

---

## Technology Stack

### Backend (`/backend`)

| Component          | Technology                        | Purpose                                      |
|--------------------|-----------------------------------|----------------------------------------------|
| Framework          | NestJS (Node.js + TypeScript)     | Modular REST API server                      |
| ORM                | Prisma ORM                        | Type-safe database queries & migrations      |
| Database           | PostgreSQL                        | Primary relational data store                |
| Caching / Pub-Sub  | Redis (via `redis` npm client)    | Call event streaming, rate limiting, lookup  |
| Real-Time          | Socket.io                         | Live call monitoring & push notifications    |
| Payments           | Stripe SDK                        | Checkout, Setup Intents, Webhooks            |
| Background Email   | Nodemailer + SMTP                 | Password reset, invite emails                |
| SIP Telephony      | FreeSWITCH + Kamailio             | Dialplan execution, SIP registration         |
| Security           | Helmet, `@nestjs/throttler`, JWT  | HTTP hardening, rate limiting, auth          |
| Compression        | `compression` middleware          | Gzip HTTP response compression               |

### Frontend (`/frontend`)

| Component          | Technology                        | Purpose                                      |
|--------------------|-----------------------------------|----------------------------------------------|
| Framework          | React 19 + Vite                   | SPA with fast HMR builds                     |
| Styling            | Tailwind CSS                      | Utility-first responsive design              |
| Data Fetching      | React Query (TanStack Query)      | Server state, caching, refetching            |
| Call Flow Builder  | `@xyflow/react`                   | Drag-and-drop visual IVR/routing editor      |
| WebSocket          | `socket.io-client`                | Live call dashboard                          |
| Drag & Drop        | `@dnd-kit`                        | UI drag-and-drop (ring groups, ordering)     |

---

## Backend Module Map

The NestJS application is fully modular. Each domain has its own module with controllers, services, and DTOs.

```
src/
├── app.module.ts           <- Root module — wires all modules together
├── main.ts                 <- Bootstrap: port 3000, global pipes, guards, CORS
│
├── auth/                   <- JWT Auth, login, signup, password reset, impersonation
├── users/                  <- User CRUD, roles, user audit logs
├── tenants/                <- Tenant management, feature flags, tenant config
├── admin/                  <- Super-Admin dashboard APIs
├── onboarding/             <- Tenant onboarding flows
│
├── billing/                <- Stripe checkout, webhooks, payment methods
├── wallet/                 <- Balance queries, top-up, sub-billing integration
├── payments/               <- Payment processing orchestration
├── plans/                  <- Plan catalog management
├── usage/                  <- Per-minute usage recording
├── addons/                 <- Addon catalog (monitoring, recording, etc.)
│
├── telecom/                <- DIDs, TFNs, Extensions, IVRs, Ring Groups, Schedules
├── freeswitch/             <- FreeSWITCH & Kamailio sync, dialplan generation
├── carriers/               <- Outbound carrier management
├── inbound-whitelist/      <- Carrier IP whitelisting
│
├── monitor/                <- WebSocket gateway for live call monitoring
├── notifications/          <- In-app notification system
├── audit/                  <- Audit log interceptor & service
├── enforcement/            <- Service state enforcement (plan expired, wallet zero)
│
├── redis/                  <- Redis client module (pub/sub + lookup cache)
├── mail/                   <- Email service (Nodemailer)
├── prisma/                 <- Global Prisma client singleton
├── config/                 <- Configuration service (env vars mapping)
└── common/                 <- Shared filters, guards, interceptors, middleware
```

### Global Providers (Applied to All Requests)

| Provider                 | Type             | Purpose                                                    |
|--------------------------|------------------|------------------------------------------------------------|
| `HttpExceptionFilter`    | Exception Filter | Standardizes all error responses with timestamp & path     |
| `LoggingInterceptor`     | Interceptor      | Logs every incoming request                                |
| `AuditInterceptor`       | Interceptor      | Writes audit log entries for state-changing actions        |
| `ThrottlerGuard`         | Guard            | Rate limiting: 300 requests / 60 seconds per client        |
| `TenantMiddleware`       | Middleware        | Extracts tenant context from JWT and attaches to request   |
| `ValidationPipe`         | Pipe             | Auto-validates and transforms DTO bodies                   |

---

## Frontend Architecture

```
frontend/src/
├── pages/          <- Route-level page components
├── components/     <- Reusable UI components
├── hooks/          <- Custom React hooks (data fetching via React Query)
├── context/        <- Auth context, Socket context
├── api/            <- Axios API client functions
└── utils/          <- Helper functions
```

**Data Flow**:
1. `React Query` hooks (`useQuery`, `useMutation`) call Axios functions in `api/`.
2. Axios sends requests to the NestJS backend at `VITE_API_URL`.
3. Responses are cached by React Query with configurable `staleTime`.
4. WebSocket events from `socket.io-client` update the live call dashboard directly via state.

---

## External Services & Integrations

### 1. Stripe (Payment Processing)
- **Purpose**: Handles credit card setup, checkout sessions, and webhook events.
- **Connection**: `BillingService` initializes `new Stripe(secretKey)` on module init.
- **Key Flows**:
  - `POST /api/billing/create-checkout` → Creates Stripe Checkout Session (mode: `setup`) → Returns redirect URL
  - `POST /api/billing/webhook` → Receives Stripe events (e.g., `setup_intent.succeeded`) → Saves `PaymentMethod` to DB
- **Critical Config**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Webhook Raw Body**: The `main.ts` preserves the raw buffer for `/billing/webhook` to pass Stripe signature verification.

### 2. Sub-Billing API (Internal Billing System)
- **Purpose**: The primary system that tracks wallet balances, usage, and subscriptions. PBX acts as a client to this API.
- **Connection**: `WalletService` uses NestJS `HttpService` (Axios) to call `SUB_BILLING_API_URL`.
- **Key Endpoints Called**:
  - `GET /pbx/balance/:customerId` — Fetch wallet balance
  - `POST /payments/initiate` — Initiate a wallet top-up checkout
  - `POST /payments/manual` — Manually adjust balance (CREDIT/DEBIT)
  - `POST /customers` — Register a new tenant in sub-billing
  - `POST /subscriptions` — Create a subscription for a tenant
  - `POST /subscriptions/switch-plan` — Change a tenant's subscription plan
- **Fallback**: If Sub-Billing is unavailable, `WalletService.getBalance()` falls back to the local PostgreSQL `Wallet` table.

### 3. FreeSWITCH (SIP Media Server)
- **Purpose**: Executes dialplans for call routing, IVR audio playback, and call recording.
- **Connection**: `FreeSwitchSyncService` writes directly to the FreeSWITCH PostgreSQL database (a separate DB connection) via `FreeSwitchDBService`.
- **How it works**:
  1. When an Extension, IVR, Ring Group, or DID is created/updated, `FreeSwitchSyncService.sync*()` is called.
  2. It generates an XML dialplan using `DialplanGeneratorService`.
  3. The XML is upserted into the `dialplan` table of the FreeSWITCH DB.
  4. `CacheFlushService` flushes FreeSWITCH's XML cache so the new dialplan is picked up immediately.
- **Key Config**: `FREESWITCH_DB_URL`, `SIP_SERVER`

### 4. Kamailio (SIP Proxy / Registrar)
- **Purpose**: Handles SIP registration for extensions (desk phones, softphones).
- **Connection**: `KamailioDBService` writes directly to the Kamailio `subscriber` database table.
- **How it works**: When an Extension is created or its password changes, `kamailioDB.syncSubscriber()` upserts the SIP credentials into Kamailio's subscriber table.
- **Key Config**: `KAMAILIO_DB_URL`

### 5. Redis
- **Purpose**: Used for three distinct functions:
  - **Pub/Sub (`calls_stream` channel)**: FreeSWITCH publishes call state events. `MonitorGateway` subscribes and forwards them to clients via Socket.io.
  - **Lookup Cache (`LookupRedisService`)**: Caches extension lookup tables by tenant `customerCode` to speed up call routing decisions.
  - **Rate Limiting**: `ThrottlerModule` uses Redis as the backing store for distributed rate limiting.
- **Connection**: Two Redis clients are used — one for publishing/standard ops (`REDIS_CLIENT`) and one dedicated subscriber (`REDIS_SUBSCRIBER`).
- **Key Config**: `REDIS_URL`

### 6. SMTP (Mail Service)
- **Purpose**: Sends transactional emails (password reset, user invitations).
- **Connection**: `MailModule` uses `Nodemailer` configured with SMTP credentials from the `Partner` entity or environment variables.
- **Key Config**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (can be overridden per-Partner from DB)

---

## Security Architecture

### Authentication
- **JWT Access Token**: Short-lived (typically 15 minutes). Signed with `JWT_SECRET`.
- **JWT Refresh Token**: Long-lived. Stored hashed in DB. Used to obtain new access tokens via `POST /api/auth/refresh`.
- **Impersonation**: Super Admins can impersonate tenant users. The JWT payload carries an `impersonation` field.

### Authorization
- **`JwtAuthGuard`**: Verifies access token on all protected routes.
- **`RolesGuard`**: Checks user `role` (SUPER_ADMIN, ADMIN, SUPPORT) for role-restricted endpoints.
- **`EnforcementService`**: Before any action that costs money or creates telecom resources, the service state is checked (plan expired, wallet zero/negative).

### HTTP Hardening
- **`helmet`**: Sets security HTTP headers (XSS, MIME sniffing, etc.). CSP is disabled to allow external branding assets.
- **CORS**: Enabled globally with `app.enableCors()`.
- **Rate Limiting**: 300 requests per minute per client via `ThrottlerGuard`.

---

## Rate Limiting & Middleware Pipeline

Every request passes through this pipeline in order:

```
[Incoming Request]
       |
       v
[Helmet Middleware]       <- Security HTTP headers
       |
       v
[TenantMiddleware]        <- Extracts tenantId from JWT, attaches to req
       |
       v
[ThrottlerGuard]          <- Rate limit check (300 req/min)
       |
       v
[JwtAuthGuard]            <- Verifies Bearer token (on protected routes)
       |
       v
[RolesGuard]              <- Role check (on role-restricted routes)
       |
       v
[ValidationPipe]          <- DTO validation & transformation
       |
       v
[LoggingInterceptor]      <- Logs request
       |
       v
[AuditInterceptor]        <- Records state changes to audit_logs table
       |
       v
[Controller -> Service]   <- Business logic
       |
       v
[HttpExceptionFilter]     <- Catches errors, returns standardized JSON
```

---

## Global Error Handling

All unhandled exceptions are caught by `HttpExceptionFilter`. It produces a consistent error envelope:

```json
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
  "error": "Bad Request",
  "timestamp": "2024-10-06T12:00:00.000Z",
  "path": "/api/telecom/dids"
}
```

- **5xx errors**: Logged with full stack trace using NestJS `Logger`.
- **4xx errors**: Logged as warnings (no stack trace).

---

## Deployment Architecture

### Recommended Production Stack

```
[Nginx / Reverse Proxy]
       |
       +---> [React SPA]           <- Served as static files from /frontend/dist
       |
       +---> [NestJS API @ :3000]  <- Proxied from /api/*
                  |
                  +-- [PostgreSQL]     (primary database)
                  +-- [Redis]          (managed - Redis Cloud / Elasticache)
                  +-- [FreeSWITCH DB] (separate PostgreSQL for SIP dialplans)
                  +-- [Kamailio DB]    (separate PostgreSQL for SIP subscribers)
                  +-- [Uploads]        (local /uploads dir — recommend migrating to S3)
```

### Environment Variables Reference

| Variable                | Module         | Purpose                                      |
|-------------------------|----------------|----------------------------------------------|
| `DATABASE_URL`          | Prisma         | Main PostgreSQL connection string            |
| `REDIS_URL`             | Redis          | Redis connection string                      |
| `JWT_SECRET`            | Auth           | Secret for signing JWT access tokens         |
| `JWT_REFRESH_SECRET`    | Auth           | Secret for signing JWT refresh tokens        |
| `STRIPE_SECRET_KEY`     | Billing        | Stripe API secret key                        |
| `STRIPE_WEBHOOK_SECRET` | Billing        | Stripe webhook endpoint secret               |
| `SUB_BILLING_API_URL`   | Wallet         | Base URL of the sub-billing system           |
| `FREESWITCH_DB_URL`     | FreeSWITCH     | PostgreSQL URL for FreeSWITCH dialplan DB    |
| `KAMAILIO_DB_URL`       | Kamailio       | PostgreSQL URL for Kamailio subscriber DB    |
| `SIP_SERVER`            | Extension      | SIP server hostname for auth realm           |
| `SMTP_HOST`             | Mail           | SMTP host for sending emails                 |
| `FRONTEND_URL`          | Billing/Wallet | Frontend URL for Stripe redirect URLs        |

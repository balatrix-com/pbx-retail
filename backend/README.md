# Telecom SaaS Backend

Production-hardened NestJS backend for Telecom SaaS.

## Features

- **Authentication**: JWT-based Auth with Multi-tenancy isolation.
- **Subscriptions**: Tiered plans (Basic, Standard), Billing Cycles.
- **Wallet Ledger**: Double-entry bookkeeping for credits/debits.
- **Stripe Integration**: Checkout, Webhooks, Payment Methods (Mock-ready).
- **Telecom Resources**: TFN Management, Extension Auto-generation, Monitoring Entitlements.
- **Usage & Enforcement**: Real-time usage reporting, Free minute deduction, Overage billing, and Blocking logic.
- **Hardening**:
  - **Rate Limiting**: Global throttling (100 req/min).
  - **Tracing**: `X-Request-ID` tracing.
  - **Audit Logs**: Database audit trail for critical actions.
  - **Security**: Helmet headers, Compression.
  - **Validation**: Global ValidationPipelines.

## Setup

1. **Environment**:
   Copy `.env.example` to `.env` and fill in secrets (DB URL, Stripe Keys).
   ```bash
   cp .env.example .env
   ```

2. **Docker**:
   Start Postgres and Redis.
   ```bash
   docker-compose up -d
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Database**:
   Run migrations and seed data.
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Run**:
   ```bash
   npm run start:dev  # Development
   npm run start:prod # Production
   ```

## Key API Endpoints

- **Auth**: `/auth/signup`, `/auth/login`
- **Wallet**: `/wallet`, `/wallet/topup`
- **Billing**: `/billing/create-checkout`
- **Telecom**: `/telecom/tfns/search`, `/telecom/extensions`
- **Service State**: `/service-state`

## Architecture

- **Modular**: Feature-based modules (Auth, Wallet, Telecom, etc.).
- **Common**: Shared utilities (Audit, Guards, Interceptors).
- **Enforcement**: Centralized logic for Service Blocking (`PLAN_EXPIRED`, `WALLET_ZERO`).

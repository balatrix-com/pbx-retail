# PBX-Whitelabel Documentation

> A multi-tenant, cloud-based, whitelabel Private Branch Exchange (PBX) platform.

Welcome to the complete technical documentation for PBX-Whitelabel. Choose a document below based on what you need.

---

## Documentation Index

| Document | Purpose | Best For |
|---|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, tech stack, module map, middleware pipeline, security, deployment | New developers, architects, DevOps |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | All database tables, fields, relationships, enumerations, and ER overview | Backend developers, DB admins |
| [API_REFERENCE.md](./API_REFERENCE.md) | All REST endpoints and WebSocket events with request/response examples | Frontend developers, API consumers |
| [FLOWS.md](./FLOWS.md) | End-to-end sequence diagrams for all critical system workflows | Developers learning the system |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | External service connections (Stripe, Sub-Billing, FreeSWITCH, Redis, etc.) | DevOps, backend developers |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Production error catalog, root causes, and fixes | On-call engineers, senior developers |

---

## Existing Reference Documents

| Document | Purpose |
|---|---|
| [BARGE_API_DOCUMENTATION.md](./BARGE_API_DOCUMENTATION.md) | Detailed barge-in (listen/whisper/join) API for live calls |
| [DEPLOY_BARGE_API.md](./DEPLOY_BARGE_API.md) | Deployment guide for the barge-in feature |
| [REDIS_FRONTEND_GUIDE_NEW.md](./REDIS_FRONTEND_GUIDE_NEW.md) | Redis integration guide for the frontend |

---

## Quick Start

### Running Locally

**Backend**:
```bash
cd backend
npm install
# Copy .env.example to .env and fill in values
npx prisma db push
npm run seed:ratecards
npm run seed:tfns
npm run start:dev
# API available at http://localhost:3000/api
```

**Frontend**:
```bash
cd frontend
npm install
# Set VITE_API_URL=http://localhost:3000/api in .env
npm run dev
# UI available at http://localhost:5173
```

### Minimum Required Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/pbx
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-long-random-secret
JWT_REFRESH_SECRET=your-other-long-random-secret
SUB_BILLING_API_URL=http://localhost:5005/api
FRONTEND_URL=http://localhost:5173

# Optional (for full functionality)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FREESWITCH_DB_URL=postgresql://fs_user:pass@localhost:5432/freeswitch
KAMAILIO_DB_URL=postgresql://kam_user:pass@localhost:5432/kamailio
SIP_SERVER=sip.yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourmail@gmail.com
SMTP_PASS=yourpassword
```

---

## System at a Glance

```
Partner (Whitelabel Operator)
  └── Tenant (Business)
        ├── Users (Admins, Support)
        ├── DIDs & TFNs (Phone Numbers)
        ├── Extensions (SIP Endpoints)
        ├── Ring Groups (Call Distribution)
        ├── IVRs (Interactive Menus)
        ├── Schedules (Business Hours Routing)
        └── Billing (Wallet + Subscription)
```

**Call flows**: Browser → NestJS REST API → PostgreSQL/Redis → FreeSWITCH → Carrier → Phone

**Live monitoring**: FreeSWITCH → Redis Pub/Sub → NestJS WebSocket → Browser Dashboard

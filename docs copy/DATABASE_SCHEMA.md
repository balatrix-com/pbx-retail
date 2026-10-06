# Database Schema Reference

> Source of Truth: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)

This document describes all database entities, their fields, relationships, and the enumerations used throughout the system.

---

## Table of Contents
1. [Core Tenancy Model](#core-tenancy-model)
2. [Users & Auth](#users--auth)
3. [Phone Numbers (Assets)](#phone-numbers-assets)
4. [Telephony (Extensions, Ring Groups, IVR)](#telephony-extensions-ring-groups-ivr)
5. [Billing (Wallet, Plans, Subscriptions)](#billing-wallet-plans-subscriptions)
6. [Routing & Scheduling](#routing--scheduling)
7. [Carrier & SIP Configuration](#carrier--sip-configuration)
8. [Rate Cards & Usage Billing](#rate-cards--usage-billing)
9. [Audit, Notifications & Idempotency](#audit-notifications--idempotency)
10. [Enumerations](#enumerations)
11. [Entity Relationship Overview](#entity-relationship-overview)

---

## Core Tenancy Model

### `Partner` (table: `partners`)

The top-level whitelabel entity. A Partner owns the branding configuration for one or more Tenants.

| Column           | Type      | Notes                                        |
|------------------|-----------|----------------------------------------------|
| `id`             | UUID (PK) | Auto-generated                               |
| `name`           | String    | Partner's display name                       |
| `domain`         | String    | **Unique**. Domain used for branding lookup  |
| `logoMain`       | String?   | URL to the main logo asset                   |
| `logoSidebar`    | String?   | URL to the sidebar logo asset                |
| `favicon`        | String?   | URL to the favicon                           |
| `primaryColor`   | String?   | Hex color for primary brand color            |
| `accentColor`    | String?   | Hex color for accent color                   |
| `supportEmail`   | String?   | Support contact email                        |
| `supportPhone`   | String?   | Support contact phone                        |
| `smtpHost`       | String?   | SMTP host for sending emails on behalf of partner |
| `smtpPort`       | Int?      | SMTP port                                    |
| `smtpSecure`     | Boolean?  | Use TLS/SSL                                  |
| `smtpUser`       | String?   | SMTP username                                |
| `smtpPass`       | String?   | SMTP password (stored in DB — encrypt in production) |
| `smtpFromName`   | String?   | "From" display name for emails               |
| `smtpFromEmail`  | String?   | "From" email address                         |
| `createdAt`      | DateTime  |                                              |
| `updatedAt`      | DateTime  | Auto-updated                                 |

**Relations**: `tenants` (one-to-many), `users` (one-to-many)

---

### `Tenant` (table: `tenants`)

A business/company using the PBX platform under a Partner. The central entity — virtually everything belongs to a Tenant.

| Column                  | Type      | Notes                                                   |
|-------------------------|-----------|---------------------------------------------------------|
| `id`                    | UUID (PK) | Auto-generated                                          |
| `name`                  | String    | Business name                                           |
| `stripeCustomerId`      | String?   | **Unique**. Stripe Customer ID for direct Stripe payments |
| `serviceBlocked`        | Boolean   | When `true`, tenant services are suspended              |
| `customerCode`          | String?   | **Unique**. Short code used in FreeSWITCH/Kamailio routing |
| `subBillingCustomerId`  | String?   | **Unique**. Customer ID in the Sub-Billing system       |
| `partnerId`             | String?   | FK → `Partner`                                          |
| `outboundEndpointId`    | Int?      | FK → `OutboundEndpoint` (SIP gateway for outbound calls) |
| `createdAt`             | DateTime  |                                                         |
| `updatedAt`             | DateTime  | Auto-updated                                            |

**Relations**: `users`, `dids`, `tfns`, `extensions`, `ringGroups`, `ivrs`, `wallet`, `subscriptions`, `paymentMethods`, `usageRecords`, `audioFiles`, `didForwards`, `operationalSchedules`, `notifications`, `monitoringAddOn`, `tenantFeatures`, `partner`, `outboundEndpoint`

---

## Users & Auth

### `User` (table: `users`)

Platform users who log into the dashboard.

| Column                 | Type        | Notes                                               |
|------------------------|-------------|-----------------------------------------------------|
| `id`                   | UUID (PK)   |                                                     |
| `email`                | String      | **Unique**                                          |
| `password`             | String?     | Bcrypt-hashed. Nullable for invite-only flows       |
| `name`                 | String?     |                                                     |
| `role`                 | `Role` enum | `SUPER_ADMIN`, `ADMIN`, `SUPPORT`                   |
| `status`               | `UserStatus`| `ACTIVE`, `SUSPENDED`, `DELETED`, `INVITED`         |
| `tenantId`             | String?     | FK → `Tenant`. Null for Super Admins                |
| `partnerId`            | String?     | FK → `Partner`                                      |
| `refreshToken`         | String?     | Hashed refresh token stored in DB                   |
| `inviteToken`          | String?     | **Unique**. Token for email invitation link         |
| `inviteTokenExpiry`    | DateTime?   | Expiry for invite token                             |
| `monitoringEnabled`    | Boolean     | Can this user access live call monitoring?          |
| `monitoringExtension`  | String?     | Extension number for barge-in access                |
| `monitoringSecret`     | String?     | Secret for barge-in authorization                   |
| `forcePasswordChange`  | Boolean     | Forces user to change password on next login        |
| `resetToken`           | String?     | **Unique**. Password reset token                    |
| `resetTokenExpiry`     | DateTime?   |                                                     |

**Indexes**: `tenantId`, `role`, `status`

---

### `SupportProfile` (table: `support_profiles`)

Defines the relationship between a Support user and their managing Admin user.

| Column              | Type      | Notes                                   |
|---------------------|-----------|-----------------------------------------|
| `id`                | UUID (PK) |                                         |
| `adminUserId`       | String    | FK → `User` (the Admin)                 |
| `supportUserId`     | String    | **Unique** FK → `User` (the Support)    |
| `monitoringEnabled` | Boolean   | Whether this support profile can monitor|

---

### `UserAuditLog` (table: `user_audit_logs`)

Immutable log of user management actions.

| Column      | Type              | Notes                              |
|-------------|-------------------|------------------------------------|
| `id`        | UUID (PK)         |                                    |
| `actorId`   | String            | FK → `User` (who performed action) |
| `targetId`  | String?           | FK → `User` (who was affected)     |
| `action`    | `UserAuditAction` | Enum of possible actions           |
| `metadata`  | JSON?             | Extra contextual data              |
| `timestamp` | DateTime          |                                    |

---

## Phone Numbers (Assets)

### `DID` (table: `dids`)

Direct Inward Dialing numbers — local/mobile phone numbers.

| Column          | Type      | Notes                                                   |
|-----------------|-----------|---------------------------------------------------------|
| `id`            | UUID (PK) |                                                         |
| `number`        | String    | **Unique**. E.164 format (e.g., `+12025551234`)         |
| `tenantId`      | String?   | FK → `Tenant`. Null = unassigned (available in pool)    |
| `provider`      | String    | Default: `telnyx`                                       |
| `monthlyFee`    | Decimal   | Default: $2.00                                          |
| `routeType`     | String?   | `extension`, `ring_group`, `ivr`, `schedule`, `forward` |
| `routeTargetId` | String?   | UUID of the route destination entity                    |
| `forwardEnabled`| Boolean   | Simple call forwarding enabled                          |
| `forwardNumber` | String?   | Phone number to forward to                              |
| `isActive`      | Boolean   | Default: true                                           |
| `sequenceId`    | Int       | Order in UI                                             |

**Indexes**: `tenantId`, `number`

---

### `TFN` (table: `tfns`)

Toll-Free Numbers with lifecycle state management.

| Column          | Type        | Notes                                                     |
|-----------------|-------------|-----------------------------------------------------------|
| `id`            | UUID (PK)   |                                                           |
| `number`        | String      | **Unique**. E.164 format (e.g., `+18005551234`)           |
| `status`        | `TFNStatus` | `AVAILABLE`, `ASSIGNED`, `HELD`, `QUARANTINE`             |
| `isDemo`        | Boolean     | Demo number, not charged                                  |
| `price`         | Decimal     | Default: $2.00 per purchase                               |
| `tenantId`      | String?     | FK → `Tenant`                                             |
| `purchasedAt`   | DateTime?   | When the tenant purchased this TFN                        |
| `routeType`     | String?     | Same routing options as DID                               |
| `routeTargetId` | String?     | UUID of the route destination entity                      |
| `forwardEnabled`| Boolean     |                                                           |
| `forwardNumber` | String?     |                                                           |
| `heldBy`        | String?     | TenantId holding this number                              |
| `heldUntil`     | DateTime?   | Time until hold expires                                   |

**Indexes**: `(status, routeType)`

---

### `DIDForward` (table: `did_forwards`)

Named call forwarding destinations associated with a tenant.

| Column              | Type      | Notes                                      |
|---------------------|-----------|--------------------------------------------|
| `id`                | UUID (PK) |                                            |
| `tenantId`          | String    | FK → `Tenant`                              |
| `name`              | String    | Friendly name (e.g., "After Hours Cell")   |
| `destinationNumber` | String    | Phone number to forward to                 |
| `sequenceId`        | Int       |                                            |

---

## Telephony (Extensions, Ring Groups, IVR)

### `Extension` (table: `extensions`)

SIP endpoints (desk phones, softphones) assigned to users/devices.

| Column                      | Type      | Notes                                           |
|-----------------------------|-----------|-------------------------------------------------|
| `id`                        | UUID (PK) |                                                 |
| `tenantId`                  | String    | FK → `Tenant`                                   |
| `extensionNumber`           | String    | Short number (e.g., "1001")                     |
| `name`                      | String    | Display name (e.g., "John's Phone")             |
| `sipUsername`               | String    | **Unique** globally. Format: `{number}@domain`  |
| `sipPassword`               | String    | Cleartext SIP password (stored in DB)           |
| `sipAuthRealm`              | String?   | SIP realm (typically the SIP server hostname)   |
| `outboundCallerIdNumber`    | String?   | Override caller ID for outbound calls           |
| `recordingEnabled`          | Boolean   | Call recording on/off for this extension        |
| `forwardAllEnabled`         | Boolean   | Call Forward Unconditional (CFU)                |
| `forwardAllDestination`     | String?   | Destination for CFU                             |
| `forwardAllType`            | String?   | `extension` or external number                  |
| `forwardBusyEnabled`        | Boolean   | Call Forward on Busy (CFB)                      |
| `forwardBusyDestination`    | String?   |                                                 |
| `forwardNoAnswerEnabled`    | Boolean   | Call Forward No Answer (CFNA)                   |
| `forwardNoAnswerDestination`| String?   |                                                 |
| `forwardNoAnswerTimeout`    | Int       | Seconds before CFNA triggers. Default: 20       |
| `sequenceId`                | Int       |                                                 |

**Unique Constraint**: `(tenantId, extensionNumber)` — extension numbers are unique per tenant.

---

### `RingGroup` (table: `ring_groups`)

Groups of extensions that ring together.

| Column              | Type      | Notes                                         |
|---------------------|-----------|-----------------------------------------------|
| `id`                | UUID (PK) |                                               |
| `tenantId`          | String    | FK → `Tenant`                                 |
| `name`              | String    |                                               |
| `strategy`          | String    | Default: `simultaneous`. Can also be `sequential` |
| `ringTimeout`       | Int       | Seconds before no-answer action fires         |
| `noAnswerAction`    | String?   | What to do when no one answers                |
| `noAnswerDestination`| String?  | Destination for no-answer action              |
| `sequenceId`        | Int       |                                               |

---

### `RingGroupMember` (table: `ring_group_members`)

Join table linking Ring Groups to Extensions.

| Column        | Type      | Notes                                |
|---------------|-----------|--------------------------------------|
| `id`          | UUID (PK) |                                      |
| `ringGroupId` | String    | FK → `RingGroup`                     |
| `extensionId` | String    | FK → `Extension`                     |
| `priority`    | Int       | Used for `sequential` strategy       |
| `position`    | Int       | Display order                        |

**Unique Constraint**: `(ringGroupId, extensionId)`

---

### `IVR` (table: `ivrs`)

Interactive Voice Response menus.

| Column              | Type      | Notes                                               |
|---------------------|-----------|-----------------------------------------------------|
| `id`                | UUID (PK) |                                                     |
| `tenantId`          | String    | FK → `Tenant`                                       |
| `name`              | String    |                                                     |
| `greetingAudioPath` | String?   | URL/path to the greeting audio file                 |
| `invalidAudioPath`  | String?   | URL/path to "invalid input" audio file              |
| `timeoutMs`         | Int       | Milliseconds to wait for DTMF input. Default: 5000  |
| `maxAttempts`       | Int       | Max retries before call drops. Default: 3           |
| `menu`              | JSON      | Menu definition: `{ "1": { type, targetId }, ... }` |
| `sequenceId`        | Int       |                                                     |

---

### `AudioFile` (table: `audio_files`)

Audio files uploaded by tenants for use in IVRs.

| Column           | Type      | Notes                                       |
|------------------|-----------|---------------------------------------------|
| `id`             | UUID (PK) |                                             |
| `tenantId`       | String    | FK → `Tenant`                               |
| `name`           | String    | User-facing name                            |
| `filename`       | String    | Stored filename on disk                     |
| `originalName`   | String    | Original upload filename                    |
| `mimeType`       | String    | e.g., `audio/wav`, `audio/mpeg`             |
| `size`           | Int       | File size in bytes                          |
| `storageUrl`     | String    | Public URL path (e.g., `/api/uploads/...`)  |
| `durationSeconds`| Decimal?  | Audio duration                              |

---

## Billing (Wallet, Plans, Subscriptions)

### `Wallet` (table: `wallets`)

Pre-paid balance for each tenant. One wallet per tenant.

| Column                | Type      | Notes                                              |
|-----------------------|-----------|----------------------------------------------------|
| `id`                  | UUID (PK) |                                                    |
| `tenantId`            | String    | **Unique** FK → `Tenant`                           |
| `balance`             | Decimal   | Current balance in USD. Default: $0.00             |
| `currency`            | String    | Default: `USD`                                     |
| `autoRechargeEnabled` | Boolean   | Automatic top-up when balance drops below threshold|
| `rechargeThreshold`   | Decimal   | Default: $10.00                                    |
| `rechargeAmount`      | Decimal   | Amount to auto-recharge. Default: $50.00           |

---

### `WalletTransaction` (table: `wallet_transactions`)

Immutable ledger of all balance changes.

| Column        | Type                | Notes                                      |
|---------------|---------------------|--------------------------------------------|
| `id`          | UUID (PK)           |                                            |
| `walletId`    | String              | FK → `Wallet`                              |
| `amount`      | Decimal             | Positive value; direction determined by `type` |
| `type`        | `TransactionType`   | `CREDIT` (money in) or `DEBIT` (money out) |
| `status`      | `TransactionStatus` | `PENDING`, `SUCCESS`, `FAILED`             |
| `description` | String              | Human-readable reason for transaction      |
| `referenceId` | String?             | External reference (e.g., Stripe charge ID)|
| `paymentId`   | String?             | Stripe Payment Intent ID                   |

---

### `Plan` (table: `plans`)

Subscription tiers available for tenants.

| Column                | Type          | Notes                                        |
|-----------------------|---------------|----------------------------------------------|
| `id`                  | UUID (PK)     |                                              |
| `name`                | String        |                                              |
| `description`         | String?       |                                              |
| `stripePriceId`       | String?       | Stripe Price ID for recurring billing        |
| `billingCycle`        | `BillingCycle`| `MONTHLY` or `YEARLY`                        |
| `tier`                | `Tier`        | `BASIC`, `STANDARD`, `PREMIUM`, `ENTERPRISE` |
| `price`               | Decimal       | Recurring plan price                         |
| `freeMinutes`         | Int           | Included free minutes per billing cycle      |
| `overagePrice`        | Decimal       | Per-minute rate beyond free minutes          |
| `allowCallRecording`  | Boolean       | Feature flag                                 |
| `allowDIDForwards`    | Boolean       | Feature flag                                 |
| `allowSchedules`      | Boolean       | Feature flag                                 |
| `allowVoicemail`      | Boolean       | Feature flag (default: true)                 |
| `maxDIDs`             | Int           | DID limit (default: 10)                      |
| `maxExtensions`       | Int           | Extension limit (default: 50)                |
| `maxIVRs`             | Int           | IVR limit (default: 5)                       |
| `maxRingGroups`       | Int           | Ring group limit (default: 10)               |
| `maxTFNs`             | Int           | TFN limit (default: 0)                       |
| `extraDidPrice`       | Decimal       | Per-DID cost beyond limit (default: $1.00)   |
| `extraExtensionPrice` | Decimal       | Per-extension cost beyond limit (default: $5.00)|
| `extraTfnPrice`       | Decimal       | Per-TFN cost beyond limit (default: $2.00)   |
| `initialCredit`       | Decimal       | Credit added to wallet on signup (default: $0)|
| `isCustom`            | Boolean       | Custom plan created by Super Admin           |
| `createdBy`           | String?       | User ID of creator (for custom plans)        |

---

### `Subscription` (table: `subscriptions`)

A tenant's active subscription to a Plan.

| Column                      | Type                  | Notes                                              |
|-----------------------------|-----------------------|----------------------------------------------------|
| `id`                        | UUID (PK)             |                                                    |
| `tenantId`                  | String                | FK → `Tenant`                                      |
| `planId`                    | String                | FK → `Plan`                                        |
| `status`                    | `SubscriptionStatus`  | `ACTIVE`, `EXPIRED`, `ARCHIVED`                    |
| `startDate`                 | DateTime              |                                                    |
| `endDate`                   | DateTime              | When the current billing period ends               |
| `remainingFreeMinutes`      | Int                   | Free minutes remaining in current period           |
| `subBillingSubscriptionId`  | String?               | **Unique**. ID in the Sub-Billing system           |

---

### `UsageRecord` (table: `usage_records`)

Per-call usage records for overage billing.

| Column           | Type      | Notes                              |
|------------------|-----------|------------------------------------|
| `id`             | UUID (PK) |                                    |
| `tenantId`       | String    | FK → `Tenant`                      |
| `subscriptionId` | String?   | FK → `Subscription`                |
| `minutes`        | Int       | Duration of the call in minutes    |
| `cost`           | Decimal   | Cost charged for this usage        |
| `createdAt`      | DateTime  |                                    |

---

### `PaymentMethod` (table: `payment_methods`)

Saved Stripe payment methods (credit cards).

| Column      | Type      | Notes                                       |
|-------------|-----------|---------------------------------------------|
| `id`        | String (PK)| Stripe `pm_xxx` ID used as PK              |
| `tenantId`  | String    | FK → `Tenant`                               |
| `brand`     | String    | Card brand (e.g., `visa`, `mastercard`)     |
| `last4`     | String    | Last 4 digits of card                       |
| `isDefault` | Boolean   | Whether this is the default payment method  |
| `expiresAt` | DateTime? | Card expiry date (last day of exp month)    |

---

### `Invoice` (table: `invoices`)

Invoice records for tenant billing.

| Column          | Type            | Notes                                |
|-----------------|-----------------|--------------------------------------|
| `id`            | UUID (PK)       |                                      |
| `tenantId`      | String?         |                                      |
| `status`        | `InvoiceStatus` | `DRAFT`, `PENDING`, `PAID`, `VOID`, `REFUNDED`, `DISPUTED` |
| `total`         | Decimal         |                                      |
| `balanceDue`    | Decimal         |                                      |
| `stripeId`      | String?         | **Unique**. Stripe Invoice ID        |
| `idempotencyKey`| String?         | **Unique**. Prevents duplicate invoices |
| `paidAt`        | DateTime?       |                                      |

---

## Routing & Scheduling

### `OperationalSchedule` (table: `operational_schedules`)

Time-based call routing rules (business hours vs. after hours).

| Column                  | Type      | Notes                                            |
|-------------------------|-----------|--------------------------------------------------|
| `id`                    | UUID (PK) |                                                  |
| `tenantId`              | String    | FK → `Tenant`                                    |
| `name`                  | String    |                                                  |
| `timezone`              | String    | IANA timezone (e.g., `America/New_York`)          |
| `startTime`             | String    | Business hours start (e.g., `09:00`)             |
| `endTime`               | String    | Business hours end (e.g., `17:00`)               |
| `daysMask`              | Int       | Bitmask for days (1=Mon, 2=Tue, 4=Wed, etc.)     |
| `primaryRouteType`      | String    | Route type during business hours                 |
| `primaryRouteTarget`    | String    | Route target ID during business hours            |
| `afterHoursRouteType`   | String    | Route type after hours                           |
| `afterHoursRouteTarget` | String    | Route target ID after hours                      |
| `weekendRouteType`      | String    | Route type on weekends                           |
| `weekendRouteTarget`    | String    | Route target ID on weekends                      |
| `isActive`              | Boolean   | Default: true                                    |

---

## Carrier & SIP Configuration

### `OutboundCarrier` (table: `outbound_carriers`)

Telecom carriers used for outbound call routing (e.g., Telnyx, Twilio).

| Column  | Type        | Notes       |
|---------|-------------|-------------|
| `id`    | Int (PK)    | Auto-increment |
| `name`  | String      | **Unique**. e.g., "Telnyx" |

### `OutboundEndpoint` (table: `outbound_endpoints`)

SIP gateway endpoints belonging to a carrier.

| Column           | Type      | Notes                                              |
|------------------|-----------|----------------------------------------------------|
| `id`             | Int (PK)  | Auto-increment                                     |
| `carrierId`      | Int       | FK → `OutboundCarrier`                             |
| `name`           | String    | e.g., "US-East Gateway"                            |
| `sipHost`        | String    | SIP server hostname/IP                             |
| `sipPort`        | Int       | Default: 5060                                      |
| `transport`      | String    | `udp`, `tcp`, `tls`                                |
| `prefix`         | String    | Number prefix to prepend (e.g., "011")             |
| `stripPlus`      | Boolean   | Strip leading `+` from dialed number               |
| `callerIdMode`   | String    | `extension` (use ext CID) or `override`            |
| `callerIdNumber` | String?   | Override caller ID when mode is `override`         |
| `isActive`       | Boolean   |                                                    |
| `isSystemDefault`| Boolean   | Fallback endpoint when no tenant-specific one set  |

### `InboundWhitelist` (table: `inbound_whitelist`)

Carrier IPs allowed to send inbound SIP traffic.

| Column      | Type      | Notes                                       |
|-------------|-----------|---------------------------------------------|
| `id`        | Int (PK)  | Auto-increment                              |
| `ipAddress` | String    | **Unique**. Source IP to whitelist          |
| `port`      | Int       | Default: 5060                               |
| `tag`       | String    | Description (e.g., "Telnyx Inbound")       |

---

## Rate Cards & Usage Billing

### `RateCard` (table: `rate_cards`)

Per-minute billing rates for inbound/outbound calls.

| Column                   | Type     | Notes                                    |
|--------------------------|----------|------------------------------------------|
| `ratecardId`             | Int (PK) | Auto-increment                           |
| `name`                   | String   |                                          |
| `currency`               | Char(3)  | Default: `USD`                           |
| `inRatePerMin`           | Decimal  | Inbound rate per minute (6 decimal places)|
| `inInitialIncrementSec`  | Int      | Initial billing increment (seconds)      |
| `inIncrementSec`         | Int      | Subsequent billing increment (seconds)   |
| `obRatePerMin`           | Decimal  | Outbound rate per minute                 |
| `obInitialIncrementSec`  | Int      |                                          |
| `obIncrementSec`         | Int      |                                          |

### `CustomerRatecard` (table: `customer_ratecard`)

Assigns a rate card to a customer (tenant) for a date range.

| Column          | Type      | Notes                                   |
|-----------------|-----------|-----------------------------------------|
| `customerId`    | String (PK)| Tenant's `customerCode`                |
| `ratecardId`    | Int       | FK → `RateCard`                         |
| `effectiveFrom` | DateTime  | When this rate card becomes active      |
| `effectiveTo`   | DateTime? | When this rate card expires (null = current)|

---

## Audit, Notifications & Idempotency

### `AuditLog` (table: `audit_logs`)

General system audit trail.

| Column       | Type      | Notes                                 |
|--------------|-----------|---------------------------------------|
| `id`         | UUID (PK) |                                       |
| `actorId`    | String?   | User ID who performed the action      |
| `actorEmail` | String?   | Email at time of action               |
| `actorType`  | String    | e.g., `USER`, `SYSTEM`                |
| `action`     | String    | Action performed (e.g., `CREATE_DID`) |
| `category`   | String    | Domain category                       |
| `targetId`   | String?   | ID of the affected entity             |
| `targetType` | String?   | Type of affected entity               |
| `metadata`   | JSON?     | Additional context                    |
| `ipAddress`  | String?   |                                       |
| `userAgent`  | String?   |                                       |

### `Notification` (table: `notifications`)

In-app notifications for users.

| Column     | Type      | Notes                               |
|------------|-----------|-------------------------------------|
| `id`       | UUID (PK) |                                     |
| `tenantId` | String    | FK → `Tenant`                       |
| `userId`   | String?   | FK → `User` (null = tenant-wide)    |
| `type`     | String    | Notification type category          |
| `title`    | String    |                                     |
| `message`  | String    |                                     |
| `read`     | Boolean   | Default: false                      |

### `IdempotencyKey` (table: `idempotency_keys`)

Prevents duplicate processing of the same request.

| Column      | Type      | Notes                                |
|-------------|-----------|--------------------------------------|
| `key`       | String (PK)| The idempotency key from request header |
| `method`    | String    | HTTP method (e.g., `POST`)           |
| `path`      | String    | Request path                         |
| `params`    | JSON      | Request parameters snapshot          |
| `response`  | JSON      | Cached response to replay            |
| `lockedAt`  | DateTime  | When the key was first used          |

---

## Enumerations

| Enum                | Values                                                                          |
|---------------------|---------------------------------------------------------------------------------|
| `Role`              | `SUPER_ADMIN`, `ADMIN`, `SUPPORT`                                               |
| `UserStatus`        | `ACTIVE`, `SUSPENDED`, `DELETED`, `INVITED`                                     |
| `TFNStatus`         | `AVAILABLE`, `ASSIGNED`, `HELD`, `QUARANTINE`                                   |
| `TransactionType`   | `CREDIT`, `DEBIT`                                                               |
| `TransactionStatus` | `PENDING`, `SUCCESS`, `FAILED`                                                  |
| `BillingCycle`      | `MONTHLY`, `YEARLY`                                                             |
| `Tier`              | `BASIC`, `STANDARD`, `PREMIUM`, `ENTERPRISE`                                    |
| `SubscriptionStatus`| `ACTIVE`, `EXPIRED`, `ARCHIVED`                                                 |
| `InvoiceStatus`     | `DRAFT`, `PENDING`, `PAID`, `VOID`, `REFUNDED`, `DISPUTED`                      |
| `UserAuditAction`   | `CREATE_USER`, `UPDATE_USER`, `SUSPEND_USER`, `ACTIVATE_USER`, `DELETE_USER`, `ASSIGN_SUPPORT`, `REMOVE_SUPPORT`, `CHANGE_ROLE`, `RESET_PASSWORD`, `INVITE_USER`, `ACCEPT_INVITE`, `REINVITE_USER`, `IMPERSONATE_USER`, `END_IMPERSONATION` |

---

## Entity Relationship Overview

```
Partner
  └── Tenant (many)
        ├── User (many)               -- People who log in
        ├── DID (many)                -- Phone numbers assigned
        ├── TFN (many)                -- Toll-free numbers assigned
        ├── Extension (many)          -- SIP endpoints
        │     └── RingGroupMember (many)
        ├── RingGroup (many)
        │     └── RingGroupMember (many)
        ├── IVR (many)
        ├── AudioFile (many)
        ├── DIDForward (many)
        ├── OperationalSchedule (many)
        ├── Wallet (one)
        │     └── WalletTransaction (many)
        ├── Subscription (many)
        │     └── UsageRecord (many)
        ├── PaymentMethod (many)
        ├── MonitoringAddOn (one)
        ├── TenantFeature (one)       -- Feature flags & limits
        └── Notification (many)

OutboundCarrier
  └── OutboundEndpoint (many)
        └── Tenant (many)             -- Tenants assigned to this endpoint

RateCard
  └── CustomerRatecard (many)         -- Maps tenant customer code to rate card
```

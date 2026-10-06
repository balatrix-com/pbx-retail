-- Baseline migration: Creates all tables from schema.prisma
-- Generated: 2026-08-26
-- This replaces 9 incremental migrations (20260127-20260731)

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'INVITED');

-- CreateEnum
CREATE TYPE "TFNStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'HELD', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserAuditAction" AS ENUM ('CREATE_USER', 'UPDATE_USER', 'SUSPEND_USER', 'ACTIVATE_USER', 'DELETE_USER', 'ASSIGN_SUPPORT', 'REMOVE_SUPPORT', 'CHANGE_ROLE', 'RESET_PASSWORD', 'INVITE_USER', 'ACCEPT_INVITE', 'REINVITE_USER', 'IMPERSONATE_USER', 'END_IMPERSONATION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'VOID', 'REFUNDED', 'DISPUTED');

-- CreateTable
CREATE TABLE "Health" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "Health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "serviceBlocked" BOOLEAN NOT NULL DEFAULT false,
    "customerCode" TEXT,
    "subBillingCustomerId" TEXT,
    "partnerId" TEXT,
    "outboundEndpointId" INTEGER,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfns" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "TFNStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 2.00,
    "tenantId" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "forwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forwardNumber" TEXT,
    "heldBy" TEXT,
    "heldUntil" TIMESTAMP(3),
    "routeTargetId" TEXT,
    "routeType" TEXT,

    CONSTRAINT "tfns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extensions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "extensionNumber" TEXT NOT NULL,
    "forwardAllDestination" TEXT,
    "forwardAllEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forwardAllType" TEXT,
    "forwardBusyDestination" TEXT,
    "forwardBusyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forwardBusyType" TEXT,
    "forwardNoAnswerDestination" TEXT,
    "forwardNoAnswerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forwardNoAnswerTimeout" INTEGER NOT NULL DEFAULT 20,
    "forwardNoAnswerType" TEXT,
    "name" TEXT NOT NULL,
    "outboundCallerIdNumber" TEXT,
    "sipAuthRealm" TEXT,
    "sipPassword" TEXT NOT NULL,
    "sipUsername" TEXT NOT NULL,
    "password" TEXT,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_addons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_addons_catalog" (
    "id" TEXT NOT NULL,
    "addon_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "units_count" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_addons_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "autoRechargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rechargeThreshold" DECIMAL(65,30) NOT NULL DEFAULT 10.00,
    "rechargeAmount" DECIMAL(65,30) NOT NULL DEFAULT 50.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tenantId" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inviteToken" TEXT,
    "inviteTokenExpiry" TIMESTAMP(3),
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "monitoringExtension" TEXT,
    "monitoringSecret" TEXT,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "partnerId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stripePriceId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL,
    "tier" "Tier" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "freeMinutes" INTEGER NOT NULL,
    "overagePrice" DECIMAL(65,30) NOT NULL DEFAULT 0.10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowCallRecording" BOOLEAN NOT NULL DEFAULT false,
    "allowDIDForwards" BOOLEAN NOT NULL DEFAULT false,
    "allowSchedules" BOOLEAN NOT NULL DEFAULT false,
    "allowVoicemail" BOOLEAN NOT NULL DEFAULT true,
    "maxDIDs" INTEGER NOT NULL DEFAULT 10,
    "maxExtensions" INTEGER NOT NULL DEFAULT 50,
    "maxIVRs" INTEGER NOT NULL DEFAULT 5,
    "maxRingGroups" INTEGER NOT NULL DEFAULT 10,
    "createdBy" TEXT,
    "initialCredit" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "maxDIDForwards" INTEGER NOT NULL DEFAULT 10,
    "maxTFNs" INTEGER NOT NULL DEFAULT 0,
    "extraDidPrice" DECIMAL(65,30) NOT NULL DEFAULT 1.00,
    "extraExtensionPrice" DECIMAL(65,30) NOT NULL DEFAULT 5.00,
    "extraTfnPrice" DECIMAL(65,30) NOT NULL DEFAULT 2.00,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "remainingFreeMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subBillingSubscriptionId" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_profiles" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "supportUserId" TEXT NOT NULL,
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "action" "UserAuditAction" NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ring_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'simultaneous',
    "ringTimeout" INTEGER NOT NULL DEFAULT 30,
    "noAnswerAction" TEXT,
    "noAnswerDestination" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ring_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ring_group_members" (
    "id" TEXT NOT NULL,
    "ringGroupId" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ring_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ivrs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "greetingAudioPath" TEXT,
    "invalidAudioPath" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "menu" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ivrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dids" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "number" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telnyx',
    "monthlyFee" DECIMAL(65,30) NOT NULL DEFAULT 2.00,
    "routeType" TEXT,
    "routeTargetId" TEXT,
    "forwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "forwardNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "did_forwards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "destinationNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "did_forwards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysMask" INTEGER NOT NULL DEFAULT 31,
    "primaryRouteType" TEXT NOT NULL,
    "primaryRouteTarget" TEXT NOT NULL,
    "afterHoursRouteType" TEXT NOT NULL,
    "afterHoursRouteTarget" TEXT NOT NULL,
    "weekendRouteType" TEXT NOT NULL,
    "weekendRouteTarget" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sequenceId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "operational_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "durationSeconds" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "total" DECIMAL(65,30) NOT NULL,
    "balanceDue" DECIMAL(65,30) NOT NULL,
    "stripeId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_adjustments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_config_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "serviceOrderId" TEXT,

    CONSTRAINT "tenant_config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_features" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ivrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ivrLimit" INTEGER NOT NULL DEFAULT 10,
    "ringGroupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ringGroupLimit" INTEGER NOT NULL DEFAULT 10,
    "schedulerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "schedulerLimit" INTEGER NOT NULL DEFAULT 10,
    "didForwardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "didForwardLimit" INTEGER NOT NULL DEFAULT 10,
    "monitorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monitorLimit" INTEGER NOT NULL DEFAULT 10,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "logoMain" TEXT,
    "logoSidebar" TEXT,
    "favicon" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromName" TEXT,
    "smtpFromEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_carriers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_endpoints" (
    "id" SERIAL NOT NULL,
    "carrierId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sipHost" TEXT NOT NULL,
    "sipPort" INTEGER NOT NULL DEFAULT 5060,
    "transport" TEXT NOT NULL DEFAULT 'udp',
    "prefix" TEXT NOT NULL DEFAULT '',
    "stripPlus" BOOLEAN NOT NULL DEFAULT false,
    "callerIdMode" TEXT NOT NULL DEFAULT 'extension',
    "callerIdNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_whitelist" (
    "id" SERIAL NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 5060,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_cards" (
    "ratecard_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "country" TEXT,
    "in_rate_per_min" DECIMAL(14,6) NOT NULL DEFAULT 0.000000,
    "in_rate_per_sec" DECIMAL(14,8),
    "in_initial_increment_sec" INTEGER NOT NULL DEFAULT 60,
    "in_increment_sec" INTEGER NOT NULL DEFAULT 60,
    "ob_rate_per_min" DECIMAL(14,6) NOT NULL DEFAULT 0.000000,
    "ob_rate_per_sec" DECIMAL(14,8),
    "ob_initial_increment_sec" INTEGER NOT NULL DEFAULT 60,
    "ob_increment_sec" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("ratecard_id")
);

-- CreateTable
CREATE TABLE "customer_ratecard" (
    "customer_id" TEXT NOT NULL,
    "ratecard_id" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ratecard_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "rec_rate_card" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "rate_per_min" DECIMAL(14,6) NOT NULL DEFAULT 0.000000,
    "retention_period" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rec_rate_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_rec_rc" (
    "cust_id" TEXT NOT NULL,
    "rec_rc_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_rec_rc_pkey" PRIMARY KEY ("cust_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeCustomerId_key" ON "tenants"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_customerCode_key" ON "tenants"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subBillingCustomerId_key" ON "tenants"("subBillingCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "tfns_number_key" ON "tfns"("number");

-- CreateIndex
CREATE INDEX "tfns_status_routeType_idx" ON "tfns"("status", "routeType");

-- CreateIndex
CREATE UNIQUE INDEX "extensions_sipUsername_key" ON "extensions"("sipUsername");

-- CreateIndex
CREATE INDEX "extensions_tenantId_idx" ON "extensions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "extensions_tenantId_extensionNumber_key" ON "extensions"("tenantId", "extensionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_addons_tenantId_key" ON "monitoring_addons"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_addons_catalog_addon_id_key" ON "subscription_addons_catalog"("addon_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_tenantId_key" ON "wallets"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteToken_key" ON "users"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_subBillingSubscriptionId_key" ON "subscriptions"("subBillingSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "support_profiles_supportUserId_key" ON "support_profiles"("supportUserId");

-- CreateIndex
CREATE INDEX "support_profiles_adminUserId_idx" ON "support_profiles"("adminUserId");

-- CreateIndex
CREATE INDEX "user_audit_logs_actorId_idx" ON "user_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "user_audit_logs_targetId_idx" ON "user_audit_logs"("targetId");

-- CreateIndex
CREATE INDEX "user_audit_logs_timestamp_idx" ON "user_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "user_audit_logs_action_idx" ON "user_audit_logs"("action");

-- CreateIndex
CREATE INDEX "ring_groups_tenantId_idx" ON "ring_groups"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ring_group_members_ringGroupId_extensionId_key" ON "ring_group_members"("ringGroupId", "extensionId");

-- CreateIndex
CREATE INDEX "ivrs_tenantId_idx" ON "ivrs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "dids_number_key" ON "dids"("number");

-- CreateIndex
CREATE INDEX "dids_tenantId_idx" ON "dids"("tenantId");

-- CreateIndex
CREATE INDEX "dids_number_idx" ON "dids"("number");

-- CreateIndex
CREATE INDEX "did_forwards_tenantId_idx" ON "did_forwards"("tenantId");

-- CreateIndex
CREATE INDEX "operational_schedules_tenantId_idx" ON "operational_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "audio_files_tenantId_idx" ON "audio_files"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeId_key" ON "invoices"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_idempotencyKey_key" ON "invoices"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "idx_tenant_config_versions_active" ON "tenant_config_versions"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "idx_tenant_config_versions_tenant" ON "tenant_config_versions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_features_tenantId_key" ON "tenant_features"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "partners_domain_key" ON "partners"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_carriers_name_key" ON "outbound_carriers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_endpoints_carrierId_name_key" ON "outbound_endpoints"("carrierId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_whitelist_ipAddress_key" ON "inbound_whitelist"("ipAddress");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_outboundEndpointId_fkey" FOREIGN KEY ("outboundEndpointId") REFERENCES "outbound_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfns" ADD CONSTRAINT "tfns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_addons" ADD CONSTRAINT "monitoring_addons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_profiles" ADD CONSTRAINT "support_profiles_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_profiles" ADD CONSTRAINT "support_profiles_supportUserId_fkey" FOREIGN KEY ("supportUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ring_groups" ADD CONSTRAINT "ring_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ring_group_members" ADD CONSTRAINT "ring_group_members_extensionId_fkey" FOREIGN KEY ("extensionId") REFERENCES "extensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ring_group_members" ADD CONSTRAINT "ring_group_members_ringGroupId_fkey" FOREIGN KEY ("ringGroupId") REFERENCES "ring_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ivrs" ADD CONSTRAINT "ivrs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dids" ADD CONSTRAINT "dids_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "did_forwards" ADD CONSTRAINT "did_forwards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_schedules" ADD CONSTRAINT "operational_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustments" ADD CONSTRAINT "invoice_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_endpoints" ADD CONSTRAINT "outbound_endpoints_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "outbound_carriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ratecard" ADD CONSTRAINT "customer_ratecard_ratecard_id_fkey" FOREIGN KEY ("ratecard_id") REFERENCES "rate_cards"("ratecard_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_rec_rc" ADD CONSTRAINT "customer_rec_rc_rec_rc_id_fkey" FOREIGN KEY ("rec_rc_id") REFERENCES "rec_rate_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;


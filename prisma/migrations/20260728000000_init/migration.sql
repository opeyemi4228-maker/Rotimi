-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH', 'SOUTH');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('NATIONAL', 'ZONAL', 'STATE', 'LGA', 'WARD');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('NATION', 'ZONE', 'STATE', 'LGA', 'WARD');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('VACANT', 'FILLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('INACTIVITY', 'MISCONDUCT', 'ANTI_PARTY_ACTIVITY', 'RESTRUCTURING', 'RESIGNATION', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "Verification" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'LOGIN', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "zones" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "region" "Region" NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "zoneId" SMALLINT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lgas" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "stateId" SMALLINT NOT NULL,

    CONSTRAINT "lgas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "lgaId" INTEGER NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polling_units" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "wardId" INTEGER NOT NULL,

    CONSTRAINT "polling_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "email" VARCHAR(120),
    "passwordHash" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'REGISTRATION',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "membershipNo" VARCHAR(32),
    "surname" VARCHAR(60) NOT NULL,
    "firstName" VARCHAR(60) NOT NULL,
    "middleName" VARCHAR(60),
    "gender" "Gender",
    "dateOfBirth" DATE,
    "photoUrl" TEXT,
    "occupation" VARCHAR(80),
    "address" TEXT,
    "stateId" SMALLINT NOT NULL,
    "lgaId" INTEGER NOT NULL,
    "wardId" INTEGER NOT NULL,
    "pollingUnitId" INTEGER,
    "vinEncrypted" TEXT,
    "ninEncrypted" TEXT,
    "verification" "Verification" NOT NULL DEFAULT 'PENDING',
    "referredById" BIGINT,
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_definitions" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "tier" "Tier" NOT NULL,
    "tierRank" SMALLINT NOT NULL,
    "seatsPerUnit" SMALLINT NOT NULL DEFAULT 1,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isFunctional" BOOLEAN NOT NULL DEFAULT false,
    "approverRole" VARCHAR(24),
    "sortOrder" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "role_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" BIGSERIAL NOT NULL,
    "roleId" SMALLINT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "seatIndex" SMALLINT NOT NULL DEFAULT 1,
    "status" "SeatStatus" NOT NULL DEFAULT 'VACANT',
    "zoneId" SMALLINT,
    "stateId" SMALLINT,
    "lgaId" INTEGER,
    "wardId" INTEGER,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" BIGSERIAL NOT NULL,
    "seatId" BIGINT NOT NULL,
    "memberId" BIGINT NOT NULL,
    "appointedById" BIGINT,
    "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATE,
    "endReason" "EndReason",
    "endNote" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" BIGSERIAL NOT NULL,
    "memberId" BIGINT NOT NULL,
    "seatId" BIGINT NOT NULL,
    "statement" VARCHAR(500),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isChallenge" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDueAt" TIMESTAMPTZ NOT NULL,
    "decidedById" BIGINT,
    "decidedAt" TIMESTAMPTZ,
    "decisionNote" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" BIGSERIAL NOT NULL,
    "applicationId" BIGINT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "actorId" BIGINT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actorId" BIGINT,
    "action" VARCHAR(40) NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" BIGINT,
    "scopeType" "ScopeType",
    "scopeId" INTEGER,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" INET,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "states"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_slug_key" ON "states"("slug");

-- CreateIndex
CREATE INDEX "states_zoneId_idx" ON "states"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "lgas_code_key" ON "lgas"("code");

-- CreateIndex
CREATE INDEX "lgas_stateId_idx" ON "lgas"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "lgas_stateId_name_key" ON "lgas"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "wards_code_key" ON "wards"("code");

-- CreateIndex
CREATE INDEX "wards_lgaId_idx" ON "wards"("lgaId");

-- CreateIndex
CREATE UNIQUE INDEX "wards_lgaId_name_key" ON "wards"("lgaId", "name");

-- CreateIndex
CREATE INDEX "polling_units_wardId_idx" ON "polling_units"("wardId");

-- CreateIndex
CREATE UNIQUE INDEX "polling_units_wardId_name_key" ON "polling_units"("wardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "otp_codes_userId_purpose_idx" ON "otp_codes"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "members_membershipNo_key" ON "members"("membershipNo");

-- CreateIndex
CREATE INDEX "members_wardId_idx" ON "members"("wardId");

-- CreateIndex
CREATE INDEX "members_lgaId_idx" ON "members"("lgaId");

-- CreateIndex
CREATE INDEX "members_stateId_idx" ON "members"("stateId");

-- CreateIndex
CREATE INDEX "members_verification_idx" ON "members"("verification");

-- CreateIndex
CREATE UNIQUE INDEX "role_definitions_code_key" ON "role_definitions"("code");

-- CreateIndex
CREATE INDEX "role_definitions_tier_idx" ON "role_definitions"("tier");

-- CreateIndex
CREATE INDEX "seats_status_idx" ON "seats"("status");

-- CreateIndex
CREATE INDEX "seats_scopeType_status_idx" ON "seats"("scopeType", "status");

-- CreateIndex
CREATE INDEX "seats_stateId_status_idx" ON "seats"("stateId", "status");

-- CreateIndex
CREATE INDEX "seats_lgaId_status_idx" ON "seats"("lgaId", "status");

-- CreateIndex
CREATE INDEX "seats_wardId_status_idx" ON "seats"("wardId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "seats_roleId_scopeType_zoneId_stateId_lgaId_wardId_seatInde_key" ON "seats"("roleId", "scopeType", "zoneId", "stateId", "lgaId", "wardId", "seatIndex");

-- CreateIndex
CREATE INDEX "appointments_seatId_status_idx" ON "appointments"("seatId", "status");

-- CreateIndex
CREATE INDEX "appointments_memberId_status_idx" ON "appointments"("memberId", "status");

-- CreateIndex
CREATE INDEX "applications_status_slaDueAt_idx" ON "applications"("status", "slaDueAt");

-- CreateIndex
CREATE INDEX "applications_seatId_idx" ON "applications"("seatId");

-- CreateIndex
CREATE INDEX "applications_memberId_idx" ON "applications"("memberId");

-- CreateIndex
CREATE INDEX "application_events_applicationId_idx" ON "application_events"("applicationId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lgas" ADD CONSTRAINT "lgas_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_lgaId_fkey" FOREIGN KEY ("lgaId") REFERENCES "lgas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_units" ADD CONSTRAINT "polling_units_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_lgaId_fkey" FOREIGN KEY ("lgaId") REFERENCES "lgas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_pollingUnitId_fkey" FOREIGN KEY ("pollingUnitId") REFERENCES "polling_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_lgaId_fkey" FOREIGN KEY ("lgaId") REFERENCES "lgas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointedById_fkey" FOREIGN KEY ("appointedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- Constraints Prisma's schema language cannot express.
--
-- These are not optional hardening. Each one is a rule the platform plan
-- states as a rule, and the only place a rule is actually true is the
-- database. Application code forgets; a constraint does not.
-- ═══════════════════════════════════════════════════════════════════════════

-- §8.1.1 "A member may hold one office at a time."
-- §9.3   one_active_holder_per_seat / one_active_office_per_member
--
-- Partial unique indexes: uniqueness applies only to ACTIVE rows, so the full
-- history of every seat stays in the table (§8.4 succession) while making it
-- impossible for two people to hold one seat, or one person to hold two.
CREATE UNIQUE INDEX "one_active_holder_per_seat"
  ON "appointments"("seatId") WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "one_active_office_per_member"
  ON "appointments"("memberId") WHERE "status" = 'ACTIVE';

-- §8.1.2 "A member may have one pending application at a time."
CREATE UNIQUE INDEX "one_pending_application_per_member"
  ON "applications"("memberId")
  WHERE "status" IN ('SUBMITTED','UNDER_REVIEW','ESCALATED');

-- Seat scope integrity: exactly one scope foreign key is set, and it is the
-- one matching scopeType. Without this a WARD seat could carry a stateId and
-- no wardId, and the Descendant Rule would silently place it in the wrong
-- territory — the single worst failure this system could have.
ALTER TABLE "seats" ADD CONSTRAINT "seat_scope_matches_type" CHECK (
  CASE "scopeType"
    WHEN 'NATION' THEN "zoneId" IS NULL AND "stateId" IS NULL AND "lgaId" IS NULL AND "wardId" IS NULL
    WHEN 'ZONE'   THEN "zoneId" IS NOT NULL AND "stateId" IS NULL AND "lgaId" IS NULL AND "wardId" IS NULL
    WHEN 'STATE'  THEN "zoneId" IS NULL AND "stateId" IS NOT NULL AND "lgaId" IS NULL AND "wardId" IS NULL
    WHEN 'LGA'    THEN "zoneId" IS NULL AND "stateId" IS NULL AND "lgaId" IS NOT NULL AND "wardId" IS NULL
    WHEN 'WARD'   THEN "zoneId" IS NULL AND "stateId" IS NULL AND "lgaId" IS NULL AND "wardId" IS NOT NULL
  END
);

-- §8.1: an ended appointment must record when and why it ended; an active one
-- must not pretend to have.
ALTER TABLE "appointments" ADD CONSTRAINT "ended_appointments_are_dated" CHECK (
  ("status" = 'ACTIVE' AND "endDate" IS NULL)
  OR ("status" = 'ENDED' AND "endDate" IS NOT NULL AND "endReason" IS NOT NULL)
);

-- §13.2 "Audit log append-only, with database-level revocation of UPDATE and
-- DELETE for the application role."
--
-- Implemented as a trigger rather than REVOKE. On a managed host such as Neon
-- the application connects as the owner of the schema, and an owner can grant
-- its own privileges back — a REVOKE it can undo is not a control. A trigger
-- refuses the write regardless of who is asking, including the owner.
CREATE OR REPLACE FUNCTION audit_logs_are_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'audit_logs is append-only: % is not permitted. The audit trail is the arbiter of every disputed appointment (plan §16) and must not be rewritten.',
    TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_are_append_only();

CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_are_append_only();

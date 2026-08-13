-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" BIGSERIAL NOT NULL,
    "senderId" BIGINT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" INTEGER,
    "scopeLabel" VARCHAR(160) NOT NULL,
    "body" VARCHAR(1600) NOT NULL,
    "segments" SMALLINT NOT NULL,
    "recipients" INTEGER NOT NULL,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" VARCHAR(24),
    "error" TEXT,
    "rejected" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcasts_senderId_createdAt_idx" ON "broadcasts"("senderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "broadcasts_createdAt_idx" ON "broadcasts"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


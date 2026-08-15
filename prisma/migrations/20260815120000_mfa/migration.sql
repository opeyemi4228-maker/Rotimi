-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaEnabledAt" TIMESTAMPTZ,
ADD COLUMN     "mfaLastStep" BIGINT,
ADD COLUMN     "mfaRecovery" TEXT[] DEFAULT ARRAY[]::TEXT[];


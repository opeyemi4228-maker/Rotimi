-- MAP's own election returns.
--
-- ── WHAT THESE TABLES ARE, AND WHAT THEY ARE NOT ──────────────────────────
-- A parallel vote tabulation: what the movement's own agents witnessed at the
-- polling units they were appointed to, with the EC8A sheet photographed as
-- evidence. They are NOT INEC's results, and nothing built on them may present
-- them as official.
--
-- Where an agent can also read INEC's declared figure for their unit, it is
-- recorded in its own columns alongside — never merged — so the gap between
-- what was witnessed and what was declared stays a number somebody can look at.
-- ───────────────────────────────────────────────────────────────────────────
--
-- Constituencies are their own tables because electoral geography cuts across
-- administrative geography: a federal constituency can be two LGAs, one LGA, or
-- part of one, which is why there is a ward join table as well as an LGA one.

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('PRESIDENTIAL', 'GOVERNORSHIP', 'SENATE', 'HOUSE_OF_REPS');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConstituencyType" AS ENUM ('STATE', 'SENATORIAL', 'FEDERAL');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'DISPUTED');

-- DropForeignKey
ALTER TABLE "seats" DROP CONSTRAINT "seats_pollingUnitId_fkey";

-- DropIndex
DROP INDEX "seats_roleId_scopeType_zoneId_stateId_lgaId_wardId_seatInde_key";

-- CreateTable
CREATE TABLE "parties" (
    "id" SMALLSERIAL NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "colour" VARCHAR(9) NOT NULL,
    "sortOrder" SMALLINT NOT NULL DEFAULT 100,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" SMALLSERIAL NOT NULL,
    "type" "ElectionType" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "year" SMALLINT NOT NULL,
    "heldOn" DATE NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "electionId" SMALLINT NOT NULL,
    "partyId" SMALLINT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "constituencyId" INTEGER,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constituencies" (
    "id" SERIAL NOT NULL,
    "type" "ConstituencyType" NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "stateId" SMALLINT NOT NULL,

    CONSTRAINT "constituencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constituency_lgas" (
    "constituencyId" INTEGER NOT NULL,
    "lgaId" INTEGER NOT NULL,

    CONSTRAINT "constituency_lgas_pkey" PRIMARY KEY ("constituencyId","lgaId")
);

-- CreateTable
CREATE TABLE "constituency_wards" (
    "constituencyId" INTEGER NOT NULL,
    "wardId" INTEGER NOT NULL,

    CONSTRAINT "constituency_wards_pkey" PRIMARY KEY ("constituencyId","wardId")
);

-- CreateTable
CREATE TABLE "polling_unit_results" (
    "id" BIGSERIAL NOT NULL,
    "electionId" SMALLINT NOT NULL,
    "pollingUnitId" INTEGER NOT NULL,
    "wardId" INTEGER NOT NULL,
    "lgaId" INTEGER NOT NULL,
    "stateId" SMALLINT NOT NULL,
    "registeredVoters" INTEGER,
    "accreditedVoters" INTEGER,
    "rejectedBallots" INTEGER,
    "inecAccredited" INTEGER,
    "inecTotalVotes" INTEGER,
    "status" "ResultStatus" NOT NULL DEFAULT 'SUBMITTED',
    "locationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" BIGINT NOT NULL,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" BIGINT,
    "verifiedAt" TIMESTAMPTZ,
    "note" TEXT,

    CONSTRAINT "polling_unit_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_votes" (
    "resultId" BIGINT NOT NULL,
    "partyId" SMALLINT NOT NULL,
    "votes" INTEGER NOT NULL,

    CONSTRAINT "result_votes_pkey" PRIMARY KEY ("resultId","partyId")
);

-- CreateTable
CREATE TABLE "result_sheets" (
    "resultId" BIGINT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mimeType" VARCHAR(40) NOT NULL,
    "width" SMALLINT NOT NULL,
    "height" SMALLINT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "version" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_sheets_pkey" PRIMARY KEY ("resultId")
);

-- CreateIndex
CREATE UNIQUE INDEX "parties_code_key" ON "parties"("code");

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "elections_type_year_key" ON "elections"("type", "year");

-- CreateIndex
CREATE INDEX "candidates_electionId_idx" ON "candidates"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_electionId_partyId_constituencyId_key" ON "candidates"("electionId", "partyId", "constituencyId");

-- CreateIndex
CREATE UNIQUE INDEX "constituencies_code_key" ON "constituencies"("code");

-- CreateIndex
CREATE INDEX "constituencies_type_stateId_idx" ON "constituencies"("type", "stateId");

-- CreateIndex
CREATE INDEX "constituency_lgas_lgaId_idx" ON "constituency_lgas"("lgaId");

-- CreateIndex
CREATE INDEX "constituency_wards_wardId_idx" ON "constituency_wards"("wardId");

-- CreateIndex
CREATE INDEX "polling_unit_results_electionId_stateId_idx" ON "polling_unit_results"("electionId", "stateId");

-- CreateIndex
CREATE INDEX "polling_unit_results_electionId_lgaId_idx" ON "polling_unit_results"("electionId", "lgaId");

-- CreateIndex
CREATE INDEX "polling_unit_results_electionId_wardId_idx" ON "polling_unit_results"("electionId", "wardId");

-- CreateIndex
CREATE INDEX "polling_unit_results_electionId_status_idx" ON "polling_unit_results"("electionId", "status");

-- CreateIndex
CREATE INDEX "polling_unit_results_submittedAt_idx" ON "polling_unit_results"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "polling_unit_results_electionId_pollingUnitId_key" ON "polling_unit_results"("electionId", "pollingUnitId");

-- CreateIndex
CREATE INDEX "result_votes_partyId_idx" ON "result_votes"("partyId");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_pollingUnitId_fkey" FOREIGN KEY ("pollingUnitId") REFERENCES "polling_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "constituencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_lgas" ADD CONSTRAINT "constituency_lgas_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "constituencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_lgas" ADD CONSTRAINT "constituency_lgas_lgaId_fkey" FOREIGN KEY ("lgaId") REFERENCES "lgas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_wards" ADD CONSTRAINT "constituency_wards_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "constituencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_wards" ADD CONSTRAINT "constituency_wards_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_pollingUnitId_fkey" FOREIGN KEY ("pollingUnitId") REFERENCES "polling_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_lgaId_fkey" FOREIGN KEY ("lgaId") REFERENCES "lgas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_unit_results" ADD CONSTRAINT "polling_unit_results_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_votes" ADD CONSTRAINT "result_votes_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "polling_unit_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_votes" ADD CONSTRAINT "result_votes_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "polling_unit_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "seat_identity" RENAME TO "seats_roleId_scopeType_zoneId_stateId_lgaId_wardId_pollingU_key";


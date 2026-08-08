-- Every member gets an invitation code of their own.
--
-- Nullable, deliberately. The column has to exist before any code can be
-- issued, and members registered before this migration have none until
-- `node scripts/backfill-referral-codes.mjs` runs. Making it NOT NULL here
-- would mean either refusing the migration or inventing codes inside it, and a
-- referral code is not something a migration should be minting.
--
-- New members get theirs inside the transaction that creates them, so the only
-- rows that are ever null are the ones this migration created.

ALTER TABLE "members" ADD COLUMN "referralCode" VARCHAR(12);

CREATE UNIQUE INDEX "members_referralCode_key" ON "members"("referralCode");

-- "How many people has this member brought in", on every dashboard row.
CREATE INDEX "members_referredById_idx" ON "members"("referredById");

-- The growth chart reads members-per-day across a territory.
CREATE INDEX "members_joinedAt_idx" ON "members"("joinedAt");

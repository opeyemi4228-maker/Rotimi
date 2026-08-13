-- The sixth tier: a seat at every polling unit.
--
-- Everything above this coordinates. This is the level where a vote is cast and
-- counted, and it is the only level at which the movement can observe a result
-- first-hand. 176,623 seats, one per unit in the INEC register.
--
-- The seat_identity unique index has to be rebuilt to include the new column,
-- because two polling unit seats under the same role would otherwise collide on
-- a key where every other scope column is NULL.

ALTER TYPE "ScopeType" ADD VALUE IF NOT EXISTS 'POLLING_UNIT';

ALTER TABLE "seats" ADD COLUMN "pollingUnitId" INTEGER;

ALTER TABLE "seats"
  ADD CONSTRAINT "seats_pollingUnitId_fkey"
  FOREIGN KEY ("pollingUnitId") REFERENCES "polling_units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "seat_identity";
CREATE UNIQUE INDEX "seat_identity" ON "seats"(
  "roleId", "scopeType", "zoneId", "stateId", "lgaId", "wardId", "pollingUnitId", "seatIndex"
);

CREATE INDEX "seats_pollingUnitId_status_idx" ON "seats"("pollingUnitId", "status");

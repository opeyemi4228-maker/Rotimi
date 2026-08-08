-- Polling units get INEC's delimitation code, and stop pretending their names
-- are unique.
--
-- The table was seeded from INEC's 2015 polling unit directory: 118,369 units,
-- names flattened to slugs, and none of the 56,737 units created in the 2021
-- expansion. It is being replaced wholesale by the current register (176,623
-- units), which shares no identifier with it — the old rows have no
-- delimitation code and their names are spelled differently — so there is
-- nothing to migrate row by row.
--
-- Members keep their state, LGA and ward. Their polling unit is an optional
-- field and is cleared, because pointing it at a row from a superseded register
-- would be worse than leaving it blank: the member can re-select theirs from a
-- list that is now three years newer and a third longer.

ALTER TABLE "polling_units" ADD COLUMN "code" VARCHAR(24);

UPDATE "members" SET "pollingUnitId" = NULL WHERE "pollingUnitId" IS NOT NULL;
DELETE FROM "polling_units";

ALTER TABLE "polling_units" ALTER COLUMN "code" SET NOT NULL;

-- Two units in one ward may share a name. Only the code is unique.
DROP INDEX "polling_units_wardId_name_key";
CREATE UNIQUE INDEX "polling_units_code_key" ON "polling_units"("code");
CREATE INDEX "polling_units_wardId_name_idx" ON "polling_units"("wardId", "name");

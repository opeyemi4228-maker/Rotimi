-- The role tier enum needs the sixth value too.
--
-- ScopeType gained POLLING_UNIT in the previous migration, which is what a
-- *seat* is scoped by; this is the tier a *role definition* declares, and the
-- two are separate enums. Seeding the Polling Unit Coordinator role failed on
-- the difference.
ALTER TYPE "Tier" ADD VALUE IF NOT EXISTS 'POLLING_UNIT';

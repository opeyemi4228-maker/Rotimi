-- AlterTable
ALTER TABLE "members" ADD COLUMN     "ninHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "members_ninHash_key" ON "members"("ninHash");


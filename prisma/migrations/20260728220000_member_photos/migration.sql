-- Member profile photographs.
--
-- Stored as bytes in Postgres rather than as files on disk. There is no object
-- store configured, and neither of the two places a file could otherwise go
-- survives: public/ is rebuilt on every deploy, and a serverless instance's
-- filesystem disappears with the request. Everything written here has already
-- been re-encoded to a 512x512 WebP by lib/photos.js, so a row is 20-60KB.
--
-- Its own table, so the bytes can never be pulled in by a directory query.
-- `members.photoUrl` already exists and keeps holding the URL the app renders,
-- which is what makes moving to a CDN later a one-file change.

-- CreateTable
CREATE TABLE "member_photos" (
    "memberId" BIGINT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mimeType" VARCHAR(40) NOT NULL,
    "width" SMALLINT NOT NULL,
    "height" SMALLINT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "version" VARCHAR(16) NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_photos_pkey" PRIMARY KEY ("memberId")
);

-- Deleting a member takes their photograph with them. §13 makes erasure a
-- member's right, and a portrait left behind after the record is gone is
-- exactly the kind of orphan that request is meant to remove.
ALTER TABLE "member_photos" ADD CONSTRAINT "member_photos_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

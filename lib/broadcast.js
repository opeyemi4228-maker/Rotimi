/**
 * Who a coordinator is allowed to text, and what they have texted before.
 *
 * ── THE ONE RULE ───────────────────────────────────────────────────────────
 * The recipient list is never sent by the browser. It is derived on the server
 * from the sender's seat, every single time, through the same
 * `memberScopeWhere()` every other query in the app uses. A Ward Coordinator
 * cannot text the state by posting a longer list, because there is no list in
 * the request to lengthen.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

import { prisma } from "./db";
import { memberScopeWhere } from "./permissions";

/* A member who has been rejected is not part of the movement, and texting them
   in its name is a mistake nobody would make on purpose. They are excluded from
   every audience regardless of what the sender selects. */
const NEVER = { verification: { not: "REJECTED" } };

/** The audience filter, from a scope and the sender's choices. */
function audienceWhere(scope, { verifiedOnly = false } = {}) {
  const territory = memberScopeWhere(scope);
  if (!territory) return null;

  return {
    AND: [
      territory,
      NEVER,
      verifiedOnly ? { verification: "VERIFIED" } : {},
      /* Belt and braces: a member always has a user and a user always has a
         phone, but a broadcast that silently sends to an empty string is the
         kind of thing that only shows up on the invoice. */
      { user: { phone: { not: "" } } },
    ],
  };
}

/**
 * How many people this coordinator would reach, and the shape of that group.
 *
 * The counts are the whole point of the page: nobody should press send without
 * knowing whether it goes to two hundred people or two hundred thousand.
 */
export async function audience(scope, filters = {}) {
  const where = audienceWhere(scope, filters);
  if (!where) return null;

  const all = audienceWhere(scope, { verifiedOnly: false });

  const [total, verified, everyone] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.count({ where: { AND: [all, { verification: "VERIFIED" }] } }),
    prisma.member.count({ where: all }),
  ]);

  return {
    /* What would be sent to right now, under the filters as they stand. */
    total,
    /* The two figures behind the toggle, so the sender can see what they are
       choosing between rather than flipping it to find out. */
    verified,
    everyone,
    pending: everyone - verified,
  };
}

/**
 * The numbers themselves.
 *
 * Paged, because "show me the phone numbers" from a National Coordinator is a
 * request for a million rows and the browser will not survive it. The page uses
 * this for the disclosure below the composer; the CSV route uses it with a
 * larger take for a file.
 */
export async function recipients(scope, filters = {}, { take = 200, skip = 0 } = {}) {
  const where = audienceWhere(scope, filters);
  if (!where) return null;

  const rows = await prisma.member.findMany({
    where,
    /* Ward then surname: a coordinator reading this list is nearly always
       looking for one person or checking one ward, never scrolling from the
       top. */
    orderBy: [{ wardId: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    take,
    skip,
    select: {
      id: true,
      firstName: true,
      surname: true,
      membershipNo: true,
      verification: true,
      user: { select: { phone: true } },
      ward: { select: { name: true } },
      lga: { select: { name: true } },
      state: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    name: `${row.firstName} ${row.surname}`,
    phone: row.user.phone,
    membershipNo: row.membershipNo,
    verification: row.verification,
    ward: row.ward.name,
    lga: row.lga.name,
    state: row.state.name,
  }));
}

/**
 * Every number in the audience, as bare strings, for the send itself.
 *
 * Selected in one query with nothing but the phone column, because the whole
 * register at a hundred thousand members is 1.4MB of phone numbers and 40MB of
 * everything else.
 */
export async function audienceNumbers(scope, filters = {}) {
  const where = audienceWhere(scope, filters);
  if (!where) return null;

  const rows = await prisma.member.findMany({
    where,
    select: { user: { select: { phone: true } } },
  });

  /* Two members can share a phone — a household, or a coordinator who
     registered a relative on their own handset. They are one text, not two. */
  return [...new Set(rows.map((row) => row.user.phone).filter(Boolean))];
}

/**
 * What has been sent, by anybody whose seat sits inside this coordinator's
 * territory.
 *
 * Not just the reader's own sends: a State Coordinator is answerable for what
 * their LGA Coordinators text in the movement's name, and finding out about it
 * from a member's complaint is too late.
 */
export async function history(scope, { take = 15 } = {}) {
  const territory = memberScopeWhere(scope);
  if (!territory) return null;

  const rows = await prisma.broadcast.findMany({
    where: { sender: territory },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      body: true,
      segments: true,
      recipients: true,
      delivered: true,
      failed: true,
      status: true,
      provider: true,
      error: true,
      scopeLabel: true,
      createdAt: true,
      completedAt: true,
      sender: { select: { firstName: true, surname: true } },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    body: row.body,
    segments: row.segments,
    recipients: row.recipients,
    delivered: row.delivered,
    failed: row.failed,
    status: row.status,
    provider: row.provider,
    error: row.error,
    scopeLabel: row.scopeLabel,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    sender: `${row.sender.firstName} ${row.sender.surname}`,
  }));
}

/** One broadcast, for the composer to poll while a long send is running. */
export async function progress(scope, id) {
  const territory = memberScopeWhere(scope);
  if (!territory) return null;

  const row = await prisma.broadcast.findFirst({
    where: { id: BigInt(id), sender: territory },
    select: {
      id: true,
      status: true,
      recipients: true,
      delivered: true,
      failed: true,
      provider: true,
      error: true,
      completedAt: true,
    },
  });

  if (!row) return null;

  return {
    id: String(row.id),
    status: row.status,
    recipients: row.recipients,
    delivered: row.delivered,
    failed: row.failed,
    provider: row.provider,
    error: row.error,
    completedAt: row.completedAt,
  };
}

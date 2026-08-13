import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { stateTable } from "@/lib/console";

export const runtime = "nodejs";

/**
 * CSV out of the console.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT EXPORT ─────────────────────────────────
 * No encrypted VIN or NIN, in any dataset, ever. They are envelope-encrypted at
 * rest precisely so that a export cannot become the breach, and a column of
 * ciphertext in a spreadsheet is a column of ciphertext somebody will eventually
 * ask to have decrypted. No password hashes. No photograph bytes.
 *
 * Phone numbers and email addresses ARE exported, because the purpose of a
 * membership register is to be able to contact the membership, and an export
 * that cannot do that has no use. That makes every file this route produces a
 * personal-data disclosure — which is why it is nationwide-only, and why every
 * download is written to the audit trail with the exporter's name on it.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** RFC 4180. A field containing a comma, a quote or a newline is quoted and its
    quotes doubled; everything else goes out bare. */
function field(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(header, rows) {
  const lines = [header.join(",")];
  for (const row of rows) lines.push(row.map(field).join(","));
  /* A BOM, because the overwhelming majority of the people who will open these
     files will open them in Excel, and Excel without a BOM renders "Ọlá" as
     mojibake. It costs three bytes. */
  return `﻿${lines.join("\r\n")}\r\n`;
}

const DATASETS = {
  async members() {
    const rows = await prisma.member.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        membershipNo: true,
        surname: true,
        firstName: true,
        middleName: true,
        gender: true,
        dateOfBirth: true,
        occupation: true,
        verification: true,
        referralCode: true,
        joinedAt: true,
        user: { select: { phone: true, email: true, phoneVerified: true, lastLoginAt: true } },
        state: { select: { name: true } },
        lga: { select: { name: true } },
        ward: { select: { name: true } },
        pollingUnit: { select: { code: true, name: true } },
        referrer: { select: { membershipNo: true, firstName: true, surname: true } },
        _count: { select: { referrals: true } },
      },
    });

    return {
      header: [
        "member_id", "membership_no", "surname", "first_name", "middle_name",
        "gender", "date_of_birth", "occupation", "phone", "email", "phone_verified",
        "state", "lga", "ward", "polling_unit_code", "polling_unit",
        "verification", "referral_code", "referred_by", "brought_in",
        "joined_at", "last_login_at",
      ],
      rows: rows.map((row) => [
        row.id, row.membershipNo, row.surname, row.firstName, row.middleName,
        row.gender, row.dateOfBirth?.toISOString().slice(0, 10), row.occupation,
        row.user.phone, row.user.email, row.user.phoneVerified,
        row.state.name, row.lga.name, row.ward.name,
        row.pollingUnit?.code, row.pollingUnit?.name,
        row.verification, row.referralCode,
        row.referrer ? `${row.referrer.firstName} ${row.referrer.surname}` : null,
        row._count.referrals,
        row.joinedAt, row.user.lastLoginAt,
      ]),
    };
  },

  async states() {
    const rows = await stateTable();
    return {
      header: [
        "state", "code", "zone", "members", "verified", "joined_30_days",
        "wards_reached", "wards_total", "ward_reach_pct",
        "lgas", "polling_units",
        "seats", "seats_filled", "seat_fill_pct",
        "booth_seats", "booth_agents", "booth_fill_pct",
        "returns_filed",
      ],
      rows: rows.map((row) => [
        row.name, row.code, row.zone, row.members, row.verified, row.month,
        row.wardsLive, row.wards, row.wardShare,
        row.lgas, row.units,
        row.seats, row.filled, row.seatShare,
        row.agentSeats, row.agents, row.agentShare,
        row.returns,
      ]),
    };
  },

  async seats() {
    /* Organisational seats only. The 176,623 booth seats are a separate export
       problem — a spreadsheet with that many rows is not a thing anybody opens
       — and every one of them is already reachable through the PU tracker.

       Raw SQL rather than a nested Prisma include: `findMany` with a nested
       relation resolves the children with an `IN (...)` over every parent id,
       and 92,184 bind parameters is well past the 65,535 Postgres accepts. It
       fails with "the query parameter limit supported by your database is
       exceeded", which names neither the table nor the reason. One join does
       not have the problem at all. */
    const rows = await prisma.$queryRaw`
      SELECT s."id",
             r."code"  AS role_code,
             r."title" AS role,
             r."tier"::text AS tier,
             s."scopeType"::text AS scope_type,
             coalesce(w."name", l."name", st."name", z."name", 'Nationwide') AS unit,
             s."seatIndex" AS seat_index,
             s."status"::text AS status,
             m."firstName", m."surname", m."membershipNo",
             u."phone", u."email",
             a."startDate"
        FROM "seats" s
        JOIN "role_definitions" r ON r."id" = s."roleId"
        LEFT JOIN "zones"  z  ON z."id"  = s."zoneId"
        LEFT JOIN "states" st ON st."id" = s."stateId"
        LEFT JOIN "lgas"   l  ON l."id"  = s."lgaId"
        LEFT JOIN "wards"  w  ON w."id"  = s."wardId"
        LEFT JOIN LATERAL (
          SELECT ap."memberId", ap."startDate"
            FROM "appointments" ap
           WHERE ap."seatId" = s."id" AND ap."status" = 'ACTIVE'
           LIMIT 1
        ) a ON true
        LEFT JOIN "members" m ON m."id" = a."memberId"
        LEFT JOIN "users"   u ON u."id" = m."userId"
       WHERE s."scopeType" <> 'POLLING_UNIT'
       ORDER BY r."id", s."id"`;

    return {
      header: [
        "seat_id", "role_code", "role", "tier", "scope_type", "unit", "seat_index",
        "status", "holder", "holder_membership_no", "holder_phone", "holder_email",
        "since",
      ],
      rows: rows.map((row) => [
        row.id, row.role_code, row.role, row.tier, row.scope_type, row.unit,
        row.seat_index, row.status,
        row.firstName ? `${row.firstName} ${row.surname}` : null,
        row.membershipNo, row.phone, row.email,
        row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
      ]),
    };
  },

  async returns() {
    const rows = await prisma.pollingUnitResult.findMany({
      orderBy: [{ electionId: "asc" }, { submittedAt: "asc" }],
      select: {
        id: true,
        status: true,
        registeredVoters: true,
        accreditedVoters: true,
        rejectedBallots: true,
        inecAccredited: true,
        inecTotalVotes: true,
        locationConfirmed: true,
        termsAccepted: true,
        submittedAt: true,
        note: true,
        election: { select: { name: true } },
        pollingUnit: { select: { code: true, name: true } },
        ward: { select: { name: true } },
        lga: { select: { name: true } },
        state: { select: { name: true } },
        submittedBy: { select: { membershipNo: true, firstName: true, surname: true } },
        votes: { select: { votes: true, party: { select: { code: true } } } },
        sheet: { select: { version: true, byteSize: true } },
      },
    });

    /* A column per party, worked out from the data rather than hard-coded: the
       party list is data, and an export that silently drops a party because it
       was added after this file was written would be worse than no export. */
    const parties = [
      ...new Set(rows.flatMap((row) => row.votes.map((vote) => vote.party.code))),
    ].sort();

    return {
      header: [
        "result_id", "election", "state", "lga", "ward", "polling_unit_code", "polling_unit",
        ...parties.map((code) => `votes_${code}`),
        "total_votes", "registered", "accredited", "rejected",
        "inec_accredited", "inec_total_votes",
        "status", "location_confirmed", "terms_accepted", "sheet_on_file",
        "agent", "agent_membership_no", "submitted_at", "note",
      ],
      rows: rows.map((row) => {
        const byParty = new Map(row.votes.map((vote) => [vote.party.code, vote.votes]));
        const total = row.votes.reduce((sum, vote) => sum + vote.votes, 0);
        return [
          row.id, row.election.name, row.state.name, row.lga.name, row.ward.name,
          row.pollingUnit.code, row.pollingUnit.name,
          ...parties.map((code) => byParty.get(code) ?? 0),
          total, row.registeredVoters, row.accreditedVoters, row.rejectedBallots,
          row.inecAccredited, row.inecTotalVotes,
          row.status, row.locationConfirmed, row.termsAccepted, Boolean(row.sheet),
          `${row.submittedBy.firstName} ${row.submittedBy.surname}`,
          row.submittedBy.membershipNo,
          row.submittedAt, row.note,
        ];
      }),
    };
  },

  async referrals() {
    const rows = await prisma.member.findMany({
      where: { referredById: { not: null } },
      orderBy: { joinedAt: "asc" },
      select: {
        membershipNo: true,
        firstName: true,
        surname: true,
        joinedAt: true,
        state: { select: { name: true } },
        ward: { select: { name: true } },
        referrer: {
          select: {
            membershipNo: true,
            firstName: true,
            surname: true,
            referralCode: true,
            state: { select: { name: true } },
          },
        },
      },
    });

    return {
      header: [
        "member", "membership_no", "state", "ward", "joined_at",
        "referrer", "referrer_membership_no", "referrer_code", "referrer_state",
      ],
      rows: rows.map((row) => [
        `${row.firstName} ${row.surname}`, row.membershipNo, row.state.name, row.ward.name,
        row.joinedAt,
        `${row.referrer.firstName} ${row.referrer.surname}`,
        row.referrer.membershipNo, row.referrer.referralCode, row.referrer.state.name,
      ]),
    };
  },

  async audit() {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      /* The whole log would be unbounded and this route builds the file in
         memory. Ten thousand entries is far more than anybody reads and small
         enough to hold; if it is ever not enough, the fix is a cursor, not a
         bigger number. */
      take: 10_000,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        scopeType: true,
        scopeId: true,
        ipAddress: true,
        actor: { select: { membershipNo: true, firstName: true, surname: true } },
      },
    });

    return {
      header: [
        "id", "at", "actor", "actor_membership_no", "action",
        "entity_type", "entity_id", "scope_type", "scope_id", "ip_address",
      ],
      rows: rows.map((row) => [
        row.id, row.createdAt,
        row.actor ? `${row.actor.firstName} ${row.actor.surname}` : "System",
        row.actor?.membershipNo,
        row.action, row.entityType, row.entityId, row.scopeType, row.scopeId, row.ipAddress,
      ]),
    };
  },
};

export async function GET(request, { params }) {
  const { member, scope } = await currentSession();

  if (!member) {
    return Response.json({ error: "Sign in." }, { status: 401 });
  }
  /* The same gate as the console page, checked again here rather than trusted
     from there. §13.2: hiding a button is not a permission. */
  if (!scope || !(scope.isSuperAdmin || can(scope, "viewNationwide"))) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const { dataset } = await params;
  const build = Object.hasOwn(DATASETS, dataset) ? DATASETS[dataset] : null;
  if (!build) {
    return Response.json({ error: "No such dataset." }, { status: 404 });
  }

  const { header, rows } = await build();

  /* Written before the file is handed over, not after, so a download that is
     interrupted halfway is still on the record. An export of the membership
     register is the single most sensitive thing this platform can produce, and
     the log entry is the only thing that makes it accountable. */
  try {
    await prisma.auditLog.create({
      data: {
        actorId: BigInt(member.id),
        action: "EXPORT",
        entityType: "dataset",
        scopeType: scope.scopeType ?? null,
        // A nationwide scope has no unit id, which is the correct value here.
        scopeId: scope.stateId ?? scope.zoneId ?? null,
        afterState: { dataset, rows: rows.length },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          request.headers.get("x-real-ip") ??
          null,
      },
    });
  } catch (error) {
    /* If the trail cannot be written, the export does not happen. An
       unrecorded copy of the membership register leaving the building is
       exactly the thing the trail exists to prevent. */
    console.error("[export] audit write failed", error);
    return Response.json(
      { error: "The export could not be recorded, so it was not produced." },
      { status: 503 }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="map-${dataset}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Every query the admin dashboards run.
 *
 * They live together, and they all take a `scope`, because §13.2 requires the
 * scope check to be server-side on every request. A page that wrote its own
 * `where` clause would be one refactor away from showing Delta to Edo.
 *
 * Server only.
 */

import { prisma } from "./db";
import {
  memberScopeWhere,
  pollingUnitScopeWhere,
  seatScopeWhere,
  TIER_RANK,
} from "./permissions";
import { fullName } from "./store";

/* ─────────────────────────────────────────────────────────────── overview */

/**
 * §10.1: the coverage card and the growth figure.
 *
 * There is no application backlog to report. Members do not apply for office;
 * a coordinator appoints from the register of members in their territory, so
 * the number that governs this dashboard is the vacancy count — work waiting
 * on the person reading the page — not a queue someone else has to submit to.
 */
export async function overview(scope) {
  const memberWhere = memberScopeWhere(scope);
  const seatWhere = seatScopeWhere(scope);
  if (!memberWhere || !seatWhere) return null;

  const day = 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(Date.now() - 30 * day);
  const sixtyDaysAgo = new Date(Date.now() - 60 * day);

  const [members, recent, previous, referred, referredRecent, seats, filled] = await Promise.all([
    prisma.member.count({ where: memberWhere }),
    prisma.member.count({ where: { ...memberWhere, joinedAt: { gte: thirtyDaysAgo } } }),
    // The 30 days before those, so "recent" has something to be measured
    // against. A growth figure with nothing behind it is just a count.
    prisma.member.count({
      where: { ...memberWhere, joinedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.member.count({ where: { ...memberWhere, referredById: { not: null } } }),
    prisma.member.count({
      where: { ...memberWhere, referredById: { not: null }, joinedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.seat.count({ where: seatWhere }),
    prisma.seat.count({ where: { ...seatWhere, status: "FILLED" } }),
  ]);

  return {
    members,
    recent,
    previous,
    growth: recent - previous,
    referred,
    referredRecent,
    /* The share of the register that somebody in the movement brought in. It is
       the one figure on this page that measures the members rather than the
       structure, and it is the one a coordinator can move this week. */
    referredShare: members ? Math.round((referred / members) * 100) : 0,
    seats,
    filled,
    vacant: seats - filled,
    coverage: seats ? Math.round((filled / seats) * 100) : 0,
  };
}

/**
 * §10.1 territory table: the units directly beneath this scope, each with its
 * member count, seats filled and coordinator — sortable so the weakest unit
 * surfaces immediately, which is the entire point of the table.
 */
export async function territory(scope) {
  if (!scope) return null;

  // What sits one level down depends on where you stand.
  const level =
    scope.isSuperAdmin || scope.scopeType === "NATION"
      ? scope.region
        ? "state" // Assistant Coordinator North/South: straight to their states
        : "zone"
      : scope.scopeType === "ZONE"
        ? "state"
        : scope.scopeType === "STATE"
          ? "lga"
          : scope.scopeType === "LGA"
            ? "ward"
            : null;

  if (!level) return null; // a Ward Coordinator has nothing below them

  const units = await unitsAtLevel(scope, level);
  if (!units.length) return { level, rows: [] };

  const rows = await Promise.all(
    units.map(async (unit) => {
      const memberWhere = memberFilterFor(level, unit.id);
      const seatWhere = seatFilterFor(level, unit.id);

      const [members, seats, filled, lead] = await Promise.all([
        prisma.member.count({ where: memberWhere }),
        prisma.seat.count({ where: seatWhere }),
        prisma.seat.count({ where: { ...seatWhere, status: "FILLED" } }),
        leadOf(level, unit.id),
      ]);

      return {
        id: unit.id,
        name: unit.name,
        members,
        seats,
        filled,
        coverage: seats ? Math.round((filled / seats) * 100) : 0,
        coordinator: lead,
      };
    })
  );

  // Weakest first: this table exists to find the gap, not to admire the total.
  rows.sort((a, b) => a.coverage - b.coverage || b.members - a.members);
  return { level, rows };
}

async function unitsAtLevel(scope, level) {
  const select = { id: true, name: true };
  switch (level) {
    case "zone":
      return prisma.zone.findMany({ select, orderBy: { name: "asc" } });
    case "state":
      return prisma.state.findMany({
        where: scope.region
          ? { zoneId: { in: scope.regionZoneIds } }
          : scope.scopeType === "ZONE"
            ? { zoneId: scope.zoneId }
            : {},
        select,
        orderBy: { name: "asc" },
      });
    case "lga":
      return prisma.lga.findMany({
        where: { stateId: scope.stateId },
        select,
        orderBy: { name: "asc" },
      });
    case "ward":
      return prisma.ward.findMany({
        where: { lgaId: scope.lgaId },
        select,
        orderBy: { name: "asc" },
      });
    default:
      return [];
  }
}

function memberFilterFor(level, id) {
  switch (level) {
    case "zone":
      return { state: { zoneId: id } };
    case "state":
      return { stateId: id };
    case "lga":
      return { lgaId: id };
    case "ward":
      return { wardId: id };
    default:
      return {};
  }
}

function seatFilterFor(level, id) {
  switch (level) {
    case "zone":
      return {
        OR: [
          { zoneId: id },
          { state: { zoneId: id } },
          { lga: { state: { zoneId: id } } },
          { ward: { lga: { state: { zoneId: id } } } },
        ],
      };
    case "state":
      return {
        OR: [{ stateId: id }, { lga: { stateId: id } }, { ward: { lga: { stateId: id } } }],
      };
    case "lga":
      return { OR: [{ lgaId: id }, { ward: { lgaId: id } }] };
    case "ward":
      return { wardId: id };
    default:
      return {};
  }
}

/** The admin office that leads a unit, and who holds it. */
async function leadOf(level, id) {
  const roleCode = { zone: "ZC_", state: "ST_COORD", lga: "LG_COORD", ward: "WD_COORD" }[level];
  if (!roleCode) return null;

  const seat = await prisma.seat.findFirst({
    where: {
      ...(level === "zone" ? { zoneId: id, role: { code: { startsWith: "ZC_" } } } : {}),
      ...(level === "state" ? { stateId: id, role: { code: roleCode } } : {}),
      ...(level === "lga" ? { lgaId: id, role: { code: roleCode } } : {}),
      ...(level === "ward" ? { wardId: id, role: { code: roleCode } } : {}),
    },
    select: {
      appointments: {
        where: { status: "ACTIVE" },
        select: { member: { select: { firstName: true, middleName: true, surname: true } } },
        take: 1,
      },
    },
  });

  const holder = seat?.appointments[0]?.member;
  return holder ? fullName(holder) : null;
}

/* ─────────────────────────────────────────────────────────────── directory */

/** §10: the member directory, limited to the actor's territory. */
export async function members(scope, { q = "", page = 1, perPage = 25 } = {}) {
  const base = memberScopeWhere(scope);
  if (!base) return { rows: [], total: 0, page: 1, pages: 0 };

  const search = q.trim();
  const where = search
    ? {
        AND: [
          base,
          {
            OR: [
              { surname: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { membershipNo: { contains: search, mode: "insensitive" } },
              { user: { phone: { contains: search } } },
            ],
          },
        ],
      }
    : base;

  const [total, rows] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: [{ surname: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        membershipNo: true,
        firstName: true,
        middleName: true,
        surname: true,
        photoUrl: true,
        verification: true,
        joinedAt: true,
        user: { select: { phone: true, phoneVerified: true } },
        state: { select: { name: true } },
        lga: { select: { name: true } },
        ward: { select: { name: true } },
        referralCode: true,
        _count: { select: { referrals: true } },
        appointments: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { seat: { select: { role: { select: { title: true } } } } },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pages: Math.ceil(total / perPage),
    rows: rows.map((m) => ({
      id: String(m.id),
      membershipNo: m.membershipNo,
      name: fullName(m),
      /* The URL only. The bytes live in their own table and are served by
         /api/members/<id>/photo, which re-checks this same scope before it
         hands any of them over. */
      photoUrl: m.photoUrl,
      phone: m.user.phone,
      phoneVerified: m.user.phoneVerified,
      verification: m.verification,
      state: m.state.name,
      lga: m.lga.name,
      ward: m.ward.name,
      office: m.appointments[0]?.seat.role.title ?? null,
      referralCode: m.referralCode,
      referrals: m._count.referrals,
      joinedAt: m.joinedAt.toISOString(),
    })),
  };
}

/**
 * One member, in full, for the page a coordinator lands on when they click a
 * name.
 *
 * The scope filter is applied in the same `where` as the id, not checked after
 * the row is fetched: a missing row and a row outside the reader's territory
 * come back identically, so this cannot be used to discover that a member with
 * a given id exists in a state the reader does not govern.
 */
export async function memberDetail(scope, id) {
  const base = memberScopeWhere(scope);
  if (!base) return null;

  let memberId;
  try {
    memberId = BigInt(id);
  } catch {
    return null;
  }

  const row = await prisma.member.findFirst({
    where: { AND: [base, { id: memberId }] },
    select: {
      id: true,
      membershipNo: true,
      firstName: true,
      middleName: true,
      surname: true,
      photoUrl: true,
      gender: true,
      occupation: true,
      verification: true,
      joinedAt: true,
      referralCode: true,
      ninEncrypted: true,
      user: { select: { phone: true, email: true, phoneVerified: true, lastLoginAt: true } },
      state: { select: { name: true } },
      lga: { select: { name: true } },
      ward: { select: { name: true } },
      pollingUnit: { select: { name: true, code: true } },
      referrer: { select: { id: true, firstName: true, surname: true, referralCode: true } },
      _count: { select: { referrals: true } },
      appointments: {
        where: { status: "ACTIVE" },
        select: {
          startDate: true,
          seat: { select: { role: { select: { title: true, tier: true } } } },
        },
      },
    },
  });

  if (!row) return null;

  return {
    id: String(row.id),
    membershipNo: row.membershipNo,
    name: fullName(row),
    photoUrl: row.photoUrl,
    gender: row.gender,
    occupation: row.occupation,
    /* Whether a NIN is on file, never the number itself. It is encrypted at
       rest under §13.2 and there is no reason a coordinator needs to read it. */
    hasNin: Boolean(row.ninEncrypted),
    phone: row.user.phone,
    email: row.user.email,
    phoneVerified: row.user.phoneVerified,
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    verification: row.verification,
    state: row.state.name,
    lga: row.lga.name,
    ward: row.ward.name,
    pollingUnit: row.pollingUnit?.name ?? null,
    referralCode: row.referralCode,
    referrals: row._count.referrals,
    invitedBy: row.referrer
      ? {
          id: String(row.referrer.id),
          name: `${row.referrer.firstName} ${row.referrer.surname}`,
          code: row.referrer.referralCode,
        }
      : null,
    offices: row.appointments.map((appointment) => ({
      title: appointment.seat.role.title,
      tier: appointment.seat.role.tier,
      since: appointment.startDate?.toISOString() ?? null,
    })),
    joinedAt: row.joinedAt.toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────── leadership */

/**
 * §10: who holds office within the actor's territory, grouped by tier.
 * Vacant seats are included on purpose — a leadership page that only lists
 * the people who exist hides the thing the movement most needs to see.
 */
export async function leadership(scope, { tier } = {}) {
  const base = seatScopeWhere(scope);
  if (!base) return null;

  const where = tier ? { AND: [base, { role: { tier } }] } : base;

  const seats = await prisma.seat.findMany({
    where,
    orderBy: [{ role: { sortOrder: "asc" } }, { seatIndex: "asc" }],
    // Ward seats alone number 88,000. The leadership view is for the tiers a
    // human can read; wards are reached through the territory table instead.
    take: 500,
    select: {
      id: true,
      seatIndex: true,
      status: true,
      role: { select: { code: true, title: true, tier: true, tierRank: true, isAdmin: true, isFunctional: true } },
      zone: { select: { name: true } },
      state: { select: { name: true } },
      lga: { select: { name: true } },
      ward: { select: { name: true } },
      appointments: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          startDate: true,
          member: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              surname: true,
              membershipNo: true,
              photoUrl: true,
              user: { select: { phone: true } },
            },
          },
        },
      },
    },
  });

  return seats.map((seat) => {
    const held = seat.appointments[0];
    return {
      id: String(seat.id),
      title: seat.role.title,
      roleCode: seat.role.code,
      tier: seat.role.tier,
      tierRank: seat.role.tierRank,
      isAdmin: seat.role.isAdmin,
      isFunctional: seat.role.isFunctional,
      seatIndex: seat.seatIndex,
      status: seat.status,
      scope:
        seat.ward?.name ?? seat.lga?.name ?? seat.state?.name ?? seat.zone?.name ?? "Federation",
      holder: held
        ? {
            id: String(held.member.id),
            name: fullName(held.member),
            membershipNo: held.member.membershipNo,
            photoUrl: held.member.photoUrl,
            phone: held.member.user.phone,
            since: held.startDate.toISOString(),
          }
        : null,
    };
  });
}

/* ─────────────────────────────────────────────────────────────── structure */

/** §10.1 coverage card, broken down by tier — the seat map. */
export async function structure(scope) {
  const base = seatScopeWhere(scope);
  if (!base) return null;

  const tiers = ["NATIONAL", "ZONAL", "STATE", "LGA", "WARD"];

  const rows = await Promise.all(
    tiers.map(async (tier) => {
      const where = { AND: [base, { role: { tier } }] };
      const [seats, filled] = await Promise.all([
        prisma.seat.count({ where }),
        prisma.seat.count({ where: { AND: [where, { status: "FILLED" }] } }),
      ]);
      return {
        tier,
        rank: TIER_RANK[tier],
        seats,
        filled,
        vacant: seats - filled,
        coverage: seats ? Math.round((filled / seats) * 100) : 0,
      };
    })
  );

  return rows.filter((row) => row.seats > 0);
}

/* ─────────────────────────────────────────────────────── polling units */

/**
 * The polling units of a territory, with how many members are registered at
 * each — the working list a Ward or LGA Coordinator actually organises from.
 *
 * A unit with no members is the point of the page, not a blank row: it is a
 * building where the movement has nobody, and it is the shortest possible
 * answer to "where do I go next". So the default order is emptiest first,
 * and the count is the column that matters.
 *
 * Available at every tier, because the scope filter makes it safe, but it is
 * only in the rail for LGA and Ward: 176,623 rows is not a working list.
 */
export async function pollingUnits(
  scope,
  { q = "", page = 1, perPage = 40, order = "empty" } = {}
) {
  const base = pollingUnitScopeWhere(scope);
  if (!base) return null;

  const search = q.trim();
  const where = search
    ? {
        AND: [
          base,
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search.toUpperCase() } },
              { ward: { name: { contains: search, mode: "insensitive" } } },
            ],
          },
        ],
      }
    : base;

  const [total, covered, rows] = await Promise.all([
    prisma.pollingUnit.count({ where }),
    prisma.pollingUnit.count({ where: { ...where, members: { some: {} } } }),
    prisma.pollingUnit.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy:
        order === "members"
          ? [{ members: { _count: "desc" } }, { code: "asc" }]
          : [{ members: { _count: "asc" } }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        ward: { select: { name: true, lga: { select: { name: true } } } },
        _count: { select: { members: true } },
      },
    }),
  ]);

  return {
    total,
    covered,
    page,
    pages: Math.ceil(total / perPage),
    coverage: total ? Math.round((covered / total) * 100) : 0,
    rows: rows.map((unit) => ({
      id: unit.id,
      code: unit.code,
      name: unit.name,
      ward: unit.ward.name,
      lga: unit.ward.lga.name,
      members: unit._count.members,
    })),
  };
}

/**
 * The seats of the actor's own unit and who holds them — the ten ward seats a
 * Ward Coordinator is responsible for filling, or the five LGA seats.
 *
 * This is what a Ward Coordinator's dashboard shows where every tier above
 * theirs shows the tier beneath. They have no tier beneath, and a dashboard
 * whose main table is empty tells the person at the bottom of the structure
 * that the platform was built for everybody else.
 */
export async function ownSeats(scope) {
  if (!scope) return null;

  const where =
    scope.scopeType === "WARD"
      ? { wardId: scope.wardId }
      : scope.scopeType === "LGA"
        ? { lgaId: scope.lgaId }
        : scope.scopeType === "STATE"
          ? { stateId: scope.stateId }
          : scope.scopeType === "ZONE"
            ? { zoneId: scope.zoneId }
            : { scopeType: "NATION" };

  const seats = await prisma.seat.findMany({
    where,
    select: {
      id: true,
      seatIndex: true,
      status: true,
      role: { select: { code: true, title: true, isAdmin: true, tierRank: true } },
      appointments: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          startDate: true,
          member: {
            select: { id: true, firstName: true, middleName: true, surname: true, photoUrl: true },
          },
        },
      },
    },
  });

  /* The coordinator leads their own list. Ordering in SQL put Ward Officer 1
     above the Ward Coordinator, because the two roles share a tier rank and
     seat index 1 — and the office that appoints the other nine is not the
     second row of the table.

     `seats` counts how many the role has, so a lone office is shown without a
     number and the nine officers are numbered 1 to 9 rather than 2 to 9. */
  const perRole = new Map();
  for (const seat of seats) {
    perRole.set(seat.role.code, (perRole.get(seat.role.code) ?? 0) + 1);
  }

  seats.sort(
    (a, b) =>
      a.role.tierRank - b.role.tierRank ||
      Number(b.role.isAdmin) - Number(a.role.isAdmin) ||
      a.role.title.localeCompare(b.role.title, "en") ||
      a.seatIndex - b.seatIndex
  );

  return seats.map((seat) => {
    const holder = seat.appointments[0];
    return {
      id: String(seat.id),
      title: seat.role.title,
      seatIndex: perRole.get(seat.role.code) > 1 ? seat.seatIndex : null,
      holder: holder
        ? {
            id: String(holder.member.id),
            name: fullName(holder.member),
            photoUrl: holder.member.photoUrl,
            since: holder.startDate?.toISOString() ?? null,
          }
        : null,
    };
  });
}

/** The most recent members to register in a territory. */
export async function newestMembers(scope, { take = 6 } = {}) {
  const where = memberScopeWhere(scope);
  if (!where) return [];

  const rows = await prisma.member.findMany({
    where,
    orderBy: { joinedAt: "desc" },
    take,
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      photoUrl: true,
      joinedAt: true,
      verification: true,
      ward: { select: { name: true } },
      referrer: { select: { firstName: true, surname: true } },
    },
  });

  return rows.map((row) => ({
    id: String(row.id),
    name: fullName(row),
    photoUrl: row.photoUrl,
    ward: row.ward.name,
    verification: row.verification,
    joinedAt: row.joinedAt.toISOString(),
    invitedBy: row.referrer ? `${row.referrer.firstName} ${row.referrer.surname}` : null,
  }));
}

/**
 * §7.2 verification, as three counts and their shares.
 *
 * It is the ceiling on how much of the structure can be filled: only a
 * verified member may hold office at LGA level and above, so a territory that
 * is 4% verified cannot staff its own executive however many members it has.
 */
export async function verificationSplit(scope) {
  const where = memberScopeWhere(scope);
  if (!where) return null;

  const [total, verified, pending, rejected] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.count({ where: { ...where, verification: "VERIFIED" } }),
    prisma.member.count({ where: { ...where, verification: "PENDING" } }),
    prisma.member.count({ where: { ...where, verification: "REJECTED" } }),
  ]);

  const share = (n) => (total ? Math.round((n / total) * 100) : 0);

  return {
    total,
    verified,
    pending,
    rejected,
    verifiedShare: share(verified),
    pendingShare: share(pending),
    rejectedShare: share(rejected),
  };
}

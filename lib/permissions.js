/**
 * The Descendant Rule (§6.9), in one place.
 *
 *   An admin may view, appoint, promote or remove any member or seat whose
 *   scope is at or below their own scope, and whose tier is strictly lower
 *   than their own — except the Super Admin, who may act anywhere.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * §13.2: "Role checks enforced server-side on every request. Hiding a button
 * is not a permission." Every dashboard query and every privileged write goes
 * through `scopeWhere()` or `canAdminister()`. Nothing else may build its own
 * scope filter, because the day two of them disagree is the day the Edo
 * Coordinator can read Delta.
 *
 * Server only. Never import into a client component.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { prisma } from "./db";

/* Tier ranks, per Appendix B. Lower number = higher authority. */
export const TIER_RANK = { NATIONAL: 1, ZONAL: 2, STATE: 3, LGA: 4, WARD: 5 };

const SUPER_ADMIN = "NAT_COORD";

/* §6.2 offices 8 and 9 are the one authority the plan defines by region
   rather than by a single scope row: three zones each, not one. */
const REGIONAL = {
  ASST_COORD_NORTH: "NORTH",
  ASST_COORD_SOUTH: "SOUTH",
};

/**
 * Everything the app needs to know about what one member is allowed to do.
 * Read once per request and passed down; never recomputed per query.
 *
 * Returns null for a member with no active seat — an ordinary member, who
 * has no admin surface at all.
 */
export async function resolveScope(memberId) {
  if (!memberId) return null;

  const appointment = await prisma.appointment.findFirst({
    where: { memberId: BigInt(memberId), status: "ACTIVE" },
    include: {
      seat: {
        include: {
          role: true,
          zone: true,
          state: { include: { zone: true } },
          lga: { include: { state: true } },
          ward: { include: { lga: { include: { state: true } } } },
        },
      },
    },
  });

  if (!appointment) return null;

  const { seat } = appointment;
  const { role } = seat;

  const scope = {
    memberId: String(memberId),
    seatId: String(seat.id),
    roleCode: role.code,
    roleTitle: role.title,
    tier: role.tier,
    tierRank: role.tierRank,
    isAdmin: role.isAdmin,
    isFunctional: role.isFunctional,
    isSuperAdmin: role.code === SUPER_ADMIN,
    scopeType: seat.scopeType,
    zoneId: seat.zoneId,
    stateId: seat.stateId,
    lgaId: seat.lgaId,
    wardId: seat.wardId,
    region: REGIONAL[role.code] ?? null,
    /* §6.10: functional directors read nationwide but appoint nobody.
       §6.11 gives non-super national executives nationwide READ. */
    readsNationwide: role.tier === "NATIONAL",
    label: scopeLabel(seat),
    /* The same territory, split for the rail: "Ward" over "Odopetu" rather
       than one line reading "Odopetu Ward, Akure South, Ondo". The long form
       stays in `label`, where a sentence needs it. */
    tierLabel: scopeTier(seat),
    unitName: scopeUnit(seat),
  };

  // The zones an Assistant Coordinator North/South actually covers.
  if (scope.region) {
    const zones = await prisma.zone.findMany({
      where: { region: scope.region },
      select: { id: true },
    });
    scope.regionZoneIds = zones.map((z) => z.id);
  }

  return scope;
}

function scopeLabel(seat) {
  if (seat.ward) return `${seat.ward.name} Ward, ${seat.ward.lga.name}, ${seat.ward.lga.state.name}`;
  if (seat.lga) return `${seat.lga.name} LGA, ${seat.lga.state.name}`;
  if (seat.state) return `${seat.state.name} State`;
  if (seat.zone) return `${seat.zone.name} Zone`;
  return "Federation";
}

function scopeTier(seat) {
  if (seat.ward) return "Ward";
  if (seat.lga) return "LGA";
  if (seat.state) return "State";
  if (seat.zone) return "Zone";
  return "National";
}

function scopeUnit(seat) {
  if (seat.ward) return seat.ward.name;
  if (seat.lga) return seat.lga.name;
  if (seat.state) return seat.state.name;
  if (seat.zone) return seat.zone.name;
  return "Federation";
}

/* ──────────────────────────────────────────────────────────── read filters */

/**
 * A Prisma `where` fragment limiting members to the actor's territory.
 *
 * Returns `{}` for nationwide readers, which is correct: §6.11 grants every
 * National Executive read access nationwide. Write access is a separate
 * question, answered by canAdminister().
 */
export function memberScopeWhere(scope) {
  if (!scope) return null; // no seat, no directory
  if (scope.isSuperAdmin || scope.readsNationwide) return {};

  switch (scope.scopeType) {
    case "NATION":
      return {};
    case "ZONE":
      return { state: { zoneId: scope.zoneId } };
    case "STATE":
      return { stateId: scope.stateId };
    case "LGA":
      return { lgaId: scope.lgaId };
    case "WARD":
      return { wardId: scope.wardId };
    default:
      // Unknown scope means no access, never all access.
      return null;
  }
}

/**
 * The same filter, expressed against the `polling_units` table.
 *
 * A polling unit has no state or LGA column of its own — it hangs off a ward —
 * so every level above ward reaches it through the relation chain.
 */
export function pollingUnitScopeWhere(scope) {
  if (!scope) return null;
  if (scope.isSuperAdmin || scope.readsNationwide) return {};

  switch (scope.scopeType) {
    case "NATION":
      return {};
    case "ZONE":
      return { ward: { lga: { state: { zoneId: scope.zoneId } } } };
    case "STATE":
      return { ward: { lga: { stateId: scope.stateId } } };
    case "LGA":
      return { ward: { lgaId: scope.lgaId } };
    case "WARD":
      return { wardId: scope.wardId };
    default:
      return null;
  }
}

/** The same filter, expressed against the `seats` table. */
export function seatScopeWhere(scope) {
  if (!scope) return null;
  if (scope.isSuperAdmin || scope.readsNationwide) return {};

  switch (scope.scopeType) {
    case "NATION":
      return {};
    case "ZONE":
      return {
        OR: [
          { zoneId: scope.zoneId },
          { state: { zoneId: scope.zoneId } },
          { lga: { state: { zoneId: scope.zoneId } } },
          { ward: { lga: { state: { zoneId: scope.zoneId } } } },
        ],
      };
    case "STATE":
      return {
        OR: [
          { stateId: scope.stateId },
          { lga: { stateId: scope.stateId } },
          { ward: { lga: { stateId: scope.stateId } } },
        ],
      };
    case "LGA":
      return {
        OR: [{ lgaId: scope.lgaId }, { ward: { lgaId: scope.lgaId } }],
      };
    case "WARD":
      return { wardId: scope.wardId };
    default:
      return null;
  }
}

/* ───────────────────────────────────────────────────────────── write rules */

/**
 * May this actor appoint to, or remove from, this seat?
 *
 * Two independent tests, both of which must pass:
 *   1. TIER  — the target's tier is strictly below the actor's.
 *   2. SCOPE — the target's territory falls inside the actor's.
 *
 * `seat` must be loaded with its role and its scope relations.
 */
export function canAdminister(scope, seat) {
  if (!scope) return false;
  if (scope.isSuperAdmin) return true; // §6.9, the one exception

  // §6.10: functional directors have no appointment powers, at any tier.
  if (scope.isFunctional) return false;
  if (!scope.isAdmin) return false;

  // 1. Strictly lower tier. An actor may never alter their own seat, nor a
  //    peer's — that is what "strictly" buys us.
  if (seat.role.tierRank <= scope.tierRank) return false;

  // 2. Containment.
  return scopeContains(scope, seat);
}

/** Does the actor's territory contain the seat's? */
export function scopeContains(scope, seat) {
  // Assistant Coordinator North/South: three zones, not one.
  if (scope.region) {
    const zoneId = seatZoneId(seat);
    return zoneId != null && (scope.regionZoneIds ?? []).includes(zoneId);
  }

  switch (scope.scopeType) {
    case "NATION":
      return true;
    case "ZONE":
      return seatZoneId(seat) === scope.zoneId;
    case "STATE":
      return seatStateId(seat) === scope.stateId;
    case "LGA":
      return seatLgaId(seat) === scope.lgaId;
    case "WARD":
      return seat.wardId === scope.wardId;
    default:
      return false;
  }
}

/* Walk a seat's scope upward. Each returns null when the seat sits above the
   tier being asked about — a national seat has no state, and that is a
   "no", not a "yes". */
function seatZoneId(seat) {
  return (
    seat.zoneId ??
    seat.state?.zoneId ??
    seat.lga?.state?.zoneId ??
    seat.ward?.lga?.state?.zoneId ??
    null
  );
}

function seatStateId(seat) {
  return seat.stateId ?? seat.lga?.stateId ?? seat.ward?.lga?.stateId ?? null;
}

function seatLgaId(seat) {
  return seat.lgaId ?? seat.ward?.lgaId ?? null;
}

/* ────────────────────────────────────────────────────────────── capability */

/** §6.11, as a lookup the UI can ask before drawing a button. */
export function can(scope, capability) {
  if (!scope) return false;
  if (scope.isSuperAdmin) return true;

  switch (capability) {
    case "viewDirectory":
      return true;
    case "viewNationwide":
      return scope.readsNationwide;
    /* There is no "approve" capability, deliberately. Nobody applies for a
       seat, so there is no application to approve — appointing to a seat and
       removing from one are the whole of the power. */
    case "appoint":
    case "remove":
      return scope.isAdmin && !scope.isFunctional && scope.tierRank < TIER_RANK.WARD;
    case "broadcast":
      return scope.isAdmin;
    case "publishContent":
      return scope.roleCode === "DIR_MEDIA_IT" || scope.roleCode === "ASST_DIR_MEDIA";
    case "viewAudit":
      return scope.isAdmin && scope.tierRank <= TIER_RANK.LGA;
    default:
      return false;
  }
}

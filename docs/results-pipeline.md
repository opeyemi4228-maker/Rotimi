# Election returns: from the booth to the map

How a vote counted at a polling unit becomes a colour on the map of Nigeria, and
every decision taken along the way.

This document covers the two halves of the results system — **the upload**, which
is one agent filing one return from one booth, and **the display**, which is that
return aggregated up six levels and drawn at each of them.

Status is marked throughout: **Built** means it is in the repository and working,
**Partial** means the mechanism exists but does not yet cover every case, and
**Proposed** means it is designed here and not yet written.

---

## 1. What these numbers are

MAP's own agents' returns from the polling units they were appointed to. A
**parallel vote tabulation** — the same thing party agents and observer missions
have done in Nigerian elections for decades, done in software.

They are **not INEC's results**, and nothing built on them may imply otherwise.
This is not a disclaimer to be tucked into a footer; it is a constraint on the
schema. Where an agent can also read INEC's declared figure for their booth, it
is stored in **its own columns** — `inecAccredited`, `inecTotalVotes` — and never
merged with the agent's count. The gap between what an agent witnessed and what
was declared is itself a number the movement wants to see, and a schema that
stored one number would make that comparison impossible to make later.

Two further rules follow from this and are enforced everywhere below:

- **Silence is not zero.** A unit nobody has reported from is drawn grey and
  labelled "no returns yet", never in a party's colour and never as a low
  number. On election night the difference between "nobody is winning here" and
  "nobody has told us yet" is the whole story.
- **Coverage travels with every total.** A leader with 4% of units in is not a
  leader. Every figure this system publishes is shown next to the share of
  booths it is drawn from.

---

## 2. The six levels

The movement's structure and the results hierarchy are the same hierarchy. This
is deliberate: the person who files a return is the holder of the seat at the
bottom of it.

| Rank | Tier | Scope | Units | Seat that reports |
|-----:|------|-------|------:|-------------------|
| 1 | National | Federation | 1 | — |
| 2 | Zonal | Geopolitical zone | 6 | — |
| 3 | State | State / FCT | 37 | — |
| 4 | LGA | Local Government Area | 774 | — |
| 5 | Ward | Registration Area | 8,809 | Ward Coordinator verifies |
| 6 | **Polling Unit** | Booth | **176,623** | **`PU_AGENT` — Polling Unit Coordinator, files the return** |

`PU_AGENT` is `tierRank: 6`, `seatsPerUnit: 1`, appointed by the Ward
Coordinator (`approverRole: "WD_COORD"`). One booth, one agent, one return.

**Built** — `prisma/roles.mjs`, `ScopeType.POLLING_UNIT`, `lib/permissions.js`.

---

## 3. The data model

```
Election ──< Candidate >── Party
   │                         │
   │                         │
   └──< PollingUnitResult >──┴── ResultVote   (one row per party that scored)
              │
              ├── ResultSheet   (the EC8A photograph — the evidence)
              └── PollingUnit ── Ward ── Lga ── State ── Zone
```

### `PollingUnitResult` — one agent's return

Unique on `(electionId, pollingUnitId)`. **A booth reports once.** A correction
amends that row; it never adds a second. Two returns from one booth is precisely
the ambiguity this table exists to prevent.

The row carries `wardId`, `lgaId` and `stateId` **denormalised**, written by the
server from the polling unit and never accepted from the client. This is the
single most important performance decision in the system: "votes per party in
Rivers" becomes one grouped scan of an indexed column instead of a four-table
join across 176,623 rows, and the same query shape serves all five read levels
by changing one field name.

| Column group | Fields |
|---|---|
| Identity | `electionId`, `pollingUnitId`, denormalised `wardId` / `lgaId` / `stateId` |
| The count | `registeredVoters`, `accreditedVoters`, `rejectedBallots` |
| INEC's figure | `inecAccredited`, `inecTotalVotes` — separate, never merged |
| Evidence | `locationConfirmed`, `termsAccepted`, `ResultSheet` |
| Attribution | `submittedById`, `submittedAt`, `verifiedById`, `verifiedAt`, `note` |
| State | `status: SUBMITTED \| VERIFIED \| DISPUTED` |

### `ResultVote` — a row per party, not a column per party

The party list is data, not schema. A row per party that scored keeps the ballot
editable between elections without a migration.

### `ResultSheet` — the photograph, in its own table

Bytes live apart from the result row for the same reason member photographs live
apart from the member: a result row has to stay small enough to aggregate over
176,623 of them. The `version` column is a content hash — it is the `?v=` in the
URL, the ETag on the response, and the proof that the image served today is the
image submitted on election night.

### `Constituency` — the geography an election is contested in

States, LGAs and wards are the *administrative* hierarchy. Electoral
constituencies cut across it: a federal constituency can be two LGAs, one LGA, or
part of one. So they are their own table with their own membership —
`ConstituencyLga` for whole LGAs (every senatorial district, most federal
constituencies) and `ConstituencyWard` for the federal constituencies that split
an LGA.

**Built** — schema and seed. **Partial** — see §12.1: nothing in the read path
filters by constituency yet.

---

## 4. The upload

### 4.1 The one rule

> **An agent files for the polling unit their seat is at, and for no other.**

The unit is never read from the request. It is read from the **appointment**, on
the server, on every submission. A form field naming the booth would be a form
field somebody could change.

`agentPost(memberId)` resolves the active `POLLING_UNIT` appointment and returns
the booth with everywhere it rolls up to. If there is no such appointment, there
is no booth to file for and the request is refused with 403.

The location tick is therefore **not** the security control. It is a declaration
by a named person that they are standing where the system already believes they
are, and it is stored as evidence of that declaration. The two together are what
make a return attributable.

### 4.2 The form

`/admin/election` — **Built**, `app/admin/election/ReturnForm.jsx`.

Designed for the conditions it will actually be used in: standing up, one-handed,
on a phone, at night, on a connection that may not hold. Everything on the page
follows from that.

- Nothing on the page but the booth, the elections open, and the form. No
  navigation into the middle of a task.
- The booth is **printed, not chosen** — confirmed, never selected.
- Numeric keypads on every field; a running total that updates as figures are
  typed.
- The arithmetic is checked in the browser **first**, so the agent finds out
  while the sheet is still in their hand rather than after a round trip.
- The photograph is downscaled in the browser to ~1600px before upload — a few
  hundred kilobytes instead of eight megabytes.
- Both affirmations must be ticked before the form will submit, and both are
  stored.

### 4.3 The arithmetic

`validateReturn()` — **Built**, `lib/results.js`. These are arithmetic facts
about a ballot box, not opinions:

| Rule | Why |
|---|---|
| No negative votes, accreditations or registrations | A negative vote also makes the accreditation test pass by cancelling a real one |
| `accredited ≤ registered` | You cannot accredit more people than are registered |
| `cast + rejected ≤ accredited` | You cannot cast more ballots than were accredited |
| `cast > 0` | "A return of nothing is not a return" |

A return that breaks any of these is far more likely to be a mistyped figure than
a discovery, and the booth is the only place it can still be checked against the
sheet in the agent's hand.

The same function runs on the server. The client copy is a courtesy, not a gate.

### 4.4 `POST /api/results`

**Built.** Rate-limited by caller. Multipart, because it carries an image.

**Trusted:** the session cookie, and the appointment it resolves to.
**Not trusted:** every single field in the body.

```
1. Rate limit                       -> 429 with Retry-After
2. Session -> member                -> 401 if absent
3. member -> agentPost()            -> 403 if no polling unit seat
4. electionId -> must be OPEN       -> 422
5. locationConfirmed && termsAccepted -> 422 if either missing
6. Numbers: strip to digits, then validateReturn()  -> 422 with per-field errors
7. Sheet (optional): size cap, re-decode, auto-orient, resize, re-encode
8. fileReturn() in one transaction
```

The photograph is **re-encoded, never stored as sent** — 12MB ceiling, capped at
1600px on the long edge, auto-oriented from EXIF, written as **JPEG q82**. JPEG
rather than WebP on purpose: this is evidence somebody may need to open in
whatever software is to hand years from now.

### 4.5 The write

`fileReturn()` — one transaction:

1. **Upsert** the result on `(electionId, pollingUnitId)`. Ward, LGA and state
   are written from the seat.
2. **Delete and re-insert** the votes. Replace rather than merge — a party the
   agent has removed has to disappear, and an update-only path would leave the
   old figure behind.
3. Upsert the sheet if one was supplied, hashing the bytes for the version.

**An amendment to a verified return drops it back to `SUBMITTED`** and clears
`verifiedById`/`verifiedAt`. The check it passed was against numbers that have
since changed.

---

## 5. Verification and disputes

`PATCH /api/results/[id]` — **Built**.

| Status | Meaning | Counts? |
|---|---|---|
| `SUBMITTED` | An agent has filed it. The default, and the honest one. | Yes |
| `VERIFIED` | A coordinator above them has checked it against the photograph. | Yes |
| `DISPUTED` | Something is wrong with it. | **No** |

**Who may verify:** a coordinator strictly above the booth whose territory
contains it. The one person who must never mark their own work verified is the
person who wrote it — checked explicitly as well as structurally, so that even a
National Coordinator cannot verify a return they filed themselves.

**A dispute requires a note.** A dispute without a reason is an accusation nobody
can act on, and the note is the part somebody will want to read a year later.

**A disputed return is never deleted.** It stays in the table, keeps its sheet,
and stops counting. Deleting it would be the single most suspicious thing this
system could do.

Reviewers work the queue at `/admin/results`, scoped to their own territory, with
the sheet photograph one click away.

---

## 6. The read

`lib/elections.js` — **Built.** Four functions serve every results surface in the
product.

`COUNTED = status IN (SUBMITTED, VERIFIED)`. Disputed rows are in the table and
out of the sum, everywhere, without exception.

### `tally(where)` — the totals for one place

One grouped query for the votes, one aggregate for the turnout arithmetic, one
count for the verified share. Returns parties sorted leader-first with each
party's share, the **margin over second place** (the number that says whether a
place is decided or still moving), turnout, and `unitsReported` / `unitsVerified`.

### `breakdown({ level, parentId })` — the units one level below

**This is what colours the map.** Every state, or every LGA in a state, with its
own leader — as *one* grouped query, not a tally per unit. 774 sequential tallies
would be 1,548 round trips.

| `level` | Groups by | Yields |
|---|---|---|
| `nation` | — | 37 states |
| `zone` | `stateId IN (…)` | the zone's states |
| `state` | `stateId` | the state's LGAs |
| `lga` | `lgaId` | the LGA's wards |
| `ward` | `wardId` | the ward's polling units |

A zone is the one level whose filter is a list rather than an id — it has no
column on a result because it is a set of states.

### `reporting({ … })` — coverage

Returns reported / total booths / share for any place. The most important number
on the page, and the one a results page most often hides.

### `latestReturns(electionId)` — the ticker

The most recent returns, newest first, each with its booth, its ward, its LGA,
its state and its leading party.

---

## 7. The display

### 7.1 The boundary problem, and what follows from it

There is **no open boundary dataset for Nigerian wards or polling units.**
geoBoundaries publishes ADM1 (37 states) and ADM2 (774 LGAs) for Nigeria and
stops there. INEC's 8,809 ward delimitations and 176,623 polling units exist as
codes and names, not as polygons, and nobody has released the shapes.

Three options, two of them rejected:

- **Invent the boundaries.** Out. A map is read as a claim about where things
  are, and a wrong one on election night is worse than none.
- **Fall back to a bare table.** Loses the thing the map was for — the whole area
  at a glance, with the leader legible in one sweep.
- **Keep the grammar, drop the cartography.** One tile per unit, filled with the
  leading party's colour, in the same order every time. A cartogram with the
  cartography removed. It answers "who is leading across this LGA" in one look,
  and does not pretend to say where anything is. **This is what is built.**

### 7.2 The five levels, as drawn

| Level | Route | Drawn as | Units | Source |
|---|---|---|---|---|
| **Nation** | `/results` | Choropleth of Nigeria | 37 states | `public/geo/map/states.json` |
| **State** | `/results/[state]` | Choropleth of the state | its LGAs | `public/geo/map/<CODE>.json` |
| **LGA** | `/results/[state]?lga=` | **Tile grid** | its wards | no polygons exist |
| **Ward** | `/results/[state]?lga=&ward=` | **Tile grid** | its polling units | no polygons exist |
| **Polling unit** | leaf of the ward grid | Figures + sheet | — | — |

Drill-down is a breadcrumb and a URL, not a modal. Every level is linkable,
shareable and back-button-correct — on election night people send each other
links.

### 7.3 Colour is never the only encoding

PDP is red and APC is green. That is the one pair the commonest form of colour
blindness cannot separate — roughly one man in twelve would see two states of the
same muddy tone with no way to tell which is which. No choice of hex fixes that;
it is how the eye works.

So, at every level:

- every reporting unit carries the **leading party's code in type** across it;
- the tooltip names the party **in words**;
- the table beneath the map is the same data with **no colour in it at all**.

The colour is the fast read. The letters are the true one.

Party colours are stored on the `Party` row rather than hard-coded, because a
chart that invents a party's colour is a chart nobody in Nigerian politics will
trust at a glance.

### 7.4 The shape pipeline

`scripts/build-map.mjs` — **Built.** Output is committed, so the site builds
without network access.

```
geoBoundaries gbOpen (CC BY 4.0, attribution printed under the map)
  ADM1 37 polygons ─┐
  ADM2 774 polygons ┘
        │  project once, at build time      (Nigeria is not going to move)
        │  round to 1 decimal in SVG units  (~100m at 1000 units across)
        ▼
  public/geo/map/states.json   the national map
  public/geo/map/<CODE>.json   one file per state, ~40KB, fetched on demand
```

SVG paths, not GeoJSON: shipping GeoJSON means shipping a projection library and
doing the maths in the browser on every load. What the browser receives is a `d`
attribute it can hand straight to the renderer. The raw ADM2 file is 3.7MB;
projected, rounded and split per state it is about 40KB a state.

A state map keeps the national projection but crops the `viewBox` to what it
draws, so a state fills its frame instead of sitting as a speck inside the
national bounding box.

---

## 8. Realtime

**Built** — `components/results/LiveRefresh.jsx`. **45-second polling via
`router.refresh()`.**

A websocket would push the moment a return lands, which sounds better and is
worse here:

- Results arrive over **hours** from 176,623 booths. A viewer gains nothing from
  seeing a number move two seconds sooner.
- The platform this deploys to charges for long-lived connections and drops them
  anyway.
- `router.refresh()` re-runs the server component and swaps the rendered output
  in — the page updates **without losing scroll position** or whatever the reader
  was hovering. A socket-driven client re-render would have to rebuild that state
  by hand.

Polling **stops while the tab is hidden** and catches up on becoming visible
again. A phone left open on this page all evening should not spend the night
polling a database from a pocket.

---

## 9. Visibility

| Surface | Who can see it |
|---|---|
| `/results` and its drill-down | **Public.** Aggregates only. |
| `GET /api/results/[id]/sheet` | The agent who filed it, plus coordinators whose scope contains the booth. |
| `/admin/results` review queue | Coordinators, scoped to their own territory. |
| `/admin/election` filing form | The `PU_AGENT` holding that booth. |

The sheet is not public, and that is a deliberate asymmetry with the numbers on
top of it. An EC8A photographed at a booth can carry an agent's handwriting, a
bystander, and the exact building somebody was standing in at a known hour.

The scope filter is applied **in the same query as the id**, so a sheet outside
the reader's territory and a sheet that does not exist come back identically.

---

## 10. Surfaces

| Route | Kind | Status |
|---|---|---|
| `/results` | Public national map, standings, ticker | Built |
| `/results/[state]` (`?lga=`, `?ward=`) | Public drill-down, three levels | Built |
| `/` (results band) | Homepage summary with mini map | Built |
| `/admin/election` | Agent filing form | Built |
| `/admin/results` | Scoped review queue and monitor | Built |
| `POST /api/results` | File or amend a return | Built |
| `PATCH /api/results/[id]` | Verify / dispute | Built |
| `GET /api/results/[id]/sheet` | The EC8A photograph | Built |

---

## 11. Election-night failure modes

| Hazard | Handling | Status |
|---|---|---|
| Agent's connection drops mid-submit | Error shown, nothing persisted, agent must retype | **Gap — see 12.2** |
| Agent files a mistyped figure | Client + server arithmetic; amendment path | Built |
| Two agents at one booth | Impossible: `seatsPerUnit: 1`, unique on (election, unit) | Built |
| Agent files for the wrong booth | Impossible: booth comes from the appointment | Built |
| A return is fabricated | Sheet photograph, named submitter, dispute path | Built |
| Early leader from 3% of booths | Coverage shown beside every total | Built |
| A grey unit read as a zero | Grey is labelled "no returns yet", never coloured | Built |
| Database under load from 176k booths | Denormalised columns, grouped queries, 45s poll | Built |
| Sheet uploads saturate the connection | Browser downscales to ~1600px before sending | Built |

---

## 12. Not built yet

### 12.1 Constituency-scoped aggregation — **Proposed**

`Constituency`, `ConstituencyLga` and `ConstituencyWard` are modelled and seeded,
and `Candidate` already carries `constituencyId`. But nothing in `lib/elections.js`
filters by it. Today a governorship, senatorial or federal-constituency race
aggregates by **geography**, which is right for presidential and wrong for the
other three — a senatorial total should be the sum of the booths in that
district, not of the state that contains it.

**Work:** add `constituencyId` to `resultsWhere()`, resolving to the union of its
LGAs and wards; add a constituency level to `LEVELS`; and choose the ballot for a
booth by the constituencies containing its ward.

### 12.2 An offline queue for agents — **Proposed**

The form is described as built for "a connection that may not hold", and it is —
right up to the submit button. There is no `localStorage` draft and no retry: a
failed submission loses the typed figures.

**Work:** persist the form state on every keystroke under a key of
`(electionId, pollingUnitId)`; on submit failure keep the draft and offer retry;
restore it on next load. The photograph is the awkward part — a downscaled blob
in IndexedDB rather than `localStorage`. A service worker with background sync
is the fuller version and is probably more than this needs.

### 12.3 A zone level in the public UI — **Proposed**

`breakdown({ level: "zone" })` is implemented and there is no route that calls
it. Six geopolitical zones is a natural way to read a national result, and the
query is already there. **Work:** `/results/zone/[code]`.

### 12.4 Result export — **Proposed**

`/api/admin/export/[dataset]` exists for members. Returns are not among the
datasets. Anyone doing serious analysis on election night will want a CSV of
every counted return within their scope.

### 12.5 An INEC-gap view of its own — **Partial**

The gap is computed and shown as a panel. It is arguably the most newsworthy
thing this system produces, and it has no surface of its own — no "where the
declared figure diverges most from what our agents witnessed", ranked.

---

## 13. Running it

```bash
npm run db:migrate            # schema, including the results tables
node prisma/seed.mjs          # geography, roles, 268,807 seats
node scripts/build-map.mjs    # SVG paths — only if boundaries are revised
node scripts/seed-election.mjs --unit <INEC-CODE>
                              # a Polling Unit Coordinator to file with
```

An election must be `OPEN` before any return will be accepted.

---

## Appendix — source and attribution

- **Boundaries:** geoBoundaries (gbOpen), release `9469f09`, CC BY 4.0.
  Attribution is required and is printed under the map.
- **Register:** INEC — 37 states, 774 LGAs, 8,809 registration areas, 176,623
  polling units, including the 56,737 units created in the 2021 expansion.

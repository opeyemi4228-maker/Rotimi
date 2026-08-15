import { notFound } from "next/navigation";
import { UserCheck, Users } from "lucide-react";

import { requireSecretariat } from "@/lib/guard";
import { queue } from "@/lib/applications";
import { seatsIAppointTo } from "@/lib/vacancies";
import { Empty, PageTitle, SectionHead, StatTile, Table } from "../ui";
import SeatRow from "./SeatRow";
import ApplicationCard from "./ApplicationCard";

export const metadata = { title: "Appointments — MAP Secretariat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The seats this officer appoints to, and the people who have asked for them.
 *
 * ── THE CHAIN ──────────────────────────────────────────────────────────────
 * Each office appoints the one directly below it: national to state, state to
 * LGA, LGA to ward, ward to booth. That is not a rule this page invents — every
 * RoleDefinition carries the code of the office that approves it, and
 * isApproverFor() in lib/permissions reads it. A National Coordinator sees the
 * national executive and no ward in the country.
 *
 * ── APPLICATIONS SIT ABOVE THE SEATS, AND DECIDE NOTHING ───────────────────
 * A member who has asked to serve appears here. That is all applying does. The
 * officer may appoint any eligible member from the table below, applicant or
 * not, and closing every application on the page leaves the vacancy exactly
 * where it was. The 72-hour clock (§8.1.6) turns a card red and does nothing
 * else: an application that approved itself on a timer would be the entitlement
 * this design refuses.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function AppointmentsPage() {
  const { scope } = await requireSecretariat();
  if (!scope) notFound();

  const [seats, applications] = await Promise.all([
    seatsIAppointTo(scope),
    queue(scope),
  ]);

  /* An officer who appoints to nothing should not be given a page that implies
     otherwise — a functional director, or a booth agent. */
  if (seats.length === 0 && applications.length === 0) notFound();

  const vacant = seats.filter((seat) => !seat.holder).length;
  const overdue = applications.filter((row) => row.overdue).length;

  return (
    <div className="space-y-10">
      <PageTitle
        title="Appointments"
        lead={`The seats you fill, and the members who have asked to serve in them. You appoint the office directly below yours — nobody reaches further down than that.`}
      />

      <div className="grid gap-px bg-ink-200 sm:grid-cols-3">
        <StatTile icon={UserCheck} label="Seats you appoint to" value={seats.length} />
        <StatTile
          icon={Users}
          label="Vacant"
          value={vacant}
          tone="alert"
          sub={vacant ? "Nobody is holding these." : "Every one of them is filled."}
        />
        <StatTile
          icon={Users}
          label="Waiting on you"
          value={applications.length}
          tone={overdue ? "alert" : "default"}
          sub={overdue ? `${overdue} past the 72 hours` : "All inside the 72 hours"}
        />
      </div>

      {applications.length > 0 && (
        <section>
          <SectionHead
            title="Members who have asked to serve"
            lead="Applying is not getting. You may appoint any eligible member from the table below, whether or not they applied — but these people put their names forward and are owed an answer."
          />
          <ul className="grid gap-4 xl:grid-cols-2">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHead
          title="Your seats"
          lead="Filled and vacant both — the power to fill a seat and the power to empty one are the same power."
        />
        <Table
          head={[
            { label: "Seat" },
            { label: "Held by" },
            { label: "Applications", align: "right" },
            { label: "", align: "right" },
          ]}
          empty={seats.length === 0 ? <Empty>You do not appoint to any seat.</Empty> : null}
        >
          {seats.map((seat) => (
            <SeatRow key={seat.id} seat={seat} />
          ))}
        </Table>
      </section>
    </div>
  );
}

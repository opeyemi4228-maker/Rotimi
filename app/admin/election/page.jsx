import Link from "next/link";
import { ArrowRight, CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";

import { currentSession } from "@/lib/session";
import { agentElections, agentPost, ballot, ownReturn } from "@/lib/results";
import { cn } from "@/lib/utils";
import { Card, Empty, PageTitle, Tag } from "../ui";
import ReturnForm from "./ReturnForm";

export const metadata = { title: "Election returns — MAP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TYPE_LABEL = {
  PRESIDENTIAL: "Presidential",
  GOVERNORSHIP: "Governorship",
  SENATE: "Senate",
  HOUSE_OF_REPS: "House of Reps",
};

/**
 * The election dashboard, for the agent standing at the booth.
 *
 * ── WHY THIS PAGE IS ALMOST EMPTY ──────────────────────────────────────────
 * Every other dashboard in this product is a reading surface — tables, charts,
 * coverage. This one is a doing surface, used once or four times, in the dark,
 * under pressure, by somebody who has a result sheet in one hand and a phone in
 * the other.
 *
 * So there is nothing on it but the booth they are standing in, the elections
 * open, and the form. No navigation into the middle of a task, no statistics
 * they cannot act on, and no second thing to read.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function ElectionPage({ searchParams }) {
  const params = await searchParams;
  const { scope } = await currentSession();
  const post = await agentPost(scope?.memberId);

  if (!post) {
    return (
      <>
        <PageTitle
          title="Election returns"
          lead="Returns are filed by the coordinator appointed to a polling unit."
        />
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                You do not hold a polling unit
              </p>
              <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
                Only a Polling Unit Coordinator can file a return, and only for
                the booth their seat is at — the unit is read from the
                appointment, never chosen on a form. Ward Coordinators appoint
                to these seats.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                {/* A coordinator arriving here wants the returns, not a
                    refusal. The form is not for them; the dashboard is. */}
                <Link
                  href="/admin/results"
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
                >
                  Watch the returns from your territory
                  <ArrowRight size={14} strokeWidth={3} />
                </Link>
                <Link
                  href="/admin/structure"
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
                >
                  See the seats in your territory
                  <ArrowRight size={14} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const elections = await agentElections(post.pollingUnitId);

  if (!elections.length) {
    return (
      <>
        <PageTitle title="Election returns" lead={`${post.name} · ${post.ward} Ward`} />
        <Card>
          <Empty>
            No election is accepting returns at the moment. This page opens by
            itself when polls close.
          </Empty>
        </Card>
      </>
    );
  }

  /* Which contest they are filing. Defaults to the first one still outstanding,
     because an agent who has already filed the presidential is here for the
     governorship. */
  const chosen =
    elections.find((election) => String(election.id) === params?.election) ??
    elections.find((election) => !election.filed) ??
    elections[0];

  const [parties, existing] = await Promise.all([
    ballot(),
    ownReturn(post.pollingUnitId, chosen.id),
  ]);

  const outstanding = elections.filter((election) => !election.filed).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Election returns"
        lead="Your own count, from your own booth. These are the movement's figures — not INEC's — and they are published as such."
      />

      {/* Which contest. Tabs, because on election day an agent files four of
          these in a row and should never lose their place. */}
      <div className="mb-8 flex flex-wrap gap-2">
        {elections.map((election) => (
          <Link
            key={election.id}
            href={`/admin/election?election=${election.id}`}
            scroll={false}
            aria-current={election.id === chosen.id ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 border-2 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.06em] uppercase transition-colors",
              election.id === chosen.id
                ? "border-ink-950 bg-ink-950 text-white"
                : "border-ink-200 text-ink-500 hover:border-ink-950 hover:text-ink-950"
            )}
          >
            {election.filed ? (
              <CircleCheck
                size={14}
                strokeWidth={3}
                className={election.id === chosen.id ? "text-brand-300" : "text-brand-600"}
              />
            ) : (
              <span
                aria-hidden="true"
                className={cn(
                  "size-2",
                  election.id === chosen.id ? "bg-ember-500" : "bg-ink-300"
                )}
              />
            )}
            {TYPE_LABEL[election.type] ?? election.type}
          </Link>
        ))}
      </div>

      {outstanding > 0 && (
        <p className="mb-8 flex items-start gap-3 border-l-4 border-ember-500 bg-ember-50 p-4 text-[0.875rem] leading-relaxed text-ink-950">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-ember-600" aria-hidden="true" />
          <span>
            {outstanding} of {elections.length} contests still to file from this booth. Each one is
            a separate sheet and a separate return.
          </span>
        </p>
      )}

      {existing && (
        <Card className="mb-8 border-2 border-brand-600 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Already filed
              </p>
              <p className="mt-1.5 text-[0.9375rem] text-ink-950">
                <strong className="font-bold">{existing.total.toLocaleString()} votes</strong> filed{" "}
                {new Intl.DateTimeFormat("en-NG", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Africa/Lagos",
                }).format(new Date(existing.at))}
              </p>
            </div>
            <Tag tone={existing.status === "VERIFIED" ? "verified" : existing.status === "DISPUTED" ? "rejected" : "pending"}>
              {existing.status}
            </Tag>
          </div>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-content-muted">
            The figures below are the ones on file. Correcting them amends this
            return — it does not create a second one — and sends it back for
            checking.
          </p>
        </Card>
      )}

      <ReturnForm post={post} election={chosen} parties={parties} existing={existing} />
    </div>
  );
}

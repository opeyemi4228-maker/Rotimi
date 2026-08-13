import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { currentSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { audience, history } from "@/lib/broadcast";
import { smsProvider } from "@/lib/sms";
import { cn } from "@/lib/utils";
import { Cell, Empty, PageTitle, Row, SectionHead, Table, Tag } from "../ui";
import Composer from "./Composer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Broadcast — MAP Secretariat",
  robots: { index: false, follow: false },
};

const LAGOS = "Africa/Lagos";

const when = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: LAGOS,
      }).format(new Date(value))
    : "—";

const TONE = {
  SENT: "verified",
  PARTIAL: "pending",
  FAILED: "rejected",
  SENDING: "pending",
  QUEUED: "vacant",
};

/**
 * Bulk SMS to your own territory.
 *
 * ── WHO CAN SEND ───────────────────────────────────────────────────────────
 * `can(scope, "broadcast")`, which is §6.11's admin capability: a coordinator
 * at any tier from ward upward speaks for their territory. A functional
 * director reads nationwide but speaks for nowhere, and a booth agent has no
 * territory, so neither gets this page.
 *
 * The audience is always exactly the scope — a Ward Coordinator texts their
 * ward, a State Coordinator texts their state. There is no widening control on
 * this page, because there is no widening control in the request either.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default async function BroadcastPage() {
  const { scope } = await currentSession();

  if (!scope || !can(scope, "broadcast")) notFound();

  const [counts, sent] = await Promise.all([
    audience(scope, { verifiedOnly: false }),
    history(scope, { take: 15 }),
  ]);

  const gateway = smsProvider();

  return (
    <div className="space-y-10">
      <PageTitle
        title="Broadcast"
        lead={`One text message to every member registered in ${scope.label}. The numbers are the ones members gave when they registered, and the list is rebuilt from the register every time you open this page.`}
        action={
          <p className="flex items-center gap-2 text-[0.75rem] text-content-subtle">
            <MessageSquare size={14} strokeWidth={2.5} aria-hidden="true" />
            <span className={cn(!gateway.configured && "text-red-700")}>
              {gateway.configured ? gateway.label : "No gateway configured"}
            </span>
          </p>
        }
      />

      <Composer
        initial={counts}
        gateway={{ configured: gateway.configured, label: gateway.label, reason: gateway.reason }}
        territory={scope.label}
      />

      {/* ── what has already gone out ─────────────────────────────────── */}
      <section>
        <SectionHead
          title="Sent from this territory"
          lead="Every broadcast sent by anybody whose seat sits inside your scope, not only your own. A coordinator is answerable for what is texted in the movement's name from beneath them."
        />
        <Table
          head={[
            { label: "Sent" },
            { label: "By" },
            { label: "Territory" },
            { label: "Message" },
            { label: "To", align: "right" },
            { label: "Delivered", align: "right" },
            { label: "Refused", align: "right" },
            { label: "Status" },
          ]}
          empty={
            sent.length === 0 ? (
              <Empty>Nothing has been broadcast from here yet.</Empty>
            ) : null
          }
        >
          {sent.map((row) => (
            <Row key={row.id}>
              <Cell className="whitespace-nowrap text-content-muted">{when(row.createdAt)}</Cell>
              <Cell className="font-bold">{row.sender}</Cell>
              <Cell className="text-content-muted">{row.scopeLabel}</Cell>
              <Cell className="max-w-md">
                <span className="line-clamp-2 text-[0.8125rem] text-ink-950">{row.body}</span>
                <span className="mt-0.5 block text-[0.6875rem] text-content-subtle">
                  {row.segments} {row.segments === 1 ? "part" : "parts"} each
                  {row.provider ? ` · ${row.provider}` : ""}
                  {row.error ? ` · ${row.error}` : ""}
                </span>
              </Cell>
              <Cell align="right">{row.recipients.toLocaleString()}</Cell>
              <Cell align="right" className="font-bold">{row.delivered.toLocaleString()}</Cell>
              <Cell
                align="right"
                className={cn(row.failed > 0 && "font-bold text-red-700")}
              >
                {row.failed.toLocaleString()}
              </Cell>
              <Cell>
                <Tag tone={TONE[row.status] ?? "vacant"}>{row.status}</Tag>
              </Cell>
            </Row>
          ))}
        </Table>
      </section>
    </div>
  );
}

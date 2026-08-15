"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Clock, Swords } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

/**
 * One application, and the decision on it.
 *
 * The refusal field is optional and the approval field is not offered at all:
 * "yes" needs no explanation, "no" usually does, and forcing a reason on a
 * rejection you cannot phrase kindly produces worse reasons rather than fewer
 * rejections. So it is offered and not demanded.
 *
 * Nothing here says the applicant is entitled to the seat. The officer may
 * close every application on the page and appoint somebody who never applied,
 * which is why the wording is "decline" rather than "reject" and why the
 * vacancy stays on the seats table either way.
 */
export default function ApplicationCard({ application }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function decide(approve) {
    setBusy(approve ? "yes" : "no");
    setError("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, approve, note }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "That did not work.");
        return;
      }
      router.refresh();
    } catch {
      setError("The network dropped.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li
      className={cn(
        "border-2 bg-white p-5",
        application.overdue ? "border-red-600" : "border-ink-200"
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={application.applicant.name} src={application.applicant.photoUrl} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.0625rem] font-extrabold tracking-tight text-ink-950">
            {application.applicant.name}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-content-muted">
            <span className="tabular-nums">{application.applicant.membershipNo ?? application.applicant.phone}</span>
            {" · "}
            {application.applicant.ward}
            {application.applicant.verification !== "VERIFIED" && " · not verified"}
          </p>
          <p className="mt-2 text-[0.875rem] font-bold text-ink-950">
            for {application.seat.title}, {application.seat.unit}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {application.isChallenge && (
            <span className="flex items-center gap-1.5 bg-ink-950 px-2 py-1 text-[0.5625rem] font-extrabold tracking-widest text-white uppercase">
              <Swords size={10} strokeWidth={3} />
              Challenge
            </span>
          )}
          <span
            className={cn(
              "flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase",
              application.overdue ? "text-red-700" : "text-content-subtle"
            )}
          >
            <Clock size={11} strokeWidth={3} />
            {application.overdue ? "Past the 72 hours" : "Within the 72 hours"}
          </span>
        </div>
      </div>

      {application.statement && (
        <blockquote className="mt-4 border-l-4 border-ink-200 pl-4 text-[0.875rem] leading-relaxed text-content-muted">
          {application.statement}
        </blockquote>
      )}

      {error && (
        <p className="mt-4 flex gap-2 text-[0.8125rem] text-red-700">
          <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4">
        <button
          type="button"
          onClick={() => decide(true)}
          disabled={Boolean(busy)}
          className="border-2 border-ink-950 bg-brand-600 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase hover:bg-ink-950 disabled:opacity-50"
        >
          {busy === "yes" ? "Appointing" : "Appoint them"}
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          disabled={Boolean(busy)}
          className="border-2 border-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase hover:bg-ink-950 hover:text-white disabled:opacity-50"
        >
          {busy === "no" ? "Closing" : "Decline"}
        </button>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="A word back to them (optional)"
          className="min-w-48 flex-1 border-2 border-ink-200 px-3 py-2 text-[0.8125rem] outline-none focus:border-ink-950"
        />
      </div>
    </li>
  );
}

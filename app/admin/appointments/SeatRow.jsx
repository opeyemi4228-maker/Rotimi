"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, Search, UserMinus, UserPlus } from "lucide-react";

import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const REASONS = [
  ["RESIGNATION", "Resigned"],
  ["INACTIVITY", "Inactive"],
  ["TRANSFER", "Transferred"],
  ["MISCONDUCT", "Misconduct"],
  ["ANTI_PARTY_ACTIVITY", "Anti-party activity"],
  ["RESTRUCTURING", "Restructuring"],
  ["OTHER", "Other"],
];

/**
 * One seat, and the two things the officer above it can do.
 *
 * ── WHY THE CANDIDATE LIST IS FETCHED AND NOT RENDERED ─────────────────────
 * A ward has hundreds of members and a state has thousands. Rendering every
 * eligible member into every row of a seat table would be a megabyte of names
 * for a list most rows never open. It loads when the row is opened, and it
 * searches on the server.
 *
 * ── AND WHY ENDING AN APPOINTMENT ASKS WHY ─────────────────────────────────
 * §8.4: the row is never deleted, only closed, so the history stays
 * reconstructable. A closure with no reason makes the history unreadable
 * exactly when somebody needs to read it — a succession dispute a year later.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function SeatRow({ seat }) {
  const router = useRouter();
  const [open, setOpen] = useState(null); // "appoint" | "release" | null
  const [people, setPeople] = useState(null);
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("RESIGNATION");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadCandidates(search = "") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/appointments?seat=${seat.id}&q=${encodeURIComponent(search)}`
      );
      if (!response.ok) {
        setError("That list could not be loaded.");
        return;
      }
      const data = await response.json();
      setPeople(data.candidates);
    } catch {
      setError("The network dropped.");
    } finally {
      setBusy(false);
    }
  }

  async function post(payload, label) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: seat.id, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `${label} did not work.`);
        return;
      }
      setOpen(null);
      setPeople(null);
      router.refresh();
    } catch {
      setError("The network dropped.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="border-b border-ink-200">
        <td className="px-4 py-3">
          <span className="font-bold text-ink-950">{seat.title}</span>
          <span className="mt-0.5 block text-[0.75rem] text-content-subtle">
            {seat.unit}
            {seat.seatIndex > 1 ? ` · seat ${seat.seatIndex}` : ""}
          </span>
        </td>

        <td className="px-4 py-3">
          {seat.holder ? (
            <span className="flex items-center gap-2.5">
              <Avatar name={seat.holder.name} src={seat.holder.photoUrl} size="xs" />
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-semibold text-ink-950">
                  {seat.holder.name}
                </span>
                <span className="block text-[0.6875rem] tabular-nums text-content-subtle">
                  {seat.holder.membershipNo ?? "—"}
                </span>
              </span>
            </span>
          ) : (
            <span className="text-[0.8125rem] text-ink-400">Vacant</span>
          )}
        </td>

        <td className="px-4 py-3 text-right text-[0.8125rem] tabular-nums text-content-muted">
          {seat.applications > 0 ? (
            <span className="font-bold text-ember-700">{seat.applications} applied</span>
          ) : (
            "—"
          )}
        </td>

        <td className="px-4 py-3 text-right">
          {seat.holder ? (
            <button
              type="button"
              onClick={() => setOpen(open === "release" ? null : "release")}
              className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-red-700"
            >
              <UserMinus size={13} strokeWidth={3} />
              End it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const next = open === "appoint" ? null : "appoint";
                setOpen(next);
                if (next && !people) loadCandidates();
              }}
              className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ink-950"
            >
              <UserPlus size={13} strokeWidth={3} />
              Appoint
            </button>
          )}
        </td>
      </tr>

      {open && (
        <tr className="border-b-2 border-ink-950 bg-ink-50">
          <td colSpan={4} className="px-4 py-5">
            {error && (
              <p className="mb-4 flex gap-2 border-2 border-red-600 bg-red-50 px-4 py-2.5 text-[0.8125rem] text-red-800">
                <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            {open === "appoint" ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                    Members in {seat.unit} with no office
                  </p>
                  <span className="ml-auto flex items-center gap-2">
                    <Search size={14} className="text-ink-400" aria-hidden="true" />
                    <input
                      value={q}
                      onChange={(event) => setQ(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          loadCandidates(q);
                        }
                      }}
                      placeholder="Name or membership number"
                      className="w-56 border-2 border-ink-200 bg-white px-3 py-1.5 text-[0.8125rem] outline-none focus:border-ink-950"
                    />
                  </span>
                </div>

                {busy && !people ? (
                  <p className="mt-4 flex items-center gap-2 text-[0.8125rem] text-content-muted">
                    <Loader2 size={14} className="animate-spin" /> Loading
                  </p>
                ) : people?.length === 0 ? (
                  <p className="mt-4 text-[0.875rem] text-content-subtle">
                    Nobody in {seat.unit} is free to take this. Everyone eligible already
                    holds an office, or nobody is registered there yet.
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-px bg-ink-200 sm:grid-cols-2 xl:grid-cols-3">
                    {(people ?? []).map((person) => (
                      <li key={person.id} className="bg-white">
                        <button
                          type="button"
                          onClick={() => post({ memberId: person.id }, "The appointment")}
                          disabled={busy}
                          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-ink-950 hover:text-white disabled:opacity-50"
                        >
                          <Avatar name={person.name} src={person.photoUrl} size="xs" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.875rem] font-semibold">
                              {person.name}
                            </span>
                            <span className="block truncate text-[0.6875rem] opacity-70">
                              {person.membershipNo ?? person.phone} · {person.ward}
                            </span>
                          </span>
                          {person.verification !== "VERIFIED" && (
                            <span
                              title="Not verified — cannot hold office above the ward"
                              className="shrink-0 bg-ember-100 px-1.5 py-0.5 text-[0.5625rem] font-extrabold tracking-widest text-ember-800 uppercase"
                            >
                              Pending
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="max-w-xl">
                <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                  End {seat.holder?.name}&rsquo;s appointment
                </p>
                <p className="mt-2 text-[0.8125rem] leading-snug text-content-muted">
                  The record is kept, not deleted — it keeps the history of who held this
                  seat readable. Say why.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="border-2 border-ink-200 bg-white px-3 py-2 text-[0.875rem] outline-none focus:border-ink-950"
                  >
                    {REASONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Anything worth recording (optional)"
                    className="min-w-56 flex-1 border-2 border-ink-200 bg-white px-3 py-2 text-[0.875rem] outline-none focus:border-ink-950"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => post({ release: true, reason, note }, "That")}
                    disabled={busy}
                    className={cn(
                      "border-2 border-red-600 bg-red-600 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-white uppercase",
                      busy && "opacity-50"
                    )}
                  >
                    {busy ? "Saving" : "End the appointment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="border-2 border-ink-950 px-4 py-2 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

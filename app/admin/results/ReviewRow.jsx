"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const TONE = {
  SUBMITTED: "bg-ember-100 text-ember-800",
  VERIFIED: "bg-brand-600 text-white",
  DISPUTED: "bg-red-100 text-red-800",
};

/**
 * One return, with the two things a coordinator can do about it.
 *
 * ── WHY THE SHEET LINK SITS BETWEEN THE NUMBERS AND THE BUTTONS ────────────
 * Verifying means "I have looked at the photograph and these numbers match it".
 * If the buttons were reachable without passing the sheet, the status would
 * come to mean "somebody clicked", which is worth nothing. The link is in the
 * row, before the actions, and a return with no sheet says so in place of it —
 * there is nothing to check against, and the button says as much.
 *
 * ── AND WHY DISPUTING TAKES A SENTENCE ─────────────────────────────────────
 * A disputed return is evidence of a disagreement. Without a reason it is an
 * accusation nobody can act on, so the field is required and the server refuses
 * without it. Verifying takes no note, because "it matches" is the whole
 * statement.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function ReviewRow({ row, canReview }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState(row.note ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function send(next) {
    setBusy(next);
    setError("");
    try {
      const response = await fetch(`/api/results/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, note: next === "DISPUTED" ? note : null }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? data.errors?.note ?? "That could not be saved.");
        return;
      }

      setStatus(data.status);
      setOpen(false);
      router.refresh();
    } catch {
      setError("The network dropped. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-block px-2 py-1 text-[0.625rem] font-extrabold tracking-[0.08em] uppercase",
            TONE[status] ?? "bg-ink-100 text-ink-600"
          )}
        >
          {status}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        {!canReview ? (
          <span className="text-[0.75rem] text-content-subtle">—</span>
        ) : row.mine ? (
          /* The one refusal worth explaining in the row rather than only on the
             server: it is not a permission problem, it is the point. */
          <span className="text-[0.75rem] text-content-subtle">Yours to file, not to check</span>
        ) : !row.hasSheet ? (
          <span className="flex items-center justify-end gap-1.5 text-[0.75rem] font-bold text-ember-700 uppercase">
            <TriangleAlert size={13} strokeWidth={3} aria-hidden="true" />
            No sheet to check
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <Link
              href={`/api/results/${row.id}/sheet`}
              target="_blank"
              className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase underline underline-offset-4 hover:text-ember-600"
            >
              Sheet
            </Link>
            {status !== "VERIFIED" && (
              <button
                type="button"
                onClick={() => send("VERIFIED")}
                disabled={Boolean(busy)}
                className="flex items-center gap-1 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ink-950 disabled:opacity-40"
              >
                {busy === "VERIFIED" ? (
                  <Loader2 size={12} strokeWidth={3} className="animate-spin" />
                ) : (
                  <CircleCheck size={13} strokeWidth={3} />
                )}
                Verify
              </button>
            )}
            {status !== "DISPUTED" && (
              <button
                type="button"
                onClick={() => setOpen((was) => !was)}
                className="text-[0.75rem] font-bold tracking-[0.08em] text-red-700 uppercase hover:text-ink-950"
              >
                Dispute
              </button>
            )}
            {status === "DISPUTED" && (
              <button
                type="button"
                onClick={() => send("SUBMITTED")}
                disabled={Boolean(busy)}
                className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950 disabled:opacity-40"
              >
                Re-open
              </button>
            )}
          </div>
        )}

        {open && (
          <div className="mt-3 border-2 border-red-600 bg-red-50 p-3 text-left">
            <label
              htmlFor={`note-${row.id}`}
              className="block text-[0.625rem] font-bold tracking-[0.12em] text-red-800 uppercase"
            >
              What is wrong with it?
            </label>
            <textarea
              id={`note-${row.id}`}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setError("");
              }}
              rows={2}
              maxLength={1000}
              placeholder="The sheet shows 214 for ADC, the return says 241."
              className="mt-2 w-full border-2 border-ink-200 bg-white px-3 py-2 text-[0.8125rem] text-ink-950 outline-none focus:border-ink-950"
            />
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => send("DISPUTED")}
                disabled={!note.trim() || Boolean(busy)}
                className="border-2 border-red-600 bg-red-600 px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.08em] text-white uppercase disabled:opacity-40"
              >
                {busy === "DISPUTED" ? "Saving" : "Dispute this return"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[0.6875rem] font-bold tracking-[0.08em] text-ink-600 uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 flex justify-end gap-1.5 text-left text-[0.75rem] text-red-700">
            <CircleAlert size={13} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </td>
    </>
  );
}

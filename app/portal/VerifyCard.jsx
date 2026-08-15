"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleAlert, Loader2, ShieldAlert } from "lucide-react";

import { clearViewerCache } from "@/lib/useViewer";
import { cn } from "@/lib/utils";

/**
 * Verification, and the one thing that grants it.
 *
 * ── WHY THE NIN IS THE WHOLE OF IT ─────────────────────────────────────────
 * A membership register anybody can add a name to is a mailing list. The NIN is
 * the one identifier an ordinary Nigerian already has that maps to exactly one
 * person, so it is what separates "somebody typed this name in" from "this is a
 * person, and only one row in this register is them". Give it and you are
 * verified; don't and you are pending. There is no queue, no reviewer, and
 * nothing to wait for — which also means there is nobody to blame when a
 * member is still pending three weeks later.
 *
 * ── WHAT THE FORM PROMISES AND WHAT IT DOES NOT ────────────────────────────
 * It says plainly that the number is encrypted and never shown again, because
 * asking a Nigerian for their NIN on a political website is asking for real
 * trust and the only way to earn it is to be specific about what happens to it.
 *
 * It does not claim the number is checked against NIMC. It is not. All the
 * server can tell is that nobody else in this register has claimed it. Saying
 * "verified" without saying that would be the page overstating itself.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function VerifyCard({ verified, hasNin }) {
  const router = useRouter();
  const [nin, setNin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const settled = verified || done;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/member/nin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "That could not be saved. Please try again.");
        return;
      }

      setDone(true);
      setNin("");
      /* The masthead caches the viewer, and it carries the verification badge.
         Leaving it stale would show "Not verified" in the header of a page that
         has just said the opposite. */
      clearViewerCache();
      router.refresh();
    } catch {
      setError("The network dropped. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "border-2 bg-white p-6",
        settled ? "border-ink-200" : "border-ember-500"
      )}
    >
      <div className="flex items-center gap-2.5">
        {settled ? (
          <BadgeCheck size={18} className="text-brand-600" aria-hidden="true" />
        ) : (
          <ShieldAlert size={18} className="text-ember-600" aria-hidden="true" />
        )}
        <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
          Verification
        </p>
      </div>

      <p className="mt-3 font-display text-lg font-extrabold tracking-tight text-ink-950">
        {settled ? "Verified" : "Not yet verified"}
      </p>

      {settled ? (
        <p className="mt-2 text-[0.875rem] leading-relaxed text-content-muted">
          Your National Identification Number is on file, encrypted. You are eligible to
          hold office at any tier.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-content-muted">
            Add your National Identification Number and you are verified straight away.
            Without it you can still hold a ward seat, but office at LGA level and above
            is closed to you.
          </p>

          <form onSubmit={submit} className="mt-5">
            <label
              htmlFor="nin"
              className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
            >
              NIN — 11 digits
            </label>
            <input
              id="nin"
              name="nin"
              value={nin}
              onChange={(event) => {
                setNin(event.target.value.replace(/\D/g, "").slice(0, 11));
                setError("");
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="12345678901"
              aria-describedby="nin-note"
              className="mt-2 w-full border-2 border-ink-200 px-4 py-3 font-mono text-[1.0625rem] tracking-[0.12em] tabular-nums text-ink-950 outline-none focus:border-ink-950"
            />

            {error && (
              <p className="mt-3 flex gap-2 text-[0.8125rem] leading-snug text-red-700">
                <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={nin.length !== 11 || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-200 disabled:text-ink-500"
            >
              {busy && <Loader2 size={14} strokeWidth={3} className="animate-spin" />}
              {busy ? "Saving" : "Verify my membership"}
            </button>

            <p id="nin-note" className="mt-4 text-[0.75rem] leading-relaxed text-content-subtle">
              Encrypted the moment it arrives and never displayed again — not to you, not
              to a coordinator, not in any export. It is used for one thing: making sure
              one person holds one membership. We do not check it against NIMC, so it
              proves the number is unique in this register, not that it is yours.
            </p>
          </form>
        </>
      )}
    </div>
  );
}

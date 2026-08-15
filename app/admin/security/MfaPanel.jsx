"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Copy, Loader2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Enrol in two-factor authentication, or turn it off.
 *
 * ── THE THREE THINGS THIS SCREEN HAS TO GET RIGHT ──────────────────────────
 * 1. The secret is shown as text as well as a QR. A coordinator setting this up
 *    on the phone that will hold the authenticator cannot scan a code with the
 *    same phone, and that is most of them.
 * 2. The recovery codes are shown once, and the screen says so before it shows
 *    them and again after. A member who closes this tab without writing them
 *    down has lost them, and nobody — not the National Coordinator, not the
 *    database — can print them again.
 * 3. Turning it off asks for a code. Somebody who walks up to an unlocked
 *    laptop must not be able to remove the control that would have stopped them
 *    next time.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function MfaPanel({ initial, required }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [stage, setStage] = useState("idle");
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function call(payload) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "That did not work.");
        return null;
      }
      return data;
    } catch {
      setError("The network dropped. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    const data = await call({ action: "begin" });
    if (!data) return;
    setSetup(data);
    setStage("scan");
  }

  async function confirm(event) {
    event.preventDefault();
    const data = await call({ action: "confirm", code });
    if (!data) return;
    setCodes(data.codes);
    setCode("");
    setStage("codes");
    setState({ enabled: true, recoveryLeft: data.codes.length, pending: false });
  }

  async function turnOff(event) {
    event.preventDefault();
    const data = await call({ action: "disable", code });
    if (!data) return;
    setCode("");
    setStage("idle");
    setState({ enabled: false, recoveryLeft: 0, pending: false });
    router.refresh();
  }

  function copyCodes() {
    navigator.clipboard
      ?.writeText(codes.join("\n"))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  /* ── the codes, shown exactly once ─────────────────────────────────── */
  if (stage === "codes" && codes) {
    return (
      <div className="border-2 border-ember-500 bg-white p-6">
        <p className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ink-950">
          <CircleCheck size={19} className="text-brand-600" aria-hidden="true" />
          Two-factor authentication is on
        </p>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
          Write these ten recovery codes down now, on paper, somewhere that is not the
          phone holding your authenticator. Each works once, and they are the only way
          back in if you lose that phone.{" "}
          <strong className="font-bold text-ink-950">
            This is the only time they can be shown.
          </strong>{" "}
          They are stored hashed — nobody can print them again, including us.
        </p>

        <ul className="mt-5 grid gap-px border border-ink-200 bg-ink-200 sm:grid-cols-2">
          {codes.map((entry) => (
            <li
              key={entry}
              className="bg-white px-4 py-2.5 font-mono text-[0.9375rem] tracking-[0.1em] tabular-nums text-ink-950"
            >
              {entry}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={copyCodes}
            className="flex items-center gap-2 border-2 border-ink-950 px-4 py-2.5 text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase hover:bg-ink-950 hover:text-white"
          >
            {copied ? <CircleCheck size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
            {copied ? "Copied" : "Copy all ten"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodes(null);
              setStage("idle");
              router.refresh();
            }}
            className="text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
          >
            I have written them down
          </button>
        </div>
      </div>
    );
  }

  /* ── enrolment ─────────────────────────────────────────────────────── */
  if (stage === "scan" && setup) {
    return (
      <div className="border-2 border-ink-950 bg-white p-6">
        <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          Scan this with your authenticator
        </p>
        <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-content-muted">
          Google Authenticator, Authy, 1Password — any of them. If you are reading this on
          the same phone that holds the app, type the key in by hand instead.
        </p>

        <div className="mt-5 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          <Image
            src={setup.qr}
            alt="QR code for your authenticator app"
            width={200}
            height={200}
            unoptimized
            className="border-2 border-ink-200"
          />

          <div className="min-w-0">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Or type this key
            </p>
            <p className="mt-2 font-mono text-[0.9375rem] leading-relaxed break-all text-ink-950">
              {setup.secret}
            </p>

            <form onSubmit={confirm} className="mt-6">
              <label
                htmlFor="mfa-code"
                className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
              >
                Now enter the six digits it shows
              </label>
              <input
                id="mfa-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="mt-2 w-full max-w-xs border-2 border-ink-200 px-4 py-3 font-mono text-[1.0625rem] tracking-[0.3em] tabular-nums outline-none focus:border-ink-950"
              />
              {error && <Problem>{error}</Problem>}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={code.length !== 6 || busy}
                  className="flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase disabled:border-ink-300 disabled:bg-ink-200 disabled:text-ink-500"
                >
                  {busy && <Loader2 size={14} strokeWidth={3} className="animate-spin" />}
                  Turn it on
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStage("idle");
                    setSetup(null);
                    setCode("");
                  }}
                  className="border-2 border-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── on ────────────────────────────────────────────────────────────── */
  if (state.enabled) {
    return (
      <div className="border-2 border-brand-600 bg-white p-6">
        <p className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ink-950">
          <ShieldCheck size={19} className="text-brand-600" aria-hidden="true" />
          Two-factor authentication is on
        </p>
        <p className="mt-2 max-w-prose text-[0.875rem] leading-relaxed text-content-muted">
          Signing in asks for a code from your authenticator as well as your password.
          {state.recoveryLeft > 0
            ? ` You have ${state.recoveryLeft} recovery ${state.recoveryLeft === 1 ? "code" : "codes"} left.`
            : " You have no recovery codes left — turn this off and on again to get a new set before you lose your phone."}
        </p>

        {stage === "off" ? (
          <form onSubmit={turnOff} className="mt-5 border-t border-ink-200 pt-5">
            <label
              htmlFor="off-code"
              className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
            >
              Enter a current code to turn it off
            </label>
            <input
              id="off-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 11));
                setError("");
              }}
              autoComplete="one-time-code"
              className="mt-2 w-full max-w-xs border-2 border-ink-200 px-4 py-3 font-mono text-[1.0625rem] tracking-[0.2em] outline-none focus:border-ink-950"
            />
            {error && <Problem>{error}</Problem>}
            {required && (
              <p className="mt-3 flex gap-2 text-[0.8125rem] leading-snug text-ember-700">
                <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                Your office requires two-factor authentication. Turning it off will close
                the secretariat to you until you set it up again.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!code || busy}
                className="border-2 border-red-600 bg-red-600 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase disabled:opacity-50"
              >
                Turn it off
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("idle");
                  setCode("");
                  setError("");
                }}
                className="border-2 border-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-ink-950 uppercase"
              >
                Keep it on
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setStage("off")}
            className="mt-5 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-red-700"
          >
            Turn it off
          </button>
        )}
      </div>
    );
  }

  /* ── off ───────────────────────────────────────────────────────────── */
  return (
    <div className={cn("border-2 bg-white p-6", required ? "border-ember-500" : "border-ink-200")}>
      <p className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ink-950">
        <CircleAlert size={19} className={required ? "text-ember-600" : "text-ink-400"} aria-hidden="true" />
        Two-factor authentication is off
      </p>
      <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-content-muted">
        {required
          ? "Your office requires it. A stolen password for a seat at this level is not an account takeover, it is a territory takeover — the whole register with every phone number in it, and the ability to text all of them. Until this is on, the secretariat stays closed to you."
          : "Not required for your office, but worth having. It takes two minutes and means a stolen password alone is not enough to sign in as you."}
      </p>
      {error && <Problem>{error}</Problem>}
      <button
        type="button"
        onClick={begin}
        disabled={busy}
        className="mt-5 flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {busy && <Loader2 size={14} strokeWidth={3} className="animate-spin" />}
        Set it up
      </button>
    </div>
  );
}

function Problem({ children }) {
  return (
    <p className="mt-3 flex gap-2 text-[0.8125rem] leading-snug text-red-700">
      <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

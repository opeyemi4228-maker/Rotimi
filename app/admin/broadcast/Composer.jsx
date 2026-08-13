"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  Loader2,
  Send,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* Mirrors lib/sms.js. The server recomputes this before it charges anybody, so
   the copy here is only ever telling the sender what to expect — but it has to
   agree with the server, or the count under the box is a lie. */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";
const GSM_SET = new Set([...GSM_BASIC, ...GSM_EXTENDED]);

function segments(text) {
  let units = 0;
  for (const character of text) {
    if (!GSM_SET.has(character)) {
      const length = text.length;
      return {
        encoding: "UCS-2",
        units: length,
        segments: length === 0 ? 0 : length <= 70 ? 1 : Math.ceil(length / 67),
        limit: length > 70 ? 67 : 70,
      };
    }
    units += GSM_EXTENDED.includes(character) ? 2 : 1;
  }
  return {
    encoding: "GSM-7",
    units,
    segments: units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153),
    limit: units > 160 ? 153 : 160,
  };
}

const TERMINAL = new Set(["SENT", "PARTIAL", "FAILED"]);

/**
 * Write a message, see exactly who it goes to and what it costs, send it once.
 *
 * ── THE THREE THINGS THIS SCREEN HAS TO GET RIGHT ──────────────────────────
 * 1. The recipient count is never a guess. It comes from the server, it
 *    refreshes when the filter changes, and it is sent back with the message so
 *    the server can refuse if it moved while the coordinator was typing.
 * 2. The cost is visible before the button, not after. Segments × recipients is
 *    the invoice, and a single smart quote pasted from WhatsApp doubles it —
 *    so the encoding is named on screen the moment it changes.
 * 3. Send is not undoable. It takes a deliberate second action, and the button
 *    disables itself the instant it is pressed, because a double-click here
 *    costs the movement a second broadcast.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function Composer({ initial, gateway, territory }) {
  const [body, setBody] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [counts, setCounts] = useState(initial);
  const [counting, setCounting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState(null);

  const cost = segments(body);
  const recipients = counts?.total ?? 0;
  const credits = cost.segments * recipients;

  /* The count follows the filter. Fetched rather than derived from the two
     numbers already on the page, because between the page load and this click
     somebody may have registered. */
  useEffect(() => {
    let cancelled = false;

    /* The state changes live inside this function rather than in the effect
       body: setting state synchronously as an effect runs makes React render
       twice for one filter click, and the lint rule that catches it is right. */
    async function refresh() {
      setCounting(true);
      try {
        const response = await fetch(`/api/admin/broadcast?verifiedOnly=${verifiedOnly}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data) setCounts(data);
        }
      } catch {
        /* Keep the count that is already on screen. It came from the server on
           the last load and is a better answer than a dash. */
      } finally {
        if (!cancelled) setCounting(false);
      }
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, [verifiedOnly]);

  async function send() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, verifiedOnly, confirmedRecipients: recipients }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? data.errors?.body ?? "The broadcast could not be sent.");
        if (data.recipients) setCounts((was) => ({ ...was, total: data.recipients }));
        setConfirming(false);
        return;
      }

      setRun({ ...data, delivered: 0, failed: 0 });
      setConfirming(false);
      setBody("");
    } catch {
      setError("The network dropped. The broadcast may or may not have started — check the log below.");
    } finally {
      setSending(false);
    }
  }

  const blocked = !gateway.configured || recipients === 0 || cost.segments === 0;

  return (
    <div className="space-y-6">
      {!gateway.configured && (
        <Notice tone="alert" icon={CircleAlert} title="No SMS gateway is configured">
          {gateway.reason} Until that is set, nothing on this page can send a message —
          the count and the recipient list below are still live and correct.
        </Notice>
      )}

      {run && <RunStatus key={run.id} run={run} onDone={setRun} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ── the message ─────────────────────────────────────────────── */}
        <div className="border-2 border-ink-950 bg-white">
          <div className="border-b border-ink-200 px-5 py-3">
            <p className="text-[0.6875rem] font-bold tracking-widest text-ink-500 uppercase">
              Message
            </p>
          </div>

          <div className="p-5">
            <label htmlFor="broadcast-body" className="sr-only">
              The text message
            </label>
            <textarea
              id="broadcast-body"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setConfirming(false);
              }}
              rows={7}
              maxLength={1600}
              placeholder="MAP: Ward congress this Saturday, 10am, at the LGA secretariat. Bring your membership number. — Reply STOP to opt out."
              className="w-full resize-y border-2 border-ink-200 px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-950 outline-none focus:border-ink-950"
            />

            {/* The bill, in plain sight and above the button. */}
            <dl className="mt-4 grid grid-cols-2 gap-px border border-ink-200 bg-ink-200 sm:grid-cols-4">
              <Meter label="Characters" value={`${cost.units}${cost.units ? ` / ${cost.limit}` : ""}`} />
              <Meter label="Parts each" value={cost.segments} />
              <Meter
                label="Encoding"
                value={cost.encoding}
                tone={cost.encoding === "UCS-2" ? "warn" : undefined}
              />
              <Meter label="SMS credits" value={credits.toLocaleString()} strong />
            </dl>

            {cost.encoding === "UCS-2" && (
              <p className="mt-3 flex gap-2 text-[0.8125rem] leading-snug text-ember-700">
                <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                A character outside the GSM alphabet — usually a curly quote or a dash
                pasted from Word — has pushed this into Unicode, which more than halves
                what fits in one part. Retyping the punctuation will roughly halve the cost.
              </p>
            )}

            {error && (
              <p className="mt-4 flex gap-2 border-2 border-red-600 bg-red-50 px-4 py-3 text-[0.875rem] text-red-800">
                <CircleAlert size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            {/* ── send ────────────────────────────────────────────────── */}
            <div className="mt-6 border-t-2 border-ink-950 pt-5">
              {confirming ? (
                <div className="border-2 border-ember-500 bg-ember-50 p-5">
                  <p className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                    Send to {recipients.toLocaleString()}{" "}
                    {recipients === 1 ? "person" : "people"} in {territory}?
                  </p>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-content-muted">
                    This costs {credits.toLocaleString()} SMS credits and cannot be
                    recalled. Every phone rings at once.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={send}
                      disabled={sending}
                      className="flex items-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 size={15} strokeWidth={3} className="animate-spin" />
                      ) : (
                        <Send size={15} strokeWidth={3} />
                      )}
                      {sending ? "Sending" : "Yes, send it now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={sending}
                      className="border-2 border-ink-950 px-5 py-3 text-[0.8125rem] font-bold tracking-[0.08em] text-ink-950 uppercase disabled:opacity-50"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={blocked}
                    className="flex items-center gap-2 border-2 border-ink-950 bg-brand-600 px-6 py-3.5 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-ink-950 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-200 disabled:text-ink-500"
                  >
                    <Send size={15} strokeWidth={3} />
                    Send to {recipients.toLocaleString()}
                  </button>
                  <p className="text-[0.8125rem] text-content-subtle">
                    {cost.segments === 0
                      ? "Write the message first."
                      : recipients === 0
                        ? "Nobody in your territory to send to."
                        : "You will be asked to confirm."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── the audience ────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="border-2 border-ink-950 bg-white">
            <div className="border-b border-ink-200 px-5 py-3">
              <p className="text-[0.6875rem] font-bold tracking-widest text-ink-500 uppercase">
                Audience
              </p>
            </div>

            <div className="p-5">
              <p className="flex items-baseline gap-3">
                <Users size={22} strokeWidth={2.25} className="text-brand-700" aria-hidden="true" />
                <span
                  className={cn(
                    "font-display text-4xl font-extrabold tracking-tight tabular-nums text-ink-950",
                    counting && "opacity-40"
                  )}
                >
                  {recipients.toLocaleString()}
                </span>
                <span className="text-[0.875rem] text-content-muted">
                  phone {recipients === 1 ? "number" : "numbers"}
                </span>
              </p>
              <p className="mt-2 text-[0.8125rem] leading-snug text-content-muted">
                Every member registered in {territory}. The list is built on the server
                from your seat — it is not something this page can widen.
              </p>

              <fieldset className="mt-5 border-t border-ink-200 pt-4">
                <legend className="sr-only">Who to include</legend>
                <Radio
                  name="audience"
                  checked={!verifiedOnly}
                  onChange={() => setVerifiedOnly(false)}
                  label="Everybody"
                  note={`${(counts?.everyone ?? 0).toLocaleString()} members`}
                />
                <Radio
                  name="audience"
                  checked={verifiedOnly}
                  onChange={() => setVerifiedOnly(true)}
                  label="Verified members only"
                  note={`${(counts?.verified ?? 0).toLocaleString()} members · leaves out ${(counts?.pending ?? 0).toLocaleString()} pending`}
                />
              </fieldset>

              <p className="mt-4 border-t border-ink-200 pt-4 text-[0.75rem] leading-snug text-content-subtle">
                Members whose registration was rejected are never included, whichever
                option is chosen.
              </p>
            </div>
          </div>

          <RecipientList verifiedOnly={verifiedOnly} total={recipients} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── the list below */

/**
 * "Click below to see all the phone numbers."
 *
 * Closed by default and fetched only when opened: a coordinator's screen at a
 * ward meeting should not have four hundred members' phone numbers on it by
 * accident, and most of the time nobody needs the list at all — they need the
 * count, which is already above.
 */
function RecipientList({ verifiedOnly, total }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const load = useCallback(
    async (which) => {
      setBusy(true);
      try {
        const response = await fetch(
          `/api/admin/broadcast/recipients?verifiedOnly=${verifiedOnly}&page=${which}`
        );
        if (response.ok) setData(await response.json());
      } catch {
        /* The disclosure simply stays empty; the count above is the number that
           matters and it came from the server already. */
      } finally {
        setBusy(false);
      }
    },
    [verifiedOnly]
  );

  useEffect(() => {
    if (!open) return;

    async function first() {
      setPage(1);
      await load(1);
    }

    first();
  }, [open, verifiedOnly, load]);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copyAll() {
    if (!data?.rows?.length) return;
    try {
      await navigator.clipboard.writeText(data.rows.map((row) => row.phone).join("\n"));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border-2 border-ink-950 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50"
      >
        <span>
          <span className="block font-bold text-ink-950">
            {open ? "Hide the phone numbers" : "See all the phone numbers"}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-content-muted">
            {total.toLocaleString()} {total === 1 ? "number" : "numbers"} in this audience
          </span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 font-display text-xl font-extrabold text-ink-950"
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="border-t-2 border-ink-950">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 px-5 py-3">
            <button
              type="button"
              onClick={copyAll}
              disabled={!data?.rows?.length}
              className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600 disabled:opacity-40"
            >
              {copied ? <CircleCheck size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={3} />}
              {copied ? "Copied" : "Copy this page"}
            </button>
            <a
              href={`/api/admin/broadcast/recipients?verifiedOnly=${verifiedOnly}&format=csv`}
              className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600"
            >
              <Download size={13} strokeWidth={3} />
              Download all as CSV
            </a>
            {busy && <Loader2 size={14} className="ml-auto animate-spin text-ink-400" />}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b-2 border-ink-950">
                  <th scope="col" className="px-5 py-2.5 text-[0.625rem] font-bold tracking-widest text-ink-500 uppercase">
                    Member
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-[0.625rem] font-bold tracking-widest text-ink-500 uppercase">
                    Phone
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-[0.625rem] font-bold tracking-widest text-ink-500 uppercase">
                    Ward
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-ink-200 last:border-0">
                    <td className="px-5 py-2 text-[0.8125rem] text-ink-950">{row.name}</td>
                    <td className="px-5 py-2 font-mono text-[0.8125rem] tabular-nums text-ink-950">
                      {row.phone}
                    </td>
                    <td className="px-5 py-2 text-[0.8125rem] text-content-muted">{row.ward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!busy && data && data.rows.length === 0 && (
              <p className="px-5 py-10 text-center text-[0.875rem] text-content-subtle">
                Nobody is registered in your territory yet.
              </p>
            )}
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t-2 border-ink-950 px-5 py-3">
              <button
                type="button"
                disabled={page <= 1 || busy}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  load(next);
                }}
                className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-[0.75rem] tabular-nums text-content-muted">
                {((page - 1) * data.perPage + 1).toLocaleString()}–
                {Math.min(page * data.perPage, data.total).toLocaleString()} of{" "}
                {data.total.toLocaleString()}
              </span>
              <button
                type="button"
                disabled={page >= data.pages || busy}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  load(next);
                }}
                className="text-[0.75rem] font-bold tracking-[0.08em] text-ink-950 uppercase disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the send bar */

/** A send in flight, polled until it stops moving. */
function RunStatus({ run, onDone }) {
  /* What the server has said since, laid over what the POST returned. The prop
     is never copied into state — a component that mirrors its own props has two
     sources of truth and eventually shows the older one. The parent gives this
     a key of the broadcast id, so a second send mounts a fresh component rather
     than inheriting the first one's progress. */
  const [live, setLive] = useState(null);
  const state = live ? { ...run, ...live } : run;

  useEffect(() => {
    if (TERMINAL.has(run.status)) return undefined;

    let cancelled = false;
    let handle = null;

    const tick = async () => {
      try {
        const response = await fetch(`/api/admin/broadcast/${run.id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setLive(data);
        if (TERMINAL.has(data.status) && handle) clearInterval(handle);
      } catch {
        /* Keep polling; a dropped poll is not a failed send. */
      }
    };

    handle = setInterval(tick, 2000);
    tick();

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [run.id, run.status]);

  const done = TERMINAL.has(state.status);
  const share = state.recipients ? Math.round((state.delivered / state.recipients) * 100) : 0;

  const tone =
    state.status === "FAILED" ? "alert" : state.status === "PARTIAL" ? "warn" : "good";

  return (
    <Notice
      tone={done ? tone : "info"}
      icon={done ? (tone === "good" ? CircleCheck : CircleAlert) : Loader2}
      spin={!done}
      title={
        done
          ? state.status === "SENT"
            ? `Sent to ${state.delivered.toLocaleString()} numbers`
            : state.status === "PARTIAL"
              ? `Sent to ${state.delivered.toLocaleString()}, ${state.failed.toLocaleString()} refused`
              : "The broadcast failed"
          : `Sending — ${state.delivered.toLocaleString()} of ${state.recipients.toLocaleString()}`
      }
      onDismiss={done ? () => onDone(null) : undefined}
    >
      {!done && (
        <span className="mt-2 block h-1.5 w-full bg-ink-200">
          <span
            className="block h-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${Math.max(share, 2)}%` }}
          />
        </span>
      )}
      {state.error && <span className="block">{state.error}</span>}
      {state.provider === "console" && (
        <span className="block">
          The gateway is set to <code>console</code>, so nothing actually left the
          server — every message was written to the log instead.
        </span>
      )}
    </Notice>
  );
}

/* ────────────────────────────────────────────────────────────────── fittings */

function Meter({ label, value, strong, tone }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[0.625rem] font-bold tracking-widest text-ink-500 uppercase">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display font-extrabold tabular-nums",
          strong ? "text-xl text-ink-950" : "text-base text-ink-950",
          tone === "warn" && "text-ember-700"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Radio({ name, checked, onChange, label, note }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-bold text-ink-950">{label}</span>
        <span className="block text-[0.75rem] text-content-muted">{note}</span>
      </span>
    </label>
  );
}

function Notice({ tone = "info", icon: Icon, spin, title, children, onDismiss }) {
  const border = {
    alert: "border-red-600 bg-red-50",
    warn: "border-ember-500 bg-ember-50",
    good: "border-brand-600 bg-brand-50",
    info: "border-ink-950 bg-white",
  }[tone];

  return (
    <div className={cn("flex items-start gap-4 border-2 p-5", border)}>
      {Icon && (
        <Icon
          size={19}
          strokeWidth={2.5}
          aria-hidden="true"
          className={cn("mt-0.5 shrink-0", spin && "animate-spin")}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-[1.0625rem] font-extrabold tracking-tight text-ink-950">
          {title}
        </p>
        <div className="mt-1 space-y-1 text-[0.875rem] leading-relaxed text-content-muted">
          {children}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[0.75rem] font-bold tracking-[0.08em] text-ink-500 uppercase hover:text-ink-950"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

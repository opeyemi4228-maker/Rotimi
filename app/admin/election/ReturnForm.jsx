"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, CircleCheck, Loader2, MapPin, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The form an agent fills in at the booth.
 *
 * ── DESIGNED FOR THE CONDITIONS IT WILL ACTUALLY BE USED IN ────────────────
 * Standing up, one-handed, on a phone, at night, on a connection that may not
 * hold. So: numeric keypads on every field, a running total that updates as
 * the figures are typed, arithmetic checked before anything is sent, and the
 * photograph downscaled in the browser so the upload is a few hundred kilobytes
 * rather than eight megabytes.
 *
 * The location is not a field. It is printed at the top from the agent's own
 * appointment and can only be confirmed, never chosen — the one thing that
 * cannot be allowed to vary is which booth a return is attributed to.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function ReturnForm({ post, election, parties, existing }) {
  const router = useRouter();
  const sheetRef = useRef(null);

  const [votes, setVotes] = useState(() =>
    Object.fromEntries(parties.map((party) => [party.id, existing?.votes?.[party.id] ?? ""]))
  );
  const [figures, setFigures] = useState({
    registered: existing?.registered ?? "",
    accredited: existing?.accredited ?? "",
    rejected: existing?.rejected ?? "",
    inecAccredited: existing?.inecAccredited ?? "",
    inecTotalVotes: existing?.inecTotalVotes ?? "",
  });
  const [note, setNote] = useState(existing?.note ?? "");
  const [location, setLocation] = useState(false);
  const [terms, setTerms] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const digits = (value) => String(value).replace(/[^\d]/g, "");
  const asNumber = (value) => (value === "" ? null : Number(value));

  const cast = useMemo(
    () => Object.values(votes).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [votes]
  );

  /* The same arithmetic the server runs, run here first so the agent finds out
     while the sheet is still in their hand rather than after a round trip. */
  const accredited = asNumber(figures.accredited);
  const registered = asNumber(figures.registered);
  const rejected = Number(figures.rejected) || 0;
  const overAccredited = accredited != null && cast + rejected > accredited;
  const overRegistered = registered != null && accredited != null && accredited > registered;

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setNotice("");

    const body = new FormData();
    body.append("electionId", String(election.id));
    body.append("locationConfirmed", String(location));
    body.append("termsAccepted", String(terms));
    for (const [partyId, value] of Object.entries(votes)) {
      body.append(`party_${partyId}`, digits(value || "0"));
    }
    for (const [name, value] of Object.entries(figures)) body.append(name, digits(value));
    body.append("note", note);
    if (sheet?.file) body.append("sheet", sheet.file, "sheet.jpg");

    setBusy(true);
    try {
      const response = await fetch("/api/results", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setNotice(data.error ?? "Check the highlighted figures.");
        return;
      }
      setDone(data);
      router.refresh();
    } catch {
      setNotice("Could not reach the server. Your figures are still on screen — try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ filed */
  if (done) {
    return (
      <div className="border-2 border-brand-600 bg-white p-8 text-center">
        <CircleCheck size={32} className="mx-auto text-brand-600" aria-hidden="true" />
        <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink-950">
          Return filed
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-content-muted">
          {done.total.toLocaleString()} votes from {post.name} for {election.name}. It is in the
          register and counting towards the live result now.
        </p>
        <p className="mx-auto mt-4 max-w-md text-[0.8125rem] leading-relaxed text-content-subtle">
          If you spot an error, file again from this page — it amends this
          return rather than adding a second one.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      {/* ── Where you are ─────────────────────────────────────────────────
          Printed, not chosen. This is the agent's own appointment. */}
      <section className="border-2 border-ink-950 bg-white">
        <div className="flex items-start gap-3 border-b-2 border-ink-950 p-5">
          <MapPin size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              You are filing for
            </p>
            <p className="mt-1.5 font-display text-lg leading-tight font-extrabold tracking-tight text-ink-950">
              {post.name}
            </p>
            <p className="mt-1 text-[0.875rem] text-content-muted">
              {post.ward} Ward · {post.lga} · {post.state}
            </p>
            <p className="mt-1 text-[0.75rem] font-bold text-ink-400 tabular-nums">{post.code}</p>
          </div>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 p-5 transition-colors",
            errors.locationConfirmed && !location ? "bg-red-50" : "hover:bg-ink-50"
          )}
        >
          <input
            type="checkbox"
            checked={location}
            onChange={(event) => setLocation(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand-600"
          />
          <span className="text-[0.875rem] leading-relaxed text-ink-950">
            <strong className="font-bold">I am at this polling unit</strong> and these figures are
            copied from the result sheet posted here.
          </span>
        </label>
        {errors.locationConfirmed && (
          <p role="alert" className="px-5 pb-4 text-[0.8125rem] font-semibold text-red-700">
            {errors.locationConfirmed}
          </p>
        )}
      </section>

      {/* ── The votes ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          Votes per party
        </h2>
        <p className="mt-1 text-[0.8125rem] text-content-muted">
          Straight off the sheet. Leave a party blank if it scored nothing.
        </p>

        <div className="mt-5 border-2 border-ink-950 bg-white">
          {parties.map((party, index) => (
            <label
              key={party.id}
              className={cn(
                "flex items-center gap-4 p-4",
                index > 0 && "border-t border-ink-200"
              )}
            >
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0"
                style={{ background: party.colour }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[0.9375rem] font-extrabold text-ink-950">
                  {party.code}
                </span>
                <span className="block truncate text-[0.75rem] text-content-subtle">
                  {party.name}
                </span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={votes[party.id]}
                onChange={(event) =>
                  setVotes((previous) => ({ ...previous, [party.id]: digits(event.target.value) }))
                }
                placeholder="0"
                aria-label={`Votes for ${party.name}`}
                className="h-12 w-28 shrink-0 border-2 border-ink-200 bg-white px-3 text-right font-display text-lg font-extrabold text-ink-950 tabular-nums focus:border-brand-600 focus:outline-none"
              />
            </label>
          ))}

          <div className="flex items-center justify-between border-t-2 border-ink-950 bg-ink-50 p-4">
            <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
              Total votes cast
            </span>
            <span className="font-display text-xl font-extrabold text-ink-950 tabular-nums">
              {cast.toLocaleString()}
            </span>
          </div>
        </div>
        {errors.votes && (
          <p role="alert" className="mt-2 text-[0.8125rem] font-semibold text-red-700">
            {errors.votes}
          </p>
        )}
      </section>

      {/* ── The arithmetic around them ───────────────────────────────── */}
      <section>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          Accreditation
        </h2>
        <p className="mt-1 text-[0.8125rem] text-content-muted">
          The figures that have to balance against the votes above.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Figure
            label="Registered voters"
            value={figures.registered}
            onChange={(value) => setFigures((f) => ({ ...f, registered: value }))}
            error={errors.registered}
          />
          <Figure
            label="Accredited"
            value={figures.accredited}
            onChange={(value) => setFigures((f) => ({ ...f, accredited: value }))}
            error={errors.accredited ?? (overRegistered ? "More than registered." : null)}
          />
          <Figure
            label="Rejected ballots"
            value={figures.rejected}
            onChange={(value) => setFigures((f) => ({ ...f, rejected: value }))}
          />
        </div>

        {overAccredited && (
          <p className="mt-4 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900">
            <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {(cast + rejected).toLocaleString()} ballots accounted for, but only{" "}
              {accredited.toLocaleString()} people were accredited. Check the sheet before filing —
              this is nearly always a mistyped figure.
            </span>
          </p>
        )}
      </section>

      {/* ── The photograph ───────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          Photograph of the result sheet
        </h2>
        <p className="mt-1 text-[0.8125rem] text-content-muted">
          The EC8A posted at the unit. This is the evidence behind your figures — without it they
          are only a claim.
        </p>

        <SheetPicker sheet={sheet} onPick={setSheet} inputRef={sheetRef} error={errors.sheet} />
      </section>

      {/* ── What INEC declared, if it is up ──────────────────────────── */}
      <section>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          What INEC declared
          <span className="ml-2 text-[0.75rem] font-semibold tracking-normal text-ink-400 normal-case">
            optional
          </span>
        </h2>
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-content-muted">
          Only if the presiding officer has announced or posted it. Kept separately from your own
          count — the movement wants to be able to see where the two differ, which is impossible if
          they are recorded as one number.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Figure
            label="INEC accredited"
            value={figures.inecAccredited}
            onChange={(value) => setFigures((f) => ({ ...f, inecAccredited: value }))}
          />
          <Figure
            label="INEC total votes"
            value={figures.inecTotalVotes}
            onChange={(value) => setFigures((f) => ({ ...f, inecTotalVotes: value }))}
          />
        </div>
      </section>

      {/* ── Anything else ────────────────────────────────────────────── */}
      <section>
        <label
          htmlFor="note"
          className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
        >
          Note
          <span className="ml-1.5 font-sans tracking-normal text-ink-400 normal-case">
            (optional)
          </span>
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything a coordinator should know — a delay, a dispute, a sheet that was hard to read."
          className="mt-2.5 w-full border-2 border-ink-200 bg-white p-4 text-[0.9375rem] text-ink-950 focus:border-brand-600 focus:outline-none"
        />
      </section>

      {/* ── The declaration ──────────────────────────────────────────── */}
      <section
        className={cn(
          "border-2 p-5",
          errors.termsAccepted && !terms ? "border-red-600 bg-red-50" : "border-ink-950 bg-white"
        )}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand-600"
          />
          <span className="text-[0.875rem] leading-relaxed text-ink-950">
            I declare that these figures are a true copy of the result sheet at this polling unit,
            that I witnessed the count, and that I understand a false return is a serious matter
            for the movement and for me. This return is recorded against my name and membership
            number.
          </span>
        </label>
        {errors.termsAccepted && (
          <p role="alert" className="mt-3 text-[0.8125rem] font-semibold text-red-700">
            {errors.termsAccepted}
          </p>
        )}
      </section>

      {notice && (
        <p
          role="alert"
          className="flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900"
        >
          <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !location || !terms}
        className="flex w-full items-center justify-center gap-2.5 border-2 border-ink-950 bg-ink-950 px-6 py-4 font-display text-[0.875rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:border-ember-600 hover:bg-ember-600 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-300"
      >
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Filing
          </>
        ) : existing ? (
          "Amend this return"
        ) : (
          "File this return"
        )}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ parts */

function Figure({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
        placeholder="0"
        className={cn(
          "mt-2 h-13 w-full border-2 bg-white px-4 text-right font-display text-lg font-extrabold text-ink-950 tabular-nums focus:outline-none",
          error ? "border-red-600" : "border-ink-200 focus:border-brand-600"
        )}
      />
      {error && <p className="mt-1.5 text-[0.8125rem] font-semibold text-red-700">{error}</p>}
    </div>
  );
}

/**
 * The sheet picker.
 *
 * `capture="environment"` is set here, unlike the profile photograph: an agent
 * is photographing a sheet on a wall in front of them, and opening the camera
 * is right nine times out of ten. The gallery is still reachable from the
 * camera app if they took it a minute ago.
 */
function SheetPicker({ sheet, onPick, inputRef, error }) {
  async function choose(file) {
    if (!file) return;
    const prepared = await downscale(file);
    onPick({ file: prepared, url: URL.createObjectURL(prepared), size: prepared.size });
  }

  return (
    <>
      <label
        className={cn(
          "mt-5 flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-8 text-center transition-colors",
          error ? "border-red-600 bg-red-50" : "border-ink-300 bg-white hover:border-ink-950 hover:bg-ink-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => choose(event.target.files?.[0])}
          className="sr-only"
        />
        {sheet ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element --
                An object URL for a file the user picked a moment ago. There is
                no remote image here for the optimiser to fetch. */}
            <img src={sheet.url} alt="" className="max-h-64 w-auto border border-ink-200" />
            <span className="text-[0.8125rem] font-bold text-brand-700">
              Photograph attached — {(sheet.size / 1024).toFixed(0)}KB. Tap to replace.
            </span>
          </>
        ) : (
          <>
            <Camera size={26} className="text-ink-400" aria-hidden="true" />
            <span className="font-display text-[0.9375rem] font-bold tracking-tight text-ink-950">
              Photograph the result sheet
            </span>
            <span className="max-w-xs text-[0.75rem] leading-snug text-content-subtle">
              Get the whole sheet in frame and the figures readable. It is shrunk before it is sent,
              so this works on a slow connection.
            </span>
          </>
        )}
      </label>
      {error && <p className="mt-2 text-[0.8125rem] font-semibold text-red-700">{error}</p>}
    </>
  );
}

/**
 * Shrink before uploading.
 *
 * A phone photograph of a sheet is 4-8MB, and an agent on a ward-office
 * connection at 10pm cannot push that. 1600px on the long edge keeps every
 * figure on an EC8A readable and lands at a few hundred kilobytes.
 *
 * The server re-encodes whatever arrives regardless — this is a courtesy to
 * the connection, not a check.
 */
async function downscale(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 800_000) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // A failed optimisation must never become a failed upload.
    return file;
  }
}

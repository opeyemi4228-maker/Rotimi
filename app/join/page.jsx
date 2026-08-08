"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { states } from "@/lib/geography";
import { useGeography } from "@/lib/useGeography";

/* Three steps, not one long column. Each is short enough to finish on a phone
   without scrolling twice, which is the difference between a registration and
   an abandoned one. */
const steps = [
  { id: 1, label: "You", fields: ["name", "phone", "email", "referralCode"] },
  { id: 2, label: "Where you vote", fields: ["state", "lga", "ward", "pollingUnit"] },
  { id: 3, label: "Security", fields: ["nin", "password", "confirm"] },
];

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  referralCode: "",
  state: "",
  lga: "",
  ward: "",
  pollingUnit: "",
  nin: "",
  password: "",
  confirm: "",
};

export default function Join() {
  const [step, setStep] = useState(1);
  /* A shared link — /join?ref=7K4Q2X — fills the field in for them. Done as a
     lazy initialiser rather than an effect that overwrites the blank form on
     the first paint: the field is then correct in the very first render, and
     nobody watches their referral code appear a frame late.

     `window` is guarded because this component is prerendered on the server
     before it hydrates. Reading the URL directly rather than through
     useSearchParams keeps the whole form out of a Suspense boundary for the
     sake of one optional query parameter. */
  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") return EMPTY;
    const ref = new URLSearchParams(window.location.search).get("ref");
    return ref ? { ...EMPTY, referralCode: ref.toUpperCase() } : EMPTY;
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(null);
  const referrer = useReferrer(form.referralCode);

  const geo = useGeography(form.state, form.lga, form.ward);

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      // Changing a parent invalidates its children.
      if (field === "state") {
        next.lga = "";
        next.ward = "";
        next.pollingUnit = "";
      }
      if (field === "lga") {
        next.ward = "";
        next.pollingUnit = "";
      }
      if (field === "ward") next.pollingUnit = "";
      return next;
    });
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  /* Checks in the browser mirror the server's, but the server is the authority.
     these exist so the reader is told about a bad phone number before they
     have filled in two more steps. */
  function checkStep(id) {
    const found = {};
    if (id === 1) {
      if (form.name.trim().length < 3) found.name = "Enter your full name.";
      if (!form.phone.trim()) found.phone = "Enter your mobile number.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
        found.email = "Enter a valid email address.";
      if (form.referralCode.trim() && referrer.state === "unknown")
        found.referralCode = "No member holds that code. Check it, or leave it blank.";
    }
    if (id === 2) {
      if (!form.state) found.state = "Select your state.";
      if (!form.lga) found.lga = "Select your Local Government Area.";
      if (!form.ward) found.ward = "Select your ward.";
    }
    if (id === 3) {
      if (form.nin.trim() && !/^\d{11}$/.test(form.nin.replace(/\D/g, "")))
        found.nin = "A NIN is 11 digits.";
      if (form.password.length < 8) found.password = "At least 8 characters.";
      else if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password))
        found.password = "Include at least one letter and one number.";
      if (form.confirm !== form.password) found.confirm = "Passwords do not match.";
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  const next = () => {
    if (checkStep(step)) setStep((s) => Math.min(s + 1, 3));
  };

  async function submit(event) {
    event.preventDefault();
    if (!checkStep(3)) return;

    setBusy(true);
    setNotice("");

    /* The selects hold names, because that is what a member recognises and
       what their record reads back. The codes go with them: INEC's own
       identifier for the ward and the polling unit, which is what the server
       resolves against, so a register entry cannot turn on a spelling. */
    const unit = geo.units.find((option) => option.value === form.pollingUnit);
    const payload = {
      ...form,
      wardCode: geo.wardCode,
      pollingUnit: unit?.name ?? "",
      pollingUnitCode: unit?.value ?? "",
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          // Send them back to whichever step actually holds the problem.
          const bad = steps.find((s) => s.fields.some((f) => data.errors[f]));
          if (bad) setStep(bad.id);
        }
        setNotice(data.error ?? "Please check the highlighted fields.");
        return;
      }
      setDone(data.member);
    } catch {
      setNotice("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ success */
  if (done) {
    return (
      <>
        <PageHeader
          breadcrumb="Join MAP"
          kicker="Welcome to the movement"
          title="You're registered"
          lead="Your membership number is issued and permanent. Keep it, because it identifies you everywhere in the movement."
        />
        <section className="section bg-white">
          <div className="shell shell-text mx-auto">
            <div className="border-2 border-brand-600 p-8 text-center">
              <Check size={30} className="mx-auto text-brand-600" aria-hidden="true" />
              <p className="mt-6 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                Membership number
              </p>
              <p className="mt-3 font-display text-fluid-2xl font-extrabold tracking-[-0.02em] text-ink-950 tabular-nums">
                {done.membershipNo}
              </p>
              {/* Nothing is sent to the phone, so nothing here may promise it.
                  The number is named only because it is what signs them back
                  in — a member who reads this should have no step left to
                  wonder about. */}
              <p className="prose-body mx-auto mt-6 max-w-md text-[0.9375rem]">
                Registered in {done.ward}, {done.lga}, {done.state}. Your
                membership is active from today and there is nothing further to
                complete. Sign in any time with {done.phone}.
              </p>

              {/* The second number they leave with. It is issued now and never
                  changes, and the movement grows by members handing it on. */}
              {done.referralCode && (
                <div className="mt-8 border-t-2 border-ink-950 pt-6">
                  <p className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                    Your referral code
                  </p>
                  <p className="mt-3 font-display text-fluid-xl font-extrabold tracking-[0.2em] text-ink-950 tabular-nums">
                    {done.referralCode}
                  </p>
                  <p className="mx-auto mt-3 max-w-sm text-[0.875rem] leading-snug text-content-muted">
                    Give this to anyone you bring into the movement. Everyone who
                    registers with it appears on your page, by name.
                  </p>
                </div>
              )}
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Button href="/structure#find" variant="primary" size="lg">
                  See who coordinates your area
                  <ArrowRight size={17} strokeWidth={2.75} />
                </Button>
                <Button href="/" variant="outline" size="lg">
                  Back to home
                </Button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  /* --------------------------------------------------------------- form */
  return (
    <>
      <PageHeader
        breadcrumb="Join MAP"
        kicker="Membership is free"
        title="Join the movement"
        lead="Three short steps, under two minutes. MAP never asks for payment to register or to hold office."
      />

      <section className="section bg-white">
        {/* Two columns, not one 52rem trench. A three-field step set across the
            full text measure gives an 832px-wide box to type a name into, with
            an empty page around it. The form now sits at a proper form measure
            and the space beside it does work: what happens next, and the way
            back in for members who already have an account. */}
        <div className="shell grid gap-14 lg:grid-cols-[1fr_19rem] lg:gap-20">
          <div className="min-w-0 max-w-[33rem]">
            {/* ------------------------------------------------- progress */}
          {/* The rule under the steps is the track, so it has to read as the
              part still to do: light, and the same 4px as the ember fill that
              advances over it. Black here made two unfinished steps look
              heavier than the finished one. */}
          <ol className="flex border-b-4 border-ink-200">
            {steps.map((item) => {
              const state =
                item.id === step ? "current" : item.id < step ? "done" : "todo";
              return (
                <li key={item.id} className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => item.id < step && setStep(item.id)}
                    disabled={item.id > step}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 px-1 py-4 text-left transition-colors duration-200",
                      state === "todo" && "cursor-default text-ink-300",
                      state === "done" && "text-brand-700 hover:text-ember-600",
                      state === "current" && "text-ink-950"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center text-[0.6875rem] font-extrabold tabular-nums",
                        state === "done" && "bg-brand-600 text-white",
                        state === "current" && "bg-ink-950 text-white",
                        state === "todo" && "bg-ink-100 text-ink-400"
                      )}
                    >
                      {state === "done" ? <Check size={13} strokeWidth={3.5} /> : item.id}
                    </span>
                    <span className="truncate font-display text-[0.75rem] font-bold tracking-[0.1em] uppercase">
                      {item.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 -bottom-1 h-1 origin-left bg-ember-500 transition-transform duration-300 ease-out-quart",
                        // Filled for every step reached, not just the current
                        // one, so the bar measures progress rather than
                        // pointing at where you happen to be standing.
                        item.id <= step ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ol>

          {notice && (
            <p
              role="alert"
              className="mt-8 flex items-start gap-3 border-l-4 border-red-600 bg-red-50 p-4 text-[0.875rem] leading-relaxed text-red-900"
            >
              <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}

          <form onSubmit={submit} noValidate className="mt-10">
            {/* ------------------------------------------------ step 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <Field
                  id="name"
                  label="Full name"
                  value={form.name}
                  onChange={set("name")}
                  error={errors.name}
                  autoComplete="name"
                  autoFocus
                />
                <Field
                  id="phone"
                  label="Mobile number"
                  type="tel"
                  inputMode="tel"
                  placeholder="0803 123 4567"
                  value={form.phone}
                  onChange={set("phone")}
                  error={errors.phone}
                  autoComplete="tel"
                  hint="This is how you sign in, and how the movement reaches you."
                />
                <Field
                  id="email"
                  label="Email address"
                  type="email"
                  inputMode="email"
                  optional
                  value={form.email}
                  onChange={set("email")}
                  error={errors.email}
                  autoComplete="email"
                  hint="Optional, but you can sign in with it as well as your number."
                />

                {/* The movement grows by members bringing members. Whoever
                    invited you gets the credit on their own page, and the
                    lookup happens here rather than at submit so a mistyped
                    code is caught while they still remember what it was. */}
                <Field
                  id="referralCode"
                  label="Referral code"
                  optional
                  value={form.referralCode}
                  onChange={set("referralCode")}
                  error={errors.referralCode}
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={7}
                  placeholder="7K4Q2X"
                  className="font-display font-bold tracking-[0.18em] uppercase tabular-nums"
                  hint={
                    referrer.state === "found"
                      ? undefined
                      : referrer.state === "checking"
                        ? "Checking that code…"
                        : "If a member invited you, enter their code so they are credited."
                  }
                  trailing={
                    referrer.state === "found" ? (
                      <span className="grid size-11 place-items-center text-brand-600">
                        <BadgeCheck size={18} strokeWidth={2.5} />
                      </span>
                    ) : referrer.state === "checking" ? (
                      <span className="grid size-11 place-items-center text-ink-400">
                        <Loader2 size={16} className="animate-spin" />
                      </span>
                    ) : null
                  }
                />

                {referrer.state === "found" && (
                  <p className="-mt-3 flex items-center gap-2.5 border-l-4 border-brand-600 bg-brand-50 px-4 py-3 text-[0.875rem] text-ink-950">
                    <BadgeCheck size={16} className="shrink-0 text-brand-600" aria-hidden="true" />
                    <span>
                      Invited by <strong className="font-bold">{referrer.name}</strong>
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* ------------------------------------------------ step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <Select
                  id="state"
                  label="State"
                  value={form.state}
                  onChange={set("state")}
                  error={errors.state}
                  placeholder="Select your state…"
                  options={states.map((entry) => entry.name)}
                  autoFocus
                />

                {/* Nobody types their ward. Each list is the INEC register for
                    the tier above it, so the name that lands in the member
                    record is the one INEC uses, spelled the one way. */}
                <Select
                  id="lga"
                  label="Local Government Area"
                  value={form.lga}
                  onChange={set("lga")}
                  error={errors.lga}
                  placeholder={
                    !form.state
                      ? "Choose a state first"
                      : geo.loading
                        ? "Loading LGAs…"
                        : "Select your LGA…"
                  }
                  options={geo.lgas}
                  disabled={!form.state || !geo.ready}
                  hint={
                    geo.error
                      ? "Could not load the LGA list. Check your connection and pick your state again."
                      : undefined
                  }
                />

                <Select
                  id="ward"
                  label="Ward"
                  value={form.ward}
                  onChange={set("ward")}
                  error={errors.ward}
                  placeholder={form.lga ? "Select your ward…" : "Choose an LGA first"}
                  options={geo.wards}
                  disabled={!form.lga}
                />

                <Select
                  id="pollingUnit"
                  label="Polling unit"
                  optional
                  value={form.pollingUnit}
                  onChange={set("pollingUnit")}
                  error={errors.pollingUnit}
                  placeholder={
                    !form.ward
                      ? "Choose a ward first"
                      : geo.unitsLoading
                        ? "Loading polling units…"
                        : "Select your polling unit…"
                  }
                  options={geo.units}
                  disabled={!form.ward || geo.unitsLoading}
                  hint={
                    form.ward && !geo.unitsLoading && geo.units.length === 0
                      ? "The polling unit list for this ward could not be loaded. You can leave this blank and add it later."
                      : "Helps your ward coordinator plan for election day."
                  }
                />
              </div>
            )}

            {/* ------------------------------------------------ step 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <Field
                  id="nin"
                  label="National Identification Number"
                  optional
                  inputMode="numeric"
                  maxLength={11}
                  value={form.nin}
                  onChange={set("nin")}
                  error={errors.nin}
                  autoFocus
                  hint="11 digits, and the only identity detail we ask for. It tells genuine members apart from duplicates. It is not checked against NIMC, and you can register without it."
                />

                <Field
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  autoComplete="new-password"
                  hint="At least 8 characters, with a letter and a number."
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="grid size-11 place-items-center text-ink-400 transition-colors hover:text-ink-950"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <Field
                  id="confirm"
                  label="Confirm password"
                  type={showPassword ? "text" : "password"}
                  value={form.confirm}
                  onChange={set("confirm")}
                  error={errors.confirm}
                  autoComplete="new-password"
                />

                <p className="flex items-start gap-3 bg-ink-50 p-4 text-[0.8125rem] leading-relaxed text-content-muted">
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                  <span>
                    By registering you accept the movement&rsquo;s{" "}
                    <Link href="/terms" className="font-bold text-brand-700 underline underline-offset-2">
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-bold text-brand-700 underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </p>
              </div>
            )}

            {/* ----------------------------------------------- actions */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-8">
              {step > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft size={17} strokeWidth={2.75} />
                  Back
                </Button>
              )}

              <div className="ml-auto">
                {step < 3 ? (
                  <Button type="button" variant="primary" size="lg" onClick={next}>
                    Continue
                    <ArrowRight size={17} strokeWidth={2.75} />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" size="lg" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Registering
                      </>
                    ) : (
                      <>
                        Complete registration
                        <ArrowRight size={17} strokeWidth={2.75} />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>

          </div>

          {/* ------------------------------------------------------ aside */}
          <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
            {/* The only route to sign-in on the whole site now that it has left
                the masthead, so it leads here, above the explanatory copy,
                rather than sitting under the form as a footnote a returning
                member has to scroll three steps to find. */}
            <div className="border-2 border-ink-950 p-6">
              <p className="font-display text-base font-extrabold tracking-tight text-ink-950">
                Already a member?
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-snug text-content-muted">
                Sign in with your phone number or email address.
              </p>
              <div className="mt-5">
                <Button href="/login" variant="outline" size="md" full>
                  Sign in
                  <ArrowRight size={16} strokeWidth={2.75} />
                </Button>
              </div>
            </div>

            <div className="mt-10 border-t-2 border-ink-950 pt-6">
              <h2 className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase">
                What happens next
              </h2>
              <ol className="mt-5 space-y-5">
                {[
                  "You get a permanent membership number, tied to your ward.",
                  "Your ward and LGA coordinators can see you in the register.",
                  "Office is by appointment. Coordinators fill vacant seats from that register, so there is nothing to apply for.",
                ].map((item, index) => (
                  <li key={item} className="flex gap-4">
                    <span className="shrink-0 font-display text-[0.8125rem] font-extrabold text-ember-600 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.875rem] leading-snug text-content-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-10 flex items-start gap-3 bg-ink-50 p-4 text-[0.8125rem] leading-relaxed text-content-muted">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-brand-600"
                aria-hidden="true"
              />
              <span>
                Membership is free. MAP never asks for payment to register, to be
                appointed to any office, or to keep one.
              </span>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

/**
 * Resolves a referral code to the member who holds it, as it is typed.
 *
 * Returns { state: "idle" | "checking" | "found" | "unknown", name }. The
 * lookup only fires on a complete six-character code, so nobody's half-typed
 * input becomes five requests, and it is debounced on top of that. An in-flight
 * request is aborted when the code changes, which is what stops a slow answer
 * for an old code overwriting a fast answer for the current one.
 */
function useReferrer(input) {
  /* One atom, keyed by the code it describes. Nothing is written synchronously
     in the effect: "idle" and "checking" are *derived* from the gap between
     the code being typed and an answer arriving for that same code. Writing
     them into state inside the effect is a cascading render, and it also made
     a stale answer briefly authoritative when the code changed twice quickly. */
  const [answer, setAnswer] = useState({ code: null, name: null, found: false });

  const code = String(input ?? "")
    .toUpperCase()
    .replace(/^MAP[-\s]*/, "")
    .replace(/[^A-Z0-9]/g, "");

  useEffect(() => {
    if (code.length !== 6) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/referrals/${code}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setAnswer({ code, name: data?.name ?? null, found: Boolean(data) }))
        // An abort is not a failure, and neither is a dropped connection: the
        // server checks the code again at submit, so the worst case is that
        // the reassuring line never appears.
        .catch(() => {
          if (!controller.signal.aborted) setAnswer({ code, name: null, found: false });
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [code]);

  if (code.length !== 6) return { state: "idle", name: null };
  if (answer.code !== code) return { state: "checking", name: null };
  return answer.found
    ? { state: "found", name: answer.name }
    : { state: "unknown", name: null };
}

/* ------------------------------------------------------------- primitives */

function Field({
  id,
  label,
  optional = false,
  hint,
  error,
  trailing,
  className,
  ...props
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-sans tracking-normal text-ink-400 normal-case">
            (optional)
          </span>
        )}
      </label>

      <div className="relative mt-2.5">
        <input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-13 w-full border-2 bg-white px-4 text-[0.9375rem] text-ink-950 transition-colors",
            "focus:outline-none disabled:bg-ink-50 disabled:text-ink-400",
            trailing && "pr-14",
            error
              ? "border-red-600 focus:border-red-600"
              : "border-ink-200 focus:border-brand-600",
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[0.8125rem] font-semibold text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-2 text-[0.8125rem] leading-snug text-content-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/* A plain <select>, deliberately. The ward and polling unit lists run to
   dozens of entries and a native control gives us the platform's own scroller
   and type-ahead — on a phone that is a full-height wheel, which beats any
   custom listbox we could write. */
function Select({
  id,
  label,
  options,
  placeholder,
  error,
  hint,
  optional = false,
  ...props
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-sans tracking-normal text-ink-400 normal-case">
            (optional)
          </span>
        )}
      </label>
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "mt-2.5 h-13 w-full border-2 bg-white px-4 text-[0.9375rem] text-ink-950 transition-colors",
          "focus:outline-none disabled:bg-ink-50 disabled:text-ink-400",
          error ? "border-red-600" : "border-ink-200 focus:border-brand-600"
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {/* Ward and LGA lists are plain names; the polling unit list is
            { value, label }, because two units in one ward can share a name and
            only INEC's code tells them apart. */}
        {options.map((option) => {
          const value = option.value ?? option;
          return (
            <option key={value} value={value}>
              {option.label ?? option}
            </option>
          );
        })}
      </select>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[0.8125rem] font-semibold text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-2 text-[0.8125rem] leading-snug text-content-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

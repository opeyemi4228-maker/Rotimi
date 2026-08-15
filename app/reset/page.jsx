"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, CircleCheck, Eye, EyeOff, Loader2 } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Forgotten password.
 *
 * ── ONE PAGE, TWO STEPS, NO TOKEN IN A LINK ────────────────────────────────
 * The code goes to the phone and is typed back in here. No emailed reset link,
 * for two reasons: most members registered with a phone number and no email at
 * all, and a link in a message is a thing that can be forwarded, previewed by a
 * mail scanner, or left in a browser history. Six digits typed into the page
 * that asked for them cannot be any of those.
 *
 * The first step's reply is deliberately the same whether or not the number is
 * registered — see the route. The copy says "if that number is registered" so
 * the page is not claiming more than the server is willing to tell it.
 * ───────────────────────────────────────────────────────────────────────────
 */
export default function ResetPassword() {
  const router = useRouter();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  async function post(payload) {
    const response = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status, data: await response.json() };
  }

  async function requestCode(event) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});

    try {
      const { ok, data } = await post({ phone });
      if (!ok) {
        setErrors(data.errors ?? { phone: data.error ?? "That did not work." });
        return;
      }
      setNotice(data.message ?? "If that number is registered, a code is on its way to it.");
      setStep("code");
    } catch {
      setErrors({ phone: "The network dropped. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function submitNew(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});

    try {
      const { ok, data } = await post({ phone, code, password });
      if (!ok) {
        setErrors(data.errors ?? { code: data.error ?? "That did not work." });
        return;
      }
      setStep("done");
    } catch {
      setErrors({ code: "The network dropped. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb="Sign in"
        kicker="Account"
        title="Forgotten your password"
        lead="We text a six-digit code to the number you registered with. It lasts five minutes."
      />

      <section className="section-tight bg-white">
        <div className="shell">
          <div className="mx-auto max-w-md">
            {step === "done" ? (
              <div className="border-2 border-brand-600 bg-white p-7">
                <p className="flex items-center gap-2.5">
                  <CircleCheck size={20} className="text-brand-600" aria-hidden="true" />
                  <span className="font-display text-lg font-extrabold tracking-tight text-ink-950">
                    Password changed
                  </span>
                </p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-content-muted">
                  Sign in with your new password. We did not sign you in automatically —
                  proving it works now is better than finding out it does not later.
                </p>
                <Button href="/login" variant="primary" size="lg" full className="mt-6">
                  Sign in
                  <ArrowRight size={17} strokeWidth={2.75} />
                </Button>
              </div>
            ) : (
              <form
                onSubmit={step === "phone" ? requestCode : submitNew}
                className="border-2 border-ink-950 bg-white p-7"
              >
                <Field
                  id="phone"
                  label="Phone number"
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    setErrors({});
                  }}
                  error={errors.phone}
                  disabled={step !== "phone"}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0803 123 4567"
                />

                {step === "code" && (
                  <>
                    {notice && (
                      <p className="mt-5 border-2 border-ink-200 bg-ink-50 px-4 py-3 text-[0.8125rem] leading-snug text-content-muted">
                        {notice}
                      </p>
                    )}

                    <div className="mt-5">
                      <Field
                        id="code"
                        label="The six-digit code"
                        value={code}
                        onChange={(value) => {
                          setCode(value.replace(/\D/g, "").slice(0, 6));
                          setErrors({});
                        }}
                        error={errors.code}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        mono
                      />
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="password"
                        className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
                      >
                        New password
                      </label>
                      <div className="relative mt-2">
                        <input
                          id="password"
                          type={show ? "text" : "password"}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setErrors({});
                          }}
                          autoComplete="new-password"
                          className={cn(
                            "w-full border-2 px-4 py-3 pr-12 text-[0.9375rem] text-ink-950 outline-none focus:border-ink-950",
                            errors.password ? "border-red-600" : "border-ink-200"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShow((was) => !was)}
                          aria-label={show ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-500 hover:text-ink-950"
                        >
                          {show ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      {errors.password && <Problem>{errors.password}</Problem>}
                      <p className="mt-2 text-[0.75rem] text-content-subtle">
                        At least eight characters.
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={busy || (step === "phone" ? !phone.trim() : code.length !== 6 || !password)}
                  className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink-950 bg-ink-950 px-5 py-3.5 text-[0.8125rem] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-200 disabled:text-ink-500"
                >
                  {busy && <Loader2 size={15} strokeWidth={3} className="animate-spin" />}
                  {step === "phone" ? "Send me a code" : "Set my new password"}
                </button>

                {step === "code" && (
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={busy}
                    className="mt-4 w-full text-[0.75rem] font-bold tracking-[0.08em] text-brand-700 uppercase hover:text-ember-600 disabled:opacity-40"
                  >
                    Send another code
                  </button>
                )}

                <p className="mt-6 border-t border-ink-200 pt-5 text-center text-[0.875rem] text-content-muted">
                  Remembered it?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-brand-700 underline underline-offset-4 hover:text-ember-600"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ id, label, value, onChange, error, disabled, mono, ...props }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-bold tracking-[0.12em] text-ink-500 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "mt-2 w-full border-2 px-4 py-3 text-[0.9375rem] text-ink-950 outline-none focus:border-ink-950 disabled:bg-ink-50 disabled:text-content-muted",
          mono && "font-mono text-[1.0625rem] tracking-[0.3em] tabular-nums",
          error ? "border-red-600" : "border-ink-200"
        )}
        {...props}
      />
      {error && <Problem>{error}</Problem>}
    </div>
  );
}

function Problem({ children }) {
  return (
    <p className="mt-2 flex gap-2 text-[0.8125rem] leading-snug text-red-700">
      <CircleAlert size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

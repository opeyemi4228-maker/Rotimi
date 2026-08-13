/**
 * The SMS gateway, behind one door.
 *
 * ── WHY AN ABSTRACTION AND NOT JUST A FETCH ────────────────────────────────
 * The movement will change gateway at least once — on price, on delivery rates
 * to a particular network, or because one of them goes down on the morning of a
 * congress. Every caller in this app asks `send()`; which company that becomes
 * is one environment variable, and adding a third provider is one entry in
 * PROVIDERS and nothing else.
 *
 * ── WHAT HAPPENS WITH NO GATEWAY CONFIGURED ────────────────────────────────
 * It refuses, loudly, and says exactly which variables are missing. It does NOT
 * quietly succeed. A broadcast tool that reports "sent to 4,312 members" when
 * no message left the building is worse than one that does not exist, because
 * somebody will believe it and stop making phone calls.
 *
 * The one exception is SMS_PROVIDER=console, which is explicit, writes every
 * message to the server log, and marks the broadcast's provider as "console" so
 * the record shows what really happened.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Server only.
 */

/* ─────────────────────────────────────────────────────────── segmentation */

/* GSM 03.38. Anything outside this set forces the whole message into UCS-2,
   which more than halves what fits in one part — so a single curly apostrophe
   pasted from Word doubles the bill for a national broadcast. That is worth
   telling the sender about before they press send, which is the only reason
   this table is here. */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
/* These cost two characters each: the gateway sends an escape byte first. */
const GSM_EXTENDED = "^{}\\[~]|€";

const GSM_SET = new Set([...GSM_BASIC, ...GSM_EXTENDED]);

/**
 * How many billable parts one message costs each recipient.
 *
 * Returns `{ encoding, units, segments, limit }` — `units` counts the escaped
 * characters as two, because the network does.
 */
export function segments(body) {
  const text = String(body ?? "");
  let unicode = false;
  let units = 0;

  for (const character of text) {
    if (!GSM_SET.has(character)) {
      unicode = true;
      break;
    }
    units += GSM_EXTENDED.includes(character) ? 2 : 1;
  }

  if (unicode) {
    /* UCS-2 counts 16-bit code units, so an emoji outside the BMP is two.
       `.length` on a JS string is already exactly that count. */
    const length = text.length;
    const count = length === 0 ? 0 : length <= 70 ? 1 : Math.ceil(length / 67);
    return { encoding: "UCS-2", units: length, segments: count, limit: count > 1 ? 67 : 70 };
  }

  const count = units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153);
  return { encoding: "GSM-7", units, segments: count, limit: count > 1 ? 153 : 160 };
}

/* ─────────────────────────────────────────────────────────────── providers */

/**
 * Each provider takes a batch of numbers and one body, and answers with the
 * numbers it would not accept. None of them throw: a gateway that is down is a
 * normal Tuesday, and the caller needs the partial result, not an exception.
 */
const PROVIDERS = {
  /* Termii. The common choice for Nigerian political and commercial bulk SMS,
     and the one whose sender IDs are already registered with the networks. */
  termii: {
    label: "Termii",
    needs: ["TERMII_API_KEY", "SMS_SENDER_ID"],
    /* Termii's bulk endpoint documents 10,000 per call. Five hundred keeps any
       one failure small enough to retry and the request body under a megabyte. */
    batchSize: 500,
    async send(numbers, body) {
      const response = await fetch(
        `${process.env.TERMII_BASE_URL ?? "https://api.ng.termii.com"}/api/sms/send/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TERMII_API_KEY,
            to: numbers,
            from: process.env.SMS_SENDER_ID,
            sms: body,
            type: "plain",
            channel: process.env.TERMII_CHANNEL ?? "generic",
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { accepted: 0, rejected: numbers, error: payload.message ?? `HTTP ${response.status}` };
      }
      return { accepted: numbers.length, rejected: [], error: null };
    },
  },

  /* Africa's Talking. Cheaper across several African markets and the usual
     second string if Termii's delivery to one network degrades. */
  africastalking: {
    label: "Africa's Talking",
    needs: ["AT_API_KEY", "AT_USERNAME", "SMS_SENDER_ID"],
    batchSize: 100,
    async send(numbers, body) {
      const form = new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: numbers.join(","),
        message: body,
        from: process.env.SMS_SENDER_ID,
      });

      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { accepted: 0, rejected: numbers, error: payload.message ?? `HTTP ${response.status}` };
      }

      /* Africa's Talking answers per recipient, so the refusals are named and
         worth keeping — a number the network rejects is usually a number that
         was mistyped at registration, and somebody can go and fix it. */
      const recipients = payload?.SMSMessageData?.Recipients ?? [];
      const rejected = recipients
        .filter((entry) => entry.statusCode >= 400)
        .map((entry) => entry.number);
      return {
        accepted: recipients.length - rejected.length,
        rejected,
        error: rejected.length === recipients.length && recipients.length > 0
          ? payload?.SMSMessageData?.Message ?? "Every recipient was rejected."
          : null,
      };
    },
  },

  /* No gateway. Explicit, logged, and recorded as "console" on the broadcast so
     nobody reads the row later and thinks a message went out. For staging, and
     for the first walk-through with a coordinator who has not been given the
     live key yet. */
  console: {
    label: "Console (nothing is sent)",
    needs: [],
    batchSize: 1000,
    async send(numbers, body) {
      console.info(
        `[sms:console] would send to ${numbers.length} numbers: ${JSON.stringify(body).slice(0, 200)}`
      );
      return { accepted: numbers.length, rejected: [], error: null };
    },
  },
};

/**
 * Which gateway is configured, and whether it can actually be used.
 *
 * Safe to call from a page: it reads environment variables and returns words,
 * never a key. The composer uses it to say "SMS is not configured — set
 * TERMII_API_KEY" instead of letting somebody write a message to four thousand
 * people and then discover it at the last step.
 */
export function smsProvider() {
  const name = (process.env.SMS_PROVIDER ?? "").toLowerCase().trim();

  if (!name) {
    return {
      name: null,
      label: "Not configured",
      configured: false,
      missing: ["SMS_PROVIDER"],
      reason:
        "No SMS gateway is set. Add SMS_PROVIDER (termii, africastalking or console) to the environment.",
    };
  }

  const provider = PROVIDERS[name];
  if (!provider) {
    return {
      name,
      label: name,
      configured: false,
      missing: [],
      reason: `SMS_PROVIDER is "${name}", which is not one of: ${Object.keys(PROVIDERS).join(", ")}.`,
    };
  }

  const missing = provider.needs.filter((key) => !process.env[key]);
  return {
    name,
    label: provider.label,
    configured: missing.length === 0,
    missing,
    reason: missing.length ? `${provider.label} needs ${missing.join(" and ")}.` : null,
  };
}

/**
 * Send one body to many numbers.
 *
 * Batches at whatever the gateway is comfortable with, keeps going after a
 * batch fails, and returns totals plus up to fifty of the refused numbers.
 * `onProgress` is called after each batch so a long national send can report
 * itself while it is still running.
 */
export async function sendBulk({ numbers, body, onProgress }) {
  const status = smsProvider();
  if (!status.configured) {
    return {
      provider: status.name,
      accepted: 0,
      rejected: [],
      failed: numbers.length,
      error: status.reason,
    };
  }

  const provider = PROVIDERS[status.name];
  let accepted = 0;
  let failed = 0;
  const rejected = [];
  let error = null;

  for (let index = 0; index < numbers.length; index += provider.batchSize) {
    const batch = numbers.slice(index, index + provider.batchSize);
    let result;
    try {
      result = await provider.send(batch, body);
    } catch (cause) {
      /* A network error against the gateway is one failed batch, not a failed
         broadcast. The remaining batches still go. */
      result = { accepted: 0, rejected: batch, error: cause?.message ?? "Gateway unreachable." };
    }

    accepted += result.accepted;
    failed += result.rejected.length;
    for (const number of result.rejected) {
      if (rejected.length < 50) rejected.push(number);
    }
    if (result.error && !error) error = result.error;

    await onProgress?.({ accepted, failed, done: index + batch.length, total: numbers.length });
  }

  return { provider: status.name, accepted, rejected, failed, error };
}

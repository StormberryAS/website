// Stormberry contact-form Worker.
//
// Routes:
//   POST /                 contact form submission (Turnstile-gated, sends via Resend)
//   POST /resend-webhook   Resend delivery events (Svix-signed), alerts on bounce/complaint
//
// Bindings:
//   ADMIN_EMAIL             var    where enquiries land (info@stormberry.as)
//   RESEND_API_KEY          secret sending key for the verified stormberry.as domain
//   TURNSTILE_SECRET_KEY    secret
//   RESEND_WEBHOOK_SECRET   secret whsec_... from the Resend dashboard webhook
//   ALERT_EMAIL             secret optional; where bounce alerts go. MUST NOT be the
//                           same mailbox as ADMIN_EMAIL, otherwise an alert about
//                           info@ failing is itself delivered to info@. Falls back to
//                           ADMIN_EMAIL so the Worker still runs before it is set.

// CORS is restricted to the two real site origins. This is defence in depth only:
// CORS is browser-enforced and stops nothing from curl.
//
// The controls that actually bound abuse are Turnstile, the field caps below, and
// the Worker-native rate-limit bindings declared in wrangler.toml. NOTE: this
// Worker is published to its workers.dev subdomain with no [[routes]] block, so a
// zone WAF rate-limiting rule could never apply to it; the binding is the only
// route to a real limit here. If the bindings are absent at runtime the Worker
// logs and continues, so an unconfigured limiter degrades to the pre-2026-09-20
// behaviour rather than taking the contact form down.
const ALLOWED_ORIGINS = new Set([
  "https://stormberry.as",
  "https://www.stormberry.as",
]);

// `service` is a fixed select on contact.html / no-kontakt.html, so it is an
// allow-list, never free text. The label map is what reaches the autoreply, so
// no caller-supplied string is ever interpolated into mail sent to a
// caller-supplied address.
const SERVICE_LABELS = {
  ai: "AI and automation",
  culture: "Cross-cultural communication",
  other: "Other",
  sales: "Sales and business development",
  strategy: "Strategy",
};

// `source` answers "How did you hear about us?", an OPTIONAL select on both
// contact pages. It is an allow-list like `service`, with one difference: it is
// optional, so a missing, oversized or unknown value never rejects the enquiry.
// It becomes SOURCE_NOT_GIVEN and the caller's string is never echoed anywhere.
// That also keeps both deploy orders working: a page without the field sends
// nothing, and an older Worker simply ignores the extra key.
// The label reaches the admin notification only, never the confirmation sent
// to the caller-supplied address. Keys match the <option> values on
// contact.html and no-kontakt.html; test.mjs fails if they drift apart.
const SOURCE_LABELS = {
  search: "Search engine",
  google_maps: "Google Maps or Google business listing",
  linkedin: "LinkedIn",
  1881: "1881",
  proff: "Proff",
  other_directory: "Another business directory",
  referral: "Recommended by someone",
  event: "Event, trade fair or business network",
  other: "Other",
};
const SOURCE_NOT_GIVEN = "not given";

// Caps stop an unbounded body reaching Resend. 254 is the RFC 5321 maximum for a
// complete address; the others are generous against real enquiries. `source` is
// capped well above its longest key, so an oversized value is dropped before any
// work is done on it.
const LIMITS = { name: 100, email: 254, message: 5000, source: 32 };

// Deliberately conservative: no quoted local parts, no unescaped separators, one
// or more dot-separated labels in the domain. Malformed addresses that reach the
// Resend API can create suppressions, which is the failure this prevents.
const EMAIL_RE = /^[^\s@,;:<>"]+@[^\s@.,;:<>"]+(?:\.[^\s@.,;:<>"]+)+$/;

// Admin notification is sent FROM a different local part than it is sent TO.
// Using info@ for both made every enquiry a self-addressed message through a
// third-party ESP, which is what earned info@stormberry.as a hard bounce and a
// permanent Resend suppression (diagnosed 2026-08-02). Do not put them back.
const FROM_NOTIFICATION = "Stormberry Website <noreply@stormberry.as>";
const FROM_AUTOREPLY = "Stormberry AS <info@stormberry.as>";

// The alert mail's own subject prefix. Used as a loop guard: an alert that itself
// bounces must never generate a second alert.
const ALERT_SUBJECT_PREFIX = "Contact form delivery problem";

function corsHeaders(request) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Responses differ by Origin, so caches must not share them.
    Vary: "Origin",
  };
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

const json = (obj, status = 200, cors = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    if (url.pathname === "/resend-webhook") {
      return handleResendWebhook(request, env, cors);
    }

    return handleContactForm(request, env, cors);
  },
};

// Rate limiting. Two independent keys, because they bound different abuses:
// per-IP caps a single source hammering the form, and per-recipient caps how often
// ANY source can cause mail to be sent to one address, which is the sendCopy
// nuisance vector. A missing binding is logged, not fatal: see the note at the top.
async function overRateLimit(limiter, key, label, containerHint) {
  if (!limiter || typeof limiter.limit !== "function") {
    console.warn(`Rate limiter ${label} is not bound; request not limited`);
    return false;
  }
  try {
    const { success } = await limiter.limit({ key });
    if (!success) console.warn(`Rate limit ${label} exceeded`, containerHint);
    return !success;
  } catch (error) {
    // A limiter fault must not take the contact form down.
    console.error(`Rate limiter ${label} failed:`, String(error));
    return false;
  }
}

// Map the optional `source` field to its fixed English label. Anything that is
// not a known key, including a missing field from an older page, is "not given".
function sourceLabel(value) {
  if (typeof value !== "string") return SOURCE_NOT_GIVEN;
  if (value.length > LIMITS.source) return SOURCE_NOT_GIVEN;
  const key = value.trim();
  if (!Object.prototype.hasOwnProperty.call(SOURCE_LABELS, key)) return SOURCE_NOT_GIVEN;
  return SOURCE_LABELS[key];
}

// Trim, type-check and cap a single free-text field.
function cleanField(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

async function handleContactForm(request, env, cors) {
  try {
    const body = await request.json();
    const turnstileToken = body["cf-turnstile-response"];

    const name = cleanField(body.name, LIMITS.name);
    const email = cleanField(body.email, LIMITS.email);
    const message = cleanField(body.message, LIMITS.message);
    const service = typeof body.service === "string" ? body.service.trim() : "";
    const sendCopy = body.sendCopy === true;
    const heardVia = sourceLabel(body.source);

    if (!name || !email || !message || !service) {
      return json({ error: "Missing or oversized required fields" }, 400, cors);
    }

    if (!Object.prototype.hasOwnProperty.call(SERVICE_LABELS, service)) {
      return json({ error: "Unknown service" }, 400, cors);
    }

    if (!EMAIL_RE.test(email)) {
      return json({ error: "Invalid email address" }, 400, cors);
    }

    if (!turnstileToken) {
      return json({ error: "Missing captcha verification" }, 400, cors);
    }

    // Before the Turnstile round trip, so a flood costs us nothing outbound.
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    if (await overRateLimit(env.CONTACT_RATE_LIMIT_IP, clientIp, "per-IP", { ip: clientIp })) {
      return json({ error: "Too many requests" }, 429, cors);
    }

    const turnstileResult = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP"),
        }),
      },
    );

    const turnstileData = await turnstileResult.json();

    if (!turnstileData.success) {
      // Surface Turnstile's own error codes. Without them, a rotated or missing
      // TURNSTILE_SECRET_KEY ("invalid-input-secret") is indistinguishable from
      // an ordinary stale user token ("timeout-or-duplicate").
      const codes = turnstileData["error-codes"] || [];
      console.error("Turnstile rejected submission:", JSON.stringify(codes));
      return json({ error: "Captcha verification failed", codes }, 403, cors);
    }

    const resendApiKey = env.RESEND_API_KEY;
    const adminEmail = env.ADMIN_EMAIL;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set");
      return json({ error: "Server error" }, 500, cors);
    }

    const serviceLabel = SERVICE_LABELS[service];

    const htmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p>
        <p><strong>Heard about us via:</strong> ${escapeHtml(heardVia)}</p>
        <p><strong>Copy requested:</strong> ${sendCopy ? "yes" : "no"}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `;

    const emailsToSend = [
      {
        from: FROM_NOTIFICATION,
        to: [adminEmail],
        subject: `New Inquiry: ${serviceLabel} from ${name}`,
        html: htmlBody,
        reply_to: email,
      },
    ];

    // The confirmation copy goes to a caller-supplied address, so it carries NO
    // caller-supplied content: not the message, not even the name. Only the
    // allow-listed service label is interpolated. Without this, one Turnstile
    // solve bought a send of arbitrary text from the verified domain to any
    // address, which is an open relay in everything but name and is exactly the
    // path that leads to bounces, complaints and Resend suppression.
    // The complete fix is double opt-in (only send to an address that has
    // round-tripped), which needs storage this Worker does not have.
    // Per-recipient limit: one Turnstile solve must not buy repeated branded mail
    // to a victim address, no matter how many IPs the solves come from.
    const copyAllowed =
      sendCopy &&
      !(await overRateLimit(
        env.CONTACT_RATE_LIMIT_RECIPIENT,
        email.toLowerCase(),
        "per-recipient",
        { to: email },
      ));

    if (copyAllowed) {
      emailsToSend.push({
        from: FROM_AUTOREPLY,
        to: [email],
        subject: `Copy of your enquiry to Stormberry: ${serviceLabel}`,
        html: `
            <p>Hello,</p>
            <p>Thank you for contacting Stormberry AS. We have received your
            enquiry about <strong>${escapeHtml(serviceLabel)}</strong> and will
            reply as soon as we can.</p>
            <p>This is an automated confirmation. Your message is deliberately
            not repeated here, because this address was supplied in the form and
            has not been verified.</p>
            <p>Stormberry AS</p>
          `,
      });
    }

    const responses = await Promise.all(
      emailsToSend.map((emailPayload) => sendViaResend(resendApiKey, emailPayload)),
    );

    const failed = responses.filter((r) => !r.ok);
    if (failed.length > 0) {
      // Detail goes to Workers Logs (observability is enabled in wrangler.toml),
      // never to the client: it is provider-side information and some of it
      // describes account state.
      console.error(
        "Resend API errors:",
        JSON.stringify(failed.map((f) => ({ status: f.status, message: f.message }))),
      );
      return json({ error: "Email provider rejected the message" }, 502, cors);
    }

    // NB: a 200 from Resend means "accepted", NOT "delivered". A suppressed
    // recipient is accepted here and silently discarded afterwards, which is
    // precisely how this path failed unnoticed for months. The /resend-webhook
    // route below is the compensating control; this response cannot tell.
    const ids = responses.map((r) => r.id).filter(Boolean);
    console.log("Contact form accepted by Resend:", JSON.stringify({ service, ids }));

    return json({ success: true, ids }, 200, cors);
  } catch (error) {
    console.error("Contact form error:", error && error.stack ? error.stack : String(error));
    return json({ error: "Internal error" }, 500, cors);
  }
}

async function sendViaResend(apiKey, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    id: data && data.id ? data.id : null,
    message: (data && (data.message || data.name)) || null,
  };
}

// --- Resend delivery events -------------------------------------------------

// email.delivery_delayed is deliberately NOT here. It is transient, Resend
// retries on its own, and alerting on it generated mail for problems that
// resolved themselves, which is how an alert channel gets ignored.
const ALERT_EVENTS = new Set([
  "email.bounced",
  "email.complained",
  "email.failed",
]);

async function handleResendWebhook(request, env, cors) {
  try {
    const payload = await request.text();

    if (!env.RESEND_WEBHOOK_SECRET) {
      console.error("Webhook received but RESEND_WEBHOOK_SECRET is not set");
      return json({ error: "Webhook not configured" }, 500, cors);
    }

    const valid = await verifySvixSignature(env.RESEND_WEBHOOK_SECRET, request.headers, payload);
    if (!valid) {
      console.error("Webhook signature verification failed");
      return json({ error: "Invalid signature" }, 401, cors);
    }

    let event;
    try {
      event = JSON.parse(payload);
    } catch {
      return json({ error: "Malformed payload" }, 400, cors);
    }

    const type = event.type || "unknown";
    const data = event.data || {};
    const recipientList = (Array.isArray(data.to) ? data.to : [data.to])
      .filter((r) => r !== undefined && r !== null && r !== "")
      .map((r) => String(r));
    const recipients = recipientList.join(", ");

    // Every event is logged, so `wrangler tail` and Workers Logs show the full
    // delivery history even for events that do not warrant an alert.
    console.log(
      "Resend event:",
      JSON.stringify({ type, to: recipients, subject: data.subject, email_id: data.email_id }),
    );

    if (!ALERT_EVENTS.has(type)) {
      return json({ ok: true }, 200, cors);
    }

    // Loop guard 1: the failing message is itself an alert. Without this, a
    // bouncing alert recipient generates an alert about the alert, for ever.
    if (String(data.subject ?? "").startsWith(ALERT_SUBJECT_PREFIX)) {
      console.error(
        "Alert suppressed: the failing message was itself an alert",
        JSON.stringify({ type, to: recipients }),
      );
      return json({ ok: true, alerted: false, reason: "alert-loop-guard" }, 200, cors);
    }

    const reason =
      (data.bounce && (data.bounce.message || data.bounce.subType || data.bounce.type)) ||
      (data.failed && data.failed.reason) ||
      "no reason supplied by Resend";

    console.error("Resend delivery problem:", JSON.stringify({ type, to: recipients, reason }));

    const alertTo = env.ALERT_EMAIL || env.ADMIN_EMAIL;
    if (!alertTo || !env.RESEND_API_KEY) {
      return json({ ok: true, alerted: false }, 200, cors);
    }

    // Loop guard 2: the address we would alert is the one that just failed.
    // This is the ALERT_EMAIL-falls-back-to-ADMIN_EMAIL case, where mail to
    // info@ bouncing would be reported by mail to info@.
    if (recipientList.some((r) => r.toLowerCase() === String(alertTo).toLowerCase())) {
      console.error(
        "Alert suppressed: the alert recipient is the address that failed",
        JSON.stringify({ type, to: recipients, alertTo }),
      );
      return json({ ok: true, alerted: false, reason: "alert-recipient-is-failing-address" }, 200, cors);
    }

    const alert = await sendViaResend(env.RESEND_API_KEY, {
      from: FROM_NOTIFICATION,
      to: [alertTo],
      subject: `${ALERT_SUBJECT_PREFIX}: ${type}`,
      html: `
        <h2>A contact-form email did not reach its recipient</h2>
        <p><strong>Event:</strong> ${escapeHtml(type)}</p>
        <p><strong>Recipient:</strong> ${escapeHtml(recipients)}</p>
        <p><strong>Original subject:</strong> ${escapeHtml(data.subject)}</p>
        <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
        <p><strong>Resend email id:</strong> ${escapeHtml(data.email_id)}</p>
        <hr />
        <p>A bounce or complaint puts the recipient on Resend's suppression list
        permanently. Until it is cleared at resend.com, every further enquiry to
        that address is accepted by the API and silently discarded.</p>
      `,
    });

    if (!alert.ok) {
      console.error("Alert email failed:", JSON.stringify(alert));
    }

    return json({ ok: true, alerted: alert.ok }, 200, cors);
  } catch (error) {
    // crypto.subtle.importKey throws on a malformed secret, and without this the
    // failure was an unlogged 500 with no way to tell it from a Resend outage.
    console.error("Webhook error:", error && error.stack ? error.stack : String(error));
    return json({ error: "Internal error" }, 500, cors);
  }
}

// Resend signs webhooks with Svix. Signed content is `${id}.${timestamp}.${body}`,
// HMAC-SHA256 under the base64-decoded secret, compared against the base64
// signatures in the `svix-signature` header (space-separated, `v1,` prefixed).
async function verifySvixSignature(secret, headers, payload) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");

  if (!id || !timestamp || !signatureHeader) return false;

  // Reject replays outside a five-minute window.
  const sent = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sent) || Math.abs(Math.floor(Date.now() / 1000) - sent) > 300) {
    return false;
  }

  const secretBody = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(secretBody), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  return signatureHeader
    .split(" ")
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3))
    .some((candidate) => constantTimeEqual(candidate, expected));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

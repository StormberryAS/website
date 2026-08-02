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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Admin notification is sent FROM a different local part than it is sent TO.
// Using info@ for both made every enquiry a self-addressed message through a
// third-party ESP, which is what earned info@stormberry.as a hard bounce and a
// permanent Resend suppression (diagnosed 2026-08-02). Do not put them back.
const FROM_NOTIFICATION = "Stormberry Website <noreply@stormberry.as>";
const FROM_AUTOREPLY = "Stormberry AS <info@stormberry.as>";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (url.pathname === "/resend-webhook") {
      return handleResendWebhook(request, env);
    }

    return handleContactForm(request, env);
  },
};

async function handleContactForm(request, env) {
  try {
    const body = await request.json();
    const { name, email, service, message, sendCopy } = body;
    const turnstileToken = body["cf-turnstile-response"];

    if (!name || !email || !service || !message) {
      return new Response("Missing required fields", { status: 400, headers: CORS });
    }

    if (!turnstileToken) {
      return json({ error: "Missing captcha verification" }, 400);
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
      return json({ error: "Captcha verification failed", codes }, 403);
    }

    const resendApiKey = env.RESEND_API_KEY;
    const adminEmail = env.ADMIN_EMAIL;

    if (!resendApiKey) {
      return json({ error: "Server error: Missing API Key" }, 500);
    }

    const htmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service:</strong> ${escapeHtml(service)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `;

    const emailsToSend = [
      {
        from: FROM_NOTIFICATION,
        to: [adminEmail],
        subject: `New Inquiry: ${service} from ${name}`,
        html: htmlBody,
        reply_to: email,
      },
    ];

    if (sendCopy) {
      emailsToSend.push({
        from: FROM_AUTOREPLY,
        to: [email],
        subject: `Copy of your inquiry to Stormberry: ${service}`,
        html: `
            <p>Hi ${escapeHtml(name)},</p>
            <p>Thank you for reaching out to Stormberry AS. We have received your message and will get back to you as soon as possible.</p>
            <hr />
            <p><strong>Your Message:</strong></p>
            <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
          `,
      });
    }

    const responses = await Promise.all(
      emailsToSend.map((emailPayload) => sendViaResend(resendApiKey, emailPayload)),
    );

    const failed = responses.filter((r) => !r.ok);
    if (failed.length > 0) {
      console.error("Resend API errors:", JSON.stringify(failed));
      return json(
        {
          error: "Email provider rejected the message",
          // Resend's own status and message, so a failure is self-describing in
          // the browser console instead of collapsing into a blank 500.
          detail: failed.map((f) => ({ status: f.status, message: f.message })),
        },
        502,
      );
    }

    // NB: a 200 from Resend means "accepted", NOT "delivered". A suppressed
    // recipient is accepted here and silently discarded afterwards, which is
    // precisely how this path failed unnoticed for months. The /resend-webhook
    // route below is the compensating control; this response cannot tell.
    const ids = responses.map((r) => r.id).filter(Boolean);
    console.log("Contact form accepted by Resend:", JSON.stringify({ service, ids }));

    return json({ success: true, ids });
  } catch (error) {
    console.error("Contact form error:", error && error.stack ? error.stack : String(error));
    return json({ error: error.message }, 500);
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

const ALERT_EVENTS = new Set([
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
  "email.failed",
]);

async function handleResendWebhook(request, env) {
  const payload = await request.text();

  if (!env.RESEND_WEBHOOK_SECRET) {
    console.error("Webhook received but RESEND_WEBHOOK_SECRET is not set");
    return json({ error: "Webhook not configured" }, 500);
  }

  const valid = await verifySvixSignature(env.RESEND_WEBHOOK_SECRET, request.headers, payload);
  if (!valid) {
    console.error("Webhook signature verification failed");
    return json({ error: "Invalid signature" }, 401);
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Malformed payload" }, 400);
  }

  const type = event.type || "unknown";
  const data = event.data || {};
  const recipients = Array.isArray(data.to) ? data.to.join(", ") : String(data.to ?? "");

  // Every event is logged, so `wrangler tail` and Workers Logs show the full
  // delivery history even for events that do not warrant an alert.
  console.log(
    "Resend event:",
    JSON.stringify({ type, to: recipients, subject: data.subject, email_id: data.email_id }),
  );

  if (!ALERT_EVENTS.has(type)) {
    return json({ ok: true });
  }

  const reason =
    (data.bounce && (data.bounce.message || data.bounce.subType || data.bounce.type)) ||
    (data.failed && data.failed.reason) ||
    "no reason supplied by Resend";

  console.error("Resend delivery problem:", JSON.stringify({ type, to: recipients, reason }));

  const alertTo = env.ALERT_EMAIL || env.ADMIN_EMAIL;
  if (!alertTo || !env.RESEND_API_KEY) {
    return json({ ok: true, alerted: false });
  }

  const alert = await sendViaResend(env.RESEND_API_KEY, {
    from: FROM_NOTIFICATION,
    to: [alertTo],
    subject: `Contact form delivery problem: ${type}`,
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

  return json({ ok: true, alerted: alert.ok });
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

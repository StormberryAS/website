// Offline tests for the contact-form Worker.  Run:  node test.mjs
//
// index.js is loaded through a data: URL so this file needs no package.json
// ("type": "module") and cannot affect how wrangler builds or deploys.
// Webhook signatures are produced with node:crypto, an implementation
// independent of the Web Crypto one inside the Worker, so a pass is a real
// cross-check rather than the code agreeing with itself.

import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(here, "index.js"), "utf8");
const { default: worker } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const SECRET_BODY = randomBytes(24).toString("base64");
const SECRET = `whsec_${SECRET_BODY}`;
const BASE = "https://stormberry-contact-form.marcos-495.workers.dev";

const env = {
  ADMIN_EMAIL: "info@stormberry.as",
  RESEND_WEBHOOK_SECRET: SECRET,
  TURNSTILE_SECRET_KEY: "unused-in-these-tests",
};

const sign = (id, timestamp, body) =>
  createHmac("sha256", Buffer.from(SECRET_BODY, "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

function webhookRequest(event, { id = "msg_test_1", skew = 0, badSig = false } = {}) {
  const body = JSON.stringify(event);
  const ts = String(Math.floor(Date.now() / 1000) + skew);
  const sig = badSig ? "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" : sign(id, ts, body);
  return new Request(`${BASE}/resend-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": ts,
      "svix-signature": `v1,${sig}`,
    },
    body,
  });
}

const results = [];
async function check(label, fn) {
  try {
    await fn();
    results.push(["PASS", label]);
  } catch (err) {
    results.push(["FAIL", `${label} :: ${err.message}`]);
  }
}
const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
};

const delivered = {
  type: "email.delivered",
  data: { email_id: "abc-123", to: ["info@stormberry.as"], subject: "New Inquiry: sales from x" },
};
const bounced = {
  type: "email.bounced",
  data: {
    email_id: "abc-456",
    to: ["info@stormberry.as"],
    subject: "New Inquiry: sales from x",
    bounce: { type: "Permanent", subType: "Suppressed", message: "on suppression list" },
  },
};

await check("valid signature is accepted", async () => {
  const res = await worker.fetch(webhookRequest(delivered), env);
  eq(res.status, 200, "status");
  eq((await res.json()).ok, true, "ok");
});

await check("forged signature is rejected", async () => {
  eq((await worker.fetch(webhookRequest(delivered, { badSig: true }), env)).status, 401, "status");
});

await check("replayed old timestamp is rejected", async () => {
  eq((await worker.fetch(webhookRequest(delivered, { skew: -3600 }), env)).status, 401, "status");
});

await check("future timestamp is rejected", async () => {
  eq((await worker.fetch(webhookRequest(delivered, { skew: 3600 }), env)).status, 401, "status");
});

await check("signature is bound to the body (tamper detected)", async () => {
  const tampered = new Request(webhookRequest(delivered), { body: JSON.stringify(bounced) });
  eq((await worker.fetch(tampered, env)).status, 401, "status");
});

await check("missing svix headers rejected", async () => {
  const res = await worker.fetch(
    new Request(`${BASE}/resend-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delivered),
    }),
    env,
  );
  eq(res.status, 401, "status");
});

await check("unconfigured webhook secret returns 500, not a bypass", async () => {
  const res = await worker.fetch(webhookRequest(delivered), { ...env, RESEND_WEBHOOK_SECRET: "" });
  eq(res.status, 500, "status");
});

await check("bounce event without an API key skips the alert cleanly", async () => {
  const res = await worker.fetch(webhookRequest(bounced), env);
  eq(res.status, 200, "status");
  eq((await res.json()).alerted, false, "alerted");
});

await check("form: missing fields -> 400", async () => {
  const res = await worker.fetch(
    new Request(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    env,
  );
  eq(res.status, 400, "status");
});

await check("form: missing captcha token -> 400", async () => {
  const res = await worker.fetch(
    new Request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a", email: "b@c.d", service: "sales", message: "hi" }),
    }),
    env,
  );
  eq(res.status, 400, "status");
  eq((await res.json()).error, "Missing captcha verification", "error");
});

await check("OPTIONS from an allowed origin reflects that origin, not *", async () => {
  const res = await worker.fetch(
    new Request(BASE, { method: "OPTIONS", headers: { Origin: "https://stormberry.as" } }),
    env,
  );
  eq(res.status, 200, "status");
  eq(res.headers.get("Access-Control-Allow-Origin"), "https://stormberry.as", "cors");
  eq(res.headers.get("Vary"), "Origin", "vary");
});

await check("OPTIONS from a foreign origin gets NO allow-origin header", async () => {
  const res = await worker.fetch(
    new Request(BASE, { method: "OPTIONS", headers: { Origin: "https://evil.example" } }),
    env,
  );
  eq(res.status, 200, "status");
  eq(res.headers.get("Access-Control-Allow-Origin"), null, "cors");
});

await check("GET is still rejected", async () => {
  eq((await worker.fetch(new Request(BASE, { method: "GET" }), env)).status, 405, "status");
});

// --- validation and abuse-surface coverage ---------------------------------

const goodForm = {
  name: "Ada",
  email: "ada@example.com",
  service: "sales",
  message: "hello",
  "cf-turnstile-response": "tok",
};
const formRequest = (over = {}, headers = {}) =>
  new Request(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ ...goodForm, ...over }),
  });

await check("unknown service is rejected", async () => {
  const res = await worker.fetch(formRequest({ service: "<script>" }), env);
  eq(res.status, 400, "status");
  eq((await res.json()).error, "Unknown service", "error");
});

await check("invalid email is rejected", async () => {
  const res = await worker.fetch(formRequest({ email: "not an address" }), env);
  eq(res.status, 400, "status");
  eq((await res.json()).error, "Invalid email address", "error");
});

await check("oversized message is rejected", async () => {
  const res = await worker.fetch(formRequest({ message: "x".repeat(5001) }), env);
  eq(res.status, 400, "status");
});

await check("oversized name is rejected", async () => {
  const res = await worker.fetch(formRequest({ name: "x".repeat(101) }), env);
  eq(res.status, 400, "status");
});

// Mock Turnstile + Resend so the send path can be inspected offline.
function withMockedFetch(fn) {
  const real = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (input, init) => {
    const target = typeof input === "string" ? input : input.url;
    if (target.includes("challenges.cloudflare.com")) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (target.includes("api.resend.com")) {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: `id-${sent.length}` }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch to ${target}`);
  };
  return fn(sent).finally(() => {
    globalThis.fetch = real;
  });
}

const sendEnv = { ...env, RESEND_API_KEY: "re_test", TURNSTILE_SECRET_KEY: "ts_test" };

await check("sendCopy leaks NO caller-supplied text to the caller's address", async () => {
  await withMockedFetch(async (sent) => {
    const res = await worker.fetch(
      formRequest({
        sendCopy: true,
        name: "CALLERNAME",
        message: "CALLERPAYLOAD http://evil.example",
      }),
      sendEnv,
    );
    eq(res.status, 200, "status");
    eq(sent.length, 2, "two sends");
    const copy = sent.find((m) => m.to[0] === "ada@example.com");
    if (!copy) throw new Error("no copy addressed to the caller");
    if (copy.html.includes("CALLERPAYLOAD")) throw new Error("message echoed to unverified address");
    if (copy.html.includes("evil.example")) throw new Error("caller URL echoed to unverified address");
    if (copy.html.includes("CALLERNAME")) throw new Error("caller name echoed to unverified address");
    if (copy.subject.includes("CALLERNAME")) throw new Error("caller name echoed in subject");
  });
});

await check("admin notification still carries the full message", async () => {
  await withMockedFetch(async (sent) => {
    await worker.fetch(formRequest({ message: "FULLTEXT" }), sendEnv);
    eq(sent.length, 1, "one send");
    eq(sent[0].to[0], "info@stormberry.as", "recipient");
    if (!sent[0].html.includes("FULLTEXT")) throw new Error("admin lost the message body");
    eq(sent[0].reply_to, "ada@example.com", "reply_to");
  });
});

await check("provider failure returns a generic 502, no provider detail", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const target = typeof input === "string" ? input : input.url;
    if (target.includes("challenges.cloudflare.com")) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "account suspended, billing failed" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const res = await worker.fetch(formRequest(), sendEnv);
    eq(res.status, 502, "status");
    const bodyText = JSON.stringify(await res.json());
    if (bodyText.includes("suspended") || bodyText.includes("billing")) {
      throw new Error(`provider detail leaked to client: ${bodyText}`);
    }
  } finally {
    globalThis.fetch = real;
  }
});

await check("unhandled error returns a generic 500, no stack or message", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("SECRET_INTERNAL_DETAIL");
  };
  try {
    const res = await worker.fetch(formRequest(), sendEnv);
    eq(res.status, 500, "status");
    const bodyText = JSON.stringify(await res.json());
    if (bodyText.includes("SECRET_INTERNAL_DETAIL")) {
      throw new Error(`internal detail leaked: ${bodyText}`);
    }
  } finally {
    globalThis.fetch = real;
  }
});

// --- webhook alert-loop coverage -------------------------------------------

const bouncedAlert = {
  type: "email.bounced",
  data: {
    email_id: "abc-789",
    to: ["alerts@stormberry.as"],
    subject: "Contact form delivery problem: email.bounced",
    bounce: { type: "Permanent", message: "mailbox full" },
  },
};

await check("an alert that itself bounces does NOT generate another alert", async () => {
  const res = await worker.fetch(webhookRequest(bouncedAlert), {
    ...env,
    RESEND_API_KEY: "re_test",
    ALERT_EMAIL: "alerts@stormberry.as",
  });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.alerted, false, "alerted");
  eq(body.reason, "alert-loop-guard", "reason");
});

await check("alert is suppressed when the alert address is the failing one", async () => {
  const res = await worker.fetch(webhookRequest(bounced), {
    ...env,
    RESEND_API_KEY: "re_test",
    ALERT_EMAIL: "info@stormberry.as",
  });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.alerted, false, "alerted");
  eq(body.reason, "alert-recipient-is-failing-address", "reason");
});

await check("delivery_delayed is logged but no longer alerts", async () => {
  const delayed = {
    type: "email.delivery_delayed",
    data: { email_id: "abc-999", to: ["someone@example.com"], subject: "New Inquiry: sales from x" },
  };
  const res = await worker.fetch(webhookRequest(delayed), {
    ...env,
    RESEND_API_KEY: "re_test",
    ALERT_EMAIL: "alerts@stormberry.as",
  });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.ok, true, "ok");
  eq(body.alerted, undefined, "must not have attempted an alert");
});

// Two distinct failure modes, and the first one alone is NOT a regression test for
// the missing try/catch: a non-base64 secret is caught by the pre-existing atob
// guard inside verifySvixSignature and never reaches crypto.subtle.importKey.
await check("non-base64 secret is caught by the atob guard -> 401", async () => {
  const res = await worker.fetch(webhookRequest(delivered), {
    ...env,
    RESEND_WEBHOOK_SECRET: "whsec_!!!not-base64!!!",
  });
  eq(res.status, 401, "status");
});

// "whsec_" is valid base64 for zero bytes, so atob succeeds and importKey is
// reached and throws DataError. Without the handleResendWebhook try/catch this
// is an unlogged 500 from the runtime. THIS is the regression test for finding 7.
await check("zero-length secret reaches importKey and is caught -> logged 500", async () => {
  const seen = [];
  const realError = console.error;
  console.error = (...args) => seen.push(args.join(" "));
  try {
    const res = await worker.fetch(webhookRequest(delivered), {
      ...env,
      RESEND_WEBHOOK_SECRET: "whsec_",
    });
    eq(res.status, 500, "status");
    const body = await res.json();
    eq(body.error, "Internal error", "generic error body");
    if (!seen.some((line) => line.includes("Webhook error"))) {
      throw new Error("importKey failure was not logged by the catch-all");
    }
  } finally {
    console.error = realError;
  }
});

// --- rate limiting -------------------------------------------------------

const limiterStub = (allow) => ({ calls: [], limit(arg) { this.calls.push(arg.key); return { success: allow }; } });

await check("per-IP limit returns 429 before any outbound call", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("must not reach Turnstile or Resend when rate limited");
  };
  try {
    const limiter = limiterStub(false);
    const res = await worker.fetch(
      formRequest({}, { "CF-Connecting-IP": "203.0.113.9" }),
      { ...sendEnv, CONTACT_RATE_LIMIT_IP: limiter },
    );
    eq(res.status, 429, "status");
    eq(limiter.calls[0], "203.0.113.9", "keyed on client IP");
  } finally {
    globalThis.fetch = real;
  }
});

await check("per-recipient limit drops the copy but still notifies the admin", async () => {
  await withMockedFetch(async (sent) => {
    const limiter = limiterStub(false);
    const res = await worker.fetch(formRequest({ sendCopy: true }), {
      ...sendEnv,
      CONTACT_RATE_LIMIT_RECIPIENT: limiter,
    });
    eq(res.status, 200, "status");
    eq(sent.length, 1, "copy suppressed, admin mail still sent");
    eq(sent[0].to[0], "info@stormberry.as", "recipient");
    eq(limiter.calls[0], "ada@example.com", "keyed on the recipient address");
  });
});

await check("an unbound limiter degrades open rather than breaking the form", async () => {
  await withMockedFetch(async (sent) => {
    const res = await worker.fetch(formRequest({ sendCopy: true }), sendEnv);
    eq(res.status, 200, "status");
    eq(sent.length, 2, "both sends proceed when no limiter is bound");
  });
});

await check("a throwing limiter does not take the form down", async () => {
  await withMockedFetch(async (sent) => {
    const res = await worker.fetch(formRequest(), {
      ...sendEnv,
      CONTACT_RATE_LIMIT_IP: { limit() { throw new Error("limiter exploded"); } },
    });
    eq(res.status, 200, "status");
    eq(sent.length, 1, "admin mail still sent");
  });
});

for (const [state, label] of results) console.log(`${state}  ${label}`);
const failed = results.filter(([s]) => s === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

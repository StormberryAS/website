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

await check("OPTIONS preflight still returns CORS headers", async () => {
  const res = await worker.fetch(new Request(BASE, { method: "OPTIONS" }), env);
  eq(res.status, 200, "status");
  eq(res.headers.get("Access-Control-Allow-Origin"), "*", "cors");
});

await check("GET is still rejected", async () => {
  eq((await worker.fetch(new Request(BASE, { method: "GET" }), env)).status, 405, "status");
});

for (const [state, label] of results) console.log(`${state}  ${label}`);
const failed = results.filter(([s]) => s === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

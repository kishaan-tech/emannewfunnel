# Webhook contract — for whoever builds the dashboard

Everything needed to receive and verify submissions from the webinar funnel.
Hand this file to the dashboard developer; they should not need anything else.

---

## 1. What you receive

One `POST` per form submission, `Content-Type: application/json`, sent by the
funnel's relay (`api/register.js`) — never directly by a browser.

### Headers

| Header | Example | Meaning |
|---|---|---|
| `webhook-id` | `req_9f3c...` | Unique per **delivery attempt**. Changes on retry. Log it; never key on it. |
| `webhook-timestamp` | `1754300000` | Unix **seconds** when the relay signed the request. |
| `webhook-signature` | `v1,X21ND...` | HMAC-SHA256, base64. Space-separated list during secret rotation. |
| `user-agent` | `tbo-funnel-relay/1` | Informational only. Do not authenticate on it. |

### Body

```json
{
  "event": "registration",
  "clientEventId": "3f2b...-uuid",
  "submittedAt": "2026-08-12T21:58:03.114Z",
  "receivedAt":  "2026-08-12T21:58:03.402Z",
  "requestId":   "req_9f3c...",
  "client_ip_address": "203.0.113.9",

  "firstName": "Ada", "email": "ada@example.com", "phone": "+1...",
  "stage": "", "question": "",

  "page": "/fboptin",
  "pageUrl": "https://.../fboptin?utm_source=fb&ad_id=...",
  "referrer": "...", "userAgent": "...",
  "webinarISO": "2026-08-12T18:00:00-04:00",
  "eventTitle": "The Brand Operator: Free Live Training",

  "utm_source": "fb", "utm_medium": "paid", "utm_campaign": "brandop_jul",
  "utm_content": "vid3", "utm_term": "amazon fba",
  "campaign_id": "120...", "campaign_name": "Brand Operator — Jul",
  "adset_id": "120...", "adset_name": "IG Feed — Lookalike",
  "ad_id": "999...", "ad_name": "vid3 — hook A",
  "placement": "Instagram_Feed", "site_source_name": "ig",
  "fbclid": "ABC123", "_fbc": "fb.1.1700000000.ABC123", "_fbp": "fb.1....",
  "meta_lead_event_id": "...", "meta_submit_event_id": "...", "meta_complete_event_id": "..."
}
```

- `event` is `"registration"` (opt-in modal) or `"intake"` (thank-you form).
  `stage` and `question` are only populated on `intake`. Branch on `event`.
- The relay **allowlists** fields. Unknown keys are dropped, strings are
  truncated to 2000 chars, so the shape above is the complete set.
- `client_ip_address`, `receivedAt` and `requestId` are set by the relay and
  **overwrite** anything the browser sent. Everything else is client-supplied.

### The three IDs do three different jobs — do not conflate them

| Field | Scope | Use it for |
|---|---|---|
| `clientEventId` | one **submission** | **Your idempotency key.** Same across every retry of that submission; different if the visitor corrects their email and resubmits. |
| `meta_lead_event_id` | one **visit** | Meta CAPI deduplication and visit correlation. **Never** a uniqueness constraint — two distinct submissions in one visit share it. |
| `requestId` / `webhook-id` | one **delivery attempt** | Logs and debugging only. Changes on every retry. |

---

## 2. Verify the signature

### The one rule that breaks implementations

**HMAC the raw body bytes, exactly as received, before any JSON parsing.**
Re-serializing is not byte-stable and will fail intermittently:

```
received raw : {"n": 1.0, "name": "Zoë", "z": 1}
re-serialized: {"n":1,"name":"Zoë","z":1}
identical    : false        <-- signature will not match
```

Capture the raw body first:

- **Express** — `express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); } })`
- **Next.js App Router** — `const raw = await request.text()`, then `JSON.parse(raw)` yourself
- **Next.js Pages Router** — `export const config = { api: { bodyParser: false } }`, read the stream
- **Hono / Workers / Deno / Netlify v2** — `await request.text()`

### Algorithm

```
signed string = webhook-id + "." + webhook-timestamp + "." + rawBody
key           = base64_decode(secret without the "whsec_" prefix)
signature     = "v1," + base64( HMAC_SHA256(key, signed string) )
```

The timestamp is **inside** the signed string, not just a header — otherwise an
attacker rewrites it freely and replay protection is meaningless.

### Node implementation

```js
const crypto = require("crypto");
const TOLERANCE_SEC = 300;

function keyBytes(s) {
  return Buffer.from(String(s).replace(/^whsec_/, ""), "base64");
}

function expectedSig(secret, id, ts, raw) {
  return crypto.createHmac("sha256", keyBytes(secret))
    .update(`${id}.${ts}.${raw}`, "utf8").digest("base64");
}

// secrets: an ARRAY, so rotation is "add the new one, flip, drop the old one".
// raw: the exact bytes received, pre-parse.
function verifyWebhook(secrets, headers, raw) {
  const id  = headers["webhook-id"];
  const ts  = headers["webhook-timestamp"];
  const sig = headers["webhook-signature"];
  if (!id || !ts || !sig) return false;

  const t = Number(ts);
  if (!Number.isFinite(t)) return false;
  // Bidirectional: covers clock skew in both directions, not just staleness.
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > TOLERANCE_SEC) return false;

  const presented = String(sig).split(" ").filter(Boolean);
  let ok = false;
  for (const secret of secrets) {
    const exp = Buffer.from(expectedSig(secret, id, ts, raw), "utf8");
    for (const part of presented) {
      const comma = part.indexOf(",");
      if (comma < 0 || part.slice(0, comma) !== "v1") continue;   // version gate
      const got = Buffer.from(part.slice(comma + 1), "utf8");
      // Length check FIRST: timingSafeEqual throws RangeError on a mismatch.
      // No early return, so timing does not leak which key matched.
      if (got.length === exp.length && crypto.timingSafeEqual(got, exp)) ok = true;
    }
  }
  return ok;
}
```

Express wiring:

```js
app.use("/webhooks/funnel", express.json({
  limit: "64kb",
  verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); }
}));

app.post("/webhooks/funnel", async (req, res) => {
  const secrets = [
    process.env.FUNNEL_SIGNING_SECRET,
    process.env.FUNNEL_SIGNING_SECRET_PREV      // set only during rotation
  ].filter(Boolean);

  if (!verifyWebhook(secrets, req.headers, req.rawBody)) {
    return res.status(401).json({ ok: false, error: "bad_signature" });
  }
  await upsertLead(req.body);                    // idempotent, see section 3
  res.status(200).json({ ok: true });
});
```

On Web-standard runtimes use `crypto.subtle.verify("HMAC", key, sigBytes, msgBytes)`
instead — it is constant-time already, so the `timingSafeEqual` dance is unnecessary.

### Test vector

Verified reproducible. Use it to prove your implementation before going live.

```
secret            : whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
webhook-id        : req_0000000000000000
webhook-timestamp : 1700000000
raw body          : {"event":"registration","clientEventId":"test-0001","email":"a@b.co"}
signed string     : req_0000000000000000.1700000000.{"event":"registration","clientEventId":"test-0001","email":"a@b.co"}
webhook-signature : v1,X21NDljhrbANcdMWXJm6hv8WYTOoLNSl61hQoGNb9TY=
```

Regenerate it yourself:

```bash
node -e 'const c=require("crypto");
const k=Buffer.from("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=","base64");
const b=JSON.stringify({event:"registration",clientEventId:"test-0001",email:"a@b.co"});
console.log("v1,"+c.createHmac("sha256",k).update("req_0000000000000000.1700000000."+b,"utf8").digest("base64"));'
```

That timestamp is in the past, so a live verifier will reject it on the replay
window — correct behaviour. Test `expectedSig()` directly against this vector,
and test the tolerance separately using `Date.now()`.

---

## 3. Respond, and be idempotent

| Situation | Status | Effect on the funnel |
|---|---|---|
| Accepted (or a duplicate you already have) | **200** | Payload dropped from the browser's retry queue. Done. |
| Signature invalid | **401** | Relay returns 502; the browser retries up to 5 times. |
| Anything else / down / timeout | **5xx** | Same retry path. |

**Return 200 for duplicates.** A 409 makes the funnel think delivery failed and
retry harder.

Duplicates are **normal, not exceptional** — the browser has a localStorage
retry queue and a submission may legitimately arrive twice. Dedupe is required:

```sql
create table leads (
  id                 uuid primary key default gen_random_uuid(),
  client_event_id    text not null,
  event              text not null,
  email              text not null,
  first_name         text,
  phone              text,
  stage              text,
  question           text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  campaign_id text, campaign_name text, adset_id text, adset_name text,
  ad_id text, ad_name text, placement text, site_source_name text, fbclid text,
  fbc text, fbp text,
  meta_lead_event_id text,        -- per VISIT: Meta CAPI dedup, not uniqueness
  request_id         text,        -- per DELIVERY: ops only
  page_url           text,
  referrer           text,
  user_agent         text,
  submitted_at       timestamptz, -- client clock: lead timing
  received_at        timestamptz, -- relay clock: ops
  client_ip_address  inet,
  created_at         timestamptz default now()
);

create unique index leads_idem on leads (event, client_event_id);
```

```sql
insert into leads (...) values (...)
on conflict (event, client_event_id) do update
  set client_ip_address = coalesce(excluded.client_ip_address, leads.client_ip_address),
      received_at       = excluded.received_at
returning id;
```

Respond fast. The relay times out a destination at **2500 ms**; slower than that
and the lead is queued for retry even though you may have stored it.

---

## 4. What the signature does and does not prove

**Proves:** the request came out of our relay, the body was not altered in
transit, and it is not a replay older than 5 minutes.

**Does not prove the content is genuine.** `/api/register` is a public,
unauthenticated endpoint — it has to be, since strangers' browsers call it.
Anyone can POST arbitrary JSON to it and receive a validly signed delivery.
Every field in a signed payload is still attacker-supplied.

So: do not show a "verified" badge in the dashboard that implies the *lead* is
trustworthy. It only means the *path* is. Apply normal validation to the
content — email syntax, disposable-domain checks, rate-per-IP — as you would to
any public form.

The relay does provide, before you see it: field allowlisting, 2000-char
truncation, a 16KB body cap, honeypot dropping, and a real `client_ip_address`
taken from a trusted platform header rather than from the browser.

---

## 5. Secret handling

- Generate: `node -e 'console.log("whsec_"+require("crypto").randomBytes(32).toString("base64"))'`
- Store as an environment variable on both sides. Never in a repo, never in a
  ticket, never in chat.
- If it is ever exposed, **rotate** — rewriting git history does not help once
  a value has been pushed or cached.

**Rotation with zero dropped submissions** (dashboard first, so it never rejects):

1. Generate `S2`. On the **dashboard**, set `FUNNEL_SIGNING_SECRET_PREV = S1` and
   deploy. It now accepts either.
2. On the **relay**, set `FUNNEL_SIGNING_SECRET = S2` and deploy. New traffic is
   signed with `S2`, which the dashboard already accepts. In-flight `S1`
   requests still verify.
3. Wait out the replay window plus the browser retry horizon — give it 24h,
   since a queued payload can resurface on a later page load.
4. Remove `FUNNEL_SIGNING_SECRET_PREV` from the dashboard.

During step 2 the relay signs with both keys and sends them space-separated in
`webhook-signature`; the verifier above already handles that.

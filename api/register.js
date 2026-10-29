/* ============================================================================
   SIGNED WEBHOOK RELAY
   ============================================================================
   The browser cannot keep a secret. Everything in assets/js/config.js and
   assets/js/main.js is downloaded by the visitor and readable in devtools, so a
   signing key placed there could be lifted and used to forge signatures. This
   function exists to hold the secret somewhere the visitor cannot reach.

   Flow:   browser  ->  POST /api/register  ->  dashboard (signed) + Zapier

   What it does, in order:
     1. rejects anything that is not a sane JSON POST
     2. drops honeypot hits (looking successful, so bots learn nothing)
     3. copies ONLY known fields across, truncated (an allowlist, not a filter)
     4. overwrites the server-authoritative fields, including the real client IP
     5. signs the exact bytes it is about to send
     6. fans out to the dashboard (required) and Zapier (best effort)
        Survey posts skip registration Zaps (same idea as replay opt-ins).
     7. returns 200 only if the required destination accepted

   Deploy: Vercel, framework preset "Other", no build command, output dir ".".
   Files under api/ are picked up automatically and are never served as static
   assets. CommonJS + require("crypto") so this needs no package.json and the
   repo keeps its no-npm, no-build-step promise.

   Environment variables (host project settings, NEVER in a committed file):
     FUNNEL_SIGNING_SECRET       whsec_<base64>   shared with the dashboard
     FUNNEL_SIGNING_SECRET_PREV  whsec_<base64>   during rotation only
     DASHBOARD_URL               https://...      required destination
     ZAPIER_HOOK_URL             https://a,https://b   optional, one or more
                                 REGISTRATIONS ONLY: skipped for replay opt-ins
     ZAPIER_REPLAY_HOOK_URL      https://a,https://b   optional, replay opt-ins only
     ZAPIER_SURVEY_HOOK_URL      https://a,https://b   optional, survey submissions only
     ALLOWED_ORIGINS             https://a,https://b   only for a cross-origin relay
   ============================================================================ */
"use strict";

const crypto = require("crypto");

const MAX_BODY_BYTES  = 16 * 1024;   // a real submission is well under 2KB
const MAX_FIELD_LEN   = 2000;        // truncate rather than reject
/* Per destination, and they run in parallel, so this is roughly the worst-case
   duration of the whole function.

   THREE NUMBERS HAVE TO STAY ORDERED, or opt-ins duplicate:

     DEST_TIMEOUT_MS (8s)  <  CFG.webhookTimeoutMs (15s)  <  function limit (10s+)
     relay waits for           browser waits for              Vercel kills the
     the dashboard             the relay                      function

   If the browser gives up before the relay answers, it treats a delivery that
   actually succeeded as failed, queues it, and re-sends the whole envelope from
   the next page. The dashboard dedupes on clientEventId so it survives that, but
   Zapier does not, so every one of those is a duplicate Zap run.

   That is exactly what 2500 was doing here. An ops-hub cold start regularly
   passed 2.5s, the relay aborted, returned 502, and the browser retried on the
   confirmation page a second later - while the dashboard had almost certainly
   saved the lead already, because aborting the fetch cancels our WAIT, not the
   work the dashboard is doing. 8s clears a cold start with room to spare. */
const DEST_TIMEOUT_MS = 8000;

/* Forward every form / attribution field the browser sends, with a SAFE-KEY
   gate instead of a hand-maintained allowlist. Adding a hidden input on the
   form (or a Meta URL param the frontend captures) must reach Zapier and the
   dashboard without a relay deploy. Still capped: body size, per-field length,
   and MAX_FORWARD_KEYS stop quota abuse. client_ip_address is denied here and
   always overwritten from a trusted platform header below. */
const DENY_KEYS = {
  client_ip_address: true,   // server-authoritative; never trust the browser
  __proto__: true, constructor: true, prototype: true
};
const MAX_FORWARD_KEYS = 80;
const SAFE_KEY = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;

function envList(name) {
  return String(process.env[name] || "")
    .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
}

/* Secrets are stored as whsec_<base64>; the HMAC key is the decoded bytes. */
function keyBytes(secret) {
  return Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
}

/* Standard Webhooks scheme: HMAC-SHA256 over "id.timestamp.body", base64,
   with a version prefix so the scheme can be rolled without ambiguity. */
function sign(secret, id, ts, body) {
  return "v1," + crypto.createHmac("sha256", keyBytes(secret))
    .update(id + "." + ts + "." + body, "utf8")
    .digest("base64");
}

/* Trusted platform headers ONLY. Never read the client's own
   client_ip_address field: it is attacker-controlled. */
function clientIp(req) {
  const h = req.headers;
  const first = function (v) { return String(v).split(",")[0].trim(); };
  if (h["x-vercel-forwarded-for"]) return first(h["x-vercel-forwarded-for"]);
  if (h["x-real-ip"])              return first(h["x-real-ip"]);
  if (h["x-forwarded-for"])        return first(h["x-forwarded-for"]);
  return "";
}

function deliver(dest, body, headers) {
  return fetch(dest.url, {
    method: "POST",
    headers: headers,
    body: body,
    signal: AbortSignal.timeout(DEST_TIMEOUT_MS)
  }).then(function (res) {
    if (res.ok) return { name: dest.name, ok: true, status: res.status };
    /* On failure, keep a short slice of the destination's own error so a
       misconfiguration is diagnosable without shell access to its logs.
       Only ever populated for non-2xx, and truncated. */
    return res.text().then(function (t) {
      return { name: dest.name, ok: false, status: res.status,
               detail: String(t || "").slice(0, 300) };
    }).catch(function () {
      return { name: dest.name, ok: false, status: res.status };
    });
  }).catch(function (err) {
    return { name: dest.name, ok: false, status: 0, error: (err && err.name) || "fetch_failed" };
  });
}

module.exports = async function handler(req, res) {
  /* --- CORS. Only matters when relayUrl is absolute (relay on another host).
         A same-origin /api/register never triggers any of this. --- */
  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  if (origin && envList("ALLOWED_ORIGINS").indexOf(origin) !== -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  /* --- guards --- */
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  if (String(req.headers["content-type"] || "").indexOf("application/json") === -1) {
    return res.status(415).json({ ok: false, error: "unsupported_media_type" });
  }
  if (Number(req.headers["content-length"] || 0) > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, error: "payload_too_large" });
  }

  /* --- parse --- */
  let incoming = req.body;                       // Vercel parses JSON for us
  if (typeof incoming === "string") {
    try { incoming = JSON.parse(incoming); } catch (err) { incoming = null; }
  }
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return res.status(400).json({ ok: false, error: "bad_json" });
  }

  /* --- honeypot. Return success so the bot never learns it was caught. --- */
  if (typeof incoming.website === "string" && incoming.website.trim() !== "") {
    return res.status(202).json({ ok: true, id: "dropped" });
  }

  /* --- copy safe fields + truncate --- */
  const payload = {};
  let forwarded = 0;
  for (const key of Object.keys(incoming)) {
    if (forwarded >= MAX_FORWARD_KEYS) break;
    if (!SAFE_KEY.test(key) || DENY_KEYS[key]) continue;
    const v = incoming[key];
    if (typeof v === "string") {
      payload[key] = v.slice(0, MAX_FIELD_LEN);
      forwarded += 1;
    } else if (typeof v === "number" || typeof v === "boolean") {
      payload[key] = v;
      forwarded += 1;
    }
  }
  /* HTML uses name="firstname"; the rest of the stack (dashboard, docs, Zaps)
     already keys on firstName. Accept either, prefer the camelCase form. */
  if (!payload.firstName && typeof payload.firstname === "string") {
    payload.firstName = payload.firstname;
  }
  if (!payload.lastName && typeof payload.lastname === "string") {
    payload.lastName = payload.lastname;
  }
  if (!payload.event || !payload.email) {
    return res.status(400).json({ ok: false, error: "missing_required_fields" });
  }

  /* --- enrich. These overwrite anything the browser claimed. --- */
  const id = "req_" + crypto.randomUUID();
  const ts = String(Math.floor(Date.now() / 1000));
  payload.client_ip_address = clientIp(req);
  payload.receivedAt        = new Date().toISOString();
  payload.requestId         = id;

  /* --- sign the EXACT bytes that go on the wire. Serialise ONCE: re-running
         JSON.stringify can produce different bytes (number normalisation,
         unicode escaping), which would make signatures fail intermittently. --- */
  const bodyString = JSON.stringify(payload);
  const secrets = [
    process.env.FUNNEL_SIGNING_SECRET,
    process.env.FUNNEL_SIGNING_SECRET_PREV      // present only during rotation
  ].filter(Boolean);

  /* Signing is OPTIONAL. Set FUNNEL_SIGNING_SECRET and every delivery carries an
     HMAC the receiver can verify. Leave it unset and the relay still forwards,
     unsigned — correct when the destination authenticates some other way, e.g. a
     secret embedded in its own URL. The relay is still worth having either way:
     it keeps that URL (and therefore that secret) out of the public config file,
     fills in the real client IP, and allowlists the fields. */
  const headers = {
    "content-type": "application/json",
    "webhook-id":   id,
    "user-agent":   "tbo-funnel-relay/1"
  };
  if (secrets.length) {
    headers["webhook-timestamp"] = ts;
    headers["webhook-signature"] = secrets.map(function (s) {
      return sign(s, id, ts, bodyString);
    }).join(" ");                                // space separated during rotation
  }

  /* --- fan out --- */
  const dests = [];
  if (process.env.DASHBOARD_URL) {
    dests.push({ name: "dashboard", url: process.env.DASHBOARD_URL, required: true });
  }
  /* --- which Zapier hooks apply to THIS submission ---

     The replay opt-in form carries optin_type="replay". Its leads must not
     reach the webinar registration Zaps: those drive registration follow-up
     (reminders, "your seat is confirmed", the ad account's own reporting), and
     someone opting in to a replay never registered for anything.

     So ZAPIER_HOOK_URL is registrations-only and ZAPIER_REPLAY_HOOK_URL takes
     the replay traffic. The dashboard is unaffected and still receives both, so
     no lead is lost either way; optin_type is what tells them apart there.

     Read off optin_type rather than the page or event name on purpose: the
     field is set in the markup of the form itself, so a new replay-style page
     opts in by copying the field, and a page that forgets it is treated as a
     registration, which is the safe direction to be wrong in (a lead reaches a
     Zap it should not, rather than vanishing). */
  const isReplayOptin =
    String(payload.optin_type || "").trim().toLowerCase() === "replay";
  const isSurvey =
    String(payload.optin_type || "").trim().toLowerCase() === "survey"
    || String(payload.event || "").trim().toLowerCase() === "survey";

  /* Both lists may hold several catch hooks, comma separated, so another Zap
     can be wired up without a code change. Every one stays best effort: a
     required Zapier destination would turn any Zapier hiccup into a 502, a
     browser retry, and a duplicate row on the dashboard. Names are numbered
     once there is more than one so a single failing hook is still identifiable
     in the response and the ops log.

     Surveys have their OWN hook (ZAPIER_SURVEY_HOOK_URL) rather than sending
     nothing: routing them through here instead of straight from the page is
     what gets client_ip_address onto the row the Zap receives. A browser cannot
     read its own IP, so a Catch Hook posted to directly from the page can never
     have one. They still never touch the registration Zaps. */
  const zapierUrls = isReplayOptin
    ? envList("ZAPIER_REPLAY_HOOK_URL")
    : isSurvey
      ? envList("ZAPIER_SURVEY_HOOK_URL")
      : envList("ZAPIER_HOOK_URL");
  const zapierLabel = isReplayOptin ? "zapierReplay"
    : isSurvey ? "zapierSurvey" : "zapier";
  zapierUrls.forEach(function (url, i) {
    dests.push({
      name: zapierUrls.length > 1 ? zapierLabel + (i + 1) : zapierLabel,
      url: url,
      required: false
    });
  });
  if (!dests.length) {
    return res.status(200).json({ ok: true, id: id, note: "no destinations configured" });
  }

  const results = await Promise.all(dests.map(function (d) {
    return deliver(d, bodyString, headers);
  }));

  /* A required destination failing means the browser should keep the payload
     queued and retry. A best-effort destination failing must NOT, or every
     Zapier hiccup would re-deliver to the dashboard as well. */
  const requiredFailed = results.some(function (r, i) {
    return dests[i].required && !r.ok;
  });

  /* Ops log only. NEVER log the payload: function logs retain PII. */
  console.log(JSON.stringify({
    at: "relay", id: id, event: payload.event,
    results: results.map(function (r) { return r.name + ":" + (r.ok ? "ok" : r.status); })
  }));

  return res.status(requiredFailed ? 502 : 200).json({
    ok: !requiredFailed,
    id: id,
    results: results.map(function (r) {
      var out = { name: r.name, ok: r.ok };
      if (!r.ok) {                      // diagnostics only on failure
        out.status = r.status;
        if (r.error)  out.error  = r.error;
        if (r.detail) out.detail = r.detail;
      }
      return out;
    })
  });
};

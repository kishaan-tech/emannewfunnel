# The Brand Operator — Webinar Registration Funnel

A plain static site (no build step, no framework) for Emanuel "Eman LA" Ruiz's free live
Amazon FBA training. Three pages, in the order a visitor sees them:

1. **`fboptin.html`** — registration landing page (opt-in). The modal form redirects to...
2. **`thankyou.html`** — "you're almost registered": two videos plus an intake form. Submitting
   that form redirects to...
3. **`confirmedp.html`** — "your spot is confirmed": progress bar at 100%, confetti burst,
   testimonials, and an objection-handling FAQ.

Open `fboptin.html` by double-clicking it. The pages work from `file://` and from any static
host. **Form delivery is the exception**: it needs the relay function (`api/register.js`),
which requires a functions-capable host such as Vercel or Netlify. With no relay reachable
— a `file://` preview, or a plain static host — the pages behave normally and submissions
simply no-op rather than being stored or sent. See section 3.

---

## File structure

```
fboptin.html               PAID registration landing page (served at /fboptin)
fboptin3.html              paid page, headline + subhead variant (served at /fboptin3)
fboptin5.html              paid page, subhead copy variant (served at /fboptin5)
fboptin6.html              paid page, subhead copy variant (served at /fboptin6)
thankyou.html              "almost registered": videos + intake form
confirmedp.html            "spot confirmed" (phone follow-up variant)
confirmednp.html           same page, no-phone variant
replay-optin.html          post-webinar replay gate (served at /replay-optin)
replay.html                the replay + proof + booking CTAs (served at /replay)
book-call.html             booking calendar (served at /book-call)
igoptin.html               ORGANIC (Instagram) landing page (served at /igoptin)
confirmedig.html           organic "spot confirmed" (served at /confirmedig)
api/register.js            the signed webhook relay (server-side, holds the secret)
assets/css/styles.css      all styles + the theme colours (one place to reskin)
assets/js/config.js        ALL editable settings (dates, numbers, links)  <-- edit this
assets/js/main.js          mechanics: countdown, capacity meter, modal, form, calendar
assets/img/                placeholder SVGs + student result screenshots
assets/testimonials/       raw source images/video (gitignored, not deployed)
.env.example               names of the env vars the relay needs (no values)
WEBHOOK-CONTRACT.md        hand this to whoever builds the dashboard
README.md                  this file
```

---

## 1) Everything you edit to go live is in `assets/js/config.js`

Open `assets/js/config.js` in any text editor. It is one commented object. The values you
will almost certainly change:

| Setting | What it does |
|---|---|
| `webinarISO` | The real date/time of the training **with timezone offset** (e.g. `2026-08-06T18:00:00-07:00`). Drives the countdown and the calendar buttons. |
| `webinarDateLabel` / `webinarTimeLabel` / `timezoneLabel` | The human-readable date/time/timezone shown in the copy. Keep these in sync with `webinarISO` by hand. |
| `seatsTotal` / `seatsTaken` | The capacity meter. "Remaining" = total − taken. |
| `fakeUrgency` | `true` slowly "fills" seats so the meter feels live. **Ships `false`.** See the ethics note below. |
| `seatsFloor` | The drip never pushes "remaining" below this number. |
| `socialProofCount` / `socialProofLabel` | The "Trusted by 300+ operators" line. |
| `ratingStars` / `avatarCount` | Stars and avatars drawn in the social-proof strips. |
| `reminderGroupUrl` | The WhatsApp/Telegram invite link on the thank-you page. |
| `howToAttendVideoUrl` / `whyAttendVideoUrl` | The two video links on the thank-you page. Until each holds a real URL its still stays on `#`. |
| `progressPercent` | Where the thank-you progress bar **starts** (0-100). It advances on its own from there. |
| `progressStepLabel` / `progressDoneLabel` | The small caps label above the bar, and what it changes to at 100%. |
| `googleCalendarUrl` | Leave `""` to auto-build the Google Calendar link from the date. A custom URL here is used verbatim, so it must carry its own join link. |
| `webinarJoinUrl` | **The Zoom link that appears inside the calendar invite.** Set it and the invite's location becomes the link, the notes repeat it, and Apple Calendar draws a Join button. Set it to `""` and the invites fall back to `eventLocation` with no link at all. |
| `privacyUrl` / `termsUrl` | Footer legal links. |
| `year` | Footer copyright year. |
| `eventTitle` / `eventDescription` / `eventLocation` / `eventDurationMinutes` | Calendar event details. |

There is a short **go-live checklist** at the bottom of `config.js` too.

### Timezone offsets (for `webinarISO`)
- Pacific: `-07:00` (summer / PDT), `-08:00` (winter / PST)
- Eastern: `-04:00` (summer / EDT), `-05:00` (winter / EST)

---

## 2) Where the copy lives

All body copy is **placeholder** and lives directly in `fboptin.html` and `thankyou.html`.
Every editable copy block is marked so you can find it fast:

- Visible text is prefixed with `[PLACEHOLDER: ...]`, **or**
- The block is wrapped in `<!-- PLACEHOLDER START -->` / `<!-- PLACEHOLDER END -->` comments.

Search the HTML for `PLACEHOLDER` to jump between every editable string. Rewrite the text
between the markers; leave the tags and `data-*` attributes alone.

**Do not** hardcode dates, numbers, or links into the HTML — those come from `config.js` via
`data-cfg="..."` attributes and are filled in automatically.

### Tone (please keep this)
The copy is written as a grounded **operator**, not a hype guru. When you rewrite it, keep
that register: calm, specific, capital-aware. Avoid income promises ("$10k/mo", "quit your
job"), hype adjectives ("game-changer", "insane", "secret"), and staccato AI-isms
("No fluff. No theory. Just results."). Talk about operators, real businesses, cashflow,
margins, capital, and decisions.

---

## 3) Where form submissions go

Both forms POST **once** to a small server function that ships with this repo,
`api/register.js` — "the relay". The relay holds your secrets, fills in the
visitor's real IP address, signs the payload so your dashboard can prove it came
from you, and forwards it on.

```
browser  ──POST──▶  /api/register  ──┬──▶  your dashboard   (signed)
                          │          └──▶  Zapier           (best effort)
                          │
                    holds the signing secret,
                    the dashboard URL and the
                    Zapier URL — none of which
                    are in the public files
```

### Why a relay, and not just URLs in config.js

`assets/js/config.js` is downloaded by every visitor and readable in devtools.
A Zapier Catch Hook URL **is a credential** — anyone who reads it can post
straight into your Zap, burning your task quota and polluting your email list.
And a signing secret placed there could simply be copied and used to forge
signatures, which is worse than no signing at all because it looks trustworthy.

The relay is the only place those values can live where a visitor cannot read
them. This repo has no bundler, so nothing ever inlines an environment variable
into a file the browser downloads.

### The one thing you edit in config.js

```js
relayUrl: "/api/register",
```

| Value | When |
|---|---|
| `"/api/register"` | Normal. Relay is on the same domain as the site: no CORS, no preflight. |
| `"https://.../api/register"` | Relay on a **different** domain. Add this site's origin to `ALLOWED_ORIGINS`. |
| `""` | Relay off. Falls back to the legacy `webhooks` array (unsigned, public URLs). |

### 3a) Deploying the relay

**Vercel** (least work — `api/*.js` is picked up with no config and never served
as a static file):

1. Import the repo. Framework preset **Other**, build command **empty**, output
   directory `.`.
2. Generate a signing secret:
   ```bash
   node -e 'console.log("whsec_"+require("crypto").randomBytes(32).toString("base64"))'
   ```
3. Settings → Environment Variables, mark them **Sensitive**, set for Production
   *and* Preview:

   | Name | Value |
   |---|---|
   | `FUNNEL_SIGNING_SECRET` | the `whsec_...` you just generated |
   | `DASHBOARD_URL` | your dashboard's ingest endpoint |
   | `ZAPIER_HOOK_URL` | your Zapier Catch Hook URL — comma separate for several |
   | `ALLOWED_ORIGINS` | only if the relay is on another domain |
   | `FUNNEL_SIGNING_SECRET_PREV` | only while rotating — see the contract doc |

4. Give the same `FUNNEL_SIGNING_SECRET` to your dashboard.
5. Deploy, then run the checks in §3c.

**Netlify** is equivalent: the file moves to `netlify/functions/register.mjs`,
must be ESM, and signs with Web Crypto instead of `require("crypto")`. Same wire
format. Ask if you want that variant.

Locally: `npx vercel dev` serves the static pages *and* the function together,
pulling env vars from the linked project or `.env.local`.

`.env.example` lists the variable names with empty values and is committed.
Real values go in the host panel or `.env.local`, which is gitignored — a
committed secret is in git history permanently, and rotation is then the only fix.

### 3b) Verifying on the dashboard

The full spec — headers, algorithm, copy-pasteable Node verifier, a reproducible
test vector, the required database dedupe, and what the signature does and does
not prove — is in **[`WEBHOOK-CONTRACT.md`](WEBHOOK-CONTRACT.md)**. Hand that file
to whoever builds the dashboard.

The short version:

```
webhook-id:        req_<uuid>       unique per delivery attempt
webhook-timestamp: 1754300000       unix seconds
webhook-signature: v1,<base64>      HMAC-SHA256 of  id + "." + ts + "." + rawBody
```

Two things people get wrong: HMAC the **raw** body before parsing (re-serializing
JSON changes bytes and the signature will fail intermittently), and **dedupe on
`clientEventId`** (not `meta_lead_event_id`, which is per *visit* — two different
submissions in one visit share it).

### What gets sent

One JSON body per submission, the same shape from both forms:

```json
{
  "event": "registration",
  "clientEventId": "3f2b...",
  "submittedAt": "...", "receivedAt": "...", "requestId": "req_...",
  "client_ip_address": "203.0.113.9",
  "firstName": "...", "email": "...", "phone": "...",
  "stage": "...", "question": "...",
  "page": "...", "pageUrl": "...", "referrer": "...", "userAgent": "...",
  "webinarISO": "...", "eventTitle": "...",
  "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
  "utm_content": "...", "utm_term": "...",
  "campaign_id": "...", "campaign_name": "...",
  "adset_id": "...", "adset_name": "...",
  "ad_id": "...", "ad_name": "...",
  "placement": "...", "site_source_name": "...", "fbclid": "...",
  "_fbc": "...", "_fbp": "...",
  "meta_lead_event_id": "...", "meta_submit_event_id": "...", "meta_complete_event_id": "..."
}
```

`event` is `"registration"` from the opt-in modal and `"intake"` from the
thank-you form (which also carries `stage` and `question`). Both now carry the
full ad attribution.

### Reliability

- The visitor is **never** made to wait on delivery. Sends fire in parallel with
  an 8s browser timeout (`webhookTimeoutMs`), and `keepalive: true` means the
  redirect cannot cancel an in-flight request.
- If the **dashboard** fails, the relay returns 502, the browser keeps the lead
  in a localStorage queue and retries on the next page load — which happens
  within seconds, since each form redirects. Capped at 25 queued, 5 attempts.
- If **Zapier** fails, the relay still returns 200. Failing the response on a
  best-effort destination would trade a rare miss for a common duplicate.
- Because of that retry queue, **duplicate deliveries are normal**. Your
  dashboard must dedupe on `clientEventId`. This is not optional.

### Two things to know

- **Never put a secret in `config.js` or in a `headers` block.** Everything in
  those files is public. That is the entire reason the relay exists.
- **`client_ip_address` is now filled in**, by the relay, from a trusted platform
  header — and it overwrites whatever the browser claimed. It used to ship empty
  because a browser cannot read its own public IP.

### Meta Pixel deduplication

The three `meta_*_event_id` values are generated once per visit and exposed on
`window.FUNNEL_ATTRIBUTION`. Pass the same ID to the browser Pixel so Meta can
deduplicate it against your server-side CAPI call:

```js
fbq('track', 'Lead', {}, { eventID: window.FUNNEL_ATTRIBUTION.meta_lead_event_id });
```

### 3c) Checking it works

```bash
# the relay is reachable and guards work
curl -i -X POST https://<site>/api/register \
  -H 'content-type: application/json' \
  -d '{"event":"registration","email":"t@example.com","clientEventId":"smoke-1"}'   # 200
curl -i -X GET https://<site>/api/register                                          # 405

# nothing secret is downloadable
curl -s https://<site>/assets/js/config.js | grep -iE 'whsec|secret|hooks\.zapier'  # no hits
curl -sI https://<site>/api/register.js                                             # must NOT return source
```

Then in the browser: DevTools → Network → block `*/api/register`, submit the
form. You should still reach `thankyou.html`, and `localStorage.tbo_webhook_queue`
should hold exactly one entry. Unblock, reload, and it should drain to the
dashboard.

**Privacy note:** no personal data is ever placed in a URL. Only the first name
is passed between pages, via `sessionStorage`.

## 4) The `fakeUrgency` / live-waitroom note

`config.js` ships with `fakeUrgency: true`. When on, the capacity card runs as a live
"waitroom": seats animate in on load, occupied seats keep pulsing, and a few more fill over the
visit so remaining ticks down (never below `seatsFloor`), with a **Live** badge. The seat grid
is a green-to-orange-to-red heatmap (early seats green, nearly-full seats red). The
spots-remaining number is saved in the browser (`seatsStorageKey`), so it stays the same when the
visitor refreshes. Set it to `false` for a static, honest meter.

This urgency is **simulated**. It can mislead registrants, and for a funnel running on paid
Facebook / Instagram ads it can create **ad-policy and consumer-protection exposure** if the
numbers are not real. It is enabled per request; turning it off ships a static meter. Your call.

---

## 5) Reskinning the look

Open `assets/css/styles.css`. At the very top, the `:root` block holds every colour as a CSS
variable. The accent is **bright orange**, which needs three related tokens (a bright orange
cannot carry white text at AA contrast, so text on it is dark and orange text on light uses a
deeper orange):

- **`--accent`** (`#F97316`) is the bright orange for fills, buttons, and accent blocks.
- **`--accent-strong`** (`#B4370A`) is a deeper orange used for orange *text* on light
  backgrounds so it stays readable.
- **`--accent-ink`** (`#1B1206`) is the near-black text that sits on the bright-orange fills.

To reskin, change those three plus **`--accent-wash`** (the soft glow / tint). The graph-paper
grid strength is `--grid-line`; the base canvas is `--canvas`. Two more palette spots are NOT
auto-derived and must be changed by hand if you reskin: the seat-meter heatmap tokens
`--seat-green` / `--seat-orange` / `--seat-red`, the confetti `CONFETTI_COLORS` array in
`assets/js/main.js`, and the hardcoded orange inside the placeholder SVGs in `assets/img/`.

---

## 6) Replacing the placeholder images

`assets/img/` holds labelled solid-colour SVG placeholders (`eman-photo.svg`, `group-photo.svg`,
`logo.svg`, and `how-to-attend-video.svg` / `why-attend-video.svg` for the two thank-you videos).
Swap them for real assets, keeping the same filenames, or update the `src` in the HTML.

On the thank-you page each still is wrapped in a link that opens the configured video URL. To use
a real inline player instead, replace the whole `<a class="video-link">...</a>` with your
`<iframe>` embed. Keep the `data-how-video` / `data-why-video` attribute on whatever element the
visitor clicks, or the progress bar will stop advancing when they watch.

`eman-video.svg` is no longer referenced (it belonged to the removed "while you wait" card) and
can be deleted whenever you like.

---

## 7) The training timeline ("In this free training, you'll discover")

The "what we cover" section is a scroll-activated timeline: rows light top-to-bottom as the
visitor scrolls in, a connector line fills through the badges, and the final row fires a small
confetti burst. It reverses when the visitor scrolls back up, so it replays on the way down.

- Copy: edit the `.tl-lead` (bold line) and `.tl-sub` (muted line) text inside
  `<ul class="timeline">` in `fboptin.html`. The last `<li>` (badge marked `data-final`) is the
  one that celebrates.
- Confetti tuning: change the single line `var count = 24, spread = 30;` inside `fireConfetti()`
  in `assets/js/main.js` (particle count and burst radius). Colours are the `CONFETTI_COLORS`
  array just above that function.
- It respects reduced motion (no particles, instant states) and degrades to a fully-lit
  checklist if JavaScript is off.

---

## 8) Analytics, and the "page flashes blank" reveal hack

Every page loads **Humblytics** (`app.humblytics.com/hmbl.min.js`). Immediately above that
script is a small inline block that sets `documentElement.style.opacity = 0` and registers
`window._hmblReveal()` to put it back. It has to run before first paint, which is why it sits
above the stylesheet.

The failsafe matters: a `setTimeout(window._hmblReveal, 2000)` reveals the page even if the
script never loads. So **if an ad blocker blocks Humblytics, the page is invisible for a full
two seconds** and then appears. That is the usual explanation for "the confirmation page looks
broken." Lower the 2000 if that trade is not worth it.

The **Meta Pixel** is on the paid pages only (`fboptin`, `thankyou`, `confirmedp`,
`confirmednp`). See section 3's "Meta Pixel deduplication" for the event-ID story.

---

## 8a) The phone field is US-only

Beside every phone input is a country-code picker holding a single option, **US +1**, and the
number itself must be **exactly 10 digits**. The field enforces that as you type: it accepts
digits only, drops a leading `1` if you paste a full `+1 212 555 0123`, and stops at 10.

Validation is the actual North American numbering rule, not just a length check, so neither the
area code nor the exchange may start with 0 or 1. `1234567890` and `0000000000` are rejected.

Submissions carry `phone` as `+12125550123` (E.164) and `phone_country_code` as `+1`, so your
dashboard and any SMS tool get one consistent format no matter how it was typed.

**To add another country later:** add an `<option>` to the picker in each of the five forms
(`fboptin`, `fboptin5`, `fboptin6`, `igoptin`, `thankyou`) and add a matching rule to
`isUsablePhone()` in `main.js`. The E.164 assembly already uses the picker's value, so that part
needs no change.

---

## 8c) The post-webinar replay funnel

Three pages for people who attended (or missed) the live training and get sent a follow-up
broadcast:

| Page | Slug | What it does |
|---|---|---|
| `replay-optin.html` | `/replay-optin` | Urgency timer + one button through to the replay |
| `replay.html` | `/replay` | The replay video, the proof stack, repeated "Book my call" |
| `book-call.html` | `/book-call` | Heading plus the booking calendar, nothing competing with it |

They reuse the site's stylesheet and components, so they inherit the type scale, the orange
accent, the buttons and the reveal animation with no page-level styling.

**Three config values run them**, all in `assets/js/config.js`:

| Key | What it does |
|---|---|
| `replayDeadlineISO` | Drives the "Going offline in" countdown on the first two pages. Same timezone-offset rule as `webinarISO` — get the offset wrong and the timer is out by an hour. After it passes both pages swap the timer for a "replay is now offline" line instead of showing zeros. |
| `replayVideoId` | The **Wistia media id** for the replay (the code from the embed URL), not a full URL. |
| `bookCallUrl` | Your Calendly / SavvyCal / etc link. `book-call.html` embeds it in an iframe. |

**Until those hold real values the pages show a loud dashed orange box** where the embed would
be, rather than a silently broken player or an iframe pointed at nonsense. That is deliberate:
an unset booking link should be impossible to miss.

The "Book my call" buttons link to `/book-call`, **not** straight to the calendar URL, so the
booking step stays on your own domain where the Pixel can see it.

These carry the base Meta Pixel and PageView only. No conversion events fire here — those stay
on `confirmedp.html` so the ad account keeps optimising toward registrations.

---

## 9) The two funnels: paid vs organic

There are two independent entry points sharing one stylesheet, one `config.js` and one
`main.js`:

| | Paid (Meta ads) | Organic (Instagram) |
|---|---|---|
| Landing page | `/fboptin` (+ copy variants `/fboptin3`, `/fboptin5`, `/fboptin6`) | `/igoptin` |
| Confirmation | `/confirmedp` or `/confirmednp` | `/confirmedig` |
| Meta Pixel | yes | **no** |
| `_fbp` / `_fbc` / `fbclid` fields | yes | **no** |
| `meta_*_event_id` | yes | **no** |
| `utm_*`, campaign/adset/ad ids | yes | yes |
| Humblytics | yes | yes |
| Capital question decides the page | yes | no, everyone lands on `/confirmedig` |

Both slugs come free from `"cleanUrls": true` in `vercel.json` — `igoptin.html` is served at
`/igoptin`, `confirmedig.html` at `/confirmedig`. No redirect entry is needed, and adding one
risks the strict-validation failure described in `CLAUDE.md`.

**How the organic pages differ mechanically.** Two attributes on `<html>` do all the work:

- `data-organic` — `main.js` reads this once at load into `IS_ORGANIC` and skips every
  Meta-specific branch: no `fbclid` capture, no `_fbp`/`_fbc` cookie reads, no
  `meta_*_event_id` generation, and `mirrorEventIds()` returns immediately so nothing is
  written to `localStorage`.
- `data-confirm-page="confirmedig.html"` — overrides the yes/no confirmation split outright.
  The `$10k` capital question is still asked and still ships to the dashboard and Zapier as a
  qualification field; it just no longer picks the destination, because the split only ever
  existed to control which conversion events fired.

**Tag your Instagram links.** The `utm_*` hidden fields are still on the organic form, so a bio
or story link like `…/igoptin?utm_source=instagram&utm_medium=organic&utm_content=reel-0812`
tells the dashboard which post produced the lead. Untagged links still convert, they just
arrive with blank attribution.

**Keeping them in step.** `igoptin.html` is a copy of `fboptin.html` and `confirmedig.html` a
copy of `confirmednp.html`. Nothing syncs them automatically — a copy headline, a new video or
a price change has to be made in both. Each file says so in a comment at the top.

### `/fboptin3`, `/fboptin5` and `/fboptin6` — the copy variants

Three copies of `fboptin.html`. `/fboptin5` and `/fboptin6` change only the last clause of the
hero subhead; `/fboptin3` changes the headline **and** the subhead.

| | Headline | Subhead |
|---|---|---|
| `/fboptin` | Learn How to Supplement Your Salary With an Amazon Brand by Taking Advantage of Saturation to Find the 'Profit Pockets' that Big Brands Ignore | All without directly competing against them, spending more than 20 hours per week, **or wasting capital on 'testing' and guessing what works** |
| `/fboptin3` | **How to Build an Amazon Brand on the Side That Gives You Your Time Back, by Finding the Profit Pockets Big Brands Ignore.** | All without **quitting your job**, spending more than 20 hours per week, or wasting capital on 'testing' and guessing what works |
| `/fboptin5` | same as `/fboptin` | All without directly competing against them or spending more than 20 hours per week, **all while building an exitable brand** |
| `/fboptin6` | same as `/fboptin` | All without directly competing against them, spending more than 20 hours per week, **or dealing with a big team and logistics** |

`/fboptin5` also drops one comma and turns the second one into "or", because its replacement
clause is not a list item like the other two — the sentence would not parse otherwise.
`/fboptin6` keeps the original three-item shape exactly.

Everything else in both files is identical, deliberately: same Pixel, same attribution fields,
same yes/no `confirmedp` / `confirmednp` split. That is what makes them a fair A/B/C test.

**You do not need to tag the pages to tell their leads apart.** `buildPayload()` already puts
`page` (`/fboptin5`, `/fboptin6`) and `pageUrl` in every webhook envelope, so the dashboard can
split on that. Point one ad set at each URL and compare.

That makes five copies of the paid page in total: a shared change now has to land in
`fboptin.html`, `fboptin3.html`, `fboptin5.html`, `fboptin6.html` **and** `igoptin.html`.

---

## Running it locally

Double-clicking `fboptin.html` works for a quick look. To exercise the full flow (form submit,
`sessionStorage` hand-off, redirect) serve the folder over http, e.g.
`python3 -m http.server 8000 --directory .` then open `http://127.0.0.1:8000/fboptin.html`.
(During this build a tiny no-cache wrapper was used so refreshes always showed the latest edits;
plain `http.server` is fine, just hard-refresh after changes.)

---

## Accessibility & behaviour notes

- Mobile-first; verified to have no horizontal scroll at 375px wide.
- The registration modal is a native `<dialog>`: focus is trapped, `Esc` closes it,
  clicking the backdrop closes it, and focus returns to the button that opened it.
- All motion respects `prefers-reduced-motion: reduce`.
- The countdown updates every second and never goes negative; at zero it shows a
  "we are starting now" state.

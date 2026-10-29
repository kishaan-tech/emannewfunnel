# Task Manager — Eman LA / The Brand Operator Webinar Funnel

_Last updated: 2026-08-09_

Static webinar registration funnel (no framework, no build step) + Vercel relay
at `api/register.js`. Live: `https://live.thebrandoperator.com/`.
Canonical hand-off doc. See `README.md` for how to edit copy/config/form.

---

## Done

- **2026-07-24 — Initial build.** Two pages (`index.html` registration, `thankyou.html`
  confirmation) + `assets/css/styles.css`, `assets/js/config.js`, `assets/js/main.js`, labelled
  placeholder SVGs, `README.md`. Mechanics: live countdown, capacity meter, accessible `<dialog>`
  modal, form validation → `sessionStorage` first-name hand-off → redirect (no PII in URL),
  client-side Google Calendar + `.ics` generation, scroll reveal. Adversarial multi-agent review
  run: 7 findings, all fixed (form-error ARIA, decorative-SVG hiding, duplicate landmarks,
  countdown label alt text, dead `hostName` key wired, title punctuation).
- **2026-07-24 — Rebrand to bright orange.** Two-token system: `--accent` `#F97316` (fills),
  `--accent-strong` `#B4370A` (orange text on light, keeps AA), `--accent-ink` `#1B1206` (text on
  orange). Placeholder SVGs recoloured.
- **2026-07-24 — Live "waitroom" capacity meter.** `fakeUrgency` turned ON (per request). Seats
  breathe in unison (synchronised pulse, no wave), green→orange→red heatmap by seat position
  (~62/28/10 split), drip lowers remaining, **remaining count persists across refresh** via
  `localStorage` (`seatsStorageKey`). Removed the "operators in the room" viewer ticker.
- **2026-07-24 — Misc.** Fixed the hero pill overflow at 375px (wraps + shrinks). Social proof set
  to "Trusted by 50+ operators". Removed the hero intro video; scarcity card now centered.
- **2026-07-24 — Training timeline + confetti.** Replaced "what we cover" with a scroll-activated
  vertical timeline: rows light top-to-bottom, connector line fills through badges, final row
  fires a pure-CSS confetti burst (~24 orange/gold particles) + 🎉. Reverses on scroll-up so it
  replays. Full reduced-motion + JS-off fallbacks. Adversarial multi-agent review run across 6
  dimensions: **0 findings**.

- **2026-07-27 — Thank-you page reworked into an "almost registered" step.** Page order is now
  progress bar, hero, two videos, event details, 3 steps, while-you-wait, form.
  - **Dynamic progress bar** at the top. Starts at `progressPercent` (88) and advances on its
    own as the visitor completes the page, splitting the gap to 100% evenly across three
    tracked actions (watch video 1, watch video 2, submit the form). Completed steps persist
    in `sessionStorage` (`progressStorageKey`) so a refresh never sends the bar backwards; the
    label swaps to `progressDoneLabel` at 100%. `role="progressbar"` with a live `aria-valuenow`.
    Renders correctly at its starting width with JS off.
  - **Headline/subhead** changed to "You're almost registered" + "To save your seat, watch
    these two videos below and join our private group for free..." (client-supplied copy).
    The success checkmark was dropped since the page no longer claims completion.
  - **Two placeholder videos**, no card wrapper: centered headline + caption, then the player,
    then the second headline + caption, then the second player, straight down the page. Each
    still is a link carrying the `data-how-video` / `data-why-video` hook (which is also what
    advances the progress bar). New `howToAttendVideoUrl` / `whyAttendVideoUrl` config keys and
    `how-to-attend-video.svg` / `why-attend-video.svg` placeholders. `initThankYouLinks()`
    generalised into a hook-to-config-key table (`THANKYOU_LINKS`).
  - **Removed the "While you wait" card** (the third video). `watchVideoUrl` and its hook are
    gone; `assets/img/eman-video.svg` is now unreferenced and can be deleted.
  - **Inline intake form** at the bottom (name, email, phone, stage select, question textarea)
    with its own `submitIntake()` integration stub; swaps to a success panel in place rather
    than redirecting, and prefills the first name from `sessionStorage`.
  - `.field` styles extended to cover `select` and `textarea`, not just `input`.
  - Added a global `[hidden] { display: none !important }`, which also fixes a latent bug on
    `index.html`: `.live-badge { display: inline-flex }` was overriding the UA `[hidden]` rule,
    so the "Live" badge would have shown even with `fakeUrgency: false`.

- **2026-07-29/30 — Spacing, attribution, button FX, webhooks, confirmation page.**
  - **Section rhythm reduced and tokenised.** Adjacent sections were stacking `padding-block`,
    so the visible gap was double the token. New `--section-y` in `:root` (34px mobile, 48px
    desktop via a `:root` override inside the 720px media query) makes the whole page's density
    one number. Gap went 112px -> 68px mobile, 160px -> 96px desktop. Also trimmed
    `.section-head` (`--sp-4` -> `--sp-3`), `.site-footer` padding/margin, `.video-stack` gap.
  - **Ad attribution on the opt-in form.** 13 hidden inputs carrying `data-attr`, filled by a new
    attribution module in `main.js`. URL params (`utm_source/medium/content`, `campaign_id`,
    `ad_id`, `placement`, `fbclid`) are captured **first-touch** into `sessionStorage` so they
    survive the hop between pages; `_fbp`/`_fbc` are read fresh from the Pixel cookies at submit
    time (`_fbc` derived from `fbclid` per Meta's `fb.1.<ts>.<fbclid>` format when absent); the
    three `meta_*_event_id` UUIDs are minted once per visit and exposed on
    `window.FUNNEL_ATTRIBUTION` for Pixel/CAPI dedup. `client_ip_address` ships **empty by
    design** and must be filled server-side.
  - **Opt-in CTA animation** (`.btn--fx`): a gloss sweep on a 3.4s loop (1.1s on hover) plus a
    springy lift with the arrow sliding right. Applied to all five CTAs and the modal submit
    button. Buttons now wrap text in `.btn-label` with a `.btn-arrow` span, so `main.js` gained
    `setBtnLabel`/`getBtnLabel` (assigning `textContent` would have deleted the arrow).
  - **Webhooks wired.** Both `submitRegistration()` and `submitIntake()` now POST a shared JSON
    envelope to every entry in `CFG.webhooks` (Zapier + custom dashboard, extensible). Parallel
    sends, 8s timeout, `keepalive:true` so the redirect cannot cancel them, and a capped
    localStorage retry queue flushed at boot so a dropped connection never loses a lead.
  - **New `confirmed.html`**, the page the intake form now redirects to: progress bar hard-coded
    at 100%, a page-wide confetti burst (`initCelebration()`, 90 pieces, reuses
    `CONFETTI_COLORS`, self-removing, skipped under reduced motion), 4 testimonial cards, and a
    7-item objection-handling FAQ built on native `<details>` so it works with JS off. The old
    in-place `[data-intake-done]` success panel in `thankyou.html` was removed as unreachable.
  - **Adversarial review:** 24 findings raised across 5 lenses, 1 survived refutation and was
    fixed: the `.btn--fx::after` gloss painted over the label (positioned pseudo-element beats
    in-flow content), collapsing CTA contrast from 6.6:1 to ~1.9:1 mid-sweep. Fixed with
    `.btn--fx > * { position: relative; z-index: 1 }`.

- **2026-08-09 — Zoom link in the calendar invites.** New `CFG.webinarJoinUrl` holds the Zoom
  URL. When set it becomes the calendar event's `LOCATION` and is appended to the notes, so
  both the Google Calendar button and the `.ics` carry it; the `.ics` additionally emits
  `URL;VALUE=URI`, `CONFERENCE;VALUE=URI;FEATURE=VIDEO;LABEL=Zoom` (Apple Calendar renders this
  as a tappable Join button) and `X-GOOGLE-CONFERENCE` (Google's Join button on .ics import).
  Added RFC 5545 line folding (`foldICSLines()`, octet-accurate, surrogate-safe) because a Zoom
  URL pushes `DESCRIPTION`/`LOCATION` past the 75-octet cap and strict importers drop over-long
  lines. `joinLink()` rejects anything that is not `http…`, so an emptied or placeholder value
  degrades to the old no-link invite rather than shipping placeholder text into a calendar.

- **2026-08-09 — Organic (Instagram) funnel.** `igoptin.html` (copy of `fboptin.html`) and
  `confirmedig.html` (copy of `confirmednp.html`), served at `/igoptin` and `/confirmedig` via
  the existing `cleanUrls` setting — no `vercel.json` change. Meta Pixel block removed from
  both; the six Meta hidden inputs (`_fbp`, `_fbc`, `fbclid`, three `meta_*_event_id`) removed
  from the form. `main.js` gained `IS_ORGANIC`, read once from `data-organic` on `<html>`,
  which skips `fbclid` capture, the Pixel cookie reads and `mirrorEventIds()`. Confirmation
  routing gained a `data-confirm-page` override so organic ignores the yes/no split. Humblytics
  and the `utm_*`/campaign fields were kept on purpose, so IG post attribution still reaches the
  dashboard. The capital question is still asked and still ships as a qualification field.

- **2026-08-09 — Subhead A/B/C variants of the paid opt-in.** `fboptin5.html` (`/fboptin5`) and
  `fboptin6.html` (`/fboptin6`), each a copy of `fboptin.html` differing only in the last clause
  of the hero subhead. `5` replaces "or wasting capital on 'testing' and guessing what works"
  with "all while building an exitable brand" (and repairs the list punctuation, since the new
  clause is not a list item); `6` replaces it with "or dealing with a big team and logistics"
  and keeps the original three-item shape. Pixel, attribution and the yes/no split are untouched
  in both, so the test is fair. No config or `vercel.json` change: `cleanUrls` serves the slugs
  and `buildPayload()`'s existing `page` / `pageUrl` keys are what separates the leads.

- **2026-08-09 — Testimonials were invisible on mobile, every page. Fixed.** The proof section
  (case study, Wistia testimonials, eight result screenshots) rendered but sat at `opacity: 0`
  on phones. Cause: `initReveal()` used `threshold: 0.12`, and `IntersectionObserver`'s
  threshold is a fraction of the observed element's OWN area, not of the viewport. Single
  column on a 375px phone `.proof-grid` is 8071px tall against a ~613px root, so its ratio
  could never exceed 0.076 and `.is-visible` was never added. Images and markup were fine all
  along. Fixed by `threshold: 0`, leaving the negative bottom `rootMargin` to time the reveal,
  which is height-independent. Verified in headless Chrome over CDP at 375x667: bug reproduced
  on the live site, all eight pages revealed after the fix, and the proof grid still starts
  hidden before scrolling, so the animation is preserved rather than disabled.

- **2026-08-09 — All form fields are now mandatory.** Last name and phone were optional on the
  four opt-in forms; phone and the free-text question were optional on the intake form. All are
  required now, as is the `capital_10k` radio group. Because both forms are `novalidate`, the
  `required` attributes are for semantics and screen readers only and the real enforcement is the
  JS: `initForm()` and the intake handler validate each field, light the existing `.has-error`
  treatment and focus the first offender. Phone validates as 7-15 digits (`isUsablePhone`) so
  international formats pass. The `website` honeypot stays un-required by design. New error
  copy + `.choice-field.has-error` styling so the radio group can show an error at all. Verified
  in headless Chrome by submitting each form with one field missing at a time: 7/7 blocked on the
  opt-in form, 6/6 on intake, and the fully-valid case still submits.

- **2026-08-09 — Partial (abandoned-form) capture. REMOVED 2026-08-10 at the client's request;
  kept here only as history, none of it is in the code any more.** Making every field mandatory is exactly
  what creates abandonment, so both forms now post what the visitor had typed if they leave:
  `registration_partial` / `intake_partial`, carrying `isPartial`, `partialId`, `partialSeq`,
  `partialReason`. Fires on 10s idle, tab hidden, `pagehide`, and modal close. Never fires
  without a usable email or phone, never for a filled honeypot, never while a real submit is in
  flight, at most 3 per visit and only on changed content. Uses `sendBeacon` and is never added
  to the retry queue. All four new keys pass the relay's `SAFE_KEY` filter, so no relay change
  was needed. Verified in headless Chrome on both forms (8/8 and 6/6 cases), including that a
  completed registration emits zero partials.

- **2026-08-10 — Phone picker covers every country.** `assets/js/countries.js` (new, data only,
  229 entries as `[name, ISO2, dial]`) is loaded before `main.js` on all five form pages and
  `initPhoneCountry()` builds the `<select>` from it. Validation follows the selection: `+1`
  keeps the exact NANP rule (10 digits, area code and exchange not starting 0 or 1), every other
  country is checked only against the E.164 length bound (4 to `15 - dialLength`). Per-country
  exact lengths are deliberately not attempted; a wrong strict rule silently blocks real
  registrations. Payload now carries `phone_country_iso` too, because a dial code is not unique
  (+1 covers 24 countries). Options are labelled dial-code-first and the select width is pinned
  in CSS: a `<select>` sizes to its widest option, and "Saint Vincent and the Grenadines" made
  it 318px inside a 279px row, leaving 30px for the number input.

- **2026-08-09 — US-only phone with a +1 country picker.** _(superseded the same week by the
  all-countries picker above.)_ Every phone field (four opt-in forms
  + intake) now has a `phone_country_code` select offering only `+1`, and the number itself is
  restricted to exactly 10 digits: `maxlength="10"`, `inputmode="numeric"`, and a live input
  handler that strips non-digits, drops a pasted leading country-code `1`, and caps at 10 while
  preserving the caret. Validation uses the real NANP pattern rather than a digit count. Values
  ship as E.164 (`+12125550123`) plus `phone_country_code`, both of which pass the relay's
  `SAFE_KEY` filter. Verified in headless Chrome at 375px on the registration, organic and
  intake forms: picker has one option, typing 14 digits yields 10, pasted/formatted/lettered
  input all normalise, a 9-digit number is still blocked, the two controls share a row without
  horizontal scroll, and the wire value is `+12125550123`.

- **2026-08-10 — Fixed opt-ins firing twice.** Cause was a timeout inversion, not Zapier. The
  relay gave the dashboard 2.5s (`DEST_TIMEOUT_MS`) and returned 502 when it ran over, and the
  browser queued that "failure" and re-sent the identical envelope from the confirmation page.
  The dashboard had usually saved the lead already (aborting cancels our wait, not its work), so
  the retry was pure duplication, and Zapier has no dedupe. Relay now waits 8s. The browser's own
  `webhookTimeoutMs` had to go 8000 -> 15000 in the same change: it was equal to the new relay
  value, so the browser would have given up at the exact moment the relay replied and retried
  anyway. Reproduced end to end against a deliberately slow (9s) relay in headless Chrome: old
  numbers produced 2 deliveries sharing one `clientEventId` 8.1s apart, fixed produces 1 with an
  empty retry queue.

- **2026-08-10 — Opt-in modal now fits one phone screen.** Content was 873px inside a 627px
  dialog at 375x667, so the submit button sat 143px below the fold of a box that gave no hint it
  scrolled. Now 523px, no internal scroll, button visible. First and last name share a row
  (`.field-row`, ~90px saved) on all four opt-in pages, plus a `@media (max-height: 760px)`
  block that trims modal padding, hides the redundant subhead and the phone hint, and tightens
  the qualifying question's leading. Keyed on height so a tall phone keeps the roomier spacing.
  Input font-size stays 16px (iOS zoom) and tap targets stay >=44px. `dialog.modal` retains
  `overflow-y: auto` deliberately: landscape at 667x375 still cannot fit a 506px form, and
  scrolling beats an unreachable button. Verified on 320x568, 360x640, 375x667, 375x553,
  390x844 and 414x736 — all fit with no internal scroll — and validation re-tested 8/8 after
  the markup change.

- **2026-08-10 — Modal opens high and the keyboard can no longer bury the button.** Three parts:
  the dialog is top-anchored on short screens, autofocus is limited to `(pointer: fine)` so a
  phone does not get a keyboard thrown at it on open, and `.modal-actions` is sticky for the
  overflow cases. A `visualViewport`-driven height was implemented and then **removed on request**
  (2026-08-10): it worked, but shrinking the container as the keyboard rose looked like the page
  collapsing. Height is now fixed at 529px and verified stable across focus and resize events.
  Also trimmed the last 4-6px of overflow, so 320x568 and 375x553 fit with no internal scroll;
  all six tested sizes pass.
- **2026-08-10 — Country picker shows flag + dial code** (`🇺🇸 +1`) instead of the country name,
  built by `flagFor()` from the ISO code. Name preserved in `title=`, list still sorted by name.
  Picker narrowed 104px -> 88px, giving the number input the space back.

- **2026-08-10 — Removed the modal's "Save your seat" heading and its subhead** from all four
  opt-in forms. The dialog switched from `aria-labelledby="modal-title"` to
  `aria-label="Save your seat"`, or it would have had no accessible name left and screen readers
  would announce it as bare "dialog". Removing the heading also let the first row ride up under
  the floating close button: measured, the button (x 311-347, y 22-58) overlapped the Last name
  label box (x 193-343, y 46-67), so a tap at that label's right edge closed the form. The glyphs
  never touched, so it looked fine. Fixed with 34px of top padding on the form. Kept: the field
  labels, the qualifying question, and the "No spam" line under the button.

- **2026-08-11 — New headline variant at `/fboptin3`.** Copy of `fboptin.html` changing the hero
  headline ("How to Build an Amazon Brand on the Side That Gives You Your Time Back, by Finding
  the Profit Pockets Big Brands Ignore.") and its subhead ("All without quitting your job, ...").
  Unlike `/fboptin5` and `/fboptin6`, which move only the subhead's last clause, this one tests a
  different headline angle: time back rather than saturation. Pixel, attribution and the yes/no
  split untouched, so it stays comparable. `cleanUrls` serves the slug; no config or
  `vercel.json` change. Renders at 375px with no horizontal scroll.

- **2026-08-11 — Post-webinar replay funnel: `/replay-optin`, `/replay`, `/book-call`.** Rebuilt
  from a reference funnel's structure with this site's branding. Section order, CTA cadence,
  countdown and disclaimer stack mirror the reference; everything visual comes from
  `styles.css`, and the proof stack is OUR assets (Timmy case study, Wistia clips, the eight
  result screenshots) rather than ported copy — the reference is a different company and its
  testimonials are real claims about its own students. `initCountdowns()` was generalised so
  `data-countdown` takes a config key, letting the replay pages count to `replayDeadlineISO`
  while the webinar pages keep counting to `webinarISO`; verified no regression on `/fboptin`.
  New `initReplayVideo()` / `initBookingEmbed()` fill the two embeds from config and refuse to
  render a placeholder value.
  **Still needed before sending traffic:** `replayVideoId`, `bookCallUrl`, and a real
  `replayDeadlineISO`. All three currently show a dashed placeholder box or a stub date.

- **2026-08-11 — Confirmation steps reordered.** "Add the event to your calendar" is now step 1
  and "Check your email to confirm your invite" step 2, on all three confirmation pages. The
  numbers in `.prep-icon` are hardcoded in the markup, so they were swapped with the blocks
  rather than left to drift out of sync with the visual order. The email step's heading also
  picked up the client's wording ("...to confirm your invite", was "Check your email inbox").
  Calendar buttons, the Zoom-carrying `.ics`, and the Gmail/Outlook/Apple Mail links all verified
  still working after the move.

---

## In Progress

- Nothing mid-flight on the webhook path. Confirmation / Pixel work continued in later commits
  (`confirmedp` / `confirmednp`, Meta Pixel) — treat git log as source of truth for those.

---

## Up Next (to go live)

0. **Tell the dashboard/Zap owner that partial capture is gone.** If anything was built to
   branch on `isPartial` / `partialId`, those events will simply never arrive again.
0. **Click through both new organic pages in a browser** before posting the link. `/igoptin`
   submit should land on `/confirmedig` for BOTH capital answers, Meta Events Manager should
   show nothing at all from either page, and the lead should still appear in Supabase. Also
   download the `.ics` from any confirmation page and open it in Apple Calendar to confirm the
   Zoom Join button renders.
1. **Replace or remove dead Zapier hook `46qdfha`** from `ZAPIER_HOOK_URL` (returns
   `please unsubscribe me!`). Keep `44n4u23` or add a fresh Catch Hook.
2. **Point Meta ads** at URL params for campaign/adset/ad id+name + `site_source_name`
   (dynamic `{{campaign.id}}` etc.) so attribution fields populate.
4. **Optional `.vercelignore`** for `assets/testimonials/` so CLI deploys don't upload ~877MB.
5. **Accessible names for breakout videos 6, 7 and 8.** The visible question headings were
   removed by request, so each iframe's `title` is now the only label a screen reader gets.
   Videos 1-5 carry their real question; `nl3oc5uqbe`, `hrsjeqoucv` and `0wx48zqhb7` still
   read "Breakout video 6/7/8" because their wording was never supplied.
6. **Replace remaining `[PLACEHOLDER]` copy** (tone guardrails apply).
6. **Finish `assets/js/config.js` go-live values** still using placeholders
   (`reminderGroupUrl`, videos, privacy/terms as needed).
7. **Decide on `fakeUrgency`** (currently `true` = simulated scarcity).
8. **Real Privacy / Terms pages**; real testimonials with endorsement proof on file.
9. **Optional:** dashboard-side HMAC verify per `WEBHOOK-CONTRACT.md` (ops-hub currently
   authenticates on `?secret=` only; `FUNNEL_SIGNING_SECRET` may be unset).

---

## Blocked

- None for form delivery (relay + dashboard + zapier2 are live).

---

## Known issues / gotchas

- **Hosting is no longer purely static.** The pages still work anywhere, but form delivery
  needs `api/register.js` on a functions-capable host (Vercel/Netlify). On a plain static
  host or `file://` the relay is skipped and submissions no-op by design.
- **`/api/register` is a public, unauthenticated endpoint** and has to be — strangers'
  browsers call it. The signature proves "this came from our relay", NOT "a human typed
  this". Content validation and rate limiting still belong on the dashboard. Recommended
  next: a Cloudflare rate-limit rule on that path (zero code).
- **Duplicate deliveries are expected**, because the browser has a retry queue. The dashboard
  MUST dedupe on `clientEventId` (per submission) — not `meta_lead_event_id` (per visit).
- **The signing secret must never enter a committed file.** `.env*` is gitignored;
  `.env.example` holds names only. Rotation procedure is in `WEBHOOK-CONTRACT.md` section 5.
- **`fakeUrgency: true` ships simulated scarcity** (drip + heatmap + persisted count). Flagged as
  ad-policy / consumer-protection risk on a paid Meta funnel if the numbers are not real. This is
  the client's call; set to `false` for an honest static meter.
- **Bright-orange contrast tradeoff:** white text on `#F97316` fails AA, so buttons/blocks use
  near-black text and orange *text* uses the deeper `--accent-strong`. Do not switch button text
  back to white without accepting sub-AA contrast.
- **Palette is not fully single-source.** Reskinning touches 4 spots: the `:root` accent tokens,
  the `--seat-*` heatmap tokens, the `CONFETTI_COLORS` array in `main.js`, and the hardcoded
  orange in the `assets/img/*.svg` placeholders.
- **Fonts load from Fontshare/Google** via `<link>`; needs internet for the exact General Sans
  face, otherwise falls back to system sans (everything else still renders).

---

## Verification status (2026-08-09 webhook session)

- Live `POST /api/register` with full Meta + arbitrary custom fields → HTTP 200,
  `dashboard: ok`, `zapier2: ok` (zapier1 unsubscribed).
- Browser submit on `live.thebrandoperator.com` → `confirmed.html`,
  `tbo_webhook_queue: "[]"`, lead row `processed` in Supabase.
- `npm run smoke:custom-eman-brandop` against production: **ALL PASSED** (after secret fix).
- `node --check` on relay/main after field-forwarding change: **passing**.

### Confirmation split (same day, separate change)

- `capital_10k` now routes the redirect: `"yes"` → `confirmedp.html`, `"no"`/unanswered →
  `confirmednp.html`. Both forms go through `confirmationPageFor()`; no hardcoded target remains.
- `node --check` **passing**; routing helper unit-tested in isolation across
  `yes` / `Yes` / `" yes "` / `no` / `""` / `undefined` / `null` — **all passing**.
- **Not clicked through in a browser.** Do one real submit per branch against the live relay
  before running paid traffic, and confirm in Meta Events Manager that the `no` branch fires
  PageView only.

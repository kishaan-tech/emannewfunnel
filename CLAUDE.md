# CLAUDE.md — Eman LA / The Brand Operator Webinar Funnel

> **This repo is a duplicate.** It was copied from the Eman LA / Brand Operator
> funnel with tracked files only (no raw testimonial media, no git history).
> The two tracking IDs were deliberately blanked so this site can never fire
> conversions into the original client's accounts:
>
> - `[PLACEHOLDER_META_PIXEL_ID]` in every page's Meta Pixel block (36 files)
> - `[PLACEHOLDER_HUMBLYTICS_ID]` in every page's Humblytics tag (37 files)
>
> Everything else still describes the original client: copy, `config.js` dates
> and links, the `live.thebrandoperator.com` references below, the testimonials
> and result screenshots, and the 29 opt-in page clones. Replace those before
> launching. Using real student photos or results for a different brand is an
> FTC endorsement problem, not just a copy edit.


Agent guidance for this project. Read alongside `README.md` (how to edit), `TASK-MANAGER.md`
(current status / hand-off), and `DESIGN.md` (visual language).

## What this is
A high-converting **webinar registration funnel**: `fboptin.html` (opt-in landing),
`thankyou.html` (videos + intake) and `confirmedp.html` / `confirmednp.html` (confirmation variants). Plain static site —
**semantic HTML5 + one CSS file + vanilla JS. No framework, no build step, no bundler, no
npm.** The three pages still open from `file://` and deploy to any static host. **Form
delivery additionally requires the relay** (`api/register.js`), which needs a
functions-capable host (Vercel/Netlify); it adds no build step to the site. With no relay
reachable the pages work normally and submissions no-op, which is exactly what a `file://`
preview does. Primary audience is mobile (paid Meta ads), so it is mobile-first and must be flawless at
375px with no horizontal scroll.

## Two funnels
`fboptin` → `confirmedp`/`confirmednp` is the **paid** funnel (Meta Pixel + full Meta
attribution). `igoptin` → `confirmedig` is the **organic Instagram** funnel: same design, same
config, same relay, but **no Pixel and no Meta fields**. Both slugs come free from `cleanUrls`;
do not add redirects for them. Two attributes on `<html>` drive the difference — `data-organic`
(main.js reads it into `IS_ORGANIC` and skips every Meta branch) and `data-confirm-page`
(overrides the yes/no split, so organic always lands on `confirmedig.html`). The organic pages
are **copies**, not includes: a copy or asset change has to be made in both.
`fboptin3.html`/`fboptin5.html`/`fboptin6.html`/`fboptinaa.html`/`fboptinab.html`/
There are now **29 copies of the paid opt-in page**, so a shared copy edit has to land in all
of them: `fboptin.html`, `fboptin3.html`, `fboptin5.html`, `fboptin6.html`, `fboptinaa.html`,
`fboptinab.html`, `fboptinba.html`, `fboptinca.html`, `fboptinda.html`, `igoptin.html`, and
`fboptin-b3v1.html` … `fboptin-b3v17.html`, `fboptin-b3img1.html`,
`fboptin-b3img2.html`.

**Do not hand-edit the clones.** Edit `fboptin.html`, then run
`python3 tools/sync-clones.py`, which copies its body into all 27 byte-identical clones while
leaving each file's own header comment alone. `--check` reports drift without writing and exits
non-zero, so it works as a pre-push check.

The universal headline (2026-09-13) erased the hero copy that made `fboptin3/5/6` variants, so
they are in the synced set now too. **`igoptin.html` is the only paid-page copy that stays
manual**, because it differs structurally rather than in copy: no Pixel and 14 attribution
fields instead of 20. Any shared edit has to be applied to it by hand.

## File map
- `fboptin.html` / `thankyou.html` — the two pages.
- `igoptin.html` / `confirmedig.html` — the organic variants (copies of `fboptin.html` and
  `confirmednp.html` with the Meta Pixel block and the six Meta hidden inputs removed).
- `fboptin3.html` / `fboptin5.html` / `fboptin6.html` / `fboptinaa.html` / `fboptinab.html` /
  `fboptinba.html` / `fboptinca.html` / `fboptinda.html` —
  copies of `fboptin.html` differing only in hero copy. `aa` and `ab` share one headline (the
  "brands they actually own" angle) and differ only in subhead, isolating that as the variable;
  `ba` is a second headline in that set (scaling without headcount), `ca` a third (proven system
  for today's market) and `da` a fourth (commission earners, compounding instead of resetting to
  zero) — the letters read headline-then-subhead. `da` is the only variant naming a narrower
  audience; `ca` is the only one anchored to a season ("take advantage of Q4"), so it dates and
  needs retiring or rewording in January. `5` and `6` change the subhead's last clause; `3` changes the headline and the
  subhead. Same Pixel, same attribution, same yes/no split. Told apart in the dashboard by the
  `page` / `pageUrl` keys already in the envelope.
- `replay-optin.html` / `replay.html` / `book-call.html` — the post-webinar replay funnel.
  Driven by `replayDeadlineISO`, `replayVideoId` and `bookCallUrl` in config; both embeds refuse
  to render while their value is still a `[PLACEHOLDER…]` and show a dashed box instead.
- `assets/js/config.js` — the ONLY file a non-dev edits. All dates, numbers, links live here.
- `assets/js/main.js` — mechanics: countdown, capacity "waitroom" meter, modal, form, calendar,
  scroll reveal, training timeline + confetti. Guards every block so page-specific code no-ops
  on the other page.
- `assets/css/styles.css` — full design system; `:root` tokens at the top.
- `assets/img/*.svg` — labelled placeholder images (hardcode the accent colour).
- `api/register.js` — the signed webhook relay. Holds `FUNNEL_SIGNING_SECRET`,
  `DASHBOARD_URL`, `ZAPIER_HOOK_URL` as env vars; never commit values for these.

## Conventions (follow these)
- **Never hardcode editable content.** Dates/numbers/links come from `config.js` and are injected
  via `data-cfg="key"` (text) / `data-cfg-href="key"` (href). Body copy stays in the HTML but
  every editable string is marked `[PLACEHOLDER: ...]` or wrapped in
  `<!-- PLACEHOLDER START/END -->`. Search `PLACEHOLDER` to find them all.
- **Theme is token-driven** from `:root` in `styles.css`. Do not hardcode colours elsewhere. The
  accent is **bright orange** and needs three tokens because a bright orange cannot carry white
  text at AA: `--accent` (`#F97316`, fills/buttons), `--accent-strong` (`#B4370A`, orange text on
  light), `--accent-ink` (`#1B1206`, text on orange fills). Reskinning also requires updating the
  `--seat-*` heatmap tokens, the `CONFETTI_COLORS` array in `main.js`, and the SVG placeholders.
- **Behaviour hooks are `data-*` attributes** (`data-countdown`, `data-seat-grid`,
  `data-open-register`, `data-timeline`, `data-final`, `data-gcal`, `data-ics`, etc.). JS finds
  work by these, not by fragile selectors.
- **Progressive enhancement is the rule.** Default (no-JS) CSS renders the finished/lit state; JS
  adds a class (`js-ready`, `js-armed`) to enter the animated/dormant state. So JS-off degrades to
  a fully-usable, fully-lit page.
- **`prefers-reduced-motion` must be respected** in both CSS (global `*{animation/transition:none}`
  block) and JS (check `reduceMotion`, skip particle generation and staggered activation).
- **No PII in the URL.** The form stores only the first name in `sessionStorage` and redirects.
  The single integration point is **`relayUrl` in `config.js`**: `main.js` posts one envelope
  there and `api/register.js` signs it and fans it out. Never put a secret in `config.js` or a
  `headers` block — those files are public. See `WEBHOOK-CONTRACT.md`.

## Tone guardrails (copy must obey — this is a premium operator brand, not a hype guru)
Grounded, specific, calm. Use "operators"/"students". **Do NOT** use: income promises ("$10k/mo",
"quit your job", "escape the 9-5"), hype adjectives (secret, insane, game-changer), emojis in body
copy (the one 🎉 in the timeline is the only allowed emoji), em-dashes in prose, curly quotes,
"It's not X, it's Y", self-answered questions, "Here's the kicker", vague authority. See the saved
memory `eman-la-brand-operator` for the full list.

## Gotchas
- **`fakeUrgency` is `true`** — the capacity meter is a simulated live "waitroom." Flagged as an
  ad-policy/consumer-protection risk if numbers aren't real; it's the client's call.
- **Dev-server caching:** `python -m http.server` sends no cache headers, so browsers reuse stale
  CSS/JS and edits look like they "didn't apply." Hard-refresh, or serve with a no-cache wrapper.
- **No git history predates 2026-07-27.** Repo was initialised at session close.
- **`ZAPIER_HOOK_URL` is comma-separated** (one or more Catch Hooks). All Zapier destinations are
  `required: false`; dashboard is `required: true`. A Zapier 404/timeout must never 502 the browser.
- **Relay no longer uses a hand allowlist** — it forwards safe keys (`SAFE_KEY` + deny
  `client_ip_address`). Frontend `collectFormFields()` sends every named input. Adding a hidden
  field no longer needs a relay code change.
- **Two timeouts must stay ordered, or opt-ins duplicate.** `DEST_TIMEOUT_MS` in
  `api/register.js` (how long the relay waits for the dashboard) must be comfortably BELOW
  `CFG.webhookTimeoutMs` in `config.js` (how long the browser waits for the relay), and the relay
  value plus overhead must stay under Vercel's function limit. Now **8s relay / 15s browser**.
  Both used to be 8000 with the relay at 2500: an ops-hub cold start passed 2.5s, the relay
  aborted and returned 502, and the browser queued and re-sent the whole envelope from the
  confirmation page a second later — while the dashboard had already saved the lead, because
  aborting cancels our WAIT, not the dashboard's work. The dashboard dedupes on `clientEventId`
  so it survived; Zapier does not, so every one was a duplicate Zap run. Reproduced against a
  9s relay: old numbers gave 2 deliveries with an identical `clientEventId`, fixed gives 1.
  **Raising only one of the two fixes nothing** — equal values still abort at the same instant.
- **Direct `vercel deploy` from repo root can create a stray project** and try to upload
  `assets/testimonials/` (~877MB) despite `.gitignore`. Prefer git-triggered deploys; if using CLI,
  deploy from a scratch tree of tracked files only. A `.vercelignore` would help.
- **Env vars are Sensitive** — `vercel env pull` returns `[SENSITIVE]` placeholders; you can only
  overwrite, not read back.
- **`vercel.json` is validated STRICTLY and a bad one fails the build silently from the outside.**
  Unknown properties are rejected, including a `"comment"` key inside a `redirects[]` entry, and
  JSON has no comment syntax to fall back on. The failure mode is nasty: the push succeeds, the
  build errors, and production quietly keeps serving the previous deploy, so the site looks alive
  while your change is missing. Cost one confused debugging round on 2026-08-09. Explain redirect
  intent HERE or in `README.md`, never inside the file. To tell what is actually deployed, grep the
  live HTML for a marker only the new commit has, e.g.
  `curl -s https://live.thebrandoperator.com/ | grep -c reg-lastname`.

- **Calendar invites carry the Zoom link via `CFG.webinarJoinUrl`.** When set it replaces
  `eventLocation` and is repeated in the notes, and the `.ics` also emits `URL`, `CONFERENCE`
  (what Apple renders as a Join button) and `X-GOOGLE-CONFERENCE`. `.ics` lines are folded to
  75 octets by `foldICSLines()` — a Zoom URL blows past the RFC 5545 cap and strict importers
  silently drop an over-long line, which looks exactly like "the invite has no link in it".
  An explicit `CFG.googleCalendarUrl` is used verbatim and must carry its own link.

- **The scroll-reveal `threshold` must stay `0`.** `IntersectionObserver`'s `threshold` is a
  share of the OBSERVED ELEMENT'S OWN AREA, not of the screen. It was `0.12`, which is
  unreachable for anything taller than ~8x the viewport, and `.proof-grid` is 8071px on a 375px
  phone against a ~613px root — max ratio 0.076. The testimonials sat at `opacity: 0` on every
  phone, on every page, from the day the screenshots were added. Desktop only escaped because
  the two-column grid is shorter (0.132 at 1280x720, i.e. barely). Timing the reveal is the
  negative bottom `rootMargin`'s job; it is height-independent, `threshold` is not.

- **Every visible form field is REQUIRED** (2026-08-09), on all four opt-in pages and the
  `thankyou.html` intake form. Both forms carry `novalidate`, so the browser enforces nothing and
  `initForm()` / the intake handler in `main.js` are the ONLY gate: adding a `required` attribute
  without adding a JS check does nothing. The `website` honeypot is the one deliberate exception
  and must never become required. Phone uses `isUsablePhone()` (7-15 digits) rather than a format
  regex, so international numbers are not rejected.

- **Phone is US-only, exactly 10 digits.** A `phone_country_code` select sits beside the number
  input offering only `+1`; adding a country is one more `<option>` plus a rule in
  `isUsablePhone()`. Validation is the real NANP pattern (`/^[2-9]\d{2}[2-9]\d{6}$/`), not a
  length check, so `1234567890` and `0000000000` are rejected. Two separate helpers on purpose:
  `phoneDigits()` never truncates and feeds the VALIDATOR, `phoneDigitsCapped()` slices to 10 and
  feeds the INPUT. Truncating inside validation made `+44 7700 900123` pass as `4477009001`.
  `maxlength` alone is not enough either, since it counts characters and would cut a pasted
  `(212) 555-0123` mid-number. On submit `applyPhoneFormat()` rewrites `phone` to E.164
  (`+12125550123`), but only when it validates, so a half-typed partial is never stamped with a
  `+1` it did not have.

- **The opt-in modal must fit one phone screen without scrolling inside itself.** At 375x667 it
  used to run 873px of content in a 627px dialog, putting the submit button 143px below the
  screen with nothing to suggest more existed. Now 523px. It is held there by the `.field-row`
  pairing of first/last name and a `@media (max-height: 760px)` density block (keyed on HEIGHT,
  not width, because it is a vertical problem). Two floors in that block are not negotiable:
  input `font-size` stays **16px** or iOS zooms the page on focus, and tap targets stay at/above
  **44px**. `dialog.modal` keeps `overflow-y: auto` as a last resort so a landscape phone scrolls
  rather than hiding its own submit button. Adding a field to that form means re-measuring.

- **The modal keeps a fixed height when the keyboard opens. Do not re-add a `visualViewport`
  binding.** Sizing the dialog to the visual viewport was tried and rejected: it made the
  container visibly collapse the moment the keyboard appeared, which reads as the page breaking.
  What handles the keyboard instead is position — `dialog.modal` is top-anchored
  (`margin-block: 10px auto`) on short screens, because a `<dialog>` centres itself in the layout
  viewport, which does not shrink for the keyboard, so a centred one puts its lower half behind
  it. Autofocus is skipped unless `(pointer: fine)`, so opening on a phone no longer throws the
  keyboard up over a form nobody has read yet. `.modal-actions` stays `position: sticky` but is a
  no-op at every size that fits; it only matters in landscape.
- **The country picker shows flag + dial code only** (`🇺🇸 +1`), built by `flagFor()` from the ISO
  code via regional indicators. The country name lives in `title=`. Windows Chrome has no flag
  glyphs and renders the letters `US`/`GB` instead, which is legible next to the dial code.

- **`data-countdown`'s VALUE names a config key** (`data-countdown="replayDeadlineISO"`). Empty
  means `webinarISO`, so the original markup still works untouched. Targets are grouped by
  deadline, so one page can run two different timers — `/replay` does.

## Verifying changes
There is no test suite or build. After edits: `node --check assets/js/main.js` (and `config.js`),
then open the page in a browser (serve over http to exercise the form/redirect). State plainly
whether you actually opened it or only reasoned about it. For webhook path: POST
`https://live.thebrandoperator.com/api/register` and confirm `results` includes `dashboard` +
each `zapierN`.

## Last session — 2026-07-27
Built the funnel end to end; rebranded emerald → bright orange (two-token AA system); turned the
capacity meter into a unison-breathing green→orange→red "waitroom" with refresh-persisted count;
fixed the 375px hero pill; replaced "what we cover" with a scroll-activated, reversible training
timeline that fires a CSS confetti burst on the final row. Two adversarial review passes (7
findings fixed, then 0). See `TASK-MANAGER.md` for what's next (real copy, config values, form
integration, policy pages, the `fakeUrgency` decision).

## Last session — 2026-08-09
- Live webhook path fixed: browser → `/api/register` → ops-hub `emanfba` + Zapier. Failure was
  mismatched `ORG_EMANFBA_WEBHOOK_SECRET` vs secret embedded in `DASHBOARD_URL` (rotated both).
- Multi-Zapier: `ZAPIER_HOOK_URL` accepts comma-separated URLs (`zapier` / `zapier1`…).
  Hook `46qdfha` later unsubscribed (`404 please unsubscribe me!`); `44n4u23` still OK.
- Meta/UTM fields expanded, then relay switched to safe-key forward + form DOM collection so
  all custom/hidden fields ship without allowlist edits.
- Browser E2E: opt-in submit → `confirmed.html`, empty `tbo_webhook_queue`, lead in Supabase.
- Later same-day commits (outside the webhook debug thread) also landed Meta Pixel +
  `confirmedp` / `confirmednp` split — see recent git log.
- **Confirmation routing is answer-driven** (`CONFIRMATION SPLIT` in `main.js`). The optional
  `capital_10k` radio decides the destination: `"yes"` → `confirmedp.html` (base pixel + Lead /
  SubmitApplication / CompleteRegistration), anything else → `confirmednp.html` (base pixel only).
  Unanswered groups with `"no"` on purpose — a blank answer is not evidence of qualification and
  must not fire a conversion. The answer is mirrored to `sessionStorage` (`tbo_capital_10k`) so
  the intake form on `thankyou.html`, which never asks it, routes the same way; unreadable
  storage degrades to `confirmednp.html`.

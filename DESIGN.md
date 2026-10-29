# DESIGN.md — The Brand Operator Funnel

The visual language, kept in sync with `assets/css/styles.css`. Calm, premium, "operator/wealth"
feel: a warm off-white graph-paper canvas with white cards floating on it, one confident
bright-orange accent, and restrained motion.

## Color tokens (`:root` in styles.css)
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F7F6F3` | warm off-white page base |
| `--grid-line` | `rgba(20,20,15,.05)` | faint graph-paper grid (48px cells) |
| `--ink` | `#16150F` | near-black headlines |
| `--ink-soft` | `#56544C` | muted body / subheads |
| `--accent` | `#F97316` | **bright orange** — fills, buttons, accent blocks |
| `--accent-strong` | `#B4370A` | deeper orange for orange **text** on light (AA) |
| `--accent-ink` | `#1B1206` | near-black text **on** orange fills (AA) |
| `--accent-wash` | `rgba(249,115,22,.12)` | corner glow + highlight backgrounds |
| `--accent-wash-soft` | `rgba(249,115,22,.06)` | fainter secondary wash |
| `--highlight` | `#B8892B` | warm gold, used very sparingly (stars) |
| `--card` / `--card-border` | `#FFFFFF` / `rgba(20,20,15,.08)` | card surface + hairline |
| `--danger` / `--danger-wash` | `#B23A2E` / `rgba(178,58,46,.08)` | consequence-split negatives only |
| `--seat-green / -orange / -red` | `#1FA25A` / `var(--accent)` / `#E0402C` | capacity heatmap |
| `--shadow` / `--shadow-lg` | soft ambient | card + hover elevation |

**Contrast rule:** the accent is bright, so text on it is dark (`--accent-ink`, ~6.5:1) and orange
text on light uses `--accent-strong` (~5.6:1). Never put white text on `--accent` (fails AA).

Confetti palette (in `main.js`, mirrors the brand): `#F97316`, `#FBA35C` (light orange), `#B8892B`
(gold), `#D8D5CC` (soft neutral). Lean orange + gold; no red/green.

## Typography
- Family: **General Sans** (Fontshare) → Inter → system sans.
- Headlines: weight 800, tight leading (~1.12), letter-spacing -0.01em, `clamp()` sizes.
- Body: 17px, line-height 1.6, measure capped ~65ch.
- Emphasis: `.hl` = `--accent-strong` text on a rounded `--accent-wash` chip. No underlines/italics.

## Spacing & layout
- 8px base scale: `--sp-1..7` = 8 / 16 / 24 / 32 / 40 / 56 / 80.
- Radii: cards 20px, small 12px, pills 999px.
- Single centered column, `max-width: 860px`, generous side padding; the wide margins intentionally
  show the grid canvas. Section rhythm: 56px mobile / 80px desktop.
- Background: graph-paper grid over the whole page + a soft radial corner colour-wash (strong in
  the hero, a fainter one lower) via `body::before`.

## Components
- **Cards** — white, 20px radius, hairline border, soft shadow; float on the canvas.
- **Buttons** — one style: solid `--accent` pill, `--accent-ink` (dark) text, hover lift + faint
  glow. `.btn--ghost` (outline) and `.btn--on-accent` (for orange blocks) variants.
- **Pills** — `--accent-wash` bg, `--accent-strong` text; wraps + shrinks on mobile.
- **Check badges** — filled accent circles, white check; reused across benefit lists.
- **Countdown** — dark flip-style tiles with a center seam; separators pulse.
- **Capacity "waitroom" meter** — 12-col seat grid; filled seats are a green→orange→red heatmap by
  position (~62/28/10). In live mode all filled seats **breathe in unison** (2.8s scale+opacity),
  a Live badge shows, count drips down and persists across refresh.
- **Bonus row** — 3 cards, middle one elevated (filled accent).
- **Consequence split** — negative card (danger wash, X icons) vs positive (accent, checks).
- **Training timeline** — vertical connector threaded through check badges; rows activate on scroll
  (badge pop + ring-flash, text fade-up, connector fill); final row celebrates with an emoji
  pop-in + CSS confetti burst. Reversible on scroll-up.
- **Progress bar** (thank-you) — 10px `--accent-wash` track with an `--accent` fill on a pill
  radius; small-caps step label left, percent right. Fills 0 to its start value over 1.1s on
  load, then eases forward again each time the visitor completes a tracked action. Renders at
  its starting width with JS off.
- **Video block** (thank-you) — no card. Centered headline + caption above a `.media-frame`
  player, stacked down the page with `--sp-6` between blocks. The frame lifts slightly on hover
  since the whole still is the play target.
- **Modal** — native `<dialog>`: trapped focus, Esc + backdrop close, 16px inputs (no iOS zoom).
- **Form fields** — one `.field` style shared by the modal and the inline thank-you form; covers
  `input`, `select` (custom chevron via `.select-wrap`), and `textarea`. 16px text to avoid iOS
  zoom; error state is a `--danger` border plus a `role="alert"` message.
- **Inline intake form** (thank-you) — same fields laid out two-up above 640px (`.intake-grid`,
  `.field--wide` spans both columns); on success the form is replaced in place by a centered
  success panel rather than redirecting.

## Motion
Subtle and purposeful. Scroll reveal (fade/slide-up via IntersectionObserver). Button hover lift.
Meter: unison breathing + remaining-number soft pulse + countdown separator pulse + Live-dot ring.
Timeline: sequential pop/ring/fill/fade, then celebrate + confetti (fires once per pass). Confetti
particles fling out with randomized `--tx/--ty/--rot` and stagger. **Everything is disabled under
`prefers-reduced-motion: reduce`** (instant lit states, no particles).

## Last updated
2026-07-27 — documents the bright-orange rebrand, the breathing heatmap waitroom, and the training
timeline + confetti. Supersedes the original emerald palette.

/* ============================================================================
   THE BRAND OPERATOR — WEBINAR FUNNEL CONFIG
   ----------------------------------------------------------------------------
   This is the ONLY file a non-developer needs to touch to go live.
   Every date, time, number, and link the site uses is defined here.
   Edit the values on the right of each ":" and save. Nothing else required.

   Quick "go live" checklist is at the bottom of this file and in README.md.
   ============================================================================ */

window.FUNNEL_CONFIG = {

  /* ---------------------------------------------------------------------------
     1) WEBINAR DATE & TIME
     ---------------------------------------------------------------------------
     webinarISO drives the live countdown AND the calendar buttons, so it MUST
     be a full ISO 8601 timestamp that INCLUDES the timezone offset.
       Format:  YYYY-MM-DDThh:mm:ss±hh:mm
       Example: "2026-08-06T18:00:00-07:00"  (Aug 6 2026, 6:00 PM Pacific / -07:00)
     Common US offsets:  PT = -07:00 (summer) / -08:00 (winter)
                         ET = -04:00 (summer) / -05:00 (winter)
     The three "Label" fields below are what humans SEE in the copy. Keep them
     in sync with webinarISO by hand (they are display-only text). */
  /* 8:00 PM Eastern = 5:00 PM Pacific. NOTE the offset is -04:00, not -05:00:
     September is still daylight saving, so Eastern is EDT even though people
     say "EST". Writing the literal EST offset here would push the countdown and
     the calendar invite an hour late. DST ends 1 Nov 2026; from then on 8:00 PM
     Eastern is -05:00. */
  webinarISO:        "2026-09-17T20:00:00-04:00",
  webinarDateLabel:  "September 17, 2026",  // shown wherever {WEBINAR_DATE} appears
  webinarDayLabel:   "THURSDAY",          // day of the week in the "LIVE ON ___" heading (keep it matching webinarISO)
  webinarTimeLabel:  "8:00 PM",           // shown wherever {WEBINAR_TIME} appears
  timezoneLabel:     "ET / 5:00 PM PT",                // short tz shown next to the time, e.g. PT / ET / GMT

  /* Which webinar a lead signed up for, shipped with every submission as
     webinar_date so GHL and ActiveCampaign can tag on it.

     Normally leave this EMPTY: main.js derives "August 13th Webinar" from
     webinarISO above, so moving the webinar re-tags every form automatically
     and the tag can never disagree with the date on the page. Set it only when
     a run needs wording of its own, e.g. "September Bootcamp". */
  webinarTagLabel:   "",

  /* The same webinar phrased as the action, shipped as webinar_optin_tag,
     e.g. "August 13th webinar opt in". Also derived from webinarISO, so leave
     this EMPTY unless a run needs its own wording. */
  webinarOptinTagLabel: "",

  /* ---------------------------------------------------------------------------
     2) LIVE ROOM CAPACITY METER
     ---------------------------------------------------------------------------
     The seat grid is a VISUAL representation of how full the room is. It draws a
     fixed number of cells and fills them proportionally to seatsTaken/seatsTotal.
     The "X spots remaining" caption uses the REAL numbers below. */
  seatsTotal:  300,   // total capacity of the live room
  seatsTaken:  247,   // how many are already "taken" (remaining = total - taken)
  seatsFloor:  7,     // the optional drip (below) never pushes remaining below this

  /* fakeUrgency: when TRUE, the capacity card runs as a live "waitroom" — seats
     animate in on load, occupied seats keep pulsing, and a few more fill over the
     visit so remaining ticks down (never below seatsFloor), with a "Live" badge.
     The spots-remaining number is saved in the browser (see seatsStorageKey), so
     it stays the same when the visitor refreshes. When FALSE it is a static meter.
     NOTE / ETHICS: this urgency is SIMULATED. It can mislead registrants and, on a
     paid Meta ads funnel, can create ad-policy and consumer-protection exposure if
     the numbers are not real. Enabled here per request; set to false to ship an
     honest static meter. Your call. */
  fakeUrgency: true,

  /* ---------------------------------------------------------------------------
     2b) THANK-YOU PAGE PROGRESS BAR
     ---------------------------------------------------------------------------
     The bar at the top of thankyou.html that tells the visitor they are not
     finished yet. It is DYNAMIC: it starts at progressPercent and then advances
     on its own as the visitor completes the page, splitting the gap up to 100%
     evenly across the three tracked actions (watch video 1, watch video 2,
     submit the form). Progress is remembered for the session, so a refresh does
     not send the bar backwards. */
  progressPercent:   88,             // 0-100, where the bar STARTS on load
  progressStepLabel: "Almost there", // small label shown above the bar
  progressDoneLabel: "Complete",     // replaces the label once the bar hits 100%
  progressStorageKey: "tbo_progress",// sessionStorage key holding completed steps

  /* ---------------------------------------------------------------------------
     3) SOCIAL PROOF
     --------------------------------------------------------------------------- */
  socialProofCount: "50+",         // number shown in "Trusted by ___ operators"
  socialProofLabel: "operators",   // noun after the count (keep it "operators"/"students")
  ratingStars:      5,             // 1..5, drives the star graphic in the social-proof strip
  avatarCount:      5,             // fallback only: blank circles drawn when avatarImages is empty

  /* Faces in the "Trusted by ... operators" row. Four real students, cropped
     from their own testimonial videos. Nothing here is stock or invented, which
     matters because these sit next to a trust claim, and they are all operators
     rather than staff, which is what the label next to them says.
     Empty the array to fall back to avatarCount blank circles. */
  avatarImages: [
    "assets/img/avatars/avatar-01.jpg",
    "assets/img/avatars/avatar-02.jpg",
    "assets/img/avatars/avatar-03.jpg",
    "assets/img/avatars/avatar-04.jpg"
  ],

  /* ---------------------------------------------------------------------------
     4) LINKS & CALENDAR
     ---------------------------------------------------------------------------
     googleCalendarUrl: leave "" (empty) to have the site BUILD the Google Calendar
       link automatically from the webinar date/time above. Paste your own full
       URL here only if you want to override it.
     The .ics download is always generated automatically from the date/time. */
  googleCalendarUrl: "",
  icsFilename:       "the-brand-operator-training.ics",

  /* The Zoom join link for the live training. This is the URL that shows up
     INSIDE the calendar entry: it becomes the event location, it is repeated in
     the event notes, and Apple Calendar turns it into a real "Join" button. Set
     it to "" and the invites fall back to eventLocation ("Online") with no link
     at all, which is what they did before this key existed. Must start with
     http(s) to be used. */
  webinarJoinUrl: "https://events.zoom.us/ej/AkqiHAis4NoB0qTNDXHzxto40exd_2EguJNzTf5VHDEo_i88DSCP~A7RNztCypQa4NCwt-KIV-4J3uxv5OLWS3-Ias4XD8iK0p10Ckv-26ssmvX0QA",

  /* Reminder group the thank-you page sends people to (WhatsApp / Telegram / SMS).
     Replace the placeholder with your real invite link before running ads. */
  reminderGroupUrl:  "[PLACEHOLDER: paste WhatsApp or Telegram group invite link]",

  /* The two videos on the thank-you page. Paste a full watch/embed URL for each.
     While these still hold a placeholder the stills stay on href="#" so it is
     obvious they are not set yet. Clicking either one advances the progress bar. */
  howToAttendVideoUrl: "[PLACEHOLDER: paste HOW TO ATTEND video URL]",
  whyAttendVideoUrl:   "[PLACEHOLDER: paste WHY YOU SHOULD ATTEND video URL]",

  /* ---------------------------------------------------------------------------
     4b) POST-WEBINAR REPLAY FUNNEL  (/replay-optin, /replay, /book-call)
     ---------------------------------------------------------------------------
     The three pages people get sent AFTER the webinar: a gate that promises the
     replay, the replay itself, and the call booker.

     replayDeadlineISO is the replay's expiry. EMPTY means EVERGREEN: the replay
     never goes offline, and the countdowns are removed from both pages to match.

     To put a deadline back, set a full ISO timestamp with the offset, e.g.
     "2026-11-14T20:00:00-05:00", and the gate re-arms on its own: past that
     moment /replay renders replayOfflineMessage where the player was and the
     /replay-optin teaser stops opening the form, taking an already-open tab
     down in place. You would also need to restore the countdown markup and the
     time-limited copy on both pages, which this change removed.

     Same timezone rule as webinarISO if you do: -04:00 is Eastern in summer,
     -05:00 from November. Get it wrong and the deadline lands an hour out. */
  replayDeadlineISO: "",

  /* Shown where the player was once replayDeadlineISO has passed. */
  replayOfflineMessage: "The replay is now offline.",

  /* The replay video. A Wistia media id (the code in the embed URL), not a full
     URL. While it holds the placeholder the player area shows a labelled box. */
  replayVideoId: "vu4aaivfx4",

  /* The VSL on /vsl. A Wistia media id, same format as replayVideoId. While it
     holds the placeholder the player area shows a labelled box. */
  vslVideoId: "7cbytlrnqp",

  /* Where every "Book my call" button goes. The iClosed event link.
     book-call.html mounts this same URL as an inline iClosed widget. */
  bookCallUrl: "https://app.iclosed.io/e/eman/brand-operator-live-training-application-call",

  /* The exclusive WhatsApp group, step 1 on the three confirmation pages.
     Wired through THANKYOU_LINKS in main.js, not data-cfg-href, because that
     helper only checks truthiness and would write this placeholder string
     straight into the href. While it is unset the Join Group button stays
     inert rather than shipping a broken link. */
  whatsappGroupUrl: "https://chat.whatsapp.com/FXOYbJU76913XoQAahIu31",

  /* Footer legal links. Replace "#" with your real policy pages when ready. */
  privacyUrl: "#",
  termsUrl:   "#",

  /* ---------------------------------------------------------------------------
     5) BRANDING & CALENDAR EVENT DETAILS
     --------------------------------------------------------------------------- */
  brandName: "THE BRAND OPERATOR",   // wordmark text in the top bar
  hostName:  "Emanuel Ruiz",         // host name used in copy
  year:      2026,                    // shown in the footer copyright line

  eventTitle:           "The Brand Operator: Free Live Training",  // calendar event name
  eventDescription:     "A free live Amazon FBA training with Emanuel Ruiz.", // calendar notes
  eventLocation:        "Online",     // calendar location
  eventDurationMinutes: 90,           // used to compute the calendar event end time

  /* ---------------------------------------------------------------------------
     6) WHERE FORM SUBMISSIONS GO
     ---------------------------------------------------------------------------
     Both forms POST once to relayUrl. That is your own small server function
     (api/register.js) deployed alongside this site. The relay is the piece that
     holds your secrets: it fills in the visitor's real IP address, signs the
     data so your dashboard can prove it came from you, and forwards it on.

     Your dashboard URL, your Zapier URL(s) and the signing secret are NOT in
     this file. They live in your host's Environment Variables as DASHBOARD_URL,
     ZAPIER_HOOK_URL (comma separated for several) and FUNNEL_SIGNING_SECRET.
     See README.md section 3.

     WHY: everything in this file is public — anyone can read it in devtools.
     A Zapier Catch Hook URL IS a credential (whoever has it can post into your
     Zap), and a signing secret in here could be lifted and used to forge
     signatures. Moving both behind the relay is the entire point.

     Values for relayUrl:
       "/api/register"      normal. The relay sits on the same domain as this
                            site, so there is no CORS and no preflight.
       "https://.../..."    only if the relay is on a DIFFERENT domain. You must
                            then add this site's origin to ALLOWED_ORIGINS in
                            the relay's environment variables.
       ""                   relay off. Falls back to the `webhooks` list below.

     When relayUrl is set, the `webhooks` list below is ignored entirely.
     Opening the page straight from your desktop (file://) also skips the relay,
     so a local preview never tries to send anything anywhere.
     --------------------------------------------------------------------------- */
  relayUrl: "/api/register",

  /* LEGACY FALLBACK, used only when relayUrl is "". These post straight from the
     browser: unsigned, no real client IP, and every URL here is public. Prefer
     the relay. Leave a url as "" to switch that destination off. */
  webhooks: [
    { name: "zapier",    url: "", noCors: false, headers: {} },
    { name: "dashboard", url: "", noCors: false, headers: {} }
  ],

  /* How long to wait for a webhook before giving up (milliseconds). The visitor
     is never made to wait on this: the send is fired and the page moves on.

     MUST stay comfortably ABOVE the relay's own DEST_TIMEOUT_MS (8s, set in
     api/register.js). If the browser gives up first it records a delivery that
     actually succeeded as failed, queues it, and re-sends the whole envelope
     from the next page. The dashboard dedupes on clientEventId so it survives
     that, but Zapier does not, so each one is a duplicate Zap run. Both numbers
     were 8000, which is why raising only the relay would have fixed nothing. */
  webhookTimeoutMs: 15000,

  /* ---------------------------------------------------------------------------
     7) INTERNAL — you normally do not need to change these
     ---------------------------------------------------------------------------
     Key used to hand the registrant's first name to the thank-you page.
     (Stored in sessionStorage only. No personal data is ever put in the URL.) */
  firstNameStorageKey: "tbo_first_name",

  /* localStorage key that remembers the "spots taken" so the number stays
     consistent across refreshes (used only when fakeUrgency is true). */
  seatsStorageKey: "tbo_seats_taken",

  /* sessionStorage key holding the ad-attribution record (utm_*, Meta
     campaign/adset/ad ids+names, placement, site_source_name, fbclid, and the
     generated Meta event IDs). Captured on the first page of the visit so the
     values survive the hop to thankyou.html. */
  attributionStorageKey: "tbo_attribution",

  /* localStorage key holding submissions that failed to reach a webhook. They
     are retried automatically on the next page load so a lead is not lost to a
     dropped connection. Cleared as soon as delivery succeeds. */
  webhookQueueKey: "tbo_webhook_queue"

};

/* ============================================================================
   GO-LIVE CHECKLIST (edit these, then you are live):
     [ ] webinarISO / webinarDateLabel / webinarTimeLabel / timezoneLabel
     [ ] seatsTotal / seatsTaken  (and decide on fakeUrgency — default OFF)
     [ ] webinarJoinUrl  (the Zoom link that shows up inside the calendar invite)
     [ ] replayDeadlineISO / replayVideoId / bookCallUrl  (the replay funnel)
     [ ] reminderGroupUrl  (real WhatsApp/Telegram link)
     [ ] howToAttendVideoUrl / whyAttendVideoUrl  (thank-you page videos)
     [ ] privacyUrl / termsUrl
     [ ] socialProofCount / socialProofLabel
     [ ] Plug your email tool / CRM into submitRegistration() in main.js
   ============================================================================ */

/* ============================================================================
   THE BRAND OPERATOR — WEBINAR FUNNEL MECHANICS
   Vanilla JS. Reads everything from window.FUNNEL_CONFIG (assets/js/config.js).
   Works on both fboptin.html and thankyou.html; every block guards for the
   elements it needs, so nothing errors on the page that lacks them.
   ============================================================================ */
(function () {
  "use strict";

  var CFG = window.FUNNEL_CONFIG || {};
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------------------
     Small helpers
     ----------------------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Writes a button's text WITHOUT clobbering its children. The opt-in CTA holds
  // a .btn-label plus a .btn-arrow span, so assigning to btn.textContent would
  // delete the arrow the moment the button entered its "Saving..." state.
  function setBtnLabel(btn, text) {
    if (!btn) return;
    var label = $(".btn-label", btn);
    if (label) { label.textContent = text; }
    else { btn.textContent = text; }
  }
  function getBtnLabel(btn) {
    if (!btn) return "";
    var label = $(".btn-label", btn);
    return (label ? label.textContent : btn.textContent).trim();
  }

  // Fill any element carrying data-cfg="key" with the matching config value.
  function fillConfigText() {
    $all("[data-cfg]").forEach(function (el) {
      var key = el.getAttribute("data-cfg");
      if (CFG[key] !== undefined && CFG[key] !== null && CFG[key] !== "") {
        el.textContent = CFG[key];
      }
    });
    // Set href on any element carrying data-cfg-href="key" (footer links, etc.).
    $all("[data-cfg-href]").forEach(function (el) {
      var key = el.getAttribute("data-cfg-href");
      if (CFG[key]) { el.setAttribute("href", CFG[key]); }
    });
    /* Set value on any input carrying data-cfg-value="key". This is how a
       config value rides along in a form submission (the webinar tag below),
       since collectFormFields() reads live input values. */
    $all("[data-cfg-value]").forEach(function (el) {
      var key = el.getAttribute("data-cfg-value");
      if (CFG[key] !== undefined && CFG[key] !== null && CFG[key] !== "") {
        el.value = CFG[key];
      }
    });
  }

  /* -----------------------------------------------------------------------
     WEBINAR TAG  ("August 13th Webinar")

     Ships with every submission as webinar_date, so GHL and ActiveCampaign can
     tag a lead with the specific webinar they signed up for. Derived from
     webinarISO rather than typed out, so moving the webinar re-tags every page
     from the one value nobody can forget to update. CFG.webinarTagLabel
     overrides it when a run needs wording of its own.

     The date is read STRAIGHT OUT OF THE ISO STRING and never through Date().
     webinarISO carries the event's own offset ("2026-08-13T19:00:00-04:00" is
     7pm Eastern); parsing that and formatting in the visitor's timezone would
     tag someone in Tokyo with the 14th while someone in Chicago gets the 13th,
     splitting one webinar across two tags. The literal Y-M-D in the string is
     the webinar's wall-clock date, which is the thing being named.
     ----------------------------------------------------------------------- */
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function ordinalDay(n) {
    // 11th/12th/13th are the exception the %10 rule gets wrong.
    var teens = n % 100;
    if (teens >= 11 && teens <= 13) return n + "th";
    switch (n % 10) {
      case 1:  return n + "st";
      case 2:  return n + "nd";
      case 3:  return n + "rd";
      default: return n + "th";
    }
  }

  /* "August 13th" — the shared half of both tags below, so they can never
     disagree about which day the webinar is on. Empty string if webinarISO is
     unset or malformed, which makes both tags empty rather than half-formed. */
  function webinarDateWords() {
    var m = /^(\d{4})-(\d{2})-(\d{2})T/.exec(String(CFG.webinarISO || "").trim());
    if (!m) return "";
    var month = MONTH_NAMES[Number(m[2]) - 1];
    var day = Number(m[3]);
    if (!month || !(day >= 1 && day <= 31)) return "";
    return month + " " + ordinalDay(day);
  }

  // webinar_date -> "August 13th Webinar"
  function webinarTag() {
    var explicit = String(CFG.webinarTagLabel || "").trim();
    if (looksConfigured(explicit)) return explicit;
    var words = webinarDateWords();
    return words ? words + " Webinar" : "";
  }

  // webinar_optin_tag -> "August 13th webinar opt in"
  function webinarOptinTag() {
    var explicit = String(CFG.webinarOptinTagLabel || "").trim();
    if (looksConfigured(explicit)) return explicit;
    var words = webinarDateWords();
    return words ? words + " webinar opt in" : "";
  }

  /* -----------------------------------------------------------------------
     ATTRIBUTION / TRACKING FIELDS

     Fills every <input data-attr="key"> in a form. Three different sources:

       1. URL query string (utm_*, Meta campaign/adset/ad ids+names,
          placement, site_source_name, fbclid). Captured FIRST-TOUCH: stored
          on the first page of the visit so the values survive the hop to
          thankyou.html, where the query string is gone. A later page WITHOUT
          the params does not blank them out; a later page WITH new params
          does overwrite (a genuine re-click).

       2. Meta Pixel cookies (_fbp, _fbc). Read fresh at fill time because the
          pixel may write them after this script runs. If the pixel has not
          written _fbc yet but the URL carried fbclid, _fbc is derived using
          Meta's documented format: fb.1.<timestamp>.<fbclid>

       3. Generated event IDs (meta_*_event_id). Created once per visit and
          persisted, so the browser Pixel and your server-side CAPI call can
          send the SAME eventID and Meta deduplicates them instead of
          double-counting. Read them from window.FUNNEL_ATTRIBUTION when you
          fire the Pixel.

     client_ip_address is deliberately NOT set here. A browser cannot read its
     own public IP without calling a third-party service, so the field ships
     empty and your endpoint must fill it from the inbound request.
     ----------------------------------------------------------------------- */
  /* The organic (Instagram) pages carry data-organic on <html>. They have no
     Meta Pixel, so every Meta-specific piece of this module is dead weight
     there: fbclid has nothing to attribute, _fbp/_fbc cookies are never written,
     and the meta_*_event_id values exist purely to dedupe a Pixel event against
     a CAPI call that this funnel never sends. Read from the document rather than
     config because it is a property of the PAGE, not of the campaign, and both
     funnels share one config.js. */
  var IS_ORGANIC = (function () {
    try { return document.documentElement.hasAttribute("data-organic"); }
    catch (err) { return false; }
  })();

  var ATTR_URL_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "campaign_id", "campaign_name", "adset_id", "adset_name",
    "ad_id", "ad_name", "placement", "site_source_name"
  ];
  // Paid only. Organic keeps the utm_* keys above so an IG bio or story link
  // tagged utm_source=instagram still tells the dashboard which post converted.
  if (!IS_ORGANIC) { ATTR_URL_KEYS.push("fbclid"); }

  var ATTR_EVENT_KEYS = IS_ORGANIC ? [] : [
    "meta_lead_event_id", "meta_submit_event_id", "meta_complete_event_id"
  ];
  var ATTR_KEY = (CFG.attributionStorageKey || "tbo_attribution");

  function readCookie(name) {
    var parts = String(document.cookie || "").split(";");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].trim();
      var eq = kv.indexOf("=");
      if (eq > -1 && kv.slice(0, eq) === name) {
        return decodeURIComponent(kv.slice(eq + 1));
      }
    }
    return "";
  }

  function newEventId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      if (window.crypto && window.crypto.getRandomValues) {
        var b = new Uint8Array(16);
        window.crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;   // version 4
        b[8] = (b[8] & 0x3f) | 0x80;   // variant 10x
        var hex = "";
        for (var i = 0; i < b.length; i++) { hex += (b[i] + 0x100).toString(16).slice(1); }
        return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) +
               "-" + hex.slice(16, 20) + "-" + hex.slice(20);
      }
    } catch (err) { /* fall through to the non-crypto id below */ }
    return "e-" + Date.now().toString(16) + "-" +
           Math.floor(Math.random() * 0xffffffff).toString(16);
  }

  function loadStoredAttribution() {
    try {
      var raw = sessionStorage.getItem(ATTR_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (err) { return {}; }  // private mode / bad JSON: start clean
  }

  function saveStoredAttribution(store) {
    try { sessionStorage.setItem(ATTR_KEY, JSON.stringify(store)); }
    catch (err) { /* private mode: attribution is per-page-load only */ }
  }

  // Builds (and persists) the attribution record for this visit.
  function buildAttribution() {
    var store = loadStoredAttribution();
    var params;
    try { params = new URLSearchParams(window.location.search); }
    catch (err) { params = null; }

    // 1. URL params — first touch wins, but a fresh param overwrites.
    ATTR_URL_KEYS.forEach(function (key) {
      var val = params ? (params.get(key) || "") : "";
      if (val) { store[key] = val; }
      else if (typeof store[key] !== "string") { store[key] = ""; }
    });

    // 2. Event IDs — generate once, then reuse for the whole visit.
    ATTR_EVENT_KEYS.forEach(function (key) {
      if (!store[key]) { store[key] = newEventId(); }
    });

    saveStoredAttribution(store);

    // 3. Cookies — always read live, never cached. Skipped on the organic pages:
    //    with no Pixel on the page these cookies are never written, and reading
    //    them would only ship empty Meta fields the organic form does not have.
    var out = {};
    Object.keys(store).forEach(function (k) { out[k] = store[k]; });

    if (!IS_ORGANIC) {
      out._fbp = readCookie("_fbp");
      var fbc = readCookie("_fbc");
      if (!fbc && out.fbclid) {
        // Meta's documented shape when you have to build it yourself.
        fbc = "fb.1." + Date.now() + "." + out.fbclid;
      }
      out._fbc = fbc;
    }

    // Never guessed client-side; the receiving server fills this in.
    out.client_ip_address = "";

    return out;
  }

  /* Mirror the three Meta event IDs into localStorage under their bare key
     names, because the Pixel event snippets read them with
     localStorage.getItem('meta_lead_event_id') and friends.

     Two things make this fiddly, both handled here:

     1. It runs SYNCHRONOUSLY, at script execution, not inside boot(). The event
        snippets sit in <head> and register their own DOMContentLoaded handlers,
        which therefore fire BEFORE boot()'s. Anything written inside boot()
        would not exist yet and every event would silently no-op.

     2. It is rewritten on every page load rather than written once. The IDs are
        per-VISIT (they live in sessionStorage), so leaving a stale copy in
        localStorage would make a returning visitor reuse an old event ID and
        Meta would discard the second conversion as a duplicate. */
  function mirrorEventIds() {
    // Organic pages have no Pixel snippet to read these, so nothing is written.
    if (IS_ORGANIC) return;
    try {
      var record = buildAttribution();
      ATTR_EVENT_KEYS.forEach(function (key) {
        if (record[key]) { localStorage.setItem(key, record[key]); }
      });
    } catch (err) { /* private mode: the Pixel events simply do not dedupe */ }
  }
  mirrorEventIds();

  // Exposed so your Meta Pixel snippet can reuse the same event IDs:
  //   fbq('track', 'Lead', {}, { eventID: window.FUNNEL_ATTRIBUTION.meta_lead_event_id })
  function initAttribution() {
    var attribution = buildAttribution();
    window.FUNNEL_ATTRIBUTION = attribution;

    $all("[data-attr]").forEach(function (el) {
      var key = el.getAttribute("data-attr");
      if (Object.prototype.hasOwnProperty.call(attribution, key)) {
        el.value = attribution[key];
      }
    });

    return attribution;
  }

  // Re-reads cookies at submit time (the pixel may have landed since page load).
  function currentAttribution(form) {
    var attribution = buildAttribution();
    window.FUNNEL_ATTRIBUTION = attribution;
    if (form) {
      $all("[data-attr]", form).forEach(function (el) {
        var key = el.getAttribute("data-attr");
        if (Object.prototype.hasOwnProperty.call(attribution, key)) {
          el.value = attribution[key];
        }
      });
    }
    return attribution;
  }

  /* -----------------------------------------------------------------------
     REPLAY FUNNEL: the two embeds that come from config rather than markup.

     Both refuse to render anything until their config value looks real. A
     "[PLACEHOLDER: ...]" string would otherwise become a Wistia id that 404s or
     an iframe pointed at nonsense, and a broken embed is much harder to spot
     than an obviously-unset box.
     ----------------------------------------------------------------------- */
  function looksConfigured(value) {
    var v = String(value || "").trim();
    return v !== "" && v.indexOf("[PLACEHOLDER") !== 0;
  }

  function placeholderBox(label) {
    return '<div class="embed-placeholder">' + escapeHTML(label) + "</div>";
  }

  function offlineBox(label) {
    return '<div class="embed-offline">' + escapeHTML(label) + "</div>";
  }

  function offlineMessage() {
    return String(CFG.replayOfflineMessage || "").trim() || "The replay is now offline.";
  }

  /* -----------------------------------------------------------------------
     REPLAY EXPIRY

     replayDeadlineISO is a real gate, not just what the countdown counts to:
     past it the player is not rendered and the opt-in teaser stops opening the
     form. Worth being straight about the limit — this is client-side, so it
     stops the honest majority, not someone reading the page source. Pulling the
     media in Wistia is what makes it actually unreachable.
     ----------------------------------------------------------------------- */
  function replayDeadlineMs() {
    var iso = String(CFG.replayDeadlineISO || "").trim();
    if (!looksConfigured(iso)) return NaN;
    return Date.parse(iso);
  }

  function replayHasExpired() {
    var end = replayDeadlineMs();
    return isFinite(end) && Date.now() >= end;
  }

  /* Runs fn the moment the deadline passes, so a tab left open past it is taken
     down in place rather than staying playable until the next reload.
     setTimeout's delay is a signed 32-bit int: anything past ~24.8 days
     overflows and fires IMMEDIATELY, which would blank a live replay, so a
     deadline further out than that is left to the next page load. */
  function whenReplayExpires(fn) {
    var end = replayDeadlineMs();
    if (!isFinite(end)) return;
    var ms = end - Date.now();
    if (ms <= 0) { fn(); return; }
    if (ms > 2147483647) return;
    setTimeout(fn, ms);
  }

  function initReplayVideo() {
    var host = $("[data-replay-video]");
    if (!host) return;

    function takeDown() { host.innerHTML = offlineBox(offlineMessage()); }

    if (replayHasExpired()) { takeDown(); return; }

    var id = String(CFG.replayVideoId || "").trim();
    if (!looksConfigured(id) || !/^[A-Za-z0-9]+$/.test(id)) {
      host.innerHTML = placeholderBox("[PLACEHOLDER: set replayVideoId in config.js]");
      return;
    }
    // Same embed shape the testimonial players use, at 16:9 for a full session.
    host.innerHTML =
      '<script src="https://fast.wistia.com/embed/' + id + '.js" async type="module"><\/script>' +
      '<wistia-player media-id="' + id + '" aspect="1.7778"></wistia-player>';

    whenReplayExpires(takeDown);
  }

  /* The VSL on /vsl. Same refusal rule as the replay player: a placeholder id
     shows a labelled box, never a Wistia embed that 404s. No expiry. */
  function initVslVideo() {
    var host = $("[data-vsl-video]");
    if (!host) return;
    var id = String(CFG.vslVideoId || "").trim();
    if (!looksConfigured(id) || !/^[A-Za-z0-9]+$/.test(id)) {
      host.innerHTML = placeholderBox("[PLACEHOLDER: set vslVideoId in config.js]");
      return;
    }
    host.innerHTML =
      '<script src="https://fast.wistia.com/embed/' + id + '.js" async type="module"><\/script>' +
      '<wistia-player media-id="' + id + '" aspect="1.7778"></wistia-player>';
  }

  /* The locked poster on /replay-optin. Paints the replay's own Wistia swatch
     behind the opt-in button, blurred by CSS. Deliberately NOT a player: the
     page gates the video, so nothing here can be pressed into playing it.

     While replayVideoId is a placeholder the CSS gradient stays, which is why
     this only ever ADDS a background-image and never clears one. */
  function initReplayTeaser() {
    var teaser = $("[data-replay-teaser]");
    if (!teaser) return;

    /* Past the deadline there is nothing to unlock, so the button goes rather
       than opening a form that would collect a lead and then hand them a dead
       page. The poster and veil stay: the box still reads as a video, just a
       closed one. */
    function takeDown() {
      var body = $(".replay-teaser__body", teaser);
      if (!body) return;
      body.innerHTML = '<p class="replay-teaser__label"></p>';
      $(".replay-teaser__label", body).textContent = offlineMessage();
    }

    if (replayHasExpired()) { takeDown(); return; }

    var poster = $("[data-replay-poster]", teaser);
    var id = String(CFG.replayVideoId || "").trim();
    if (poster && looksConfigured(id) && /^[A-Za-z0-9]+$/.test(id)) {
      poster.style.backgroundImage =
        "url('https://fast.wistia.com/embed/medias/" + id + "/swatch')";
    }

    whenReplayExpires(takeDown);
  }

  /* -----------------------------------------------------------------------
     STICKY MOBILE CTA

     Reveals [data-sticky-cta] once the hero's own register button has left the
     viewport, and hides it again on the way back up, so the two are never on
     screen together.

     threshold is 0 and stays 0. IntersectionObserver's threshold is a share of
     the OBSERVED ELEMENT'S area, not of the screen, which is the trap that left
     the testimonials invisible on every phone earlier in this project. A button
     is small enough that it would not matter here, but 0 is the honest value for
     "any part of it is showing".

     No observer (old browser) means the bar is shown unconditionally: a
     duplicate button is a far smaller problem than no CTA at all.
     ----------------------------------------------------------------------- */
  function initStickyCta() {
    var bar = $("[data-sticky-cta]");
    if (!bar) return;                       // not an opt-in page

    function show(on) {
      bar.classList.toggle("is-visible", !!on);
      bar.setAttribute("aria-hidden", on ? "false" : "true");
      // Only pad the page while the bar is really there, so a page that never
      // reveals it keeps its own spacing.
      document.body.classList.toggle("has-sticky-cta", !!on);
    }
    show(false);

    var heroBtn = $(".hero [data-open-register]");
    if (!heroBtn || typeof window.IntersectionObserver !== "function") {
      show(true);
      return;
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { show(!entry.isIntersecting); });
    }, { threshold: 0 }).observe(heroBtn);
  }

  function initBookingEmbed() {
    var host = $("[data-booking-embed]");
    if (!host) return;
    var url = String(CFG.bookCallUrl || "").trim();
    if (!looksConfigured(url) || url.indexOf("http") !== 0) {
      host.innerHTML = placeholderBox("[PLACEHOLDER: set bookCallUrl in config.js]");
      return;
    }
    // iClosed's inline widget: an empty div carrying the event URL, plus their
    // loader, which scans for .iclosed-widget and injects the calendar iframe.
    // The div is created BEFORE the loader is appended so there is always
    // something for it to find, whichever order the two resolve in.
    var widget = document.createElement("div");
    widget.className = "iclosed-widget";
    widget.setAttribute("data-url", url);
    widget.title = "Choose a time for your call";
    widget.style.width = "100%";
    widget.style.height = "100%";
    host.appendChild(widget);

    // iClosed's loader sizes only the widget div it was given, from these
    // messages, as the form and calendar change height. Without following along
    // the host keeps its fixed CSS height and the calendar spills out over
    // whatever comes next. The CSS height stays as the size before the first
    // message, and the fallback if none ever arrives.
    window.addEventListener("message", function (e) {
      if (e.origin !== "https://app.iclosed.io" || !e.data) return;
      if (e.data.type !== "iclosed.widget_height") return;
      var frame = widget.querySelector("iframe");
      if (!frame || e.source !== frame.contentWindow) return;
      host.style.height = String(e.data.height);
    });

    // Loaded once. Re-adding the tag on a second call would mount a second
    // calendar rather than refreshing the first.
    var SRC = "https://app.iclosed.io/assets/widget.js";
    if (!document.querySelector('script[src="' + SRC + '"]')) {
      var loader = document.createElement("script");
      loader.type = "text/javascript";
      loader.src = SRC;
      loader.async = true;
      document.body.appendChild(loader);
    }
  }

  /* -----------------------------------------------------------------------
     SOCIAL PROOF: fill every strip's avatars + stars from config.
     (Avatars are placeholder coloured circles; swap for real headshots later.)
     ----------------------------------------------------------------------- */
  function initSocialProof() {
    var avatarCount = Math.max(0, Number(CFG.avatarCount) || 0);
    var stars = Math.min(5, Math.max(0, Number(CFG.ratingStars) || 0));
    var starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';

    /* Real faces when config supplies them, blank circles otherwise. The row is
       decorative and carries no names, so the images get an empty alt and the
       whole strip stays aria-hidden in the markup: a screen reader gets the
       "Trusted by N operators" label, not four unlabelled photos. */
    var avatarImages = Array.isArray(CFG.avatarImages) ? CFG.avatarImages : [];
    $all("[data-avatars]").forEach(function (el) {
      var html = "";
      if (avatarImages.length) {
        avatarImages.forEach(function (src) {
          html += '<img src="' + src + '" alt="" loading="lazy" decoding="async" width="34" height="34" />';
        });
      } else {
        for (var i = 0; i < avatarCount; i++) { html += '<span class="avatar"></span>'; }
      }
      el.innerHTML = html;
    });
    $all("[data-stars]").forEach(function (el) {
      var html = "";
      for (var i = 0; i < stars; i++) { html += starSvg; }
      el.innerHTML = html;
    });
  }

  /* -----------------------------------------------------------------------
     COUNTDOWN
     One module, rendered into EVERY [data-countdown] element on the page.
     Counts down to CFG.webinarISO; never goes negative; shows a live state
     at zero.
     ----------------------------------------------------------------------- */
  /* Every [data-countdown] on the page. The attribute's VALUE names the config
     key holding its deadline, so the replay pages can run "going offline in"
     off replayDeadlineISO while the webinar pages keep counting to webinarISO.
     An empty value (the original markup) still means webinarISO, so nothing
     that existed before this needed touching. Targets are grouped by deadline
     because a page can legitimately show two different ones. */
  function initCountdowns() {
    var targets = $all("[data-countdown]");
    if (!targets.length) return;

    var groups = [];
    targets.forEach(function (el) {
      var key = (el.getAttribute("data-countdown") || "").trim() || "webinarISO";
      var end = Date.parse(CFG[key]);
      if (isNaN(end)) return;          // bad or missing date: leave that one alone
      var group = null;
      for (var i = 0; i < groups.length; i++) { if (groups[i].end === end) { group = groups[i]; break; } }
      if (!group) { group = { end: end, els: [] }; groups.push(group); }
      group.els.push(el);
    });
    if (!groups.length) return;
    targets = groups[0].els;           // kept for the shared builders below

    function unit(cls, tag) {
      return '<div class="cd-unit"><div class="cd-box" data-u="' + cls + '">00</div>' +
             '<div class="cd-tag">' + tag + '</div></div>';
    }
    function sep() { return '<div class="cd-sep">:</div>'; }

    function set(el, u, val) {
      var box = el.querySelector('[data-u="' + u + '"]');
      if (box) box.textContent = pad(val);
    }

    function tickGroup(group) {
      var diff = group.end - Date.now();
      if (diff <= 0) {
        group.els.forEach(function (el) {
          el.classList.add("is-live");
          var over = el.getAttribute("data-countdown-over");
          el.innerHTML = '<div class="countdown-live-msg">' +
            escapeHTML(over || "[PLACEHOLDER: We are starting now]") + '</div>';
        });
        return true;                   // done, stop ticking this group
      }
      var s2 = Math.floor(diff / 1000);
      var d = Math.floor(s2 / 86400); s2 -= d * 86400;
      var h = Math.floor(s2 / 3600);  s2 -= h * 3600;
      var m = Math.floor(s2 / 60);    s2 -= m * 60;
      group.els.forEach(function (el) {
        set(el, "dd", d); set(el, "hh", h); set(el, "mm", m); set(el, "ss", s2);
      });
      return false;
    }

    groups.forEach(function (group) {
      group.els.forEach(function (el) {
        el.innerHTML =
          unit("dd", "Days") + sep() + unit("hh", "Hours") + sep() +
          unit("mm", "Minutes") + sep() + unit("ss", "Seconds");
        el.setAttribute("aria-hidden", "true");
      });
      if (tickGroup(group)) return;
      var timer = setInterval(function () {
        if (tickGroup(group)) clearInterval(timer);
      }, 1000);
    });
  }

  /* -----------------------------------------------------------------------
     LIVE CAPACITY METER
     Draws a fixed grid of "seat" cells (visual), fills them proportionally to
     seatsTaken / seatsTotal, and prints real "X spots remaining".
     Optional capped drip (CFG.fakeUrgency) makes it feel live — OFF by default.
     ----------------------------------------------------------------------- */
  var GRID_CELLS = 60; // number of visual seat cells drawn (not the real capacity)

  function initCapacity() {
    var grids = $all("[data-seat-grid]");
    var captions = $all("[data-seats-remaining]");
    if (!grids.length && !captions.length) return;

    var total = Number(CFG.seatsTotal) || 0;
    var taken = Number(CFG.seatsTaken) || 0;
    var floor = Number(CFG.seatsFloor) || 0;
    var ceil = Math.max(0, total - floor); // the most "taken" we ever allow
    // "Live waitroom" mode: seats animate in and keep filling, with a Live badge.
    // Runs ONLY when fakeUrgency is on and motion is allowed.
    var persist = CFG.fakeUrgency === true;   // remember progress across refreshes
    var live = persist && !reduceMotion;
    var STORE_KEY = CFG.seatsStorageKey || "tbo_seats_taken";

    // When urgency is on, seed "taken" from the last saved value so the spots
    // remaining stay the same when the visitor refreshes (clamped, never below floor).
    if (persist) {
      var stored = NaN;
      try { stored = parseInt(localStorage.getItem(STORE_KEY), 10); } catch (e) {}
      if (!isNaN(stored)) taken = Math.max(taken, stored);
      taken = Math.min(taken, ceil);
    }
    function saveTaken() { try { localStorage.setItem(STORE_KEY, String(taken)); } catch (e) {} }

    // Heatmap zone by seat position: mostly green, a slice of orange, a small red tail.
    function zoneFor(i) {
      if (i < GRID_CELLS * 0.62) return "zone-green";   // first ~62% green
      if (i < GRID_CELLS * 0.90) return "zone-orange";  // next ~28% orange
      return "zone-red";                                 // last ~10% red
    }

    // Build the seat cells once.
    grids.forEach(function (grid) {
      grid.setAttribute("aria-hidden", "true"); // caption carries the real info
      var frag = document.createDocumentFragment();
      for (var i = 0; i < GRID_CELLS; i++) {
        var cell = document.createElement("span");
        cell.className = "seat " + zoneFor(i);
        frag.appendChild(cell);
      }
      grid.innerHTML = "";
      grid.appendChild(frag);
    });

    function filledFor(t) {
      if (total <= 0) return 0;
      return Math.min(GRID_CELLS, Math.max(0, Math.round((t / total) * GRID_CELLS)));
    }
    function paintCaption() {
      var remaining = Math.max(0, total - taken);
      captions.forEach(function (cap) {
        var numEl = cap.querySelector(".num");
        if (numEl) { numEl.textContent = remaining; }
        else { cap.textContent = remaining + " spots remaining"; }
      });
    }
    // mark a seat (by index) taken across every grid
    function fillCell(index) {
      grids.forEach(function (grid) {
        var c = grid.children[index];
        if (c) c.classList.add("taken");
      });
    }

    paintCaption();

    // Static (default / reduced motion): paint the filled state once and stop.
    if (!live) {
      var f0 = filledFor(taken);
      for (var i = 0; i < f0; i++) fillCell(i);
      return;
    }

    // ---- LIVE MODE ----
    $all("[data-live-badge]").forEach(function (b) { b.hidden = false; });
    // turn on the collective "breathing" shimmer across the whole grid
    grids.forEach(function (grid) { grid.classList.add("is-live"); });

    // Fill every currently-taken seat at once — the grid breathes together as one
    // living surface (each seat phase-offset), rather than filling block by block.
    var target = filledFor(taken);
    for (var i = 0; i < target; i++) fillCell(i);

    // Ongoing drip: remaining ticks down, new seats fade into the breathing field,
    // and progress is saved so a refresh keeps the same spots-remaining number.
    (function startDrip() {
      var loop = function () {
        var wait = 2500 + Math.floor(Math.random() * 5000); // 2.5s–7.5s
        setTimeout(function () {
          if (taken < ceil) {
            var before = filledFor(taken);
            taken += 1;
            var after = filledFor(taken);
            if (after > before) fillCell(after - 1);
            paintCaption();
            saveTaken();
          }
          if (taken < ceil) loop();
        }, wait);
      };
      loop();
    })();
  }

  /* -----------------------------------------------------------------------
     REGISTRATION MODAL (native <dialog>: focus trap + Esc handled by browser)
     Adds click-outside-to-close. Every [data-open-register] opens it.
     ----------------------------------------------------------------------- */
  function initModal() {
    var dialog = $("#register-modal");
    if (!dialog) return;

    var openers = $all("[data-open-register]");
    var closeBtn = $(".modal-close", dialog);
    var form = $("form", dialog);
    var lastFocused = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocused = document.activeElement;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", ""); // very old-browser fallback
      }
      /* Autofocus only where there is no on-screen keyboard. On a phone,
         focusing a field the instant the dialog opens throws the keyboard up
         over a form the visitor has not even read yet, which is the problem
         this whole block exists to avoid. On a pointer device it saves a click
         and costs nothing. */
      var finePointer = !window.matchMedia || window.matchMedia("(pointer: fine)").matches;
      if (finePointer) {
        var firstInput = $("input", dialog);
        if (firstInput) firstInput.focus();
      }
    }
    function close() {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else { dialog.removeAttribute("open"); markOpen(false); }
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    /* body.modal-open is what pulls the sticky mobile CTA out of the way. The
       dialog renders in the top layer, so a fixed bar is not covered by its
       backdrop, only dimmed behind it, which looks like a bug. */
    function markOpen(on) {
      try { document.body.classList.toggle("modal-open", !!on); } catch (err) {}
    }
    openers.forEach(function (btn) {
      btn.addEventListener("click", function (e) { open(e); markOpen(true); });
    });
    dialog.addEventListener("close", function () { markOpen(false); });
    dialog.addEventListener("cancel", function () { markOpen(false); });
    if (closeBtn) closeBtn.addEventListener("click", close);

    // click outside the inner card closes it
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) close();
    });
    // <dialog> fires "cancel" on Esc; let it close cleanly + restore focus
    dialog.addEventListener("cancel", function () {
      if (lastFocused && lastFocused.focus) setTimeout(function () { lastFocused.focus(); }, 0);
    });

    if (form) initForm(form, close);
  }

  /* -----------------------------------------------------------------------
     FORM: validate → store first name (sessionStorage) → redirect.
     No personal data is ever placed in the URL.
     ----------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Phone accepts every country. The picker supplies the dial code and the
     input holds the national number.

     How strict the check is depends on the country, deliberately:

       +1  (NANP)  exact. Ten digits, and neither the area code nor the exchange
                   may begin with 0 or 1. This is the ads' main market and the
                   rule is unambiguous, so filler like 1234567890 is rejected.
       everything  a length range only: at least 4 digits, and at most
       else        15 minus the dial code, which is the E.164 total-length cap.

     Per-country exact lengths are deliberately NOT attempted beyond NANP.
     National number lengths vary within a single country (Germany runs 6 to 11
     digits), the tables go stale, and every mistake silently blocks a real
     registration. A loose bound that lets a bad number through costs one junk
     lead; a wrong strict rule costs paying customers. */
  var NANP_RE = /^[2-9]\d{2}[2-9]\d{6}$/;
  var E164_MAX = 15;

  function phoneRulesFor(dial) {
    var d = String(dial == null ? "" : dial).replace(/\D/g, "") || "1";
    if (d === "1") return { dial: d, min: 10, max: 10, nanp: true };
    return { dial: d, min: 4, max: Math.max(4, E164_MAX - d.length), nanp: false };
  }

  function fitsRules(digits, rules) {
    if (rules.nanp) return NANP_RE.test(digits);
    return digits.length >= rules.min && digits.length <= rules.max;
  }

  /* Reduces whatever was typed to the NATIONAL number, never truncating, so the
     validator judges everything the visitor actually entered.

     The hard part is a pasted international number, where the dial code is
     repeated inside the field. Two signals resolve it:

       - an explicit leading "+" means the digits that follow start with a
         country code, so a matching prefix is definitely not part of the
         national number;
       - otherwise the prefix is only stripped when keeping it does not produce
         a valid number but dropping it does.

     Both conditions are needed. Stripping any matching prefix unconditionally
     would eat the real leading digits of national numbers that happen to start
     with their own dial code, and stripping none would store +44447700900123
     for anyone who pastes their full UK number. */
  function phoneDigits(value, dial) {
    var rules = phoneRulesFor(dial);
    var raw = String(value == null ? "" : value);
    var digits = raw.replace(/\D/g, "");
    if (digits.indexOf(rules.dial) !== 0) return digits;

    var stripped = digits.slice(rules.dial.length);
    if (/^\s*\+/.test(raw)) return stripped;
    if (!fitsRules(digits, rules) && fitsRules(stripped, rules)) return stripped;
    return digits;
  }

  /* Trimming belongs HERE, in what the field accepts as you type, and NOT in
     the validator. Truncating during validation silently turned a 12-digit
     foreign number into a valid-looking US one by chopping the tail off, so
     +44 7700 900123 passed as "4477009001". */
  function phoneDigitsCapped(value, dial) {
    return phoneDigits(value, dial).slice(0, phoneRulesFor(dial).max);
  }

  function isUsablePhone(value, dial) {
    return fitsRules(phoneDigits(value, dial), phoneRulesFor(dial));
  }

  /* Builds the country picker from countries.js. The markup ships one static
     "United States +1" option so the field is never empty and works before (or
     without) this running; everything here replaces it.

     The <select> value is the dial code because that is what the number needs.
     A hidden phone_country_iso rides alongside it, because +1 alone cannot tell
     the dashboard whether the visitor is in the US, Canada or Barbados. */
  function initPhoneCountry(select, input, isoField) {
    if (!select) return;
    var list = window.COUNTRY_DIAL_CODES;
    if (!list || !list.length) return;      // countries.js missing: keep the static option

    var previous = select.value || "+1";
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var name = list[i][0], iso = list[i][1], dial = list[i][2];
      /* Flag + dial code only, no country name. Keeps the control narrow
         enough to leave the number input real estate on a phone, and a flag is
         recognised faster than a name is read.

         The name is NOT lost: it goes in title= for hover and for anything
         reading the accessibility tree, and the list stays sorted by it so the
         order is still predictable.

         Windows Chrome ships no flag glyphs and renders the pair of regional
         indicators as the letters "US", "GB" and so on. That degrades to
         something still perfectly readable next to the dial code, which is why
         no image fallback is worth the weight here. */
      html += '<option value="+' + dial + '" data-iso="' + iso + '" title="' +
              escapeHTML(name) + '">' + flagFor(iso) + " +" + dial + "</option>";
    }
    select.innerHTML = html;

    // Default to the US: the ads target it, and +1 has 24 entries so the first
    // "+1" option alphabetically would otherwise be American Samoa.
    var target = -1;
    for (var j = 0; j < select.options.length; j++) {
      if (select.options[j].getAttribute("data-iso") === "US") { target = j; break; }
    }
    select.selectedIndex = target > -1 ? target : 0;
    if (previous && previous !== "+1") {
      for (var k = 0; k < select.options.length; k++) {
        if (select.options[k].value === previous) { select.selectedIndex = k; break; }
      }
    }

    function syncCountry() {
      var opt = select.options[select.selectedIndex];
      if (isoField && opt) { isoField.value = opt.getAttribute("data-iso") || ""; }
      if (input) {
        var rules = phoneRulesFor(select.value);
        // The cap follows the country, so switching from +1 to +49 stops
        // truncating at ten. Re-run the existing value through the new rules.
        input.setAttribute("maxlength", String(rules.max));
        if (input.value) { input.value = phoneDigitsCapped(input.value, select.value); }
      }
    }
    select.addEventListener("change", syncCountry);
    syncCountry();
  }

  /* ISO 3166-1 alpha-2 -> the flag emoji, by mapping each letter to its
     regional indicator symbol (A = U+1F1E6). No lookup table needed, and any
     country added to countries.js gets its flag for free. */
  function flagFor(iso) {
    var code = String(iso || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return "";
    return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65) +
           String.fromCodePoint(0x1F1E6 + code.charCodeAt(1) - 65);
  }

  function escapeHTML(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Keeps the field to the selected country's digit limit as they type, so the
     maximum is enforced by the control and not only by the error message.
     maxlength alone is not enough: it counts characters, so a pasted
     "(212) 555-0123" would be cut to "(212) 555-" and read as four digits. */
  function initPhoneField(input, select) {
    if (!input) return;
    function dial() { return select ? select.value : "+1"; }
    input.addEventListener("input", function () {
      var raw = input.value;
      var caret = input.selectionStart;
      // how many digits sat before the caret, so it can be put back in the same
      // logical place once the non-digits are gone
      var digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
      var clean = phoneDigitsCapped(raw, dial());
      if (clean === raw) return;             // already clean: never touch the caret
      // a stripped country code shifts every digit left by its length
      var removed = raw.replace(/\D/g, "").length - phoneDigits(raw, dial()).length;
      if (removed > 0) { digitsBeforeCaret = Math.max(0, digitsBeforeCaret - removed); }
      input.value = clean;
      var pos = Math.min(digitsBeforeCaret, clean.length);
      try { input.setSelectionRange(pos, pos); } catch (err) { /* older browsers */ }
    });
  }

  /* One shape for every destination. However the visitor typed it, phone leaves
     the browser as E.164 (+15550101234) built from the picker's value, so the
     dashboard, Zapier and any SMS tool all receive the same thing. */
  function applyPhoneFormat(data) {
    if (typeof data.phone !== "string" || !data.phone.trim()) return data;
    /* Only a number that actually validates gets rewritten. Stamping a dial
       code onto a half-typed number would invent one that was never entered,
       so anything invalid is left exactly as the visitor typed it. */
    var cc = String(data.phone_country_code || "+1").trim() || "+1";
    if (!isUsablePhone(data.phone, cc)) return data;
    data.phone = cc + phoneDigits(data.phone, cc);
    return data;
  }

  /* -----------------------------------------------------------------------
     CONFIRMATION SPLIT

     The capital question (name="capital_10k" on the registration form) decides
     which confirmation page a submission lands on:

       "yes" -> confirmedp.html   the pixelled TYP. Base pixel PLUS the Lead /
                                  SubmitApplication / CompleteRegistration
                                  standard events, so the ad account only ever
                                  optimizes toward qualified registrants.
       else  -> confirmednp.html  base pixel and PageView only, no conversion
                                  events.

     "else" deliberately covers BOTH "no" and unanswered. The radio group is
     optional, so a blank answer is not evidence of qualification and must not
     fire a conversion.

     The answer is mirrored into sessionStorage because the intake form on
     thankyou.html does not ask the question again, yet has to route to the same
     page the registrant would have reached. Missing (direct hit, private mode)
     degrades to the unpixelled page, which is the safe direction to be wrong in.
     ----------------------------------------------------------------------- */
  var CONFIRM_PAGE_PIXELLED = "confirmedp.html";
  var CONFIRM_PAGE_PLAIN = "confirmednp.html";
  var CAPITAL_STORAGE_KEY = "tbo_capital_10k";

  /* A page may opt out of the split entirely with data-confirm-page on <html>.
     igoptin.html uses this: the organic funnel has one confirmation page, and
     the whole point of the split is choosing which conversion events fire, which
     is meaningless where no Pixel exists. The capital answer is still collected
     and still ships to the dashboard, it just no longer picks the destination. */
  function confirmationPageOverride() {
    try {
      var page = document.documentElement.getAttribute("data-confirm-page");
      return page ? String(page).trim() : "";
    } catch (err) { return ""; }
  }

  function confirmationPageFor(answer) {
    var override = confirmationPageOverride();
    if (override) return override;
    return String(answer || "").trim().toLowerCase() === "yes"
      ? CONFIRM_PAGE_PIXELLED
      : CONFIRM_PAGE_PLAIN;
  }

  /* -----------------------------------------------------------------------
     LEAD HANDOFF to the survey iframe

     The post-registration survey asks for the same four identity fields the
     visitor has just typed. Rather than make them retype, registration parks
     them here and brand-operator-survey.html reads them back to prefill and
     skip its first step.

     sessionStorage, NOT localStorage and NOT a query string, for three reasons:
       - a query string would put an email and phone into a URL and into the
         iframe src in the DOM, which this funnel's rules forbid;
       - sessionStorage is scoped to this tab and cleared when it closes, so the
         PII does not outlive the visit the way localStorage would;
       - a SAME-ORIGIN iframe shares the tab's sessionStorage with the page
         around it, which is exactly the handoff needed, with no postMessage.

     Degradation worth knowing: opening the confirmation page in a NEW tab
     leaves this unreadable and the survey simply shows its first step.
     ----------------------------------------------------------------------- */
  var LEAD_STORAGE_KEY = "tbo_lead";

  function rememberLead(data) {
    try {
      sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify({
        first_name: data.firstName || data.firstname || "",
        last_name:  data.lastName  || data.lastname  || "",
        email:      data.email || "",
        // Already E.164 here: applyPhoneFormat() ran before the send. The
        // survey strips it back to digits for its own input.
        phone:      data.phone || ""
      }));
    } catch (err) { /* private mode: the survey just asks for them again */ }
  }

  function rememberCapitalAnswer(answer) {
    try { sessionStorage.setItem(CAPITAL_STORAGE_KEY, String(answer || "")); }
    catch (err) { /* private mode: intake falls back to the plain page */ }
  }

  function recalledCapitalAnswer() {
    try { return sessionStorage.getItem(CAPITAL_STORAGE_KEY) || ""; }
    catch (err) { return ""; }
  }

  function initForm(form, closeModal) {
    var firstName = $("#reg-firstname", form);
    var lastName = $("#reg-lastname", form);
    var email = $("#reg-email", form);
    var phone = $("#reg-phone", form);
    var capitalRadios = $all('input[name="capital_10k"]', form);
    var honeypot = $("#reg-website", form);   // bot trap, always empty for humans
    var submitBtn = $('button[type="submit"]', form);
    // Captured from the markup so rewording the button in HTML needs no JS edit.
    var submitLabel = getBtnLabel(submitBtn) || "Save my seat";
    var phoneCC = $("#reg-phone-cc", form);
    var phoneIso = $('input[name="phone_country_iso"]', form);
    initPhoneCountry(phoneCC, phone, phoneIso);
    initPhoneField(phone, phoneCC);

    function setError(input, on) {
      var field = input.closest(".field");
      if (field) field.classList.toggle("has-error", !!on);
      // programmatic association so screen readers announce the error state
      if (on) { input.setAttribute("aria-invalid", "true"); }
      else { input.removeAttribute("aria-invalid"); }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* Both forms carry novalidate, so the browser enforces nothing and this
         is the ONLY gate. Every visible field is mandatory as of 2026-08-09;
         the honeypot is the sole deliberate exception and must never be
         required, since a human leaving it empty is the whole point. */
      var okName = firstName.value.trim().length > 0;
      var okLast = !lastName || lastName.value.trim().length > 0;
      var okEmail = EMAIL_RE.test(email.value.trim());
      var okPhone = !phone || isUsablePhone(phone.value, phoneCC ? phoneCC.value : "+1");
      var checked = capitalRadios.filter(function (r) { return r.checked; });
      var okCapital = !capitalRadios.length || checked.length > 0;

      setError(firstName, !okName);
      if (lastName) setError(lastName, !okLast);
      setError(email, !okEmail);
      if (phone) setError(phone, !okPhone);
      // Radios share one .field (the fieldset), so toggling via any one of
      // them lights the whole group's error state.
      if (capitalRadios.length) setError(capitalRadios[0], !okCapital);

      if (!okName) { firstName.focus(); return; }
      if (!okLast) { lastName.focus(); return; }
      if (!okEmail) { email.focus(); return; }
      if (!okPhone) { phone.focus(); return; }
      if (!okCapital) { capitalRadios[0].focus(); return; }

      // Pull every named field on the form (visible + hidden custom fields),
      // then overlay a fresh attribution read so Pixel cookies are current.
      currentAttribution(form);
      var data = collectFormFields(form);
      var attribution = currentAttribution(form);
      Object.keys(attribution).forEach(function (key) { data[key] = attribution[key]; });
      // Non-empty means a bot filled the off-screen trap. Sent as-is; the
      // relay drops it and still answers 200 so the bot learns nothing.
      data.website = honeypot ? honeypot.value : "";
      // The radio group is required now, so the validation above guarantees one
      // is checked and collectFormFields always finds the key. Kept as a floor
      // anyway: the dashboard should always get the column, and a future edit
      // that relaxes the field must not silently start omitting it.
      if (typeof data.capital_10k !== "string") { data.capital_10k = ""; }
      applyPhoneFormat(data);

      if (submitBtn) { submitBtn.disabled = true; setBtnLabel(submitBtn, "Saving your seat..."); }

      submitRegistration(data).then(function () {
        // Hand ONLY the first name to the thank-you page via sessionStorage.
        try {
          sessionStorage.setItem(CFG.firstNameStorageKey || "tbo_first_name", data.firstName);
        } catch (err) { /* private mode: proceed without personalization */ }
        // The four identity fields, for the survey embedded on the confirmation
        // page. See rememberLead() above.
        rememberLead(data);
        // Carried forward so thankyou.html's intake form can route to the same
        // confirmation page without asking the capital question a second time.
        rememberCapitalAnswer(data.capital_10k);
        // Straight to the confirmation page. thankyou.html (two videos + the
        // intake form) is bypassed, so no "intake" webhook fires for registrants
        // and stage/question are never collected. Change this back to
        // "thankyou.html" to restore the three-step flow.
        // "yes" to the capital question lands on the pixelled page, "no" and
        // unanswered on the plain one. See CONFIRMATION SPLIT above.
        window.location.href = confirmationPageFor(data.capital_10k); // no query string, no PII in URL
      }).catch(function () {
        if (submitBtn) { submitBtn.disabled = false; setBtnLabel(submitBtn, submitLabel); }
        alert("Something went wrong saving your seat. Please try again."); // placeholder UX
      });
    });
  }

  /* -----------------------------------------------------------------------
     WEBHOOK DELIVERY

     Both forms POST the same JSON envelope to every configured destination in
     CFG.webhooks (Zapier, the custom dashboard, anything else you add). Design
     rules, in order of importance:

       1. NEVER make the visitor wait on marketing plumbing. Sends go out in
          parallel with a timeout; the page proceeds as soon as they settle, and
          proceeds anyway if they fail.
       2. NEVER silently lose a lead. Anything that fails to reach at least one
          destination is written to a localStorage queue and retried on the next
          page load. Since registration redirects straight to thankyou.html, a
          failed send is normally retried within a second or two.
       3. Survive the redirect. fetch() is issued with keepalive:true so an
          in-flight request is not cancelled when the browser leaves the page.
          (keepalive caps the body at 64KB; these payloads are well under it.)

     A destination marked noCors:true is sent with mode:"no-cors". The request
     still leaves the browser, but the response is opaque, so delivery cannot be
     confirmed and the retry queue cannot protect it. Prefer real CORS headers.
     ----------------------------------------------------------------------- */
  /* The relay (api/register.js), or null if it cannot be reached from wherever
     this page is running.

     The protocol guard is load-bearing. Under file:// a relative relayUrl would
     resolve to file:///api/register, fetch would reject, and submitRegistration
     would park the visitor's NAME, EMAIL AND PHONE in localStorage on every
     desktop preview, where it would sit until five failed retries drained it.
     Returning null instead falls through to the (normally empty) webhooks list,
     so a file:// preview sends nothing and stores nothing. */
  function relayTarget() {
    var url = typeof CFG.relayUrl === "string" ? CFG.relayUrl.trim() : "";
    if (!url) return null;
    var absolute = /^https?:\/\//i.test(url);
    var proto = window.location.protocol;
    if (!absolute && proto !== "http:" && proto !== "https:") return null;
    return { name: "relay", url: url, noCors: false, headers: {} };
  }

  function webhookTargets() {
    var relay = relayTarget();
    if (relay) return [relay];        // relay mode: CFG.webhooks is ignored
    var list = Array.isArray(CFG.webhooks) ? CFG.webhooks : [];
    return list.filter(function (t) {
      return t && typeof t.url === "string" && t.url.trim() !== "";
    });
  }

  /* Every named control on the form, so a new hidden/custom input is forwarded
     without editing this submit handler. Attribution is merged on top afterward
     (cookies are re-read at submit time). firstname → firstName so the HTML
     name= and the webhook contract stay compatible. */
  function collectFormFields(form) {
    var data = {};
    if (!form || typeof form.elements === "undefined") return data;
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      if (!el || !el.name || el.disabled) continue;
      var tag = (el.tagName || "").toLowerCase();
      if (tag !== "input" && tag !== "select" && tag !== "textarea") continue;
      var type = (el.type || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "file" || type === "reset") continue;
      if ((type === "checkbox" || type === "radio") && !el.checked) continue;
      data[el.name] = typeof el.value === "string" ? el.value.trim() : el.value;
    }
    if (data.firstname && !data.firstName) data.firstName = data.firstname;
    if (data.lastname && !data.lastName) data.lastName = data.lastname;
    return data;
  }

  // The envelope every destination receives. Keep the shape stable: your Zap
  // and your dashboard both parse it.
  function buildPayload(eventName, data) {
    var payload = {
      event: eventName,                 // "registration" | "intake"
      /* Idempotency key, minted PER SUBMISSION and frozen into the payload, so
         every retry of this submission carries the same value and the dashboard
         can dedupe on it. Deliberately not meta_lead_event_id: that one is per
         VISIT, so a visitor who mistypes their email and resubmits would send
         two different leads under one id and the correction would be swallowed. */
      clientEventId: newEventId(),
      submittedAt: new Date().toISOString(),
      page: window.location.pathname,
      pageUrl: window.location.href,    // carries the ad params, never any PII
      referrer: document.referrer || "",
      userAgent: navigator.userAgent || "",
      webinarISO: CFG.webinarISO || "",
      eventTitle: CFG.eventTitle || ""
    };
    Object.keys(data || {}).forEach(function (k) { payload[k] = data[k]; });
    return payload;
  }

  // Resolves true on delivery, false on failure. Never rejects.
  function postWebhook(target, payload) {
    var timeoutMs = typeof CFG.webhookTimeoutMs === "number" ? CFG.webhookTimeoutMs : 8000;

    if (typeof window.fetch !== "function") return Promise.resolve(false);

    var controller = null, timer = null;
    try { controller = new AbortController(); } catch (err) { controller = null; }

    var opts = {
      method: "POST",
      body: JSON.stringify(payload),
      keepalive: true                    // survives the redirect to thankyou.html
    };
    if (controller) opts.signal = controller.signal;

    if (target.noCors) {
      // Opaque: the request is sent but nothing about the response is readable.
      opts.mode = "no-cors";
      // no-cors forbids a JSON content-type, so the body arrives as plain text.
      opts.headers = { "Content-Type": "text/plain;charset=UTF-8" };
    } else {
      opts.headers = { "Content-Type": "application/json" };
      Object.keys(target.headers || {}).forEach(function (h) {
        opts.headers[h] = target.headers[h];
      });
    }

    if (controller) {
      timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    }

    return window.fetch(target.url, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      // An opaque response has status 0 and cannot be inspected; assume sent.
      if (res.type === "opaque") return true;
      return !!res.ok;
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return false;                      // network error, CORS block, or timeout
    });
  }

  /* ---- retry queue -------------------------------------------------------
     Failed payloads are parked in localStorage and re-sent on the next page
     load. Capped so a permanently broken endpoint cannot grow without bound.  */
  var WEBHOOK_QUEUE_KEY = CFG.webhookQueueKey || "tbo_webhook_queue";
  var WEBHOOK_MAX_QUEUE = 25;
  var WEBHOOK_MAX_ATTEMPTS = 5;

  function readQueue() {
    try {
      var raw = localStorage.getItem(WEBHOOK_QUEUE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) { return []; }
  }

  function writeQueue(items) {
    try { localStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(items)); }
    catch (err) { /* private mode or quota: the retry is simply skipped */ }
  }

  function queueForRetry(payload) {
    var items = readQueue();
    items.push({ payload: payload, attempts: 1, queuedAt: Date.now() });
    if (items.length > WEBHOOK_MAX_QUEUE) {
      items = items.slice(items.length - WEBHOOK_MAX_QUEUE);  // keep the newest
    }
    writeQueue(items);
  }

  // Runs at boot. Anything still undelivered goes out again; anything that has
  // burned through its attempts is dropped so the queue always drains.
  function flushWebhookQueue() {
    var items = readQueue();
    if (!items.length || !webhookTargets().length) return Promise.resolve();

    writeQueue([]);   // take ownership now so a second load cannot double-send

    return Promise.all(items.map(function (item) {
      return sendToWebhooks(item.payload).then(function (result) {
        if (result.delivered > 0) return null;          // done, drop it
        var attempts = (item.attempts || 1) + 1;
        if (attempts > WEBHOOK_MAX_ATTEMPTS) return null; // give up, stop growing
        return { payload: item.payload, attempts: attempts, queuedAt: item.queuedAt };
      });
    })).then(function (results) {
      var stillFailing = results.filter(Boolean);
      if (stillFailing.length) {
        writeQueue(readQueue().concat(stillFailing));   // merge with any new ones
      }
    });
  }

  // Fans out to every destination. Resolves once all have settled; never rejects.
  function sendToWebhooks(payload) {
    var targets = webhookTargets();
    if (!targets.length) {
      // Nothing configured yet: treat as a no-op success so the funnel still works.
      return Promise.resolve({ attempted: 0, delivered: 0, failed: [], configured: false });
    }
    return Promise.all(targets.map(function (t) {
      return postWebhook(t, payload).then(function (ok) {
        return { name: t.name || t.url, ok: ok };
      });
    })).then(function (results) {
      var failed = results.filter(function (r) { return !r.ok; });
      return {
        attempted: results.length,
        delivered: results.length - failed.length,
        failed: failed.map(function (r) { return r.name; }),
        configured: true
      };
    });
  }

  /* -----------------------------------------------------------------------
     REGISTRATION (opt-in modal) -> webhooks.
     Resolves even when delivery fails, because the payload has been queued for
     retry and blocking the visitor would lose them for nothing.
     ----------------------------------------------------------------------- */
  function submitRegistration(data) {
    var payload = buildPayload("registration", data);
    return sendToWebhooks(payload).then(function (result) {
      if (result.configured && result.delivered === 0) { queueForRetry(payload); }
      return result;
    });
  }

  /* -----------------------------------------------------------------------
     SCROLL REVEAL (IntersectionObserver). Disabled under reduced motion.

     threshold MUST stay 0. It used to be 0.12, which reads as "reveal once 12%
     of it is on screen" but actually means 12% of the ELEMENT'S OWN AREA, and
     that is unreachable for anything taller than about 8x the viewport. The
     proof grid is exactly that: single-column on mobile it runs ~7500px (eight
     screenshots at a 2.17 aspect, two vertical videos, three inline CTAs) while
     the root is only ~613px, so its ratio topped out near 0.08 and it could
     never cross 0.12. The section stayed at opacity 0 forever and the
     testimonials were simply invisible on every phone. Desktop cleared the bar
     only because the two-column grid is shorter and the viewport taller, and
     even then by so little that a short laptop window failed too.

     With threshold 0 the negative bottom rootMargin is what times the reveal:
     an element becomes visible when its top edge rises past 92% of the viewport
     height. That trigger is independent of element height, so it behaves the
     same for a one-line heading and for a 7500px grid.
     ----------------------------------------------------------------------- */
  function initReveal() {
    var items = $all(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    document.documentElement.classList.add("js-ready"); // only now hide-before-reveal
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* -----------------------------------------------------------------------
     TRAINING TIMELINE: scroll-activate rows top-to-bottom, fill the connector
     line, and celebrate the final row with a CSS confetti burst (once).
     Brand palette only (bright orange + gold, sparse neutral).
     ----------------------------------------------------------------------- */
  var CONFETTI_COLORS = ["#3B82F6", "#93C5FD", "#B8892B", "#D8D5CC"]; // accent blue, light blue, gold, soft neutral

  function fireConfetti(badge) {
    if (badge.hasAttribute("data-celebrated")) return;   // fire exactly once
    badge.setAttribute("data-celebrated", "");
    if (reduceMotion) return;                            // no particles under reduced motion
    var layer = badge.querySelector(".confetti-layer");
    if (!layer) return;

    var count = 24, spread = 30;   // <<< tune: particle count + burst radius (px)

    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "confetti-piece";
      var tx = (Math.random() * 2 - 1) * spread;            // -spread..spread
      var ty = -(4 + Math.random() * (spread - 4));         // -4..-spread (biased upward)
      var rot = (Math.random() * 2 - 1) * 220;              // -220..220 deg
      p.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      p.style.animationDelay = Math.floor(Math.random() * 200) + "ms";
      p.style.setProperty("--tx", tx.toFixed(1) + "px");
      p.style.setProperty("--ty", ty.toFixed(1) + "px");
      p.style.setProperty("--rot", Math.round(rot) + "deg");
      layer.appendChild(p);
    }
  }

  // undo a celebration so it can replay when the row is scrolled back into view
  function resetConfetti(badge) {
    badge.removeAttribute("data-celebrated");
    var layer = badge.querySelector(".confetti-layer");
    if (layer) layer.innerHTML = "";
  }

  function initTimeline() {
    var lists = $all("[data-timeline]");
    if (!lists.length) return;

    lists.forEach(function (ul) {
      var items = $all(".tl-item", ul);
      if (!items.length) return;

      function activate(idx) {
        var li = items[idx];
        if (!li || li.classList.contains("is-active")) return;
        li.classList.add("is-active");
        if (idx > 0) items[idx - 1].classList.add("seg-lit"); // fill the segment above
        var finalBadge = li.querySelector(".tl-badge[data-final]");
        if (finalBadge) fireConfetti(finalBadge);
      }

      // reverse of activate: row scrolled back out -> un-light so it can replay
      function deactivate(idx) {
        var li = items[idx];
        if (!li || !li.classList.contains("is-active")) return;
        li.classList.remove("is-active");
        if (idx > 0) items[idx - 1].classList.remove("seg-lit"); // retract the segment above
        var finalBadge = li.querySelector(".tl-badge[data-final]");
        if (finalBadge) resetConfetti(finalBadge);
      }

      // Reduced motion / no IntersectionObserver: render the finished, lit state.
      if (reduceMotion || !("IntersectionObserver" in window)) {
        if (reduceMotion) {
          var fb = ul.querySelector(".tl-badge[data-final]");
          if (fb) fb.setAttribute("data-celebrated", ""); // marks it done so no confetti fires
        } else {
          ul.classList.add("js-armed");
          items.forEach(function (li, i) { activate(i); });
        }
        return; // default CSS already renders everything lit
      }

      ul.classList.add("js-armed"); // enter the dormant state
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var idx = items.indexOf(entry.target);
          if (entry.isIntersecting) activate(idx);
          else deactivate(idx);   // scrolled back out -> un-light so it replays on the way down
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -35% 0px" });

      items.forEach(function (li) { io.observe(li); });
    });
  }

  /* -----------------------------------------------------------------------
     CALENDAR (thank-you page): build Google Calendar URL + downloadable .ics
     from CFG.webinarISO. Google URL is overridable via CFG.googleCalendarUrl.
     ----------------------------------------------------------------------- */
  function toICSStamp(date) {
    // -> YYYYMMDDTHHMMSSZ (UTC)
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  /* The Zoom join link, but only if it is a real URL. Guards the case where the
     key is emptied or still holds a "[PLACEHOLDER: ...]" string, so a
     half-configured site can never ship the literal placeholder text into
     someone's calendar as the event location. */
  function joinLink() {
    var raw = String(CFG.webinarJoinUrl || "").trim();
    return raw.indexOf("http") === 0 ? raw : "";
  }

  /* RFC 5545 caps a content line at 75 octets and requires anything longer to
     be folded onto continuation lines that begin with a single space. A Zoom
     link pushes DESCRIPTION and LOCATION far past that, and strict parsers
     (Google's .ics import among them) drop or truncate an over-long line, which
     shows up as exactly the bug this whole block exists to prevent: an invite
     that imports fine but has no link in it. Folded on octets, not characters,
     because the limit is a byte limit. */
  function utf8Size(ch) {
    var code = ch.charCodeAt(0);
    if (code < 0x80) return 1;
    if (code < 0x800) return 2;
    if (code >= 0xD800 && code <= 0xDBFF) return 4;   // leading surrogate: whole pair
    return 3;
  }

  function foldICSLines(lines) {
    var out = [];
    lines.forEach(function (line) {
      var run = "", used = 0, continued = false;
      for (var i = 0; i < line.length; i++) {
        var code = line.charCodeAt(i);
        // Take a surrogate pair as one unit so folding never splits a character.
        var ch = (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length)
          ? line.slice(i, i + 2)
          : line.charAt(i);
        var size = utf8Size(ch);
        // Continuation lines spend one octet on their leading space.
        if (used + size > (continued ? 74 : 75)) {
          out.push(continued ? " " + run : run);
          continued = true; run = ""; used = 0;
        }
        run += ch; used += size;
        if (ch.length === 2) i++;
      }
      out.push(continued ? " " + run : run);
    });
    return out;
  }

  function initCalendar() {
    var gcalLinks = $all("[data-gcal]");
    var icsLinks = $all("[data-ics]");
    if (!gcalLinks.length && !icsLinks.length) return;

    var start = new Date(CFG.webinarISO);
    if (isNaN(start.getTime())) return;
    var end = new Date(start.getTime() + (Number(CFG.eventDurationMinutes) || 60) * 60000);

    var title = CFG.eventTitle || "Live Training";
    var details = CFG.eventDescription || "";
    var location = CFG.eventLocation || "Online";

    /* Put the Zoom link where each calendar app actually looks for it. No single
       field works everywhere, so it goes in more than one on purpose:
         LOCATION    both Google and Apple linkify this and show it on the event
                     itself, so the link is reachable without opening anything.
         DESCRIPTION survives the clients and the forwarded copies that drop
                     LOCATION, and is where people look for "the link".
         URL         the event's canonical link.
         CONFERENCE  RFC 7986; this is what Apple Calendar renders as a tappable
                     Join button rather than plain text.
       eventLocation ("Online") stays the fallback when no join URL is set. */
    var join = joinLink();
    if (join) {
      location = join;
      details = details ? details + "\n\nJoin the training: " + join
                        : "Join the training: " + join;
    }

    // Google Calendar. An explicit CFG.googleCalendarUrl is an intentional
    // override and is used verbatim, so a custom URL must carry its own link.
    var gcalUrl = CFG.googleCalendarUrl && CFG.googleCalendarUrl.indexOf("http") === 0
      ? CFG.googleCalendarUrl
      : "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" + encodeURIComponent(title) +
        "&dates=" + toICSStamp(start) + "/" + toICSStamp(end) +
        "&details=" + encodeURIComponent(details) +
        "&location=" + encodeURIComponent(location);
    gcalLinks.forEach(function (a) {
      a.href = gcalUrl; a.target = "_blank"; a.rel = "noopener";
    });

    // .ics (generated client-side, works from file://)
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The Brand Operator//Webinar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + toICSStamp(start) + "-tbo@thebrandoperator",
      "DTSTAMP:" + toICSStamp(new Date()),
      "DTSTART:" + toICSStamp(start),
      "DTEND:" + toICSStamp(end),
      "SUMMARY:" + icsEscape(title),
      "DESCRIPTION:" + icsEscape(details),
      "LOCATION:" + icsEscape(location)
    ];
    if (join) {
      // URI-valued properties are NOT text-escaped, so these take the raw URL.
      // X-GOOGLE-CONFERENCE is non-standard but is what Google Calendar reads to
      // draw a Join button when someone imports the .ics instead of using the
      // Google button; every other client ignores an unknown X- property.
      lines.push("URL;VALUE=URI:" + join);
      lines.push("CONFERENCE;VALUE=URI;FEATURE=VIDEO;LABEL=Zoom:" + join);
      lines.push("X-GOOGLE-CONFERENCE:" + join);
    }
    lines.push("END:VEVENT");
    lines.push("END:VCALENDAR");
    var ics = foldICSLines(lines).join("\r\n") + "\r\n";

    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    icsLinks.forEach(function (a) {
      a.href = url;
      a.setAttribute("download", CFG.icsFilename || "training.ics");
    });
  }
  function icsEscape(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  /* -----------------------------------------------------------------------
     PROGRESS BAR (thank-you).
     Dynamic: starts at CFG.progressPercent and advances as the visitor works
     down the page, splitting the gap up to 100% evenly across the tracked
     actions below. Completed steps are remembered for the session so a refresh
     never sends the bar backwards.
     Default CSS draws the fill at its starting width, so with JS off the bar
     still renders correctly, just without the movement.
     ----------------------------------------------------------------------- */
  var PROGRESS_STEPS = ["how-video", "why-video", "intake"];

  // assigned by initProgress; other modules call this to advance the bar.
  var markProgress = function () {};

  function initProgress() {
    var band = $("[data-progress]");
    if (!band) return;

    var base = Number(CFG.progressPercent);
    if (!isFinite(base)) base = 88;
    base = Math.max(0, Math.min(100, Math.round(base)));

    var fill = $("[data-progress-fill]", band);
    var track = $("[data-progress-track]", band);
    var pctLabel = $("[data-progress-pct]", band);
    var stepLabel = $("[data-progress-step]", band);
    var storeKey = CFG.progressStorageKey || "tbo_progress";

    var done = [];
    try {
      var saved = JSON.parse(sessionStorage.getItem(storeKey) || "[]");
      if (Object.prototype.toString.call(saved) === "[object Array]") {
        done = saved.filter(function (id) { return PROGRESS_STEPS.indexOf(id) !== -1; });
      }
    } catch (e) { done = []; }   // private mode / corrupt value: start fresh

    function percent() {
      if (done.length >= PROGRESS_STEPS.length) return 100;
      return Math.round(base + ((100 - base) / PROGRESS_STEPS.length) * done.length);
    }

    function render() {
      var pct = percent();
      if (fill) fill.style.setProperty("--progress", pct + "%");
      if (track) track.setAttribute("aria-valuenow", String(pct));
      if (pctLabel) pctLabel.textContent = pct + "% complete";
      if (stepLabel && pct >= 100 && CFG.progressDoneLabel) {
        stepLabel.textContent = CFG.progressDoneLabel;
      }
    }

    markProgress = function (id) {
      if (PROGRESS_STEPS.indexOf(id) === -1) return;   // unknown step, ignore
      if (done.indexOf(id) !== -1) return;             // already counted
      done.push(id);
      try { sessionStorage.setItem(storeKey, JSON.stringify(done)); }
      catch (e) { /* private mode: bar still advances, just does not persist */ }
      render();
    };

    // watching either video advances the bar
    $all("[data-how-video]").forEach(function (a) {
      a.addEventListener("click", function () { markProgress("how-video"); });
    });
    $all("[data-why-video]").forEach(function (a) {
      a.addEventListener("click", function () { markProgress("why-video"); });
    });

    render();

    if (reduceMotion || !fill) return;

    band.classList.add("js-armed");           // collapse to zero width...
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {     // ...then release on the next frame
        band.classList.remove("js-armed");
      });
    });
  }

  /* -----------------------------------------------------------------------
     INLINE INTAKE FORM (thank-you). Same validation shape as the modal form,
     but instead of redirecting it swaps the card over to a success state.
     ----------------------------------------------------------------------- */
  function initIntakeForm() {
    var form = $("[data-intake-form]");
    if (!form) return;

    var firstName = $("#in-firstname", form);
    var email = $("#in-email", form);
    var phone = $("#in-phone", form);
    var stage = $("#in-stage", form);
    var question = $("#in-question", form);
    var submitBtn = $('button[type="submit"]', form);
    var submitLabel = submitBtn ? submitBtn.textContent : "";
    var phoneCC = $("#in-phone-cc", form);
    var phoneIso = $('input[name="phone_country_iso"]', form);
    initPhoneCountry(phoneCC, phone, phoneIso);
    initPhoneField(phone, phoneCC);

    // prefill the name we already captured at registration
    try {
      var known = sessionStorage.getItem(CFG.firstNameStorageKey || "tbo_first_name") || "";
      if (known && firstName && !firstName.value) firstName.value = known;
    } catch (e) { /* private mode: leave the field empty */ }

    function setError(input, on) {
      var field = input.closest(".field");
      if (field) field.classList.toggle("has-error", !!on);
      if (on) { input.setAttribute("aria-invalid", "true"); }
      else { input.removeAttribute("aria-invalid"); }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // novalidate again, so this is the only gate. Every visible field on the
      // intake form is mandatory too; see initForm for the reasoning.
      var okName = firstName.value.trim().length > 0;
      var okEmail = EMAIL_RE.test(email.value.trim());
      var okPhone = !phone || isUsablePhone(phone.value, phoneCC ? phoneCC.value : "+1");
      var okStage = !stage || stage.value !== "";
      var okQuestion = !question || question.value.trim().length > 0;

      setError(firstName, !okName);
      setError(email, !okEmail);
      if (phone) setError(phone, !okPhone);
      if (stage) setError(stage, !okStage);
      if (question) setError(question, !okQuestion);

      if (!okName) { firstName.focus(); return; }
      if (!okEmail) { email.focus(); return; }
      if (!okPhone) { phone.focus(); return; }
      if (!okStage) { stage.focus(); return; }
      if (!okQuestion) { question.focus(); return; }

      /* Every named field on the form, plus ad attribution. Attribution is
         merged even when thankyou.html has no hidden inputs — the record
         lives in sessionStorage from the landing page. */
      currentAttribution(form);
      var data = collectFormFields(form);
      var attribution = currentAttribution(form);
      Object.keys(attribution).forEach(function (key) { data[key] = attribution[key]; });
      applyPhoneFormat(data);

      if (submitBtn) { submitBtn.disabled = true; setBtnLabel(submitBtn, "Confirming..."); }

      submitIntake(data).then(function () {
        markProgress("intake");     // takes the bar to 100%
        // The visitor may have typed a different name here than at registration,
        // so hand the latest one forward for the confirmation page.
        try {
          sessionStorage.setItem(CFG.firstNameStorageKey || "tbo_first_name", data.firstName);
        } catch (err) { /* private mode: proceed without personalization */ }
        rememberLead(data);
        // This form does not ask the capital question, so the answer comes from
        // registration. Should it ever gain a capital_10k field, that live
        // answer wins over the remembered one.
        var capital = (typeof data.capital_10k === "string" && data.capital_10k)
          ? data.capital_10k
          : recalledCapitalAnswer();
        window.location.href = confirmationPageFor(capital);   // no query string, no PII in URL
      }).catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
        alert("Something went wrong confirming your seat. Please try again."); // placeholder UX
      });
    });
  }

  /* -----------------------------------------------------------------------
     INTAKE (thank-you page form) -> the same webhooks.
     Sent as event:"intake" so your Zap and dashboard can route it separately
     from the registration; it carries the extra qualifying answers.
     ----------------------------------------------------------------------- */
  function submitIntake(data) {
    var payload = buildPayload("intake", data);
    return sendToWebhooks(payload).then(function (result) {
      if (result.configured && result.delivered === 0) { queueForRetry(payload); }
      return result;
    });
  }

  /* -----------------------------------------------------------------------
     BONUS GRID: staggered entrance, separate from the generic .reveal observer.

     The cards deliberately do NOT carry .reveal; two observers driving the same
     elements would fight over opacity/transform. This one keys off
     [data-bonus-grid] and toggles .is-in on the grid, and per-card stagger comes
     from the inline --i custom property in the markup.
     ----------------------------------------------------------------------- */
  function initBonusGrid() {
    var grid = $("[data-bonus-grid]");
    if (!grid) return;                 // not this page

    // Reduced motion: leave the default lit state alone. Never arm, never hide.
    if (reduceMotion) return;

    // Only now that JS is confirmed present do we enter the dormant state, so a
    // JS-off visitor can never end up with permanently invisible cards.
    grid.classList.add("js-armed");

    if (!("IntersectionObserver" in window)) {
      grid.classList.add("is-in");     // no observer support: show immediately
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);   // fires once
      });
    }, {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px"
    });

    observer.observe(grid);
  }

  /* -----------------------------------------------------------------------
     CALLBACK COUNTDOWN (confirmation page)

     Counts down from data-minutes on load, inside the contact notice. It is a
     nudge to stay by the phone, not a gate: nothing depends on it, it stops at
     0:00 rather than running negative, and with JS off the markup already shows
     the starting time so the sentence still reads correctly.
     ----------------------------------------------------------------------- */
  function initCallbackTimer() {
    var box = $("[data-callback-timer]");
    if (!box) return;                       // not this page
    var clock = $("[data-callback-clock]", box);
    if (!clock) return;

    var minutes = Number(box.getAttribute("data-minutes"));
    if (!isFinite(minutes) || minutes <= 0) minutes = 5;

    var endsAt = Date.now() + minutes * 60 * 1000;
    var tick;

    function render() {
      var total = Math.floor(Math.max(0, endsAt - Date.now()) / 1000);
      clock.textContent = Math.floor(total / 60) + ":" + pad(total % 60);
      if (total <= 0) {
        clearInterval(tick);
        box.setAttribute("data-elapsed", "");   // styling hook if ever wanted
      }
    }

    render();
    tick = setInterval(render, 1000);
  }

  /* -----------------------------------------------------------------------
     CONFIRMATION PAGE: run the progress bar up to its real value on load.

     Driven entirely by inline styles rather than by toggling classes. The
     earlier class-based version removed the "armed" class and added the
     "run" class in the same frame, so the width was already back at its final
     value before any transition applied and the bar snapped instead of
     filling. Setting transition:none, painting 0%, then restoring the
     transition on the NEXT frame is what actually animates it.

     Progressive enhancement holds: the markup already carries the final width,
     so with JS off the bar is simply correct, and under reduced motion it is
     left alone.
     ----------------------------------------------------------------------- */
  function initProgressFill() {
    var track = $("[data-progress-fill-to]");
    if (!track) return;                      // not this page
    var fill = $(".progress-fill", track);
    if (!fill) return;

    var target = Number(track.getAttribute("data-progress-fill-to"));
    if (!isFinite(target) || target < 0 || target > 100) return;
    if (reduceMotion) return;                // leave it at its final width

    fill.style.transition = "none";
    fill.style.width = "0%";
    void fill.offsetWidth;                   // force the reflow so 0% is painted

    // The number counts up alongside the bar rather than sitting at its final
    // value while the bar travels, which would read as two disagreeing widgets.
    var out = $("[data-progress-pct]");
    var DURATION = 1400;

    var run = function () {
      fill.style.transition = "width " + DURATION + "ms cubic-bezier(0.22, 1, 0.36, 1)";
      fill.style.width = target + "%";

      if (!out) return;
      var startedAt = Date.now();
      var step = function () {
        var t = Math.min(1, (Date.now() - startedAt) / DURATION);
        // same ease-out shape as the bar, so the two stay in step
        var eased = 1 - Math.pow(1 - t, 3);
        out.textContent = Math.round(target * eased) + "%";
        if (t < 1) { requestAnimationFrame(step); }
        else { out.textContent = target + "%"; }
      };
      out.textContent = "0%";
      requestAnimationFrame(step);
    };
    // A beat before it starts, so the fill is visible rather than already done
    // by the time the page settles.
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () { setTimeout(run, 180); });
    } else {
      setTimeout(run, 180);
    }
  }

  /* -----------------------------------------------------------------------
     CONFIRMATION PAGE: one page-wide confetti burst on arrival.

     Reuses CONFETTI_COLORS so a reskin only has to change that one array.
     Pieces are removed once the animation ends, so the layer does not sit in
     the DOM holding ~90 absolutely-positioned nodes for the whole visit.
     No-ops entirely under reduced motion and with JS off.
     ----------------------------------------------------------------------- */
  function initCelebration() {
    var layer = $("[data-celebrate]");
    if (!layer) return;                 // not this page
    if (reduceMotion) return;           // honour the OS setting

    var count = 90;                     // <<< tune: number of confetti pieces
    var longest = 0;

    for (var i = 0; i < count; i++) {
      var piece = document.createElement("span");
      piece.className = "celebrate-piece";

      // Spread across the viewport width, biased away from dead centre so the
      // burst reads as two shoulders rather than one clump.
      var side = i % 2 === 0 ? 1 : -1;
      var dx = side * (8 + Math.random() * 52);         // 8vw..60vw either way
      var peak = -(12 + Math.random() * 26);            // how high it flies
      var rot = (Math.random() * 2 - 1) * 900;          // tumble
      var dur = 2200 + Math.random() * 1400;
      var delay = Math.floor(Math.random() * 320);

      piece.style.backgroundColor =
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.setProperty("--dx", dx.toFixed(1) + "vw");
      piece.style.setProperty("--peak", peak.toFixed(1) + "vh");
      piece.style.setProperty("--rot", Math.round(rot) + "deg");
      piece.style.setProperty("--dur", Math.round(dur) + "ms");
      piece.style.setProperty("--delay", delay + "ms");

      // vary the shape a little so it does not look like uniform rectangles
      if (i % 3 === 0) { piece.style.borderRadius = "50%"; piece.style.height = "9px"; }
      if (i % 5 === 0) { piece.style.width = "6px"; piece.style.height = "18px"; }

      longest = Math.max(longest, dur + delay);
      layer.appendChild(piece);
    }

    // Tear the layer down once the last piece has finished.
    setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, longest + 200);
  }

  /* -----------------------------------------------------------------------
     THANK-YOU: personalize greeting from sessionStorage first name.
     ----------------------------------------------------------------------- */
  function initThankYouName() {
    var slot = $("[data-firstname]");
    if (!slot) return;
    var name = "";
    try { name = sessionStorage.getItem(CFG.firstNameStorageKey || "tbo_first_name") || ""; }
    catch (e) { name = ""; }
    if (name) {
      slot.textContent = name;          // "You're registered, {name}."
    } else {
      // no name available — hide the personalization wrapper, keep generic greeting
      var wrap = slot.closest("[data-firstname-wrap]");
      if (wrap) wrap.style.display = "none";
    }
  }

  /* -----------------------------------------------------------------------
     REMINDER GROUP + VIDEO links (thank-you)
     Each entry maps a data-* hook in the HTML to a config key. A link is only
     wired up once its config value is a real URL; until then it keeps the
     placeholder href="#" so an unset link is obvious rather than silent.
     ----------------------------------------------------------------------- */
  var THANKYOU_LINKS = [
    { hook: "data-reminder-link", key: "reminderGroupUrl" },
    /* The confirmation pages' Join Group button. Wired here rather than on
       data-cfg-href because initThankYouLinks() skips any value that does not
       start with http, so an unset placeholder leaves the button inert instead
       of being written into the href. Gets target/rel for free too. */
    { hook: "data-whatsapp-link", key: "whatsappGroupUrl" },
    { hook: "data-how-video",     key: "howToAttendVideoUrl" },
    { hook: "data-why-video",     key: "whyAttendVideoUrl" }
  ];

  function initThankYouLinks() {
    THANKYOU_LINKS.forEach(function (link) {
      var url = CFG[link.key];
      if (!url || url.indexOf("http") !== 0) return;
      $all("[" + link.hook + "]").forEach(function (a) {
        a.href = url; a.target = "_blank"; a.rel = "noopener";
      });
    });
  }

  /* -----------------------------------------------------------------------
     MAIN CONFIRMATION VIDEO: autoplay with sound, without a dead player.

     The markup asks for sound-on autoplay. Chrome and Safari only grant that to
     domains the visitor has real history with, and when they refuse they do not
     fall back to muted, they simply leave the video paused. On a page reached by
     a cold ad click, refusal is the common case.

     So: try it with sound. If the player is not actually playing shortly after,
     the browser refused, and we start it muted and unmute on the visitor's first
     tap, click or key press, which is a gesture browsers do accept. Result is
     sound wherever it is allowed, playback everywhere, and never a video sitting
     paused behind an autoplay attribute that did nothing.

     Everything is wrapped in try/catch and the whole function no-ops without the
     hook, so a Wistia API change degrades to the plain declarative autoplay
     rather than throwing on pages that have no video at all.
     ----------------------------------------------------------------------- */
  var UNMUTE_GESTURES = ["pointerdown", "keydown", "touchstart"];

  function initAutoplayVideo() {
    var host = $("[data-autoplay-video]");
    if (!host) return;                                  // not this page
    var mediaId = host.getAttribute("data-autoplay-video");
    if (!mediaId) return;

    window._wq = window._wq || [];
    window._wq.push({
      id: mediaId,
      onReady: function (video) {
        try { video.unmute(); video.play(); }
        catch (err) { return; }

        setTimeout(function () {
          var playing;
          try { playing = video.state() === "playing"; }
          catch (err) { return; }
          if (playing) return;                          // sound-on autoplay allowed

          try { video.mute(); video.play(); }
          catch (err) { return; }

          function unmute() {
            try { video.unmute(); } catch (err) { /* player gone */ }
            UNMUTE_GESTURES.forEach(function (type) {
              document.removeEventListener(type, unmute);
            });
          }
          UNMUTE_GESTURES.forEach(function (type) {
            document.addEventListener(type, unmute);
          });
        }, 800);
      }
    });
  }

  /* -----------------------------------------------------------------------
     BOOT
     ----------------------------------------------------------------------- */
  function boot() {
    // Derived, so it must exist before fillConfigText() writes it into inputs.
    CFG.webinarTag = webinarTag();
    CFG.webinarOptinTag = webinarOptinTag();
    fillConfigText();
    initAttribution();   // before the forms exist in a submitted state
    flushWebhookQueue(); // re-send anything a dropped connection lost last time
    initSocialProof();
    initCountdowns();
    initCapacity();
    initModal();
    initReveal();
    initBonusGrid();
    initTimeline();
    initCalendar();
    initReplayVideo();
    initVslVideo();
    initReplayTeaser();
    initBookingEmbed();
    initStickyCta();
    initProgress();
    initThankYouName();
    initThankYouLinks();
    initIntakeForm();
    initProgressFill();
    initCallbackTimer();
    initAutoplayVideo();
    initCelebration();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

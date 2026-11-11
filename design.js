/* =============================================================
   Calyzzo — design layer behaviour (loads after main.js)
   Ambient colour · odometer numerals · 24h dial · booking steps
   Only transform/opacity are animated; honours prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";

  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn("[design:" + name + "]", e); } }
  var hasIO = "IntersectionObserver" in window;

  /* ---------- 1. Ambient colour follows the section in view ---------- */
  safe("ambient", function () {
    var sections = $$("[data-tone]");
    if (!sections.length || !hasIO) return;
    var visible = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
      var tone = "";
      sections.forEach(function (s) { if (visible.get(s)) tone = s.getAttribute("data-tone"); });
      if (tone) root.setAttribute("data-tone", tone); else root.removeAttribute("data-tone");
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  });

  /* ---------- 2. Odometer numerals ---------- */
  safe("odometer", function () {
    var els = $$("[data-odo]");
    if (!els.length) return;
    els.forEach(function (el) {
      var raw = el.getAttribute("data-odo") || "";
      var suffix = el.getAttribute("data-odo-suffix") || "";
      var digits = raw.replace(/\D/g, "");
      if (!digits) return;
      el.setAttribute("aria-label", raw + suffix);
      el.setAttribute("role", "text");
      var wrap = document.createElement("span");
      wrap.className = "odo";
      wrap.setAttribute("aria-hidden", "true");
      digits.split("").forEach(function (d, i) {
        var col = document.createElement("span");
        col.className = "odo-col";
        var strip = document.createElement("span");
        strip.className = "odo-strip";
        strip.style.setProperty("--d", d);
        strip.style.setProperty("--i", String(i));
        for (var n = 0; n <= 9; n++) { var s = document.createElement("span"); s.textContent = n; strip.appendChild(s); }
        col.appendChild(strip);
        wrap.appendChild(col);
      });
      el.textContent = "";
      el.appendChild(wrap);
      if (suffix) {
        var suf = document.createElement("span");
        suf.className = "odo-suf";
        suf.setAttribute("aria-hidden", "true");
        suf.textContent = suffix;
        el.appendChild(suf);
      }
      if (REDUCE || !hasIO) { el.classList.add("odo-ready"); el.querySelectorAll(".odo-strip").forEach(function (s) { s.style.transition = "none"; }); }
    });
    if (REDUCE || !hasIO) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        // let the element's own reveal finish first so the roll is seen
        setTimeout(function () { e.target.classList.add("odo-ready"); }, 250);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  });

  /* ---------- 3. 24-hour dial linked to the jornada cards ---------- */
  safe("dial", function () {
    var dial = $("[data-dial]");
    var cards = $$("[data-jornada]");
    if (!dial || !cards.length) return;
    var center = $(".dial-center", dial);
    var eyebrow = $("[data-dial-eyebrow]", dial);
    var time = $("[data-dial-time]", dial);
    var note = $("[data-dial-note]", dial);
    if (!center || !eyebrow || !time || !note) return;
    var def = { eyebrow: eyebrow.textContent, time: time.innerHTML, note: note.textContent };
    var current = "";
    var swapTimer = 0;
    var cycleTimer = 0;
    var cycleIdx = 0;
    var held = false;

    function paint(key) {
      var card = cards.filter(function (c) { return c.getAttribute("data-jornada") === key; })[0];
      clearTimeout(swapTimer);
      center.classList.add("is-swapping");
      swapTimer = setTimeout(function () {
        if (card) {
          eyebrow.textContent = card.getAttribute("data-eyebrow") || "";
          time.innerHTML = card.getAttribute("data-time") || ""; // own trusted markup (<small>)
          note.textContent = card.getAttribute("data-note") || "";
        } else {
          eyebrow.textContent = def.eyebrow; time.innerHTML = def.time; note.textContent = def.note;
        }
        center.classList.remove("is-swapping");
      }, REDUCE ? 0 : 180);
    }
    function activate(key) {
      if (key === current) return;
      current = key;
      if (key) dial.setAttribute("data-active", key); else dial.removeAttribute("data-active");
      cards.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-jornada") === key); });
      paint(key);
    }

    cards.forEach(function (c) {
      var key = c.getAttribute("data-jornada");
      c.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { held = true; activate(key); } });
      c.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { held = false; activate(""); } });
      c.addEventListener("focusin", function () { held = true; activate(key); });
      c.addEventListener("focusout", function () { held = false; activate(""); });
      c.addEventListener("click", function () { activate(key); });
    });

    // Gentle autoplay while the dial is on screen, so touch screens see it breathe too.
    function startCycle() {
      if (REDUCE || cycleTimer) return;
      cycleTimer = setInterval(function () {
        if (held || document.hidden) return;
        var key = cards[cycleIdx % cards.length].getAttribute("data-jornada");
        cycleIdx++;
        activate(key);
      }, 3200);
    }
    function stopCycle() { clearInterval(cycleTimer); cycleTimer = 0; }
    if (hasIO && !REDUCE) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) startCycle(); else { stopCycle(); if (!held) activate(""); } });
      }, { threshold: 0.35 }).observe(dial);
    }
  });

  /* ---------- 4. “Cotizar esta jornada” preselects the radio card ---------- */
  safe("pick-jornada", function () {
    var btns = $$("[data-pick-jornada]");
    var group = $("#jornada");
    var target = $("#reservas");
    if (!btns.length || !group || !target) return;
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var val = b.getAttribute("data-pick-jornada");
        var input = group.querySelector('input[value="' + val + '"]');
        if (input) {
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        target.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
        // move focus without a second jump once the scroll has settled
        setTimeout(function () {
          var cal = $("[data-calendar] .calendar-day.available, [data-calendar] button.calendar-day");
          if (cal && cal.focus) { try { cal.focus({ preventScroll: true }); } catch (e) { cal.focus(); } }
        }, REDUCE ? 50 : 900);
      });
    });
  });

  /* ---------- 5. Booking steps indicator ---------- */
  safe("steps", function () {
    var sec = $("#reservas");
    var items = $$("[data-step-item]");
    if (!sec || !items.length) return;
    var dateInput = $("[data-calendar-input]");
    var success = $("[data-form-success]");
    var form = $("[data-form]");

    function step() {
      var s = 1;
      if (dateInput && dateInput.value) s = 2;
      if (success && success.classList.contains("is-visible")) s = 3;
      sec.setAttribute("data-step", String(s));
      items.forEach(function (li) {
        var n = parseInt(li.getAttribute("data-step-item"), 10);
        li.classList.toggle("is-done", n < s);
        li.classList.toggle("is-current", n === s);
        if (n === s) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
    }
    step();
    // main.js writes the chosen date into this input programmatically (no events), so watch for it
    if (dateInput) {
      var last = dateInput.value;
      var poll = function () { if (dateInput.value !== last) { last = dateInput.value; step(); } };
      document.addEventListener("click", function () { setTimeout(poll, 0); setTimeout(poll, 120); }, true);
      document.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { setTimeout(poll, 0); setTimeout(poll, 120); } }, true);
    }
    if (success && "MutationObserver" in window) {
      new MutationObserver(step).observe(success, { attributes: true, attributeFilter: ["class"] });
    }
    if (form) form.addEventListener("reset", function () { setTimeout(step, 0); });
  });

  /* ---------- 6. Staggered reveals for grids (extra delay by sibling index) ---------- */
  safe("stagger", function () {
    if (REDUCE) return;
    var groups = [".amenidades-grid > .amenidad", ".proceso-steps > .paso", ".galeria-grid > .galeria-item", ".faq-list > .faq-item"];
    groups.forEach(function (sel) {
      $$(sel).forEach(function (el, i) {
        if (el.style.transitionDelay) return;
        el.style.transitionDelay = (Math.min(i, 8) * 70) + "ms";
        // the delay is only for the entrance; clear it so hover effects stay instant
        el.addEventListener("transitionend", function clear(ev) {
          if (ev.target !== el || ev.propertyName !== "opacity") return;
          el.style.transitionDelay = "";
          el.removeEventListener("transitionend", clear);
        });
      });
    });
  });
})();

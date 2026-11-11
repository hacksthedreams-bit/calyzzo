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

  /* ---------- 7. Concepto photo slider (clip-wipe + slow zoom, swipe, keyboard-friendly dots) ---------- */
  safe("slider", function () {
    var host = $("[data-slider]");
    if (!host) return;
    var frame = $(".slider-frame", host);
    var slides = $$(".slide", host);
    var dots = $$(".slider-dot", host);
    var cap = $("[data-slider-caption]", host);
    var cnt = $("[data-slider-count]", host);
    var capBox = $(".slider-caption", host);
    if (!frame || slides.length < 2) return;
    var MS = 3800, idx = 0, timer = 0, inView = false, hover = false, busy = false;
    var auto = !REDUCE;
    if (!auto) host.classList.add("is-static");

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function paused() { host.classList.toggle("is-paused", hover || !inView || document.hidden); }
    function schedule() {
      clearTimeout(timer);
      if (!auto || !inView || hover || document.hidden) return;
      timer = setTimeout(function () { go(idx + 1); }, MS);
    }
    function go(n, manual) {
      clearTimeout(timer);
      n = (n + slides.length) % slides.length;
      if (n === idx || busy) { schedule(); return; }
      var im = $("img", slides[n]);
      if (im && !(im.complete && im.naturalWidth)) {
        // never wipe to a photo that has not arrived: wait for it (max 2.5 s), then go
        busy = true; im.loading = "eager";
        var fired = false, run = function () { if (fired) return; fired = true; busy = false; go(n, manual); };
        im.addEventListener("load", run, { once: true }); im.addEventListener("error", run, { once: true }); setTimeout(run, 2500);
        return;
      }
      busy = true;
      var prev = slides[idx];
      var next = slides[n];
      prev.classList.remove("is-active"); prev.classList.add("is-prev");
      next.classList.remove("is-prev"); void next.offsetWidth; next.classList.add("is-active");
      dots.forEach(function (d, i) {
        d.classList.remove("is-active");
        d.classList.toggle("is-done", i < n);
        if (i === n) d.removeAttribute("aria-current"); else d.removeAttribute("aria-current");
      });
      void host.offsetWidth;
      dots[n].classList.add("is-active");
      dots[n].setAttribute("aria-current", "true");
      if (capBox) capBox.classList.add("is-out");
      frame.classList.remove("is-swap"); void frame.offsetWidth; frame.classList.add("is-swap");
      setTimeout(function () {
        if (cap) cap.textContent = next.getAttribute("data-caption") || "";
        if (cnt) cnt.textContent = pad(n + 1);
        if (capBox) capBox.classList.remove("is-out");
      }, REDUCE ? 0 : 320);
      setTimeout(function () { prev.classList.remove("is-prev"); busy = false; }, REDUCE ? 50 : 1000);
      idx = n;
      schedule();
    }

    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i, true); }); });
    host.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hover = true; paused(); schedule(); } });
    host.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hover = false; paused(); schedule(); } });
    document.addEventListener("visibilitychange", function () { paused(); schedule(); });

    // swipe left / right
    var sx = 0, sy = 0, down = false;
    frame.addEventListener("pointerdown", function (e) { down = true; sx = e.clientX; sy = e.clientY; });
    window.addEventListener("pointerup", function (e) {
      if (!down) return; down = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) go(idx + (dx < 0 ? 1 : -1), true);
    });
    // soft pointer parallax on the photo (mouse only)
    if (!REDUCE && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      frame.addEventListener("pointermove", function (e) {
        var r = frame.getBoundingClientRect();
        frame.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * -14).toFixed(1) + "px");
        frame.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * -14).toFixed(1) + "px");
      });
      frame.addEventListener("pointerleave", function () { frame.style.setProperty("--px", "0px"); frame.style.setProperty("--py", "0px"); });
    }
    if (hasIO) {
      // warm the other photos shortly before the section arrives so the wipe never meets an empty frame
      new IntersectionObserver(function (es, o) {
        if (es[0].isIntersecting) { slides.forEach(function (s) { var i = $("img", s); if (i) i.loading = "eager"; }); o.disconnect(); }
      }, { rootMargin: "700px 0px" }).observe(host);
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { inView = e.isIntersecting; paused(); if (inView) schedule(); else clearTimeout(timer); });
      }, { threshold: 0.35 }).observe(host);
    } else { inView = true; schedule(); }
    paused();
  });

  /* ---------- 8. Icon identity, glints and sparkles ---------- */
  safe("icons", function () {
    $$("svg.ico").forEach(function (svg) {
      var u = svg.querySelector("use");
      if (!u) return;
      var h = u.getAttribute("href") || u.getAttribute("xlink:href") || "";
      var name = h.replace("#i-", "");
      if (name) svg.setAttribute("data-ico", name);
    });
  });
  safe("glint", function () {
    // glints answer a hover: skip them entirely on touch screens (fewer nodes, less work)
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches || REDUCE) return;
    var sel = ".showcase-card, .amenidad, .paso, .jornada-card, .evento-panel, .galeria-item";
    $$(sel).forEach(function (el) {
      if (el.querySelector(":scope > .glint")) return;
      var g = document.createElement("i");
      g.className = "glint"; g.setAttribute("aria-hidden", "true");
      el.appendChild(g);
    });
  });
  safe("sparkles", function () {
    var hosts = $$("[data-sparkles]");
    if (!hosts.length || REDUCE) return;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    hosts.forEach(function (h) {
      var n = Math.min(parseInt(h.getAttribute("data-sparkles"), 10) || 6, 14);
      for (var i = 0; i < n; i++) {
        var s = document.createElement("i");
        s.className = "sp"; s.setAttribute("aria-hidden", "true");
        s.style.left = (rnd() * 100).toFixed(1) + "%";
        s.style.top = (rnd() * 100).toFixed(1) + "%";
        var sz = 9 + Math.round(rnd() * 11);
        s.style.width = sz + "px"; s.style.height = sz + "px";
        s.style.setProperty("--sp-d", (2.8 + rnd() * 2.4).toFixed(1) + "s");
        s.style.setProperty("--sp-w", (rnd() * 4).toFixed(1) + "s");
        h.appendChild(s);
      }
      if (hasIO) {
        new IntersectionObserver(function (es) { es.forEach(function (e) { h.classList.toggle("is-live", e.isIntersecting); }); }, { threshold: 0.1 }).observe(h);
      } else { h.classList.add("is-live"); }
    });
  });

  /* ---------- 9. Warm lazy images well before they scroll in, so a card never shows an empty frame ---------- */
  safe("warm-images", function () {
    if (!hasIO) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.loading = "eager"; io.unobserve(e.target); } });
    }, { rootMargin: "1600px 0px" });
    $$('img[loading="lazy"]').forEach(function (i) { io.observe(i); });
  });

})();

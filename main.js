/* ============================================================
   Calyzzo — main.js
   Archetype 02 · Editorial Dark Warm · Gold Palette
   v=20260831
   ============================================================ */
(function () {
  "use strict";

  var BRAND = window.__BRAND__ || {};

  /* ---------- safe() wrapper ---------- */
  function safe(name, fn) {
    try { fn(); }
    catch (e) { console.warn("[Calyzzo] " + name + " failed:", e); }
  }

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function raf(fn) { requestAnimationFrame(fn); }

  var MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  function longDate(iso) {
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DAYS_ES[d.getDay()] + " " + d.getDate() + " de " + MONTHS_ES[d.getMonth()] + " de " + d.getFullYear();
  }

  /* ============================================================
     1. SPLASH LOADER — double safety net
     ============================================================ */
  safe("splash", function () {
    var splash = $("[data-splash]");
    var root = document.documentElement;
    if (!splash) { root.classList.add("is-ready"); return; }

    var bar = $("[data-splash-bar]", splash);
    var count = $("[data-splash-count]", splash);
    var started = performance.now();
    var MIN_MS = 1700;
    var loaded = false;
    var done = false;
    var shown = 0;

    function paint(v) {
      if (bar) bar.style.transform = "scaleX(" + (v / 100) + ")";
      if (count) count.textContent = Math.round(v);
    }

    function leave() {
      if (done) return;
      done = true;
      paint(100);
      splash.classList.add("is-out");
      // Curtains start opening; hero entrance starts with them.
      setTimeout(function () { root.classList.add("is-ready"); }, 350);
      setTimeout(function () {
        splash.style.display = "none";
        document.body.classList.add("loaded");
      }, 1700);
    }

    // Fake-but-honest progress: eases toward 92% by MIN_MS, jumps to 100% on load.
    function tick(now) {
      if (done) return;
      var t = Math.min((now - started) / MIN_MS, 1);
      var target = loaded ? 100 : 92 * (1 - Math.pow(1 - t, 3));
      shown += (target - shown) * 0.18;
      paint(shown);
      if (loaded && t >= 1 && shown > 99) { leave(); return; }
      raf(tick);
    }
    raf(tick);

    if (document.readyState === "complete") loaded = true;
    else window.addEventListener("load", function () { loaded = true; });

    // Safety nets: never trap the visitor behind the curtain.
    setTimeout(leave, 4200);
  });

  /* ============================================================
     2. NAV — sticky + mobile toggle
     ============================================================ */
  safe("nav", function () {
    var nav = $(".nav");
    var toggle = $(".nav-toggle");
    var mobile = $(".nav-mobile");
    if (!nav) return;

    // Sticky shrink on scroll
    var lastY = 0;
    function onScroll() {
      var y = window.scrollY;
      if (y > 60) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");

      // Hide on a deliberate scroll down, return on any scroll up.
      var menuOpen = toggle && toggle.getAttribute("aria-expanded") === "true";
      if (!menuOpen && y > 500 && y > lastY + 6) nav.classList.add("is-hidden");
      else if (y < lastY - 4 || y <= 500 || menuOpen) nav.classList.remove("is-hidden");
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Mobile menu — one setOpen() drives button, panel, inert and scroll lock
    // together so they can never drift apart (gotcha A.16).
    if (toggle && mobile) {
      var setOpen = function (open) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.classList.toggle("is-open", open);
        mobile.classList.toggle("is-open", open);
        mobile.setAttribute("aria-hidden", open ? "false" : "true");
        mobile.inert = !open;
        document.body.style.overflow = open ? "hidden" : "";
      };

      toggle.addEventListener("click", function () {
        setOpen(toggle.getAttribute("aria-expanded") !== "true");
      });
      $$("a", mobile).forEach(function (a) {
        a.addEventListener("click", function () { setOpen(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
          setOpen(false);
          toggle.focus();
        }
      });
    }

    // Smooth scroll for anchor links
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length <= 1) return;
        var target = $(id);
        if (target) {
          e.preventDefault();
          var top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: top, behavior: "smooth" });
        }
      });
    });
  });

  /* ============================================================
     3. REVEAL — IntersectionObserver with safety net
     ============================================================ */
  safe("reveal", function () {
    var reveals = $$(".reveal");
    if (!reveals.length) return;

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });

      reveals.forEach(function (el) { obs.observe(el); });

      // 6-second safety net
      setTimeout(function () {
        reveals.forEach(function (el) {
          if (!el.classList.contains("is-visible")) {
            el.classList.add("is-visible");
          }
        });
      }, 6000);
    } else {
      // No IO support — show all
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }
  });

  /* ============================================================
     3b. TEXT SPLITTING + CLIP REVEALS
     Structure-preserving: walks child nodes so <em> and <br> survive
     (a flat innerText split would destroy them — gotcha A.4).
     Hidden states are CSS (html.js + .is-split); release is an
     IntersectionObserver class, not a GSAP tween, so a stalled
     ticker can never leave a title invisible.
     ============================================================ */
  safe("text-split", function () {
    function wrapWords(node, state, masked) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var inner = document.createElement("span");
            inner.textContent = part;
            if (masked) {
              inner.className = "wi";
              inner.style.setProperty("--i", state.i++);
              var outer = document.createElement("span");
              outer.className = "w";
              outer.appendChild(inner);
              frag.appendChild(outer);
            } else {
              inner.className = "sw";
              frag.appendChild(inner);
            }
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          wrapWords(child, state, masked);
        }
      });
    }

    var titles = $$("[data-split-title]");
    titles.forEach(function (t) { wrapWords(t, { i: 0 }, true); t.classList.add("is-split"); });

    $$("[data-scrub-words]").forEach(function (p) { wrapWords(p, { i: 0 }, false); p.classList.add("is-scrub"); });

    // Footer wordmark: per-letter, same restore-safe pattern.
    var mark = $("[data-wordmark]");
    if (mark) {
      var letters = mark.textContent.trim().split("");
      mark.textContent = "";
      letters.forEach(function (ch, i) {
        var s = document.createElement("span");
        s.className = "ch"; s.textContent = ch; s.style.setProperty("--i", i);
        mark.appendChild(s);
      });
      mark.classList.add("is-split");
    }

    var targets = titles.concat($$("[data-clip]"), mark ? [mark] : []);
    if (!targets.length) return;

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.01, rootMargin: "0px 0px -8% 0px" });
      targets.forEach(function (el) { io.observe(el); });
    } else {
      targets.forEach(function (el) { el.classList.add("is-in"); });
    }

    // Safety net: anything the visitor has already scrolled to (or past) but
    // the observer somehow missed gets released. Elements still below the fold
    // keep their entrance for when they actually arrive.
    function sweep() {
      targets.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
      });
    }
    setTimeout(sweep, 6000);
    window.addEventListener("scroll", function () { clearTimeout(sweep.t); sweep.t = setTimeout(sweep, 1200); }, { passive: true });
  });

  /* ============================================================
     4. GSAP + ScrollTrigger init
     ============================================================ */
  safe("gsap-init", function () {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    /* --- 4a. Showcase: pinned horizontal scroll (desktop) / native swipe (mobile) ---
       Hero entrance is pure CSS (html.is-ready), so no GSAP ticker dependency. */
    safe("showcase-scroll", function () {
      var section = $("#servicios");
      var wrapper = $("[data-showcase]");
      var track = $("[data-showcase-track]");
      var bar = $("[data-showcase-progress]");
      var idx = $("[data-showcase-index]");
      if (!section || !wrapper || !track) return;

      var cards = $$(".showcase-card", track);
      function pad2(n) { return n < 10 ? "0" + n : "" + n; }
      function setProgress(p) {
        if (bar) bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)) + ")";
        if (idx && cards.length) idx.textContent = pad2(Math.min(cards.length, Math.round(p * (cards.length - 1)) + 1));
      }
      setProgress(0);

      // matchMedia re-runs the right branch on every breakpoint change (and
      // cleans up the other one), so rotating a tablet or resizing a window
      // never leaves the section in the wrong mode.
      var mm = gsap.matchMedia();

      // Mobile / tablet: native swipe, progress follows scrollLeft.
      mm.add("(max-width: 959px)", function () {
        function onScroll() {
          var max = wrapper.scrollWidth - wrapper.clientWidth;
          setProgress(max > 0 ? wrapper.scrollLeft / max : 0);
        }
        wrapper.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return function () { wrapper.removeEventListener("scroll", onScroll); };
      });

      // Desktop: pinned horizontal journey with inner-image parallax.
      mm.add("(min-width: 960px)", function () {
        function distance() { return Math.max(0, track.scrollWidth - wrapper.offsetWidth); }

        var hTween = gsap.to(track, {
          x: function () { return -distance(); },
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            end: function () { return "+=" + distance(); },
            invalidateOnRefresh: true,
            onUpdate: function (self) { setProgress(self.progress); }
          }
        });

        cards.forEach(function (card) {
          var img = $("img.showcase-card-img", card);
          if (!img) return;
          gsap.fromTo(img, { "--px": "-9%" }, {
            "--px": "9%", ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: hTween,
              start: "left right",
              end: "right left",
              scrub: true
            }
          });
        });

        return function () { setProgress(0); };
      });
    });

    /* --- 4b. Scroll-scrubbed image parallax (drives --py on [data-parallax]) --- */
    safe("parallax", function () {
      $$("[data-parallax]").forEach(function (img) {
        var wrap = img.closest("[data-parallax-wrap]") || img.parentElement;
        gsap.fromTo(img, { "--py": "-7%" }, {
          "--py": "7%", ease: "none",
          scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true }
        });
      });
    });

    /* --- 4c. Paragraph words light up as you read --- */
    safe("scrub-words", function () {
      $$("[data-scrub-words]").forEach(function (p) {
        var words = $$(".sw", p);
        if (!words.length) return;
        gsap.fromTo(words, { opacity: 0.26 }, {
          opacity: 1, ease: "none", stagger: 0.12,
          scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 48%", scrub: true }
        });
      });
    });

    // Late-loading images change layout; re-measure every trigger once all is in.
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  });

  /* ============================================================
     5. TILT 3D EFFECT — 7° max with radial halo
     ============================================================ */
  safe("tilt", function () {
    var cards = $$("[data-tilt]");
    if (!cards.length) return;

    // Skip on touch devices
    if ("ontouchstart" in window) return;

    var MAX_DEG = 7;

    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var rotY = (x - 0.5) * MAX_DEG * 2;
        var rotX = (0.5 - y) * MAX_DEG * 2;

        card.style.transform = "perspective(800px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) scale(1.02)";

        // Radial glow following cursor
        var glow = $(".tilt-glow", card);
        if (glow) {
          glow.style.opacity = "1";
          glow.style.background = "radial-gradient(circle at " + (x * 100) + "% " + (y * 100) + "%, var(--gold-glow), transparent 60%)";
        }
      });

      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
        var glow = $(".tilt-glow", card);
        if (glow) glow.style.opacity = "0";
      });
    });
  });

  /* ============================================================
     6. CALENDAR — availability with occupied dates
     ============================================================ */
  safe("calendar", function () {
    var calEl = $("[data-calendar]");
    var daysEl = $("[data-calendar-days]");
    var monthEl = $("[data-calendar-month]");
    var prevBtn = $("[data-calendar-prev]");
    var nextBtn = $("[data-calendar-next]");
    var dateInput = $("[data-calendar-input]");
    if (!calEl || !daysEl || !monthEl) return;

    var occupied = (BRAND.fechasOcupadas || []).reduce(function (acc, d) {
      acc[d] = true;
      return acc;
    }, {});

    var months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    var today = new Date();
    var currentMonth = today.getMonth();
    var currentYear = today.getFullYear();
    var selectedDate = null;

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function render(animate) {
      monthEl.textContent = months[currentMonth] + " " + currentYear;
      daysEl.innerHTML = "";

      var first = new Date(currentYear, currentMonth, 1);
      var startDay = first.getDay() || 7; // Monday = 1
      var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Empty cells for days before the 1st
      for (var e = 1; e < startDay; e++) {
        var empty = document.createElement("span");
        empty.className = "calendar-day is-empty";
        daysEl.appendChild(empty);
      }

      var todayStr = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());

      for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = currentYear + "-" + pad(currentMonth + 1) + "-" + pad(d);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.textContent = d;

        var isOccupied = occupied[dateStr];
        var isPast = new Date(currentYear, currentMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var isSelected = selectedDate === dateStr;
        var isToday = dateStr === todayStr;

        if (animate) {
          btn.classList.add("anim-in");
          btn.style.setProperty("--i", d);
        }

        if (isOccupied) {
          btn.classList.add("is-occupied");
          btn.disabled = true;
          btn.setAttribute("aria-label", d + " — Ocupado");
        } else if (isPast) {
          btn.classList.add("is-past");
          btn.disabled = true;
        } else {
          btn.classList.add("available");
          btn.setAttribute("aria-label", d + " — Disponible");
          btn.dataset.date = dateStr;
        }

        if (isSelected) {
          btn.classList.add("is-selected");
        }
        if (isToday) {
          btn.classList.add("is-today");
        }

        daysEl.appendChild(btn);
      }
    }

    // Day selection
    daysEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".calendar-day.available");
      if (!btn || btn.disabled) return;

      selectedDate = btn.dataset.date;
      render();

      if (dateInput) {
        dateInput.value = longDate(selectedDate);
        dateInput.dataset.iso = selectedDate;
      }
    });

    // Navigation
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        render(true);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        render(true);
      });
    }

    render(true);
  });

  /* ============================================================
     7. FORM — inline validation, then hand-off to WhatsApp
     The WhatsApp window is opened inside the submit gesture (popup
     blockers reject window.open from a later timeout) and the success
     state also carries an explicit button as a guaranteed fallback.
     ============================================================ */
  safe("form", function () {
    var form = $("[data-form]");
    var success = $("[data-form-success]");
    if (!form) return;

    var waNumber = ((BRAND.contact && BRAND.contact.whatsapp) || "56921944986").replace(/\D/g, "");
    var waLink = success ? $("[data-wa-link]", success) : null;
    var editBtn = success ? $("[data-form-edit]", success) : null;

    var rules = {
      "nombre": function (v) { return v.trim().length >= 2 ? "" : "Escribe tu nombre."; },
      "telefono": function (v) {
        var d = v.replace(/\D/g, "");
        return d.length >= 8 && d.length <= 13 ? "" : "Ingresa un teléfono válido (ej: +56 9 1234 5678).";
      },
      "email": function (v) {
        return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Revisa el formato del email.";
      },
      "tipo-evento": function (v) { return v ? "" : "Elige el tipo de evento."; },
      "jornada": function (v) { return v ? "" : "Elige una jornada."; },
      "invitados": function (v) {
        if (!v) return "";
        var n = Number(v);
        return n >= 1 && n <= 100 ? "" : "La capacidad máxima es de 100 invitados.";
      }
    };

    var fields = {};
    Object.keys(rules).forEach(function (id) {
      var el = form.querySelector("#" + id);
      if (!el) return;
      var group = el.closest(".form-group");
      var err = document.createElement("p");
      err.className = "form-error";
      err.id = "err-" + id;
      group.appendChild(err);
      el.setAttribute("aria-describedby", err.id);
      fields[id] = { el: el, group: group, err: err };

      el.addEventListener("blur", function () { check(id); });
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () {
        if (group.classList.contains("has-error")) check(id);
      });
    });

    function check(id) {
      var f = fields[id];
      var msg = rules[id](f.el.value);
      f.group.classList.toggle("has-error", !!msg);
      f.err.textContent = msg;
      f.el.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstBad = null;
      Object.keys(fields).forEach(function (id) {
        if (!check(id) && !firstBad) firstBad = fields[id].el;
      });
      if (firstBad) { firstBad.focus(); return; }

      var val = function (id) { return fields[id].el.value.trim(); };
      var tipo = fields["tipo-evento"].el;
      var jornada = fields["jornada"].el;
      var fecha = form.querySelector("#fecha");
      var mensaje = form.querySelector("#mensaje");

      var lines = [
        "Hola, me interesa cotizar un evento en Calyzzo.",
        "",
        "Nombre: " + val("nombre"),
        "Teléfono: " + val("telefono"),
        "Tipo de evento: " + tipo.options[tipo.selectedIndex].text,
        "Jornada: " + jornada.options[jornada.selectedIndex].text
      ];
      if (val("email")) lines.push("Email: " + val("email"));
      if (fecha && fecha.value) lines.push("Fecha: " + fecha.value);
      if (val("invitados")) lines.push("Invitados: " + val("invitados"));
      if (mensaje && mensaje.value.trim()) lines.push("Mensaje: " + mensaje.value.trim());

      var waUrl = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(lines.join("\n"));
      if (waLink) waLink.href = waUrl;

      var w = window.open(waUrl, "_blank");
      if (w) w.opener = null;

      if (success) {
        form.style.display = "none";
        success.classList.add("is-visible");
        var path = success.querySelector("path");
        if (path) path.style.animation = "drawCheck .5s var(--ease-out) .4s forwards";
        success.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        success.classList.remove("is-visible");
        form.style.display = "";
        var n = fields["nombre"];
        if (n) n.el.focus();
      });
    }
  });

  /* ============================================================
     8. WHATSAPP FLOAT — show after scroll
     ============================================================ */
  safe("wa-float", function () {
    var btn = $("[data-whatsapp-float]");
    if (!btn) return;

    var peeked = false;
    function peek() {
      // Desktop only: unfold the label once per session so people notice it
      var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (min-width: 720px)").matches;
      if (peeked || !canHover) return;
      peeked = true;
      try { if (sessionStorage.getItem("wa-peek")) return; sessionStorage.setItem("wa-peek", "1"); } catch (e) {}
      setTimeout(function () { btn.classList.add("is-peek"); }, 900);
      setTimeout(function () { btn.classList.remove("is-peek"); }, 6500);
    }

    function check() {
      if (window.scrollY > 400) {
        btn.classList.add("is-shown");
        peek();
        window.removeEventListener("scroll", check);
      }
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
  });

  /* ============================================================
     9. MESH GRADIENT — animated hero background
     ============================================================ */
  safe("mesh", function () {
    // The mesh animation is handled by CSS @property --mesh-angle
    // with keyframes. JS just ensures the class is present.
    var mesh = $(".hero-mesh");
    if (mesh) mesh.classList.add("active");
  });

  /* ============================================================
     10. ACTIVE NAV HIGHLIGHTING
     ============================================================ */
  safe("active-nav", function () {
    var sections = $$("section[id]");
    var navLinks = $$(".nav-link");
    if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) return;

    // Geometry-based (offsetTop) breaks once GSAP wraps a pinned section in a
    // .pin-spacer; an observer on the viewport's middle band is immune to that.
    function setActive(id) {
      navLinks.forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + id);
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (sec) { io.observe(sec); });
  });

  /* ============================================================
     11. IMAGE LAZY LOAD ENHANCEMENT
     ============================================================ */
  safe("img-load", function () {
    $$("img[loading='lazy']").forEach(function (img) {
      img.addEventListener("load", function () {
        img.classList.add("loaded");
      });
      // Already cached
      if (img.complete) img.classList.add("loaded");
    });
  });

  /* ============================================================
     12. EVENTO PANEL HOVER EFFECT
     ============================================================ */
  safe("panel-tilt", function () {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var MAX = 5;

    $$("[data-tilt-soft]").forEach(function (panel) {
      panel.addEventListener("mousemove", function (e) {
        var r = panel.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        panel.style.setProperty("--ry", ((x - 0.5) * MAX * 2).toFixed(2) + "deg");
        panel.style.setProperty("--rx", ((0.5 - y) * MAX * 2).toFixed(2) + "deg");
        panel.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        panel.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      });
      panel.addEventListener("mouseleave", function () {
        panel.style.setProperty("--rx", "0deg");
        panel.style.setProperty("--ry", "0deg");
      });
    });
  });

  /* ============================================================
     12b. SPOTLIGHT — cursor-following glow on cards
     ============================================================ */
  safe("spotlight", function () {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    $$("[data-spot]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  });

  /* ============================================================
     12c. MARQUEE — speed and direction react to scroll velocity
     ============================================================ */
  safe("marquee", function () {
    var track = $("[data-marquee] .marquee-track");
    if (!track || !track.getAnimations) return;
    var anim = track.getAnimations()[0];
    if (!anim) return;

    var lastY = window.scrollY, rate = 1, target = 1, ticking = false;
    window.addEventListener("scroll", function () {
      var dy = window.scrollY - lastY;
      lastY = window.scrollY;
      // Any scroll pushes the ticker faster; it eases back to cruising speed.
      // (Never negative: a reversed infinite CSS animation stops at t=0.)
      target = 1 + Math.min(Math.abs(dy) * 0.22, 7);
      if (!ticking) { ticking = true; raf(settle); }
    }, { passive: true });

    function settle() {
      rate += (target - rate) * 0.12;
      target += (1 - target) * 0.06;
      try { anim.updatePlaybackRate(rate); } catch (e) { anim.playbackRate = rate; }
      if (Math.abs(rate - 1) > 0.02 || Math.abs(target - 1) > 0.02) raf(settle);
      else { anim.updatePlaybackRate(1); ticking = false; }
    }
  });

  /* ============================================================
     14a. HERO PARALLAX
     ============================================================ */
  safe("hero-parallax", function () {
    if ("ontouchstart" in window) return;
    var bg = $(".hero-bg");
    var vid = $(".hero-video");
    var hero = $(".hero");
    var content = $(".hero-content");
    if (!bg || !hero) return;

    // Scale lives in CSS (Ken Burns drift); JS only owns vertical travel.
    function onScroll() {
      var y = window.scrollY;
      var h = hero.offsetHeight;
      if (y > h) return;
      bg.style.transform = "translateY(" + (y * 0.25) + "px)";
      if (vid) vid.style.transform = bg.style.transform;
      if (content) {
        content.style.transform = "translateY(" + (y * -0.12) + "px)";
        content.style.opacity = Math.max(0, 1 - (y / h) * 1.15).toFixed(3);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });

  /* ============================================================
     14b. HERO VIDEO — venue loop. Loaded only after the page is ready,
     skipped for reduced motion / data saver, paused off-screen, user can stop it.
     ============================================================ */
  safe("hero-video", function () {
    var video = $("[data-hero-video]");
    if (!video) return;
    var toggle = $("[data-hero-video-toggle]");
    var hero = $(".hero");

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var conn = navigator.connection || {};
    if (reduce || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) return;

    var tall = window.matchMedia("(max-aspect-ratio: 1/1)");
    var userPaused = false;
    var inView = true;

    function play() {
      if (userPaused || !inView || !video.getAttribute("src")) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    function load() {
      var src = video.getAttribute(tall.matches ? "data-src-v" : "data-src-h");
      if (!src || video.getAttribute("src") === src) return;
      video.classList.remove("is-playing");
      video.setAttribute("src", src);
      video.load();
      play();
    }
    function setToggle(paused) {
      if (!toggle) return;
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      toggle.setAttribute("aria-label", paused ? "Reproducir video de fondo" : "Pausar video de fondo");
    }

    video.addEventListener("playing", function () {
      video.classList.add("is-playing");
      if (toggle) toggle.hidden = false;
    });
    video.addEventListener("error", function () {
      video.classList.remove("is-playing");
      if (toggle) toggle.hidden = true;
    });

    if (toggle) {
      toggle.addEventListener("click", function () {
        userPaused = !video.paused;
        if (userPaused) video.pause(); else play();
        setToggle(userPaused);
      });
    }

    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) play(); else video.pause();
      }, { threshold: 0.05 }).observe(hero);
    }

    if (tall.addEventListener) tall.addEventListener("change", load);

    function start() { setTimeout(load, 300); }
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);
  });

  /* ============================================================
     14. SCROLL PROGRESS BAR
     ============================================================ */
  safe("scroll-progress", function () {
    var bar = $("[data-scroll-progress-bar]");
    if (!bar) return;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ============================================================
     15. SECTION NAV — abre/cierra categorías al navegar
     ============================================================ */
  safe("section-nav", function () {
    var nav = $("[data-section-nav]");
    if (!nav) return;

    var links = $$("[data-section-nav-link]", nav);
    if (!links.length) return;

    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute("data-section-nav-link");
      var section = document.getElementById(id);
      if (section) map[id] = { link: a, li: a.closest("li") };
    });

    function setActive(id) {
      links.forEach(function (a) {
        var entry = map[a.getAttribute("data-section-nav-link")];
        if (!entry) return;
        entry.li.classList.toggle("is-active", a.getAttribute("data-section-nav-link") === id);
      });
    }

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

      Object.keys(map).forEach(function (id) {
        obs.observe(document.getElementById(id));
      });
    }
  });

  /* ============================================================
     16. STAT COUNTERS — count-up on scroll into view
     ============================================================ */
  safe("stat-counters", function () {
    var nums = $$("[data-count-to]");
    if (!nums.length) return;

    function animate(el) {
      var to = parseFloat(el.getAttribute("data-count-to"));
      var decimals = parseInt(el.getAttribute("data-count-decimals") || "0", 10);
      var suffix = el.getAttribute("data-count-suffix") || "";
      var start = null;
      var duration = 1400;

      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = to * eased;
        el.textContent = current.toFixed(decimals) + suffix;
        if (progress < 1) raf(step);
      }
      raf(step);
    }

    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      nums.forEach(function (el) { obs.observe(el); });
    } else {
      nums.forEach(animate);
    }
  });

  /* ============================================================
     17. MAGNETIC BUTTONS — subtle cursor-follow on primary CTAs
     ============================================================ */
  safe("magnetic-buttons", function () {
    if ("ontouchstart" in window) return;
    var MAX_PULL = 8;

    $$("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        btn.style.transform = "translate(" + (x * MAX_PULL) + "px, " + (y * MAX_PULL) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  });

  /* ============================================================
     19b. MAP — Google Maps loads only after the visitor asks for it
     (no third-party request or cookies until then)
     ============================================================ */
  safe("map-embed", function () {
    var card = $("[data-map]");
    var btn = card && $("[data-map-load]", card);
    if (!card || !btn) return;
    btn.addEventListener("click", function () {
      if (card.classList.contains("is-loading")) return;
      card.classList.add("is-loading");
      btn.textContent = "Cargando mapa…";
      var frame = document.createElement("iframe");
      frame.src = card.getAttribute("data-map-src");
      frame.title = "Mapa de Calyzzo en Batuco";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.setAttribute("allowfullscreen", "");
      frame.addEventListener("load", function () {
        // Let the tiles paint before the placeholder steps aside
        setTimeout(function () { card.classList.add("is-loaded"); }, 900);
      });
      card.appendChild(frame);
      // If the load event never arrives, show whatever the frame has anyway
      setTimeout(function () { card.classList.add("is-loaded"); }, 8000);
    });
  });

  /* ============================================================
     20. EDITORIAL KICKER NUMBERS — "01 ——— Nosotros"
     ============================================================ */
  safe("kicker-numbers", function () {
    var order = ["concepto", "servicios", "eventos", "amenidades", "horarios", "proceso", "reservas", "galeria", "ubicacion", "faq"];
    order.forEach(function (id, i) {
      var section = document.getElementById(id);
      var kicker = section && $(".kicker", section);
      if (!kicker) return;
      var n = document.createElement("span");
      n.className = "kicker-num";
      n.setAttribute("aria-hidden", "true");
      n.textContent = (i + 1 < 10 ? "0" : "") + (i + 1);
      kicker.insertBefore(n, kicker.firstChild);
    });
  });

  /* ============================================================
     21. BACK TO TOP — with scroll-progress ring
     ============================================================ */
  safe("to-top", function () {
    var btn = $("[data-to-top]");
    var bar = $("[data-to-top-bar]");
    if (!btn) return;
    var C = 138.23;
    var ticking = false;

    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (bar) bar.style.strokeDashoffset = (C * (1 - p)).toFixed(2);
      btn.classList.toggle("is-visible", window.scrollY > 900);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; raf(update); }
    }, { passive: true });
    update();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ============================================================
     13. GALERIA LIGHTBOX — prev/next, counter, keyboard, crossfade
     ============================================================ */
  safe("lightbox", function () {
    var items = $$(".galeria-item img");
    if (!items.length) return;

    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Galería de imágenes");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    lightbox.innerHTML =
      '<div class="lightbox-backdrop"></div>' +
      '<button class="lightbox-nav lightbox-prev" aria-label="Imagen anterior">&#8249;</button>' +
      '<button class="lightbox-nav lightbox-next" aria-label="Imagen siguiente">&#8250;</button>' +
      '<div class="lightbox-content"><img class="lightbox-img" alt=""><button class="lightbox-close" aria-label="Cerrar">&times;</button></div>' +
      '<p class="lightbox-count" aria-live="polite"></p>';
    document.body.appendChild(lightbox);

    var lbImg = $(".lightbox-img", lightbox);
    var lbClose = $(".lightbox-close", lightbox);
    var lbBackdrop = $(".lightbox-backdrop", lightbox);
    var lbPrev = $(".lightbox-prev", lightbox);
    var lbNext = $(".lightbox-next", lightbox);
    var lbCount = $(".lightbox-count", lightbox);
    var current = 0;
    var opener = null;

    function pad2(n) { return n < 10 ? "0" + n : "" + n; }

    function show(i, instant) {
      current = (i + items.length) % items.length;
      var img = items[current];
      var src = img.currentSrc || img.src;
      lbCount.textContent = pad2(current + 1) + " / " + pad2(items.length);
      if (instant) { lbImg.src = src; lbImg.alt = img.alt || ""; return; }
      lbImg.classList.add("is-swapping");
      setTimeout(function () {
        lbImg.src = src;
        lbImg.alt = img.alt || "";
        lbImg.classList.remove("is-swapping");
      }, 260);
    }

    function open(i) {
      opener = document.activeElement;
      show(i, true);
      lightbox.inert = false;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      lbClose.focus({ preventScroll: true });
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.inert = true;
      document.body.style.overflow = "";
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }

    items.forEach(function (img, i) {
      img.addEventListener("click", function () { open(i); });
    });

    lbClose.addEventListener("click", close);
    lbBackdrop.addEventListener("click", close);
    lbPrev.addEventListener("click", function () { show(current - 1); });
    lbNext.addEventListener("click", function () { show(current + 1); });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
    });

    // Swipe on touch screens
    var sx = null;
    lightbox.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });
  });

  /* ============================================================
     18. CUSTOM CURSOR — dot + trailing ring (fine pointers only)
     Invisible until the first real mousemove, so it can never
     sit at (0,0) on load (gotcha A.3).
     ============================================================ */
  safe("cursor", function () {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var el = document.createElement("div");
    el.className = "cursor";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"><span class="cursor-label"></span></div>';
    document.body.appendChild(el);

    var dot = $(".cursor-dot", el);
    var ring = $(".cursor-ring", el);
    var label = $(".cursor-label", el);
    var mx = 0, my = 0, rx = 0, ry = 0, seen = false, running = false;

    function loop() {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) raf(loop);
      else running = false;
    }

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      if (!seen) {
        seen = true; rx = mx; ry = my;
        el.classList.add("is-active");
        document.documentElement.classList.add("has-cursor");
      }
      if (!running) { running = true; raf(loop); }
    }, { passive: true });

    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest ? e.target.closest("a, button, [data-cursor], .btn, label, .calendar-day") : null;
      var field = e.target.closest ? e.target.closest("input, textarea, select") : null;
      el.classList.toggle("is-hidden-over", !!field);
      var txt = t && t.getAttribute("data-cursor");
      label.textContent = txt || "";
      el.classList.toggle("is-label", !!txt);
      el.classList.toggle("is-hover", !!t && !txt);
    });

    document.addEventListener("mousedown", function () { el.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { el.classList.remove("is-down"); });
    document.documentElement.addEventListener("mouseleave", function () { el.classList.remove("is-active"); });
    document.documentElement.addEventListener("mouseenter", function () { if (seen) el.classList.add("is-active"); });
  });

  /* ============================================================
     19. HERO BOKEH — drifting golden light motes on a canvas
     Pauses off-screen / in background tabs; skipped for
     reduced-motion visitors.
     ============================================================ */
  safe("hero-bokeh", function () {
    var canvas = $("[data-bokeh]");
    var hero = $(".hero");
    if (!canvas || !hero || !canvas.getContext) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var small = window.innerWidth < 720;
    var COUNT = small ? 20 : 44;
    var W = 0, H = 0, parts = [], onScreen = true, running = false;
    var px = 0, py = 0, tx = 0, ty = 0;

    function size() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make(initial) {
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 40,
        r: 3 + Math.random() * (small ? 12 : 20),
        vy: 0.1 + Math.random() * 0.34,
        vx: (Math.random() - 0.5) * 0.12,
        a: 0.1 + Math.random() * 0.24,
        ph: Math.random() * 6.28,
        z: 0.4 + Math.random() * 1.0,
        teal: Math.random() < 0.22
      };
    }

    function init() {
      size();
      parts = [];
      for (var i = 0; i < COUNT; i++) parts.push(make(true));
    }

    function frame(now) {
      if (!onScreen || document.hidden) { running = false; return; }
      ctx.clearRect(0, 0, W, H);
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(now * 0.0006 + p.ph) * 0.14;
        if (p.y < -40) { parts[i] = make(false); p = parts[i]; p.y = H + 40; }

        var tw = 0.62 + 0.38 * Math.sin(now * 0.0011 + p.ph);
        var alpha = p.a * tw;
        var cx = p.x + px * p.z * 26;
        var cy = p.y + py * p.z * 18;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.r);
        if (p.teal) {
          g.addColorStop(0, "rgba(130,222,228," + alpha * 0.85 + ")");
          g.addColorStop(1, "rgba(130,222,228,0)");
        } else {
          g.addColorStop(0, "rgba(248,218,150," + alpha + ")");
          g.addColorStop(1, "rgba(248,218,150,0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, 6.2832);
        ctx.fill();
      }
      raf(frame);
    }

    function start() { if (!running && onScreen && !document.hidden) { running = true; raf(frame); } }

    init();
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener("visibilitychange", start);

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(init, 200);
    });

    start();
  });

})();

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

  /* ============================================================
     1. SPLASH LOADER — double safety net
     ============================================================ */
  safe("splash", function () {
    var splash = $("[data-splash]");
    if (!splash) return;

    function kill() {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      setTimeout(function () {
        splash.style.display = "none";
        document.body.classList.add("loaded");
      }, 600);
    }

    // JS safety: kill after window load + 300ms
    window.addEventListener("load", function () {
      setTimeout(kill, 300);
    });

    // CSS safety: 4.5s animation fallback (handled in CSS)
    setTimeout(kill, 5000);
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
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Mobile menu
    if (toggle && mobile) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", !open);
        toggle.classList.toggle("is-open", !open);
        mobile.classList.toggle("is-open");
        mobile.setAttribute("aria-hidden", open);
        document.body.style.overflow = open ? "" : "hidden";
      });

      // Close on link click
      $$("a", mobile).forEach(function (a) {
        a.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          toggle.classList.remove("is-open");
          mobile.classList.remove("is-open");
          mobile.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
        });
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
     4. GSAP + ScrollTrigger init
     ============================================================ */
  safe("gsap-init", function () {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    /* --- 4a. Hero entrance --- */
    safe("hero-anim", function () {
      var targets = ".hero-logo,.hero-kicker,.hero-title,.hero-subtitle,.hero-rating,.hero-ctas";
      var tl = gsap.timeline({ delay: 1.2 });
      tl.from(".hero-logo", { scale: 0.8, opacity: 0, duration: 1, ease: "power3.out" })
        .from(".hero-kicker", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")
        .from(".hero-title", { y: 30, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.3")
        .from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
        .from(".hero-rating", { y: 15, opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")
        .from(".hero-ctas", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.2");

      // Safety net: these elements also carry .reveal, but this tween's inline
      // opacity wins over .reveal.is-visible. If the ticker stalls (backgrounded
      // tab, throttled low-power mode, a blocked script) before the timeline
      // finishes, force the final state so the hero is never stuck invisible.
      setTimeout(function () {
        $$(targets).forEach(function (el) {
          var tweens = gsap.getTweensOf(el);
          if (!tweens.length || tweens.some(function (t) { return t.progress() < 1; })) {
            gsap.set(el, { clearProps: "all" });
          }
        });
      }, 5000);
    });

    /* --- 4b. Showcase pinned horizontal scroll --- */
    safe("showcase-scroll", function () {
      var wrapper = $("[data-showcase]");
      var track = $("[data-showcase-track]");
      if (!wrapper || !track) return;

      // Only pin on wider screens
      if (window.innerWidth < 960) return;

      var cards = $$(".showcase-card", track);
      var totalScroll = track.scrollWidth - wrapper.offsetWidth;

      gsap.to(track, {
        x: function () { return -totalScroll; },
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          pin: true,
          scrub: 1,
          end: function () { return "+=" + totalScroll; },
          invalidateOnRefresh: true
        }
      });

      // Stagger card entrance (gsap.to, NOT gsap.from inside pin)
      cards.forEach(function (card) {
        gsap.set(card, { opacity: 0.3, scale: 0.95 });
      });
      cards.forEach(function (card, i) {
        gsap.to(card, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          delay: i * 0.1,
          scrollTrigger: {
            trigger: card,
            containerAnimation: null,
            start: "left 80%",
            toggleActions: "play none none none"
          }
        });
      });
    });

    /* --- 4c. Section title animations --- */
    safe("section-anims", function () {
      $$(".section-title").forEach(function (title) {
        gsap.from(title, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: title,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        });
      });
    });

    /* --- 4d. Evento panels scale-in --- */
    safe("eventos-anim", function () {
      $$(".evento-panel").forEach(function (panel, i) {
        gsap.from(panel, {
          scale: 0.92,
          opacity: 0,
          duration: 0.7,
          delay: i * 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: panel,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        });
      });
    });

    /* --- 4e. Galeria items stagger --- */
    safe("galeria-anim", function () {
      $$(".galeria-item").forEach(function (item, i) {
        gsap.from(item, {
          y: 40,
          opacity: 0,
          duration: 0.6,
          delay: (i % 4) * 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 88%",
            toggleActions: "play none none none"
          }
        });
      });
    });
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

    function render() {
      monthEl.textContent = months[currentMonth] + " " + currentYear;
      daysEl.innerHTML = "";

      var first = new Date(currentYear, currentMonth, 1);
      var startDay = first.getDay() || 7; // Monday = 1
      var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // Empty cells for days before the 1st
      for (var e = 1; e < startDay; e++) {
        var empty = document.createElement("span");
        empty.className = "calendar-day empty";
        daysEl.appendChild(empty);
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = currentYear + "-" + pad(currentMonth + 1) + "-" + pad(d);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.textContent = d;

        var isOccupied = occupied[dateStr];
        var isPast = new Date(currentYear, currentMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var isSelected = selectedDate === dateStr;

        if (isOccupied) {
          btn.classList.add("occupied");
          btn.disabled = true;
          btn.setAttribute("aria-label", d + " — Ocupado");
        } else if (isPast) {
          btn.classList.add("past");
          btn.disabled = true;
        } else {
          btn.classList.add("available");
          btn.setAttribute("aria-label", d + " — Disponible");
          btn.dataset.date = dateStr;
        }

        if (isSelected) {
          btn.classList.add("selected");
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
        dateInput.value = selectedDate;
      }
    });

    // Navigation
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        render();
      });
    }

    render();
  });

  /* ============================================================
     7. FORM — WhatsApp redirect with cinematographic success
     ============================================================ */
  safe("form", function () {
    var form = $("[data-form]");
    var success = $("[data-form-success]");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nombre = form.querySelector("#nombre");
      var telefono = form.querySelector("#telefono");
      var tipoEvento = form.querySelector("#tipo-evento");
      var jornada = form.querySelector("#jornada");
      var fecha = form.querySelector("#fecha");
      var invitados = form.querySelector("#invitados");
      var mensaje = form.querySelector("#mensaje");

      // Basic validation
      if (!nombre || !nombre.value.trim()) { nombre && nombre.focus(); return; }
      if (!telefono || !telefono.value.trim()) { telefono && telefono.focus(); return; }
      if (!tipoEvento || !tipoEvento.value) { tipoEvento && tipoEvento.focus(); return; }
      if (!jornada || !jornada.value) { jornada && jornada.focus(); return; }

      // Build WhatsApp message
      var lines = [
        "Hola, me interesa cotizar un evento en Calyzzo.",
        "",
        "Nombre: " + nombre.value.trim(),
        "Teléfono: " + telefono.value.trim(),
        "Tipo de evento: " + tipoEvento.options[tipoEvento.selectedIndex].text,
        "Jornada: " + jornada.options[jornada.selectedIndex].text
      ];

      if (fecha && fecha.value) lines.push("Fecha: " + fecha.value);
      if (invitados && invitados.value) lines.push("Invitados: " + invitados.value);
      if (mensaje && mensaje.value.trim()) lines.push("Mensaje: " + mensaje.value.trim());

      var text = encodeURIComponent(lines.join("\n"));
      var waNumber = (BRAND.contact && BRAND.contact.whatsapp) || "56921944986";
      var waUrl = "https://wa.me/" + waNumber + "?text=" + text;

      // Show success animation
      if (success) {
        form.style.display = "none";
        success.style.display = "block";

        // Animate the SVG check path
        var path = success.querySelector("path");
        if (path) {
          path.style.animation = "drawCheck .5s var(--ease-out) .4s forwards";
        }
      }

      // Redirect to WhatsApp after brief animation
      setTimeout(function () {
        window.open(waUrl, "_blank", "noopener");
      }, 1200);
    });
  });

  /* ============================================================
     8. WHATSAPP FLOAT — show after scroll
     ============================================================ */
  safe("wa-float", function () {
    var btn = $("[data-whatsapp-float]");
    if (!btn) return;

    btn.style.opacity = "0";
    btn.style.transform = "scale(0.8)";
    btn.style.transition = "opacity .4s, transform .4s";

    function check() {
      if (window.scrollY > 400) {
        btn.style.opacity = "1";
        btn.style.transform = "scale(1)";
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
    if (!sections.length || !navLinks.length) return;

    function highlight() {
      var scrollY = window.scrollY + 120;

      sections.forEach(function (section) {
        var top = section.offsetTop;
        var height = section.offsetHeight;
        var id = section.getAttribute("id");

        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach(function (link) {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + id) {
              link.classList.add("active");
            }
          });
        }
      });
    }

    window.addEventListener("scroll", highlight, { passive: true });
    highlight();
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
  safe("evento-hover", function () {
    if ("ontouchstart" in window) return;

    $$(".evento-panel").forEach(function (panel) {
      var img = $(".evento-panel-img", panel);
      if (!img) return;

      panel.addEventListener("mouseover", function (e) {
        if (e.relatedTarget && panel.contains(e.relatedTarget)) return;
        img.style.transform = "scale(1.08)";
      });

      panel.addEventListener("mouseout", function (e) {
        if (e.relatedTarget && panel.contains(e.relatedTarget)) return;
        img.style.transform = "";
      });
    });
  });

  /* ============================================================
     14a. HERO PARALLAX
     ============================================================ */
  safe("hero-parallax", function () {
    if ("ontouchstart" in window) return;
    var bg = $(".hero-bg");
    var hero = $(".hero");
    if (!bg || !hero) return;

    function onScroll() {
      var y = window.scrollY;
      if (y > hero.offsetHeight) return;
      bg.style.transform = "translateY(" + (y * 0.25) + "px) scale(1.08)";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
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
     13. GALERIA LIGHTBOX (simple)
     ============================================================ */
  safe("lightbox", function () {
    var items = $$(".galeria-item img");
    if (!items.length) return;

    // Create lightbox element
    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = '<div class="lightbox-backdrop"></div><div class="lightbox-content"><img class="lightbox-img" src="" alt=""><button class="lightbox-close" aria-label="Cerrar">&times;</button></div>';
    document.body.appendChild(lightbox);

    var lbImg = $(".lightbox-img", lightbox);
    var lbClose = $(".lightbox-close", lightbox);
    var lbBackdrop = $(".lightbox-backdrop", lightbox);

    function open(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || "";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    items.forEach(function (img) {
      img.style.cursor = "pointer";
      img.addEventListener("click", function () {
        open(img.src, img.alt);
      });
    });

    lbClose.addEventListener("click", close);
    lbBackdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  });

})();

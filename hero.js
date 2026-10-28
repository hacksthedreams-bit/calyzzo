/* ============================================================
   Calyzzo — Hero: "Un día en Calyzzo"
   Una sola variable de estado, p (0..1), dibuja todo:
     0 = día · 0.5 = atardecer · 1 = noche
   Fuentes de p: el scroll (hero fijado con ScrollTrigger), los
   botones de la línea de tiempo o el selector de jornada.
   Sin GSAP o con movimiento reducido: no hay pin, los controles
   cambian de momento al instante.
   ============================================================ */
(function () {
  "use strict";

  var hero = document.querySelector("[data-h2]");
  if (!hero) return;

  function safe(name, fn) {
    try { fn(); }
    catch (e) { console.warn("[Calyzzo hero] " + name + " failed:", e); }
  }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function raf(fn) { requestAnimationFrame(fn); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  var BRAND = window.__BRAND__ || {};
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var imgs = $$("[data-h2-img]", hero);
  var phases = $$("[data-h2-phase]", hero);
  var stops = $$("[data-h2-stop]", hero);
  var fill = $("[data-h2-fill]", hero);
  var hint = $("[data-h2-hint]", hero);
  var select = $("[data-h2-jornada]", hero);

  var JORNADAS = ["diurna", "extraordinaria", "nocturna"];
  // Fondo y brillo del hero por momento: tinta azul, ciruela, azul noche.
  var BG = [[13, 31, 46], [42, 23, 51], [6, 10, 27]];
  var GLOW = [[63, 166, 174, 0.2], [232, 128, 150, 0.22], [212, 175, 110, 0.16]];

  function mix(a, b, f) {
    return a.map(function (v, i) { return v + (b[i] - v) * f; });
  }

  /* ---------- dibujo: función pura de p ---------- */
  var active = -1;

  function render(p) {
    var t = p * 2;
    var i = Math.min(1, Math.floor(t));
    var f = t - i;

    // Fotos: la de abajo siempre opaca, las siguientes entran por encima
    // con un leve acercamiento que se asienta al llegar.
    imgs.forEach(function (img, k) {
      var o = k === 0 ? 1 : clamp(t - (k - 1), 0, 1);
      var s = k === 0 ? 1 + 0.035 * clamp(t, 0, 1) : 1 + 0.07 * (1 - o);
      img.style.opacity = o.toFixed(3);
      img.style.transform = "scale(" + s.toFixed(4) + ")";
    });

    // Color del cielo -> fondo del hero.
    var bg = mix(BG[i], BG[i + 1], f).map(Math.round);
    var gl = mix(GLOW[i], GLOW[i + 1], f);
    hero.style.setProperty("--h-bg", "rgb(" + bg.join(",") + ")");
    hero.style.setProperty("--h-glow", "rgba(" + Math.round(gl[0]) + "," + Math.round(gl[1]) + "," + Math.round(gl[2]) + "," + gl[3].toFixed(3) + ")");

    // Texto: cada momento se apaga antes de que entre el siguiente.
    phases.forEach(function (el, k) {
      var w = clamp(1 - Math.abs(t - k) * 2.2, 0, 1);
      el.style.opacity = w.toFixed(3);
      el.style.transform = "translateY(" + (-(t - k) * 16).toFixed(1) + "px)";
    });

    if (fill) fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (hint) hint.style.opacity = p > 0.04 ? "0" : "1";

    var now = clamp(Math.round(t), 0, 2);
    if (now !== active) {
      active = now;
      stops.forEach(function (b, k) {
        b.setAttribute("aria-selected", k === now ? "true" : "false");
        b.tabIndex = k === now ? 0 : -1;
      });
      phases.forEach(function (el, k) { el.setAttribute("aria-hidden", k === now ? "false" : "true"); });
      if (select && select.value !== JORNADAS[now]) select.value = JORNADAS[now];
    }
  }

  /* ---------- estado: p suaviza hacia su destino ---------- */
  var target = 0, cur = 0, running = false;

  function loop() {
    cur += (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0006) cur = target;
    render(cur);
    if (cur !== target) raf(loop); else running = false;
  }
  function setTarget(p) {
    target = clamp(p, 0, 1);
    if (reduce) { cur = target; render(cur); return; }
    if (!running) { running = true; raf(loop); }
  }

  render(0);

  /* ---------- scroll: el hero se fija mientras pasa el día ---------- */
  var st = null;
  safe("scroll", function () {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: function () { return "+=" + Math.round(window.innerHeight * 1.4); },
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) { setTarget(self.progress); },
      // Se asienta siempre en día, atardecer o noche: nunca a medias.
      snap: { snapTo: [0, 0.5, 1], duration: { min: 0.25, max: 0.6 }, delay: 0.12, ease: "power1.inOut" }
    });
  });

  function goTo(i) {
    i = clamp(i, 0, 2);
    if (st) {
      var y = st.start + (st.end - st.start) * (i / 2);
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    } else {
      setTarget(i / 2);
    }
  }

  /* ---------- controles ---------- */
  safe("controls", function () {
    stops.forEach(function (b, k) {
      b.addEventListener("click", function () { goTo(k); });
      b.addEventListener("keydown", function (e) {
        var to = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(2, k + 1);
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, k - 1);
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = 2;
        if (to === null) return;
        e.preventDefault();
        stops[to].focus();
        goTo(to);
      });
    });
    if (select) select.addEventListener("change", function () { goTo(JORNADAS.indexOf(select.value)); });
  });

  /* ---------- formulario: valida y deja listo el de cotización ---------- */
  safe("form", function () {
    var form = $("[data-h2-form]", hero);
    var fecha = $("[data-h2-fecha]", hero);
    var inv = $("[data-h2-invitados]", hero);
    var msg = $("[data-h2-msg]", hero);
    if (!form || !fecha) return;

    var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    var DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    function isoOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function longDate(iso) {
      var p = iso.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return DAYS[d.getDay()] + " " + d.getDate() + " de " + MONTHS[d.getMonth()] + " de " + d.getFullYear();
    }
    var todayIso = isoOf(new Date());
    fecha.min = todayIso;

    var occupied = (BRAND.fechasOcupadas || []).reduce(function (acc, d) { acc[d] = true; return acc; }, {});
    function say(text) { msg.textContent = text; }
    [fecha, inv, select].forEach(function (el) { if (el) el.addEventListener("input", function () { say(""); }); });

    // Marca el día en el calendario real para que ambos queden coherentes.
    function pickInCalendar(iso) {
      var next = $("[data-calendar-next]");
      for (var i = 0; i < 14; i++) {
        var btn = $('.calendar-day.available[data-date="' + iso + '"]');
        if (btn) { btn.click(); return true; }
        if (!next) break;
        next.click();
      }
      return false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var iso = fecha.value;
      if (!iso) { say("Elige una fecha para ver si está disponible."); fecha.focus(); return; }
      if (iso < todayIso) { say("Esa fecha ya pasó. Elige una desde hoy."); fecha.focus(); return; }
      if (occupied[iso]) { say("Esa fecha ya está ocupada. Prueba con otra."); fecha.focus(); return; }
      var n = inv && inv.value ? Number(inv.value) : 0;
      if (inv && inv.value && (n < 1 || n > 100)) { say("La capacidad máxima es de 100 invitados."); inv.focus(); return; }

      say("");
      var jornada = $("#jornada");
      var invitados = $("#invitados");
      var fechaForm = $("#fecha");
      if (jornada && select) jornada.value = select.value;
      if (invitados && n) invitados.value = String(n);
      if (!pickInCalendar(iso) && fechaForm) { fechaForm.value = longDate(iso); fechaForm.dataset.iso = iso; }

      var target = $("#reservas");
      if (!target) return;
      var top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () {
        var nombre = $("#nombre");
        if (nombre) nombre.focus({ preventScroll: true });
      }, 900);
    });
  });

  // Los pins de más abajo (servicios) se crean en main.js; este va primero.
  safe("sort", function () {
    if (window.ScrollTrigger) ScrollTrigger.sort();
  });
})();

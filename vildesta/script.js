/* Vildesta. Be skriptų puslapis veikia: nuotraukos atsidaro kaip paprastos nuorodos, forma siunčiama per mailto.
   Judesio bibliotekos (GSAP, Lenis) įkeliamos tik po to, kai puslapis jau parodytas, ir tik jei lankytojas
   neprašė mažiau judesio. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = null, lenis = null, fx = false;

  /* ---------- nuotraukų peržiūra ---------- */
  var items = $$('.shot').map(function (a) {
    var img = $('img', a);
    return { el: a, full: a.getAttribute('href'), alt: img.getAttribute('alt'), cat: a.getAttribute('data-cat') };
  });
  var lb = $('#lb'), lbImg = $('#lb-img'), lbCount = $('#lb-count'), lbCap = $('#lb-cap'), stage = $('#lb-stage');
  var btnClose = $('#lb-close'), btnPrev = $('#lb-prev'), btnNext = $('#lb-next');
  var dock = $('#dock');
  var current = -1, opener = null, pushed = false, skipPop = false;

  function show(i, dir) {
    var n = items.length;
    current = (i + n) % n;
    var it = items[current];
    lbImg.setAttribute('src', it.full);
    lbImg.setAttribute('alt', it.alt);
    lbCount.textContent = (current + 1) + ' / ' + n;
    lbCap.textContent = it.cat + '. ' + it.alt;
    var next = items[(current + 1) % n];            // kita nuotrauka įkeliama iš anksto
    if (next && next !== it) { new Image().src = next.full; }
    if (fx) {
      if (dir) {
        gsap.fromTo(lbImg, { x: 0, xPercent: 6 * dir, autoAlpha: 0 },
          { xPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
      } else {
        gsap.fromTo(lbImg, { x: 0, xPercent: 0, scale: 0.94, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'power3.out', overwrite: true });
      }
    }
  }
  function open(i, from) {
    opener = from || null;
    show(i, 0);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-lock');
    if (lenis) { lenis.stop(); }
    syncDock();
    void lb.offsetWidth;                              // langas jau matomas, todėl fokusą galima perkelti
    btnClose.focus();
    if (window.history && history.pushState) { history.pushState({ lb: true }, ''); pushed = true; }
  }
  function close(fromHistory) {
    if (current < 0) { return; }
    current = -1;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-lock');
    if (lenis) { lenis.start(); }
    syncDock();
    if (opener && opener.focus) { opener.focus({ preventScroll: true }); }
    if (pushed && !fromHistory) { pushed = false; skipPop = true; history.back(); } else { pushed = false; }
  }
  window.addEventListener('popstate', function () {
    if (skipPop) { skipPop = false; return; }        // tai mūsų pačių history.back() uždarant peržiūrą
    if (current >= 0) { close(true); }
  });
  items.forEach(function (it, i) {
    it.el.addEventListener('click', function (e) { e.preventDefault(); open(i, it.el); });
  });
  btnClose.addEventListener('click', function () { close(false); });
  btnPrev.addEventListener('click', function () { show(current - 1, -1); });
  btnNext.addEventListener('click', function () { show(current + 1, 1); });
  stage.addEventListener('click', function (e) {
    if (e.target === lbImg) { return; }
    var r = lbImg.getBoundingClientRect();           // spustelėjus šalia nuotraukos – uždaryti
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { close(false); }
  });
  document.addEventListener('keydown', function (e) {
    if (current < 0) { return; }
    if (e.key === 'Escape') { close(false); }
    else if (e.key === 'ArrowLeft') { show(current - 1, -1); }
    else if (e.key === 'ArrowRight') { show(current + 1, 1); }
    else if (e.key === 'Tab') {                       // klaviatūra lieka peržiūros lange
      var f = [btnClose, btnPrev, btnNext];
      var at = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(at + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus();
    }
  });
  var sx = 0, sy = 0, tracking = false;                // braukimas pirštu: nuotrauka seka paskui pirštą
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchmove', function (e) {
    if (!tracking || !fx) { return; }
    var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy)) { gsap.set(lbImg, { x: dx * 0.9 }); }
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!tracking) { return; }
    tracking = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) { show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    else if (fx) { gsap.to(lbImg, { x: 0, duration: 0.35, ease: 'power3.out' }); }
  }, { passive: true });

  /* ---------- apatinė juosta telefone: rodoma, kai nebesimato pirmo ekrano mygtukų ir dar nematyti kontaktų ---------- */
  var heroSeen = true, contactSeen = false;
  function syncDock() {
    if (dock) { dock.classList.toggle('is-off', heroSeen || contactSeen || current >= 0); }
  }
  var top = $('#top'), hero = $('.hero');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroSeen = en[0].isIntersecting; syncDock(); }, { threshold: 0 }).observe($('#hero-cta'));
    new IntersectionObserver(function (en) { contactSeen = en[0].isIntersecting; syncDock(); }, { threshold: 0.08 }).observe($('#kontaktai'));
    // viršutinė juosta gauna foną, kai pirmas ekranas nuslenka
    new IntersectionObserver(function (en) { top.classList.toggle('is-solid', en[0].intersectionRatio < 0.9); },
      { threshold: [0.9, 1] }).observe(hero);
  }

  /* ---------- užklausa: paruošiamas laiškas lankytojo pašto programoje ---------- */
  var form = $('#uzklausa'), err = $('#form-err');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.Vardas, tel = form.elements.Telefonas, text = form.elements.Darbai;
      var bad = [];
      [[name, name.value.trim().length >= 2], [tel, /[0-9]{5,}/.test(tel.value.replace(/[^0-9]/g, ''))],
       [text, text.value.trim().length >= 5]].forEach(function (p) {
        p[0].setAttribute('aria-invalid', String(!p[1]));
        if (!p[1]) { bad.push(p[0]); }
      });
      if (bad.length) {
        err.textContent = 'Užpildykite vardą, telefoną ir trumpai aprašykite darbus.';
        err.hidden = false;
        bad[0].focus();
        if (fx) { gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.35)' }); }
        return;
      }
      err.hidden = true;
      var body = 'Vardas: ' + name.value.trim() + '\nTelefonas: ' + tel.value.trim() + '\n\n' + text.value.trim() + '\n';
      var url = 'mailto:infovildesta@gmail.com?subject=' + encodeURIComponent('Užklausa iš svetainės') +
                '&body=' + encodeURIComponent(body);
      if (window.__noNav) { window.__mailto = url; } else { window.location.href = url; }
    });
    $$('input, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); });
    });
  }

  /* ---------- nuorodos į skyrius ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) { return; }
    var id = a.getAttribute('href').slice(1), target = id ? document.getElementById(id) : null;
    if (!target) { return; }
    e.preventDefault();
    if (lenis) { lenis.scrollTo(target, { duration: 1.2 }); }
    else { target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });

  /* ================= judesys ================= */
  function below(el) { return el.getBoundingClientRect().top > window.innerHeight * 0.96; }

  function motion() {
    var ScrollTrigger = window.ScrollTrigger, SplitText = window.SplitText;
    gsap = window.gsap;
    if (!gsap || !ScrollTrigger || !SplitText) { return; }
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.defaults({ ease: 'power3.out', duration: 1 });
    doc.classList.add('fx');
    fx = true;

    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (window.Lenis && fine && window.innerWidth >= 900) {          // švelnus slinkimas tik kompiuteryje
      lenis = new window.Lenis({ lerp: 0.11 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* viršutinė juosta: žemyn slepiasi, aukštyn grįžta */
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) {
      top.classList.toggle('is-away', self.scroll() > window.innerHeight * 0.8 && self.direction > 0 && current < 0);
    } });

    /* pirmas ekranas: kadras slenka lėčiau už tekstą */
    gsap.to('.hero-bg img', { yPercent: 4.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero .copy', { y: -110, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '62% top', scrub: true } });
    gsap.to('.hero .row', { y: -48, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: hero, start: '4% top', end: '40% top', scrub: true } });

    /* tekstas apie įmonę: žodžiai užsidega slenkant */
    var mt = $('.manifest-text');
    var words = SplitText.create(mt, { type: 'words', aria: 'none' }).words;
    gsap.fromTo(words, { opacity: 0.16 }, { opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: mt, start: 'top 84%', end: 'bottom 52%', scrub: true } });
    $$('.rule').filter(below).forEach(function (r) {                 // gintarinė linija nusibrėžia prie kiekvieno skyriaus
      gsap.from(r, { scaleX: 0, duration: 1.4, ease: 'power3.inOut', scrollTrigger: { trigger: r, start: 'top 92%', once: true } });
    });

    /* blokai, kurie pakyla, kai atslenka */
    function liftIn(sel, stagger) {
      var els = $$(sel).filter(below);
      if (!els.length) { return; }
      gsap.set(els, { y: 30, autoAlpha: 0 });
      ScrollTrigger.batch(els, { start: 'top 90%', once: true, onEnter: function (batch) {
        gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1, stagger: stagger || 0.09, overwrite: true });
      } });
    }
    liftIn('.why li');
    liftIn('.sec-head .lead');
    liftIn('.steps li', 0.14);
    liftIn('.g figcaption', 0.06);
    liftIn('.facts li', 0.08);
    liftIn('.form');

    /* didelės antraštės iškyla iš po kaukės */
    $$('.big, .contact h2').filter(below).forEach(function (h) {
      SplitText.create(h, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: function (self) {
        return gsap.from(self.lines, { yPercent: 112, duration: 1.15, stagger: 0.09, ease: 'power4.out',
          scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
      } });
    });

    /* paslaugos: kadras, užklotas kito, traukiasi gilyn */
    var svcs = $$('.svc');
    svcs.forEach(function (s, i) {
      var frame = $('.svc-frame', s), inner = $('.svc-in', s);
      gsap.fromTo($('img', frame), { yPercent: -5 }, { yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from($('h3', s), { yPercent: 60, autoAlpha: 0, duration: 1.1, ease: 'power4.out',
        scrollTrigger: { trigger: s, start: 'top 58%', toggleActions: 'play none none reverse' } });
      gsap.from($('.txt', s), { y: 36, autoAlpha: 0, duration: 1, delay: 0.12,
        scrollTrigger: { trigger: s, start: 'top 58%', toggleActions: 'play none none reverse' } });
      if (svcs[i + 1]) {
        gsap.to(frame, { scale: 0.93, borderRadius: 28, ease: 'none',
          scrollTrigger: { trigger: svcs[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
        gsap.to(inner, { autoAlpha: 0, y: -40, ease: 'none', immediateRender: false,
          scrollTrigger: { trigger: svcs[i + 1], start: 'top 92%', end: 'top 38%', scrub: true } });
      }
    });

    /* galerija: kadrai atsidengia iš apačios */
    var shots = $$('.shot').filter(below);
    if (shots.length) {
      gsap.set(shots, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(shots.map(function (s) { return $('img', s); }), { scale: 1.3 });
      ScrollTrigger.batch(shots, { start: 'top 88%', once: true, onEnter: function (batch) {
        gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'power4.out', stagger: 0.12,
          onComplete: function () { gsap.set(batch, { clearProps: 'clipPath' }); } });
        gsap.to(batch.map(function (s) { return $('img', s); }), { scale: 1, duration: 1.8, ease: 'power3.out', stagger: 0.12,
          clearProps: 'transform' });
      } });
    }

    /* žingsniai: linija nusitiesia per visus tris */
    gsap.fromTo('.steps-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.steps-line', start: 'top 88%', end: 'top 38%', scrub: true } });

    /* kontaktai: kadras slenka lėčiau, numeris susirenka po skaitmenį */
    gsap.fromTo('.contact-bg img', { yPercent: -4 }, { yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
    var tel = $('.tel-in');
    if (below(tel)) {
      var chars = SplitText.create(tel, { type: 'words,chars', mask: 'chars', aria: 'none' }).chars;
      gsap.from(chars, { yPercent: 112, duration: 0.9, stagger: 0.035, ease: 'power4.out',
        scrollTrigger: { trigger: tel, start: 'top 92%', once: true } });
    }

    /* poraštė: pavadinimas pakyla per visą plotį */
    gsap.from('.foot-big span', { yPercent: 55, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    ScrollTrigger.refresh();
    window.__fx = true;
  }

  function boot() {
    var list = ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'lenis.min.js'], left = list.length;
    list.forEach(function (f) {
      var s = document.createElement('script');
      s.src = 'js/vendor/' + f;
      s.async = false;
      s.onload = function () { if (--left === 0) { motion(); } };
      document.head.appendChild(s);
    });
  }
  function loaded() {
    doc.classList.add('loaded');                       // plėvelės grūdas įjungiamas po pirmo ekrano
    if (!reduce) { boot(); }
  }
  if (document.readyState === 'complete') { loaded(); } else { window.addEventListener('load', loaded); }
})();

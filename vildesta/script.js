/* UAB „Vildesta“: nuotraukų peržiūra, galerijos filtras, užklausos laiškas, apatinė juosta telefone ir judesys.
   Judesiui naudojamos GSAP (ScrollTrigger, SplitText, Flip) ir Lenis iš js/vendor: visi failai guli šioje svetainėje.
   Jei bibliotekos neįsikėlė arba žmogus pasirinko „mažiau judesio“, puslapis veikia taip pat, tik stovi vietoje.
   Be scenarijaus nuotraukos atsidaro kaip paprastos nuorodos, forma kreipiasi į pašto programą. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, SplitText = window.SplitText, Flip = window.Flip;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fx = !!(gsap && ScrollTrigger && SplitText && Flip) && !reduce;       // ar rodome judesį
  var wide = window.matchMedia('(min-width: 900px)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lenis = null;

  if (!fx) { doc.classList.add('is-ready', 'no-intro'); doc.classList.remove('pre'); }

  /* ---------- galerija: plytų eilės ir filtras ---------- */
  var gallery = $('#galerija');
  var items = $$('.brick', gallery).map(function (el) {
    return { el: el, n: el.getAttribute('data-n'), cat: el.getAttribute('data-cat'), full: el.getAttribute('href'),
             alt: $('img', el).getAttribute('alt') || '' };
  });
  var visible = items.slice();
  var allBricks = items.map(function (it) { return it.el; });

  // Eilė telefone – 6 dalys (4+2, 2+4), plačiame ekrane – 12 dalių (6+3+3, 3+6+3). Paskutinė plyta užpildo eilę iki galo.
  function lay(attr, cols, pattern) {
    var fill = 0;
    visible.forEach(function (it, k) {
      var s = pattern[k % pattern.length];
      if (fill + s > cols) { fill = 0; }
      it.el.setAttribute(attr, s);
      fill = (fill + s) % cols;
    });
    if (fill !== 0 && visible.length) {
      var last = visible[visible.length - 1].el;
      last.setAttribute(attr, Number(last.getAttribute(attr)) + (cols - fill));
    }
  }
  function layout() {
    lay('data-m', 6, [4, 2, 2, 4]);
    lay('data-d', 12, [6, 3, 3, 3, 6, 3]);
  }

  var revealAll = function () {};                 // judesio dalis pakeičia: iš karto atidengia visas galerijos plytas
  var chips = $$('.chip');
  function setFilter(cat, animate) {
    var state = (fx && animate) ? Flip.getState(allBricks) : null;
    var before = gallery.offsetHeight;
    if (state) { revealAll(); }
    visible = items.filter(function (it) {
      var show = cat === 'all' || it.cat === cat;
      it.el.hidden = !show;
      return show;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === cat)); });
    layout();
    if (state) {                                  // plytos persislenka į naujas vietas, o ne peršoka
      gsap.fromTo(gallery, { height: before }, { height: gallery.offsetHeight, duration: 0.75, ease: 'power3.inOut', clearProps: 'height' });
      Flip.from(state, {
        duration: 0.75, ease: 'power3.inOut', absolute: true, scale: false,
        onEnter: function (els) { return gsap.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, delay: 0.2 }); },
        onLeave: function (els) { return gsap.to(els, { autoAlpha: 0, duration: 0.25 }); },
        onComplete: function () { gsap.set(allBricks, { clearProps: 'opacity,visibility' }); ScrollTrigger.refresh(); }
      });
    }
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { setFilter(c.getAttribute('data-filter'), true); });
  });
  layout();

  /* ---------- nuotraukų peržiūra ---------- */
  var lb = $('#lb'), lbImg = $('#lb-img'), lbCount = $('#lb-count'), lbCap = $('#lb-cap'), stage = $('#lb-stage');
  var btnClose = $('#lb-close'), btnPrev = $('#lb-prev'), btnNext = $('#lb-next');
  var dock = $('#dock');
  var current = -1, opener = null, pushed = false;

  function show(i, dir) {
    var n = visible.length;
    current = (i + n) % n;
    var it = visible[current];
    lbImg.setAttribute('src', it.full);
    lbImg.setAttribute('alt', it.alt);
    lbCount.textContent = (current + 1) + ' / ' + n;
    lbCap.textContent = it.alt;
    var next = visible[(current + 1) % n];          // kita nuotrauka įkeliama iš anksto
    if (next && next !== it) { new Image().src = next.full; }
    if (fx) {
      if (dir) {
        gsap.fromTo(lbImg, { x: 0, xPercent: 7 * dir, autoAlpha: 0 },
          { xPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
      } else {
        gsap.fromTo(lbImg, { x: 0, xPercent: 0, scale: 0.92, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'power3.out', overwrite: true });
      }
      gsap.fromTo(lbCap, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, overwrite: true });
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
    if (pushed && !fromHistory) { pushed = false; history.back(); } else { pushed = false; }
  }
  window.addEventListener('popstate', function () { if (current >= 0) { close(true); } });

  items.forEach(function (it) {
    it.el.addEventListener('click', function (e) {
      e.preventDefault();
      open(visible.indexOf(it), it.el);
    });
  });
  // plytos pirmame ekrane atidaro tą pačią galerijos nuotrauką
  $$('[data-open]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var n = a.getAttribute('data-open');
      setFilter('all', false);
      for (var k = 0; k < visible.length; k++) { if (visible[k].n === n) { open(k, a); return; } }
    });
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
  // braukimas pirštu: nuotrauka seka paskui pirštą
  var sx = 0, sy = 0, tracking = false;
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

  /* ---------- apatinė juosta: slepiama, kai matomi kontaktai, atidaryta peržiūra arba dar rodoma įžanga ---------- */
  var contactSeen = false, dockHold = fx;
  function syncDock() {
    if (dock) { dock.classList.toggle('is-off', dockHold || contactSeen || current >= 0); }
  }
  var contact = $('#kontaktai');
  if (dock && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      contactSeen = entries[0].isIntersecting;
      syncDock();
    }, { threshold: 0.12 }).observe(contact);
  }
  syncDock();

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

  if (!fx) { return; }

  /* ================= judesys ================= */
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  doc.classList.add('fx');

  // švelnus slinkimas kompiuteryje (telefone lieka įprastas)
  if (window.Lenis && fine && wide.matches) {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  // nuorodos į skyrius: švelniai nuslenkame patys (CSS „scroll-behavior“ su judesiu išjungtas)
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) { return; }
    var id = a.getAttribute('href').slice(1), target = document.getElementById(id);
    if (!target) { return; }
    e.preventDefault();
    if (lenis) { lenis.scrollTo(target, { offset: id === 'virsus' ? 0 : -96, duration: 1.2 }); }
    else if (id === 'virsus') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (history.replaceState) { history.replaceState(history.state, '', '#' + id); }
  });

  var imgsOf = function (els) { return els.map(function (b) { return $('img', b); }); };

  /* ----- galerija: plytos atsidengia eilėmis ----- */
  var revealed = false;
  gsap.set(allBricks, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(imgsOf(allBricks), { scale: 1.3 });
  function reveal(batch, fast) {
    if (!batch.length) { return; }
    gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: fast ? 0.01 : 1.1, stagger: fast ? 0 : 0.08, overwrite: true,
      onComplete: function () { gsap.set(batch, { clearProps: 'clipPath' }); batch.forEach(function (b) { b.classList.add('is-in'); }); } });
    gsap.to(imgsOf(batch), { scale: 1, duration: fast ? 0.01 : 1.5, stagger: fast ? 0 : 0.08, overwrite: true, clearProps: 'transform' });
  }
  var batchTriggers = ScrollTrigger.batch(allBricks, { start: 'top 92%', once: true, interval: 0.12,
    onEnter: function (batch) { reveal(batch, false); } });
  revealAll = function () {
    if (revealed) { return; }
    revealed = true;
    batchTriggers.forEach(function (t) { t.kill(); });
    reveal(allBricks.filter(function (b) { return !b.classList.contains('is-in'); }), true);
  };

  /* ----- žymeklis virš galerijos ----- */
  var cur = $('#cursor');
  if (cur && fine && wide.matches) {
    gsap.set(cur, { xPercent: -50, yPercent: -50, scale: 0.2, opacity: 0 });
    var cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    gallery.addEventListener('mousemove', function (e) { cx(e.clientX); cy(e.clientY); });
    gallery.addEventListener('mouseover', function (e) {
      var on = !!(e.target.closest && e.target.closest('.brick'));
      gsap.to(cur, { scale: on ? 1 : 0.2, opacity: on ? 1 : 0, duration: 0.4, overwrite: 'auto' });
    });
    gallery.addEventListener('mouseleave', function () { gsap.to(cur, { scale: 0.2, opacity: 0, duration: 0.3, overwrite: 'auto' }); });
  }

  /* ----- mygtukai, kurie šiek tiek traukiasi prie pelės ----- */
  if (fine) {
    $$('.mag').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.2);
        my((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('mouseleave', function () { mx(0); my(0); });
    });
  }

  function start() {
    /* ----- įžanga ir pirmas ekranas: siena susimūrija ----- */
    var seen = false;
    try { seen = sessionStorage.getItem('vildesta-intro') === '1'; sessionStorage.setItem('vildesta-intro', '1'); } catch (e) { /* privatus režimas */ }
    var intro = $('#intro');
    var heroBricks = $$('.hero-wall .brick');
    gsap.set('.hero .ln > span', { yPercent: 115 });
    gsap.set(['.kicker', '.hero .lead', '.hero-actions', '.hero-meta'], { autoAlpha: 0, y: 18 });
    gsap.set(heroBricks, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(imgsOf(heroBricks), { scale: 1.35 });
    gsap.set('.head', { autoAlpha: 0, y: -16 });
    doc.classList.remove('pre');

    var tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: function () {
      doc.classList.add('is-ready');
      gsap.set(heroBricks, { clearProps: 'clipPath' });
      ScrollTrigger.refresh();
    } });
    if (!seen) {
      gsap.set('.intro .brand-mark i', { scale: 0 });
      gsap.set('.intro-name span', { yPercent: 110 });
      tl.to('.intro .brand-mark i', { scale: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2.2)' })
        .to('.intro-name span', { yPercent: 0, duration: 0.7 }, '-=0.3')
        .to(intro, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '+=0.3')
        .addLabel('hero', '-=0.5');
    } else {
      gsap.set(intro, { display: 'none' });
      tl.addLabel('hero', 0.05);
    }
    tl.to('.head', { autoAlpha: 1, y: 0, duration: 0.7 }, 'hero')
      .to('.kicker', { autoAlpha: 1, y: 0, duration: 0.7 }, 'hero+=0.05')
      .to('.hero .ln > span', { yPercent: 0, duration: 1.1, stagger: 0.09 }, 'hero+=0.1')
      .to(heroBricks, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, stagger: 0.09, ease: 'power3.out' }, 'hero+=0.2')
      .to(imgsOf(heroBricks), { scale: 1, duration: 1.6, stagger: 0.09, ease: 'power3.out', clearProps: 'transform' }, 'hero+=0.2')
      .to(['.hero .lead', '.hero-actions', '.hero-meta'], { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 'hero+=0.55')
      .call(function () { dockHold = false; syncDock(); }, null, 'hero+=0.7')
      .set(intro, { display: 'none' });

    /* ----- slinkimo eiga ir plaukiojanti juosta ----- */
    gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    var bar = $('#bar');
    function barOn(on) {
      bar.classList.toggle('is-on', on);
      $$('a', bar).forEach(function (a) { if (on) { a.removeAttribute('tabindex'); } else { a.setAttribute('tabindex', '-1'); } });
    }
    var pastHero = false;
    ScrollTrigger.create({ trigger: '.hero', start: 'bottom top+=120',
      onEnter: function () { pastHero = true; }, onLeaveBack: function () { pastHero = false; barOn(false); } });
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) {      // žemyn slepiasi, aukštyn grįžta
      if (pastHero && Math.abs(self.getVelocity()) > 40) { barOn(self.direction === -1); }
    } });

    /* ----- pirmo ekrano eilės slenka priešingomis kryptimis ----- */
    $$('.hero-wall .row').forEach(function (row, i) {
      gsap.fromTo(row, { xPercent: i % 2 ? -3 : 3 }, { xPercent: i % 2 ? 3 : -3, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    });

    /* ----- bėganti eilutė: greitėja ir apsisuka pagal slinkimą ----- */
    var track = $('#band');
    if (track) {
      var loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
      loop.totalTime(loop.duration() * 50);          // atsarga, kad galėtų bėgti ir atgal
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) {
        var dir = self.direction, boost = gsap.utils.clamp(1, 6, Math.abs(self.getVelocity()) / 320);
        gsap.to(loop, { timeScale: dir * boost, duration: 0.25, overwrite: true,
          onComplete: function () { gsap.to(loop, { timeScale: dir, duration: 1.1 }); } });
      } });
      ScrollTrigger.create({ trigger: '.band', start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { if (self.isActive) { loop.resume(); } else { loop.pause(); } } });
    }

    /* ----- skyrių antraštės: žymė išsitiesia, eilutės iškyla ----- */
    $$('.sec-head').forEach(function (head) {
      var mark = $('.mark', head), h2 = $('h2', head), lead = $('.lead', head);
      var t = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 84%', once: true } });
      if (mark) { t.from(mark, { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }); }
      if (h2) {
        var split = SplitText.create(h2, { type: 'lines', mask: 'lines' });
        t.from(split.lines, { yPercent: 112, duration: 1, stagger: 0.1, ease: 'power4.out',
          onComplete: function () { split.revert(); } }, '-=0.45');
      }
      if (lead) { t.from(lead, { autoAlpha: 0, y: 16, duration: 0.7 }, '-=0.6'); }
    });
    gsap.from('.chip', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.06, scrollTrigger: { trigger: '.chips', start: 'top 90%', once: true } });

    /* ----- paslaugos ----- */
    var cards = $$('.course');
    cards.forEach(function (card) {
      gsap.from($('.brick', card), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, scrollTrigger: { trigger: card, start: 'top 82%', once: true } });
      gsap.from($$('.course-text > *', card), { autoAlpha: 0, y: 26, duration: 0.8, stagger: 0.09, scrollTrigger: { trigger: card, start: 'top 78%', once: true } });
    });
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', function () {       // kortelės gula viena ant kitos, apatinė traukiasi
      cards.forEach(function (card, i) {
        gsap.fromTo($('img', card), { yPercent: -5 }, { yPercent: 5, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
        if (i < cards.length - 1) {
          gsap.to(card, { scale: 0.93, ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top+=110', scrub: true } });
        }
      });
      gsap.from('.steps-line', { scaleX: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 78%', end: 'bottom 50%', scrub: 0.6 } });
    });

    /* ----- kodėl mes: punktai užsidega vienas po kito ir lieka šviesti ----- */
    $$('.why-list li').forEach(function (li) {
      ScrollTrigger.create({ trigger: li, start: 'top 74%',
        onEnter: function () { li.classList.add('is-on'); }, onLeaveBack: function () { li.classList.remove('is-on'); } });
    });

    /* ----- kaip dirbame: plytos nukrenta į vietas ----- */
    var stepEls = $$('.steps li');
    gsap.from(stepEls, { y: 90, rotation: function (i) { return (i - 1) * -3; }, autoAlpha: 0, duration: 1, stagger: 0.14,
      ease: 'back.out(1.5)', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });

    /* ----- kontaktai: geltona plokštė išsiplečia per visą ekraną ----- */
    gsap.fromTo('.contact-panel', { clipPath: 'inset(9% 6% 0% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top 96%', end: 'top 30%', scrub: 0.5 } });
    var ct = gsap.timeline({ scrollTrigger: { trigger: '.contact-text', start: 'top 78%', once: true } });
    var cSplit = SplitText.create('.contact-text h2', { type: 'lines', mask: 'lines' });
    var tSplit = SplitText.create('.tel-in', { type: 'words,chars', mask: 'chars' });
    ct.from('.contact-text .mark', { scaleX: 0, duration: 0.7, ease: 'power3.inOut' })
      .from(cSplit.lines, { yPercent: 112, duration: 1, stagger: 0.1, ease: 'power4.out', onComplete: function () { cSplit.revert(); } }, '-=0.45')
      .from(tSplit.chars, { yPercent: 115, duration: 0.8, stagger: 0.035, ease: 'power4.out', onComplete: function () { tSplit.revert(); } }, '-=0.6')
      .from('.facts li', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.5');
    gsap.from('.form > *', { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.07, scrollTrigger: { trigger: '.form', start: 'top 84%', once: true } });

    /* ----- apačia: didelis pavadinimas iškyla ----- */
    gsap.from('.foot-big span', { yPercent: 100, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.4 } });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  // eilutes skaidome tik įsikėlus šriftui, kitaip jos lūžtų kitose vietose
  var started = false;
  function go() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); setTimeout(go, 1800); } else { go(); }
})();

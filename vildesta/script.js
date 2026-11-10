/* UAB „Vildesta“: nuotraukų peržiūra, galerijos filtras, užklausos laiškas, apatinė juosta telefone.
   Be bibliotekų. Be scenarijaus nuotraukos atsidaro kaip paprastos nuorodos, forma kreipiasi į pašto programą. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- galerija: plytų eilės ir filtras ---------- */
  var gallery = $('#galerija');
  var items = $$('.brick', gallery).map(function (el) {
    return { el: el, n: el.getAttribute('data-n'), cat: el.getAttribute('data-cat'), full: el.getAttribute('href'),
             alt: $('img', el).getAttribute('alt') || '' };
  });
  var visible = items.slice();

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

  var chips = $$('.chip');
  function setFilter(cat) {
    visible = items.filter(function (it) {
      var show = cat === 'all' || it.cat === cat;
      it.el.hidden = !show;
      return show;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === cat)); });
    layout();
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { setFilter(c.getAttribute('data-filter')); });
  });
  layout();

  /* ---------- nuotraukų peržiūra ---------- */
  var lb = $('#lb'), lbImg = $('#lb-img'), lbCount = $('#lb-count'), lbCap = $('#lb-cap'), stage = $('#lb-stage');
  var btnClose = $('#lb-close'), btnPrev = $('#lb-prev'), btnNext = $('#lb-next');
  var dock = $('#dock');
  var current = -1, opener = null, pushed = false;

  function show(i) {
    var n = visible.length;
    current = (i + n) % n;
    var it = visible[current];
    lbImg.setAttribute('src', it.full);
    lbImg.setAttribute('alt', it.alt);
    lbCount.textContent = (current + 1) + ' / ' + n;
    lbCap.textContent = it.alt;
    var next = visible[(current + 1) % n];          // kita nuotrauka įkeliama iš anksto
    if (next && next !== it) { new Image().src = next.full; }
  }
  function open(i, from) {
    opener = from || null;
    show(i);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-lock');
    if (dock) { dock.classList.add('is-off'); }
    btnClose.focus();
    if (window.history && history.pushState) { history.pushState({ lb: true }, ''); pushed = true; }
  }
  function close(fromHistory) {
    if (current < 0) { return; }
    current = -1;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-lock');
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
      setFilter('all');
      for (var k = 0; k < visible.length; k++) { if (visible[k].n === n) { open(k, a); return; } }
    });
  });

  btnClose.addEventListener('click', function () { close(false); });
  btnPrev.addEventListener('click', function () { show(current - 1); });
  btnNext.addEventListener('click', function () { show(current + 1); });
  stage.addEventListener('click', function (e) {
    if (e.target === lbImg) { return; }
    var r = lbImg.getBoundingClientRect();           // spustelėjus šalia nuotraukos – uždaryti
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { close(false); }
  });
  document.addEventListener('keydown', function (e) {
    if (current < 0) { return; }
    if (e.key === 'Escape') { close(false); }
    else if (e.key === 'ArrowLeft') { show(current - 1); }
    else if (e.key === 'ArrowRight') { show(current + 1); }
    else if (e.key === 'Tab') {                       // klaviatūra lieka peržiūros lange
      var f = [btnClose, btnPrev, btnNext];
      var at = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(at + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus();
    }
  });
  // braukimas pirštu
  var sx = 0, sy = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!tracking) { return; }
    tracking = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) { show(current + (dx < 0 ? 1 : -1)); }
  }, { passive: true });

  /* ---------- apatinė juosta: slepiama, kai matomi kontaktai ---------- */
  var contactSeen = false;
  function syncDock() {
    if (dock) { dock.classList.toggle('is-off', contactSeen || current >= 0); }
  }
  var contact = $('#kontaktai');
  if (dock && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      contactSeen = entries[0].isIntersecting;
      syncDock();
    }, { threshold: 0.12 }).observe(contact);
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
})();

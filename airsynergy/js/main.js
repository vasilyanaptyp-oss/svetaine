(function () {
  'use strict';

  var MAIL = 'al@airsynergy.eu';

  /* header border on scroll */
  var top = document.querySelector('.top');
  function onScroll() { top.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('meniu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1000 && !menu.hidden) setMenu(false); });

  /* equipment rail */
  var rail = document.getElementById('rail');
  var btns = document.querySelectorAll('.rail-btn');
  function step() {
    var li = rail.querySelector('li');
    var gap = parseFloat(getComputedStyle(rail).columnGap) || 16;
    return li ? li.getBoundingClientRect().width + gap : 300;
  }
  function updateRail() {
    var max = rail.scrollWidth - rail.clientWidth - 2;
    btns[0].disabled = rail.scrollLeft <= 2;
    btns[1].disabled = rail.scrollLeft >= max;
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      rail.scrollBy({ left: step() * Number(b.getAttribute('data-dir')), behavior: 'smooth' });
    });
  });
  rail.addEventListener('scroll', updateRail, { passive: true });
  window.addEventListener('resize', updateRail);
  updateRail();

  /* request form: chips + mailto */
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  var form = document.getElementById('uzklausa');
  var err = document.getElementById('f-err');
  var ok = document.getElementById('f-ok');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-vardas');
    var contact = document.getElementById('f-kontaktas');
    var missing = [];
    [name, contact].forEach(function (f) {
      var bad = !f.value.trim();
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) missing.push(f);
    });
    if (missing.length) {
      err.textContent = 'Įrašykite vardą ir telefoną arba el. paštą.';
      err.hidden = false;
      ok.hidden = true;
      missing[0].focus();
      return;
    }
    err.hidden = true;
    var needs = Array.prototype.filter.call(chips, function (c) { return c.getAttribute('aria-pressed') === 'true'; })
      .map(function (c) { return c.getAttribute('data-v'); });
    var obj = document.getElementById('f-objektas').value;
    var msg = document.getElementById('f-zinute').value.trim();
    var lines = [
      'Sveiki,',
      '',
      'Ko reikia: ' + (needs.length ? needs.join(', ') : 'nenurodyta'),
      'Objektas: ' + (obj || 'nenurodyta'),
      '',
      msg || '',
      '',
      name.value.trim(),
      contact.value.trim()
    ];
    var subject = 'Užklausa: ' + (needs.length ? needs.join(', ') : 'vėdinimas, kondicionavimas, šildymas');
    var href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    ok.hidden = false;
    if (Array.isArray(window.__mailtoLog)) { window.__mailtoLog.push(href); return; }
    window.location.href = href;
  });
})();

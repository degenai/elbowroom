/*
 * ELBOW ROOM — universal header/footer loader.
 * Classic script. Injects the shared partials, wires nav behaviour, then loads the
 * anime.js interaction module (so magnetic/tilt see the header buttons too).
 * Paths are derived from this script's own URL, so the whole elbowroom* set can be
 * moved to a fresh domain root without editing include paths.
 */
(function () {
  var SELF = (document.currentScript && document.currentScript.src) || '';
  var partial = function (name) { return new URL('../elbowroom/' + name, SELF).href; };
  var moduleUrl = new URL('elbowroom.js', SELF).href;

  function inject(id, url) {
    var host = document.getElementById(id);
    if (!host) return Promise.resolve();
    return fetch(url).then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) { if (html) host.innerHTML = html; })
      .catch(function () {/* leave placeholder empty; page still works */});
  }

  function wireHeader() {
    var header = document.querySelector('.er-header');
    var burger = document.querySelector('.er-burger');
    var links = document.querySelector('.er-navlinks');
    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
      });
    }
    if (header) {
      var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    // active link from <body data-er-page="...">
    var page = document.body.getAttribute('data-er-page');
    if (page) {
      var active = document.querySelector('.er-navlinks a[data-er="' + page + '"]');
      if (active) active.classList.add('active');
    }
    // dynamic year
    document.querySelectorAll('[data-er-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  Promise.all([inject('er-header', partial('header.html')), inject('er-footer', partial('footer.html'))])
    .then(wireHeader)
    .then(function () { return import(moduleUrl); })
    .catch(function () { import(moduleUrl); });
})();

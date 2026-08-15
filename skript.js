/* Meryton Group, jagatud skript kõigile lehtedele. */
(function () {
  'use strict';

  /* --- Mobiilimenüü ------------------------------------------------------ */

  var menuuNupp = document.querySelector('.menuu-nupp');
  var menuu = document.getElementById('peamenuu');

  if (menuuNupp && menuu) {
    menuuNupp.addEventListener('click', function () {
      var avatud = menuu.getAttribute('data-avatud') === 'jah';
      menuu.setAttribute('data-avatud', avatud ? 'ei' : 'jah');
      menuuNupp.setAttribute('aria-expanded', avatud ? 'false' : 'true');
      menuuNupp.setAttribute('aria-label', avatud ? 'Ava menüü' : 'Sulge menüü');
    });

    menuu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menuu.setAttribute('data-avatud', 'ei');
        menuuNupp.setAttribute('aria-expanded', 'false');
        menuuNupp.setAttribute('aria-label', 'Ava menüü');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuu.getAttribute('data-avatud') === 'jah') {
        menuu.setAttribute('data-avatud', 'ei');
        menuuNupp.setAttribute('aria-expanded', 'false');
        menuuNupp.focus();
      }
    });
  }

  /* --- Galerii: vaata veel ----------------------------------------------- */

  var veelNupud = document.querySelectorAll('[data-veel]');

  Array.prototype.forEach.call(veelNupud, function (nupp) {
    nupp.addEventListener('click', function () {
      var ruudustik = document.getElementById(nupp.getAttribute('aria-controls'));
      if (!ruudustik) return;
      var peidetud = ruudustik.querySelectorAll('.pilt[hidden]');
      if (peidetud.length) {
        Array.prototype.forEach.call(peidetud, function (p) { p.removeAttribute('hidden'); });
        nupp.setAttribute('aria-expanded', 'true');
        nupp.textContent = 'Näita vähem';
      } else {
        var koik = ruudustik.querySelectorAll('.pilt');
        var arv = 0;
        Array.prototype.forEach.call(koik, function (p, i) {
          if (i >= 3) { p.setAttribute('hidden', ''); arv += 1; }
        });
        nupp.setAttribute('aria-expanded', 'false');
        nupp.textContent = 'Vaata veel (' + arv + ')';
        ruudustik.parentNode.scrollIntoView({ block: 'start' });
      }
    });
  });

  /* --- Galerii: suurendus ------------------------------------------------ */

  var aken = document.getElementById('suurendus');

  if (aken) {
    var pilt = document.getElementById('suurendus-pilt');
    var tekst = document.getElementById('suurendus-tekst');
    var jarjend = [];
    var kohal = 0;
    var eelmineFookus = null;

    function nayta(i) {
      if (!jarjend.length) return;
      kohal = (i + jarjend.length) % jarjend.length;
      var nupp = jarjend[kohal];
      pilt.setAttribute('src', nupp.getAttribute('data-suur'));
      pilt.setAttribute('alt', nupp.getAttribute('data-alt') || '');
      tekst.textContent = (nupp.getAttribute('data-alt') || '') +
        '  (' + (kohal + 1) + '/' + jarjend.length + ')';
    }

    function ava(nupp) {
      var ruudustik = nupp.closest('.pildid');
      jarjend = Array.prototype.slice.call(ruudustik.querySelectorAll('.pilt[data-suur]'));
      eelmineFookus = nupp;
      nayta(jarjend.indexOf(nupp));
      aken.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      var sulge = aken.querySelector('[data-sulge]');
      if (sulge) sulge.focus();
    }

    function sulge() {
      aken.removeAttribute('open');
      document.body.style.overflow = '';
      pilt.setAttribute('src', '');
      if (eelmineFookus) eelmineFookus.focus();
    }

    document.addEventListener('click', function (e) {
      var nupp = e.target.closest ? e.target.closest('.pilt[data-suur]') : null;
      if (nupp) { ava(nupp); return; }

      if (e.target.closest && e.target.closest('[data-sulge]')) { sulge(); return; }

      var liigu = e.target.closest ? e.target.closest('[data-liigu]') : null;
      if (liigu) { nayta(kohal + parseInt(liigu.getAttribute('data-liigu'), 10)); return; }

      if (e.target === aken) sulge();
    });

    document.addEventListener('keydown', function (e) {
      if (!aken.hasAttribute('open')) return;
      if (e.key === 'Escape') sulge();
      if (e.key === 'ArrowRight') nayta(kohal + 1);
      if (e.key === 'ArrowLeft') nayta(kohal - 1);
    });
  }

  /* --- Hinnapäringu vorm ------------------------------------------------- */

  var vorm = document.getElementById('paring');

  if (vorm) {
    var objektiPlokk = document.getElementById('objekti-plokk');
    var laadid = vorm.querySelectorAll('input[name="laad"]');
    var teade = document.getElementById('vormi-teade');
    var saatmisel = false;

    function uuendaObjekt() {
      var valitud = vorm.querySelector('input[name="laad"]:checked');
      var uuendus = valitud && valitud.value === 'Olemasoleva uuendus';
      if (objektiPlokk) {
        if (uuendus) objektiPlokk.removeAttribute('hidden');
        else objektiPlokk.setAttribute('hidden', '');
      }
    }

    Array.prototype.forEach.call(laadid, function (r) {
      r.addEventListener('change', uuendaObjekt);
    });
    uuendaObjekt();

    vorm.addEventListener('submit', function (e) {
      if (saatmisel) { e.preventDefault(); return; }

      var puudu = [];
      if (!vorm.nimi.value.trim()) puudu.push('nimi');
      if (!vorm.epost.value.trim() || vorm.epost.value.indexOf('@') < 1) puudu.push('e-post');
      if (!vorm.sonum.value.trim()) puudu.push('kirjeldus');
      if (!vorm.nousolek.checked) puudu.push('nõusolek');

      if (puudu.length) {
        e.preventDefault();
        teade.textContent = 'Palun täida veel: ' + puudu.join(', ') + '.';
        return;
      }

      e.preventDefault();
      saatmisel = true;
      teade.textContent = 'Saadan päringut.';
      var nupp = vorm.querySelector('button[type="submit"]');
      if (nupp) nupp.disabled = true;

      var andmed = {};
      new FormData(vorm).forEach(function (v, k) { andmed[k] = v; });

      fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(andmed)
      })
        .then(function (r) {
          if (r.ok) {
            window.location.href = 'aitah.html';
            return;
          }
          return r.json().catch(function () { return {}; }).then(function (j) {
            throw new Error(j.viga || '');
          });
        })
        .catch(function (err) {
          saatmisel = false;
          if (nupp) nupp.disabled = false;
          teade.textContent = (err && err.message)
            ? err.message
            : 'Päringu saatmine ei õnnestunud. Palun helista numbril +372 5689 3723 või kirjuta info@meryton.ee.';
        });
    });
  }
})();

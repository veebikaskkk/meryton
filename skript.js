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

  var EELVAADE = 4;
  var veelNupud = document.querySelectorAll('[data-veel]');

  // Mitu pilti on hetkel peidus. Osa peidab hidden-atribuut, neljanda pildi
  // peidab laiadel ekraanidel CSS, seega loeme tegeliku display väärtuse.
  function peidetuid(ruudustik) {
    var koik = ruudustik.querySelectorAll('.pilt');
    var arv = 0;
    Array.prototype.forEach.call(koik, function (p) {
      if (window.getComputedStyle(p).display === 'none') arv += 1;
    });
    return arv;
  }

  function pane(nupp, ruudustik) {
    var arv = peidetuid(ruudustik);
    nupp.setAttribute('aria-expanded', 'false');
    nupp.textContent = 'Vaata veel (' + arv + ')';
    nupp.hidden = arv === 0;
  }

  var paarid = [];

  Array.prototype.forEach.call(veelNupud, function (nupp) {
    var ruudustik = document.getElementById(nupp.getAttribute('aria-controls'));
    if (!ruudustik) return;

    paarid.push([nupp, ruudustik]);
    pane(nupp, ruudustik);

    nupp.addEventListener('click', function () {
      if (nupp.getAttribute('aria-expanded') === 'true') {
        var koik = ruudustik.querySelectorAll('.pilt');
        Array.prototype.forEach.call(koik, function (p, i) {
          if (i >= EELVAADE) p.setAttribute('hidden', '');
        });
        ruudustik.removeAttribute('data-avatud');
        pane(nupp, ruudustik);
        ruudustik.parentNode.scrollIntoView({ block: 'start' });
        return;
      }

      var peidetud = ruudustik.querySelectorAll('.pilt[hidden]');
      Array.prototype.forEach.call(peidetud, function (p) { p.removeAttribute('hidden'); });
      ruudustik.setAttribute('data-avatud', 'jah');
      nupp.setAttribute('aria-expanded', 'true');
      nupp.textContent = 'Näita vähem';
    });
  });

  // Number tuleb üle lugeda pärast lehe täielikku laadimist ja akna suuruse
  // muutumisel, sest neljanda pildi peidab murdepunktiga seotud CSS.
  function loeUuesti() {
    paarid.forEach(function (paar) {
      if (paar[0].getAttribute('aria-expanded') !== 'true') pane(paar[0], paar[1]);
    });
  }

  if (paarid.length) {
    window.addEventListener('load', loeUuesti);
    var ootel;
    window.addEventListener('resize', function () {
      clearTimeout(ootel);
      ootel = setTimeout(loeUuesti, 200);
    });
  }

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
    var teade = document.getElementById('vormi-teade');
    var saatmisel = false;

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
      new FormData(vorm).forEach(function (v, k) {
        if (k in andmed) {
          if (!Array.isArray(andmed[k])) andmed[k] = [andmed[k]];
          andmed[k].push(v);
        } else {
          andmed[k] = v;
        }
      });

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

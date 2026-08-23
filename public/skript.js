/* Meryton Group, jagatud skript kõigile lehtedele. */
(function () {
  'use strict';

  var vaikneLiikumine = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* --- Avapildi foto vahetub teenuse peale minnes ------------------------ */

  var avafoto = document.getElementById('avapilt-foto');
  var avateenused = document.querySelectorAll('.avateenused a[data-foto]');

  if (avafoto && avateenused.length) {
    var algneFoto = avafoto.getAttribute('src');
    var algneAlt = avafoto.getAttribute('alt');
    var ootel = null;

    // Lae teiste teenuste fotod vaikselt ette, muidu on esimene vahetus tühi
    window.addEventListener('load', function () {
      Array.prototype.forEach.call(avateenused, function (a) {
        var e = new Image();
        e.src = a.getAttribute('data-foto');
      });
    });

    function naita(tee, alt, link) {
      if (avafoto.getAttribute('src') === tee) return;
      window.clearTimeout(ootel);

      Array.prototype.forEach.call(avateenused, function (a) {
        if (a === link) a.setAttribute('data-aktiivne', '');
        else a.removeAttribute('data-aktiivne');
      });

      if (vaikneLiikumine) {
        avafoto.setAttribute('src', tee);
        avafoto.setAttribute('alt', alt);
        return;
      }

      avafoto.classList.remove('on-nahtav');
      ootel = window.setTimeout(function () {
        avafoto.setAttribute('src', tee);
        avafoto.setAttribute('alt', alt);
        avafoto.classList.add('on-nahtav');
      }, 260);
    }

    Array.prototype.forEach.call(avateenused, function (a) {
      var tee = a.getAttribute('data-foto');
      var alt = a.getAttribute('data-alt') || '';
      a.addEventListener('mouseenter', function () { naita(tee, alt, a); });
      a.addEventListener('focus', function () { naita(tee, alt, a); });
    });

    var rida = document.querySelector('.avateenused');
    if (rida) {
      rida.addEventListener('mouseleave', function () {
        naita(algneFoto, algneAlt, null);
      });
    }
  }

  /* --- Avalehe kategooriakastid ------------------------------------------ */

  var kastid = Array.prototype.slice.call(document.querySelectorAll('.lint__kast'));

  if (kastid.length && !vaikneLiikumine) {
    var VAHE = 3500;          // kui tihti üks kast pilti vahetab
    var TUHMUMINE = 450;      // peab kokku langema CSS-i üleminekuga
    var kellad = [];

    var lindid = kastid.map(function (kast) {
      var varu = [];
      try {
        varu = JSON.parse(kast.getAttribute('data-pildid')) || [];
      } catch (e) {
        varu = [];
      }
      return { img: kast.querySelector('img'), varu: varu, kohal: 0 };
    }).filter(function (l) {
      return l.img && l.varu.length > 1;
    });

    window.addEventListener('load', function () {
      lindid.forEach(function (l) {
        l.varu.slice(1).forEach(function (p) {
          var e = new Image();
          e.src = p.tee;
        });
      });
    });

    function vaheta(l) {
      l.kohal = (l.kohal + 1) % l.varu.length;
      var p = l.varu[l.kohal];
      l.img.setAttribute('data-vahetub', '');
      window.setTimeout(function () {
        l.img.setAttribute('src', p.tee);
        l.img.setAttribute('alt', p.alt || '');
        l.img.removeAttribute('data-vahetub');
      }, TUHMUMINE);
    }

    function kaima() {
      if (kellad.length) return;
      lindid.forEach(function (l, i) {
        // kastid nihutatakse üksteise suhtes, et nad ei vahetaks korraga
        var nihe = Math.round((VAHE / lindid.length) * i);
        kellad.push(window.setTimeout(function () {
          vaheta(l);
          kellad.push(window.setInterval(function () { vaheta(l); }, VAHE));
        }, nihe));
      });
    }

    function seisma() {
      kellad.forEach(function (k) {
        window.clearTimeout(k);
        window.clearInterval(k);
      });
      kellad = [];
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) seisma();
      else kaima();
    });

    if (lindid.length) kaima();
  }

  /* --- Galerii: vaata veel ----------------------------------------------- */

  var EELVAADE = 3;
  var veelNupud = document.querySelectorAll('[data-veel]');
  var paarid = [];

  // Mitu pilti on hetkel peidus. Osa peidab hidden-atribuut, kolmanda pildi
  // peidab telefonis CSS, seega loeme tegeliku display väärtuse.
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

  function loeUuesti() {
    paarid.forEach(function (paar) {
      if (paar[0].getAttribute('aria-expanded') !== 'true') pane(paar[0], paar[1]);
    });
  }

  if (paarid.length) {
    window.addEventListener('load', loeUuesti);
    var ootelLugemine;
    window.addEventListener('resize', function () {
      clearTimeout(ootelLugemine);
      ootelLugemine = setTimeout(loeUuesti, 200);
    });
  }

  /* --- Galerii: kirjeldus vajutusel -------------------------------------- */

  // Hiirega tuleb kirjeldus pildi peale minnes. Puuteekraanil hiirt ei ole,
  // seega seal avab ja sulgeb kirjelduse vajutus.
  Array.prototype.forEach.call(document.querySelectorAll('.pildid'), function (r) {
    r.addEventListener('click', function (e) {
      var pilt = e.target.closest ? e.target.closest('.pilt--vaikne') : null;
      if (!pilt) return;
      var avatud = pilt.getAttribute('data-tekst') === 'jah';
      Array.prototype.forEach.call(r.querySelectorAll('.pilt[data-tekst]'), function (p) {
        p.removeAttribute('data-tekst');
      });
      if (!avatud) pilt.setAttribute('data-tekst', 'jah');
    });
  });

  /* --- Hinnapäringu vorm ------------------------------------------------- */

  var vorm = document.getElementById('paring');

  if (vorm) {
    var teade = document.getElementById('vormi-teade');
    var saatmisel = false;

    // Teenuste lehelt tullakse aadressiga /kontakt?teenus=vannitoad,
    // siis on õige linnuke juba ette valitud.
    var soovitud = new URLSearchParams(window.location.search).get('teenus');
    if (soovitud) {
      var linnuke = vorm.querySelector('input[data-teenus="' + soovitud.replace(/[^a-z-]/g, '') + '"]');
      if (linnuke) linnuke.checked = true;
    }

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
            window.location.href = '/aitah';
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

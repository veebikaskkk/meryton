/*
 * MERYTON GROUP OÜ, Cloudflare Worker.
 *
 * Kaks ülesannet:
 *   1. /api/kontakt võtab hinnapäringu vastu ja saadab kirja Resendiga
 *   2. kõik muu läheb staatiliste failide käsitlejasse, kaust public/
 *
 * Keskkonnamuutujad, mis peavad Cloudflare'i paneelis seatud olema:
 *   RESEND_API_KEY  Resendi API võti, salajane
 *   SAATJA          saatja aadress, näiteks "Meryton koduleht <vorm@meryton.ee>"
 *   SAAJA           aadress, kuhu päringud lähevad
 *
 * Muutujad jõustuvad alles pärast uut deployd.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/kontakt') return kontakt(request, env);

    const vastus = await env.ASSETS.fetch(request);

    // Eelvaate aadress ei tohi otsingusse jõuda, muidu indekseerib Google
    // sama sisu kaks korda. Hosti järgi, sest _headers ei kata workers.dev.
    if (url.hostname.endsWith('.workers.dev')) {
      const uus = new Response(vastus.body, vastus);
      uus.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return uus;
    }
    return vastus;
  }
};

/* --- kiiruspiirang -------------------------------------------------------- */

// Mälus, ehk kehtib ühe isolaadi kohta. Väikese lehe jaoks piisab. Kui
// päringuid tuleb palju, tuleks võtta kasutusele KV või Durable Object.
const PIIRANG_AKEN_MS = 10 * 60 * 1000;
const PIIRANG_ARV = 5;
const paringud = new Map();

function ylePiiri(ip) {
  const nyyd = Date.now();
  const varasem = (paringud.get(ip) || []).filter((t) => nyyd - t < PIIRANG_AKEN_MS);
  varasem.push(nyyd);
  paringud.set(ip, varasem);

  if (paringud.size > 5000) {
    for (const [k, v] of paringud) {
      if (!v.length || nyyd - v[v.length - 1] > PIIRANG_AKEN_MS) paringud.delete(k);
    }
  }
  return varasem.length > PIIRANG_ARV;
}

/* --- abid ----------------------------------------------------------------- */

function puhasta(vaartus, maksPikkus) {
  if (typeof vaartus !== 'string') return '';
  return vaartus
    .slice(0, maksPikkus)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Vormil olevad teenused. Serverisse tulnud väärtus peab olema sellest
// nimekirjast, muidu saaks kirja saata suvalist teksti.
const TEENUSED = [
  'Eramu ehitus ja renoveerimine',
  'Põrandakatete paigaldus',
  'Vannitoa ehitus ja renoveerimine',
  'Vee- ja kanalisatsioonitööd',
  'Kütte- ja ventilatsioonitööd',
  'Saunad, terrassid ja varjualused',
  'Muu'
];

function valiTeenused(vaartus) {
  const loend = Array.isArray(vaartus) ? vaartus : [vaartus];
  const valitud = loend.map((v) => puhasta(v, 60)).filter((v) => TEENUSED.includes(v));
  return [...new Set(valitud)].join(', ');
}

async function loeKeha(request) {
  const tyyp = request.headers.get('content-type') || '';
  if (tyyp.includes('application/json')) return await request.json();

  const vorm = await request.formData();
  const keha = {};
  for (const [k, v] of vorm.entries()) {
    if (k in keha) {
      if (!Array.isArray(keha[k])) keha[k] = [keha[k]];
      keha[k].push(v);
    } else {
      keha[k] = v;
    }
  }
  return keha;
}

/* --- vormi vastuvõtt ------------------------------------------------------ */

const YLDINE_VIGA =
  'Päringu saatmine ei õnnestunud. Palun helista numbril +372 5689 3723 või kirjuta info@meryton.ee.';

async function kontakt(request, env) {
  const tahabJson = (request.headers.get('accept') || '').includes('application/json');

  function vasta(kood, pohjus, sonum) {
    if (tahabJson) {
      const keha = kood === 200 ? { ok: true } : { ok: false, pohjus, kood, viga: sonum };
      return new Response(JSON.stringify(keha), {
        status: kood,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
    if (kood === 200) return Response.redirect(new URL('/aitah', request.url).toString(), 303);
    return new Response(sonum, { status: kood, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  if (request.method !== 'POST') {
    return new Response('Vale päringu meetod.', { status: 405, headers: { Allow: 'POST' } });
  }

  try {
    const keha = await loeKeha(request);

    // Meepott: robot täidab peidetud välja, inimene mitte. Vastame nagu õnnestus.
    if (puhasta(keha.veebiaadress, 200)) return vasta(200, null, 'ok');

    const ip = request.headers.get('CF-Connecting-IP') || 'tundmatu';
    if (ylePiiri(ip)) {
      return vasta(429, 'kiiruspiirang',
        'Liiga palju päringuid lühikese aja jooksul. Palun helista numbril +372 5689 3723.');
    }

    const nimi = puhasta(keha.nimi, 120);
    const epost = puhasta(keha.epost, 160);
    const sonum = puhasta(keha.sonum, 4000);
    const telefon = puhasta(keha.telefon, 40);
    const ettevote = puhasta(keha.ettevote, 120);
    const objekt = puhasta(keha.objekt, 180);
    const laad = valiTeenused(keha.laad);
    const nousolek = keha.nousolek === true || keha.nousolek === 'on' || keha.nousolek === 'true';

    if (!nimi || !EPOST.test(epost) || !sonum || !nousolek) {
      return vasta(400, 'valideerimine', 'Palun täida nimi, e-post, kirjeldus ja nõusolek.');
    }

    const puuduvad = ['RESEND_API_KEY', 'SAATJA', 'SAAJA'].filter((k) => !env[k]);
    if (puuduvad.length) {
      console.error('Keskkonnamuutujad seadmata: ' + puuduvad.join(', '));
      return vasta(500, 'seadistus', YLDINE_VIGA);
    }

    const read = [
      ['Nimi', nimi],
      ['Ettevõte', ettevote],
      ['E-post', epost],
      ['Telefon', telefon],
      ['Teenused', laad],
      ['Objekt', objekt]
    ].filter(([, v]) => v);

    const tekst = read.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nKirjeldus:\n${sonum}\n`;
    const kiri =
      '<h2 style="font-family:Arial,sans-serif">Hinnapäring kodulehelt</h2>' +
      '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
      read.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td>` +
        `<td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join('') +
      '</table>' +
      `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(sonum)}</p>`;

    const vastus = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.SAATJA,
        to: [env.SAAJA],
        reply_to: epost,
        subject: `Hinnapäring kodulehelt: ${nimi}`,
        text: tekst,
        html: kiri
      })
    });

    if (!vastus.ok) {
      // 401 on vale võti. 403 on kinnitamata saatja domeen, ehk SAATJA
      // aadressi domeen ei ole Resendis kinnitatud. Need kaks nägid varem
      // ühtemoodi välja ja põhjuse otsimine võttis päevi.
      const detail = await vastus.text().catch(() => '');
      console.error(`Resend ${vastus.status}: ${detail.slice(0, 300)}`);
      return vasta(500, 'resend', YLDINE_VIGA);
    }

    return vasta(200, null, 'ok');
  } catch (e) {
    console.error('Vormi viga: ' + (e && e.message));
    return vasta(500, 'tundmatu', YLDINE_VIGA);
  }
}

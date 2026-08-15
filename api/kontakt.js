/*
 * Hinnapäringu vastuvõtt. Vercel Serverless Function.
 *
 * Keskkonnamuutujad, mis peavad Vercelis seatud olema:
 *   RESEND_API_KEY  Resendi API võti
 *   SAATJA          saatja aadress, näiteks "Meryton koduleht <vorm@meryton.ee>"
 *   SAAJA           aadress, kuhu päringud lähevad, näiteks info@meryton.ee
 *
 * Võtit ei tohi koodi kirjutada. Pärast keskkonnamuutuja lisamist tuleb teha
 * uus deploy, muidu vana funktsioon seda ei näe.
 */

const { Resend } = require('resend');

const PIIRANG_AKEN_MS = 10 * 60 * 1000;   // 10 minutit
const PIIRANG_ARV = 5;                    // kuni viis päringut ühelt IP-lt selle aja jooksul
const paringud = new Map();

function ipAadress(req) {
  const p = req.headers['x-forwarded-for'];
  if (typeof p === 'string' && p.length) return p.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'tundmatu';
}

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

function puhasta(vaartus, maksPikkus) {
  if (typeof vaartus !== 'string') return '';
  return vaartus
    .slice(0, maksPikkus)
    .replace(/[<>]/g, '')
    // juhtmärgid välja, reavahetus ja tabulaator jäävad alles
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function html(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async function handler(req, res) {
  const tahabJson = String(req.headers.accept || '').includes('application/json');

  function vasta(kood, sonum) {
    if (tahabJson) {
      res.status(kood).json(kood === 200 ? { korras: true } : { viga: sonum });
    } else if (kood === 200) {
      res.writeHead(303, { Location: '/aitah.html' });
      res.end();
    } else {
      res.status(kood).send(sonum);
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return vasta(405, 'Vale päringu meetod.');
  }

  const yldineViga =
    'Päringu saatmine ei õnnestunud. Palun helista numbril +372 5689 3723 või kirjuta info@meryton.ee.';

  try {
    const keha = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Meepott: robot täidab peidetud välja, inimene mitte.
    if (puhasta(keha.veebiaadress, 200)) {
      return vasta(200, 'ok');
    }

    if (ylePiiri(ipAadress(req))) {
      return vasta(429, 'Liiga palju päringuid lühikese aja jooksul. Palun helista numbril +372 5689 3723.');
    }

    const nimi = puhasta(keha.nimi, 120);
    const epost = puhasta(keha.epost, 160);
    const sonum = puhasta(keha.sonum, 4000);
    const telefon = puhasta(keha.telefon, 40);
    const ettevote = puhasta(keha.ettevote, 120);
    const objekt = puhasta(keha.objekt, 180);
    const laad = puhasta(keha.laad, 60) === 'Olemasoleva uuendus' ? 'Olemasoleva uuendus' : 'Uus töö';
    const nousolek = keha.nousolek === true || keha.nousolek === 'on' || keha.nousolek === 'true';

    if (!nimi || !EPOST.test(epost) || !sonum || !nousolek) {
      return vasta(400, 'Palun täida nimi, e-post, kirjeldus ja nõusolek.');
    }

    if (!process.env.RESEND_API_KEY || !process.env.SAATJA || !process.env.SAAJA) {
      console.error('Keskkonnamuutujad RESEND_API_KEY, SAATJA või SAAJA on seadmata.');
      return vasta(500, yldineViga);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const read = [
      ['Nimi', nimi],
      ['Ettevõte', ettevote],
      ['E-post', epost],
      ['Telefon', telefon],
      ['Töö laad', laad],
      ['Objekt', objekt]
    ].filter(([, v]) => v);

    const tekst = read.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nKirjeldus:\n${sonum}\n`;
    const kiri =
      '<h2 style="font-family:Arial,sans-serif">Hinnapäring kodulehelt</h2>' +
      '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
      read.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666">${html(k)}</td>` +
        `<td style="padding:4px 0"><strong>${html(v)}</strong></td></tr>`).join('') +
      '</table>' +
      `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${html(sonum)}</p>`;

    const { error } = await resend.emails.send({
      from: process.env.SAATJA,
      to: process.env.SAAJA,
      replyTo: epost,
      subject: `Hinnapäring kodulehelt: ${nimi}`,
      text: tekst,
      html: kiri
    });

    if (error) {
      console.error('Resend viga:', error);
      return vasta(500, yldineViga);
    }

    return vasta(200, 'ok');
  } catch (e) {
    console.error('Vormi viga:', e);
    return vasta(500, yldineViga);
  }
};

/*
 * Teeb logost kaks varianti.
 *
 *   meryton-group-logo.webp        hele, tumedale taustale (jalus)
 *   meryton-group-logo-tume.webp   originaalvärvid, heledale taustale (päis)
 *
 * Lähtefail on valgel taustal, seega valge tuleb läbipaistvaks võtta.
 * Heleda tausta variandi puhul piisab tavalisest valge eemaldamisest,
 * tumeda tausta variandi puhul tuleb tint heledamaks arvutada, muidu
 * kaovad hallid jooned musta sisse ära.
 */
const sharp = require('sharp');
const path = require('path');

const JUUR = path.resolve(__dirname, '..');
const ALLIKAS = path.join(JUUR, '..', 'Logo.png');
const VALJUND = path.join(JUUR, 'public/pildid/ikoonid');

async function tee(variant, valjundNimi) {
  const { data, info } = await sharp(ALLIKAS).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const out = Buffer.alloc(w * h * 4);

  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const o = p * 4;

    if (variant === 'hele') {
      // tumedale taustale: tint täisheledusse, hoides värvi iseloomu
      const L = (r + g + b) / 3 / 255;
      const a = Math.pow(Math.min(1, Math.max(0, (1 - L) * 2.3)), 2.0);
      const mx = Math.max(r, g, b) || 1, B = 238;
      out[o] = Math.round(Math.min(255, r / mx * B));
      out[o + 1] = Math.round(Math.min(255, g / mx * B));
      out[o + 2] = Math.round(Math.min(255, b / mx * B));
      out[o + 3] = Math.round(a * 255);
    } else {
      // heledale taustale: tavaline valge eemaldamine, värvid jäävad omaks
      const mn = Math.min(r, g, b);
      const a = 1 - mn / 255;
      if (a < 0.004) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
      } else {
        out[o] = Math.round(Math.max(0, Math.min(255, (r - 255 * (1 - a)) / a)));
        out[o + 1] = Math.round(Math.max(0, Math.min(255, (g - 255 * (1 - a)) / a)));
        out[o + 2] = Math.round(Math.max(0, Math.min(255, (b - 255 * (1 - a)) / a)));
        out[o + 3] = Math.round(a * 255);
      }
    }
  }

  const trimmitud = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png().trim({ threshold: 6 }).png().toBuffer();
  const m = await sharp(trimmitud).metadata();

  await sharp(trimmitud).webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(VALJUND, valjundNimi + '.webp'));
  await sharp(trimmitud).png({ compressionLevel: 9 })
    .toFile(path.join(VALJUND, valjundNimi + '.png'));

  console.log(`  ${valjundNimi}: ${m.width}x${m.height}`);
}

(async () => {
  await tee('hele', 'meryton-group-logo');
  await tee('tume', 'meryton-group-logo-tume');
})();

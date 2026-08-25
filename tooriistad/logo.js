/*
 * Teeb kliendi logost variandid, mida leht kasutab.
 *
 * Lähtefail on Meryton_Group_Transparent.svg, mille sees on 3762x3762 PNG.
 * See ei ole päris vektor, aga on kümme korda suurem kui vana Logo.png.
 *
 *   meryton-group-logo.webp        originaalvärvid, tumedale taustale
 *   meryton-group-logo-tume.webp   neutraalid tumendatud, heledale taustale
 *   meryton-group-mark.webp        ainult monogramm, ikoonide jaoks
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const JUUR = path.resolve(__dirname, '..');
const ALLIKAS_SVG = path.join(JUUR, '..', 'reveebilehepakkumine', 'Meryton_Group_Transparent.svg');
const IKOON = path.join(JUUR, '..', 'reveebilehepakkumine', 'Meryton_Group_Icon_Transparent.png');
const VALJUND = path.join(JUUR, 'public/pildid/ikoonid');

function svgSeest(tee) {
  const s = fs.readFileSync(tee, 'utf8');
  const m = s.match(/href="data:image\/png;base64,([^"]+)"/);
  if (!m) throw new Error('SVG sees ei ole rasterpilti');
  return Buffer.from(m[1], 'base64');
}

async function salvesta(buf, nimi, laius) {
  const t = await sharp(buf).trim({ threshold: 4 }).resize({ width: laius }).toBuffer();
  const m = await sharp(t).metadata();
  await sharp(t).webp({ quality: 86 }).toFile(path.join(VALJUND, nimi + '.webp'));
  await sharp(t).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(VALJUND, nimi + '.png'));
  console.log(`  ${nimi}: ${m.width}x${m.height}`);
  return m;
}

(async () => {
  const algne = svgSeest(ALLIKAS_SVG);

  // 1. originaalvärvid, tumedale taustale
  await salvesta(algne, 'meryton-group-logo', 500);

  // 2. heledale taustale: hallid jooned tumedaks, kuld jääb kullaks
  const { data, info } = await sharp(algne).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * info.channels, o = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const kyllastus = mx === 0 ? 0 : (mx - mn) / mx;
    if (kyllastus < 0.18) {
      // neutraalne joon, pööra heledus ümber
      out[o] = 255 - r; out[o + 1] = 255 - g; out[o + 2] = 255 - b;
    } else {
      // kuld, tumenda et heledal taustal loeks
      out[o] = Math.round(r * 0.72); out[o + 1] = Math.round(g * 0.72); out[o + 2] = Math.round(b * 0.72);
    }
    out[o + 3] = a;
  }
  const tume = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toBuffer();
  await salvesta(tume, 'meryton-group-logo-tume', 500);

  // 3. ainult monogramm
  await salvesta(fs.readFileSync(IKOON), 'meryton-group-mark', 320);
})();

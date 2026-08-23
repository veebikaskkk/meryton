# MERYTON GROUP OÜ koduleht

Viielehene staatiline koduleht: puhas HTML, CSS ja JavaScript, ilma raamistikuta.
Majutus **Cloudflare Workeri** peal, hinnapäringu vorm saadab kirja Resendiga.

```
public/                 kõik, mis brauserisse jõuab
  index.html            avaleht
  teenused.html         kuus teenust ja korduvad küsimused
  tood.html             galerii kategooriate kaupa
  kontakt.html          hinnapäringu vorm ja rekvisiidid
  privaatsus.html       privaatsusteade
  aitah.html            tänuleht pärast vormi saatmist
  404.html              vealeht
  stiil.css, skript.js
  _headers, _redirects
  pildid/, fondid/
worker.js               /api/kontakt ja staatiliste failide serveerimine
wrangler.jsonc          Cloudflare'i seadistus
tooriistad/             generaatorid, ei lähe veebi
toorpildid/             kliendi originaalfotod, ei lähe veebi
```

**HTML-i ei muudeta käsitsi.** Lehed ehitatakse skriptiga, vaata punkt 2.

---

## 1. Aadressid on puhtad, ilma .html-ita

Workeri assets teeb `/teenused.html` pealt 307-ümbersuunamise aadressile
`/teenused`. Seepärast on kõik sisemised lingid, canonical'id ja sitemap kohe
puhtal kujul. Kui kirjutad kuskile `.html`, tekib asjatu ümbersuunamise hüpe.
`tooriistad/kontroll.py` annab selle eest vea.

---

## 2. Lehe ehitamine

Kolm skripti, alati selles järjekorras:

```bash
python3 tooriistad/lehed.py
```

Kirjutab kõik HTML-lehed. Päis, jalus ja head-plokk tulevad ühest kohast, sest
varem olid need kaheksas failis eraldi ja jooksid kaks korda lahku. Pikem sisu
elab osafailidena kaustas `tooriistad/sisu/`.

```bash
node tooriistad/pildid.js
```

Töötleb fotod ja täidab galerii, avalehe kategooriakastid, `sitemap.xml` ning
tööde lehe struktuurandmed.

```bash
python3 tooriistad/kontroll.py
```

Kontrollib koodiga, mitte silma järgi: JSON-LD, pealkirjatasemed, katkised
lingid ja ankrud, puuduvad pildid, `style=` atribuudid, mida range CSP keelab,
üle 400 KB failid ja pikad mõttekriipsud.

Neljas, ainult vajadusel:

```bash
NODE_PATH=tooriistad/node_modules node tooriistad/logo.js
```

Teeb logost kaks varianti: hele tumedale taustale ja originaalvärvides heledale.

---

## 3. Kohalik arendus

**Ainult `wrangler dev` jooksutab päris asja.** Tavaline staatiline server ei
tunne `_headers`, `_redirects`, `not_found_handling` ega `/api/kontakt` reegleid.

```bash
npx wrangler dev
```

Kohalike keskkonnamuutujate jaoks kopeeri `.dev.vars.example` failiks `.dev.vars`.
See on `.gitignore` sees ja ei tohi hoidlasse jõuda.

---

## 4. Avaldamine Cloudflare'i

1. Pushi kood GitHubi. **Ära lohista veebiliidesesse**, see ei toeta taustakoodi.
2. Cloudflare, Compute, Workers & Pages, Create, Import a repository.
3. Build command jäta **tühjaks**. Deploy command jääb `npx wrangler deploy`.
4. Settings, Variables and secrets, lisa kolm muutujat, vaata punkt 5.
5. **Tee uus deploy**, muidu muutujad ei jõustu.
6. Domeen alles siis, kui klient on kinnitanud.

Cloudflare ei loo enam Pages projekte, seega see leht on kohe Workeri kujul.
`worker.js` peab olema olemas ka staatilise lehe puhul, muidu ütleb paneel
"Variables cannot be added to a Worker that only has static assets".

**Analüütika:** Cloudflare Web Analytics on küpsisevaba ja lülitatakse sisse
paneelist. Koodi ei ole vaja lisada ja küpsiste nõusolekuriba ei teki.

---

## 5. Resend ja hinnapäringu vorm

| Muutuja | Väärtus | Tüüp |
| --- | --- | --- |
| `RESEND_API_KEY` | Resendi API võti | **Secret** |
| `SAATJA` | `Meryton koduleht <vorm@meryton.ee>` | tekst |
| `SAAJA` | `info@meryton.ee` | tekst |

**Saatja domeen tuleb Resendis eraldi kinnitada.** Lehe domeeni tööle minek ei
kinnita midagi, see on eraldi DNS-kirjete lisamine.

Enne domeeni kinnitamist saab vormi siiski testida: pane `SAATJA` väärtuseks
`onboarding@resend.dev` ja `SAAJA` väärtuseks Resendi konto enda aadress.

Veakoodid, mis vastusest tulevad väljal `pohjus`:

| Vastus | Tähendus |
| --- | --- |
| `seadistus` | mõni kolmest muutujast on seadmata, vaata Workeri logi |
| `resend` 401 | vale API võti |
| `resend` 403 | saatja domeen ei ole Resendis kinnitatud |
| `valideerimine` | nimi, e-post, kirjeldus või nõusolek puudu |
| `kiiruspiirang` | üle viie päringu kümne minuti jooksul samalt IP-lt |

Kaitse: peidetud meepott-väli, serveripoolne valideerimine, erimärkide
puhastamine, kiiruspiirang `CF-Connecting-IP` järgi ja `reply_to` vormi täitja
aadressile. Kiiruspiirang on Workeri mälus, ehk kehtib ühe isolaadi kohta.
Väikese lehe jaoks piisab, tugevama kaitse jaoks tuleks võtta kasutusele KV.

Vorm töötab ka ilma JavaScriptita: siis saadab brauser vormi otse ja Worker
suunab 303-ga lehele `/aitah`.

---

## 6. Fotod galeriisse

Galerii on jagatud kaheksaks kategooriaks.

**Samm 1.** Kopeeri toorfotod kausta `toorpildid/<kategooria>/`. See kaust on
väljaspool `public/` ja seda ei serveerita.

**Samm 2.**

```bash
cd tooriistad && npm install && cd ..
node tooriistad/pildid.js
```

Skript pöörab EXIF-i järgi õigetpidi, eemaldab EXIF-i koos GPS-koordinaatidega,
teeb WebP-d, kustutab kasutuseta failid ja kirjutab galerii uuesti.

**Samm 3.** Kirjuta `tooriistad/galerii-andmed.json` sisse iga pildi juurde
`alt` tekst täislausena ja `nimi`, millest tuleb failinimi. Failinimi peab
algama märksõnaga, mida inimene otsib, näiteks `vannitoa-renoveerimine-...`.
Seejärel jooksuta skript uuesti.

---

## 7. Piltide kvaliteet, praegune seis

**Galeriis on hange.ee pisipildid, 300 × 200 pikslit.** hange.ee suured pildid
annavad kõik 404 ja kättesaadav on ainult see mõõt. Kontrollitud korduvalt,
ka õigete päiste ja küpsistega.

Mida see tähendab:

- ruudustikus näevad need välja talutavad
- **klõpsuga avanev suurendus on välja lülitatud**, sest 300 px pildi
  suurendamine teeb pudru. Lüliti on failis `tooriistad/pildid.js`,
  muutuja `SUURENDUS`
- avapildil on kerge hägu, mis peidab pikslid. Kui originaalid tulevad,
  saab CSS-is `.avapilt__taust img` pealt `filter: blur(2px)` maha võtta

**Ainus päris lahendus on kliendi originaalfotod.** Sama töövoog, uued failid
kausta `toorpildid/`, skript peale ja kõik uueneb.

---

## 8. Mis vajab kliendilt kinnitust

1. **Fotode õigused.** Klient peab kinnitama, et fotod on tema omad või tal on
   luba neid kasutada, ka nende objektide puhul, kus tellija oli keegi teine.
2. **Turvalise Partneri märgise sõnastus.** Lehel on minu sõnastus, et märgis
   puudutab maksekäitumist. Küsi Eesti Võlausaldajate Liidu enda sõnastus.
3. **Linnanimed.** Praegu on lehel maakonnad. Kui klient kinnitab, et töötab
   ka Pärnu, Viljandi ja Tallinna linnas, tasub need kohalikus otsingus lisada.
4. **Andmed, mida lehel teadlikult ei ole:** hinnad, tähtajad, garantii,
   töötajate arv, klientide tagasiside, asutamisaasta.
5. **hange.ee tööde arvud** on lehelt välja jäetud, kuna ei ole selge, mida
   need numbrid loevad.

---

## 9. Artiklite leht

Võetud ajutiselt maha, sest oli tühi. Fail on git-ajaloos alles:

```bash
git show 1612966:artiklid.html > public/artiklid.html
```

Seejärel lisa see `tooriistad/lehed.py` nimekirja `MENUU` ja `LEHED` ning
`tooriistad/pildid.js` sitemapi nimekirja.

---

## 10. Tekstide ümberkirjutamine

```bash
python3 tooriistad/tekstid.py
```

Korjab kogu nähtava teksti faili `TEKSTID.md`, kus iga plokk on kujul
`[teenused.html:h2:3]`. Selle saab tervikuna kellelegi üle vaadata anda.

```bash
python3 tooriistad/tekstid-tagasi.py "TEKSTID uuendus.md"
```

Paneb parandatud tekstid tagasi. Lingiga plokid jäetakse teadlikult vahele ja
loetletakse eraldi, et import ei kustutaks linke.

---

## 11. Juhend kliendile: Google'i ettevõtteprofiil

Ilma selleta ei ole ettevõtet Google Mapsis ega kohalikus otsingus näha. See
toob väikeettevõttele tavaliselt rohkem päringuid kui koduleht ise.

1. google.com/business, profiil ettevõtte enda konto alt, mitte tegija omast.
2. Andmed peavad kodulehega tähemärgi täpsusega kokku langema: MERYTON GROUP OÜ,
   +372 5689 3723, Järve põik 5, Kilingi-Nõmme, Pärnumaa 86303, meryton.ee.
3. Kategooria: ehitustöövõtja. Lisaks põrandapaigaldus, torutööd, vannitoad.
4. Teeninduspiirkond: Pärnumaa, Viljandimaa, Harjumaa.
5. Fotod: logo ja 10 kuni 15 tööde pilti, uusi iga paari kuu tagant.
6. Arvustused: küsi kohe pärast töö üleandmist, saada otsene link, vasta igale.
7. Google Search Console, **kanna omanik üle kliendile**.

---

## 12. Mobiili murdepunktid

CSS on kirjutatud laiustele 375, 768, 1024 ja 1440 px. Murdepunktid:
**1024 px** (kolm veergu läheb kaheks, kõrvuti plokid üksteise alla, kastid
kolme veergu), **860 px** (menüü hamburgeri alla), **720 px** (ruudustikud ja
vormiväljad ühte veergu, kastid kahte veergu), **520 px** (galerii ühte veergu
ja kaks pilti korraga, nupud täislaiuses), **340 px** (kastid ühte veergu).

`prefers-reduced-motion` korral ei käivitu avapildi sisenemine ega
kategooriakastide vahetus.

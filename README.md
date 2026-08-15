# MERYTON GROUP OÜ koduleht

Viielehene staatiline koduleht: puhas HTML, CSS ja JavaScript, ilma raamistikuta.
Majutus Vercelis, hinnapäringu vorm saadab kirja Resendiga.

```
index.html        avaleht
teenused.html     kuus teenust ja korduvad küsimused
tood.html         galerii, kategooriate kaupa
kontakt.html      hinnapäringu vorm ja rekvisiidid
artiklid.html     artiklite nimekiri, praegu tühi struktuur
aitah.html        tänuleht pärast vormi saatmist
privaatsus.html   privaatsusteade
404.html          vealeht
stiil.css         jagatud stiil
skript.js         jagatud skript
api/kontakt.js    vormi vastuvõtt, Resend
tooriistad/       galerii ehitaja, ei lähe veebi
```

---

## 1. Mis tuleb enne avaldamist ära otsustada

| Koht | Mis | Miks |
| --- | --- | --- |
| Kõigi lehtede `<head>` | `https://www.meryton.ee` | Kui domeen tuleb teine, asenda kõik esinemised. Vaata allpool käsku. |
| `robots.txt` | sitemapi aadress | Sama domeen. |
| `tooriistad/pildid.js` | muutuja `SAIT` | Sama domeen. Sealt genereeritakse `sitemap.xml`. |
| Jalus, kõik lehed | `&copy; 2026` | Aastanumber. |

Domeeni vahetamine ühe käsuga projekti juurkaustast:

```bash
grep -rl "www.meryton.ee" . --include="*.html" --include="*.txt" --include="*.xml" --include="*.js" | xargs sed -i '' 's|www\.meryton\.ee|UUS-DOMEEN.ee|g'
```

---

## 2. Fotod galeriisse

Galerii on jagatud kaheksaks kategooriaks. Iga kategooria all on lehel näha kolm pilti,
ülejäänud avanevad nupust "Vaata veel".

**Samm 1.** Kopeeri toorfotod, otse telefonist, ilma ümber nimetamata, õigesse kausta:

```
pildid/toorpildid/porandatood/
pildid/toorpildid/vannitoad/
pildid/toorpildid/eramu-ehitus/
pildid/toorpildid/siseviimistlus/
pildid/toorpildid/vesi-ja-kanalisatsioon/
pildid/toorpildid/kute-ja-ventilatsioon/
pildid/toorpildid/puittood/
pildid/toorpildid/valitood/
```

**Samm 2.** Paigalda tööriistad üks kord ja jooksuta skript:

```bash
cd tooriistad && npm install && cd ..
node tooriistad/pildid.js
```

Skript teeb iga pildiga järgmist:

- pöörab EXIF-i järgi õigetpidi ja eemaldab seejärel kogu EXIF-i koos GPS-koordinaatidega
- teeb galeriipildi 1400 px laiuseks kvaliteediga 78 ja pisipildi 600 px kvaliteediga 75, mõlemad WebP
- hoiatab, kui mõni fail läheb üle 400 KB
- kirjutab uuesti galerii ploki failis `tood.html` ja terve `sitemap.xml`
- lisab pildid faili `tooriistad/galerii-andmed.json`

**Samm 3.** Ava `tooriistad/galerii-andmed.json` ja kirjuta iga pildi juurde `alt` tekst
täislausena, näiteks "Renoveeritud vannitoa plaaditud sein ja duširuum, valmis töö".
Failinime saab muuta välja `nimi` kaudu, näiteks `eramu-fassaadi-renoveerimine-kilingi-nomme`.
Seejärel jooksuta skript uuesti.

Toorfotod jäävad kausta `pildid/toorpildid/` ja neid veebi ei laadita. Kui hoidla suurus on
oluline, võib selle kausta pärast töötlemist tühjendada.

---

## 3. Kohalik eelvaade

Leht on staatiline, seega piisab tavalisest failiserverist. Projekti juurkaustast:

```bash
python3 -m http.server 8000
```

Seejärel ava `http://localhost:8000`. Vormi ja analüütikat kohalikult ei ole, ehk
`/api/kontakt` ja `/_vercel/insights/script.js` annavad 404. See on ootuspärane.

---

## 4. Vercelisse panek

1. Loo GitHubi hoidla ja lohista kogu selle kausta sisu sinna.
2. Vercelis "Add New Project", vali hoidla. Framework Preset: **Other**. Build Commandi ei ole vaja.
3. Lisa domeen Vercelis "Domains" alt ja seadista DNS.
   Juurdomeeni A-kirje nimeväli jääb tühjaks või `@`, mitte `meryton.ee`.
   Kui domeenipakkuja lisas juba oma A-kirje, kustuta see, muidu on kaks kirjet ja Vercel annab vea.
4. Lülita sisse Vercel Analytics, muidu jääb `/_vercel/insights/script.js` 404-ks.
   Analüütika on küpsisevaba, seepärast ei ole lehel nõusolekuriba.

---

## 5. Resend ja hinnapäringu vorm

1. Tee konto aadressil resend.com ja **kinnita domeen meryton.ee**.
   Kinnitamata domeeniga saadab Resend ainult konto omaniku aadressile ja kõik muu annab vea 403.
2. Loo API võti.
3. Lisa Vercelis Settings > Environment Variables kolm muutujat:

| Nimi | Väärtus |
| --- | --- |
| `RESEND_API_KEY` | Resendi API võti |
| `SAATJA` | `Meryton koduleht <vorm@meryton.ee>` |
| `SAAJA` | `info@meryton.ee` |

4. **Tee uus deploy.** Keskkonnamuutujad loetakse ainult käivitamisel, ehk vana funktsioon
   uusi muutujaid ei näe. See on kõige sagedasem "miks vorm ei tööta" põhjus.

Vormi kaitse: peidetud meepott-väli, serveripoolne valideerimine, HTML-i erimärkide
puhastamine, kuni viis päringut ühelt IP-lt kümne minuti jooksul ning `replyTo` kliendi
aadressile. Kiiruspiirang on funktsiooni mälus, ehk see kehtib ühe eksemplari kohta.
Väikese lehe jaoks piisab, tugevama kaitse jaoks tuleks võtta kasutusele Vercel KV.

Vorm töötab ka ilma JavaScriptita: siis saadab brauser vormi otse ja funktsioon suunab
303-ga lehele `/aitah.html`.

---

## 6. Mis on lehel kohatäide või vajab kliendilt kinnitust

1. **Galerii fotod.** Praegu on igas kategoorias triibuline kohatäide koos puuduva faili nimega.
   Vaja on fotosid, vaata punkt 2.
2. **Turvalise Partneri märgise selgitus.** Lehel on kirjas ainult "Märgise annab Eesti
   Võlausaldajate Liit" ja korduvates küsimustes "see puudutab ettevõtte maksekäitumist".
   Küsi kliendilt liidu enda sõnastus ja kontrollilink, siis saab selle täpsemaks teha.
3. **Artiklite lehe lubadus.** `artiklid.html` ütleb, et plaanis on kolm lugu. Kui klient neid
   kirjutada ei plaani, tuleb see lause ära muuta.
4. **Andmed, mida lehel teadlikult ei ole**, sest neid ei olnud antud: hinnad, tähtajad,
   garantii, töötajate arv, klientide tagasiside, asutamisaasta. Kui klient need annab,
   tasub lisada eelkõige tagasiside, sest see mõjub hinnapäringule kõige rohkem.
5. **hange.ee tööde arvud** (Põrandatööd 124, Vannitubade remont 54 ja nii edasi) on jäetud
   lehelt välja, kuna ei ole selge, mida täpselt need numbrid loevad. Kui klient kinnitab
   tähenduse, on need väga head numbrid avalehele.
6. **Ettevõtte profiil Google'is**, vaata punkt 8.

---

## 7. Piltide ja fontide päritolu

- Logo on tuletatud failist `Logo.png`. Valge taust on läbipaistvaks tehtud ja heledus
  tumeda tausta jaoks ümber arvutatud. Originaal on 384 px lai, seega suuremaks kui
  praegusele lehele ei tasu seda venitada. Kui klient annab logo SVG-na, tasub see välja vahetada.
- Sertifikaadi märgis on failist `turvalise partneri sert.png`, WebP-na kahes suuruses.
- Jagamispilt `pildid/og/meryton-group-jagamispilt.png` on genereeritud logost ja lehe värvidest.
- Kirjatüübid on Sora ja Manrope, mõlemad Google Fontsist, aga failid on kaustas `fondid/`
  ja lehed neid Google'i serverist ei lae. Latin-ext alamhulk on kaasas, ehk õ ä ö ü š ž töötavad.

---

## 8. Juhend kliendile: Google'i ettevõtteprofiil

Ilma selleta ei ole ettevõtet Google Mapsis ega kohalikus otsingus näha. See toob
väikeettevõttele tavaliselt rohkem päringuid kui koduleht ise.

1. Mine aadressile google.com/business ja loo profiil ettevõtte enda Google'i kontoga,
   mitte tegija konto alt.
2. Andmed, mis peavad kokku langema kodulehega tähemärgi täpsusega:
   nimi MERYTON GROUP OÜ, telefon +372 5689 3723, aadress Järve põik 5, Kilingi-Nõmme,
   Pärnumaa 86303, veebiaadress meryton.ee.
3. Kategooria: ehitustöövõtja. Lisakategooriad: põrandapaigaldusettevõte, torutööd,
   vannitubade remont.
4. Teeninduspiirkond: Pärnumaa, Viljandimaa, Harjumaa.
5. Fotod: logo, 10 kuni 15 tehtud tööde pilti, eelistatult samad, mis lehel. Lisa uusi
   iga paari kuu tagant, Google eelistab elavat profiili.
6. Arvustused: küsi kliendilt kohe pärast töö üleandmist, kui rahulolu on kõrge. Saada otsene
   link, mitte üldine palve. Iga arvustus vasta ära, ka lühidalt.
7. Lisa Google Search Console ja **kanna omanik üle kliendile**, mitte ainult enda kontole.
   Sitemapi väljale: domain-property puhul terve aadress, URL-prefix-property puhul `sitemap.xml`.

---

## 9. Hilisemad muudatused

- **Väike muudatus**, näiteks telefoninumber või üks lause: paranda fail otse GitHubis,
  Vercel uuendab umbes 30 sekundiga.
- **Uued fotod**: vaata punkt 2, seejärel laadi muutunud failid üles.
- **Uus artikkel**: `artiklid.html` sees on kommentaaris valmis kaardimall. Iga artikkel
  saab oma faili kausta `artiklid/` ja oma `Article` tüüpi JSON-LD ploki, milles on
  `headline`, `datePublished`, `dateModified`, `author`, `publisher` ja `mainEntityOfPage`.
  Lisa uus aadress ka `sitemap.xml` faili, ehk `tooriistad/pildid.js` sisse muutujasse `lehed`.

## 10. Mobiili murdepunktid

CSS on kirjutatud nii, et leht töötab laiustel 375, 768, 1024 ja 1440 px.
Kasutatud murdepunktid: **1024 px** (kolm veergu läheb kaheks, kõrvuti plokid lähevad üksteise alla),
**860 px** (menüü läheb hamburgeri alla), **720 px** (ruudustikud ühte veergu, vormi väljad ühte
veergu, jalus ühte veergu), **520 px** (galerii kaks veergu, nupud täislaiuses).
Kontrollitud on ka `prefers-reduced-motion`, mille korral animatsioonid on välja lülitatud.

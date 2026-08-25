#!/usr/bin/env python3
"""
Ehitab kõik HTML-lehed ühest kohast.

Päis, jalus ja head-plokk on kõigil lehtedel samad. Varem olid need kaheksas
failis eraldi ja jooksid kaks korda lahku, seega nüüd tulevad need siit.

Kasutus projekti juurkaustast:
    python3 tooriistad/lehed.py
    node tooriistad/pildid.js      # täidab galerii ja avalehe kastid

Järjekord on oluline: see skript kirjutab lehed koos tühjade märgistega
GALERII:ALGUS ja ESILEHE-PILDID:ALGUS, pildid.js täidab need.
"""

import io, json, os

JUUR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(JUUR, 'public')
SAIT = 'https://www.meryton.ee'

ANDMED = json.load(io.open(os.path.join(JUUR, 'tooriistad/galerii-andmed.json'), encoding='utf-8'))
KAT = {k['kaust']: k for k in ANDMED['kategooriad']}


def foto(kaust, nr):
    """Kategooria n-inda pildi tee ja alt-tekst."""
    p = KAT[kaust]['pildid'][nr - 1]
    return f"pildid/galerii/{kaust}/{p['fail']}", p['alt']


MENUU = [
    ('/', 'Avaleht'),
    ('/meist', 'Meist'),
    ('/teenused', 'Teenused ja tehtud tööd'),
    ('/kontakt', 'Kontakt'),
]

# Avapildi teenused: silt, teenuse ankur, galerii kaust
# Avapildil peavad olema laiad kaadrid. Lähikaader laguneb suurelt ära,
# ruumivaade ja välipilt mitte.
AVATEENUSED = [
    ('Eramu ehitus', '/teenused#eramu-ehitus', 'eramu-ehitus', 3),
    ('Vannitoad', '/teenused#vannitoad', 'vannitoad', 3),
    ('Põrandad', '/teenused#porandakatted', 'porandatood', 20),
    ('Vesi ja kanalisatsioon', '/teenused#vesi-kanalisatsioon', 'vesi-ja-kanalisatsioon', 17),
    ('Küte ja ventilatsioon', '/teenused#kute-ventilatsioon', 'kute-ja-ventilatsioon', 9),
    ('Terrassid ja saunad', '/teenused#puittood', 'puittood', 1),
]

# Teenuse ankur -> galerii kaust, galeriinupu jaoks teenuste lehel
GALERII_SEOS = [
    ('eramu-ehitus', 'eramu-ehitus'),
    ('porandakatted', 'porandatood'),
    ('vannitoad', 'vannitoad'),
    ('vesi-kanalisatsioon', 'vesi-ja-kanalisatsioon'),
    ('kute-ventilatsioon', 'kute-ja-ventilatsioon'),
    ('puittood', 'puittood'),
]

REKVISIIDID = """        <ul class="rekvisiidid">
          <li>MERYTON GROUP OÜ</li>
          <li>Registrikood 16262305</li>
          <li>KMKR EE102721669</li>
          <li>Järve põik 5, Kilingi-Nõmme, Pärnumaa 86303</li>
        </ul>
        <p>
          <a href="tel:+37256893723">+372 5689 3723</a> ·
          <a href="mailto:info@meryton.ee">info@meryton.ee</a>
        </p>"""


def pea(leht):
    """head-plokk."""
    kaan = SAIT + ('/' if leht['tee'] == '/' else leht['tee'])
    ld = ''
    if leht.get('ld'):
        ld = '\n<script type="application/ld+json">\n' + \
             json.dumps(leht['ld'], ensure_ascii=False, indent=2) + '\n</script>'
    robotid = '\n<meta name="robots" content="noindex, follow">' if leht.get('noindex') else ''
    return f"""<!DOCTYPE html>
<html lang="et">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{leht['title']}</title>
<meta name="description" content="{leht['kirjeldus']}">
<link rel="canonical" href="{kaan}">{robotid}

<meta property="og:type" content="website">
<meta property="og:site_name" content="Meryton Group OÜ">
<meta property="og:locale" content="et_EE">
<meta property="og:title" content="{leht['title']}">
<meta property="og:description" content="{leht['kirjeldus']}">
<meta property="og:url" content="{kaan}">
<meta property="og:image" content="{SAIT}/pildid/og/meryton-group-jagamispilt.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Meryton Group OÜ logo, all kiri ehitus ja renoveerimine.">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#f6f4ef">

<link rel="preload" href="/fondid/sora-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fondid/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/stiil.css">{ld}
</head>
<body>
<a class="jata-vahele" href="#sisu">Liigu sisu juurde</a>
"""


def pais(leht):
    """Päis. Avalehel algab see läbipaistvana avapildi peal."""
    klass = 'pais pais--peal' if leht.get('avapilt') else 'pais'
    read = []
    for tee, nimi in MENUU:
        praegune = ' aria-current="page"' if tee == leht['tee'] else ''
        read.append(f'        <li><a href="{tee}"{praegune}>{nimi}</a></li>')
    # Avalehel on päis tumeda avapildi peal, seal käib kuldne logo.
    # Heledatel lehtedel käib tumendatud variant.
    logo = ('meryton-group-logo' if leht.get('avapilt') else 'meryton-group-logo-tume')
    return f"""
<header class="{klass}">
  <div class="kest pais__sisu">
    <a class="pais__logo" href="/" aria-label="Meryton Group, avaleht">
      <img src="/pildid/ikoonid/{logo}.webp" width="500" height="517" alt="Meryton Group OÜ logo">
    </a>
    <button class="menuu-nupp" type="button" aria-expanded="false" aria-controls="peamenuu" aria-label="Ava menüü">
      <span></span>
    </button>
    <nav class="pais__nav" id="peamenuu" aria-label="Peamenüü">
      <ul>
{chr(10).join(read)}
      </ul>
      <a class="nupp nupp--kuld" href="/kontakt">Küsi pakkumist</a>
    </nav>
  </div>
</header>
"""


def jalus():
    read = []
    for tee, nimi in MENUU:
        read.append(f'          <li><a href="{tee}">{nimi}</a></li>')
    read.append('          <li><a href="/privaatsus">Privaatsus</a></li>')
    return f"""
<footer class="jalus">
  <div class="kest">
    <div class="jalus__ylemine">
      <div>
        <img class="jalus__logo" src="/pildid/ikoonid/meryton-group-logo.webp" width="500" height="517" loading="lazy" alt="Meryton Group OÜ logo">
        <p>Ehitus ja renoveerimine Pärnumaal, Viljandimaal ja Harjumaal. Kokkuleppel üle Eesti.</p>
      </div>

      <div>
        <h2>Lehed</h2>
        <ul>
{chr(10).join(read)}
        </ul>
      </div>

      <div>
        <h2>Turvaline partner</h2>
        <div class="jalus__sert">
          <img src="/pildid/sert/turvaline-partner-eesti-volausaldajate-liit-180.webp" width="180" height="180" loading="lazy" alt="Eesti Võlausaldajate Liidu Turvalise Partneri märgis.">
          <p>
            <strong>Turvaline Partner</strong>
            Märgise annab Eesti Võlausaldajate Liit.
          </p>
        </div>
      </div>
    </div>

    <div class="jalus__alumine">
      <div>
{REKVISIIDID}
      </div>
      <p>&copy; 2026 Meryton Group OÜ</p>
    </div>
  </div>
</footer>

<script src="/skript.js" defer></script>
</body>
</html>
"""


def leivapuru(nimi):
    return f"""
  <div class="kest">
    <nav class="leivapuru" aria-label="Leivapuru">
      <ol>
        <li><a href="/">Avaleht</a></li>
        <li aria-current="page">{nimi}</li>
      </ol>
    </nav>
  </div>
"""


def ehita(leht):
    return pea(leht) + pais(leht) + '\n<main id="sisu">\n' + leht['sisu'] + '\n</main>\n' + jalus()


def teenuste_ld():
    """Teenuste lehe struktuurandmed. FAQPage on välja jäetud, sest korduvate
    küsimuste sektsioon on lehelt maas."""
    d = json.load(io.open(os.path.join(JUUR, 'tooriistad/sisu/teenused-ld.json'), encoding='utf-8'))
    d['@graph'] = [x for x in d['@graph'] if x.get('@type') != 'FAQPage']
    return d


def osa(nimi):
    return io.open(os.path.join(JUUR, 'tooriistad/sisu', nimi), encoding='utf-8').read().rstrip()


ETTEVOTE_LD = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': f'{SAIT}/#ettevote',
    'name': 'Meryton Group OÜ',
    'url': f'{SAIT}/',
    'logo': f'{SAIT}/pildid/ikoonid/meryton-group-logo.png',
    'image': f'{SAIT}/pildid/og/meryton-group-jagamispilt.png',
    'description': 'Ehitusettevõte, mis ehitab ja renoveerib eramuid ning teeb põranda-, '
                   'vannitoa- ja tehnosüsteemide töid Pärnumaal, Viljandimaal ja Harjumaal.',
    'telephone': '+372 5689 3723',
    'email': 'info@meryton.ee',
    'vatID': 'EE102721669',
    'taxID': '16262305',
    'address': {
        '@type': 'PostalAddress',
        'streetAddress': 'Järve põik 5',
        'addressLocality': 'Kilingi-Nõmme',
        'addressRegion': 'Pärnumaa',
        'postalCode': '86303',
        'addressCountry': 'EE'
    },
    'areaServed': [
        {'@type': 'AdministrativeArea', 'name': 'Pärnumaa'},
        {'@type': 'AdministrativeArea', 'name': 'Viljandimaa'},
        {'@type': 'AdministrativeArea', 'name': 'Harjumaa'},
        {'@type': 'Country', 'name': 'Eesti'}
    ],
    'knowsAbout': ['Eramu ehitus', 'Renoveerimine', 'Põrandakatete paigaldus', 'Vannitoa ehitus',
                   'Vee- ja kanalisatsioonitööd', 'Kütte- ja ventilatsioonitööd', 'Puittööd'],
    'employee': {'@type': 'Person', 'name': 'Ain Uibokand', 'jobTitle': 'Tegevjuht'},
    'sameAs': ['https://www.hange.ee/meryton-group-oa/56725/firma/'],
    'contactPoint': {
        '@type': 'ContactPoint',
        'contactType': 'Müük ja hinnapäringud',
        'telephone': '+372 5689 3723',
        'email': 'info@meryton.ee',
        'availableLanguage': 'et'
    },
    'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': 'Meryton Group OÜ teenused',
        'itemListElement': [
            {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': n, 'url': f'{SAIT}/teenused#{a}'}}
            for n, a in [
                ('Eramu ehitus ja renoveerimine', 'eramu-ehitus'),
                ('Põrandakatete paigaldus', 'porandakatted'),
                ('Vannitoa ehitus ja renoveerimine', 'vannitoad'),
                ('Vee- ja kanalisatsioonitööd', 'vesi-kanalisatsioon'),
                ('Kütte- ja ventilatsioonisüsteemide paigaldus', 'kute-ventilatsioon'),
                ('Saunad, terrassid ja varjualused', 'puittood')
            ]
        ]
    }
}

VIITED = ['Apollo kino, Ülemiste keskus', 'Apollo kino, Panevėžys, Leedu',
          'Apollo kino, Riga Plaza, Läti', 'Apollo raamatupood, Ülemiste keskus',
          'Restoran CHI', 'Restoran Little India', 'Babyback, Läti', "O'Learys, Riga Plaza"]


def viited_loend():
    return '\n'.join(f'        <li>{v}</li>' for v in VIITED)


def avapilt():
    """Kliendi kavandi järgi: tume taust, kaherealine pealkiri, millest teine
    pool on kuldne, õhuke kuldne joon, alalause ja kaks nuppu.

    Taust on montaaž kliendi enda kuuest fotost. Kolm 640 px fotot kõrvuti
    annavad 1920 px laia pildi, ehk taustapilti ei ole vaja venitada."""
    return """
  <section class="avapilt">
    <div class="avapilt__taust">
      <img src="/pildid/avapilt/meryton-tehtud-tood-montaaz.webp"
           srcset="/pildid/avapilt/meryton-tehtud-tood-montaaz-1000.webp 1000w, /pildid/avapilt/meryton-tehtud-tood-montaaz.webp 1920w"
           sizes="100vw" width="1920" height="960" fetchpriority="high" decoding="async"
           alt="Meryton Group OÜ tehtud tööd: vundament, karkass, tehnosüsteemid ja valmis eramu.">
    </div>
    <div class="avapilt__kate"></div>

    <div class="kest avapilt__sisu">
      <h1>
        <span class="avapilt__rida">Me ei ehita lihtsalt hooneid.</span>
        <span class="avapilt__rida avapilt__rida--kuld">Me loome lahendusi, mis kestavad.</span>
      </h1>
      <p class="avapilt__joon" aria-hidden="true"></p>
      <p class="avapilt__jutt">
        Kaasaegne ehitus. Läbimõeldud lahendused. Kvaliteet, mis kestab.
      </p>
      <div class="nupu-rida">
        <a class="nupp nupp--kuld" href="/tood">Vaata tehtud töid</a>
        <a class="nupp nupp--joon" href="/kontakt">Räägi oma projektist</a>
      </div>
    </div>
  </section>
"""


def galeriinupud(html):
    """Lisab iga teenuse nupurea juurde nupu galeriisse koos fotode arvuga."""
    for ankur, kaust in GALERII_SEOS:
        arv = len(KAT[kaust]['pildid'])
        algus = html.index(f'<article class="teenus" id="{ankur}">')
        lopp = html.index('</article>', algus)
        marker = '</a>\n          </div>'
        koht = html.rindex(marker, algus, lopp)
        nupp = (f'</a>\n            <a class="nupp nupp--joon" href="/tood#{kaust}">'
                f'Vaata fotosid ({arv})</a>\n          </div>')
        html = html[:koht] + nupp + html[koht + len(marker):]
    return html


LEHED = []

# --- avaleht --------------------------------------------------------------
LEHED.append({
    'fail': 'index.html',
    'tee': '/',
    'avapilt': True,
    'title': 'Ehitus ja renoveerimine Pärnumaal | Meryton Group',
    'kirjeldus': 'Eramu ehitus ja renoveerimine, vannitoad, põrandakatted, torutööd ja küte. '
                 'Üle 20 aasta kogemust Pärnumaal, Viljandimaal ja Harjumaal. Küsi pakkumist.',
    'ld': ETTEVOTE_LD,
    'sisu': avapilt()
})

# --- meist ----------------------------------------------------------------
LEHED.append({
    'fail': 'meist.html',
    'tee': '/meist',
    'title': 'Meist, ehitusettevõte Pärnumaal | Meryton Group',
    'kirjeldus': 'Meryton Group OÜ on üle 20 aasta kogemusega ehitusettevõte. '
                 'Töötame Pärnumaal, Viljandimaal ja Harjumaal, fookuses eramud.',
    'ld': {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Avaleht', 'item': f'{SAIT}/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Meist', 'item': f'{SAIT}/meist'}
        ]
    },
    'sisu': leivapuru('Meist') + f"""
  <section class="lehepais">
    <div class="kest">
      <p class="moot">Meist</p>
      <h1>Kes me oleme</h1>
      <p>
        Oleme ehituses üle kahekümne aasta ja selle ajaga on näha saanud, mis objektil
        tavaliselt viltu läheb.
      </p>
    </div>
  </section>

  <section class="sektsioon">
    <div class="kest">
      <ul class="numbrid">
        <li>
          <div><strong>20+ aastat</strong><span>kogemust ehituses</span></div>
        </li>
        <li>
          <div><strong>3 maakonda</strong><span>kus töötame kõige rohkem</span></div>
        </li>
        <li>
          <img src="/pildid/sert/turvaline-partner-eesti-volausaldajate-liit-180.webp" width="180" height="180" loading="lazy" alt="Eesti Võlausaldajate Liidu Turvalise Partneri märgis.">
          <div><strong>Turvaline Partner</strong><span>Eesti Võlausaldajate Liit</span></div>
        </li>
      </ul>
    </div>
  </section>

  <section class="sektsioon sektsioon--pind" aria-labelledby="miks-pealkiri">
    <div class="kest">
      <div class="jaotis-pais">
        <p class="moot">01 <span>Kuidas me töötame</span></p>
        <h2 id="miks-pealkiri">Professionaalsus, korrektsus ja aus suhtlus</h2>
      </div>

      <div class="usaldus">
        <div>
          <p>
            Räägime tellijaga otse: mis on tehtav, mis ei ole ning mis järjekorras asjad
            käima peavad. Mõnikord tähendab see ka seda, et soovitame teha algsest plaanist
            vähem või teha asjad teises järjekorras.
          </p>
          <p>
            Teeme tööd nii, et seda ei peaks paari aasta pärast uuesti lahti võtma. Kõige
            rohkem töötame Pärnu-, Viljandi- ja Harjumaal, kaugemale tuleme kokkuleppel.
            Fookuses on erasektor, eelkõige eramajad ja väiksemad arendusprojektid.
          </p>
          <p>
            Ettevõte on Eesti äriregistris registrikoodiga 16262305 ja käibemaksukohustuslane
            numbriga EE102721669. Tegevjuht Ain Uibokand vastab telefonile ise.
          </p>
          <div class="nupu-rida">
            <a class="nupp nupp--joon" href="/teenused">Vaata, mida me teeme</a>
          </div>
        </div>

        <div class="sert-kaart">
          <img src="/pildid/sert/turvaline-partner-eesti-volausaldajate-liit.webp" width="360" height="360" loading="lazy" alt="Eesti Võlausaldajate Liidu Turvalise Partneri märgis.">
          <div>
            <h3>Turvaline Partner</h3>
            <p>Märgise annab Eesti Võlausaldajate Liit ja see puudutab ettevõtte maksekäitumist.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sektsioon" aria-labelledby="alltoovott-pealkiri">
    <div class="kest">
      <div class="jaotis-pais">
        <p class="moot">02 <span>Alltöövõtt</span></p>
        <h2 id="alltoovott-pealkiri">Pinnakatted suurtel objektidel</h2>
        <p>Alltöövõtjana oleme pinnakatteid paigaldanud ka väljaspool eramuid. Need kohad on avalikud ja igaüks saab neid ise vaatamas käia.</p>
      </div>
      <ul class="viited">
{viited_loend()}
      </ul>
    </div>
  </section>

  <section class="sektsioon sektsioon--tume" aria-labelledby="cta-pealkiri">
    <div class="kest">
      <div class="jaotis-pais">
        <p class="moot">03 <span>Kontakt</span></p>
        <h2 id="cta-pealkiri">Räägi oma projektist</h2>
        <p>Kirjuta lühidalt, mis maja see on, mis tööd vaja ja mis ajaks. Kui töö meile ei sobi või kui õigem oleks see teha teises järjekorras, ütleme seda kohe.</p>
      </div>
      <div class="nupu-rida nupu-rida--tihe">
        <a class="nupp nupp--kuld" href="/kontakt">Küsi pakkumist</a>
        <a class="nupp nupp--joon" href="tel:+37256893723">+372 5689 3723</a>
      </div>
    </div>
  </section>
"""
})

# --- teenused -------------------------------------------------------------
LEHED.append({
    'fail': 'teenused.html',
    'tee': '/teenused',
    'title': 'Ehitusteenused eramutele Pärnumaal | Meryton Group',
    'kirjeldus': 'Eramu ehitus ja renoveerimine, vannitoad, parketi, vaiba ja LVT paigaldus, '
                 'torutööd, küte ning saunad. Vaata, mis iga teenuse sisse käib.',
    'ld': teenuste_ld(),
    'sisu': leivapuru('Teenused') + f"""
  <section class="lehepais">
    <div class="kest">
      <p class="moot">Teenused</p>
      <h1>Mida me teeme</h1>
      <p>
        Iga töö juures on kirjas, mis selle sisse käib ja mis jääb välja. Kui objektil on vaja
        mitut tööd korraga, saab need tellida ühest kohast ega pea eri meeste graafikuid kokku
        sobitama.
      </p>
    </div>
  </section>

  <section class="sektsioon">
    <div class="kest">
{galeriinupud(osa('teenused-artiklid.html'))}
    </div>
  </section>

"""
})

# --- tehtud tööd ----------------------------------------------------------
LEHED.append({
    'fail': 'tood.html',
    'tee': '/tood',
    'title': 'Tehtud tööd, fotod objektidelt | Meryton Group',
    'kirjeldus': 'Meryton Group OÜ tehtud tööde fotod tööliigi järgi: põrandad, vannitoad, '
                 'eramud, torutööd, küte, puittööd ja välitööd. Vaata pilte objektidelt.',
    'ld': {'@context': 'https://schema.org', '@graph': []},   # pildid.js kirjutab üle
    'sisu': leivapuru('Tehtud tööd') + f"""
  <section class="lehepais">
    <div class="kest">
      <p class="moot">Tehtud tööd</p>
      <h1>Pildid tehtud töödest</h1>
      <p>
        Tööd on jaotatud liigi järgi. Mis töö täpsemalt sisse käib, on kirjas
        <a href="/teenused">teenuste lehel</a>.
      </p>
    </div>
  </section>

  <section class="sektsioon">
    <div class="kest">
<!-- GALERII:ALGUS -->
<!-- GALERII:LOPP -->
    </div>
  </section>

  <section class="sektsioon sektsioon--pind">
    <div class="kest">
      <div class="jaotis-pais">
        <p class="moot">Alltöövõtt</p>
        <h2>Kohad, kus meie tööd saab ise vaatamas käia</h2>
        <p>Pinnakatteid oleme alltöövõtjana paigaldanud ka avalikes ruumides. Nendesse kohtadesse saab igaüks ise sisse astuda.</p>
      </div>
      <ul class="viited">
{viited_loend()}
      </ul>
      <div class="nupu-rida">
        <a class="nupp nupp--kuld" href="/kontakt">Küsi oma objektile pakkumist</a>
      </div>
    </div>
  </section>
"""
})

# --- kontakt --------------------------------------------------------------
LEHED.append({
    'fail': 'kontakt.html',
    'tee': '/kontakt',
    'title': 'Kontakt ja hinnapäring | Meryton Group OÜ',
    'kirjeldus': 'Küsi ehitustööle pakkumist. Telefon +372 5689 3723, info@meryton.ee. '
                 'Meryton Group OÜ, Kilingi-Nõmme, Pärnumaa. Töötame Pärnu-, Viljandi- ja Harjumaal.',
    'ld': {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Avaleht', 'item': f'{SAIT}/'},
                {'@type': 'ListItem', 'position': 2, 'name': 'Kontakt', 'item': f'{SAIT}/kontakt'}]},
            {'@id': f'{SAIT}/#ettevote', '@type': 'LocalBusiness',
             'name': 'Meryton Group OÜ', 'url': f'{SAIT}/',
             'telephone': '+372 5689 3723', 'email': 'info@meryton.ee',
             'vatID': 'EE102721669', 'taxID': '16262305',
             'address': ETTEVOTE_LD['address'], 'areaServed': ETTEVOTE_LD['areaServed']}
        ]
    },
    'sisu': leivapuru('Kontakt') + f"""
  <section class="lehepais">
    <div class="kest">
      <p class="moot">Kontakt</p>
      <h1>Võta ühendust</h1>
      <p>
        Kirjuta lühidalt, mis maja see on, mis tööd vaja ja mis ajaks. Mida täpsem on kirjeldus,
        seda täpsema vastuse saame anda. Kui asi on kiire, helista.
      </p>
    </div>
  </section>

  <section class="sektsioon">
    <div class="kest">
      <div class="kontakt-ruudustik">

        <div>
          <h2>Hinnapäring</h2>
{osa('kontakt-vorm.html')}
        </div>

        <aside class="andmeplokk">
          <h2>Otsekontakt</h2>
          <dl>
            <div><dt>Telefon</dt><dd><a href="tel:+37256893723">+372 5689 3723</a></dd></div>
            <div><dt>E-post</dt><dd><a href="mailto:info@meryton.ee">info@meryton.ee</a></dd></div>
            <div><dt>Tegevjuht</dt><dd>Ain Uibokand</dd></div>
            <div><dt>Aadress</dt><dd>Järve põik 5, Kilingi-Nõmme, Pärnumaa 86303</dd></div>
            <div><dt>Tööpiirkond</dt><dd>Pärnumaa, Viljandimaa ja Harjumaa. Kokkuleppel üle Eesti.</dd></div>
            <div><dt>Rekvisiidid</dt><dd>MERYTON GROUP OÜ, registrikood 16262305, KMKR EE102721669</dd></div>
          </dl>
          <p class="ruum-yles">
            Enne päringut tasub üle vaadata <a href="/teenused">teenused</a> ja
            <a href="/tood">tehtud tööd</a>.
          </p>
        </aside>

      </div>
    </div>
  </section>
"""
})

# --- privaatsus -----------------------------------------------------------
LEHED.append({
    'fail': 'privaatsus.html',
    'tee': '/privaatsus',
    'title': 'Privaatsusteade | Meryton Group OÜ',
    'kirjeldus': 'Mis andmeid Meryton Group OÜ hinnapäringu vormiga kogub, mis eesmärgil, '
                 'kui kaua neid hoitakse ja kellega jagatakse.',
    'sisu': leivapuru('Privaatsus') + f"""
  <section class="lehepais">
    <div class="kest">
      <p class="moot">Privaatsus</p>
      <h1>Privaatsusteade</h1>
      <p>Kehtib selle veebilehe hinnapäringu vormi ja kirjavahetuse kohta.</p>
    </div>
  </section>

  <section class="sektsioon">
    <div class="kest">
{osa('privaatsus-proosa.html')}
    </div>
  </section>
"""
})

# --- tänuleht -------------------------------------------------------------
LEHED.append({
    'fail': 'aitah.html',
    'tee': '/aitah',
    'noindex': True,
    'title': 'Päring saadetud | Meryton Group OÜ',
    'kirjeldus': 'Sinu hinnapäring jõudis kohale. Võtame ühendust esimesel võimalusel.',
    'sisu': """
  <section class="keskel">
    <div class="kest">
      <p class="moot moot--keskel">Päring saadetud</p>
      <h1>Aitäh, kiri jõudis kohale</h1>
      <p>
        Vaatame päringu üle ja võtame ühendust. Kui asi on kiire, helista otse numbril
        <a href="tel:+37256893723">+372 5689 3723</a>.
      </p>
      <div class="nupu-rida nupu-rida--keskel">
        <a class="nupp nupp--joon" href="/">Tagasi avalehele</a>
        <a class="nupp nupp--joon" href="/tood">Vaata tehtud töid</a>
      </div>
    </div>
  </section>
"""
})

# --- vealeht --------------------------------------------------------------
LEHED.append({
    'fail': '404.html',
    'tee': '/404',
    'noindex': True,
    'title': 'Lehte ei leitud | Meryton Group OÜ',
    'kirjeldus': 'Seda lehte ei ole olemas. Liigu tagasi avalehele või vaata tehtud töid.',
    'sisu': """
  <section class="keskel">
    <div class="kest">
      <p class="moot moot--keskel">Viga 404</p>
      <h1>Seda lehte ei ole</h1>
      <p>Aadress on vale või leht on ära kolinud. Alusta uuesti avalehelt või vaata kohe tehtud töid.</p>
      <div class="nupu-rida nupu-rida--keskel">
        <a class="nupp nupp--kuld" href="/">Avalehele</a>
        <a class="nupp nupp--joon" href="/tood">Tehtud tööd</a>
        <a class="nupp nupp--joon" href="/kontakt">Kontakt</a>
      </div>
    </div>
  </section>
"""
})


if __name__ == '__main__':
    for leht in LEHED:
        tee = os.path.join(PUBLIC, leht['fail'])
        io.open(tee, 'w', encoding='utf-8').write(ehita(leht))
        print(f"  {leht['fail']}")
    print(f'{len(LEHED)} lehte kirjutatud. Jooksuta nüüd: node tooriistad/pildid.js')

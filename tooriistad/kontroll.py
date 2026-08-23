#!/usr/bin/env python3
"""
Kontrollib lehe koodiga üle, mitte silma järgi.

Kasutus projekti juurkaustast:
    python3 tooriistad/kontroll.py

Väljub veakoodiga, kui midagi on katki, seega sobib ka CI-sse.
"""

import io, json, os, re, sys
from html.parser import HTMLParser

JUUR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(JUUR, 'public')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr'}
vead = []


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.h, self.ids = [], [], set()
        self.links, self.imgs, self.probleemid, self.jsonld = [], [], [], []
        self.in_ld, self.ld_buf = False, ''

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if 'id' in d:
            self.ids.add(d['id'])
        if tag == 'a' and 'href' in d:
            self.links.append((d['href'], self.getpos()[0]))
        if tag == 'img':
            self.imgs.append((d.get('src', ''), d.get('alt'), d.get('width'),
                              d.get('height'), self.getpos()[0]))
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.h.append((int(tag[1]), self.getpos()[0]))
        if tag == 'script' and d.get('type') == 'application/ld+json':
            self.in_ld, self.ld_buf = True, ''
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag == 'script' and self.in_ld:
            self.jsonld.append(self.ld_buf)
            self.in_ld = False
        if tag in VOID:
            return
        if not self.stack:
            self.probleemid.append(f'rida {self.getpos()[0]}: sulgev </{tag}> ilma avavata')
            return
        t, r = self.stack.pop()
        if t != tag:
            self.probleemid.append(f'rida {self.getpos()[0]}: </{tag}> aga avatud oli <{t}> (rida {r})')

    def handle_data(self, data):
        if self.in_ld:
            self.ld_buf += data


def fail_teest(tee):
    """Puhtast aadressist failinimi: /teenused -> teenused.html"""
    tee = tee.split('?')[0].lstrip('/')
    if not tee:
        return 'index.html'
    return tee if '.' in tee else tee + '.html'


lehed = sorted(f for f in os.listdir(PUBLIC) if f.endswith('.html'))

for fail in lehed:
    s = io.open(os.path.join(PUBLIC, fail), encoding='utf-8').read()
    p = P()
    p.feed(s)

    vead += [f'{fail}: {x}' for x in p.probleemid]
    if p.stack:
        vead.append(f'{fail}: sulgemata sildid {[t for t, _ in p.stack]}')

    h1 = [x for x in p.h if x[0] == 1]
    if len(h1) != 1:
        vead.append(f'{fail}: h1 arv on {len(h1)}, peab olema 1')
    eelmine = 0
    for tase, rida in p.h:
        if eelmine and tase > eelmine + 1:
            vead.append(f'{fail} rida {rida}: pealkirja tase hüppab h{eelmine} pealt h{tase} peale')
        eelmine = tase

    for i, blokk in enumerate(p.jsonld):
        try:
            json.loads(blokk)
        except Exception as e:
            vead.append(f'{fail}: JSON-LD plokk {i + 1} ei parsi, {e}')

    for href, rida in p.links:
        if href.startswith(('http://', 'https://', 'tel:', 'mailto:', '#')):
            if href.startswith('#') and href[1:] and href[1:] not in p.ids:
                vead.append(f'{fail} rida {rida}: ankur {href} puudub')
            continue
        tee_osa, _, ankur = href.partition('#')
        siht = fail_teest(tee_osa)
        if not os.path.exists(os.path.join(PUBLIC, siht)):
            vead.append(f'{fail} rida {rida}: link {href} viitab puuduvale failile {siht}')
        elif ankur:
            sisu = io.open(os.path.join(PUBLIC, siht), encoding='utf-8').read()
            if f'id="{ankur}"' not in sisu:
                vead.append(f'{fail} rida {rida}: ankur #{ankur} puudub failis {siht}')

    for src, alt, w, h, rida in p.imgs:
        if src.startswith('data:'):
            continue
        f = src.lstrip('/')
        if not os.path.exists(os.path.join(PUBLIC, f)):
            vead.append(f'{fail} rida {rida}: pilt {src} puudub')
        if alt is None:
            vead.append(f'{fail} rida {rida}: pildil {src} puudub alt')
        if not w or not h:
            vead.append(f'{fail} rida {rida}: pildil {src} puudub width/height')

    if '—' in s:
        vead.append(f'{fail}: sisaldab pikka mõttekriipsu U+2014')
    if re.search(r'\sstyle="', s):
        vead.append(f'{fail}: style= atribuut, range CSP keelab selle')
    if '[NIMI]' in s or '[KOOD]' in s:
        vead.append(f'{fail}: kohatäide alles')
    if '_vercel' in s or 'vercel.app' in s:
        vead.append(f'{fail}: Verceli jäänuk')
    if re.search(r'href="(?!http)[^"]*\.html', s):
        vead.append(f'{fail}: .html lõpuga sisemine link, aadressid on puhtad')

# muud failid
for f in ['stiil.css', 'skript.js', 'sitemap.xml', 'robots.txt', 'site.webmanifest',
          '_headers', '_redirects']:
    t = os.path.join(PUBLIC, f)
    if not os.path.exists(t):
        vead.append(f'puudub fail public/{f}')
        continue
    if '—' in io.open(t, encoding='utf-8').read():
        vead.append(f'{f}: sisaldab pikka mõttekriipsu U+2014')

for f in ['worker.js', 'wrangler.jsonc', 'package.json']:
    if not os.path.exists(os.path.join(JUUR, f)):
        vead.append(f'puudub fail {f}')

try:
    json.loads(io.open(os.path.join(PUBLIC, 'site.webmanifest'), encoding='utf-8').read())
except Exception as e:
    vead.append(f'site.webmanifest ei parsi, {e}')

# fondifailid
css = io.open(os.path.join(PUBLIC, 'stiil.css'), encoding='utf-8').read()
for m in re.findall(r"url\('([^']+)'\)", css):
    if not os.path.exists(os.path.join(PUBLIC, m.lstrip('/'))):
        vead.append(f'stiil.css: fondifail {m} puudub')

# pildifailide suurus
suured = []
for juur, _, failid in os.walk(os.path.join(PUBLIC, 'pildid')):
    for f in failid:
        t = os.path.join(juur, f)
        if os.path.getsize(t) > 400 * 1024:
            suured.append(f'{os.path.relpath(t, PUBLIC)} {round(os.path.getsize(t)/1024)} KB')
for x in suured:
    vead.append(f'pilt üle 400 KB: {x}')

print('--- kohad, kus on koma sidesõna ees, vaata üle ---')
for fail in lehed:
    s = io.open(os.path.join(PUBLIC, fail), encoding='utf-8').read()
    for m in re.finditer(r'[^>]{0,60},\s+(ja|ning|või|ega)\s+[^<]{0,40}', s):
        print(f'  {fail}: ...{m.group(0)[:110]}')

print()
if vead:
    print(f'--- {len(vead)} viga ---')
    for v in vead:
        print(' ', v)
    sys.exit(1)
print('Kontroll läbitud, vigu ei ole.')

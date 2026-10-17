import pdfplumber, glob, json, re, sys
from _kaynak import kaynak
OUT = sys.argv[1]
DOCS = [
 ('B1', 'bolum1', 'Bölüm 1 · İdari ve Mali Kurallar'),
 ('B2', 'bolum2', 'Bölüm 2 · Teknik Kurallar'),
 ('B3', 'bolum3', 'Bölüm 3 · Teknik Tasarım Raporu'),
 ('B4', 'bolum4', 'Bölüm 4 · Görsel Tasarım'),
 ('B5', 'bolum5', 'Bölüm 5 · Etkinlik Kuralları'),
 ('B6', 'bolum6', 'Bölüm 6'),
 ('B7', 'bolum7', 'Bölüm 7'),
 ('LIS', 'lisans', 'Sürücüler için Lisans İşlemleri'),
]
UP = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZQWX'
LOW = 'abcçdefgğhıijklmnoöprsştuüvyzqwx'

def vert(c):
    # rotated text like "R E L L O R T N O K"
    s = c.split(' ')
    if len(s) >= 5 and sum(len(x) <= 2 for x in s) >= len(s) - 1:
        return True
    return False

KNOWN_GRP = ['TASARIM SÜREÇLERİ', 'YARIŞ HAFTASI SÜRECİ', 'ARAÇ DIŞI KONTROLLER', 'ARAÇ İÇİ KONTROLLER', 'GÜVENLİK KONTROLLERİ']
def fixvert(c):
    d = c.replace(' ', '')[::-1]
    for k in KNOWN_GRP:
        if sorted(k.replace(' ', '')) == sorted(d):
            return k
    return d

def clean_cell(c):
    c = (c or '').replace('\n', ' ').strip()
    c = re.sub(r'\s+', ' ', c)
    return fixvert(c) if vert(c) else c

def page_blocks(p):
    """yield ('t', text) and ('tab', rows) in reading order"""
    try:
        tabs = p.find_tables()
    except Exception:
        tabs = []
    tabs = sorted(tabs, key=lambda t: t.bbox[1])
    out = []
    top = 0
    W, H = p.width, p.height
    for t in tabs:
        x0, y0, x1, y1 = t.bbox
        if y0 > top + 1:
            try:
                out.append(('t', p.crop((0, top, W, y0)).extract_text() or ''))
            except Exception:
                pass
        rows = [[clean_cell(c) for c in r] for r in t.extract()]
        rows = [r for r in rows if any(r)]
        ncol = max((len(r) for r in rows), default=0)
        if rows and (ncol == 1 or len(rows) == 1 and sum(bool(x) for x in rows[0]) == 1):
            out.append(('t', ' '.join(x for r in rows for x in r if x)))
        elif rows:
            out.append(('tab', rows))
        top = max(top, y1)
    if top < H - 1:
        try:
            out.append(('t', p.crop((0, top, W, H)).extract_text() or ''))
        except Exception:
            pass
    return out

HEAD = re.compile(r'^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(\S.{0,110})$')
MARK = re.compile(r'^(?:[a-zçğıöşü]{1,2}\)|[ivx]{1,5}[\.\)]\s|\d{1,2}[\.\)]\s|•|▪|-\s|–\s|\*)')

DAYS = ['BİRİNCİ', 'İKİNCİ', 'ÜÇÜNCÜ', 'DÖRDÜNCÜ', 'BEŞİNCİ', 'ALTINCI', 'YEDİNCİ']
DAY = re.compile(r'^(' + '|'.join(DAYS) + r') GÜN$')
def successor(prev, c):
    if not prev:
        return len(c) == 1 and c[0] <= 3
    if c == prev + [1]:
        return True
    for k in range(len(prev), 0, -1):
        if c == prev[:k - 1] + [prev[k - 1] + 1]:
            return True
        if k >= 2 and c == prev[:k - 1] + [prev[k - 1] + 2]:
            return True
    return False

def upper_ratio(s):
    L = [ch for ch in s if ch.isalpha()]
    return sum(ch.isupper() for ch in L) / max(1, len(L))

def build(code, pat, title):
    f = kaynak(pat)
    pdf = pdfplumber.open(f)
    # version line
    first = '\n'.join((pdf.pages[i].extract_text() or '') for i in range(min(3, len(pdf.pages))))
    vs = sorted(set(re.findall(r'Y\d{2}\.V\d\.\d', first)))
    ds = sorted(set(re.findall(r'\b(\d{2})\.(\d{2})\.(20\d\d)\b', first)), key=lambda x: (x[2], x[1], x[0]))
    ver = ' · '.join(x for x in [vs[-1] if vs else '', '.'.join(ds[-1]) if ds else ''] if x)
    cm = re.search(r'BÖLÜM\s+\d\s*\n\s*(.+)', first)
    if cm: title = title.split(' · ')[0] + ' · ' + cm.group(1).strip()
    # collect lines with page numbers
    items = []  # (page, kind, payload)
    for i, p in enumerate(pdf.pages):
        for k, v in page_blocks(p):
            if k == 't':
                for ln in v.split('\n'):
                    ln = ln.strip()
                    if not ln or re.fullmatch(r'[IVXL]{1,5}|\d{1,3}', ln):
                        continue
                    items.append((i + 1, 't', ln))
            else:
                items.append((i + 1, 'tab', v))
    # body start: after last TOC dot leader line
    last = -1
    for j, (pg, k, v) in enumerate(items):
        if k == 't' and re.search(r'\.{6,}\s*\d*$', v):
            last = j
    body = items[last + 1:]
    secs = [{'n': '0', 't': 'Giriş / Tanımlar', 'pg': body[0][0] if body else 1, 'b': []}]
    prev = []
    pend = None  # heading number alone on a line
    for pg, k, v in body:
        if k == 'tab':
            secs[-1]['b'].append({'tab': v})
            continue
        ln = v
        if pend is not None:
            ln = pend + ' ' + ln
            pend = None
        if re.fullmatch(r'\d{1,2}(?:\.\d{1,2}){1,3}\.?', ln):
            pend = ln
            continue
        dm = DAY.match(ln)
        if dm:
            secs.append({'n': 'G%d' % (DAYS.index(dm.group(1)) + 1), 't': ['Birinci','İkinci','Üçüncü','Dördüncü','Beşinci','Altıncı','Yedinci'][DAYS.index(dm.group(1))] + ' Gün', 'pg': pg, 'b': []})
            continue
        m = HEAD.match(ln)
        ok = False
        if m:
            num = [int(x) for x in m.group(1).split('.')]
            t = m.group(2).strip()
            if (t[0] in UP or t[0].isdigit()) and successor(prev, num) and not re.search(r'\.{6,}', t):
                if len(num) == 1:
                    ok = upper_ratio(t) > .7 or code == 'LIS'
                else:
                    ok = len(t) < 90 and not t.endswith((',', ';')) and (t[-1] != '.' or len(t) < 40)
        if ok:
            prev = num
            secs.append({'n': m.group(1), 't': t, 'pg': pg, 'b': []})
            continue
        secs[-1]['b'].append(ln)
    # paragraph joining
    for s in secs:
        paras = []
        cur = None
        for b in s['b']:
            if isinstance(b, dict):
                if cur: paras.append(cur); cur = None
                paras.append(b)
                continue
            if b in ('•', '▪'):
                if cur: paras.append(cur)
                cur = '•'
                continue
            newp = bool(MARK.match(b))
            if cur is None:
                cur = b
            elif cur == '•':
                cur = '• ' + b
            elif newp or (cur.rstrip().endswith((':', '.')) and b[0] in UP and len(cur) > 60 and not cur.rstrip().endswith('vb.')):
                paras.append(cur); cur = b
            else:
                cur = cur + ' ' + b
        if cur: paras.append(cur)
        s['p'] = paras
        del s['b']
    if not secs[0]['p']:
        secs = secs[1:]
    return {'id': code, 'title': title, 'ver': ver, 'pages': len(pdf.pages), 'file': __import__('os').path.basename(f), 'secs': secs}

out = {'yil': 2026, 'docs': []}
for c, p, t in DOCS:
    d = build(c, p, t)
    out['docs'].append(d)
    print(c, d['ver'], len(d['secs']), 'secs', file=sys.stderr)

# ---- ceza listesi (B2 Ek 1) ----
f = kaynak('bolum2')
pdf = pdfplumber.open(f)
rows = []
started = False
for i in range(len(pdf.pages)):
    for t in pdf.pages[i].extract_tables():
        for r in t:
            r = [clean_cell(c) for c in r]
            if r[1:4] == ['BAŞLIK', 'İHLAL', 'ELEKTROMOBİL'] or (len(r) == 5 and r[1] == 'BAŞLIK' and r[2] == 'İHLAL'):
                started = True
                continue
            if not started or len(r) != 5:
                if started and len(r) != 5:
                    started = False
                continue
            rows.append(r)
ceza = []
grp = bas = ''
for g, b, ih, em, hm in rows:
    if g:
        grp = g
    if b and not ih and not em and not hm and ceza:
        ceza[-1]['b'] += ' ' + b
        continue
    if not b and not em and not hm and ih and ceza:
        ceza[-1]['i'] += ' ' + ih
        continue
    if not b and not ih and (em or hm) and ceza:
        if em: ceza[-1]['em'] += ' ' + em
        if hm: ceza[-1]['hm'] += ' ' + hm
        continue
    if b: bas = b
    if not ih and not em and not hm:
        continue
    ceza.append({'g': grp, 'b': bas, 'i': ih, 'em': em, 'hm': hm})
out['ceza'] = ceza
print('ceza', len(ceza), file=sys.stderr)
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))

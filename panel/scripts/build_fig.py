import pdfplumber, glob, json, re, sys, os
from collections import Counter
from _kaynak import kaynak
OUTDIR = sys.argv[1]           # dist/data/fig
JSON = sys.argv[2]             # dist/data/sartname-2026.json
os.makedirs(OUTDIR, exist_ok=True)
DOCS = [('B1', 'bolum1'), ('B2', 'bolum2'), ('B3', 'bolum3'), ('B6', 'bolum6')]
CAP = re.compile(r'^Şekil\s*(\d+)((?:\.[a-z0-9])*)\.\s+(\S.*)$')

def key(im):
    return (round(im['x0']), round(im['top']), round(im['x1']), round(im['bottom']))

figs = []
for code, pat in DOCS:
    f = kaynak(pat)
    pdf = pdfplumber.open(f)
    cnt = Counter()
    for p in pdf.pages:
        for im in p.images:
            cnt[key(im)] += 1
    for pi, p in enumerate(pdf.pages):
        W, H = p.width, p.height
        ims = [im for im in p.images if cnt[key(im)] < 4
               and (im['x1'] - im['x0']) * (im['bottom'] - im['top']) < .5 * W * H
               and (im['x1'] - im['x0']) > 25 and (im['bottom'] - im['top']) > 20]
        lines = p.extract_text_lines()
        # skip TOC pages
        if sum(1 for l in lines if re.search(r'\.{6,}', l['text'])) > 3:
            continue
        caps = [l for l in lines if CAP.match(l['text'].strip()) and not re.search(r'\.{6,}', l['text'])]
        # rows of captions at the same height
        rows = []
        for c in sorted(caps, key=lambda l: l['top']):
            if rows and abs(rows[-1][0]['top'] - c['top']) < 8:
                rows[-1].append(c)
            else:
                rows.append([c])
        used = set()
        prev_bottom = 40
        last = None
        for row in rows:
            top = min(c['top'] for c in row); bot = max(c['bottom'] for c in row)
            text = '   '.join(c['text'].strip() for c in sorted(row, key=lambda c: c['x0']))
            # caption continues on next line (lowercase start)
            for l in lines:
                if 0 < l['top'] - bot < 14 and l['text'][:1].islower() and not re.match(r'^[a-zçğıöşü]{1,4}[\).]\s', l['text']) and len(row) == 1:
                    text += ' ' + l['text'].strip(); bot = l['bottom']
            mine = [im for im in ims if id(im) not in used and im['bottom'] <= top + 4 and im['top'] >= prev_bottom - 4]
            if mine:
                for im in mine: used.add(id(im))
                x0 = min(im['x0'] for im in mine); x1 = max(im['x1'] for im in mine)
                y0 = min(im['top'] for im in mine); y1 = max(im['bottom'] for im in mine)
                # include text labels lying between image bottom and caption (sub-captions)
                fig = {'doc': code, 'pg': pi + 1, 'box': [x0, y0, x1, max(y1, top - 1)], 'cap': text, 'cap_top': top}
                figs.append(fig); last = fig
            elif last and last['doc'] == code and last['pg'] == pi + 1 and top - last['box'][3] < 60:
                # main caption under sub-captions: merge
                last['box'][3] = top - 1
                last['sub'] = last['cap']; last['cap'] = text
            else:
                # vector figure: region between last wide text line above and the caption
                above = [l for l in lines if l['bottom'] <= top - 2 and (l['x1'] - l['x0']) > .55 * (W - 140) and not CAP.match(l['text'].strip())]
                y0 = max([l['bottom'] for l in above] + [prev_bottom, 50]) + 2
                if top - y0 > 40:
                    fig = {'doc': code, 'pg': pi + 1, 'box': [60, y0, W - 60, top - 1], 'cap': text, 'vec': True}
                    figs.append(fig); last = fig
            prev_bottom = bot

# render
SKIP = {('B6', '4.1')}
out = []
for i, fg in enumerate(figs):
    m = CAP.match(fg['cap'])
    num = (m.group(1) + m.group(2)) if m else str(i)
    if (fg['doc'], num) in SKIP: continue
    name = '%s-s%s-p%d-%d.webp' % (fg['doc'].lower(), num.replace('.', '_'), fg['pg'], i)
    f = kaynak(dict(DOCS)[fg['doc']])
    pdf = pdfplumber.open(f)
    p = pdf.pages[fg['pg'] - 1]
    x0, y0, x1, y1 = fg['box']
    x0 = max(0, x0 - 6); y0 = max(0, y0 - 6); x1 = min(p.width, x1 + 6); y1 = min(p.height, y1 - 2)
    img = p.crop((x0, y0, x1, y1)).to_image(resolution=150).original
    img = img.convert('RGB')
    if img.width > 1100:
        img = img.resize((1100, round(img.height * 1100 / img.width)))
    img.save(os.path.join(OUTDIR, name), 'WEBP', quality=78)
    out.append({'doc': fg['doc'], 'pg': fg['pg'], 'n': num, 'cap': re.sub(r'\s+', ' ', fg['cap']).strip(), 'sub': fg.get('sub'), 'f': 'data/fig/' + name, 'w': img.width, 'h': img.height, 'vec': bool(fg.get('vec'))})
    pdf.close()

# attach to sections by page: section whose start page <= fig page (last such) and caption in its text if possible
d = json.load(open(JSON))
for doc in d['docs']:
    for s in doc['secs']:
        s.pop('figs', None)
d['figs'] = []
for fg in out:
    doc = [x for x in d['docs'] if x['id'] == fg['doc']][0]
    best = None
    norm = lambda t: re.sub(r'[^a-zçğıöşü0-9]', '', t.lower())
    m = CAP.match(fg['cap']); body = norm(m.group(3))[:22] if m else ''
    secs = doc['secs']
    cover = [s for k, s in enumerate(secs) if s['pg'] <= fg['pg'] and (k + 1 == len(secs) or secs[k + 1]['pg'] >= fg['pg'])]
    for s in cover:
        if body and any(isinstance(p, str) and body in norm(p) for p in s['p']):
            best = s
    if best is None:
        cands = [s for s in secs if s['pg'] <= fg['pg']]
        best = cands[-1] if cands else secs[0]
    fg['sec'] = best['n']
    best.setdefault('figs', []).append(len(d.setdefault('figs', [])))
    d['figs'].append(fg)
json.dump(d, open(JSON, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'figures', sum(1 for f in out if f['vec']), 'vector', file=sys.stderr)
for f in out:
    print(f['doc'], f['pg'], f['n'], f['sec'], f['w'], 'x', f['h'], 'V' if f['vec'] else '', f['cap'][:70])

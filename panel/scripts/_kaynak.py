import os, glob, re, unicodedata
KAYNAK = os.environ.get('VOLTARIS_KAYNAK', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kaynak'))
def _key(s):
    s = unicodedata.normalize('NFKD', os.path.basename(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', s)
def kaynak(pat, ext='pdf'):
    """kaynak/ klasöründe adı pat'ı içeren dosyayı bulur (Türkçe harf ve boşluk farkı önemsiz). ör. kaynak('bolum2')"""
    want = _key(pat)
    hits = [f for f in glob.glob(os.path.join(KAYNAK, '*.' + ext)) if want in _key(f)]
    if not hits: raise SystemExit(f"kaynak/ içinde '{pat}' içeren .{ext} dosyası yok (VOLTARIS_KAYNAK={KAYNAK})")
    return hits[0]

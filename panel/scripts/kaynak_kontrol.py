import json,re,sys
d=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'dist/data/sartname-2026.json'))
D={x['id']:x for x in d['docs']}
ROM=['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx']
AL='abcçdefgğhıijklmnoöprsştuüvyz'
def marks(spec):
    out=[]
    for part in spec.split(','):
        part=part.strip()
        if '-' in part:
            a,b=part.split('-')
            seq = ROM if a in ROM and b in ROM and not (len(a)==1 and a in 'abcdefgh' and b in 'abcdefgh') else 'abcdefghijklmnopqrstuvwxyz'
            seq=list(seq)
            if a in seq and b in seq: out+=seq[seq.index(a):seq.index(b)+1]
        elif part: out.append(part)
    return out
def resolve(src):
    res=[]
    for tok in re.split(r';\s*|,\s*(?=B\d|Ek)',src):
        tok=tok.strip()
        m=re.match(r'(B[1-7]|TTR şablonu)\s*(.*)',tok)
        if tok.startswith('Ek 1'): res.append(('B2','12.1',[])); continue
        if not m: res.append((None,tok,[])); continue
        doc=m.group(1); rest=m.group(2).strip()
        if doc=='TTR şablonu': doc='B3'
        nums=[s['n'] for s in D[doc]['secs']]
        parts=rest.split('.') if rest else []
        best=None
        for k in range(len(parts),0,-1):
            if '.'.join(parts[:k]) in nums: best=k;break
        if best is None: res.append((doc,rest,'NOSEC')); continue
        res.append((doc,'.'.join(parts[:best]),marks('.'.join(parts[best:]))))
    return res
def para_for(doc,n,mk):
    s=[x for x in D[doc]['secs'] if x['n']==n][0]
    out=[]
    for p in s['p']:
        if not isinstance(p,str): continue
        m=re.match(r'^([a-zçğıöşü]{1,4})[\)\.]\s',p)
        if m and m.group(1) in mk: out.append(p[:150])
    return s['t'],out
if __name__=='__main__':
    src=open('items.js').read()
    for name,txt,s in re.findall(r"\['((?:[^'\\]|\\.)*)','([^']*)','[AR]'",src) and [(a,'',b) for a,b in re.findall(r"\['((?:[^'\\]|\\.)*)','([^']*)','[AR]'",src)]:
        for r in resolve(s):
            if r[2]=='NOSEC' or r[0] is None: print('!!',s,r); continue
            t,ps=para_for(r[0],r[1],r[2]) if r[2] else ([x for x in D[r[0]]['secs'] if x['n']==r[1]][0]['t'],[])
            print(f'[{s}] {name[:60]}\n    -> {r[0]} {r[1]} {t} {r[2]}')
            for p in ps: print('       *',p)
            if r[2] and not ps: print('       !! marker not found')

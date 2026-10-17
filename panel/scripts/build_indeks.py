import openpyxl, csv, json, re, sys, collections
from _kaynak import kaynak
wb=openpyxl.load_workbook(kaynak('VOLTARIS_INDEKS','xlsx'),read_only=True)
SKIP={'OZET','COP','Sponsorluk','Sosyal Medya'}
SENS=re.compile(r'başvuru|basvuru|kimlik|\btc\b|nüfus|nufus|cv\b|özgeçmiş|ozgecmis|telefon|iletişim bilgi|dilekçe|taahhüt|muvafakat|üye listesi|uye listesi|banka|iban|fatura|dekont|sağlık|saglik',re.I)
drive=[]; dropped=collections.Counter()
for ws in wb.worksheets:
    if ws.title in SKIP: continue
    it=ws.iter_rows(values_only=True); next(it)
    for r in it:
        if not r[0]: continue
        n,f,p,k,e,d,g,mb,t,u=[('' if x is None else x) for x in r[:10]]
        u=str(u)
        if not re.match(r'^https://(drive|docs)\.google\.com/',u): dropped['link']+=1; continue
        blob=' '.join(map(str,[n,p,k,e]))
        if SENS.search(blob): dropped['sens']+=1; continue
        p=re.sub(r"^Drive'ım/",'',str(p))
        t=str(t)[:10]
        drive.append([str(n),str(f),p,str(k),str(e),str(d),str(g),round(float(mb or 0),1),t,u,ws.title])
teams=[]
for i,x in enumerate(csv.reader(open(kaynak('Teams_harita','csv'),encoding='utf-8'))):
    if i==0 or len(x)<12 or x[0]=='(kök)': continue
    path,der,nf,nsub,alln,allmb,fmt,feat,old,new,dikkat,dd=x[:12]
    if (nf or '0')=='0' and not feat: continue
    if SENS.search(path+' '+feat): dropped['tsens']+=1; continue
    teams.append([path,int(nf or 0),float(allmb or 0),fmt,feat,new,dd,dikkat])
import os,datetime
VER=os.environ.get('INDEKS_TARIHI', datetime.date.today().isoformat())
out={'ver':VER,'drive':drive,'teams':teams}
json.dump(out,open(sys.argv[1],'w'),ensure_ascii=False,separators=(',',':'))
print(len(drive),'drive rows',len(teams),'teams rows',dict(dropped))
print(collections.Counter(r[10] for r in drive))

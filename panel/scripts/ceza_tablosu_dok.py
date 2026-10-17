import pdfplumber,json,sys,glob
from _kaynak import kaynak
f=kaynak('bolum2')
pdf=pdfplumber.open(f)
rows=[]
for i in range(len(pdf.pages)-14,len(pdf.pages)):
    p=pdf.pages[i]
    for t in p.extract_tables():
        for r in t:
            rows.append([i+1]+[(c or '').replace('\n',' ').strip() for c in r])
for r in rows: print(r)

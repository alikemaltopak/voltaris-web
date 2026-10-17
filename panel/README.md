# Voltaris Hayalet Araç — Takım Paneli

İYTE Voltaris Elektromobil Takımı'nın TEKNOFEST Elektrikli Araç Yarışı hazırlığını takip ettiği panel.
Araç, 3B modelde "hayalet" (hologram) olarak başlar; şartname maddeleri karşılandıkça parçalar katılaşır.
Ekip üyeleri her kalemde şartnamenin istediği maddeleri tek tek tespit eder, eksikleri takım arşivinde arar,
ölçtüklerini Teknik Tasarım Raporu (TTR) için girer, fotoğraf ekler, birbirleriyle konuşur.

Panel takım sitesinde **voltaris-web.vercel.app/panel/** adresinde yayınlanır; yalnızca üye listesindeki
Google hesapları girebilir. 17 Ekim 2026'da Claude Artifact sürümünden (v17) taşındı: veritabanı, giriş ve
fotoğraflar artık Firebase'de (bölüm 8). Bu dosya projeyi devralacak kişi ya da Claude Code için yazıldı:
önce "Hızlı başlangıç"ı, ilk kurulumda "Kurulum ve yayın"ı oku.

---

## İçindekiler

1. [Hızlı başlangıç](#1-hızlı-başlangıç)
2. [Klasör yapısı](#2-klasör-yapısı)
3. [Temel kavramlar](#3-temel-kavramlar)
4. [Durum hesaplama mantığı](#4-durum-hesaplama-mantığı)
5. [Arayüz: sekmeler ve bileşenler](#5-arayüz-sekmeler-ve-bileşenler)
6. [Statik veri dosyaları](#6-statik-veri-dosyaları)
7. [Ortak kayıt (veritabanı) modeli](#7-ortak-kayıt-veritabanı-modeli)
8. [Firebase katmanı](#8-firebase-katmanı)
9. [Kurulum ve yayın](#9-kurulum-ve-yayın)
10. [Takım arşivi indeksi ve otomatik güncelleme](#10-takım-arşivi-indeksi-ve-otomatik-güncelleme)
11. [Veri üreten scriptler](#11-veri-üreten-scriptler)
12. [Yeni yılın şartnamesine geçiş (2027)](#12-yeni-yılın-şartnamesine-geçiş-2027)
13. [Kurallar, güvenlik ve gizlilik](#13-kurallar-güvenlik-ve-gizlilik)
14. [Bilinen sınırlar ve açık işler](#14-bilinen-sınırlar-ve-açık-işler)

---

## 1. Hızlı başlangıç

Panel sitenin Vite derlemesinin ikinci sayfasıdır; ayrı bir derleme adımı yok.

```bash
npm run dev          # http://localhost:5173/panel/
npm run build        # dist/panel/index.html + dist/assets/panel-*.js
```

- `.env`'de `VITE_FIREBASE_*` değerleri yoksa panel **yerel modda** açılır: her şey çalışır ama kayıtlar
  yalnızca o tarayıcının `localStorage`'ında kalır, sohbet ve fotoğraf kapalıdır, üstte sarı uyarı çıkar.
- Gerçek veriye dokunmadan denemek için Firebase emülatörü:
  ```bash
  npx firebase-tools emulators:start --project demo-voltaris     # auth 9099, firestore 8080, firebase.json'dan
  VITE_FIREBASE_EMULATOR=1 npm run dev
  ```
  Giriş penceresinde "Add new account" ile sahte bir Google hesabı açılır. `voltaris.official@gmail.com`
  adıyla açılan hesap her zaman yöneticidir; üyeleri ve verileri onunla ekle.

---

## 2. Klasör yapısı

```
ev-takim-sitesi/
├── panel/
│   ├── index.html       ← sayfanın tamamı (HTML + CSS + modül script); /*__ITEMS__*/ yer tutucusu içerir
│   ├── items.js         ← kalemler, öncüller (şartname maddeleri), teknik kontrol etiketleri, ceza eşlemesi
│   ├── bak.js           ← her kalem için atölye rehberi ve "yapılacak iş" tanımları (Database aramaları)
│   ├── rapor.js         ← TTR tablo alanları, metin bölümleri, "araç bitince" maddeleri, kaynak türleri
│   ├── firebase.js      ← Firebase katmanı: oturum, panele verilen db/user/assets, indeks, yönetim işlemleri
│   ├── yonetim.js       ← "Üyeler" penceresi (yalnız yöneticiler): üye listesi + bir kerelik veri yükleme
│   ├── README.md        ← bu dosya
│   ├── scripts/         ← şartname / şekil / indeks üreten Python betikleri (bölüm 11)
│   └── kaynak/OKU.md    ← betiklerin girdi dosyaları buraya konur (içerik .gitignore'da)
├── public/panel/data/   ← sartname-2026.json + fig/*.webp (TEKNOFEST'in açık kitapçıklarından; statik)
├── public/models/voltaris-arac.glb   ← /arac sayfasıyla ortak 3B model
├── firestore.rules      ← erişim kuralları (bölüm 9)
├── firebase.json        ← kuralların yolu ve emülatör ayarı
└── vite.config.ts       ← panel ikinci giriş noktası; items/bak/rapor.js'yi yer tutucuya yapıştırır
```

`items.js`, `bak.js`, `rapor.js` modül değildir: içlerindeki `const`'lar sayfanın modül script'inde kullanılır,
`vite.config.ts` bunları `/*__ITEMS__*/` yerine yapıştırır. Biçimlerini koru (bölüm 6).

**Depoda olmayanlar (gizli):** Claude'daki kayıtların dökümü (`data-export/*.json`) ve takım arşivi indeksi
(`indeks.json`). Site deposu herkese açık; ikisi de `.gitignore`'da ve Firestore'a paneldeki yönetici
ekranından yüklenir (bölüm 9, adım 7).

---

## 3. Temel kavramlar

| Kavram | Anlamı | Nerede |
|---|---|---|
| **Kalem** (item) | Aracın bir alt sistemi ya da teslim edilecek bir iş: Şasi, Roll Cage, Fren, Motor, BMS, TTR, Videolar… 21 tane. | `items.js` → `ITEMS` |
| **Öncül** (req) | Bir kalemin karşılaması gereken tek bir şartname maddesi. Örn. "Sürücü içindeyken yerden yükseklik ≥ 10 cm (B2 8.1.f)". | `ITEMS[].reqs` |
| **Tür A / R** | A = araçta karşılanır (teknik kontrol ve videolarda bakılır). R = raporda sunulur (TTR). Sorular ve aşamalar türe göre değişir. | `reqs[i][2]` |
| **Durum tespiti** | Her öncülün içindeki soru akışı: karşılanıyor mu → ölçüldü mü / ne yapılacak → arşivde var mı → aşama. | `reqFlowHtml()` |
| **Araç bitince** | Ancak araç tamamlanınca doğrulanabilecek maddeler (ör. ağırlık ≤ 350 kg). Bunlar kalemi "eksik" göstermez. | `rapor.js` → `REQ_SON` |
| **Bağımlılık** (deps) | Bir kalem başlamadan önce bitmesi gereken kalemler (ör. Roll Cage → Şasi). Bitmemişse kalem "kilitli" görünür. | `ITEMS[].deps` |
| **Birim** | M = Mekanik, E = Elektrik-Elektronik, O = Organizasyon ve Sosyal Medya. Liste filtresi ve sohbet kanalları buna göre. | `BIRIM`, `CHANNELS` |
| **Teknik kontrol etiketi** | 2026 yarış haftası plakasındaki 11 başlık (5/4/2 dizilim). Bağlı kalemlerin hepsi bitince kare dolar; 11'i dolunca yeşil "teknik kontrol başarılı" bandı yanar. | `ETIKETLER`, `PLATE_ROWS`, `ITEMS[].ets` |
| **Hayalet → gerçek** | 3B modelde her mesh adı bir kaleme bağlıdır (`ITEMS[].parts`). Kalem ilerledikçe hologramdan katı malzemeye geçer. | `addUnit()`, `syncScene()` |
| **Kaynak gösterimi** | `"B2 9.2.k"` = Bölüm 2, madde 9.2, (k) bendi. `"Ek 1"` = Bölüm 2 Ek 1 Ceza Listesi. `"LIS"` = Sürücüler için Lisans İşlemleri. Birden çok kaynak `;` ile ayrılır, bentler `,` ve `-` ile (ör. `B2 8.1.d-e`). | `parseSrc()` |

### Öncül kaydı (items.js)

```js
{ id:'sasi', name:'Şasi', birim:'M', ets:['mekanik'], parts:['Sasi'], deps:[], q:['şasi','sasi','chassis'], reqs:[
  ['Sürücü içindeyken yerden yükseklik ≥ 10 cm', 'B2 8.1.f', 'A', 'Sürücü koltuktayken önden, arkadan… metreyle ölç…'],
  //  madde metni (kısa)                         kaynak      tür  "Ne yapılacak" açıklaması
]}
```

`q` = arşiv/Drive araması için kalemin genel anahtar kelimeleri.

### Öncül içindeki durum tespiti akışı

```
1. Araçta karşılanıyor mu?   [Evet] [Kısmen] [Hayır] [Araç bitince]        (R türünde: "Raporda hazır mı?")
   ├─ Evet → 2. Ölçüldü ya da denendi mi?  [Evet] [Hayır]                 (R: "Kontrol edildi mi?")
   │        Evet + ölçüldü  ⇒ öncül UYGUN
   ├─ Araç bitince ⇒ öncül kalemi bekletmez (saat simgesi)
   └─ Kısmen / Hayır →
        2. Ne yapacaksınız?  (serbest metin, sorguya ve arşiv aramasına eklenir)
           "Database'e sor" kutusu:
             • aranacaklar listesi (bak.js'ten, bu öncülle ilgili işlerin "ara" maddeleri)
             • Takım arşivinde bulunanlar  (indeks.json'da otomatik arama + kendi kelimeyle arama + "Ekle")
             • Teams'te olabilecek klasörler
             • "Database sorgusunu kopyala"  (Claude'daki Voltaris Database projesine yapıştırmak için hazır metin)
             • Drive'da ara  (yalnızca Drive bağlantısı olan kullanıcıda)
        3. Database'de önceki çalışma bulundu mu?  [Var] [Yok]  + bulunan dosyalar listesi (ad + link, elle de eklenir)
        4. Şu an hangi aşamada?  [Tasarım] [Üretim] [Test] [Uygun]        (R: Taslak / Yazım / Kontrol / Uygun)
           Uygun ⇒ öncül UYGUN
   Her durumda: not alanı + bu öncüle özel fotoğraflar
```

---

## 4. Durum hesaplama mantığı

Kalemin durumu **elle seçilmez**; tamamen öncüllerinden hesaplanır (`panel/index.html` → "state" bölümü).

```js
// öncülün saklanan durumu: checks/<kalem>.s[i]  → 0 bakılmadı, 1 eksik, 2 uygun
deriveS(f) = (f.v==='evet' && f.olc===true) || f.asama==='uygun' ? 2 : (f.v ? 1 : 0)

deferred(it,i)  = f.v==='sonra'  ||  (hiç cevaplanmamış && REQ_SON[it.id] içinde i)
reqOk(it,i)     = s===2 || deferred(it,i)

// öncül ilerlemesi (0..1)
reqProg = reqOk ? 1
        : !f.v ? (s===1 ? .1 : 0)
        : f.v==='evet' ? (f.olc===false ? .5 : .85)
        : { tasarim:.35, uretim:.6, test:.8 }[f.asama] ?? (f.db ? .2 : .1)

progress(it) = ortalama(reqProg)
phaseOf(it)  = hepsi reqOk → 'hazir'; p=0 → 'tespit'; <.2 'arastirma'; <.45 'tasarim'; <.7 'uretim'; aksi 'test'
isDone(it)   = bütün öncüller reqOk
stateOf(it)  = isDone → 'done' | progress>0 → 'part' | bağımlılıklar bitmiş → 'holo' | aksi → 'lock'
```

3B görünüm `stateOf` ve `progress` ile sürülür: `done` tam katı turuncu, `part` kısmen katı (opaklık `.12+.55·p`),
`holo` camgöbeği hologram, `lock` soluk mavi-gri. Etiket karesi: bağlı kalemlerin hepsi `done` ise dolu, biri bile başlamışsa yarı dolu.
Kalem bitince ya da bir kalemin kilidi açılınca `announce()` kısa bir bildirim gösterir ve 3B'de o parça parlar.

"Sıradaki öncül" kutusu `nextReq()` (ilk `reqOk` olmayan öncül) ve `reqNextQ()` (o öncülde sorulacak sıradaki soru) ile üretilir.

---

## 5. Arayüz: sekmeler ve bileşenler

Üst çubuk: araç geneli hazırlık yüzdesi, **Birimim** seçimi (`members/<uid>` ve localStorage'a yazılır), **Sohbet** düğmesi, kullanıcı adı.
İlk açılışta 3 adımlık başlangıç kutusu (kapatılınca `vh-guide` ile hatırlanır).

| Sekme | İçerik | Ana fonksiyonlar |
|---|---|---|
| **Araç** | Solda 3B model (döndür, ön/yan/arka/üst görünüm, röntgen = kabuğu gizle; parçaya dokununca kalem açılır). Sağda kalem listesi (birim filtresi) ve **kalem kartı**. | `renderList`, `renderCard`, 3D bölümü |
| **Teknik kontrol** | 2026 plakası: 11 kare + yeşil bant. Kareye dokununca o başlığın şartname kaynakları ve bağlı kalemler. | `renderPlate` |
| **Şartname** | 8 kitapçığın tam metni (bölüm listesi, arama, bent vurgulama), Ek 1 ceza listesi (kalem eşlemesiyle), şekil galerisi, özet kartları (her kalem için hangi maddeler, "araç bitince bakılacaklar"). Yıl seçici `SART_VERS`. | `renderSart`, `renderSec`, `renderSearch`, `renderCeza`, `renderGal`, `renderOzet`, `openSart` |
| **Takvim** | 2026-27 sezon planı: aşamalar (`LEVELS`), birim hatları ve çubuklar (`LANES`), resmi tarihler (`MILES`). Çubuğa dokununca açıklama ve bağlı kalemlerin hazırlığı. | `renderLevels`, `renderTimeline` |
| **Birimler** | Birim başına ilerleme, kim neyi üstlendi, son hareketler akışı (`log`). | `renderUnits`, `renderFeed` |
| **Rapor** | TTR verileri: şablondaki tablolar (Tablo 1–9), her değerin kaynağı / gireni / doğrulayanı, "Boş" ve "Doğrulanmamış" filtreleri, tabloyu Word/Docs'a yapıştırılacak TSV olarak kopyalama, metin bölümü notları, raporda anlatılacak R-türü öncüller. | `renderRapor`, `tableTSV` |

### Kalem kartı (yukarıdan aşağı)

1. Başlık: aşama etiketi, birim, sorumlu, **Üstlen**, **Sohbette sor**, ilerleme çubuğu.
2. "Bu kalem nedir, atölyede neye bakılır" — `bak.js`'teki atölye rehberi; adımların yanında ilgili madde numarası çipi (`ADIM_M`), dokununca o öncül açılır.
3. **Sıradaki öncül** kutusu.
4. **Öncüller (şartname maddeleri)** listesi; her biri açılınca durum tespiti akışı + "Ne yapılacak" + şartnamenin asıl metni + öncül fotoğrafları. Altında kalemin ceza listesi satırları.
5. **Test kaydı ve fotoğraflar** (kalem seviyesinde test notu + test fotoğrafları).
6. **Rapor için veriler** — o kalemin TTR alanları (bölüm 7.3).
7. **Şartnamedeki görseller** — kalemin kaynaklarına ait şekiller.
8. **Not**.
9. **Kaleme eklenen görseller** — öncüllere ve test kaydına eklenen bütün fotoğrafların galerisi.

Tıklanabilir yazılar link mavisidir (`--link`), çerçeveli düğmeler normal düğmedir.

### Tasarım dili
Açık tema varsayılan, karanlık tema `prefers-color-scheme` ile; renkler `:root` değişkenleri. IBM Plex Sans/Mono (Google Fonts).
Turuncu (`--real`) = gerçek/bitmiş, slate (`--holo`) = hayalet. 3B sahne her temada koyu. Mobilde tek sütun.

---

## 6. Statik veri dosyaları

### `bak.js` — atölye rehberi
```js
BAK.sasi = {
  ne: 'Bu ne? …', nerede: 'Araçta nerede …', adim: ['Atölyede adım 1 …', …], alet: 'Metre, …',
  isler: [ { n:'Mevcut şasiyi revize edeceğiz', ara:['Şasinin son hali CAD modeli', …], q:['şasi','chassis','profil'], m:[0,3,5] } ]
}
ADIM_M.sasi = [[0],[0],[0],[3],[5]]   // atölye adımı → ilgili öncül indeksleri
```
`isler[].m` = bu işin ilgili olduğu öncüller. Bir öncülün "Database'e sor" kutusu `jobsFor(it,i)` ile bu işleri bulur;
`ara` aranacaklar listesini, `q` arşiv aramasının ağırlıklı anahtar kelimelerini verir.

### `rapor.js` — TTR alanları
- `RAPOR_TABLES`: `{id, n:'Tablo 3. Motor özellikleri', src:'TTR 3', rows:[[etiket, birim, kalemId, alanAnahtarı, {son?, opts?}]]}`.
  Tablo numaraları 2026 TTR şablonuyla birebir. "Mekanik ölçüler" şablonda tablo değil, 11. bölüm ve teknik kontrol için eklendi.
  Takım üye tablosu kişisel veri içerdiği için bilinçli olarak yok (KYS'den doldurulur). Tablo 10 EYS yalnız hidromobil olduğundan yok.
- `RAPOR_SECTIONS`: `[bölümNo, başlık, kalemId]` — metinle doldurulacak bölümler; kalem kartında not/taslak kutusu olur (anahtar `sec_<no>`).
- `REQ_SON`: `{kalemId:[öncül indeksleri]}` — "araç bitince" maddeleri.
- `KAYNAK`: `['Ölçüldü','Datasheet','Hesap / analiz','Tahmin']`.

### `sartname-2026.json`
```json
{ "yil": 2026,
  "docs": [ { "id":"B2", "title":"Bölüm 2 · Teknik Kurallar", "ver":"…", "pages":…, "file":"…pdf",
              "secs":[ { "n":"9.2", "t":"Başlık", "pg":31, "p":[ "a) paragraf…", {"tab":[[…]]} ], "figs":[3,4] } ] } ],
  "ceza": [ { "g":"grup", "b":"başlık", "i":"ihlal", "em":"elektromobil cezası", "hm":"hidromobil cezası" } ],
  "figs": [ { "doc":"B2","pg":33,"n":"18.a","cap":"Şekil 18.a …","f":"data/fig/b2-s18_a-p33-12.webp","w":…,"h":…,"sec":"9.8","i":… } ] }
```
Kitapçıklar: B1 İdari ve Mali, B2 Teknik Kurallar, B3 Teknik Tasarım Kuralları, B4 Görsel Tasarım, B5 Teknik Kontrol ve Final, B6 Rapor Yazım, B7 Yarış Haftası, LIS Lisans.
Alıntı mantığı: `parseSrc("B2 9.2.c,f; Ek 1")` → kaynak listesi; `citeIdx(sec, marks)` bent harflerini paragraf indekslerine çevirir; `quoteHtml` asıl metni vurgulu gösterir.
`items.js`'teki bir kaynak json'da bulunamazsa panel o çipi kırmızı gösterir.

### `indeks.json` — takım arşivi
```json
{ "ver":"2026-09-17",
  "drive":[ [ad, format, klasör_yolu, konu, etiketler, durum, güven, mb, tarih, drive_link, komite] ],
  "teams":[ [teams_klasör_yolu, dosya_sayısı, alt_dahil_mb, format_dağılımı, öne_çıkan_dosyalar, en_yeni, drive_durumu, dikkat] ] }
```
Ayrıntı ve güncelleme planı bölüm 10'da.

---

## 7. Ortak kayıt (veritabanı) modeli

Firestore (koleksiyon/belge, `onSnapshot`). Panelin `update`'i iç içe nesneleri birleştirir, dizileri üzerine yazar (bölüm 8).
Kullanıcı kimlikleri Firebase uid'leridir (Claude'dan aktarılıp eşlenmeyenler `u_…`).

| Yol | Belge şekli | Yazan |
|---|---|---|
| `items/<kalemId>` | `{ owner:uid?, testNot, testFoto:[assetId], not, by, at }` + eski sürümden kalan alanlar (`v, cal, test, asama, karar, is, tas, dok, har` — artık durum hesabında kullanılmıyor) | `patchItem()` |
| `checks/<kalemId>` | `{ s:{ "<i>":0\|1\|2 }, f:{ "<i>":{ v:'evet'\|'kismen'\|'hayir'\|'sonra', olc:bool, is:metin, db:'var'\|'yok', found:[{t,u}], asama:'tasarim'\|'uretim'\|'test'\|'uygun', not, foto:[assetId] } }, by, at }` | `setFlow()` |
| `rapor/<kalemId>` | `{ f:{ "<alan>":{ v, by, at, src, ok:{by,at}\|null, h:[{v,by,at}] } }, by, at }` (eski biçim: `v:{alan:"değer"}` — okunur) | `setRapor()` |
| `log/<auto>` | `{ by, at, item, text }` — son hareketler akışı | `logIt()` |
| `chat/<kanal>/m/<auto>` | `{ text≤1000, by, at, item? }` — kanallar: `genel, M, E, O` | sohbet formu |
| `members/<uid>` | `{ ad, foto, email, giris, birim:'M'\|'E'\|'O', at }` — diğer üyelerin gördüğü ad ve fotoğraf | girişte `oturumuIzle()`, birim seçimi |
| `fotolar/<id>` | `{ veri: bayt (JPEG ≤ 900 KB), tur, by, at }`. Fotoğraflar 1600 px JPEG'e küçültülür; kalem belgelerinde yalnız id saklanır | `uploadPhotos()` → `assets.upload()` |
| `uyeler/<e-posta>` | `{ ad, birim, rol:'uye'\|'yonetici', aktif, at }` — belge kimliği küçük harfli Google e-postası; panele kimin girebileceğini belirler | `yonetim.js` |
| `indeks/meta`, `indeks/p<n>` | `{ ver, parca, at }` ve `{ json: metin parçası }` — takım arşivi indeksi (bölüm 10) | `indeksYaz()` |

Erişim kuralları `firestore.rules`'ta: yalnız aktif üyeler okur ve yazar; `members` herkes yalnız kendi belgesini,
`log` ve `chat` yalnız kendi adına ekler (`by` = kendi uid'i), `uyeler` ve `indeks`'i yöneticiler yazar.

### Doğrulama (TTR verisi)
Bir değer girildiğinde giren kişi ve zaman kaydedilir, kaynak türü seçilir. Başka bir üye "Doğrula"ya basar (giren kendi değerini doğrulayamaz).
Değer değişince `ok` sıfırlanır, eski değer `h` dizisine (son 5) geçer. Rapor sekmesi tabloları Kaynak / Giren / Doğrulayan sütunlarıyla gösterir.

### Mevcut veri
`data-export/` (depoda değil) 17.10.2026 itibarıyla Claude'daki ortak kaydın tam dökümüdür: 8 `items`, 6 `checks`, 257 `log`, 1 `members`; `rapor` ve `chat` boş.
Belgelerdeki `by/owner` kimlikleri Claude'a özeldir (`u_…`, iki kişi). Yönetici ekranındaki aktarım bunları panele girmiş üyelerle
eşlemeyi sorar; eşlenmeyenler "Bir ekip üyesi" olarak görünür.
Fotoğraf asset'leri dökümde yoktur (şu ana kadar yüklenen fotoğraf yok).

---

## 8. Firebase katmanı

Panel Claude Artifact için yazılmıştı ve yeteneklerini `window.claude.use('db' | 'user' | 'assets')` ile alıyordu.
`firebase.js` panele **aynı biçimde** nesneler verir; panelin durum mantığı ve veri şekilleri değişmedi.

| Claude'da | Sitede (`firebase.js`) | Not |
|---|---|---|
| `db` (paylaşılan belge veritabanı) | Firestore | `update` = `setDoc(..., {merge:true})`: iç içe nesneleri birleştirir, dizileri değiştirir, belge yoksa oluşturur (Claude'daki davranış). `writeDoc()` bu yüzden set/update ayrımı yapmıyor. Yetki hatası `permission-denied` → panelin beklediği `invalid_argument`. |
| `user` (`me`, `can`, `profiles`) | Firebase Auth (Google) + `uyeler` + `members` | Giriş kapısını yalnız üyeler geçtiği için `can()` her zaman `true`. Ad önce `uyeler`'deki addan, yoksa Google adından gelir; `members/<uid>`'e yazılır, `profiles()` oradan okur. |
| `assets` (`upload`, `/_blob/<id>`, `delete`) | Firestore `fotolar/<id>` | Firebase Storage yeni projelerde ücretli Blaze planı istiyor; küçültülmüş JPEG bir Firestore belgesine sığıyor. Görüntü `blobSrc(id)` ile önce boş, gelince gerçek. 900 KB'ı aşan fotoğraf otomatik küçültülür. |
| `mcp` (görüntüleyenin Drive'ında arama) | kaldırıldı | Takım arşivi indeksi araması aynı işi görüyor. |
| `hot` (yeniden yayında sekmeyi koruma) | kaldırıldı | Sekme zaten `localStorage`'da (`vh-tab`). |
| `models/voltaris-arac.gltf.json` (base64 gömülü) | `/models/voltaris-arac.glb` | Artifact `data:` URL'lerini engellediği için gerekiyordu; site doğrudan GLB yüklüyor. |
| `fetch('data/indeks.json')` | `indeksOku()` | Statik dosya herkese açık olurdu; artık Firestore'dan, yalnız üyelere. |

Giriş kapısı (`kapi()`, `index.html` sonu): oturum yoksa "Google ile giriş yap"; giren hesap `uyeler`'de yoksa ya da
pasifse "üye listesinde yok" ve "Başka hesapla gir"; üyeyse panel açılır. Uygulama içi tarayıcılarda (Instagram,
WhatsApp) açılır pencere engellenirse yönlendirmeli girişe düşer. Başka sekmede çıkış yapılırsa sayfa yenilenir.

---

## 9. Kurulum ve yayın

İlk kurulum bir kez yapılır. Ücretsiz Spark planı yeterli (Storage kullanılmıyor). Proje, devredilebilir olması için
`voltaris.official@gmail.com` hesabıyla açılmalı; bu hesap kurallarda ve `firebase.js`'te (`KURUCU`) her zaman yöneticidir.

1. **Proje.** console.firebase.google.com → Proje ekle (Google Analytics gerekmez).
2. **Giriş.** Authentication → Sign-in method → **Google**'ı etkinleştir. Authentication → Settings → Authorized domains'e
   `voltaris-web.vercel.app` ekle (localhost hazır gelir; özel alan adı alınırsa o da eklenir).
3. **Veritabanı.** Firestore Database → Create database → production mode, konum `eur3 (europe-west)`.
4. **Kurallar.** `firestore.rules`'un içeriğini Firestore → Rules'a yapıştırıp Publish et ya da
   `npx firebase-tools deploy --only firestore:rules --project <proje-id>`. Kural değişince bu adım tekrarlanır.
5. **Ayarlar.** Proje ayarları → Your apps → Web (`</>`) → uygulama ekle → `firebaseConfig`'teki `apiKey`, `authDomain`,
   `projectId`, `appId` değerlerini `.env`'e (`.env.example`'daki adlarla) **ve** Vercel → Settings → Environment Variables'a
   gir. Vercel'de yeniden deploy et. Bu değerler gizli değildir (derlemeye gömülür); veriyi kurallar korur.
6. **Üyeler.** `/panel/`'e `voltaris.official` ile gir → **Üyeler** → her üyenin Google e-postası, adı, birimi.
   Başka yönetici gerekiyorsa rolünü "Yönetici" yap. Ayrılan üyeyi "Aktif"ten çıkar ya da sil; girdiği kayıtlar kalır.
7. **Veriler (bir kez).** Üyeler → "Bir kerelik veri yükleme": `indeks.json`'ı ve `data-export` klasöründeki altı `.json`'ı seç.
   Eski kayıtları aktarmadan önce o kişilerin panele bir kez girmiş olması, adlarının eşlenebilmesini sağlar.

**Denendi (emülatörde, 17.10.2026):** kurallar 38 durumda (giriş yok, üye değil, doğrulanmamış e-posta, pasif üye,
üye, yönetici, kurucu; başkası adına log/mesaj, 1 MB üstü fotoğraf, 400 belgelik aktarım); tarayıcıda uçtan uca 21 adım
(üye olmayanın reddi, üye ekleme, indeks ve eski kayıt aktarımı, öncül cevaplama, indeks araması, fotoğraf yükleme,
sohbet, ikinci üyenin canlı görmesi, 390 px'te yatay kaydırma olmaması, çıkış).
Gerçek Firebase projesinde ilk girişte yine kontrol et: Google ile giriş, Authorized domains, kuralların yayında olması.

---

## 10. Takım arşivi indeksi ve otomatik güncelleme

### Bugünkü durum
- **Drive indeksi**: Drive'daki `VOLTARIS_INDEKS.xlsx` (17.09.2026). Komite sayfaları (AKS, Gömülü Yazılım, Batarya ve BYS, Şasi ve Roll Cage, Fren ve Direksiyon, Powertrain ve Kabuk, Ar-Ge ve Doküman, Sponsorluk, Sosyal Medya, Elle Bakılacak) ve COP (indekse girmeyen 9.476 dosya: veri seti etiketleri, satıcı dokümanları, kütüphane artıkları…).
  Sütunlar: `dosya_adi, format, klasor_yolu, konu, etiketler, durum (kullanışlı/arşiv/elle bakılacak), guven (yüksek/orta/düşük), mb, tarih, drive_link`.
- **Teams haritası**: Teams'teki "Teknofest Efficiency" kanalının klasör düzeyi haritası (478 klasör, ~38.800 dosya). Sütunlar: `teams_klasor_yolu, derinlik, dosya_sayisi, alt_klasor_sayisi, alt_dahil_dosya, alt_dahil_mb, format_dagilimi, one_cikan_dosyalar, en_eski, en_yeni, dikkat, drive_durumu`. `drive_durumu` klasörün Drive'a taşınıp taşınmadığını söyler (40 klasör "YOK").
- `build_indeks.py` bunları `indeks.json`'a çevirir: Sponsorluk, Sosyal Medya, COP ve kişisel veri izi taşıyan satırlar (başvuru, kimlik, dilekçe, taahhüt, fatura, sağlık… desenleri) **çıkarılır**. Sonuç: 646 Drive satırı + 351 Teams klasörü (~300 KB).
- Aynı harita Claude'daki **Voltaris Database** projesinde de kullanılıyor (dosyaları tek tek aramak yerine indekse bakar).

### Panelde arama (`ixSearch`)
- Metin normalizasyonu: Türkçe küçük harf + aksan kaldırma (`nrm`).
- Terimler: kendi yazdığı kelime varsa yalnız o; yoksa öncülün işlerinin `q` kelimeleri (ağırlık 3), kalemin `q`'su (2.5), "ne yapacaksınız" metni (1.5), `ara` maddeleri (1), öncül metni (0.8). Yaygın kelimeler (`STOP`) atılır.
- Puan: ad eşleşmesi ×3, etiket ×2, klasör yolu ×1.5, konu ×1; kalemin komitesi (`KOMITE` eşlemesi) +2.5, `kullanışlı` +1, düşük güven −0.5. Eşik 6 (kendi aramada 2).
- Aynı klasörden en fazla 2 sonuç, toplam 8. Teams klasörleri ayrı puanlanır, en fazla 4.

### Otomatik güncelleme tasarımı (henüz kurulmadı)
- **Google Apps Script**, `voltaris.official` hesabında, zamanlayıcıyla:
  - **Saatte bir artımlı**: Drive Changes API (`startPageToken` script özelliklerinde saklanır) ile yalnız eklenen/taşınan/silinen dosyalar.
  - **Haftada bir tam tarama** (pazar gecesi): Drive API ile toplu listeleme, klasör ağacı bellekte kurulur (Gmail hesaplarında tek çalışma 6 dk sınırı var; dosya sayısı önemli, boyut değil).
- **Sınıflandırma** mevcut indeksin kurallarıyla: klasör yolu → komite; klasör adları + dosya adı → etiketler; format → konu kalıbı ("X klasöründe CAD modeli"); veri seti/kütüphane desenleri → COP; emin olunamayan → "Elle bakılacak". Yeni dosyalar `durum: yeni, guven: düşük` girer. İsteğe bağlı: yalnız yeni dosyalar için Claude API ile kısa konu cümlesi (ücretli, API anahtarı gerekir).
- **Yazılacak yerler**: (1) `VOLTARIS_INDEKS` Google E-Tablosu (xlsx önce E-Tablo'ya dönüştürülmeli), (2) Firestore `indeks` koleksiyonu, panelin okuduğu biçimde: `indeks.json`'ın tamamı `JSON.stringify` edilip 300.000 karakterlik parçalar hâlinde `indeks/p0`, `indeks/p1`… belgelerine (`{json}`), sonra `indeks/meta`'ya `{ver, parca, at}` (Firestore iç içe dizi saklayamadığı için metin). Eski parçalar silinir. Bugün bunu yönetici ekranı elle yapıyor (`indeksYaz()`); arama tarayıcıda yapılır.
- **Teams** otomatik güncellenemez (İYTE hesabı üçüncü taraf uygulamalara yönetici onayı istiyor); klasörler Drive'a taşındıkça Drive indeksine girer.
- Firestore'a yazmak için servis hesabı anahtarı yalnız Apps Script "Script Properties"'te durmalı.

---

## 11. Veri üreten scriptler

Python 3.10+, `pip install pdfplumber openpyxl pillow`.
Komutlar depo kökünden çalıştırılır. Girdi dosyaları `panel/kaynak/` klasörüne konur (ya da `VOLTARIS_KAYNAK=/yol` ortam değişkeni). Dosya adında Türkçe harf/boşluk farkı önemsizdir; adında `Bölüm_1` … `Bölüm_7`, `Lisans`, `VOLTARIS_INDEKS`, `Teams_harita` geçmesi yeterli.

```bash
python3 panel/scripts/build_sart.py public/panel/data/sartname-2026.json                         # metin + ceza listesi
python3 panel/scripts/build_fig.py  public/panel/data/fig public/panel/data/sartname-2026.json     # şekiller (json'u günceller)
INDEKS_TARIHI=2026-09-17 python3 panel/scripts/build_indeks.py panel/kaynak/indeks.json            # arşiv indeksi (gizli!)
```
`indeks.json`'ı asla `public/`'e yazma: oradaki her şey herkese açık yayınlanır. Üretilen indeksi panelde Üyeler →
"Bir kerelik veri yükleme"den Firestore'a yükle. Depodaki `sartname-2026.json`, `fig/` ve indeksin bu scriptlerle
birebir yeniden üretildiği Claude sürümünde doğrulanmıştı.
`build_fig.py` B1, B2, B3, B6'dan şekil çıkarır; şekli bölüme sayfa aralığı + başlık metni eşleşmesiyle atar (B2 aynı şekil numaralarını tekrar kullandığı için).

---

## 12. Yeni yılın şartnamesine geçiş (2027)

1. 2027 PDF'lerini `panel/kaynak/`'a koy, `build_sart.py` ve `build_fig.py`'yi `public/panel/data/sartname-2027.json` ve yeni şekil klasörü için çalıştır (`build_fig.py` içindeki dosya adı kalıbı ve `SKIP` listesini kontrol et).
2. `panel/index.html` → `SART_VERS` dizisine `{ yil:2027, url:'data/sartname-2027.json', n:'2027 · yürürlükte' }` ekle (ilk sıraya).
3. Şartname sekmesinde kırmızı görünen kaynak çiplerini (`items.js`'teki madde numarası yeni metinde yok) tek tek güncelle. `kaynak_kontrol.py` yardımcı olur.
4. Teknik kontrol plakası değiştiyse `ETIKETLER` ve `PLATE_ROWS`'u güncelle; TTR şablonu değiştiyse `RAPOR_TABLES` ve `RAPOR_SECTIONS`'ı.
5. `MILES` ve `LANES` (takvim) yeni resmi tarihlerle güncellenir.

---

## 13. Kurallar, güvenlik ve gizlilik

- **Yapay zekâ yasağı (rapor içeriği):** Bölüm 6 madde 2.1.b "Rapor içeriğinde AI/GPT kullanımı yasaktır." Bölüm 1 madde 2.3.r: tespit edilirse rapor değerlendirme dışı, takım diskalifiye. Paneldeki metin bölümü kutularına yapay zekâ ile üretilmiş metin yapıştırılmamalı; panel takip aracıdır, rapor metnini takım kendisi yazar. Aynı yerde: benzerlik ≤ %20 (2.1.a), kopyala-yapıştır alıntı toplamı ≤ 1 sayfa (2.1.c), başka kaynaktan şekil ≤ %5 ve atıflı (2.1.e).
- **Kişisel veri:** Drive'da başvuru formları, kimlik bilgisi içeren belgeler var. Bunlar indekse ve panele girmemeli (`build_indeks.py`'deki `SENS` deseni + Sponsorluk/Sosyal Medya hariç). Takım üye tablosu panelde yok.
- **Gizli tutulacak dosyalar:** `data-export/`, `indeks.json`, `panel/kaynak/` içindeki indeks dosyaları. Site deposu herkese açık; bunlar `.gitignore`'da ve **depoya girmemeli**. İndeks Firestore'dan yalnız giriş yapmış üyelere sunulur.
- **Kullanıcı girdisi:** her şey `esc()` ile kaçışlanır; linkler `safeUrl()` ile yalnız http/https; asset id'leri `/^[A-Za-z0-9_-]{16,64}$/` ile doğrulanır. Taşırken bu korumaları koru.

---

## 14. Bilinen sınırlar ve açık işler

- İndeks otomatik güncellemesi (bölüm 10) tasarlandı, kurulmadı.
- "Database sorgusunu kopyala" Claude'daki Voltaris Database projesine yapıştırılmak üzere; sitede bu adım bir "Database sorumlusuna gönder" akışına dönüştürülebilir.
- Takvimde akademik takvim (sınav haftaları) yer tutucu.
- Maliyet tablosu ve takım üye tablosu bilinçli olarak yok.
- Etiket ↔ kalem eşlemesi şartnamede birebir yazmıyor; takımın yorumudur (`ITEMS[].ets`).
- Drive araması (`driveSearch`) taşımada kaldırıldı; gerekirse Google girişine `drive.readonly` izni eklenerek Drive API ile yeniden yazılabilir.
- Fotoğraflar Firestore'da durduğu için ücretsiz kota (1 GiB) yaklaşık 3–4 bin fotoğraf taşır. Aşılırsa Blaze planına geçip `assetsApi()`'yi Firebase Storage'a çevirmek tek dosyalık iş.

### Sürüm notları
v1–v9 temel panel, 3B, birimler, sohbet · v10–v12 şartname metni, şekiller, ceza listesi, 2026 teknik kontrol plakası · v13–v14 her öncülde durum tespiti, "araç bitince" maddeleri, TTR tabloları · v15 TTR verisinde kaynak/giren/doğrulayan · v16 öncül başına fotoğraf, kalem galerisi, link mavisi · v17 takım arşivi indeksiyle arama · **site** (17.10.2026) Claude Artifact'tan takım sitesine taşındı: Firebase girişi, üye listesi, Firestore.

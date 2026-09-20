# Voltaris — İYTE Elektromobil Takımı Web Sitesi

İzmir Yüksek Teknoloji Enstitüsü Voltaris Elektromobil Takımı için 3D animasyonlu, TR/EN
dil desteğine sahip tanıtım sitesi. React + TypeScript + Vite ile yazıldı; ana sayfa
hero'sundaki 3D enerji efekti [ThreeUI](https://github.com/MengTo/threeui) (MIT lisanslı,
bağımlılıksız WebGL bileşeni) temel alınarak uyarlandı — bkz. `THIRD_PARTY_NOTICES.md`.

## Geliştirme

```bash
npm install
npm run dev
```

Prodüksiyon derlemesi:

```bash
npm run build
npm run preview
```

## Proje yapısı

```
src/
  three/           ThreeUI kökenli EnergyOrb + araç eskizi SVG'si (car-sketch.svg)
  lib/             GSAP + ScrollTrigger kurulumu (tek seferlik plugin kaydı)
  context/         Dil (TR/EN) context'i
  i18n/            tr.ts / en.ts çeviri sözlükleri
  components/      Navbar, Footer, kart, modal, ElectricField, CarSketchReveal, Reveal
  pages/           Ana Sayfa, Takım, Araç, Başvurular, Sponsorlar, İletişim
```

## Tasarım dili

Tipografi (Archivo + JetBrains Mono), renk paleti (koyu zemin + elektrik cyan vurgu),
köşesiz/sivri kart ve buton stili, mono çizgi etiketler ("/ 01" numaralandırma, geniş
harf aralıklı üst başlıklar) kullanıcının paylaştığı referans tasarımdan uyarlanmıştır.

## Kaydırma odaklı (scroll-driven) 3D özellikler

Bu özellikler de kullanıcının paylaştığı referans tasarımdan birebir uyarlanmıştır:

- **Elektrik alanı (`ElectricField.tsx`)** — Sitenin tamamında sabit (fixed), her
  sayfanın yüksekliğine göre rastgele dağılmış noktalardan oluşan bir canvas katmanı.
  Fare bir noktaya ~190px'den fazla yaklaşınca nokta parlar ve fareye doğru kırık
  çizgili (fraktal) elektrik arkları atlar.
- **Araç eskizi (`CarSketchReveal.tsx`, Araç sayfası)** — GSAP ScrollTrigger ile
  sabitlenmiş (pinned) bir bölüm; aşağı kaydırdıkça aracın yan profil çizimi
  stroke-dasharray animasyonuyla parça parça çiziliyor, ardından ölçü/etiket
  metinleri beliriyor.
- **Reveal (`Reveal.tsx`) ve `HeroTitle.tsx`** — Başlıkların ve kart gruplarının
  ekrana girerken yukarıdan belirip solma (fade-up) animasyonu; ana sayfa başlığı
  harf harf beliriyor.
- **Lenis (`SmoothScroll.tsx`)** — Sitenin tamamında yumuşak (inertia'lı) kaydırma,
  GSAP ScrollTrigger ile senkronize.

Tüm animasyonlar `prefers-reduced-motion: reduce` tercihine saygı gösterir (o modda
devre dışı kalır / doğrudan son haliyle görünür).

## Başvurular sayfası

`/basvurular` sayfasında tek bir form var: ortak sorular, ortada komite seçimi
(Mekanik / Elektrik / Destek) ve seçilen komitenin kendi soruları.

Gönderilen başvurular bir **Google Apps Script** uç noktasına gidiyor; script
başvuruyu komitesine ait e-tablo sayfasına satır olarak ekliyor, yüklenen CV'yi
Drive'a kaydedip satıra bağlantısını koyuyor. Kurulum ve işleyiş:
[`apps-script/KURULUM.md`](apps-script/KURULUM.md).

Çalışması için iki ortam değişkeni gerekir (`.env.example`'a bak):
`VITE_BASVURU_ENDPOINT` ve `VITE_BASVURU_ANAHTARI`. Tanımlı değilse form doğrulama
yapar ama gönderimde hata mesajı gösterir.

## İçeriği güncelleme

Tüm metinler `src/i18n/tr.ts` ve `src/i18n/en.ts` dosyalarında. Bir metni değiştirmek
için iki dosyada da ilgili anahtarı güncellemeniz yeterli.

Şu an **placeholder** olan ve gerçek verilerle değiştirilmesi gereken yerler:

- **Üye fotoğrafları / isimleri** — Takım sayfası (`src/pages/Team.tsx`)
- **Araç fotoğrafları** — Araç sayfası galeri bölümü (`src/pages/Vehicle.tsx`)
- **3D araç modeli** — Araç sayfası, `PlaceholderBox icon="model"` — `.glb`/`.gltf`
  dosyanızı paylaştığınızda buraya `@react-three/fiber` tabanlı bir görüntüleyici
  ekleyebiliriz
- **Teknik özellikler** — Araç sayfası özellik tablosu (menzil, güç, ağırlık vb.)
- **Sponsor logoları** — Sponsorlar sayfası logo alanı
- **İletişim formu** — Şu an demo amaçlıdır, hiçbir sunucuya veri göndermez; gerçek
  gönderim için bir form servisine bağlanması gerekir (başvuru formu bağlandı,
  iletişim formu bağlanmadı)

## Renk paleti ve tasarım

Koyu tema + elektrik mavisi/yeşili vurgu renkleri `src/index.css` içindeki
`:root` değişkenlerinden (`--accent`, `--accent-2`, `--bg` vb.) özelleştirilebilir.

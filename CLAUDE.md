# CLAUDE.md — yeni oturumda önce bunu oku

Voltaris (İYTE Elektromobil Takımı) tanıtım sitesi. Bu dosya, depoyu baştan
taramadan işe başlayabilmen için yazıldı. Değişiklik yapınca güncel tut.

> `README.md` ve `PROJE_OZETI.md` kısmen eski (ör. artık olmayan
> `CarSketchReveal`'dan söz ediyorlar). Çelişki varsa bu dosya ve kod esas.

## Yığın ve komutlar

- React 19 + TypeScript + Vite, React Router 7, GSAP + ScrollTrigger, Lenis,
  three.js / @react-three/fiber (yalnızca Araç sayfasındaki 3D görüntüleyici).
- Stil kütüphanesi yok: tüm CSS tek dosyada, `src/index.css` (~3.4k satır,
  `/* Bölüm adı */` yorumlarıyla ayrılmış). Renkler `:root` değişkenlerinde,
  açık/koyu tema `ThemeContext` ile.
- `npm run dev` (5173) · `npm run lint` (oxlint) · `npm run build` (`tsc -b && vite build`).
- **Dikkat:** depo iCloud'daki Masaüstü'nde; `node_modules` içindeki binlerce
  dosya buluta indirilmiş olabiliyor (`find node_modules -flags +dataless`).
  O durumda `tsc`/`vite` CPU harcamadan sonsuza dek bekler. Çözüm: kaynakları
  geçici bir klasöre kopyala (`public`'i sembolik bağla), orada `npm ci` +
  `npm run build`. Ya da kullanıcıya `node_modules`'ü yeniden kurmayı öner.
- Yayın: Vercel (`vercel.json` — SPA rewrite, `/frames/*` uzun önbellek).

## Sayfalar (`src/App.tsx`)

| Yol | Dosya | Ne var |
|---|---|---|
| `/` | `pages/Home.tsx` | Kaydırmayla birleşen araç (HeroAssembly), kurum logoları, `Announcements`, hakkımızda, vizyon/misyon, katılım çağrısı (→ `/iletisim`) |
| `/takim` | `pages/Team.tsx` | Departmanlar, üye kartları (placeholder) |
| `/arac` | `pages/Vehicle.tsx` | `CarViewer` (3D model + parça bilgisi), teknik özellikler, zaman çizelgesi, galeri (placeholder) |
| `/sponsorlar` | `pages/Sponsors.tsx` | Kayan sponsor bantları, paket kartları → `SponsorPackageModal` → `/iletisim?paket=<id>` |
| `/iletisim` | `pages/Contact.tsx` | İletişim formu (Apps Script'e gider) |
| `/basvurular` | — | Başvurular Ekim 2026'da kapandı, sayfa kaldırıldı; ana sayfaya yönlenir |
| `/panel/` | `panel/index.html` | **Takım paneli (Hayalet Araç)**, React dışında ayrı bir Vite sayfası; yalnız üye listesindeki Google hesapları girer (Firebase). Ayrıntı: `panel/README.md` |

React sayfalarının her birinde: `Navbar`, `Footer` (altında panele "Üye girişi" bağlantısı), `ElectricField` (tüm sayfanın arkasındaki
canvas), `SmoothScroll` (Lenis), `CustomCursor`.

## Dizinler

- `src/components/` — paylaşılan parçalar. Önemliler:
  - `HeroAssembly.tsx`: ana sayfa hero'su; `public/frames/<klasör>/frame_0001.webp…`
    karelerini kaydırmayla canvas'a çizer. Koyu tema `ev-assembly-v9`, açık tema
    `ev-assembly-light-v1`, 175 kare; ekran boyuna göre `-800`/`-1200` varyantları.
  - `CarViewer.tsx` + `data/vehicleParts.ts` + `three/hologram.ts`: Araç sayfası 3D
    görüntüleyici (`public/models/voltaris-arac.glb`).
  - `Announcements.tsx`: Instagram gönderisi carousel'i + eski duyurular
    (medya: `public/announcements/basvuru-2026/`).
  - `Reveal.tsx` (fade-up / stagger), `SectionHeading`, `PageHero`.
  - Kullanılmayan ama duran: `AssemblyReveal.tsx`, `ChassisViewer.tsx`,
    `three/EnergyOrb.tsx` (+ shader'lar).
- `src/i18n/tr.ts` / `en.ts` — **tüm metinler burada.** `Dictionary = typeof tr`,
  `en.ts` bu tipe uymak zorunda: bir anahtar eklerken/silerken ikisini birlikte
  değiştir, yoksa derleme kırılır. Bileşenlerde `const { t, lang } = useLanguage()`.
- `src/data/` — `sponsors.ts` (sponsor + paket verisi), `social.ts` (Instagram,
  e-posta), `vehicleParts.ts`.
- `src/lib/` — `formEndpoint.ts` (Apps Script'e POST; CORS "simple request"
  kuralları dosyanın başında anlatılıyor, bozma), `gsapSetup.ts` (plugin kaydı,
  `gsap`'ı buradan import et), `lenisInstance.ts`.
- `public/` — kareler, modeller, logolar, sponsor görselleri, duyuru medyası.
- `apps-script/` — `Kod.gs` (Google Apps Script: iletişim formu + eski başvuru
  kodu) ve `KURULUM.md`. Ortam değişkenleri: `VITE_BASVURU_ENDPOINT`,
  `VITE_BASVURU_ANAHTARI` (`.env.example`). İsimleri "başvuru" ama iletişim
  formu da bunları kullanıyor.
- `panel/` — takım paneli: `index.html` (tek dosyada HTML+CSS+script), veri dosyaları
  `items.js`/`bak.js`/`rapor.js` (modül değil; `vite.config.ts` bunları `/*__ITEMS__*/` yerine
  yapıştırır), `firebase.js` (Claude Artifact API'sini taklit eden Firebase katmanı), `yonetim.js`
  (üye listesi). Durum mantığına ve veri şekillerine dokunma; önce `panel/README.md`'yi oku.
  Statik verisi `public/panel/data/`. `firestore.rules` + `firebase.json` kökte; kural değişince
  Firebase'e yeniden yayınlanmalı. Ortam değişkenleri `VITE_FIREBASE_*` (`.env.example`).
  **Gizli:** takım arşivi indeksi (`indeks.json`) ve Claude dökümü (`data-export/`) depoya ve
  `public/`'e girmez (depo herkese açık); Firestore'a paneldeki yönetici ekranından yüklenir.
- `cad-assets/` — CAD → Blender → kare/GLB üretim betikleri (Python). Sitenin
  çalışma zamanının parçası değil; Vercel'e gitmez (`.vercelignore`).

## Kurallar ve alışkanlıklar

- Yanıtlar Türkçe; kod yorumları ve commit mesajları İngilizce. Commit
  mesajları kullanıcı gözünden ne değiştiğini anlatan düz bir cümle
  (ör. "Announce that applications are open on the home page").
- Yorumlar "neden"i anlatır, seyrek ama dolu; çevredeki üslubu koru.
- `git add` ile dosyaları tek tek ekle, `git add -A` yapma (depoda başka
  oturumların yarım işi olabiliyor; ör. şu an izlenmeyen `ekler/`).
- Push'u kullanıcı istemeden yapma.
- Mobil önemli: hover stilleri `@media (hover: hover) and (pointer: fine)`
  içinde; `prefers-reduced-motion` her animasyonda gözetiliyor.

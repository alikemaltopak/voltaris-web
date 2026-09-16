# Voltaris — İYTE Elektromobil Takımı Web Sitesi

**Klasör:** `~/Desktop/ev-takim-sitesi`
**Ne:** İzmir Yüksek Teknoloji Enstitüsü Voltaris Elektromobil Takımı için, kaydırma odaklı (scroll-driven) 3D/animasyonlu, TR/EN dil desteğine sahip tanıtım + başvuru sitesi.

## Teknoloji yığını

- **React 19 + TypeScript + Vite** — proje iskeleti
- **React Router** — çok sayfalı yapı (Ana Sayfa, Takım, Araç, Başvurular, Sponsorlar, İletişim)
- **GSAP + ScrollTrigger** — kaydırma-tetiklemeli tüm animasyonlar (pin + scrub)
- **Lenis** — sitenin tamamında yumuşak (inertia'lı) kaydırma
- **three.js + @react-three/fiber + @react-three/drei** — ana sayfadaki eski canlı 3D şasi görüntüleyicisi için (şu an kullanılmıyor ama kod duruyor, bkz. aşağı)

## Sayfa yapısı

| Sayfa | Yol | İçerik |
|---|---|---|
| Ana Sayfa | `/` | Hero (VOLTARIS başlığı), montaj animasyonu, "Biz Kimiz", araç/sponsor teaser kartları, katılım çağrısı |
| Takım | `/takim` | Departmanlar, üye kartları (placeholder) |
| Araç | `/arac` | Kaydırdıkça çizilen 2D eskiz, teknik özellik tablosu, geliştirme süreci, galeri (placeholder) |
| Başvurular | `/basvurular` | 3 komite kartı (Mekanik/Elektrik/Destek), her biri kendi başvuru penceresi (modal form) açıyor |
| Sponsorlar | `/sponsorlar` | Sponsorluk paketleri, mevcut sponsor logoları (placeholder) |
| İletişim | `/iletisim` | İletişim formu (demo, sunucuya veri göndermiyor) |

## Tasarım dili

Kullanıcının paylaştığı referans HTML dosyasından uyarlandı:

- **Tipografi:** Archivo (başlık/gövde) + JetBrains Mono (etiketler, "/ 01" numaralandırma, eyebrow metinler)
- **Renk:** Koyu zemin + elektrik cyan (`#22D3EE`) vurgu; **açık/koyu tema** desteği var (sağ üstteki KOYU/AÇIK düğmesi, `ThemeContext`)
- **Kartlar:** Köşesiz, ince kenarlıklı, hover'da yukarı kayma
- **Nav:** Sabit (fixed), şeffaf — altındaki içerikle karışıyor

## Öne çıkan interaktif özellikler

1. **Elektrik alanı (`ElectricField.tsx`)** — Sitenin tamamında sabit duran canvas; fare bir noktaya yaklaşınca kırık çizgili elektrik arkları atlıyor. Tema değişince rengi otomatik güncelleniyor.
2. **Eskiz reveal (`CarSketchReveal.tsx`, Araç sayfası)** — Referans dosyadan alınan araç yan-profil SVG çizimi, kaydırdıkça `stroke-dasharray` animasyonuyla parça parça çiziliyor (pin + scrub).
3. **Montaj animasyonu (`AssemblyReveal.tsx`, Ana Sayfa)** — **En son ve en büyük iş.** Kullanıcının bulduğu bir "Apple tarzı scroll-triggered image sequence" tekniğini, gerçek AI-render edilmiş 240 karelik bir "elektromobil parçaları birleşiyor" videosundan üretilmiş kare dizisiyle uyguladık:
   - Kaynak: kullanıcının sağladığı 240 PNG kare (AI video aracından, 1920×1080)
   - Arka planları **yapay zeka ile** (rembg / `isnet-general-use` modeli) kaldırıldı → gerçek şeffaflık (basit renk-eşiği denemeleri başarısız oldu, obje tanıma gerekti)
   - WebP'ye çevrilip optimize edildi: 425MB (ham PNG) → 210MB (şeffaf PNG) → **55MB (WebP, kalite kaybı yok)**
   - Kaydırma sırasında canvas üzerine ilgili kare çiziliyor; ilk kare hemen, geri kalanı arka planda 10'arlı gruplar halinde yükleniyor
   - Panelin arka planı/kenarlığı yok — parçalar doğrudan sayfa zemininde "yüzüyor", hiçbir metin/başlık eşlik etmiyor (kullanıcı isteği)
   - Konum: Ana sayfada VOLTARIS başlığının hemen altı (eski "Rakamlarla Voltaris" istatistik bölümü bu iş için kaldırıldı)
4. **Nokta imleç, dil değiştirici (TR/EN), tema değiştirici (Koyu/Açık)** — hepsi context tabanlı (`LanguageContext`, `ThemeContext`).

## Kullanılmayan ama duran özellik: canlı 3D şasi görüntüleyici

`ChassisViewer.tsx` + `public/models/voltaris-chassis.glb` — takımın **gerçek** SolidWorks STEP dosyalarından (Şasi + Roll Cage, Drive'dan bulundu) dönüştürülmüş, gerçekten doğru/doğrulanmış bir 3D model. Bir ara ana sayfaya döndürülebilir canlı görüntüleyici olarak eklendi, sonra kullanıcı "amatörce durdu" dedi ve şu anki kare-dizisi animasyonuna geçildi. Kod ve model dosyası duruyor, istenirse geri getirilebilir veya başka bir sayfada kullanılabilir.

## Şu an placeholder olan / gerçek veriyle değiştirilmesi gereken yerler

- Takım üyesi fotoğrafları/isimleri
- Araç teknik özellikleri (menzil, güç, ağırlık vb.)
- Araç galerisi fotoğrafları
- Sponsor logoları
- Montaj animasyonu notu: şu an "temsili" olduğu belirtiliyordu ama kullanıcı isteğiyle metin tamamen kaldırıldı — gerçek üretim görüntüleri geldiğinde ayrı bir karar gerekecek

## Diğer notlar

- Proje bir **git deposu değil** henüz — GitHub'a bağlamak için önce `git init` + uzak repo gerekiyor (bu konuşulmaya başlandı, henüz yapılmadı)
- `cad-assets/` klasöründe CAD dönüştürme scriptleri (STEP→GLB, arka plan kaldırma) ve bir Python venv duruyor (~1.5GB, siteyle ilgisi yok, sadece araç kutusu)
- `THIRD_PARTY_NOTICES.md` — ThreeUI'dan (MIT lisans) uyarlanan `EnergyOrb` bileşeni için atıf

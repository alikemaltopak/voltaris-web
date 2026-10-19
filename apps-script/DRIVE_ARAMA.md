# Drive araması — kurulum

Paneldeki Database balonu, takımın Drive'ında canlı arama yapar: dosya adı, **klasör adı**, açıklama ve
(okunabilen dosyalarda) içerik. Ortak drive'lar ve takım arşivi indeksine girmemiş dosyalar da dahildir.
Sonuçlar puanla sıralanır: ad eşleşmesi > açıklama > klasör yolu > içerik.
Arama, `voltaris.official@gmail.com` hesabında çalışan küçük bir Google Apps Script üzerinden gider
(`DriveArama.gs`). Script her istekte aramayı yapanın panel üyesi olduğunu Firebase'den kontrol eder;
üye olmayan hiçbir sonuç alamaz. Drive'a yeni eklenen dosya kendiliğinden aramaya girer.

Kurulum bir kez yapılır, ~10 dakika sürer. Sorun giderme tablosu en altta.

## 0. Önce: kuralları yayınla

Bu özellik Firestore'a yeni bir `ayarlar` belgesi ekliyor. Depodaki `firestore.rules`'un **güncel**
içeriğini Firebase konsolu → Firestore Database → Rules'a yapıştırıp **Publish** et. Yoksa 5. adımda
"Kaydet" izin hatası verir.

## 1. Script projesini aç

1. **script.google.com** → sağ üstte **voltaris.official@gmail.com** ile oturum açık olduğundan emin ol.
2. **Yeni proje** → sol üstteki "Adsız proje"ye tıkla → adı: `Voltaris Panel Drive Araması`.
3. Açılan `Kod.gs` dosyasının içindekileri sil, depodaki **`apps-script/DriveArama.gs`** dosyasının
   tamamını yapıştır → **Kaydet** (💾).

İsteğe bağlı: aramayı yalnız takım klasörüyle sınırlamak istersen `AYAR.kokKlasorler` içine o klasörün
kimliğini yaz (Drive'da klasörü aç, adres çubuğundaki `/folders/` sonrasındaki kısım):
```js
kokKlasorler: ['1AbCdEf...'],
```
Boş bırakılırsa voltaris.official'ın gördüğü bütün Drive aranır. Her iki durumda da başvuru, kimlik,
fatura gibi kişisel veri içeren dosyalar ve Sponsorluk / Sosyal Medya klasörleri sonuçlara girmez.

## 2. Drive API hizmetini aç

Soldaki **Hizmetler** (Services) yanındaki **+** → listeden **Drive API** → sürüm **v3** → tanımlayıcı
`Drive` olarak kalsın → **Ekle**. (Script bununla tek istekte yüzlerce dosyayı ve bütün klasörleri okur.)

## 3. Kurulumu çalıştır

1. Üstteki fonksiyon listesinden **`kurulum`**'u seç → **Çalıştır**.
2. "Yetkilendirme gerekli" → **İzinleri incele** → voltaris.official hesabını seç.
3. "Google bu uygulamayı doğrulamadı" çıkarsa: **Gelişmiş** → **Voltaris Panel Drive Araması'na git
   (güvenli değil)**. Bu uyarı kendi yazdığın script için normaldir.
4. **İzin ver**. Alttaki "Yürütme günlüğü"nde şu satırları görmelisin:
   - `Klasör haritası: N klasör, … ms` — Drive'daki bütün klasörler çıkarıldı (18 bin klasörde ~90 sn).
   - `Tazeleme: 4 saatte bir…` — harita kendiliğinden güncellenir (Tetikleyiciler ⏰ sekmesinde görünür). Haritanın bir
     kopyası Drive'ın köküne `voltaris-panel-klasor-haritasi.json` adıyla yazılır; **silme**, önbellek boşalınca arama onu okur.
   - `Önbellek boşken haritayı dosyadan okuma: … ms` — birkaç saniyenin altında olmalı.
   - `Deneme araması "şasi": N sonuç, … ms. İlk üçü: [...]`

   Klasör sayısı ve deneme sonuçları beklediğin gibi değilse (ör. arşiv bir ortak drive'da ve hiç görünmüyorsa)
   bu satırları bana gönder.

## 4. Web uygulaması olarak dağıt

1. Sağ üstte **Dağıt** → **Yeni dağıtım**.
2. Tür seç (⚙️) → **Web uygulaması**.
3. Ayarlar:
   - Açıklama: `panel drive araması`
   - **Şu kullanıcı olarak yürüt: Ben (voltaris.official@gmail.com)**
   - **Erişimi olanlar: Herkes**
     (adres herkese açık olur ama üye olmayan biri hiçbir sonuç alamaz; script her istekte üyeliği kontrol eder)
4. **Dağıt** → çıkan **Web uygulaması URL'sini** kopyala (`https://script.google.com/macros/s/…/exec`).

## 5. Panele bağla

1. Paneli aç (voltaris.official ya da alikemaltopak hesabıyla) → **Üyeler** → **Drive araması**.
2. URL'yi yapıştır → **Kaydet ve dene**.
3. "Çalışıyor: "şasi" için N dosya bulundu." görmelisin. Bundan sonra bütün üyelerin balonunda
   "Drive'da" bölümü çalışır; sayfayı yenilemeleri yeter.

## Script'i güncellemek

`DriveArama.gs` değişirse: kodu yapıştır → Kaydet → **Dağıt** → **Dağıtımları yönet** → kalem simgesi →
Sürüm: **Yeni sürüm** → **Dağıt**. Bu yolla adres değişmez; panelde bir şey yapmaya gerek yok.
("Yeni dağıtım" dersen adres değişir, o zaman 5. adımı tekrarla.)
Yeni bir kod sürümünde `kurulum`'u bir kez daha çalıştırmak zararsızdır ve haritayı hemen tazeler.

## Sorun giderme

| Panelde görülen | Sebep |
|---|---|
| "Canlı Drive araması henüz kurulmadı" | 4. adım yapılmadı ya da adres boş. |
| "Script'e ulaşılamadı" | Dağıtımda "Erişimi olanlar: Herkes" seçili değil ya da adres yanlış kopyalandı. |
| "Üyeliği doğrulayamadı" | `AYAR.firebaseApiKey` / `projeId` panelin `.env`'iyle aynı değil; ya da kişi üye listesinde değil / pasif. |
| "Script Drive'da arayamadı" | Drive API hizmeti eklenmedi (2. adım) ya da `kurulum` çalıştırılmadı (3. adım). |
| Yeni açılan bir klasör adıyla çıkmıyor | Klasör haritası 4 saatte bir tazelenir; en geç 4 saat sonra çıkar. Hemen gerekirse `kurulum`'u çalıştır. (Klasörün içindeki dosyalar, adları ya da içerikleriyle, beklemeden çıkar.) |
| Bir dosya çıkmıyor | voltaris.official o dosyayı göremiyor (paylaşılmamış), adı/yolu gizli desene takılıyor, ya da Teams'te duruyor. Taranmış PDF'lerin ve CAD dosyalarının içi aranamaz: bunlar adı, klasörü ya da açıklamasıyla bulunur. Çok genel bir kelimede (ör. "mekanik") yüzlerce sonuç olur ve yalnız en iyi 25'i gösterilir; kelime ekle. |

Kurucu hesaplar değişirse `AYAR.kurucular`'ı `firestore.rules` (`kurucu()`) ve `panel/firebase.js`
(`KURUCULAR`) ile birlikte güncelle.

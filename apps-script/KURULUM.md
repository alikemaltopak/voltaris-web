# Site formları → Google E-Tablo + e-posta kurulumu

Aynı script iki formu karşılıyor:

- **Başvuru formu** → komite sayfalarına satır, CV'ler Drive'a.
- **İletişim formu** (sponsorluk paketlerinden gelenler dahil) → mesaj
  `ILETISIM_EPOSTA` adresine e-posta olarak gider (Yanıtla doğrudan gönderene
  gider) ve "İletişim" sayfasına da kaydedilir.

Site tarafı hazır. Geriye Apps Script'i yayınlayıp iki ortam değişkenini
doldurmak kalıyor. Tamamı yaklaşık 15 dakika.

## Neden bu adımları takımdan biri yapmak zorunda?

Sitedeki formlar veriyi doğrudan e-tabloya yazamaz; araya küçük bir program
girer: **Apps Script**. Bu program Voltaris'in Google hesabının *içinde*
yaşar ve o hesabın yetkisiyle çalışır — e-tabloya satır ekler, Drive'a CV
kaydeder, `voltaris.official@gmail.com` adına e-posta gönderir.

Google, bir hesabın adına e-posta gönderen ya da Drive'ına yazan kodun
**hesap sahibinin kendi eliyle** yüklenmesini ve izin ekranında onaylanmasını
şart koşar. Bu yüzden:

- Kodu projede (`apps-script/Kod.gs`) biz yazıp güncelliyoruz,
- ama onu Google'a yapıştırıp **"Yeni sürüm" olarak yayınlamak** hesaba
  giriş yapabilen birinin işi. Dışarıdan (siteden, Claude'dan, başka bir
  araçtan) bu yapılamaz.

Kod her değiştiğinde bu yayınlama bir kez tekrarlanır. Sitenin kendisi (Vercel)
ayrıca bir şey istemez; adres ve anahtar aynı kalır.

## Hazır olan Drive kaynakları

| Ne | Bağlantı |
|---|---|
| Ana klasör | https://drive.google.com/drive/folders/1nHrXBxgjjyirAM_bWMHuxW3a5eAtJRcp |
| E-tablo | https://docs.google.com/spreadsheets/d/1ggOSZtYQ2B1A0RBAwxteyZsfziGdg6NQGPwiHAXNyBE/edit |
| CV klasörü | https://drive.google.com/drive/folders/1XXTrj3kGo5mnWKw7xHb9jtGnoSkELoWb |

E-tablo şu an boş. Komite sayfaları (`Mekanik`, `Elektrik`, `Destek`) ve başlık
satırları **ilk başvuru geldiğinde script tarafından otomatik açılır** — elle
sütun hazırlamana gerek yok.

## 1. Gizli anahtarı üret

Terminalde:

```bash
openssl rand -hex 24
```

Çıkan diziyi bir yere not et; iki yerde birebir aynı olacak.

## 2. Script'i yayınla

1. E-tabloyu aç → **Uzantılar → Apps Script**.
2. Açılan editördeki örnek kodu sil, `Kod.gs` dosyasının tamamını yapıştır.
3. En üstteki `GIZLI_ANAHTAR` satırına 1. adımdaki anahtarı yaz.
   (`CV_KLASOR_ID` zaten doğru dolduruldu.)
4. Her başvuruda e-posta istiyorsan `BILDIRIM_EPOSTA` satırına adresi yaz;
   istemiyorsan boş bırak.
5. Kaydet (⌘S).
6. Sağ üstte **Dağıt → Yeni dağıtım** → dişli simgesi → **Web uygulaması**:
   - *Yürütme kimliği:* **Ben** (voltaris.official@gmail.com)
   - *Erişimi olanlar:* **Herkes**
   - **Dağıt**
7. Google izin isteyecek. "Bu uygulama doğrulanmadı" uyarısında
   **Gelişmiş → (proje adı) sayfasına git → İzin ver**. Bu normaldir; kendi
   yazdığın script'e kendi hesabında izin veriyorsun.
8. Sonunda verilen, `/exec` ile biten **Web uygulaması URL**'sini kopyala.

## 3. Siteye bağla

Proje kökünde `.env` dosyası oluştur (`.env.example`'ı kopyalayabilirsin):

```
VITE_BASVURU_ENDPOINT="https://script.google.com/macros/s/AKfycb.../exec"
VITE_BASVURU_ANAHTARI="1. adımdaki anahtar"
```

Aynı iki değişkeni Vercel'de de tanımla:
**Project → Settings → Environment Variables** → Production + Preview →
ardından yeniden dağıt (redeploy). Vite değişkenleri derleme anında gömüldüğü
için yeniden dağıtım şart.

## 4. Dene

`npm run dev` → `/basvurular` → formu doldurup gönder. E-tabloda komitenin
sayfası açılmış ve satır düşmüş olmalı; CV yüklediysen "CV / Ön Yazı"
sütunundaki bağlantı Drive'daki dosyaya gitmeli.

---

## Bilinmesi gerekenler

## Script güncellemesi (mevcut kurulumu yenilemek)

İlk kurulum bir kez yapıldı; kod değiştiğinde yapılacak olan sadece bu:

1. E-tabloyu aç → **Uzantılar → Apps Script**.
2. Editörde ⌘A (Windows'ta Ctrl+A) ile her şeyi seç, sil.
3. Projedeki `apps-script/Kod.gs` dosyasının tamamını kopyalayıp yapıştır.
4. Yapıştırınca en üstteki ayarlar örnek değerlere döner. İkisini geri yaz:
   - `GIZLI_ANAHTAR` → `.env` dosyasındaki `VITE_BASVURU_ANAHTARI` ile aynı değer
   - `BILDIRIM_EPOSTA` → başvuru bildirimi istiyorsan `'voltaris.official@gmail.com'`
   (`ILETISIM_EPOSTA` ve `CV_KLASOR_ID` zaten doğru; dokunma.)
5. Kaydet (⌘S).
6. **Dağıt → Dağıtımları yönet** → listedeki dağıtımın yanındaki **kalem** →
   **Sürüm** açılır menüsünden **Yeni sürüm** → **Dağıt**.
   "Yeni dağıtım" *seçme* — o yeni bir adres üretir ve site eski adrese
   gitmeye devam eder.
7. İzin ekranı çıkarsa (yeni bir izin gerektiğinde çıkar): hesabı seç →
   "Gelişmiş" → "…projesine git" → **İzin ver**.
8. Kontrol: `/exec` adresini tarayıcıda aç; "uç noktası çalışıyor" yazısı
   görünmeli.

**Script'i her değiştirdiğinde yeniden dağıt.** Kaydetmek yetmez:
**Dağıt → Dağıtımları yönet → kalem simgesi → Sürüm: Yeni sürüm → Dağıt**.
Bunu atlarsan eski kod çalışmaya devam eder. URL değişmez.

**Script'i güncellerken ayarlar sıfırlanır.** Yeni `Kod.gs`'i yapıştırınca
`GIZLI_ANAHTAR` ve `BILDIRIM_EPOSTA` satırlarını önceki değerleriyle tekrar
doldurmayı unutma; yoksa site "Yetkisiz istek" alır.

**Siteye yeni soru eklemek script'i bozmaz.** Script gelen soruların
metnini başlık olarak kullanıyor; tanımadığı bir soru görürse sona yeni sütun
açar, mevcut sütunların yeri değişmez. `applicationForms.ts`'e soru eklemen
yeterli.

**Anahtar gerçek bir sır değil.** Vite değişkenleri tarayıcıya gönderilen
pakete gömülür; kararlı biri okuyabilir. Görevi, uç noktayı rastgele tarayan
botları elemek. Asıl koruma bal küpü alanı (formda görünmeyen bir giriş; bot
doldurursa başvuru sessizce yutulur). Ciddi bir saldırı olursa Apps Script'te
yeni anahtar üretip `.env` ve Vercel'i güncellemek yeterli.

**CV'leri kimler görebilir?** Dosyalar "CV ve Ön Yazılar" klasörüne, klasörün
paylaşım ayarlarını miras alarak düşer — herkese açılmaz. Değerlendirmeyi
yapacak arkadaşlara **ana klasörü** paylaş, e-tablo ve CV'ler birlikte gelir.

**Dosya sınırı 8 MB.** Hem sitede (`MAX_FILE_BYTES`) hem script'te
(`MAKS_DOSYA_MB`) tanımlı; değiştirirsen ikisini birden değiştir.

**Kotalar.** Apps Script'in ücretsiz kotası günde 20.000 çağrı ve 100 e-posta;
üye alımı ölçeğinde sorun çıkarmaz.

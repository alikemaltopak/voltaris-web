/**
 * Voltaris site formları → Google E-Tablo + Drive + e-posta
 *
 * Bu script "Voltaris Başvuruları" e-tablosuna bağlıdır (Uzantılar → Apps Script).
 * İki tür istek karşılar:
 *  - Başvuru (varsayılan): komitesine ait sayfaya bir satır ekler, varsa CV'yi
 *    Drive'a kaydedip satıra bağlantısını koyar.
 *  - İletişim (tur: "iletisim"): mesajı takım adresine e-posta olarak iletir
 *    (Yanıtla doğrudan gönderene gider) ve AYRI bir tabloya — "Voltaris
 *    Sponsorluk Talepleri" — kaydeder: paket seçilerek gelenler "Sponsorluk",
 *    diğerleri "Genel İletişim" sayfasına. Başvuru tablosu yalnız başvuru tutar.
 *
 * Kurulum adımları için KURULUM.md dosyasına bak.
 */

// ---------------------------------------------------------------- AYARLAR --

/**
 * Sitedeki VITE_BASVURU_ANAHTARI ile birebir aynı olmalı. Gerçek bir sır değil
 * (sitenin JS paketinde de yazılı); burada dolu durur ki script her
 * güncellendiğinde elle yeniden girilmesi gerekmesin.
 */
const GIZLI_ANAHTAR = '6f01d8a459c5e0f811ac6081c2560dd4551d89e5c22bd8be';

/** "CV ve Ön Yazılar" klasörünün kimliği. */
const CV_KLASOR_ID = '1XXTrj3kGo5mnWKw7xHb9jtGnoSkELoWb';

/** Her başvuruda haber verilecek adres. Boş bırakılırsa e-posta gönderilmez. */
const BILDIRIM_EPOSTA = 'voltaris.official@gmail.com';

/** İletişim formundan gelen mesajların gideceği adres. */
const ILETISIM_EPOSTA = 'voltaris.official@gmail.com';

/** Sponsorluk talepleri ve iletişim mesajlarının yazıldığı ayrı tablo. */
const TALEP_TABLO_ID = '1dodzYkDE_q_6WJWPFC-lMTfKlWk92_9L7ZtB-EVFeR4';

/** Sitedeki paket kimliği → tabloda ve e-postada görünecek ad. */
const PAKET_ADLARI = {
  platinum: 'Platin',
  gold: 'Altın',
  silver: 'Gümüş',
  bronze: 'Bronz',
  supporter: 'Destekçi',
  general: 'Genel sponsorluk',
};

/** Kabul edilen en büyük CV boyutu. */
const MAKS_DOSYA_MB = 8;

const ZAMAN_BASLIGI = 'Gönderim Zamanı';
const CV_BASLIGI = 'CV / Ön Yazı';

// ------------------------------------------------------------------ GİRİŞ --

function doPost(e) {
  const kilit = LockService.getScriptLock();
  // Aynı anda iki başvuru gelirse satırların üst üste yazılmaması için.
  if (!kilit.tryLock(30000)) return cevap('hata', 'Sunucu meşgul, tekrar dene.');

  try {
    const gelen = JSON.parse(e.postData.contents);

    if (gelen.anahtar !== GIZLI_ANAHTAR) return cevap('hata', 'Yetkisiz istek.');

    // Bal küpü: gerçek kullanıcıya görünmeyen alan. Doluysa gönderen bir bot,
    // hata döndürmek yerine sessizce yutuyoruz ki tekrar denemesin.
    if (gelen.botTuzagi) return cevap('ok', 'ok');

    if (gelen.tur === 'iletisim') return iletisimMesaji(gelen);

    const cevaplar = Array.isArray(gelen.cevaplar) ? gelen.cevaplar : [];
    if (cevaplar.length === 0) return cevap('hata', 'Boş başvuru.');

    const sayfa = sayfayiGetir(gelen.komiteAdi || 'Diğer');
    const adSoyad = cevapBul(cevaplar, 'ad_soyad') || 'isimsiz';

    var cvBaglantisi = '';
    if (gelen.dosya && gelen.dosya.veri) {
      cvBaglantisi = dosyayiKaydet(gelen.dosya, adSoyad);
    }

    // Sütun sırası: zaman → sorular (formdaki sırayla) → CV. CV sütunu yalnızca
    // gerçekten dosya geldiğinde açılır; formda artık CV sorusu yok ve her
    // başvuruda boş bir sütun eklemek, silinen sütunu geri getiriyordu.
    const basliklar = [ZAMAN_BASLIGI]
      .concat(cevaplar.map(function (c) { return c.soru; }))
      .concat(cvBaglantisi ? [CV_BASLIGI] : []);

    const degerler = {};
    degerler[ZAMAN_BASLIGI] = new Date();
    degerler[CV_BASLIGI] = cvBaglantisi;
    cevaplar.forEach(function (c) { degerler[c.soru] = bicimle(c); });

    basliklariEsitle(sayfa, basliklar);

    const mevcutBasliklar = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0];
    sayfa.appendRow(mevcutBasliklar.map(function (baslik) {
      return Object.prototype.hasOwnProperty.call(degerler, baslik) ? degerler[baslik] : '';
    }));

    if (BILDIRIM_EPOSTA) bildirimGonder(gelen.komiteAdi, adSoyad, cevapBul(cevaplar, 'eposta'));

    return cevap('ok', 'ok');
  } catch (hata) {
    // Hatayı yut ama yürütme günlüğüne düşür — sorun çıkarsa oradan bakılır.
    console.error(hata);
    return cevap('hata', String(hata));
  } finally {
    kilit.releaseLock();
  }
}

/**
 * İletişim formu: önce satırı yaz, sonra e-postayı gönder — e-posta kotası
 * dolsa bile mesaj tabloda kaybolmadan durur.
 */
function iletisimMesaji(gelen) {
  const ad = kisalt(gelen.ad, 120);
  const eposta = kisalt(gelen.eposta, 200);
  const konu = kisalt(gelen.konu, 200) || 'Web sitesinden mesaj';
  const mesaj = kisalt(gelen.mesaj, 5000);
  if (!ad || !eposta || !mesaj) return cevap('hata', 'Eksik alan.');

  // Sponsorluk sayfasındaki bir paketten gelen mesajlar "?paket=" taşır.
  const paket = PAKET_ADLARI[gelen.paket] || '';
  const kitap = SpreadsheetApp.openById(TALEP_TABLO_ID);

  if (paket) {
    const sayfa = sayfayiGetir('Sponsorluk', kitap);
    basliklariEsitle(sayfa, [ZAMAN_BASLIGI, 'Paket', 'Ad Soyad', 'E-posta', 'Konu', 'Mesaj']);
    sayfa.appendRow([new Date(), paket, ad, eposta, konu, mesaj]);
  } else {
    const sayfa = sayfayiGetir('Genel İletişim', kitap);
    basliklariEsitle(sayfa, [ZAMAN_BASLIGI, 'Ad Soyad', 'E-posta', 'Konu', 'Mesaj']);
    sayfa.appendRow([new Date(), ad, eposta, konu, mesaj]);
  }

  try {
    MailApp.sendEmail({
      to: ILETISIM_EPOSTA,
      replyTo: eposta,
      name: 'Voltaris Web Sitesi',
      subject: (paket ? '[Sponsorluk · ' + paket + '] ' : '[Site] ') + konu + ' — ' + ad,
      body: ad + ' <' + eposta + '> web sitesinden yazdı' + (paket ? ' (' + paket + ' paketi)' : '') + ':\n\n' +
            mesaj +
            '\n\n— \nBu e-postayı yanıtladığında cevap doğrudan ' + eposta + ' adresine gider.' +
            '\nTüm talepler: ' + kitap.getUrl(),
    });
  } catch (hata) {
    console.error(hata);
  }
  return cevap('ok', 'ok');
}

function kisalt(deger, en) {
  return String(deger || '').trim().substring(0, en);
}

/** Tarayıcıdan URL'ye girilirse boş sayfa yerine anlaşılır bir şey dönsün. */
function doGet() {
  return cevap('ok', 'Voltaris başvuru uç noktası çalışıyor.');
}

// ---------------------------------------------------------------- YARDIMCI --

function cevap(durum, mesaj) {
  return ContentService
    .createTextOutput(JSON.stringify({ durum: durum, mesaj: mesaj }))
    .setMimeType(ContentService.MimeType.JSON);
}

function cevapBul(cevaplar, id) {
  for (var i = 0; i < cevaplar.length; i++) {
    if (cevaplar[i].id === id) return String(cevaplar[i].cevap || '');
  }
  return '';
}

/** Adı verilen sayfayı döndürür, yoksa oluşturur. Tablo verilmezse başvuru tablosu. */
function sayfayiGetir(ad, tablo) {
  const temizAd = String(ad).substring(0, 60);
  const kitap = tablo || SpreadsheetApp.getActiveSpreadsheet();
  var sayfa = kitap.getSheetByName(temizAd);
  if (!sayfa) {
    sayfa = kitap.insertSheet(temizAd);
    // Kurulumdan kalan boş "Sayfa1"i temizle.
    const varsayilan = kitap.getSheetByName('Sayfa1') || kitap.getSheetByName('Sheet1');
    if (varsayilan && varsayilan.getLastRow() === 0 && kitap.getSheets().length > 1) {
      kitap.deleteSheet(varsayilan);
    }
  }
  return sayfa;
}

/**
 * Başlık satırını gelen sorularla hizalar. Siteye yeni bir soru eklendiğinde
 * script'e dokunmadan yeni sütun açılsın diye böyle: eksik başlıklar sona
 * eklenir, mevcut sütunların yeri hiç değişmez.
 */
function basliklariEsitle(sayfa, istenen) {
  if (sayfa.getLastRow() === 0) {
    sayfa.getRange(1, 1, 1, istenen.length).setValues([istenen]);
    sayfa.getRange(1, 1, 1, istenen.length).setFontWeight('bold');
    sayfa.setFrozenRows(1);
    return;
  }

  const mevcut = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0];
  const eksik = istenen.filter(function (baslik) { return mevcut.indexOf(baslik) === -1; });
  if (eksik.length === 0) return;

  sayfa.getRange(1, mevcut.length + 1, 1, eksik.length).setValues([eksik]).setFontWeight('bold');
}

// ------------------------------------------------------- TEK SEFERLİK --

/** Formda şu an sorulan soruların başlıkları, iki dilde. */
const GUNCEL_BASLIKLAR = [
  ZAMAN_BASLIGI,
  'Ad Soyad',
  'E-posta adresin',
  'Telefon numaran',
  'Bölümün',
  'Kaçıncı sınıftasın?',
  "Voltaris'i nereden duydun?",
  "Voltaris'e neden katılmak istiyorsun? Bizi en çok bu cevap ilgilendiriyor, uzun ve mükemmel olmak zorunda değil.",
  'Eklemek istediğin bir şey var mı? (Portfolyo, GitHub, çizim, video linki vb. de buraya bırakabilirsin)',
  'Full name',
  'Your email address',
  'Your phone number',
  'Your department',
  'What year are you in?',
  'Where did you hear about Voltaris?',
  "Why do you want to join Voltaris? This is the answer we care about most — it doesn't have to be long or perfect.",
  "Anything else you'd like to add? (You can leave a portfolio, GitHub, sketch, or video link here too)",
];

/** Başvuruların yazıldığı komite sayfaları. İletişim sayfasına dokunulmaz. */
const KOMITE_SAYFALARI = ['Mekanik', 'Elektrik', 'Destek', 'Mechanical', 'Electrical', 'Support'];

/**
 * Formdan kaldırılan soruların sütunlarını ve hata ayıklama sırasında atılan
 * test satırlarını siler. Bir kez, Apps Script düzenleyicisinden elle
 * çalıştırılır (üstteki menüden bu fonksiyonu seçip "Çalıştır").
 *
 * Silinecekleri tek tek saymak yerine güncel başlıkları tutar: tablodaki
 * başlıklar formun daha eski bir sürümünden kalma ve metinleri formdakiyle
 * birebir aynı değil ("CAD becerini…" gibi), bir silme listesi onları
 * kaçırırdı. Bu yüzden forma yeni soru ekledikten SONRA çalıştırma — o
 * sütunu da silmek ister.
 */
function eskiSutunlariTemizle() {
  const kitap = SpreadsheetApp.getActiveSpreadsheet();
  KOMITE_SAYFALARI.forEach(function (ad) {
    const sayfa = kitap.getSheetByName(ad);
    if (!sayfa || sayfa.getLastColumn() === 0) return;

    const basliklar = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0];
    var silinenSutun = 0;
    // Sağdan sola: silinen sütun, solundakilerin numarasını kaydırmasın.
    for (var i = basliklar.length - 1; i >= 0; i--) {
      if (GUNCEL_BASLIKLAR.indexOf(basliklar[i]) === -1) {
        sayfa.deleteColumn(i + 1);
        silinenSutun++;
      }
    }

    // Yalnızca "TEST… SILINEBILIR" olarak işaretlenmiş satırlar.
    var silinenSatir = 0;
    const adSutunu = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0].indexOf('Ad Soyad');
    if (adSutunu !== -1 && sayfa.getLastRow() > 1) {
      const adlar = sayfa.getRange(2, adSutunu + 1, sayfa.getLastRow() - 1, 1).getValues();
      for (var r = adlar.length - 1; r >= 0; r--) {
        const deger = String(adlar[r][0]);
        if (deger.indexOf('TEST') === 0 && deger.indexOf('SILINEBILIR') !== -1) {
          sayfa.deleteRow(r + 2);
          silinenSatir++;
        }
      }
    }
    console.log(ad + ': ' + silinenSutun + ' sütun, ' + silinenSatir + ' test satırı silindi.');
  });
}

/** Çoklu seçim dizilerini okunur tek hücreye çevirir. */
function bicimle(cevap) {
  const deger = cevap.cevap;
  if (deger === undefined || deger === null) return '';

  // E-Tablo rakamdan oluşan metni sayıya çevirir ve baştaki sıfırı atar:
  // 05321234567 → 5321234567. Başa konan kesme işareti hücreyi metin olarak
  // tutar, tabloda görünmez.
  if (cevap.tip === 'telefon') return "'" + String(deger);

  if (!Array.isArray(deger)) return deger;

  // Sıralamalı seçimde tercih sırası bilginin kendisi — numaralandırarak koru.
  if (cevap.tip === 'coklu_secim_siralamali') {
    return deger.map(function (secenek, i) { return (i + 1) + ') ' + secenek; }).join('\n');
  }
  return deger.join('\n');
}

function dosyayiKaydet(dosya, adSoyad) {
  const baytlar = Utilities.base64Decode(dosya.veri);
  if (baytlar.length > MAKS_DOSYA_MB * 1024 * 1024) {
    throw new Error('CV dosyası ' + MAKS_DOSYA_MB + ' MB sınırını aşıyor.');
  }

  const ad = dosyaAdiTemizle(adSoyad) + ' - ' + dosyaAdiTemizle(dosya.adi || 'cv.pdf');
  const blob = Utilities.newBlob(baytlar, dosya.tur || 'application/octet-stream', ad);
  // Klasörün paylaşım ayarlarını miras alır; herkese açılmaz.
  return DriveApp.getFolderById(CV_KLASOR_ID).createFile(blob).getUrl();
}

function dosyaAdiTemizle(ad) {
  return String(ad).replace(/[\\/:*?"<>|]/g, '-').substring(0, 80).trim();
}

function bildirimGonder(komite, adSoyad, eposta) {
  try {
    MailApp.sendEmail({
      to: BILDIRIM_EPOSTA,
      subject: 'Yeni Voltaris başvurusu — ' + komite + ' — ' + adSoyad,
      body: adSoyad + ' (' + eposta + ') ' + komite + ' komitesine başvurdu.\n\n' +
            SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });
  } catch (hata) {
    // E-posta kotası dolduysa başvuru yine de kaydedilmiş olmalı.
    console.error(hata);
  }
}

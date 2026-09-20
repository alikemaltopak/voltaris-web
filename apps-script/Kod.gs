/**
 * Voltaris başvuru formu → Google E-Tablo + Drive
 *
 * Bu script "Voltaris Başvuruları" e-tablosuna bağlıdır (Uzantılar → Apps Script).
 * Siteden gelen her başvuruyu komitesine ait sayfaya bir satır olarak ekler,
 * varsa CV dosyasını Drive'a kaydedip satıra bağlantısını koyar.
 *
 * Kurulum adımları için KURULUM.md dosyasına bak.
 */

// ---------------------------------------------------------------- AYARLAR --

/** Sitedeki VITE_BASVURU_ANAHTARI ile birebir aynı olmalı. */
const GIZLI_ANAHTAR = 'BURAYA-UZUN-BIR-ANAHTAR-YAZ';

/** "CV ve Ön Yazılar" klasörünün kimliği. */
const CV_KLASOR_ID = '1XXTrj3kGo5mnWKw7xHb9jtGnoSkELoWb';

/** Her başvuruda haber verilecek adres. Boş bırakılırsa e-posta gönderilmez. */
const BILDIRIM_EPOSTA = '';

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

    const cevaplar = Array.isArray(gelen.cevaplar) ? gelen.cevaplar : [];
    if (cevaplar.length === 0) return cevap('hata', 'Boş başvuru.');

    const sayfa = sayfayiGetir(gelen.komiteAdi || 'Diğer');
    const adSoyad = cevapBul(cevaplar, 'ad_soyad') || 'isimsiz';

    var cvBaglantisi = '';
    if (gelen.dosya && gelen.dosya.veri) {
      cvBaglantisi = dosyayiKaydet(gelen.dosya, adSoyad);
    }

    // Sütun sırası: zaman → sorular (formdaki sırayla) → CV.
    const basliklar = [ZAMAN_BASLIGI]
      .concat(cevaplar.map(function (c) { return c.soru; }))
      .concat([CV_BASLIGI]);

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

/** Komite sayfasını döndürür, yoksa oluşturur. */
function sayfayiGetir(ad) {
  const temizAd = String(ad).substring(0, 60);
  const kitap = SpreadsheetApp.getActiveSpreadsheet();
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

/** Çoklu seçim dizilerini okunur tek hücreye çevirir. */
function bicimle(cevap) {
  const deger = cevap.cevap;
  if (!Array.isArray(deger)) return deger === undefined || deger === null ? '' : deger;

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

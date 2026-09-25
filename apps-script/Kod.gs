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
const KOMITE_BASLIGI = 'Komite';
const CV_BASLIGI = 'CV';

/** Bütün başvuruların yazıldığı tek sayfa. */
const BASVURU_SAYFASI = 'Başvurular';

/**
 * Sayfadaki sütunlar, sırasıyla: soru kimliği → kısa başlık. Kimliğe göre
 * eşlendiği için İngilizce formdan gelen başvuru da aynı sütunlara düşer.
 * Burada olmayan yeni bir soru gelirse, soru metniyle sona kendi sütunu açılır.
 */
const SUTUNLAR = [
  ['', ZAMAN_BASLIGI],
  ['', KOMITE_BASLIGI],
  ['ad_soyad', 'Ad Soyad'],
  ['eposta', 'E-posta'],
  ['telefon', 'Telefon'],
  ['bolum', 'Bölüm'],
  ['sinif', 'Sınıf'],
  ['nasil_duydun', 'Bizi nereden duydu'],
  ['neden_katilmak_istiyorsun', 'Neden katılmak istiyor'],
  ['ekleyecek_bir_seyin_var_mi', 'Eklemek istedikleri'],
];

/** Komite grupları sayfada bu sırayla durur, her biri kendi renginde. */
const KOMITELER = [
  { ad: 'Mekanik', renk: '#e8f1fb', esler: ['mekanik', 'Mekanik', 'Mechanical'] },
  { ad: 'Elektrik', renk: '#fdf6e3', esler: ['elektrik', 'Elektrik', 'Electrical'] },
  { ad: 'Destek', renk: '#eaf6ec', esler: ['destek', 'Destek', 'Support'] },
];

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

    const komite = komiteAdi(gelen.komite) || komiteAdi(gelen.komiteAdi) || 'Diğer';
    const adSoyad = cevapBul(cevaplar, 'ad_soyad') || 'isimsiz';

    // Site de aynı kontrolleri yapıyor (src/lib/formValidation.ts); bu,
    // siteyi atlayıp doğrudan buraya gönderilenler için.
    const eposta = cevapBul(cevaplar, 'eposta').trim();
    if (!EPOSTA_DESENI.test(eposta)) return cevap('hata', 'Geçersiz e-posta.', 'gecersiz_eposta');
    if (!telefonGecerli(cevapBul(cevaplar, 'telefon'))) {
      return cevap('hata', 'Geçersiz telefon.', 'gecersiz_telefon');
    }
    // Kilit altındayız: aynı e-postayla aynı anda gelen iki başvurudan
    // ikincisi, birincinin yazdığı satırı görür.
    if (dahaOnceBasvurmus(basvuruSayfasi(), eposta)) {
      return cevap('hata', 'Bu e-postayla zaten başvurulmuş.', 'tekrar_basvuru');
    }

    var cvBaglantisi = '';
    if (gelen.dosya && gelen.dosya.veri) {
      cvBaglantisi = dosyayiKaydet(gelen.dosya, adSoyad);
    }

    const degerler = {};
    degerler[ZAMAN_BASLIGI] = new Date();
    degerler[KOMITE_BASLIGI] = komite;
    cevaplar.forEach(function (c) { degerler[sutunBasligi(c)] = bicimle(c); });
    // Formda CV sorusu yok; sütun yalnızca gerçekten dosya gelirse açılır.
    if (cvBaglantisi) degerler[CV_BASLIGI] = cvBaglantisi;

    satirEkle(basvuruSayfasi(), degerler);

    if (BILDIRIM_EPOSTA) bildirimGonder(komite, adSoyad, cevapBul(cevaplar, 'eposta'));

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

/** `kod`, sitenin başvurana hangi mesajı göstereceğini seçtiği ad. */
function cevap(durum, mesaj, kod) {
  return ContentService
    .createTextOutput(JSON.stringify({ durum: durum, mesaj: mesaj, kod: kod || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function cevapBul(cevaplar, id) {
  for (var i = 0; i < cevaplar.length; i++) {
    if (cevaplar[i].id === id) return String(cevaplar[i].cevap || '');
  }
  return '';
}

/** ad@alan.uzanti: ad@gmail.com, ad@std.iyte.edu.tr. */
const EPOSTA_DESENI = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Rakamlar ve olağan ayraçlar, başta isteğe bağlı +; 10–15 rakam. */
function telefonGecerli(deger) {
  const metin = String(deger).trim();
  if (!/^\+?[\d\s().-]+$/.test(metin)) return false;
  const rakam = metin.replace(/\D/g, '').length;
  return rakam >= 10 && rakam <= 15;
}

/** E-posta sütununda aynı adres var mı (büyük/küçük harf ve boşluk fark etmez). */
function dahaOnceBasvurmus(sayfa, eposta) {
  const son = sayfa.getLastRow();
  if (son < 2) return false;
  const basliklar = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0];
  const sutun = basliklar.indexOf('E-posta') + 1;
  if (sutun === 0) return false;
  const aranan = eposta.toLowerCase();
  return sayfa.getRange(2, sutun, son - 1, 1).getValues().some(function (satir) {
    return String(satir[0]).trim().toLowerCase() === aranan;
  });
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

/**
 * Eski sayfalardaki başlıklar → yeni sayfadaki başlık. Soruların eski ve
 * yeni metinleri, iki dilde. Burada olmayan sütunlar formdan kaldırılan
 * sorulara ait; taşınmaz.
 */
const ESKI_BASLIKLAR = {
  'Gönderim Zamanı': ZAMAN_BASLIGI,
  'Ad Soyad': 'Ad Soyad',
  'Full name': 'Ad Soyad',
  'E-posta adresin': 'E-posta',
  'Your email address': 'E-posta',
  'Telefon numaran': 'Telefon',
  'Your phone number': 'Telefon',
  'Bölümün': 'Bölüm',
  'Your department': 'Bölüm',
  'Üniversite ve bölüm': 'Bölüm',
  'University and department': 'Bölüm',
  'Kaçıncı sınıftasın?': 'Sınıf',
  'What year are you in?': 'Sınıf',
  "Voltaris'i nereden duydun?": 'Bizi nereden duydu',
  'Where did you hear about Voltaris?': 'Bizi nereden duydu',
  "Voltaris'e neden katılmak istiyorsun? Bizi en çok bu cevap ilgilendiriyor, uzun ve mükemmel olmak zorunda değil.":
    'Neden katılmak istiyor',
  "Why do you want to join Voltaris? This is the answer we care about most — it doesn't have to be long or perfect.":
    'Neden katılmak istiyor',
  'Eklemek istediğin bir şey var mı? (Portfolyo, GitHub, çizim, video linki vb. de buraya bırakabilirsin)':
    'Eklemek istedikleri',
  "Anything else you'd like to add? (You can leave a portfolio, GitHub, sketch, or video link here too)":
    'Eklemek istedikleri',
  'CV / Ön Yazı': CV_BASLIGI,
};

/** Komite başına ayrı sayfa düzeninden kalan sayfalar. */
const ESKI_SAYFALAR = ['Mekanik', 'Elektrik', 'Destek', 'Mechanical', 'Electrical', 'Support', 'Diğer'];

/**
 * Komite sayfalarını tek "Başvurular" sayfasında birleştirir. Bir kez, Apps
 * Script düzenleyicisinden elle çalıştırılır (fonksiyon menüsünden seçip
 * "Çalıştır").
 *
 * Gerçek başvurular taşınır, sonra eski sayfa silinir. Hata ayıklarken
 * atılan "TEST… SILINEBILIR" satırları ve formdan kaldırılan soruların
 * cevapları taşınmaz. Kullanılmayan boş "İletişim" sayfası da gider; iletişim
 * mesajları çoktandır ayrı tabloya yazılıyor.
 *
 * Tekrar çalıştırmak zararsız: taşınacak eski sayfa kalmamışsa hiçbir şey yapmaz.
 */
function tekSayfayaTasi() {
  const kitap = SpreadsheetApp.getActiveSpreadsheet();
  const hedef = basvuruSayfasi();
  var tasinan = 0;
  var atlanan = 0;

  ESKI_SAYFALAR.forEach(function (ad) {
    const eski = kitap.getSheetByName(ad);
    if (!eski) return;

    const tablo = eski.getLastRow() > 0 ? eski.getDataRange().getValues() : [];
    const basliklar = tablo.length ? tablo[0] : [];
    const komite = komiteAdi(ad) || ad;

    for (var r = 1; r < tablo.length; r++) {
      const degerler = {};
      basliklar.forEach(function (baslik, i) {
        const yeni = ESKI_BASLIKLAR[baslik];
        if (yeni && tablo[r][i] !== '') degerler[yeni] = tablo[r][i];
      });

      const isim = String(degerler['Ad Soyad'] || '');
      if (!isim && !degerler['E-posta']) continue; // boş satır
      if (isim.indexOf('TEST') === 0 && isim.indexOf('SILINEBILIR') !== -1) {
        atlanan++;
        continue;
      }

      degerler[KOMITE_BASLIGI] = komite;
      // Numarayı metin olarak sakla. Sayı olarak yazılmış olanın baştaki 0'ı
      // zaten gitmiş; bu ancak bundan sonrasını korur.
      if (degerler['Telefon'] !== undefined) degerler['Telefon'] = "'" + String(degerler['Telefon']);

      satirEkle(hedef, degerler);
      tasinan++;
    }
    kitap.deleteSheet(eski);
  });

  const iletisim = kitap.getSheetByName('İletişim');
  if (iletisim && iletisim.getLastRow() <= 1) kitap.deleteSheet(iletisim);

  console.log(tasinan + ' başvuru taşındı, ' + atlanan + ' test satırı bırakıldı.');
}

/**
 * Bozuk kodlamayla yapıştırılmış bir kopyanın bıraktığı sayfayı onarır. Bir
 * kez, elle çalıştırılır; tekrar çalıştırmak zararsızdır.
 *
 * O kopya Türkçe harfleri Mac Roman olarak okumuştu ("Başvurular" →
 * "Ba≈üvurular", "Bölüm" → "B√∂l√ºm"), ama sütunları aynı sırayla açmıştı.
 * Sayfa, başlığı ASCII olduğu için bozulmadan kalan "Komite" sütunundan
 * tanınır. Doğru adlı bir sayfa yoksa bozuk olan onun adını alır; varsa —
 * dağıtımdan sonra gelen bir başvuru onu açmışsa — bozuk olanın satırları
 * ona taşınıp bozuk sayfa silinir. Başlık satırı her durumda yeniden yazılır.
 */
function bozukBasliklariDuzelt() {
  const kitap = SpreadsheetApp.getActiveSpreadsheet();
  const dogru = SUTUNLAR.map(function (s) { return s[1]; });
  const bozuklar = kitap.getSheets().filter(function (s) {
    return s.getName() !== BASVURU_SAYFASI && s.getLastColumn() >= 2 &&
      s.getRange(1, 2, 1, 1).getValues()[0][0] === KOMITE_BASLIGI;
  });

  var hedef = kitap.getSheetByName(BASVURU_SAYFASI);
  var tasinan = 0;
  bozuklar.forEach(function (bozuk) {
    if (!hedef) {
      bozuk.setName(BASVURU_SAYFASI);
      hedef = bozuk;
      return;
    }
    const tablo = bozuk.getDataRange().getValues();
    for (var r = 1; r < tablo.length; r++) {
      // Sütun sırası aynı, yalnızca adları bozuk: konuma göre eşle. Sonradan
      // açılan sütunların (CV) adı ASCII, olduğu gibi kalır.
      const degerler = {};
      tablo[0].forEach(function (baslik, i) {
        if (tablo[r][i] !== '') degerler[i < dogru.length ? dogru[i] : baslik] = tablo[r][i];
      });
      if (!degerler['Ad Soyad'] && !degerler['E-posta']) continue;
      const tel = degerler['Telefon'];
      if (tel !== undefined && String(tel).charAt(0) !== "'") degerler['Telefon'] = "'" + String(tel);
      satirEkle(hedef, degerler);
      tasinan++;
    }
    kitap.deleteSheet(bozuk);
  });

  if (hedef) hedef.getRange(1, 1, 1, dogru.length).setValues([dogru]).setFontWeight('bold');
  console.log(bozuklar.length + ' bozuk sayfa onarıldı, ' + tasinan + ' satır birleştirildi.');
}

/** Sitenin gönderdiği kimliği ya da adı ("elektrik", "Electrical") Türkçe ada çevirir. */
function komiteAdi(deger) {
  if (!deger) return '';
  for (var i = 0; i < KOMITELER.length; i++) {
    if (KOMITELER[i].esler.indexOf(String(deger)) !== -1) return KOMITELER[i].ad;
  }
  return '';
}

function sutunBasligi(cevap) {
  for (var i = 0; i < SUTUNLAR.length; i++) {
    if (SUTUNLAR[i][0] && SUTUNLAR[i][0] === cevap.id) return SUTUNLAR[i][1];
  }
  return cevap.soru;
}

/** "Başvurular" sayfası; yoksa başlıkları ve komite renkleriyle kurar. */
function basvuruSayfasi() {
  const kitap = SpreadsheetApp.getActiveSpreadsheet();
  var sayfa = kitap.getSheetByName(BASVURU_SAYFASI);
  if (sayfa) return sayfa;

  sayfa = sayfayiGetir(BASVURU_SAYFASI, kitap);
  basliklariEsitle(sayfa, SUTUNLAR.map(function (s) { return s[1]; }));

  // Satırın rengi Komite sütunundan gelir, satır nereye eklenirse eklensin.
  const veri = sayfa.getRange('A2:Z');
  sayfa.setConditionalFormatRules(KOMITELER.map(function (k) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$B2="' + k.ad + '"')
      .setBackground(k.renk)
      .setRanges([veri])
      .build();
  }));
  return sayfa;
}

/**
 * Bir başvuruyu kendi komitesinin grubunun sonuna ekler: Mekanik'ler, sonra
 * Elektrik'ler, sonra Destek'ler, her grubun içinde geliş sırasıyla. Sona
 * eklemek grupları birbirine karıştırırdı.
 */
function satirEkle(sayfa, degerler) {
  const istenen = SUTUNLAR.map(function (s) { return s[1]; }).concat(Object.keys(degerler));
  // Bilinen başlıklar iki listede de geçer; biri elle silinmişse iki kez açılmasın.
  basliklariEsitle(sayfa, istenen.filter(function (b, i) { return istenen.indexOf(b) === i; }));
  const basliklar = sayfa.getRange(1, 1, 1, sayfa.getLastColumn()).getValues()[0];
  const satir = basliklar.map(function (b) {
    return Object.prototype.hasOwnProperty.call(degerler, b) ? degerler[b] : '';
  });

  const sira = KOMITELER.map(function (k) { return k.ad; });
  const benim = sira.indexOf(degerler[KOMITE_BASLIGI]);
  const son = sayfa.getLastRow();
  var hedef = son; // Tanınmayan komite en sona.
  if (benim !== -1) {
    hedef = 1;
    if (son > 1) {
      const komiteSutunu = basliklar.indexOf(KOMITE_BASLIGI) + 1;
      const komiteler = sayfa.getRange(2, komiteSutunu, son - 1, 1).getValues();
      for (var i = 0; i < komiteler.length; i++) {
        const k = sira.indexOf(komiteler[i][0]);
        if (k !== -1 && k <= benim) hedef = i + 2;
      }
    }
  }

  sayfa.insertRowAfter(hedef);
  const yeni = sayfa.getRange(hedef + 1, 1, 1, satir.length);
  yeni.setValues([satir]);
  // insertRowAfter üstteki satırın biçimini kopyalar; başlığın altına
  // eklenen ilk satır kalın yazılmasın.
  yeni.setFontWeight('normal');
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

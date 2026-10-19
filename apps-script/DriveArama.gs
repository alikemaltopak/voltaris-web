/**
 * Takım paneli (/panel/) — Drive'da canlı arama.
 *
 * Ayrı bir Apps Script projesidir ve voltaris.official hesabında, o hesabın gördüğü Drive'da
 * (ortak drive'lar dahil) arar. Kurulum: apps-script/DRIVE_ARAMA.md. "Drive API" gelişmiş hizmeti
 * (v3) açık olmalı.
 *
 * Paneldeki Database balonu her aramada buraya üyenin Firebase giriş kimliğini (ID token) ve arama
 * metnini gönderir. Script önce kimliği Google'a doğrulatır, sonra kişinin üye listesinde olduğunu
 * Firestore'dan — o kişinin kendi yetkisiyle, yani firestore.rules'tan geçerek — okur. Üye değilse
 * hiçbir şey dönmez.
 *
 * Bir arama üç yoldan aday toplar ve hepsini aynı ölçüyle puanlar:
 *  1. Adı, açıklaması ya da içeriği kelimelerden birini taşıyan dosyalar (Drive'ın kendi araması).
 *  2. Adı kelimelerden birini taşıyan klasörler — klasör haritasında, Türkçe harfe duyarsız.
 *  3. O klasörlerin (alt klasörleri dahil) içindeki dosyalar. CAD/STEP/ZIP gibi içi okunamayan
 *     dosyalar çoğunlukla ancak bu yoldan, bulundukları klasörün adıyla bulunur.
 * Klasör haritası (bütün klasörlerin adı ve üst klasörü; ~18 bin klasörde çıkarması ~90 sn sürer) bir
 * aramayı bekletmemeli: önbellekte durur, önbellek boşalırsa Drive'daki kopyasından (HARITA_DOSYASI)
 * bir saniyede okunur. Kurulumda eklenen tetikleyici onu 4 saatte bir yeniden çıkarır.
 *
 * Kişisel veri taşıyan dosyalar (başvuru, kimlik, fatura…) ve Sponsorluk / Sosyal Medya klasörleri,
 * takım arşivi indeksinde olduğu gibi (panel/scripts/build_indeks.py) sonuçlara girmez.
 */

const AYAR = {
  // Firebase web uygulamasının API anahtarı ve proje kimliği (panelin .env'iyle aynı; gizli değil).
  firebaseApiKey: 'AIzaSyDUrIQz_v4QVktPuIKfvun1HI2Yu9baMiM',
  projeId: 'voltaris-sanal',
  // firestore.rules'taki kurucu() ve panel/firebase.js'teki KURUCULAR ile aynı.
  kurucular: ['voltaris.official@gmail.com', 'alikemaltopak@gmail.com'],
  // Boşsa her yer aranır. Klasör kimlikleri yazılırsa yalnız bu klasörlerin altındakiler.
  // Kimlik, klasörün Drive adresindeki /folders/ sonrasındaki kısımdır.
  kokKlasorler: [],
  enFazla: 25,
};

// build_indeks.py'deki SENS ile aynı kelimeler: adında ya da yolunda bunlar geçen dosya gösterilmez.
// Desen sade harflerle yazılır ve metin önce norm()'dan geçer. JavaScript'in /i bayrağı Türkçe büyük
// harfleri eşleştiremiyor: "KİMLİK", "İBAN", "SAĞLIK" doğrudan /kimlik|iban|sağlık/i'den kaçıyordu.
const GIZLI = /basvuru|kimlik|\btc\b|nufus|cv\b|ozgecmis|telefon|iletisim bilgi|dilekce|taahhut|muvafakat|uye listesi|banka|iban|fatura|dekont|saglik/;
// Bu adlı bir klasörün altındaki hiçbir şey gösterilmez (indekste de yoklar).
const GIZLI_KLASOR = /^(sponsorluk|sosyal medya)$/;
const KLASOR = 'application/vnd.google-apps.folder';
// Bir aramanın Drive'a harcayabileceği süre; panel 30 sn sonra vazgeçer.
const SURE_MS = 15000;

// Türkçe kurallarıyla küçük harf (İ→i, I→ı), sonra işaretsiz harf: "KİMLİK" ve "kimlik" aynı olur.
function norm(s) {
  return String(s).toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) {
    return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c];
  });
}

function doPost(e) {
  let istek;
  try { istek = JSON.parse(e.postData.contents); } catch (err) { return cevap({ ok: false, hata: 'istek' }); }
  const email = uyeMi(String(istek.token || ''));
  if (!email) return cevap({ ok: false, hata: 'uye-degil' });
  const q = String(istek.q || '').trim().slice(0, 80);
  if (q.length < 2) return cevap({ ok: true, sonuc: [], kesildi: false });
  try {
    return cevap(Object.assign({ ok: true }, ara(q)));
  } catch (err) {
    return cevap({ ok: false, hata: 'arama', mesaj: String(err && err.message || err).slice(0, 200) });
  }
}

// Dağıtımın çalıştığını tarayıcıdan görmek için: adresi açınca bu döner.
function doGet() {
  return cevap({ ok: true, servis: 'Voltaris panel · Drive araması' });
}

function cevap(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Kimliği doğrular ve kişi aktif üyeyse e-postasını döndürür. Sonuç 5 dakika önbellekte durur:
 * listeden çıkarılan biri en geç 5 dakika sonra arayamaz.
 */
function uyeMi(token) {
  if (!token || token.length > 4096) return null;
  const cache = CacheService.getScriptCache();
  const key = 'u:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 43);
  const c = cache.get(key);
  if (c) return c === '-' ? null : c;

  // Google, süresi geçmiş ya da başka projeye ait kimliği burada reddeder.
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + AYAR.firebaseApiKey, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) return null;
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  let email = null;
  if (u && u.emailVerified && u.email) {
    const em = String(u.email).toLowerCase();
    if (AYAR.kurucular.indexOf(em) >= 0) {
      email = em;
    } else {
      // Kişinin kendi kimliğiyle okunur: kurallar izin vermezse 403 gelir.
      const f = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + AYAR.projeId +
        '/databases/(default)/documents/uyeler/' + encodeURIComponent(em), {
        headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
      });
      if (f.getResponseCode() === 200) {
        const d = JSON.parse(f.getContentText()).fields || {};
        if (!(d.aktif && d.aktif.booleanValue === false)) email = em;
      }
    }
  }
  cache.put(key, email || '-', 300);
  return email;
}

/* ---------- klasör haritası ---------- */

// Haritanın Drive'daki kopyası; kimliği script özelliklerinde. Yalnız voltaris.official görür.
const HARITA_DOSYASI = 'voltaris-panel-klasor-haritasi.json';

// Drive'daki bütün klasörler: { id: [ad, üstKlasörId] }.
// Önbellekte parça parça durur (bir anahtar ≤100 KB). Google önbelleği vaktinden önce boşaltabilir;
// o zaman Drive'daki kopyadan okunur. Yeniden çıkarmak yalnız `yenile` ile (tetikleyici, kurulum) olur.
function klasorHaritasi(yenile) {
  const cache = CacheService.getScriptCache();
  if (!yenile) {
    const n = Number(cache.get('kh:n') || 0);
    if (n) {
      const parcalar = cache.getAll(Array.from({ length: n }, function (_, i) { return 'kh:' + i; }));
      if (Object.keys(parcalar).length === n) {
        return JSON.parse(Array.from({ length: n }, function (_, i) { return parcalar['kh:' + i]; }).join(''));
      }
    }
    const dosya = haritaDosyasi(false);
    if (dosya) {
      const metin = dosya.getBlob().getDataAsString();
      onbellegeYaz(cache, metin);
      return JSON.parse(metin);
    }
  }
  const harita = {};
  let sayfa;
  do {
    const r = Drive.Files.list({
      q: "mimeType = '" + KLASOR + "' and trashed = false", pageSize: 1000, pageToken: sayfa,
      fields: 'nextPageToken, files(id, name, parents)', corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true,
    });
    (r.files || []).forEach(function (f) { harita[f.id] = [f.name, (f.parents || [])[0] || '']; });
    sayfa = r.nextPageToken;
  } while (sayfa);
  const metin = JSON.stringify(harita);
  onbellegeYaz(cache, metin);
  const dosya = haritaDosyasi(true);
  dosya.setContent(metin);
  return harita;
}

function onbellegeYaz(cache, metin) {
  const parca = 90000, n = Math.ceil(metin.length / parca), yaz = { 'kh:n': String(n) };
  for (let i = 0; i < n; i++) yaz['kh:' + i] = metin.slice(i * parca, (i + 1) * parca);
  cache.putAll(yaz, 21600);
}

// Drive'daki kopya; `olustur` ile yoksa açılır.
function haritaDosyasi(olustur) {
  const ozellik = PropertiesService.getScriptProperties();
  const id = ozellik.getProperty('haritaDosyasi');
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (err) { /* silinmiş */ } }
  if (!olustur) return null;
  const f = DriveApp.createFile(HARITA_DOSYASI, '{}', 'application/json');
  f.setDescription('Voltaris paneli Drive araması bu dosyayı kullanır (apps-script/DriveArama.gs). Silme; silinirse kendiliğinden yeniden oluşur.');
  ozellik.setProperty('haritaDosyasi', f.getId());
  return f;
}

// Tetikleyici bunu çağırır: harita güncel ve sıcak kalır, aramalar beklemez.
function klasorHaritasiniYenile() { klasorHaritasi(true); }

// Bir klasörün yolu ("A/B/C") ya da gizli bir klasörün altındaysa / kök klasörlerin dışındaysa null.
function yolBulucu(harita) {
  const bellek = {};
  const kok = AYAR.kokKlasorler;
  function yol(id, derinlik) {
    if (!id || !harita[id]) return { p: '', ok: kok.length === 0 };   // Drive'ım kökü ya da görülmeyen üst
    if (bellek[id]) return bellek[id];
    const ad = harita[id][0];
    let r;
    if (GIZLI_KLASOR.test(norm(ad).trim())) r = { p: null, ok: false };
    else if (kok.indexOf(id) >= 0) r = { p: ad, ok: true };
    else if (derinlik > 40) r = { p: ad, ok: kok.length === 0 };
    else {
      const u = yol(harita[id][1], derinlik + 1);
      r = u.p === null ? u : { p: u.p ? u.p + '/' + ad : ad, ok: u.ok };
    }
    return (bellek[id] = r);
  }
  return function (klasorId) {
    const r = yol(klasorId, 0);
    return r.ok && r.p !== null ? r.p : null;
  };
}

/* ---------- arama ---------- */

function ara(q) {
  const t0 = Date.now();
  const sureVar = function () { return Date.now() - t0 < SURE_MS; };
  const ham = q.toLocaleLowerCase('tr').split(/\s+/).filter(function (k) { return k.length >= 2; }).slice(0, 6);
  const kel = ham.map(norm);
  if (!kel.length) return { sonuc: [], kesildi: false };
  const harita = klasorHaritasi(false);
  const yol = yolBulucu(harita);
  const aday = {};   // id → { id, ad, klasor, tur, t, aciklama, icerik, dizin }

  function ekle(f, yoldan) {
    if (aday[f.id]) { if (yoldan === 'icerik') aday[f.id].icerik = true; return; }
    aday[f.id] = { id: f.id, ad: f.name, ust: (f.parents || [])[0] || '', mime: f.mimeType, t: f.modifiedTime || '',
      aciklama: f.description || '', icerik: yoldan === 'icerik' };
  }
  function listele(sorgu, enFazla, yoldan) {
    let sayfa, alinan = 0;
    do {
      const r = Drive.Files.list({
        q: sorgu, pageSize: Math.min(500, enFazla - alinan), pageToken: sayfa,
        fields: 'nextPageToken, files(id, name, mimeType, parents, modifiedTime, description)',
        corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true,
      });
      (r.files || []).forEach(function (f) { ekle(f, yoldan); });
      alinan += (r.files || []).length; sayfa = r.nextPageToken;
    } while (sayfa && alinan < enFazla && sureVar());
    return !!sayfa;
  }
  const kac = function (k) { return k.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };
  // Drive'ın kendi aramasına hem yazıldığı gibi hem işaretsiz hâliyle sorulur ("şasi" ve "sasi").
  const terimler = [];
  ham.forEach(function (k, i) { terimler.push(k); if (kel[i] !== k) terimler.push(kel[i]); });
  let tasti = false;

  // 1. adı / açıklaması / içeriği eşleşen dosyalar
  tasti = listele("trashed = false and mimeType != '" + KLASOR + "' and (" +
    terimler.map(function (k) { return "name contains '" + kac(k) + "' or fullText contains '" + kac(k) + "'"; }).join(' or ') + ')',
    400, 'icerik') || tasti;

  // 2. adı eşleşen klasörler (haritada, Türkçe harfe duyarsız)
  const eslesen = Object.keys(harita).filter(function (id) {
    const a = norm(harita[id][0]); return kel.some(function (k) { return a.indexOf(k) >= 0; });
  });
  eslesen.forEach(function (id) {
    if (!aday[id]) aday[id] = { id: id, ad: harita[id][0], ust: harita[id][1], mime: KLASOR, t: '', aciklama: '', icerik: false };
  });

  // 3. o klasörlerin altındaki dosyalar: önce alt klasörler haritadan, sonra içerikleri parça parça
  const cocuk = {};
  Object.keys(harita).forEach(function (id) { const u = harita[id][1]; (cocuk[u] = cocuk[u] || []).push(id); });
  const altlar = [], gorulen = {};
  const kuyruk = eslesen.slice(0, 40);
  while (kuyruk.length && altlar.length < 300) {
    const id = kuyruk.shift(); if (gorulen[id]) continue; gorulen[id] = true; altlar.push(id);
    (cocuk[id] || []).forEach(function (c) { kuyruk.push(c); });
  }
  if (kuyruk.length) tasti = true;
  for (let i = 0; i < altlar.length && sureVar(); i += 40) {
    tasti = listele("trashed = false and mimeType != '" + KLASOR + "' and (" +
      altlar.slice(i, i + 40).map(function (id) { return "'" + id + "' in parents"; }).join(' or ') + ')', 300, 'dizin') || tasti;
  }
  if (!sureVar()) tasti = true;

  // puanla: her kelime için ad 3, açıklama 2.5, klasör yolu 1.5; hiçbiri değilse ve Drive içerikte
  // bulduysa bir kelime içerikte sayılır. Bütün kelimeleri tutanlar öne geçer.
  const sonuc = [];
  Object.keys(aday).forEach(function (id) {
    const a = aday[id];
    const p = yol(a.ust);
    if (p === null) return;
    if (a.mime === KLASOR && yol(id) === null) return;   // gizli klasörün kendisi
    if (a.ad === HARITA_DOSYASI) return;
    const na = norm(a.ad), nd = norm(a.aciklama), np = norm(p);
    if (GIZLI.test(na + ' ' + np)) return;
    let s = 0, tutan = 0;
    kel.forEach(function (k) {
      if (na.indexOf(k) >= 0) { s += 3; tutan++; } else if (nd.indexOf(k) >= 0) { s += 2.5; tutan++; } else if (np.indexOf(k) >= 0) { s += 1.5; tutan++; }
    });
    if (a.icerik && tutan < kel.length) { s += 1; tutan++; }
    if (!tutan) return;
    s *= 0.5 + 0.5 * tutan / kel.length;
    if (a.mime === KLASOR) s += 0.3;
    sonuc.push({ s: s, t: a.t, r: a, p: p || "Drive'ım" });
  });
  sonuc.sort(function (x, y) { return y.s - x.s || (y.t > x.t ? 1 : y.t < x.t ? -1 : 0); });
  return {
    toplam: sonuc.length,
    kesildi: tasti || sonuc.length > AYAR.enFazla,
    sonuc: sonuc.slice(0, AYAR.enFazla).map(function (x) {
      const a = x.r, klasor = a.mime === KLASOR;
      return { n: a.ad, p: x.p, t: a.t, f: klasor ? 'klasör' : tur(a.mime, a.ad),
        u: klasor ? 'https://drive.google.com/drive/folders/' + a.id : 'https://drive.google.com/file/d/' + a.id + '/view' };
    }),
  };
}

function tur(mime, ad) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(ad);
  if (m) return m[1].toLowerCase();
  return { 'application/vnd.google-apps.document': 'doküman', 'application/vnd.google-apps.spreadsheet': 'e-tablo',
    'application/vnd.google-apps.presentation': 'sunu', 'application/pdf': 'pdf' }[mime] || '';
}

/* ---------- kurulum ---------- */

// Kurulumda bir kez editörden çalıştır: izinleri sorar, klasör haritasını çıkarır, tazelemeyi kurar ve
// bir deneme araması yapar. Tekrar çalıştırmak zararsızdır: eski tetikleyici silinip yenisi kurulur.
// 4 saatte bir: harita ~90 sn sürüyor, ücretsiz hesapların günlük tetikleyici süresi 90 dakika ve
// everyHours yalnız 1, 2, 4, 6, 8, 12 kabul ediyor. Önbellek 6 saat dayanır.
function kurulum() {
  const t = Date.now();
  const harita = klasorHaritasi(true);
  Logger.log('Klasör haritası: ' + Object.keys(harita).length + ' klasör, ' + (Date.now() - t) + ' ms');
  ScriptApp.getProjectTriggers().forEach(function (x) { if (x.getHandlerFunction() === 'klasorHaritasiniYenile') ScriptApp.deleteTrigger(x); });
  ScriptApp.newTrigger('klasorHaritasiniYenile').timeBased().everyHours(4).create();
  Logger.log('Tazeleme: 4 saatte bir. Drive\'daki kopya: ' + HARITA_DOSYASI);
  // önbellek boşalınca dosyadan okumanın süresi
  const cache = CacheService.getScriptCache();
  cache.remove('kh:n');
  const d0 = Date.now(); klasorHaritasi(false);
  Logger.log('Önbellek boşken haritayı dosyadan okuma: ' + (Date.now() - d0) + ' ms');
  const d = Date.now(), r = ara('şasi');
  Logger.log('Deneme araması "şasi": ' + r.toplam + ' sonuç, ' + (Date.now() - d) + ' ms. İlk üçü: ' +
    JSON.stringify(r.sonuc.slice(0, 3).map(function (x) { return x.p + '/' + x.n; })));
  UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/', { muteHttpExceptions: true });
}

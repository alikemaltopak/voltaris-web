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
 *
 * Aynı script takım klasörlerinin paylaşımını üye listesine uydurur (aşağıda "Drive erişimi"): aktif
 * üyeler yalnız okuyucu, pasife alınan ya da listeden çıkarılan üyenin erişimi kaldırılır.
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
  // Üyelerin okuyucu olacağı yer. 'hepsi': Drive'ım'ın en üstündeki, voltaris.official'a ait bütün klasörler
  // (paylasmaHaric dışında); sonradan açılan klasörler de kendiliğinden girer. En üstte klasörsüz duran
  // dosyalar paylaşılmaz: paylaşılacak dosya bir klasöre konur. Ya da yalnız belirli klasörler:
  // ['1AbC…', …] (kimlikler, kokKlasorler gibi). Boşsa paylaşıma dokunulmaz.
  paylasim: [],
  // paylasim 'hepsi' iken paylaşılmayacak en üst klasörler, ör. başvuruların durduğu bir "Yönetim" klasörü.
  paylasmaHaric: [],
  // Paylaşılan klasörlerin altında kişisel veri adlı bir klasör ya da dosya (GIZLI, GIZLI_KLASOR) varsa kimseye
  // erişim verilmez. Adı yanlışlıkla desene takılan biri ("Telefon tutucu") kontrol edilip kimliği buraya yazılır.
  gizliDegil: [],
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
  if (istek.islem === 'esitle') {
    if (AYAR.kurucular.indexOf(email) < 0) return cevap({ ok: false, hata: 'kurucu-degil' });
    try {
      return cevap(Object.assign({ ok: true }, esitle(String(istek.token))));
    } catch (err) {
      return cevap({ ok: false, hata: err.kod || 'esitleme', mesaj: String(err && err.message || err).slice(0, 300) });
    }
  }
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

/* ---------- Drive erişimi: üyeler yalnız okuyucu ---------- */

// Kurucu panelde bir üyeyi ekleyince, pasife alınca ya da listeden çıkarınca panel buraya `islem: 'esitle'`
// gönderir. Script üye listesini o kurucunun kimliğiyle Firestore'dan okur ve paylaşılan köklerde (kokler()):
//  - aktif üyeyi okuyucu yapar (yoksa ekler, düzenleyiciyse okuyucuya çeker; bildirim e-postası gitmez),
//  - pasif ya da listeden çıkarılmış üyenin erişimini kaldırır.
// Kurucuların ve listede hiç olmamış kişilerin (danışman, eski kaptan…) erişimine dokunmaz, yalnız raporlar.
// Klasörü paylaşmak altındakileri de paylaşır; ama bir alt klasör ya da dosya bir üyeyle ayrıca
// paylaşılmışsa o izin kökten bağımsızdır. Onları denetle() bulur: eşitlemenin sonunda kısa bir tur,
// sonra saatte bir tetikleyiciyle (kurulum). Çıkarılan bir üye, ağaçta bir izni kalmayana kadar izlenir.
const YAZAR = { writer: true, fileOrganizer: true, organizer: true };
// The panel gives up after 180 s, so a sync hands out access for at most VERME_SURE_MS and leaves the rest
// to the next press or to the hourly run, which grants from the stored member list.
const VERME_SURE_MS = 120000, ESITLEME_SURE_MS = 20000, DENETIM_SURE_MS = 60000;

// Paylaşılan kökler. 'hepsi' her çalışmada Drive'ım'dan yeniden okunur: yeni açılan klasör de girer.
let KOKLER = null;
function kokler() {
  if (KOKLER) return KOKLER;
  if (AYAR.paylasim !== 'hepsi') return (KOKLER = (AYAR.paylasim || []).slice());
  const k = [];
  let sayfa;
  do {
    const r = Drive.Files.list({ q: "'root' in parents and 'me' in owners and trashed = false and mimeType = '" + KLASOR + "'",
      pageSize: 200, pageToken: sayfa, fields: 'nextPageToken, files(id, name)' });
    (r.files || []).forEach(function (f) { if (AYAR.paylasmaHaric.indexOf(f.id) < 0) k.push(f.id); });
    sayfa = r.nextPageToken;
  } while (sayfa);
  return (KOKLER = k);
}

function hataKod(kod, mesaj) { const e = new Error(mesaj || kod); e.kod = kod; return e; }
const kurucuMu = function (e) { return AYAR.kurucular.indexOf(e) >= 0; };
const tekil = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
// Drive sorgusunda tırnak içine girecek metin
const sorguMetni = function (k) { return String(k).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); };

// Eşitlemeler arasında saklanan durum: verilen = aktif üyeler, cekilecek = erişimi kaldırılacaklar.
function paylasimDurumu() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('paylasim') || '') || { verilen: [], cekilecek: [] }; }
  catch (err) { return { verilen: [], cekilecek: [] }; }
}
function paylasimDurumuYaz(d) { PropertiesService.getScriptProperties().setProperty('paylasim', JSON.stringify(d)); }

function esitle(token) {
  if (!kokler().length) throw hataKod('paylasim-yok');
  const kilit = LockService.getScriptLock();
  if (!kilit.tryLock(30000)) throw hataKod('mesgul');
  try {
    const liste = uyeListesi(token);
    const aktif = liste.filter(function (u) { return u.aktif && !kurucuMu(u.email); }).map(function (u) { return u.email; });
    const pasif = liste.filter(function (u) { return !u.aktif; }).map(function (u) { return u.email; });
    const onceki = paylasimDurumu();
    // Listeden silinen üye artık listede görünmez; daha önce erişim verildiyse `verilen`den hatırlanır.
    const cekilecek = tekil(onceki.verilen.concat(onceki.cekilecek, pasif))
      .filter(function (e) { return aktif.indexOf(e) < 0 && !kurucuMu(e); });
    const listede = {}; liste.forEach(function (u) { listede[u.email] = true; });

    const harita = klasorHaritasi(false);
    const r = kokleriEsitle(harita, aktif, cekilecek, listede);
    paylasimDurumuYaz({ verilen: aktif, cekilecek: cekilecek });
    const d = denetle(harita, r.yarim ? 5000 : ESITLEME_SURE_MS);
    r.dosya = d; r.hatalar = r.hatalar.concat(d.hatalar).slice(0, 10);
    return r;
  } finally { kilit.releaseLock(); }
}

// Her kökte: aktif üye okuyucu, çekilecek olanın izni kaldırılır. `listede` (eşitlemede) verilirse listede
// olmayan düzenleyiciler raporlanır; saatlik çalışma onu bilmez. Süre dolarsa kalan erişimler sonraya kalır.
function kokleriEsitle(harita, aktif, cekilecek, listede) {
  const t0 = Date.now();
  const gizli = gizliler(harita);
  const r = { uye: aktif.length, kok: kokler().length, eklenen: [], googleYok: [], okuraCekilen: [], cikarilan: [], disaridaYazar: [], herkeseAcik: [], gizli: gizli, yarim: false, hatalar: [] };
  kokler().forEach(function (kok) {
    let izinler;
    try { izinler = kokIzinleri(kok); } catch (err) { r.hatalar.push(kok + ': ' + err.message); return; }
    // erişim kaldırmak süreye bakmaz: pasif üye beklememeli
    cekilecek.forEach(function (e) {
      const p = izinler.kisi[e];
      if (p && p.role !== 'owner') dene(r, function () { Drive.Permissions.remove(kok, p.id, { supportsAllDrives: true }); r.cikarilan.push(e); });
    });
    aktif.forEach(function (e) {
      const p = izinler.kisi[e];
      if (p) { if (YAZAR[p.role]) dene(r, function () { Drive.Permissions.update({ role: 'reader' }, kok, p.id, { supportsAllDrives: true }); r.okuraCekilen.push(e); }); return; }
      // kişisel veri adlı bir klasör ya da dosya paylaşımın altındaysa kimseye yeni erişim verilmez
      if (gizli.length) return;
      if (Date.now() - t0 > VERME_SURE_MS) { r.yarim = true; return; }
      okuyucuEkle(r, kok, e);
    });
    if (listede) Object.keys(izinler.kisi).forEach(function (e) {
      if (!listede[e] && !kurucuMu(e) && YAZAR[izinler.kisi[e].role]) r.disaridaYazar.push(e);
    });
    if (izinler.herkes) r.herkeseAcik.push(kok);
  });
  ['eklenen', 'googleYok', 'okuraCekilen', 'cikarilan', 'disaridaYazar'].forEach(function (k) { r[k] = tekil(r[k]); });
  return r;
}

// Drive shares silently only with Google accounts; for any other address it insists on an invitation
// e-mail. Such a member stays without Drive access (and cannot sign in to the panel either) until
// their entry is changed to the address of a Google account.
function okuyucuEkle(r, kok, e) {
  try {
    Drive.Permissions.create({ type: 'user', role: 'reader', emailAddress: e }, kok, { sendNotificationEmail: false, supportsAllDrives: true });
    r.eklenen.push(e);
  } catch (err) {
    const m = String(err && err.message || err);
    if (/google account|notify people|sendNotificationEmail|invalidSharingRequest/i.test(m)) r.googleYok.push(e);
    else if (r.hatalar.length < 10) r.hatalar.push(m.slice(0, 200));
  }
}

function dene(r, is) { try { is(); } catch (err) { if (r.hatalar.length < 10) r.hatalar.push(String(err && err.message || err).slice(0, 200)); } }

// Üye listesi, kurucunun kendi kimliğiyle: firestore.rules uyeler'i yalnız üyelere okutur.
function uyeListesi(token) {
  const liste = [];
  let sayfa = '';
  do {
    const f = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + AYAR.projeId + '/databases/(default)/documents/uyeler?pageSize=300' +
      (sayfa ? '&pageToken=' + encodeURIComponent(sayfa) : ''), { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (f.getResponseCode() !== 200) throw hataKod('uye-listesi', 'Üye listesi okunamadı (HTTP ' + f.getResponseCode() + ')');
    const d = JSON.parse(f.getContentText());
    (d.documents || []).forEach(function (x) {
      const alan = x.fields || {};
      liste.push({ email: decodeURIComponent(x.name.split('/').pop()).toLowerCase(), aktif: !(alan.aktif && alan.aktif.booleanValue === false) });
    });
    sayfa = d.nextPageToken;
  } while (sayfa);
  return liste;
}

// Bir kök klasörün izinleri: { kisi: { e-posta: { id, role } }, herkes: bağlantıya sahip herkese açık mı }
function kokIzinleri(kok) {
  const kisi = {};
  let herkes = false, sayfa;
  do {
    const r = Drive.Permissions.list(kok, { fields: 'nextPageToken, permissions(id, type, role, emailAddress)', pageSize: 100, pageToken: sayfa, supportsAllDrives: true });
    (r.permissions || []).forEach(function (p) {
      if (p.type === 'anyone') herkes = true;
      if (p.type === 'user' && p.emailAddress) kisi[String(p.emailAddress).toLowerCase()] = { id: p.id, role: p.role };
    });
    sayfa = r.nextPageToken;
  } while (sayfa);
  return { kisi: kisi, herkes: herkes };
}

// Klasör kimliği → paylaşılan bir kökün altında mı (klasör haritasından)
function agacBulucu(harita) {
  const bellek = {}, kok = kokler();
  function bak(id, derinlik) {
    if (!id) return false;
    if (kok.indexOf(id) >= 0) return true;
    if (id in bellek) return bellek[id];
    return (bellek[id] = derinlik < 60 && !!harita[id] && bak(harita[id][1], derinlik + 1));
  }
  return function (id) { return bak(id, 0); };
}

// Drive'ın ad araması kelime başını eşler; aday dosyalar bunlarla toplanıp GIZLI ile süzülür.
const GIZLI_ARA = ['basvuru', 'başvuru', 'kimlik', 'nüfus', 'nufus', 'fatura', 'dekont', 'iban', 'banka', 'özgeçmiş', 'ozgecmis',
  'cv', 'dilekçe', 'taahhüt', 'muvafakat', 'telefon', 'iletişim', 'sağlık', 'saglik', 'üye'];

// Paylaşımın altında adı kişisel veriyi andıran klasör ve dosyalar, yollarıyla
function gizliler(harita) {
  const agacta = agacBulucu(harita);
  const yolu = function (id) { const p = []; for (let x = id, d = 0; x && harita[x] && d < 60; x = harita[x][1], d++) p.unshift(harita[x][0]); return p.join('/'); };
  // gizliDegil'e yazılan bir klasörün altındaki her şey de kontrol edilmiş sayılır
  const muaf = function (id) { for (let x = id, d = 0; x && d < 60; x = harita[x] && harita[x][1], d++) if (AYAR.gizliDegil.indexOf(x) >= 0) return true; return false; };
  const bulunan = Object.keys(harita).filter(function (id) {
    const ad = norm(harita[id][0]).trim();
    return (GIZLI_KLASOR.test(ad) || GIZLI.test(ad)) && !muaf(id) && agacta(id);
  }).map(yolu);
  for (let i = 0; i < GIZLI_ARA.length && bulunan.length < 20; i += 10) {
    const r = Drive.Files.list({ q: '(' + GIZLI_ARA.slice(i, i + 10).map(function (k) { return "name contains '" + k + "'"; }).join(' or ') +
      ") and mimeType != '" + KLASOR + "' and trashed = false", pageSize: 500, fields: 'files(id, name, parents)',
      corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true });
    (r.files || []).forEach(function (f) {
      const ust = (f.parents || [])[0];
      if (GIZLI.test(norm(f.name)) && AYAR.gizliDegil.indexOf(f.id) < 0 && !muaf(ust) && agacta(ust) && bulunan.length < 20) bulunan.push(yolu(ust) + '/' + f.name + ' [' + f.id + ']');
    });
  }
  return tekil(bulunan).slice(0, 20);
}

// Ağaçtaki dosya ve klasörlerde kökten bağımsız kalmış izinleri düzeltir, süre yettiğince:
// çekilecekler için her izni kaldırır, aktif üyelerin yazma izinlerini okumaya çeker. Bir de aktif üyelerin
// sahibi olduğu dosyaları sayar: sahip kendi dosyasını her zaman değiştirip silebilir ve ayrılınca da tutar.
function denetle(harita, sureMs) {
  const t0 = Date.now(), vakit = function () { return Date.now() - t0 < sureMs; };
  const d = paylasimDurumu();
  const sonuc = { kaldirilan: 0, okuraCekilen: 0, sahip: {}, bekleyen: false, hatalar: [] };
  if (!kokler().length) return sonuc;
  const agacta = agacBulucu(harita || klasorHaritasi(false));
  const agacDosyasi = function (f) { return kokler().indexOf(f.id) >= 0 || (f.parents || []).some(agacta); };
  const izinDuzelt = function (f, eslesen, rol) {
    (f.permissions || []).forEach(function (p) {
      const e = String(p.emailAddress || '').toLowerCase();
      if (p.type !== 'user' || !eslesen[e] || p.role === 'owner') return;
      if (rol === 'kaldir') dene(sonuc, function () { Drive.Permissions.remove(f.id, p.id, { supportsAllDrives: true }); sonuc.kaldirilan++; });
      else if (YAZAR[p.role]) dene(sonuc, function () { Drive.Permissions.update({ role: 'reader' }, f.id, p.id, { supportsAllDrives: true }); sonuc.okuraCekilen++; });
    });
  };
  // 15'er kişilik gruplar: tek sorgu, sorgu metni kısa kalır
  function gruplar(a) { const g = []; for (let i = 0; i < a.length; i += 15) g.push(a.slice(i, i + 15)); return g; }
  function tara(kisiler, kosul, her) {
    gruplar(kisiler).forEach(function (grup) {
      const q = '(' + grup.map(function (e) { return kosul.map(function (k) { return "'" + sorguMetni(e) + "' in " + k; }).join(' or '); }).join(' or ') + ') and trashed = false';
      let sayfa;
      do {
        if (!vakit()) { sonuc.bekleyen = true; return; }
        const r = Drive.Files.list({ q: q, pageSize: 200, pageToken: sayfa, fields: 'nextPageToken, files(id, parents, owners(emailAddress), permissions(id, type, role, emailAddress))',
          corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true });
        (r.files || []).filter(agacDosyasi).forEach(her);
        sayfa = r.nextPageToken;
      } while (sayfa);
    });
  }
  const esle = function (a) { const m = {}; a.forEach(function (e) { m[e] = true; }); return m; };
  const cek = esle(d.cekilecek), ver = esle(d.verilen), kalan = {};
  tara(d.cekilecek, ['readers', 'writers'], function (f) {
    (f.permissions || []).forEach(function (p) { const e = String(p.emailAddress || '').toLowerCase(); if (cek[e]) kalan[e] = true; });
    izinDuzelt(f, cek, 'kaldir');
  });
  tara(d.verilen, ['writers'], function (f) { izinDuzelt(f, ver, 'oku'); });
  tara(d.verilen, ['owners'], function (f) {
    (f.owners || []).forEach(function (o) { const e = String(o.emailAddress || '').toLowerCase(); if (ver[e]) sonuc.sahip[e] = (sonuc.sahip[e] || 0) + 1; });
  });
  // Ağaçta izni görülmeyen çıkarılmış üye artık izlenmez. Süre bittiyse hepsi bir sonraki tura kalır.
  if (!sonuc.bekleyen) paylasimDurumuYaz({ verilen: d.verilen, cekilecek: d.cekilecek.filter(function (e) { return kalan[e]; }) });
  return sonuc;
}

// Tetikleyici bunu saatte bir çağırır (kurulum): son eşitlemedeki listeyle kökleri tamamlar (yarım kalan
// erişimler, 'hepsi'de yeni açılmış klasörler), sonra ağacı denetler.
function driveDenetimi() {
  const kilit = LockService.getScriptLock();
  if (!kilit.tryLock(1000)) return;
  try {
    const d = paylasimDurumu(), harita = klasorHaritasi(false);
    const r = kokler().length ? kokleriEsitle(harita, d.verilen, d.cekilecek, null) : {};
    Logger.log(JSON.stringify({ kokler: r, dosya: denetle(harita, DENETIM_SURE_MS) }));
  } finally { kilit.releaseLock(); }
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
  ScriptApp.getProjectTriggers().forEach(function (x) { if (x.getHandlerFunction() === 'driveDenetimi') ScriptApp.deleteTrigger(x); });
  if (kokler().length) {
    ScriptApp.newTrigger('driveDenetimi').timeBased().everyHours(1).create();
    const g = gizliler(harita);
    Logger.log('Drive erişimi: ' + kokler().length + ' klasör' + (AYAR.paylasim === 'hepsi' ? ' (Drive\'ım\'ın en üstündeki bütün klasörler)' : '') + ', denetim saatte bir.' +
      (g.length ? ' DİKKAT, paylaşımın altında kişisel veri adlı klasör ya da dosyalar var; bunlar taşınmadan ya da AYAR.gizliDegil\'e yazılmadan kimseye erişim verilmez: ' + g.join(' · ') : ''));
  }
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

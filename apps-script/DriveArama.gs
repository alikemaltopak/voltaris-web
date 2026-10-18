/**
 * Takım paneli (/panel/) — Drive'da canlı arama.
 *
 * Ayrı bir Apps Script projesidir ve voltaris.official hesabında, o hesabın Drive'ında arar
 * (kurulum: apps-script/DRIVE_ARAMA.md). Paneldeki Database balonu her aramada buraya üyenin
 * Firebase giriş kimliğini (ID token) ve arama metnini gönderir. Script önce kimliği Google'a
 * doğrulatır, sonra kişinin üye listesinde olduğunu Firestore'dan — o kişinin kendi yetkisiyle,
 * yani firestore.rules'tan geçerek — okur. Üye değilse hiçbir şey dönmez.
 *
 * Dosya adı ve içerik aranır; Drive'a yeni eklenen dosya kendiliğinden aramaya girer.
 * Kişisel veri taşıyan dosyalar (başvuru, kimlik, fatura…) ve Sponsorluk / Sosyal Medya
 * klasörleri, takım arşivi indeksinde olduğu gibi (panel/scripts/build_indeks.py) sonuçlara girmez.
 */

const AYAR = {
  // Firebase web uygulamasının API anahtarı ve proje kimliği (panelin .env'iyle aynı; gizli değil).
  firebaseApiKey: 'AIzaSyDUrIQz_v4QVktPuIKfvun1HI2Yu9baMiM',
  projeId: 'voltaris-sanal',
  // firestore.rules'taki kurucu() ve panel/firebase.js'teki KURUCULAR ile aynı.
  kurucular: ['voltaris.official@gmail.com', 'alikemaltopak@gmail.com'],
  // Boşsa bütün Drive aranır. Klasör kimlikleri yazılırsa yalnız bu klasörlerin altındakiler.
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

function ara(q) {
  const kelimeler = q.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean).slice(0, 6)
    .map(function (k) { return k.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); });
  // her kelime ya adda ya içerikte geçmeli
  const sorgu = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and " +
    kelimeler.map(function (k) { return "(title contains '" + k + "' or fullText contains '" + k + "')"; }).join(' and ');
  const bul = DriveApp.searchFiles(sorgu);
  const yol = yolBulucu();
  const sonuc = [];
  let bakilan = 0;
  while (bul.hasNext() && sonuc.length < AYAR.enFazla && bakilan < 150) {
    const f = bul.next(); bakilan++;
    const p = yol(f);
    if (p === null) continue;
    const ad = f.getName();
    if (GIZLI.test(norm(ad + ' ' + p))) continue;
    sonuc.push({ n: ad, u: f.getUrl(), p: p, t: f.getLastUpdated().toISOString(), f: tur(f.getMimeType(), ad) });
  }
  return { sonuc: sonuc, kesildi: bul.hasNext() };
}

/**
 * Dosyanın klasör yolunu bulur; gizli bir klasörün altındaysa ya da kök klasörlerin dışındaysa null.
 * Klasörler 6 saat önbellekte durur, böylece aynı klasördeki dosyalar için Drive'a tekrar gidilmez.
 */
function yolBulucu() {
  const cache = CacheService.getScriptCache();
  const bellek = {};
  const kok = AYAR.kokKlasorler;
  function klasor(folder) {
    const id = folder.getId();
    if (bellek[id]) return bellek[id];
    const c = cache.get('k:' + id);
    if (c) return (bellek[id] = JSON.parse(c));
    const ad = folder.getName();
    const ustler = folder.getParents();
    let r;
    if (GIZLI_KLASOR.test(norm(ad).trim())) r = { p: null, ok: false };
    else if (kok.indexOf(id) >= 0) r = { p: ad, ok: true };
    else if (!ustler.hasNext()) r = { p: '', ok: kok.length === 0 };   // Drive'ım kökü
    else {
      const u = klasor(ustler.next());
      r = u.p === null ? u : { p: u.p ? u.p + '/' + ad : ad, ok: u.ok };
    }
    cache.put('k:' + id, JSON.stringify(r), 21600);
    return (bellek[id] = r);
  }
  return function (f) {
    const ustler = f.getParents();
    if (!ustler.hasNext()) return kok.length ? null : 'Benimle paylaşılanlar';
    const r = klasor(ustler.next());
    return r.ok && r.p !== null ? (r.p || 'Drive\'ım') : null;
  };
}

function tur(mime, ad) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(ad);
  if (m) return m[1].toLowerCase();
  return { 'application/vnd.google-apps.document': 'doküman', 'application/vnd.google-apps.spreadsheet': 'e-tablo',
    'application/vnd.google-apps.presentation': 'sunu', 'application/pdf': 'pdf' }[mime] || '';
}

// Kurulumda bir kez editörden çalıştır: Google, Drive'ı okuma ve dışarıya istek izinlerini sorar.
function izinleriVer() {
  Logger.log('Drive: ' + DriveApp.getRootFolder().getName());
  Logger.log('Deneme araması: ' + JSON.stringify(ara('şasi').sonuc.slice(0, 3)));
  UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/', { muteHttpExceptions: true });
}

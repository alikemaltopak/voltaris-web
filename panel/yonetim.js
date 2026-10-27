// Admin dialog: the member list (who may sign in) and the one-time loads that replace what the
// Claude Artifact had built in — the archive index and the export of its shared records.
// Firestore rules enforce the same limits (firestore.rules); this file is only the UI.
import { KURUCULAR, uyeleriIzle, uyeYaz, uyeSil, profiller, indeksYaz, eskiKayitlariAktar, driveAdresi, driveAdresiYaz, driveAra, driveEsitle, ilerlemeyiSifirla, uyeleriTopluYaz } from './firebase.js';

const BIRIM = { M:'Mekanik', E:'Elektrik-Elektronik', O:'Organizasyon ve Sosyal Medya' };
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let dlg = null, esc, toast, araclar, uyeler = [], eski = null;

export function yonetimiAc(a){
  araclar = a; ({ esc, toast } = a);
  if(!dlg){ dlg = kur(); uyeleriIzle(l => { uyeler = l.sort((a, b) => String(a.ad || a.email).localeCompare(String(b.ad || b.email), 'tr')); liste(); }, () => toast('Üye listesi okunamadı.')); }
  try{ dlg.showModal(); }catch{ dlg.setAttribute('open', ''); }
}

function kur(){
  const d = document.createElement('dialog');
  d.className = 'ynt'; d.setAttribute('aria-labelledby', 'yntTitle');
  d.innerHTML = `<div class="ynt-in">
    <div class="ynt-h"><h2 id="yntTitle">Üyeler</h2><button class="btn small" type="button" data-kapat>Kapat</button></div>
    <p class="help">Panele yalnız bu listedeki Google hesapları girebilir. Listeyi yalnız ${KURUCULAR.map(esc).join(' ve ')} değiştirebilir.</p>
    <form class="ynt-ekle" id="yntForm">
      <input class="inp" name="email" type="email" required maxlength="120" placeholder="Google e-postası" aria-label="Google e-postası">
      <input class="inp" name="ad" required maxlength="80" placeholder="Ad Soyad" aria-label="Ad Soyad">
      <select class="sel" name="birim" aria-label="Birim"><option value="">Birim</option>${Object.entries(BIRIM).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <button class="btn primary" type="submit">Ekle</button>
    </form>
    <div class="hscroll"><table class="tbl ynt-tbl"><thead><tr><th>Ad</th><th>E-posta</th><th>Birim</th><th>Aktif</th><th></th></tr></thead><tbody id="yntList"></tbody></table></div>
    <p class="help">Takım Drive'ında aktif üyeler yalnız okuyucudur; pasife alınan ya da listeden çıkarılan üyenin erişimi kaldırılır. Listede bir değişiklik olunca kendiliğinden eşitlenir (kurulum: <code>apps-script/DRIVE_ARAMA.md</code>, "Drive erişimi").</p>
    <div class="row"><button class="btn small" type="button" id="yntErisim">Drive erişimini şimdi eşitle</button></div>
    <div class="when" id="yntErisimDurum"></div>
    <details class="ynt-aktar"><summary>Toplu ekle · başvuru tablosundan</summary>
      <p class="help">"Voltaris Başvuruları" tablosunda Komite, Ad Soyad ve E-posta sütunlarını (başlıklar dahil olabilir) seçip kopyala, buraya yapıştır. Sütun sırası önemli değil; birim komiteden gelir (Mekanik → Mekanik, Elektrik → Elektrik-Elektronik, Destek → Organizasyon). Listede zaten olanlar atlanır.</p>
      <textarea class="inp" id="yntToplu" rows="5" placeholder="Mekanik&#9;Ad Soyad&#9;ad@gmail.com" aria-label="Yapıştırılan satırlar" style="font-family:var(--mono, monospace);font-size:12px"></textarea>
      <div class="row"><button class="btn small" type="button" id="yntTopluOnizle">Önizle</button></div>
      <div id="yntTopluSonuc"></div>
    </details>
    <details class="ynt-aktar" id="yntDrive"><summary>Drive araması</summary>
      <p class="help">Database balonundaki canlı Drive araması bu adresteki Apps Script'e sorar (kurulum: <code>apps-script/DRIVE_ARAMA.md</code>). Script yeniden dağıtılıp adresi değişirse buradan güncelle.</p>
      <div class="row"><input class="inp" id="yntDriveUrl" type="url" maxlength="300" placeholder="https://script.google.com/macros/s/…/exec" aria-label="Apps Script adresi" style="flex:1 1 260px;min-width:0">
        <button class="btn small" type="button" id="yntDriveKaydet">Kaydet ve dene</button></div>
      <p class="when" id="yntDriveDurum"></p>
    </details>
    <details class="ynt-aktar"><summary>İlerlemeyi sıfırla</summary>
      <p class="help">Bütün kalemlerdeki öncül cevaplarını (karşılanıyor mu, ölçüldü mü, aşama, Database sonucu) ve katkı kayıtlarını siler; araç %0'dan başlar. Notlar, fotoğraflar, bulunan dosyalar, TTR değerleri ve üstlenilen kalemler kalır. Geri alınamaz.</p>
      <button class="btn small" type="button" id="yntSifirla" style="align-self:flex-start;color:var(--bad);border-color:var(--bad)">İlerlemeyi sıfırla</button>
      <p class="when" id="yntSifirlaDurum"></p>
    </details>
    <details class="ynt-aktar"><summary>Taşıma · Bir kerelik veri yükleme</summary>
      <p class="help">Claude'daki eski panelden geçiş için. Bir kez yapıldıysa tekrar gerekmez; yalnız arşiv indeksi yeniden üretilirse onu yükle.</p>
      <p class="help"><b>Takım arşivi indeksi.</b> <code>build_indeks.py</code>'nin ürettiği <code>indeks.json</code>. Panelde "Takım arşivinde bulunanlar" bunu arar. Yenisi eskisinin yerine geçer.</p>
      <label class="btn small">indeks.json seç<input type="file" accept=".json,application/json" id="yntIdx" hidden></label>
      <p class="help"><b>Claude'daki eski kayıtlar.</b> <code>data-export</code> klasöründeki altı <code>.json</code> dosyasını birlikte seç. Aynı kalemlere ikinci kez yüklemek, o kalemlerde sonradan yapılan değişikliklerin üzerine yazar.</p>
      <label class="btn small">data-export dosyalarını seç<input type="file" accept=".json,application/json" multiple id="yntEski" hidden></label>
      <div id="yntEsle"></div>
    </details>
  </div>`;
  document.body.appendChild(d);
  d.addEventListener('click', e => { if(e.target === d || e.target.closest('[data-kapat]')) d.close(); });
  d.querySelector('#yntForm').addEventListener('submit', ekle);
  d.querySelector('#yntList').addEventListener('change', degistir);
  d.querySelector('#yntList').addEventListener('click', sil);
  d.querySelector('#yntIdx').addEventListener('change', indeks);
  d.querySelector('#yntEski').addEventListener('change', eskiOku);
  d.querySelector('#yntEsle').addEventListener('click', aktar);
  d.querySelector('#yntDriveKaydet').addEventListener('click', driveKaydet);
  d.querySelector('#yntSifirla').addEventListener('click', sifirla);
  d.querySelector('#yntErisim').addEventListener('click', () => erisimiEsitle(0));
  d.querySelector('#yntTopluOnizle').addEventListener('click', topluOnizle);
  d.querySelector('#yntTopluSonuc').addEventListener('click', topluEkle);
  driveAdresi().then(u => { d.querySelector('#yntDriveUrl').value = u; d.querySelector('#yntDriveDurum').textContent = u ? 'Kurulu.' : 'Henüz kurulmadı.'; });
  return d;
}

function liste(){
  const tb = dlg.querySelector('#yntList');
  if(!uyeler.length){ tb.innerHTML = '<tr><td colspan="6" class="when">Henüz üye yok. Yukarıdan ekle.</td></tr>'; return; }
  tb.innerHTML = uyeler.map(u => `<tr data-email="${esc(u.email)}">
    <td>${esc(u.ad || '—')}</td><td class="mono">${esc(u.email)}</td>
    <td><select class="sel" data-alan="birim" aria-label="Birim"><option value="">—</option>${Object.entries(BIRIM).map(([k, v]) => `<option value="${k}" ${u.birim === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td><input type="checkbox" data-alan="aktif" ${u.aktif !== false ? 'checked' : ''} aria-label="Aktif"></td>
    <td><button class="xbtn" type="button" data-sil aria-label="Listeden çıkar">×</button></td></tr>`).join('');
}

async function ekle(e){
  e.preventDefault();
  const f = new FormData(e.target), email = String(f.get('email')).trim().toLowerCase(), ad = String(f.get('ad')).trim();
  if(!EPOSTA.test(email) || !ad) return;
  if(uyeler.some(u => u.email === email)){ toast('Bu e-posta zaten listede.'); return; }
  try{ await uyeYaz(email, { ad, birim:String(f.get('birim')), aktif:true }); e.target.reset(); toast(`<b>Eklendi:</b> ${esc(ad)}`); erisimiEsitle(); }
  catch(err){ toast('Eklenemedi: ' + esc(err?.code || 'hata')); }
}

async function degistir(e){
  const tr = e.target.closest('tr[data-email]'), alan = e.target.dataset.alan; if(!tr || !alan) return;
  const v = alan === 'aktif' ? e.target.checked : e.target.value;
  try{ await uyeYaz(tr.dataset.email, { [alan]:v }); if(alan === 'aktif') erisimiEsitle(); }catch(err){ toast('Kaydedilemedi: ' + esc(err?.code || 'hata')); liste(); }
}

async function sil(e){
  const b = e.target.closest('[data-sil]'); if(!b) return;
  const email = b.closest('tr').dataset.email;
  if(!confirm(`${email} listeden çıkarılsın mı? Bu hesap panele bir daha giremez; girdiği kayıtlar kalır.`)) return;
  try{ await uyeSil(email); erisimiEsitle(); }catch(err){ toast('Çıkarılamadı: ' + esc(err?.code || 'hata')); }
}

// Rows pasted from the application sheet (tab separated) or typed as "e-posta, ad, birim". The e-mail
// and committee cells are recognised by their content, so the column order does not matter.
const KOMITE = [[/^(mekanik|mechanical)/, 'M'], [/^(elektrik|electrical|elektronik)/, 'E'], [/^(destek|support|organizasyon)/, 'O']];
// "osman seyran" → "Osman Seyran"; names already capitalised by their owner stay as written
const adDuzelt = a => a.trim().replace(/\s+/g, ' ').split(' ').map(k => k === k.toLocaleLowerCase('tr') ? k.charAt(0).toLocaleUpperCase('tr') + k.slice(1) : k).join(' ');
let toplu = [];
function topluOku(metin){
  const gorulen = new Set(uyeler.map(u => u.email)), sonuc = { yeni:[], var:[], tekrar:[], bozuk:[] };
  for(const satir of metin.split(/\r?\n/)){
    if(!satir.trim()) continue;
    const hucre = satir.split(satir.includes('\t') ? '\t' : /[;,]/).map(x => x.trim()).filter(Boolean);
    const email = hucre.find(x => EPOSTA.test(x))?.toLowerCase();
    if(!email){ if(!/e-?posta|email/i.test(satir)) sonuc.bozuk.push(satir.slice(0, 80)); continue; }
    const kom = hucre.map(x => x.toLocaleLowerCase('tr')).map(x => KOMITE.find(([d]) => d.test(x))?.[1]).find(Boolean)
      || (['M', 'E', 'O'].includes(hucre.at(-1)) ? hucre.at(-1) : '');
    const ad = hucre.find(x => x.toLowerCase() !== email && /\p{L}/u.test(x) && !KOMITE.some(([d]) => d.test(x.toLocaleLowerCase('tr'))) && !/^\d|^[MEO]$/.test(x)) || email.split('@')[0];
    const kisi = { email, ad:adDuzelt(ad).slice(0, 80), birim:kom };
    if(uyeler.some(u => u.email === email)) sonuc.var.push(kisi);
    else if(gorulen.has(email)) sonuc.tekrar.push(kisi);
    else { gorulen.add(email); sonuc.yeni.push(kisi); }
  }
  return sonuc;
}

function topluOnizle(){
  const r = topluOku(dlg.querySelector('#yntToplu').value), kutu = dlg.querySelector('#yntTopluSonuc');
  toplu = r.yeni;
  // Panel sign-in is "Sign in with Google": an address that is not a Google account cannot get in.
  const googleDegil = r.yeni.filter(u => !/@(gmail|googlemail)\.com$/.test(u.email));
  const ayniAd = r.yeni.filter((u, i, a) => a.findIndex(x => x.ad.toLocaleLowerCase('tr') === u.ad.toLocaleLowerCase('tr')) !== i);
  kutu.innerHTML = `<p class="help"><b>${r.yeni.length} yeni kişi</b>${r.var.length ? ` · ${r.var.length} zaten listede (atlanacak)` : ''}${r.tekrar.length ? ` · ${r.tekrar.length} tekrar eden satır` : ''}${r.bozuk.length ? ` · ${r.bozuk.length} satırda e-posta yok` : ''}</p>
    ${googleDegil.length ? `<p class="help" style="color:var(--bad)">Gmail olmayan ${googleDegil.length} adres: bu kişiler panele ancak bu adresle açılmış bir Google hesabıyla girebilir; yoksa Google e-postalarını sorup sonra düzelt. ${googleDegil.map(u => esc(u.email)).join(', ')}</p>` : ''}
    ${ayniAd.length ? `<p class="help">Aynı adla iki adres: ${ayniAd.map(u => esc(u.ad)).join(', ')}. İkisi de eklenir; kullanılmayanı sonra çıkar.</p>` : ''}
    ${r.yeni.length ? `<div class="hscroll"><table class="tbl"><thead><tr><th>Ad</th><th>E-posta</th><th>Birim</th></tr></thead><tbody>${r.yeni.map(u => `<tr><td>${esc(u.ad)}</td><td class="mono">${esc(u.email)}</td><td>${esc(BIRIM[u.birim] || '—')}</td></tr>`).join('')}</tbody></table></div>
      <button class="btn primary small" type="button" data-topluekle>${r.yeni.length} kişiyi ekle</button>` : ''}`;
}

async function topluEkle(e){
  const b = e.target.closest('[data-topluekle]'); if(!b || !toplu.length) return;
  if(!confirm(`${toplu.length} kişi üye listesine eklenecek ve panele girebilecek. Drive erişimi kuruluysa takım klasörlerinde okuyucu olacaklar. Devam edilsin mi?`)) return;
  b.disabled = true; b.textContent = 'Ekleniyor…';
  try{ const n = await uyeleriTopluYaz(toplu); toplu = []; dlg.querySelector('#yntToplu').value = '';
    dlg.querySelector('#yntTopluSonuc').innerHTML = `<p class="msg">${n} kişi eklendi.</p>`; toast(`<b>${n} kişi eklendi.</b>`); erisimiEsitle(); }
  catch(err){ toast('Eklenemedi: ' + esc(err?.code || err?.message || 'hata')); b.disabled = false; b.textContent = `${toplu.length} kişiyi ekle`; }
}

// Several ticks in a row make one sync; the script reads the list itself, so the last state wins.
let esitleSaat = null, esitleniyor = false, yeniden = false;
function erisimiEsitle(bekle = 1500){
  clearTimeout(esitleSaat);
  esitleSaat = setTimeout(async () => {
    if(esitleniyor){ yeniden = true; return; }
    const durum = dlg.querySelector('#yntErisimDurum'), b = dlg.querySelector('#yntErisim');
    esitleniyor = true; b.disabled = true; durum.textContent = 'Drive erişimi eşitleniyor…';
    try{ durum.innerHTML = erisimRaporu(await driveEsitle()); }
    catch(err){
      durum.textContent = { kurulmadi:'Drive araması kurulmadığı için Drive erişimi eşitlenmedi.', 'paylasim-yok':'Script\'te AYAR.paylasim boş: takım klasörünün kimliği yazılmadan erişime dokunulmaz.',
        'kurucu-degil':'Eşitlemeyi yalnız kurucu hesaplar yapabilir.', mesgul:'Başka bir eşitleme sürüyor; biraz sonra tekrar dene.',
        'uye-degil':'Script üyeliği doğrulayamadı (AYAR.firebaseApiKey / projeId).' }[err?.code]
        || 'Drive erişimi eşitlenemedi: ' + (err?.message || err?.code || 'hata') + '. Script güncel sürümle yeniden dağıtıldı mı?';
    }
    esitleniyor = false; b.disabled = false;
    if(yeniden){ yeniden = false; erisimiEsitle(0); }
  }, bekle);
}

const kisiler = a => a.map(esc).join(', ');
function erisimRaporu(r){
  const ad = e => esc(uyeler.find(u => u.email === e)?.ad || e);
  const satir = [`<b>Eşitlendi</b> (${new Date().toLocaleTimeString('tr', { hour:'2-digit', minute:'2-digit' })}): ${r.uye} aktif üye okuyucu.`];
  if(r.eklenen?.length) satir.push(`Erişim verildi: ${r.eklenen.map(ad).join(', ')}.`);
  if(r.googleYok?.length) satir.push(`<span style="color:var(--bad)">Google hesabı olmadığı için Drive erişimi verilemedi (panele de giremezler): ${r.googleYok.map(ad).join(', ')}. Google e-postalarını sorup listede adreslerini değiştir; sonraki eşitlemede eklenirler.</span>`);
  if(r.okuraCekilen?.length) satir.push(`Düzenleme yetkisi okumaya çekildi: ${r.okuraCekilen.map(ad).join(', ')}.`);
  if(r.cikarilan?.length) satir.push(`Erişimi kaldırıldı: ${r.cikarilan.map(ad).join(', ')}.`);
  const dsy = r.dosya || {};
  if(dsy.kaldirilan || dsy.okuraCekilen) satir.push(`Ayrıca paylaşılmış dosyalarda: ${dsy.kaldirilan || 0} izin kaldırıldı, ${dsy.okuraCekilen || 0} izin okumaya çekildi.`);
  if(dsy.bekleyen) satir.push('Dosyaların bir kısmı saatlik denetime kaldı.');
  if(r.gizli?.length) satir.push(`<span style="color:var(--bad)"><b>Kimseye yeni erişim verilmedi:</b> paylaşılan klasörün altında kişisel veri taşıyabilecek klasörler var: ${kisiler(r.gizli)}. Bunları paylaşımın dışına taşı ya da kişisel veri yoksa kimliklerini script'te AYAR.gizliDegil'e yaz.</span>`);
  const sahip = Object.entries(dsy.sahip || {});
  if(sahip.length) satir.push(`Sahibi oldukları dosyaları üyeler yine değiştirip silebilir, ayrılınca da onlarda kalır: ${sahip.map(([e, n]) => `${ad(e)} (${n})`).join(', ')}. Bu dosyaların sahipliği ${esc(KURUCULAR[0])}'a devredilmeli.`);
  if(r.disaridaYazar?.length) satir.push(`Listede olmayan ama düzenleyebilen hesaplar (dokunulmadı): ${kisiler(r.disaridaYazar)}.`);
  if(r.herkeseAcik?.length) satir.push('Uyarı: takım klasörü "bağlantıya sahip herkes" ile paylaşılmış; erişimi kaldırılan üye bağlantıyla yine açabilir. Drive\'da paylaşımı "Kısıtlı" yap.');
  if(r.hatalar?.length) satir.push(`Hatalar: ${kisiler(r.hatalar)}`);
  return satir.map(x => `<p style="margin:4px 0">${x}</p>`).join('');
}

// Two steps on purpose: the confirm says what goes and what stays, the prompt makes it a deliberate act.
async function sifirla(e){
  const b = e.currentTarget, durum = dlg.querySelector('#yntSifirlaDurum');
  if(!confirm('Bütün öncül cevapları ve katkı kayıtları silinecek; araç %0\'dan başlayacak. Notlar, fotoğraflar, bulunan dosyalar ve TTR değerleri kalacak. Bu geri alınamaz. Devam edilsin mi?')) return;
  // "sıfırla", "sifirla", "SIFIRLA" all count: Turkish upper-casing turns a typed i into İ.
  if((prompt('Onaylamak için SIFIRLA yaz') || '').trim().toLocaleLowerCase('tr').replace(/ı/g, 'i') !== 'sifirla'){ durum.textContent = 'Vazgeçildi.'; return; }
  b.disabled = true; durum.textContent = 'Sıfırlanıyor…';
  try{ const n = await ilerlemeyiSifirla(araclar.myId()); durum.textContent = `Sıfırlandı: ${n} kalemin öncülleri temizlendi.`; toast('<b>İlerleme sıfırlandı.</b> Araç %0\'dan başlıyor.'); }
  catch(err){ durum.textContent = 'Sıfırlanamadı: ' + (err?.code || err?.message || 'hata'); }
  b.disabled = false;
}

const SCRIPT_ADRESI = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
async function driveKaydet(){
  const inp = dlg.querySelector('#yntDriveUrl'), durum = dlg.querySelector('#yntDriveDurum'), url = inp.value.trim();
  if(url && !SCRIPT_ADRESI.test(url)){ durum.textContent = 'Adres https://script.google.com/macros/s/…/exec biçiminde olmalı (Dağıt → Web uygulaması).'; return; }
  try{
    await driveAdresiYaz(url);
    if(!url){ durum.textContent = 'Kaldırıldı: balon yalnız arşiv indeksinde arar.'; return; }
    durum.textContent = 'Kaydedildi, deneniyor…';
    const r = await driveAra('şasi');
    durum.textContent = `Çalışıyor: "şasi" için ${r.sonuc.length}${r.kesildi ? '+' : ''} dosya bulundu.`;
  }catch(err){
    durum.textContent = { 'uye-degil':'Script cevap verdi ama üyeliği doğrulayamadı: AYAR.firebaseApiKey / projeId doğru mu?', http:'Script\'e ulaşılamadı: dağıtımda "Erişimi olanlar: Herkes" seçili mi?', arama:'Script Drive\'da arayamadı: Drive API hizmeti eklendi ve kurulum() çalıştırıldı mı? ' + (err.message || '') }[err?.code]
      || 'Denenemedi: ' + (err?.message || err?.code || 'hata');
  }
}

const dosyaOku = f => f.text().then(t => JSON.parse(t));

async function indeks(e){
  const f = e.target.files?.[0]; e.target.value = ''; if(!f) return;
  try{
    const d = await dosyaOku(f);
    if(!Array.isArray(d.drive) || !Array.isArray(d.teams)) throw new Error('Bu bir indeks.json değil');
    const n = await indeksYaz(d);
    toast(`<b>İndeks yüklendi:</b> ${d.drive.length} Drive dosyası, ${d.teams.length} Teams klasörü (${n} parça). Sayfayı yenileyince aramaya girer.`);
  }catch(err){ toast('İndeks yüklenemedi: ' + esc(err?.message || err?.code || 'hata')); }
}

// Old Claude user ids appear as `by` / `owner` values and as members/ document ids.
function eskiIdler(dosyalar){
  const ids = new Set(Object.keys(dosyalar.members || {}));
  const gez = v => { if(Array.isArray(v)) v.forEach(gez); else if(v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => {
    if((k === 'by' || k === 'owner') && typeof x === 'string' && x.startsWith('u_')) ids.add(x); else gez(x); }); };
  gez(dosyalar); return [...ids];
}

async function eskiOku(e){
  const files = [...(e.target.files || [])]; e.target.value = '';
  const box = dlg.querySelector('#yntEsle');
  try{
    const dosyalar = {};
    for(const f of files){ const ad = f.name.replace(/\.json$/i, ''); if(['items', 'checks', 'rapor', 'log', 'members', 'chat'].includes(ad)) dosyalar[ad] = await dosyaOku(f); }
    if(!Object.keys(dosyalar).length) throw new Error('data-export dosyaları bulunamadı');
    const ids = eskiIdler(dosyalar), kisiler = (await profiller()).filter(p => p.ad);
    const sayi = ['items', 'checks', 'rapor', 'log'].map(c => `${Object.keys(dosyalar[c] || {}).length} ${c}`).join(', ');
    eski = { dosyalar, ids };
    box.innerHTML = `<p class="help">Bulunan: ${esc(sayi)}. Eski kayıtlarda ${ids.length} kişi var; panele girmiş olanları eşle ki adları görünsün. Eşlenmeyenler "Bir ekip üyesi" olarak kalır.</p>
      ${ids.map(id => `<label class="row"><span class="mono">${esc(id.slice(0, 10))}…</span><select class="sel" data-eski="${esc(id)}"><option value="">eşleme yok</option>${kisiler.map(p => `<option value="${esc(p.id)}">${esc(p.ad)}${p.email ? ' · ' + esc(p.email) : ''}</option>`).join('')}</select></label>`).join('')}
      <button class="btn primary small" type="button" data-aktar>Eski kayıtları aktar</button>`;
  }catch(err){ eski = null; box.innerHTML = `<p class="msg err">${esc(err?.message || 'Dosyalar okunamadı')}</p>`; }
}

async function aktar(e){
  const b = e.target.closest('[data-aktar]'); if(!b || !eski) return;
  const esle = {}; dlg.querySelectorAll('[data-eski]').forEach(s => { if(s.value) esle[s.dataset.eski] = s.value; });
  b.disabled = true; b.textContent = 'Aktarılıyor…';
  try{ const n = await eskiKayitlariAktar(eski.dosyalar, esle); eski = null; dlg.querySelector('#yntEsle').innerHTML = `<p class="msg">${n} belge aktarıldı.</p>`; }
  catch(err){ toast('Aktarılamadı: ' + esc(err?.code || err?.message || 'hata')); b.disabled = false; b.textContent = 'Eski kayıtları aktar'; }
}

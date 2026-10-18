// Admin dialog: the member list (who may sign in) and the one-time loads that replace what the
// Claude Artifact had built in — the archive index and the export of its shared records.
// Firestore rules enforce the same limits (firestore.rules); this file is only the UI.
import { KURUCULAR, uyeleriIzle, uyeYaz, uyeSil, profiller, indeksYaz, eskiKayitlariAktar, driveAdresi, driveAdresiYaz, driveAra } from './firebase.js';

const BIRIM = { M:'Mekanik', E:'Elektrik-Elektronik', O:'Organizasyon ve Sosyal Medya' };
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let dlg = null, esc, toast, uyeler = [], eski = null;

export function yonetimiAc(araclar){
  ({ esc, toast } = araclar);
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
    <details class="ynt-aktar" id="yntDrive"><summary>Drive araması</summary>
      <p class="help">Database balonundaki canlı Drive araması bu adresteki Apps Script'e sorar (kurulum: <code>apps-script/DRIVE_ARAMA.md</code>). Script yeniden dağıtılıp adresi değişirse buradan güncelle.</p>
      <div class="row"><input class="inp" id="yntDriveUrl" type="url" maxlength="300" placeholder="https://script.google.com/macros/s/…/exec" aria-label="Apps Script adresi" style="flex:1 1 260px;min-width:0">
        <button class="btn small" type="button" id="yntDriveKaydet">Kaydet ve dene</button></div>
      <p class="when" id="yntDriveDurum"></p>
    </details>
    <details class="ynt-aktar"><summary>Bir kerelik veri yükleme</summary>
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
  try{ await uyeYaz(email, { ad, birim:String(f.get('birim')), aktif:true }); e.target.reset(); toast(`<b>Eklendi:</b> ${esc(ad)}`); }
  catch(err){ toast('Eklenemedi: ' + esc(err?.code || 'hata')); }
}

async function degistir(e){
  const tr = e.target.closest('tr[data-email]'), alan = e.target.dataset.alan; if(!tr || !alan) return;
  const v = alan === 'aktif' ? e.target.checked : e.target.value;
  try{ await uyeYaz(tr.dataset.email, { [alan]:v }); }catch(err){ toast('Kaydedilemedi: ' + esc(err?.code || 'hata')); liste(); }
}

async function sil(e){
  const b = e.target.closest('[data-sil]'); if(!b) return;
  const email = b.closest('tr').dataset.email;
  if(!confirm(`${email} listeden çıkarılsın mı? Bu hesap panele bir daha giremez; girdiği kayıtlar kalır.`)) return;
  try{ await uyeSil(email); }catch(err){ toast('Çıkarılamadı: ' + esc(err?.code || 'hata')); }
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
    durum.textContent = { 'uye-degil':'Script cevap verdi ama üyeliği doğrulayamadı: AYAR.firebaseApiKey / projeId doğru mu?', http:'Script\'e ulaşılamadı: dağıtımda "Erişimi olanlar: Herkes" seçili mi?', arama:'Script Drive\'da arayamadı: izinleriVer() bir kez çalıştırıldı mı? ' + (err.message || '') }[err?.code]
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

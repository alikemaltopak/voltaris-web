// Firebase behind the panel. The panel was written for the Claude Artifact runtime
// (window.claude.use('db' | 'user' | 'assets')); this module hands it objects of the same shape,
// so the panel's own code — state logic and data shapes, README §4 and §7 — stays as the team knows it.
//
// Two deliberate differences from README §8:
// - Photos live in Firestore (`fotolar/<id>`, JPEG bytes) instead of Firebase Storage. New Storage
//   buckets need the paid Blaze plan; a 1600 px JPEG fits a Firestore document and the free quota.
// - The archive index lives in Firestore (`indeks/meta` + `indeks/p0…`) as chunked JSON text, because
//   Firestore cannot store the index's arrays of arrays and a static file would be public.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import {
  initializeFirestore, connectFirestoreEmulator, doc, collection, query, orderBy, limit,
  getDoc, getDocs, setDoc, addDoc, deleteDoc, onSnapshot, writeBatch, Bytes, where, getCountFromServer,
} from 'firebase/firestore';

// Must match `kurucu()` in firestore.rules: only these two accounts manage the member list and load
// data, and they are always members. There is no admin role to hand out, by design.
export const KURUCULAR = ['voltaris.official@gmail.com', 'alikemaltopak@gmail.com'];

const env = import.meta.env;
const emulator = env.VITE_FIREBASE_EMULATOR === '1';
const config = emulator
  // always the demo project the emulators start with (README §1), whatever .env says
  ? { apiKey: 'demo', projectId: 'demo-voltaris', authDomain: '127.0.0.1' }
  : { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID };

// Without a config (a fresh checkout with no .env) the panel falls back to its local mode.
export const configured = !!(config.apiKey && config.projectId);

let auth = null, fs = null;
if(configured){
  const app = initializeApp(config);
  auth = getAuth(app);
  // ignoreUndefinedProperties: the panel's patches can carry undefined fields, which the Claude
  // database dropped silently and Firestore would reject.
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if(emulator){ connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(fs, '127.0.0.1', 8080); }
}

const emailKey = e => String(e || '').trim().toLowerCase();
const nowIso = () => new Date().toISOString();

/* ---------- oturum ---------- */

// Calls back with {durum:'cikis'} | {durum:'red', email, pasif} | {durum:'giris', ...session}.
// "red" means signed in with Google but not on the member list (or set inactive).
export function oturumuIzle(cb){
  let first = true;
  return onAuthStateChanged(auth, async u => {
    if(!u){ cb({ durum:'cikis', ilk:first }); first = false; return; }
    first = false;
    const email = emailKey(u.email);
    let uye = null;
    try{ const s = await getDoc(doc(fs, 'uyeler', email)); if(s.exists()) uye = s.data(); }catch{ /* not a member: rules deny the read */ }
    const kurucu = KURUCULAR.includes(email);
    if(!kurucu && (!uye || uye.aktif === false)){ cb({ durum:'red', email, pasif: !!uye }); return; }
    const ad = String(uye?.ad || u.displayName || email.split('@')[0]).slice(0, 80);
    // members/<uid> is how other members see this person's name (user.profiles below).
    try{ await setDoc(doc(fs, 'members', u.uid), { ad, foto: u.photoURL || '', email, giris: nowIso() }, { merge:true }); }catch{}
    cb({ durum:'giris', ...oturum(u, { ad, email, yonetici:kurucu, birim: uye?.birim || '' }) });
  });
}

export async function girisYap(){
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt:'select_account' });
  try{ await signInWithPopup(auth, p); }
  catch(e){
    // Popups are blocked in some in-app browsers (Instagram, WhatsApp); a redirect still works there.
    if(e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, p);
    if(e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
    throw e;
  }
}
export const cikisYap = () => signOut(auth);

/* ---------- the three runtime objects the panel expects ---------- */

function oturum(u, info){
  return { me:{ id:u.uid, name:info.ad, avatarUrl:u.photoURL || '', email:info.email }, yonetici:info.yonetici, birim:info.birim,
    db:dbApi(), user:userApi(u, info), assets:assetsApi(u) };
}

const snapOf = s => ({ id:s.id, exists:s.exists(), data:() => s.data() });
const listOf = q => ({ docs:q.docs.map(snapOf) });
// Firestore says "permission-denied"; the panel was written against the Claude database's codes.
const kod = e => e?.code === 'permission-denied' ? 'invalid_argument' : e?.code;
const kodla = async p => { try{ return await p; }catch(e){ throw Object.assign(new Error(e?.message || 'firestore'), { code:kod(e) }); } };

function dbApi(){
  const coll = (ref, cons) => {
    const q = () => cons.length ? query(ref, ...cons) : ref;
    return {
      orderBy:(f, d) => coll(ref, [...cons, orderBy(f, d)]),
      limit:n => coll(ref, [...cons, limit(n)]),
      add:v => kodla(addDoc(ref, v)),
      get:async () => listOf(await kodla(getDocs(q()))),
      onSnapshot:(cb, err) => onSnapshot(q(), s => cb(listOf(s)), err),
    };
  };
  return {
    doc(path){ const r = doc(fs, path); return {
      get:async () => snapOf(await kodla(getDoc(r))),
      set:v => kodla(setDoc(r, v)),
      // The Claude database's update merged nested objects and replaced arrays, and created the
      // document if missing; Firestore's set-with-merge does exactly that.
      update:v => kodla(setDoc(r, v, { merge:true })),
      delete:() => kodla(deleteDoc(r)),
      onSnapshot:(cb, err) => onSnapshot(r, s => cb(snapOf(s)), err),
    }; },
    collection:path => coll(collection(fs, path), []),
  };
}

function userApi(u, info){
  const cache = new Map([[u.uid, { name:info.ad, avatarUrl:u.photoURL || '' }]]);
  return {
    me:async () => ({ id:u.uid, name:info.ad, avatarUrl:u.photoURL || '' }),
    can:async () => true,   // only members get past the sign-in gate, and every member may write
    async profiles(ids){
      await Promise.all(ids.filter(id => !cache.has(id)).map(async id => {
        try{ const s = await getDoc(doc(fs, 'members', id)); const d = s.exists() ? s.data() : {};
          cache.set(id, d.ad ? { name:d.ad, avatarUrl:d.foto || '' } : {}); }catch{ cache.set(id, {}); }
      }));
      return Object.fromEntries(ids.map(id => [id, cache.get(id) || {}]));
    },
  };
}

const FOTO_SINIR = 900_000;   // Firestore documents top out at 1 MiB
const rastgeleId = () => { const a = crypto.getRandomValues(new Uint8Array(20)), c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(a, x => c[x % c.length]).join(''); };
async function kucult(blob){
  for(const k of [.75, .55, .4]){
    try{ const bmp = await createImageBitmap(blob); const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width*k); cv.height = Math.round(bmp.height*k); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const b = await new Promise(res => cv.toBlob(res, 'image/jpeg', .78)); if(b && b.size <= FOTO_SINIR) return b; }catch{ return blob; }
  }
  return blob;
}

function assetsApi(u){
  const urls = new Map();   // id → Promise<objectURL>
  const hazir = new Map();  // id → objectURL, for synchronous rendering
  return {
    async upload(blob, { type } = {}){
      let b = blob.size > FOTO_SINIR ? await kucult(blob) : blob;
      if(b.size > FOTO_SINIR) throw Object.assign(new Error('too large'), { code:'too_large' });
      const id = rastgeleId();
      try{ await setDoc(doc(fs, 'fotolar', id), { veri:Bytes.fromUint8Array(new Uint8Array(await b.arrayBuffer())), tur:b.type || type || 'image/jpeg', by:u.uid, at:nowIso() }); }
      catch(e){ throw Object.assign(new Error('upload'), { code: e?.code === 'permission-denied' ? 'not_granted' : e?.code }); }
      return { id };
    },
    url(id){
      if(!urls.has(id)) urls.set(id, getDoc(doc(fs, 'fotolar', id)).then(s => {
        if(!s.exists()) throw new Error('yok'); const d = s.data();
        const url = URL.createObjectURL(new Blob([d.veri.toUint8Array()], { type:d.tur || 'image/jpeg' })); hazir.set(id, url); return url;
      }).catch(e => { urls.delete(id); throw e; }));
      return urls.get(id);
    },
    cached:id => hazir.get(id) || null,
    delete:id => deleteDoc(doc(fs, 'fotolar', id)),
  };
}

/* ---------- takım arşivi indeksi ---------- */

export async function indeksOku(){
  const q = await getDocs(collection(fs, 'indeks'));
  const meta = q.docs.find(d => d.id === 'meta')?.data();
  if(!meta) throw new Error('indeks yok');
  const parca = q.docs.filter(d => /^p\d+$/.test(d.id)).sort((a, b) => +a.id.slice(1) - +b.id.slice(1)).map(d => d.data().json);
  if(parca.length !== meta.parca) throw new Error('indeks eksik');
  return JSON.parse(parca.join(''));
}

// 300 000 characters stay under 1 MiB even if every one were a two-byte Turkish letter.
export async function indeksYaz(obj){
  const text = JSON.stringify(obj), n = Math.ceil(text.length / 300_000);
  const eski = await getDocs(collection(fs, 'indeks'));
  const b = writeBatch(fs);
  eski.docs.forEach(d => b.delete(d.ref));
  for(let i = 0; i < n; i++) b.set(doc(fs, 'indeks', 'p'+i), { json:text.slice(i*300_000, (i+1)*300_000) });
  b.set(doc(fs, 'indeks', 'meta'), { ver:String(obj.ver || ''), parca:n, at:nowIso() });
  await b.commit();
  return n;
}

/* ---------- Drive'da canlı arama (apps-script/DriveArama.gs) ---------- */

// The script's address lives in ayarlar/genel so a founder can set or change it from the panel
// without a redeploy. The script checks the member's ID token itself; the address is not a secret.
let driveAdresP = null;
export const driveAdresi = () => (driveAdresP ??= getDoc(doc(fs, 'ayarlar', 'genel'))
  .then(s => s.exists() ? String(s.data().driveArama || '') : '').catch(() => ''));
export async function driveAdresiYaz(url){ await setDoc(doc(fs, 'ayarlar', 'genel'), { driveArama:url, at:nowIso() }, { merge:true }); driveAdresP = null; }

const hata = (code, mesaj) => Object.assign(new Error(mesaj || code), { code });
export async function driveAra(q, signal){
  const url = await driveAdresi(); if(!url) throw hata('kurulmadi');
  const token = await auth.currentUser.getIdToken();
  // A bare string body keeps this a CORS simple request; Apps Script cannot answer a preflight
  // (see src/lib/formEndpoint.ts).
  const istek = () => fetch(url, { method:'POST', body:JSON.stringify({ token, q }), signal })
    .then(r => { if(!r.ok) throw hata('http', 'HTTP '+r.status); return r.json(); });
  let d;
  // Apps Script hands the reply over on a second hop that now and then answers 404; once more is enough.
  try{ d = await istek(); }catch(e){ if(e?.name === 'AbortError') throw e; d = await istek(); }
  if(!d?.ok) throw hata(d?.hata || 'arama', d?.mesaj);
  const sonuc = Array.isArray(d.sonuc) ? d.sonuc : [];
  return { sonuc, kesildi:!!d.kesildi, toplam:Number(d.toplam) || sonuc.length };
}

/* ---------- ilerlemeyi sıfırlama ---------- */

// Clears every öncül's answers (karşılanıyor mu, ölçüldü mü, aşama, Database sonucu) and the contributors
// credited for them, so the car starts again at 0. Notes, photos, found files and "ne yapacaksınız" stay:
// they are work, not progress. Each checks document is replaced, not merged, so no answer survives.
const KALIR = ['not', 'foto', 'found', 'is'];
export async function ilerlemeyiSifirla(uid){
  const q = await getDocs(collection(fs, 'checks'));
  const b = writeBatch(fs);
  q.docs.forEach(d => {
    const f = {};
    for(const [i, x] of Object.entries(d.data().f || {})){
      if(!x || typeof x !== 'object') continue;
      const k = Object.fromEntries(KALIR.filter(a => x[a] != null && x[a] !== '' && !(Array.isArray(x[a]) && !x[a].length)).map(a => [a, x[a]]));
      if(Object.keys(k).length) f[i] = k;
    }
    b.set(d.ref, { s:{}, f, by:uid, at:nowIso() });
  });
  b.set(doc(collection(fs, 'log')), { by:uid, at:nowIso(), item:'', text:'Bütün öncüllerin ilerlemesi sıfırlandı' });
  await b.commit();
  return q.size;
}

/* ---------- katkı: profil penceresi için ---------- */

// The whole activity feed, read once to credit öncüller recorded before checks/<id>.f.<i>.emek existed.
export async function tumHareketler(){
  const q = await getDocs(collection(fs, 'log'));
  return q.docs.map(d => d.data()).filter(r => typeof r.by === 'string' && typeof r.text === 'string' && typeof r.item === 'string');
}
// A count query costs one read per thousand entries instead of downloading them.
export async function hareketSayisi(uid){
  try{ return (await getCountFromServer(query(collection(fs, 'log'), where('by', '==', uid)))).data().count; }catch{ return null; }
}

/* ---------- yönetim: üye listesi ve bir kerelik veri aktarımı ---------- */

export const uyeleriIzle = (cb, err) => onSnapshot(collection(fs, 'uyeler'), s => cb(s.docs.map(d => ({ email:d.id, ...d.data() }))), err);
export const uyeYaz = (email, v) => setDoc(doc(fs, 'uyeler', emailKey(email)), { ...v, at:nowIso() }, { merge:true });
export const uyeSil = email => deleteDoc(doc(fs, 'uyeler', emailKey(email)));
export async function profiller(){ const q = await getDocs(collection(fs, 'members')); return q.docs.map(d => ({ id:d.id, ...d.data() })); }

// Imports the Claude database export (data-export/*.json). `esle` maps old Claude user ids (u_…)
// to Firebase uids; unmapped ids are kept, and the panel shows them as "Bir ekip üyesi".
export async function eskiKayitlariAktar(dosyalar, esle){
  const swap = v => typeof v === 'string' && v in esle ? esle[v] : Array.isArray(v) ? v.map(swap)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
  const yazilar = [];
  for(const coll of ['items', 'checks', 'rapor', 'log']) for(const [id, v] of Object.entries(dosyalar[coll] || {})) yazilar.push([coll+'/'+id, swap(v)]);
  for(const [id, v] of Object.entries(dosyalar.members || {})) yazilar.push(['members/'+(esle[id] || id), v]);
  for(const [kanal, msgs] of Object.entries(dosyalar.chat || {})) for(const [id, v] of Object.entries(msgs || {})) yazilar.push([`chat/${kanal}/m/${id}`, swap(v)]);
  for(let i = 0; i < yazilar.length; i += 400){
    const b = writeBatch(fs);
    // merge: a member's own members/<uid> document (name, photo) must survive the import
    yazilar.slice(i, i+400).forEach(([p, v]) => b.set(doc(fs, p), v, { merge:true }));
    await b.commit();
  }
  return yazilar.length;
}

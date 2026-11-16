// =====================================================================
//  OSH MARKAZI — multiplayer server
//  Ishga tushirish:  npm install   keyin   npm start   (port 3000)
//  O'yin fayllarini ham shu server ko'rsatadi: http://localhost:3000
//
//  Pul faqat shu yerda hisoblanadi: o'yinchi "menga 1 mln qo'sh" deb yubora olmaydi.
//  Ma'lumotlarni GitHub'da saqlash (Render bepul tarifida fayl o'chib ketmasligi uchun):
//    GITHUB_TOKEN = repo huquqli token,  DATA_REPO = egasi/repo,
//    DATA_BRANCH = data (ixtiyoriy),     DATA_PATH = data.json (ixtiyoriy)
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  START_MONEY, MAX_OWNERS, QOZON_CAP, newKitchen, fixKitchen, tryBuy, priceFor, floors, weddingOrder,
} from './economy.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(DIR, 'data.json');
const PLOT_COUNT = 12;                 // world.js dagi PLOTS soni bilan bir xil
const GH = process.env.GITHUB_TOKEN && process.env.DATA_REPO ? {
  token: process.env.GITHUB_TOKEN, repo: process.env.DATA_REPO,
  branch: process.env.DATA_BRANCH || 'data', file: process.env.DATA_PATH || 'data.json', sha: null,
} : null;

// ---------- saqlanadigan ma'lumotlar ----------
let db = { players: {}, kitchens: {}, accounts: {}, nextK: 1 };
let dirty = false, saveTimer = null;
function fixDb() {
  db.players ||= {}; db.kitchens ||= {}; db.accounts ||= {}; db.nextK ||= 1;
  for (const k of Object.values(db.kitchens)) { fixKitchen(k); if (typeof k.ready !== 'number') k.ready = 0; }
}
function save() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(db), () => {}), 1500);
}
// --- GitHub'da saqlash ---
async function gh(method, url, body) {
  const r = await fetch('https://api.github.com/repos/' + GH.repo + url, {
    method, headers: { Authorization: 'Bearer ' + GH.token, Accept: 'application/vnd.github+json', 'User-Agent': 'osh-markazi' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
}
async function ghLoad() {
  const r = await gh('GET', `/contents/${GH.file}?ref=${GH.branch}`);
  if (r.ok && r.json?.content) {
    GH.sha = r.json.sha;
    return JSON.parse(Buffer.from(r.json.content, 'base64').toString('utf8'));
  }
  if (r.status === 404) {                                      // shoxcha yo'q bo'lsa yaratamiz
    const repo = await gh('GET', '');
    const base = repo.json?.default_branch || 'main';
    const ref = await gh('GET', `/git/ref/heads/${base}`);
    if (ref.ok) await gh('POST', '/git/refs', { ref: 'refs/heads/' + GH.branch, sha: ref.json.object.sha });
  } else console.log('GitHub saqlash xatosi:', r.status, r.json?.message);
  return null;
}
async function ghSave() {
  if (!GH || !dirty) return;
  dirty = false;
  const r = await gh('PUT', `/contents/${GH.file}`, {
    message: "o'yin ma'lumotlari", branch: GH.branch, sha: GH.sha || undefined,
    content: Buffer.from(JSON.stringify(db)).toString('base64'),
  });
  if (r.ok) GH.sha = r.json.content.sha;
  else { dirty = true; if (r.status === 409 || r.status === 422) { const x = await gh('GET', `/contents/${GH.file}?ref=${GH.branch}`); GH.sha = x.json?.sha || null; } }
}

// ---------- statik fayllar ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8',
};
const PUBLIC = new Set(['index.html', 'game.js', 'world.js', 'economy.js', 'icon.png', 'manifest.webmanifest']);
const server = http.createServer((req, res) => {
  const f = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  if (!PUBLIC.has(f) && !/^lib\/[\w.-]+\.(js|txt)$/.test(f)) { res.writeHead(404); return res.end('Topilmadi'); }
  fs.readFile(path.join(DIR, f), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Topilmadi'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': f.startsWith('lib/') ? 'max-age=604800' : 'no-cache' });
    res.end(data);
  });
});

// ---------- onlayn holat ----------
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
const clients = new Map();          // id -> { ws, token, name, st }
let nextId = 1;
const hosts = {};                   // kitchenId -> clientId (mijozlarni boshqaradigan o'yinchi)
const live = {};                    // kitchenId -> { pending: [narxlar], toy } (saqlanmaydi)
const L = (kid) => (live[kid] ||= { pending: [], toy: null });
const orders = {};                  // token -> to'y buyurtmasi
const orderCd = {};                 // token -> keyingi buyurtma vaqti

function sanitizeLook(l) {                    // personaj ko'rinishi (faqat ranglar va jins)
  if (!l || typeof l !== 'object') return null;
  const n = (v) => (Number.isInteger(v) && v >= 0 && v <= 0xffffff ? v : undefined);
  return { gender: l.gender === 'f' ? 'f' : 'm', shirt: n(l.shirt), pants: n(l.pants), skin: n(l.skin), hair: n(l.hair), hat: l.hat === 'doppi' ? 'doppi' : null, scarf: n(l.scarf) ?? null };
}
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const all = (m, except) => { const s = JSON.stringify(m); for (const [id, c] of clients) if (id !== except && c.token && c.ws.readyState === 1) c.ws.send(s); };
const byToken = (t) => { for (const [id, c] of clients) if (c.token === t) return [id, c]; return [null, null]; };
const pinHash = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');

function freePlot() {
  const used = new Set(Object.values(db.kitchens).map((k) => k.plot));
  for (let i = 0; i < PLOT_COUNT; i++) if (!used.has(i)) return i;
  return -1;
}
function createKitchen(type, owners) {
  const plot = freePlot(); if (plot < 0) return null;
  const id = 'k' + db.nextK++;
  const names = owners.map((t) => db.players[t]?.name || '?');
  const k = newKitchen(id, plot, type, owners, names); k.ready = 0;
  db.kitchens[id] = k;
  for (const t of owners) db.players[t]?.kitchens.push(id);
  save();
  return k;
}
function refreshNames(k) { k.names = k.owners.map((t) => db.players[t]?.name || '?'); }
const hostedList = () => Object.keys(hosts).filter((kid) => hosts[kid]);

// Har bir biznes uchun "host" — onlayn bo'lgan birinchi egasi mijozlarni boshqaradi
function electHosts() {
  let changed = false;
  for (const k of Object.values(db.kitchens)) {
    let h = null;
    for (const t of k.owners) { const [id] = byToken(t); if (id) { h = id; break; } }
    if ((hosts[k.id] || null) !== h) {
      const old = hosts[k.id];
      hosts[k.id] = h; changed = true;
      if (old && clients.get(old)) send(clients.get(old).ws, { t: 'host', kid: k.id, on: false });
      if (h) send(clients.get(h).ws, { t: 'host', kid: k.id, on: true });
      if (!h) L(k.id).pending.length = 0;
    }
  }
  if (changed) all({ t: 'hosted', list: hostedList() });
}
const pendingK = new Map();                  // daromad yangilanishini 3 soniyada bir yuborish
function kitchenLater(k) {
  if (pendingK.has(k.id)) return;
  pendingK.set(k.id, setTimeout(() => { pendingK.delete(k.id); all({ t: 'kitchen', k }); }, 3000));
}
function moneyTo(token) { const [, c] = byToken(token); if (c) send(c.ws, { t: 'money', v: db.players[token].money }); }
function payOwners(k, amt) {                 // HAR BIR sherik to'liq pul oladi
  for (const t of k.owners) { if (db.players[t]) { db.players[t].money += amt; moneyTo(t); } }
  k.earned = (k.earned || 0) + amt;
  kitchenLater(k); save();
}

// ---------- kirish (ism + PIN) ----------
function login(m) {
  const name = String(m.name || 'Mehmon').slice(0, 16).replace(/[<>]/g, '').trim() || 'Mehmon';
  const key = name.toLowerCase();
  const pin = /^\d{4,6}$/.test(String(m.pin || '')) ? String(m.pin) : null;
  let token = typeof m.token === 'string' && db.players[m.token] ? m.token : null;
  const acc = db.accounts[key];
  if (pin && acc) {                                         // boshqa qurilmadan kirish
    if (pinHash(pin, acc.salt) !== acc.hash) return { err: "PIN noto'g'ri. Bu ism band — o'z PIN'ingizni yozing yoki boshqa ism tanlang." };
    token = acc.token;
  } else if (acc && acc.token !== token) {
    return { err: "Bu ism PIN bilan himoyalangan. PIN'ni yozing yoki boshqa ism tanlang." };
  }
  if (!token) token = crypto.randomUUID();
  if (!db.players[token]) db.players[token] = { name, money: START_MONEY, kitchens: [] };
  if (pin && !acc) {                                        // yangi akkaunt (shu qurilmadagi o'yin saqlanadi)
    for (const [k2, a] of Object.entries(db.accounts)) if (a.token === token) delete db.accounts[k2];
    const salt = crypto.randomBytes(8).toString('hex');
    db.accounts[key] = { token, salt, hash: pinHash(pin, salt) };
  }
  return { token, name, hasPin: !!db.accounts[key] };
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const c = { ws, token: null, name: 'Mehmon', st: null, n: 0, t0: Date.now() };
  clients.set(id, c);

  ws.on('message', (raw) => {
    if (++c.n > 80) { if (Date.now() - c.t0 < 1000) return; c.n = 0; c.t0 = Date.now(); }   // spamdan himoya
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t !== 'hello' && !c.token) return;
    const me = db.players[c.token];
    const k = m.kid ? db.kitchens[m.kid] : null;
    const isHost = k && hosts[m.kid] === id;
    const isOwner = k && k.owners.includes(c.token);

    switch (m.t) {
      case 'hello': {
        if (c.token) break;
        const r = login(m);
        if (r.err) { send(ws, { t: 'auth', ok: false, msg: r.err }); setTimeout(() => ws.close(), 300); break; }
        const { token, name } = r;
        const [oldId, old] = byToken(token);           // bitta akkaunt ikki joyda bo'lmasin
        if (old) { old.ws.close(); clients.delete(oldId); all({ t: 'leave', id: oldId }); }
        const p = db.players[token]; p.name = name;
        c.token = token; c.name = name;
        c.look = sanitizeLook(m.look);
        p.kitchens = p.kitchens.filter((kid) => db.kitchens[kid]);
        if (!p.kitchens.length) createKitchen('oshxona', [token]);
        for (const kid of p.kitchens) refreshNames(db.kitchens[kid]);
        save();
        const players = [...clients].filter(([i, x]) => i !== id && x.token).map(([i, x]) => ({ id: i, name: x.name, st: x.st, look: x.look }));
        send(ws, { t: 'welcome', id, token, hasPin: r.hasPin, money: p.money, mine: p.kitchens, kitchens: db.kitchens, players, hosted: hostedList() });
        all({ t: 'join', id, name, look: c.look }, id);
        for (const kid of p.kitchens) all({ t: 'kitchen', k: db.kitchens[kid] });
        electHosts();
        break;
      }
      case 'st':                                          // o'yinchi joylashuvi
        if (Array.isArray(m.s) && m.s.length <= 8) { c.st = m.s; all({ t: 'st', id, s: m.s }, id); }
        break;
      case 'chat': {
        const text = String(m.text || '').slice(0, 120).replace(/[<>]/g, '');
        if (text) all({ t: 'chat', id, name: c.name, text });
        break;
      }
      case 'ks':                                          // host biznes holatini yuboradi
        if (isHost) all({ t: 'ks', kid: m.kid, s: m.s }, id);
        break;
      case 'act':                                         // sherik harakati -> hostga
        if (!isOwner) break;
        { const h = hosts[m.kid]; if (h && clients.get(h)) send(clients.get(h).ws, { t: 'act', kid: m.kid, act: m.act, cid: m.cid, from: id }); }
        break;

      // ---- iqtisod: hammasi serverda hisoblanadi ----
      case 'cook': {                                      // qozonga masalliq solindi
        if (!isHost) break;
        const n = Math.min(QOZON_CAP[k.up.qozon - 1], Math.floor(k.stock));
        if (n <= 0) break;
        k.stock -= n; k.ready = Math.min(5000, (k.ready || 0) + n);
        all({ t: 'kitchen', k }); save(); break;
      }
      case 'serve': {                                     // mijozga ovqat berildi
        if (!isHost || (k.ready || 0) <= 0) break;
        k.ready--;
        const lv = L(k.id);
        const amt = Math.round(priceFor(k, !!m.vip && floors(k) >= 2) * (m.guest && lv.toy ? 1.5 : 1));
        if (lv.pending.length < 300) lv.pending.push(amt);
        save(); break;
      }
      case 'earn': {                                      // mijoz yeb bo'lib pul to'ladi
        if (!isHost) break;
        const amt = L(k.id).pending.shift();
        if (amt) payOwners(k, amt);
        break;
      }
      case 'load': {                                      // Damasga yuklandi
        if (!isHost && !isOwner) break;
        const n = Math.max(0, Math.floor(+m.n || 0));
        if (!n || (k.ready || 0) < n) break;
        k.ready -= n;
        for (const o of Object.values(orders)) if (o.kid === k.id && o.acc && o.kind === 'yetkazish' && !o.loaded && o.n <= n) { o.loaded = true; break; }
        all({ t: 'kitchen', k }); save(); break;
      }
      case 'rating':
        if (!isHost) break;
        k.rating = Math.max(1, Math.min(5, +m.v || 4)); save(); break;

      // ---- to'y buyurtmalari ----
      case 'order_req': {
        if (!isOwner) break;
        if (orders[c.token]?.acc) { send(ws, { t: 'toast', text: 'Avval hozirgi buyurtmani tugating' }); break; }
        if ((orderCd[c.token] || 0) > Date.now()) { send(ws, { t: 'toast', text: "Yangi buyurtma hali yo'q, biroz kuting" }); break; }
        orderCd[c.token] = Date.now() + 60000;
        const o = weddingOrder(k);
        const hall = floors(k) >= 3 && !L(k.id).toy && Math.random() < 0.5;
        orders[c.token] = { id: crypto.randomUUID().slice(0, 8), kid: k.id, kind: hall ? 'zal' : 'yetkazish', n: o.n, reward: hall ? Math.round(o.reward * 1.5) : o.reward, acc: false };
        send(ws, { t: 'order', o: orders[c.token] });
        break;
      }
      case 'order_acc': {
        const o = orders[c.token]; if (!o || o.id !== m.id || o.acc) break;
        o.acc = true; o.at = Date.now();
        if (o.kind === 'zal') {
          L(o.kid).toy = { reward: o.reward };
          delete orders[c.token];
          const h = hosts[o.kid]; if (h && clients.get(h)) send(clients.get(h).ws, { t: 'act', kid: o.kid, act: 'toy', cid: o.reward });
        }
        break;
      }
      case 'order_done': {                                // to'yxonaga yetkazildi
        const o = orders[c.token]; if (!o || o.id !== m.id || !o.loaded) break;
        if (Date.now() - o.at < 15000) break;
        delete orders[c.token];
        const kk = db.kitchens[o.kid]; if (kk) payOwners(kk, o.reward);
        break;
      }
      case 'toy_done': {                                  // banket zalidagi to'y tugadi
        if (!isHost) break;
        const lv = L(k.id); if (!lv.toy) break;
        const amt = lv.toy.reward; lv.toy = null;
        payOwners(k, amt);
        break;
      }

      case 'buy': {
        if (!isOwner) break;
        const r = tryBuy(k, me.money, m.what, m.key, { atBazaar: !!m.atBazaar });
        if (!r.ok) { send(ws, { t: 'toast', text: r.msg }); break; }
        if (m.what === 'biz') {
          const nk = createKitchen(r.newType, [...k.owners]);
          if (!nk) { send(ws, { t: 'toast', text: "Shaharda bo'sh joy qolmadi" }); break; }
          me.money -= r.cost;
          all({ t: 'kitchen', k: nk });
          for (const t of k.owners) { const [, oc] = byToken(t); if (oc) send(oc.ws, { t: 'mine', mine: db.players[t].kitchens }); }
          electHosts();
        } else {
          me.money -= r.cost; r.apply();
          all({ t: 'kitchen', k });
        }
        moneyTo(c.token); save(); break;
      }
      case 'invite': {                                    // sheriklikka taklif
        const target = clients.get(m.to);
        if (!isOwner || !target) break;
        if (k.owners.length >= MAX_OWNERS) { send(ws, { t: 'toast', text: `Eng ko'pi ${MAX_OWNERS} sherik` }); break; }
        target.invites = { ...(target.invites || {}), [k.id]: true };
        send(target.ws, { t: 'invite', kid: k.id, from: c.name, biz: k.type });
        send(ws, { t: 'toast', text: `${target.name} ga taklif yuborildi` });
        break;
      }
      case 'accept': {
        if (!k || isOwner || !c.invites?.[k.id]) break;             // faqat taklif qilinganlar
        if (k.owners.length >= MAX_OWNERS) { send(ws, { t: 'toast', text: "Sheriklar to'lgan" }); break; }
        delete c.invites[k.id];
        k.owners.push(c.token); me.kitchens.push(k.id); refreshNames(k);
        all({ t: 'kitchen', k });
        for (const t of k.owners) { const [, oc] = byToken(t); if (oc) send(oc.ws, { t: 'mine', mine: db.players[t].kitchens }); }
        all({ t: 'toast', text: `${c.name} sherik bo'ldi: ${k.names.join(', ')}` });
        electHosts(); save(); break;
      }
    }
  });

  ws.on('close', () => {
    if (clients.get(id) !== c) return;
    clients.delete(id);
    if (c.token) all({ t: 'leave', id });
    electHosts();
  });
});

// ---------- ishga tushirish ----------
(async () => {
  let loaded = null;
  if (GH) { try { loaded = await ghLoad(); console.log(loaded ? "Ma'lumotlar GitHub'dan yuklandi" : "GitHub'da ma'lumot yo'q, yangi o'yin"); } catch (e) { console.log('GitHub:', e.message); } }
  if (!loaded) { try { loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { /* yangi o'yin */ } }
  if (loaded) db = loaded;
  fixDb();
  if (GH) setInterval(() => ghSave().catch((e) => { dirty = true; console.log('GitHub saqlash:', e.message); }), 20000);
  const bye = async () => { try { if (GH) { dirty = true; await ghSave(); } } finally { process.exit(0); } };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
  server.listen(PORT, () => console.log(`Osh markazi serveri ishlayapti: http://localhost:${PORT}`));
})();

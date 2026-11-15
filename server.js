// =====================================================================
//  OSH MARKAZI — multiplayer server
//  Ishga tushirish:  npm install   keyin   npm start   (port 3000)
//  O'yin fayllarini ham shu server ko'rsatadi: http://localhost:3000
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  START_MONEY, MAX_OWNERS, newKitchen, fixKitchen, tryBuy,
} from './economy.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(DIR, 'data.json');
const PLOT_COUNT = 12;                 // world.js dagi PLOTS soni bilan bir xil

// ---------- saqlanadigan ma'lumotlar ----------
let db = { players: {}, kitchens: {}, nextK: 1 };
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { /* yangi o'yin */ }
for (const k of Object.values(db.kitchens)) fixKitchen(k);
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(db), () => {}), 1500);
}

// ---------- statik fayllar ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary' };
const PUBLIC = new Set(['index.html', 'game.js', 'world.js', 'economy.js', 'Soldier.glb', 'Michelle.glb']);
const server = http.createServer((req, res) => {
  let f = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  if (!PUBLIC.has(f)) { res.writeHead(404); return res.end('Topilmadi'); }
  fs.readFile(path.join(DIR, f), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Topilmadi'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---------- onlayn holat ----------
const wss = new WebSocketServer({ server });
const clients = new Map();          // id -> { ws, token, name, st }
let nextId = 1;
const hosts = {};                   // kitchenId -> clientId (mijozlarni boshqaradigan o'yinchi)

function sanitizeLook(l) {                    // personaj ko'rinishi (faqat ranglar va jins)
  if (!l || typeof l !== 'object') return null;
  const n = (v) => (Number.isInteger(v) && v >= 0 && v <= 0xffffff ? v : undefined);
  return { gender: l.gender === 'f' ? 'f' : 'm', shirt: n(l.shirt), pants: n(l.pants), skin: n(l.skin), hair: n(l.hair), hat: l.hat === 'doppi' ? 'doppi' : null, scarf: n(l.scarf) ?? null };
}
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const all = (m, except) => { const s = JSON.stringify(m); for (const [id, c] of clients) if (id !== except && c.ws.readyState === 1) c.ws.send(s); };
const byToken = (t) => { for (const [id, c] of clients) if (c.token === t) return [id, c]; return [null, null]; };

function freePlot() {
  const used = new Set(Object.values(db.kitchens).map((k) => k.plot));
  for (let i = 0; i < PLOT_COUNT; i++) if (!used.has(i)) return i;
  return -1;
}
function createKitchen(type, owners) {
  const plot = freePlot(); if (plot < 0) return null;
  const id = 'k' + db.nextK++;
  const names = owners.map((t) => db.players[t]?.name || '?');
  const k = newKitchen(id, plot, type, owners, names);
  db.kitchens[id] = k;
  for (const t of owners) db.players[t]?.kitchens.push(id);
  save();
  return k;
}
function refreshNames(k) { k.names = k.owners.map((t) => db.players[t]?.name || '?'); }

// Har bir biznes uchun "host" — onlayn bo'lgan birinchi egasi mijozlarni boshqaradi
function electHosts() {
  for (const k of Object.values(db.kitchens)) {
    let h = null;
    for (const t of k.owners) { const [id] = byToken(t); if (id) { h = id; break; } }
    if (hosts[k.id] !== h) {
      const old = hosts[k.id];
      hosts[k.id] = h;
      if (old && clients.get(old)) send(clients.get(old).ws, { t: 'host', kid: k.id, on: false });
      if (h) send(clients.get(h).ws, { t: 'host', kid: k.id, on: true });
    }
  }
}
const pendingK = new Map();                  // daromad yangilanishini 3 soniyada bir yuborish
function kitchenLater(k) {
  if (pendingK.has(k.id)) return;
  pendingK.set(k.id, setTimeout(() => { pendingK.delete(k.id); all({ t: 'kitchen', k }); }, 3000));
}
function moneyTo(token) { const [, c] = byToken(token); if (c) send(c.ws, { t: 'money', v: db.players[token].money }); }

wss.on('connection', (ws) => {
  const id = nextId++;
  const c = { ws, token: null, name: 'Mehmon', st: null };
  clients.set(id, c);

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t !== 'hello' && !c.token) return;
    const me = db.players[c.token];

    switch (m.t) {
      case 'hello': {
        const name = String(m.name || 'Mehmon').slice(0, 16).replace(/[<>]/g, '');
        let token = typeof m.token === 'string' && db.players[m.token] ? m.token : crypto.randomUUID();
        const [oldId, old] = byToken(token);           // bitta akkaunt ikki joyda bo'lmasin
        if (old) { old.ws.close(); clients.delete(oldId); all({ t: 'leave', id: oldId }); }
        if (!db.players[token]) db.players[token] = { name, money: START_MONEY, kitchens: [] };
        const p = db.players[token]; p.name = name;
        c.token = token; c.name = name;
        c.look = sanitizeLook(m.look);
        p.kitchens = p.kitchens.filter((kid) => db.kitchens[kid]);
        if (!p.kitchens.length) createKitchen('oshxona', [token]);
        for (const kid of p.kitchens) refreshNames(db.kitchens[kid]);
        save();
        const players = [...clients].filter(([i, x]) => i !== id && x.token).map(([i, x]) => ({ id: i, name: x.name, st: x.st, look: x.look }));
        send(ws, { t: 'welcome', id, token, money: p.money, mine: p.kitchens, kitchens: db.kitchens, players });
        all({ t: 'join', id, name, look: c.look }, id);
        for (const kid of p.kitchens) all({ t: 'kitchen', k: db.kitchens[kid] });
        electHosts();
        break;
      }
      case 'st':                                          // o'yinchi joylashuvi
        c.st = m.s; all({ t: 'st', id, s: m.s }, id); break;
      case 'chat': {
        const text = String(m.text || '').slice(0, 120).replace(/[<>]/g, '');
        if (text) all({ t: 'chat', id, name: c.name, text });
        break;
      }
      case 'ks':                                          // host biznes holatini yuboradi
        if (hosts[m.kid] === id) all({ t: 'ks', kid: m.kid, s: m.s }, id);
        break;
      case 'act': {                                       // sherik harakati -> hostga
        const k = db.kitchens[m.kid]; if (!k || !k.owners.includes(c.token)) break;
        const h = hosts[m.kid]; if (h && clients.get(h)) send(clients.get(h).ws, { t: 'act', kid: m.kid, act: m.act, cid: m.cid, from: id });
        break;
      }
      case 'earn': {                                      // mijoz pul to'ladi: HAR BIR sherikka to'liq
        const k = db.kitchens[m.kid]; if (!k) break;
        const toy = m.reason === 'toy' && k.owners.includes(c.token);   // to'yga yetkazib berish mukofoti
        if (hosts[m.kid] !== id && !toy) break;
        const amt = Math.max(0, Math.min(toy ? 50000000 : 5000000, Math.round(+m.amt || 0)));
        for (const t of k.owners) { if (db.players[t]) { db.players[t].money += amt; moneyTo(t); } }
        k.earned = (k.earned || 0) + amt;
        if (typeof m.rating === 'number') k.rating = Math.max(1, Math.min(5, m.rating));
        kitchenLater(k); save(); break;
      }
      case 'use': {                                       // host masalliq ishlatdi
        const k = db.kitchens[m.kid]; if (!k || hosts[m.kid] !== id) break;
        k.stock = Math.max(0, k.stock - Math.max(0, Math.round(+m.n || 0)));
        all({ t: 'kitchen', k }); save(); break;
      }
      case 'rating': {
        const k = db.kitchens[m.kid]; if (!k || hosts[m.kid] !== id) break;
        k.rating = Math.max(1, Math.min(5, +m.v || 4)); save(); break;
      }
      case 'buy': {
        const k = db.kitchens[m.kid]; if (!k || !k.owners.includes(c.token)) break;
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
        const k = db.kitchens[m.kid]; const target = clients.get(m.to);
        if (!k || !target || !k.owners.includes(c.token)) break;
        if (k.owners.length >= MAX_OWNERS) { send(ws, { t: 'toast', text: `Eng ko'pi ${MAX_OWNERS} sherik` }); break; }
        send(target.ws, { t: 'invite', kid: k.id, from: c.name, biz: k.type });
        send(ws, { t: 'toast', text: `${target.name} ga taklif yuborildi` });
        break;
      }
      case 'accept': {
        const k = db.kitchens[m.kid]; if (!k || k.owners.includes(c.token)) break;
        if (k.owners.length >= MAX_OWNERS) { send(ws, { t: 'toast', text: "Sheriklar to'lgan" }); break; }
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
    all({ t: 'leave', id });
    electHosts();
  });
});

server.listen(PORT, () => console.log(`Osh markazi serveri ishlayapti: http://localhost:${PORT}`));

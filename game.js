// =====================================================================
//  OSH MARKAZI — asosiy o'yin kodi
//  qahramon, kamera, boshqaruv, oshxona ichi, mijozlar, ishchilar,
//  mashinalar, multiplayer, boshidagi video (intro), menyu.
// =====================================================================
import * as THREE from 'three';
import * as W from './world.js';
import * as E from './economy.js';

// GitHub Pages'da o'ynaganda multiplayer server manzili (masalan 'wss://osh-markazi.onrender.com').
// Bo'sh bo'lsa: o'yin serverdan ochilgan bo'lsa o'sha server, aks holda oflayn rejim.
const DEFAULT_SERVER = '';

const $ = (id) => document.getElementById(id);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
const CLOTHES = [0x8a96aa, 0xa0644e, 0x5a8a64, 0x9a8a62, 0x6a6a9a, 0xb08a68, 0x7a7a7a, 0xa2809e, 0x5a7c96, 0xb0a07a];

// =====================================================================
//  RENDER, SAHNA, YORUG'LIK
// =====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;      // Roblox kabi yorqin, to'yingan ranglar
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6ecff, 140, 520);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.25, 900);
camera.position.set(0, 30, 60);

const hemi = new THREE.HemisphereLight(0xffffff, 0x9cb88a, 1.6);
const moon = new THREE.DirectionalLight(0xfff4e0, 2.2);   // quyosh
moon.castShadow = true;
moon.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
moon.shadow.bias = -0.0005;
const roomLight = new THREE.PointLight(0xfff0d8, 0, 30, 1.0);
const fireLight = new THREE.PointLight(0xff8a30, 0, 9, 1.5);
const fillLight = new THREE.PointLight(0xffffff, 0, 16, 1.4);      // qahramon atrofidagi yumshoq yorug'lik
scene.add(hemi, moon, moon.target, roomLight, fireLight, fillLight);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const world = W.buildWorld(scene);
const interiors = {};
function getInterior(plot) {                // biznes turi bo'yicha (oshxona, kafe, restoran) zal
  const kid = G.plotKid[plot], type = (kid && G.kitchens[kid]?.type) || 'oshxona', cur = interiors[plot];
  if (cur && cur.type === type) return cur;
  if (cur) scene.remove(cur.group);
  return (interiors[plot] = W.buildInterior(scene, plot, type));
}

// =====================================================================
//  ODAM — Roblox uslubida, lekin yumaloq (to'rtburchak emas), oddiy kiyimda.
//  Hammasi kod bilan yasalgan: yuklab olinadigan model yo'q, animatsiya ham kodda.
// =====================================================================
const chars = new Set();
const SKINS = [0xf3d0b0, 0xe8b893, 0xd6a07a, 0xbf875f];
const SHIRTS = [0xffffff, 0x3b7dd8, 0xe8524a, 0x34c26a, 0xf4c430, 0x8e5bc4, 0x1fb5a8, 0xf08a3c, 0x46566b, 0x9ec9f0, 0xf2a7c3];
const PANTS = [0x2c3e50, 0x3b4a5e, 0x5d4037, 0x1f2a44, 0x4a4a4a, 0x6d5b45, 0x2f4f6f];
const HAIRS = [0x2b1a10, 0x161616, 0x4a2f1a, 0x6b4a2a];
const SCARFS = [0xd94f70, 0x3b7dd8, 0xf4c430, 0x34c26a, 0xffffff, 0x8e5bc4, 0xf08a3c];
const pick = (a) => a[(Math.random() * a.length) | 0];
const SC = 0.9;                          // umumiy o'lcham (bo'yi ~1.8 m)
const HIP_Y = 0.9 * SC;
const SEAT_H = 0.47;                     // stul o'rindig'i balandligi
export const SIT = { thigh: -1.5, knee: 1.45 };
const MATS = {};
const mat = (c) => MATS[c] || (MATS[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }));
const doppiTex = (() => {                // o'zbek do'ppisi naqshi
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#f2f2f2';
  for (let i = 0; i < 4; i++) { const x = 16 + i * 32; g.beginPath(); g.moveTo(x, 6); g.quadraticCurveTo(x + 9, 16, x, 27); g.quadraticCurveTo(x - 9, 16, x, 6); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const GEO = {
  pelvis: new THREE.SphereGeometry(0.2, 18, 12).scale(1.1, 0.72, 0.85),
  torso: new THREE.CapsuleGeometry(0.22, 0.3, 6, 18).scale(1.08, 1, 0.78).translate(0, 0.36, 0),
  neck: new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12).translate(0, 0.7, 0),
  head: new THREE.SphereGeometry(0.21, 26, 20),
  eye: new THREE.SphereGeometry(0.03, 10, 8),
  eyeW: new THREE.SphereGeometry(0.045, 12, 10).scale(1, 1.1, 0.5),
  brow: new THREE.CapsuleGeometry(0.012, 0.05, 2, 6).rotateZ(Math.PI / 2),
  mouth: new THREE.TorusGeometry(0.05, 0.011, 6, 14, Math.PI).rotateZ(Math.PI),
  nose: new THREE.SphereGeometry(0.03, 10, 8),
  hair: new THREE.SphereGeometry(0.222, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
  hairBack: new THREE.SphereGeometry(0.222, 22, 14, Math.PI * 0.75, Math.PI * 1.5, Math.PI * 0.45, Math.PI * 0.25),
  longHair: new THREE.CapsuleGeometry(0.13, 0.3, 4, 12).scale(1.3, 1, 0.6),
  doppi: new THREE.CylinderGeometry(0.155, 0.19, 0.11, 4, 1, true).rotateY(Math.PI / 4),
  doppiTop: new THREE.CylinderGeometry(0.155, 0.155, 0.01, 4).rotateY(Math.PI / 4),
  scarf: new THREE.SphereGeometry(0.235, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
  scarfBack: new THREE.ConeGeometry(0.22, 0.42, 18, 1, true),
  glasses: new THREE.BoxGeometry(0.26, 0.06, 0.02),
  upper: new THREE.CapsuleGeometry(0.075, 0.2, 4, 12).translate(0, -0.17, 0),
  fore: new THREE.CapsuleGeometry(0.066, 0.18, 4, 12).translate(0, -0.15, 0),
  hand: new THREE.SphereGeometry(0.072, 12, 10).translate(0, -0.31, 0),
  thigh: new THREE.CapsuleGeometry(0.1, 0.24, 4, 12).translate(0, -0.2, 0),
  shin: new THREE.CapsuleGeometry(0.086, 0.26, 4, 12).translate(0, -0.2, 0),
  shoe: new THREE.SphereGeometry(0.1, 14, 10).scale(1, 0.6, 1.55).translate(0, -0.42, 0.045),
  skirt: new THREE.CylinderGeometry(0.21, 0.33, 0.55, 20, 1, true).translate(0, -0.3, 0),
};

class Character {
  constructor({ tint = null, name = null, dot = '#4fc3f7', tag = null, gender = Math.random() < 0.45 ? 'f' : 'm', look = {} } = {}) {
    const L = {
      skin: pick(SKINS), shirt: tint ?? pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIRS), shoes: 0x2a2a2a,
      hat: gender === 'm' && Math.random() < 0.35 ? 'doppi' : null,
      scarf: gender === 'f' && Math.random() < 0.55 ? pick(SCARFS) : null, glasses: false, ...Object.fromEntries(Object.entries(look).filter(([, v]) => v !== undefined)),
    };
    this.root = new THREE.Group(); scene.add(this.root);
    this.pivot = new THREE.Group(); this.root.add(this.pivot);
    const body = new THREE.Group(); body.scale.setScalar(SC); this.pivot.add(body);
    const M = (geo, c, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? mat(c) : c); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    // son-chanoq va oyoqlar
    this.hips = new THREE.Group(); this.hips.position.y = 0.9; body.add(this.hips);
    M(GEO.pelvis, L.pants, this.hips);
    this.legs = [-1, 1].map((s) => {
      const leg = new THREE.Group(); leg.position.set(0.11 * s, -0.02, 0); this.hips.add(leg);
      M(GEO.thigh, L.pants, leg);
      const knee = new THREE.Group(); knee.position.y = -0.42; leg.add(knee);
      M(GEO.shin, L.pants, knee); M(GEO.shoe, L.shoes, knee);
      return { leg, knee };
    });
    if (gender === 'f') M(GEO.skirt, L.shirt, this.hips, 0, 0.05, 0);
    // gavda, qo'llar, bosh
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    M(GEO.torso, L.shirt, this.torso); M(GEO.neck, L.skin, this.torso);
    this.arms = [-1, 1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(0.3 * s, 0.6, 0); sh.rotation.z = 0.08 * s; this.torso.add(sh);
      M(GEO.upper, L.shirt, sh);
      const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      M(GEO.fore, gender === 'f' || Math.random() < 0.5 ? L.shirt : L.skin, el); M(GEO.hand, L.skin, el);
      return { sh, el };
    });
    this.head = new THREE.Group(); this.head.position.y = 0.92; this.torso.add(this.head);
    M(GEO.head, L.skin, this.head);
    for (const s of [-1, 1]) {
      M(GEO.eyeW, 0xffffff, this.head, 0.075 * s, 0.03, 0.185);
      M(GEO.eye, 0x1b1b1b, this.head, 0.075 * s, 0.028, 0.205);
      M(GEO.brow, L.hair, this.head, 0.075 * s, 0.1, 0.19).rotation.z = -0.12 * s;
    }
    M(GEO.nose, L.skin, this.head, 0, -0.02, 0.21);
    M(GEO.mouth, 0x8a3b2e, this.head, 0, -0.085, 0.185);
    if (L.scarf) {
      M(GEO.scarf, L.scarf, this.head, 0, -0.01, -0.01).rotation.x = -0.35;
      const b = M(GEO.scarfBack, L.scarf, this.head, 0, -0.25, -0.1); b.rotation.x = 0.25;
    } else {
      M(GEO.hair, L.hair, this.head, 0, 0.005, -0.01).rotation.x = -0.15;
      M(GEO.hairBack, L.hair, this.head);
      if (gender === 'f') M(GEO.longHair, L.hair, this.head, 0, -0.25, -0.12);
      if (L.hat === 'doppi') {
        M(GEO.doppi, new THREE.MeshStandardMaterial({ map: doppiTex, roughness: 0.7 }), this.head, 0, 0.19, -0.01);
        M(GEO.doppiTop, 0x111111, this.head, 0, 0.245, -0.01);
      }
    }
    if (L.glasses) M(GEO.glasses, 0x0a0a0a, this.head, 0, 0.03, 0.215);
    if (name) { this.label = W.makeLabel(name, { dot }); this.label.position.y = 2.1; this.root.add(this.label); }
    if (tag) { this.tag = W.makeLabel(tag, { bg: 'rgba(46,139,87,0.9)', color: '#fff', scale: 0.8 }); this.tag.position.y = 2.05; this.root.add(this.tag); }
    this.anim = 0; this.sit = false; this.mv = 0; this.rn = 0; this.ph = Math.random() * 6; this.t = Math.random() * 10;
    chars.add(this);
  }
  setAnim(a) { this.anim = a; this.sit = a === 3; }        // 0 turish, 1 yurish, 2 yugurish, 3 o'tirish
  bubble(text, secs = 5) {
    if (this.bub) this.root.remove(this.bub);
    this.bub = W.makeLabel(text, { bg: 'rgba(255,255,255,0.95)', scale: 1.3 });
    this.bub.position.y = 2.5; this.root.add(this.bub); this.bubT = secs;
  }
  update(dt, cam) {
    const far = this.root.position.distanceToSquared(cam) > 90 * 90;
    this.root.visible = !far && !this.hidden;
    if (this.bub) { this.bubT -= dt; if (this.bubT <= 0) { this.root.remove(this.bub); this.bub = null; } }
    if (far) return;
    const a = this.anim, k = Math.min(1, dt * 8);
    this.mv += ((a === 1 || a === 2 ? 1 : 0) - this.mv) * k;
    this.rn += ((a === 2 ? 1 : 0) - this.rn) * Math.min(1, dt * 6);
    this.ph += dt * (7.5 + 4.5 * this.rn) * (this.mv > 0.05 ? 1 : 0);
    this.t += dt;
    const [lL, lR] = this.legs, [aL, aR] = this.arms;
    if (this.sit) {
      for (const l of this.legs) { l.leg.rotation.x = SIT.thigh; l.knee.rotation.x = SIT.knee; }
      aL.sh.rotation.x = aR.sh.rotation.x = -0.55; aL.el.rotation.x = aR.el.rotation.x = -0.75;
      this.torso.rotation.x = 0.04; this.hips.position.y = 0.9;
      this.head.rotation.y = Math.sin(this.t * 0.6) * 0.15;
      return;
    }
    const amp = (0.55 + 0.35 * this.rn) * this.mv, s = Math.sin(this.ph);
    lL.leg.rotation.x = -s * amp; lR.leg.rotation.x = s * amp;
    lL.knee.rotation.x = (0.1 + Math.max(0, Math.sin(this.ph + 1.6)) * (0.9 + 0.6 * this.rn)) * this.mv;
    lR.knee.rotation.x = (0.1 + Math.max(0, Math.sin(this.ph + 1.6 + Math.PI)) * (0.9 + 0.6 * this.rn)) * this.mv;
    const breath = Math.sin(this.t * 2) * 0.03 * (1 - this.mv);
    aL.sh.rotation.x = s * amp * 0.9 + breath; aR.sh.rotation.x = -s * amp * 0.9 + breath;
    aL.el.rotation.x = aR.el.rotation.x = -0.15 - 0.9 * this.rn * this.mv;
    this.torso.rotation.x = 0.16 * this.rn * this.mv;
    this.hips.position.y = 0.9 + Math.abs(Math.cos(this.ph)) * 0.05 * this.mv - 0.02 * this.rn;
    this.head.rotation.y = Math.sin(this.t * 0.5) * 0.12 * (1 - this.mv);
  }
  dispose() { scene.remove(this.root); chars.delete(this); }
}
const sitRootY = () => SEAT_H + 0.06 - HIP_Y;

// =====================================================================
//  O'YIN HOLATI
// =====================================================================
const G = {
  mode: 'start', online: false, myId: null, name: '', money: 0,
  kitchens: {}, mine: [], hostOf: new Set(), views: {}, plotKid: new Array(W.PLOTS.length).fill(null),
  remotes: new Map(), tut: +(localStorage.osh_tut || 0), event: null,
};
const P = { ch: null, pos: new THREE.Vector3(), head: 0, vy: 0, y: 0, room: -1, floor: 1, run: false, seat: null, sendT: 0, drive: null, order: null, cargo: 0 };
const isMine = (kid) => G.mine.includes(kid);

// ---------- oflayn saqlash ----------
function saveOffline() {
  if (G.online) return;
  localStorage.osh_off = JSON.stringify({ money: G.money, kitchens: G.kitchens, mine: G.mine });
}
function loadOffline() {
  let d = null; try { d = JSON.parse(localStorage.osh_off || 'null'); } catch { }
  if (!d || !d.mine?.length) {
    const k = E.newKitchen('k1', 0, 'oshxona', ['me'], [G.name]);
    d = { money: E.START_MONEY, kitchens: { k1: k }, mine: ['k1'] };
  }
  for (const k of Object.values(d.kitchens)) { E.fixKitchen(k); k.names = k.names.map((n, i) => (k.owners[i] === 'me' ? G.name : n)); }
  G.money = d.money; G.kitchens = d.kitchens; G.mine = d.mine;
  G.hostOf = new Set(G.mine);
}

// =====================================================================
//  YO'L TOPISH (trotuarlar bo'ylab)
// =====================================================================
const closest = (arr, v) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), arr[0]);
function nearestLine(p) {
  let best = null;
  for (const z of W.WALK.Z) { const d = Math.abs(p.z - z); if (!best || d < best.d) best = { t: 'H', v: z, d }; }
  for (const x of W.WALK.X) { const d = Math.abs(p.x - x); if (d < best.d) best = { t: 'V', v: x, d }; }
  return best;
}
function route(a, b) {
  const la = nearestLine(a), lb = nearestLine(b);
  const pa = la.t === 'H' ? { x: a.x, z: la.v } : { x: la.v, z: a.z };
  const pb = lb.t === 'H' ? { x: b.x, z: lb.v } : { x: lb.v, z: b.z };
  const pts = [pa];
  if (la.t === lb.t) {
    if (la.v !== lb.v) {
      if (la.t === 'H') { const xv = closest(W.WALK.X, (pa.x + pb.x) / 2); pts.push({ x: xv, z: la.v }, { x: xv, z: lb.v }); }
      else { const zv = closest(W.WALK.Z, (pa.z + pb.z) / 2); pts.push({ x: la.v, z: zv }, { x: lb.v, z: zv }); }
    }
  } else if (la.t === 'H') pts.push({ x: lb.v, z: la.v });
  else pts.push({ x: la.v, z: lb.v });
  pts.push(pb);
  return pts;
}
function stepPath(e, dt, speed) {        // true => manzilga yetdi
  if (!e.path.length) return true;
  const t = e.path[0], dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
  const s = speed * dt;
  if (d <= s) { e.x = t.x; e.z = t.z; e.path.shift(); }
  else { e.x += dx / d * s; e.z += dz / d * s; e.ry = Math.atan2(dx, dz); }
  return !e.path.length;
}
const nearHouses = (pt, n = 18) => world.houses.map((h) => [h, Math.hypot(h.out.x - pt.x, h.out.z - pt.z)]).sort((a, b) => a[1] - b[1]).slice(0, n).map((x) => x[0]);

// =====================================================================
//  BIZNES KO'RINISHI (mijozlar, ishchilar) + HOST SIMULYATSIYASI
// =====================================================================
function orderSprite() {
  const c = document.createElement('canvas'); c.width = 160; c.height = 64;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  s.scale.set(1.1, 0.45, 1); s.position.y = 2.15; s.renderOrder = 11;
  s.userData = { c, t, last: -1 };
  return s;
}
function drawOrder(s, pct, dish) {
  const b = Math.round(pct * 10); if (b === s.userData.last) return; s.userData.last = b;
  const g = s.userData.c.getContext('2d'); g.clearRect(0, 0, 160, 64);
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(4, 4, 152, 50, 12); g.fill();
  g.fillStyle = '#3b2410'; g.font = '600 24px sans-serif'; g.textAlign = 'center'; g.fillText(dish + '!', 80, 30);
  g.fillStyle = '#e5dccb'; g.fillRect(16, 38, 128, 8);
  g.fillStyle = pct > 0.5 ? '#3c9d5a' : pct > 0.25 ? '#e0a030' : '#d9452b'; g.fillRect(16, 38, 128 * pct, 8);
  s.userData.t.needsUpdate = true;
}
const floaters = [];
function floatText(text, pos, color = '#3c9d5a') {
  const s = W.makeLabel(text, { bg: 'rgba(255,255,255,0.95)', color, scale: 1.1 });
  s.position.copy(pos).add(new THREE.Vector3(0, 2.4, 0)); scene.add(s);
  floaters.push({ s, life: 1.6 });
}
const PT = (v) => ({ x: v.x, z: v.z, y: v.y || 0 });

class KView {
  constructor(kid) {
    this.kid = kid; this.ents = new Map(); this.portions = 0; this.cook = 0; this.cookTotal = 1;
    this.rating = G.kitchens[kid]?.rating || 4; this.sim = null; this.seq = 0; this.toy = null;
  }
  get k() { return G.kitchens[this.kid]; }
  get plot() { return W.PLOTS[this.k.plot]; }
  get room() { return getInterior(this.k.plot); }
  makeEnt(id, kind, tint) {
    const e = { id, kind, x: 0, y: 0, fy: 0, z: 0, ry: 0, anim: 0, room: -1, path: [], state: '', pat: 1, tint, tx: 0, ty: 0, tz: 0 };
    if (kind === 'v') { e.mesh = W.makeCar(tint, {}); scene.add(e.mesh); }
    else e.ch = new Character({ tint, tag: kind === 'w1' ? 'Oshpaz' : kind === 'w2' ? 'Ofitsiant' : null, look: kind === 'w1' ? { shirt: 0xffffff, hat: 'doppi' } : kind === 'w2' ? { shirt: 0xffffff, pants: 0x1c1c1c } : {}, gender: kind === 'w1' || kind === 'w2' ? 'm' : undefined });
    this.ents.set(id, e); return e;
  }
  dropEnt(e) {
    if (e.mesh) scene.remove(e.mesh); if (e.ch) e.ch.dispose();
    this.ents.delete(e.id);
  }
  clear() { for (const e of [...this.ents.values()]) this.dropEnt(e); }
  render(dt, interp) {                   // har kadrda: modellarni joyiga qo'yish
    const room = this.room, dish = E.BUSINESS[this.k.type].dish;
    room.update(this.k);
    const foods = new Set();
    for (const e of this.ents.values()) {
      if (interp) {
        const d = Math.hypot(e.tx - e.x, e.tz - e.z);
        if (d > 6 || Math.abs(e.ty - e.y) > 3) { e.x = e.tx; e.z = e.tz; } else { const a = Math.min(1, dt * 10); e.x += (e.tx - e.x) * a; e.z += (e.tz - e.z) * a; }
        e.y = e.ty;
      } else e.y = (e.fy || 0) + (e.anim === 3 ? sitRootY() : 0);
      if (e.mesh) { e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, e.ry, Math.min(1, dt * 8)); continue; }
      e.ch.root.position.set(e.x, e.y, e.z);
      e.ch.root.rotation.y = e.anim === 3 ? e.ry : lerpAngle(e.ch.root.rotation.y, e.ry, Math.min(1, dt * 10));
      e.ch.setAnim(e.anim);
      if (e.kind === 'c') {
        if (e.state === 'w') {
          if (!e.ord) { e.ord = orderSprite(); e.ch.root.add(e.ord); }
          drawOrder(e.ord, e.pat, dish);
        } else if (e.ord) { e.ch.root.remove(e.ord); e.ord = null; }
        if (e.state === 'e' && e.ti !== undefined) foods.add(e.ti * 4 + e.si);
      }
    }
    room.tables.forEach((t, i) => t.seats.forEach((st, j) => { st.food.visible = foods.has(i * 4 + j); }));
  }
  snapshot() {
    const r2 = (v) => Math.round(v * 100) / 100;
    return {
      p: this.portions, c: r2(this.cook), ct: this.cookTotal, r: r2(this.rating), toy: this.toy,
      e: [...this.ents.values()].map((e) => [e.id, e.kind, r2(e.x), r2(e.y), r2(e.z), r2(e.ry), e.anim, e.room, e.state, r2(e.pat), e.tint, e.ti ?? -1, e.si ?? -1]),
    };
  }
  apply(s) {                              // hostdan kelgan holat
    this.portions = s.p; this.cook = s.c; this.cookTotal = s.ct; this.rating = s.r; this.toy = s.toy || null;
    const seen = new Set();
    for (const [id, kind, x, y, z, ry, anim, room, state, pat, tint, ti, si] of s.e) {
      seen.add(id);
      let e = this.ents.get(id);
      if (!e) { e = this.makeEnt(id, kind, tint); e.x = x; e.y = y; e.z = z; }
      Object.assign(e, { tx: x, ty: y, tz: z, ry, anim, room, state, pat, ti: ti < 0 ? undefined : ti, si: si < 0 ? undefined : si });
    }
    for (const e of [...this.ents.values()]) if (!seen.has(e.id)) this.dropEnt(e);
  }
  seatTaken(ti, si) {
    for (const e of this.ents.values()) {
      if (e.kind === 'c' && e.ti === ti && e.si === si && 'giwe'.includes(e.state)) return true;
      if (e.kind === 'v' && e.passenger && e.state === 'd' && e.passenger.seat[0] === ti && e.passenger.seat[1] === si) return true;
    }
    return false;
  }
}
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }

// ---- yo'lda yurish: "tp" nuqtasi — zinapoyadan boshqa qavatga chiqish ----
function stepPathY(e, dt, speed) {
  while (e.path.length && e.path[0].tp) { const t = e.path.shift(); e.x = t.x; e.z = t.z; e.fy = t.y || 0; }
  if (!e.path.length) return true;
  const t = e.path[0];
  const done = stepPath(e, dt, speed);
  if (e.path[0] !== t) e.fy = t.y || 0;
  return done;
}

// ---- host simulyatsiyasi: mijozlar uydan yoki mashinadan kelib, o'tirib, ovqatlanib ketadi ----
class Sim {
  constructor(v) { this.v = v; this.spawnT = 3; this.sendT = 0; this.rateT = 0; this.toyT = 0; }
  seatWorld(ti, si) { return this.v.room.seatW(ti, si); }
  freeSeat(kinds = ['hall', 'vip']) {
    const vis = W.visibleTables(this.v.k), free = [];
    for (const ti of vis) {
      if (!kinds.includes(W.TABLE_KIND[ti])) continue;
      for (let si = 0; si < 4; si++) if (!this.v.seatTaken(ti, si) && !playerOnSeat(this.v, ti, si)) free.push([ti, si]);
    }
    return free.length ? free[(Math.random() * free.length) | 0] : null;
  }
  spawn(guest = false) {
    const v = this.v, seat = this.freeSeat(guest ? ['toy'] : ['hall', 'vip']); if (!seat) return false;
    const id = 'c' + (++v.seq) + Math.random().toString(36).slice(2, 5);
    const tint = CLOTHES[(Math.random() * CLOTHES.length) | 0];
    const p = v.plot;
    if (Math.random() < 0.45) {                         // mashinada keladi
      const car = v.makeEnt('v' + id, 'v', [0xe9e9ec, 0x1f1f22, 0xb22234, 0x2e5f9e, 0xc9c9c9][(Math.random() * 5) | 0]);
      car.carDir = p.carDir; car.s = clamp(p.curb.x - p.carDir * 110, -W.HALF + 6, W.HALF - 6);
      car.x = car.s; car.z = p.curb.z; car.ry = car.carDir > 0 ? 0 : Math.PI; car.state = 'd';
      car.passenger = { id, tint, seat, guest };
      if (car.mesh) car.mesh.rotation.y = car.ry;
    } else {                                            // uyidan piyoda chiqib keladi
      const h = nearHouses(p.approach)[(Math.random() * 18) | 0];
      const e = v.makeEnt(id, 'c', tint);
      e.x = h.door.x; e.z = h.door.z; e.ti = seat[0]; e.si = seat[1]; e.state = 'g'; e.guest = guest;
      e.path = [h.gate, h.out, ...route(h.out, p.approach), p.approach, p.door];
    }
    return true;
  }
  serve(e) {
    const v = this.v;
    if (!e || e.state !== 'w' || v.portions <= 0) return false;
    v.portions--; e.state = 'e'; e.eatT = 10; e.pat = 1;
    return true;
  }
  startCook(byWorker = false) {                       // masalliq bo'lsa pishiradi
    const v = this.v, k = v.k; if (v.cook > 0) return 'busy';
    const n = Math.min(E.QOZON_CAP[k.up.qozon - 1], Math.floor(k.stock));
    if (n <= 0) return 'nostock';
    k.stock -= n;
    if (G.online) net.send({ t: 'use', kid: v.kid, n }); else saveOffline();
    v.cookN = n; v.cookTotal = E.cookTimeFor(k, byWorker); v.cook = v.cookTotal; return 'ok';
  }
  startToy(order) {                                   // banket zalida to'y
    const v = this.v; if (v.toy || (v.k.up.qavat || 1) < 3) return false;
    v.toy = { left: E.WEDDING_GUESTS, done: 0, total: E.WEDDING_GUESTS, bonus: order.reward };
    this.toyT = 0; return true;
  }
  load(n) {                                           // Damasga yuklash
    const v = this.v; if (v.portions < n) return false;
    v.portions -= n; return true;
  }
  leave(e, paid) {
    const v = this.v, sw = this.seatWorld(e.ti, e.si);
    if (paid) {
      const amt = Math.round(E.priceFor(v.k, sw.kind === 'vip') * (e.guest ? 1.5 : 1));
      earn(v.kid, amt, new THREE.Vector3(e.x, e.y, e.z));
      v.rating = Math.min(5, v.rating + 0.03);
    } else {
      v.rating = Math.max(1, v.rating - 0.15);
      e.ch.bubble('Juda uzoq kutdim!', 3);
    }
    if (e.guest && v.toy) { v.toy.done++; if (v.toy.done >= v.toy.total) { earn(v.kid, v.toy.bonus, v.room.doorIn.clone()); toast(`To'y tugadi! Bonus: ${fmt(v.toy.bonus)}`); v.toy = null; } }
    e.state = 'o'; e.anim = 1;
    e.path = W.reversePath([PT(v.room.doorIn), ...sw.path, { x: sw.x, z: sw.z, y: sw.y }]).slice(1);
  }
  worker(id, has, home) {
    const v = this.v; let w = v.ents.get(id);
    if (has && !w) { w = v.makeEnt(id, id, id === 'w1' ? 0xffffff : 0xd8d0c0); w.x = home.x; w.z = home.z; w.room = v.k.plot; w.state = 'i'; w.ry = Math.PI; }
    if (!has && w) { v.dropEnt(w); w = null; }
    return w;
  }
  update(dt) {
    const v = this.v, k = v.k, room = v.room, p = v.plot;
    // pishirish
    if (v.cook > 0) { v.cook -= dt; if (v.cook <= 0) { v.cook = 0; v.portions += v.cookN || 0; } }
    // ishchilar (ishchilar xonasi bo'lsa tezroq)
    const fast = E.hasRoom(k, 'ishchi') ? 1.3 : 1;
    const chef = this.worker('w1', k.workers.oshpaz, room.qozon);
    if (chef) { chef.ry = Math.PI; chef.anim = 0; if (v.portions === 0 && v.cook === 0) this.startCook(true); }
    const waiter = this.worker('w2', k.workers.ofitsiant, room.waiterHome);
    if (waiter) {
      if (waiter.state === 'i' && v.portions > 0) {
        const target = [...v.ents.values()].find((e) => e.kind === 'c' && e.state === 'w' && !e.targeted);
        if (target) {
          const sw = this.seatWorld(target.ti, target.si); target.targeted = true; waiter.target = target.id; waiter.state = 'm';
          const go = sw.floor === 1
            ? [PT(room.waiterHome), { x: sw.path[1].x, z: room.waiterHome.z, y: 0 }, ...sw.path.slice(1)]
            : [PT(room.waiterHome), sw.path[1], ...sw.path.slice(2)];
          waiter.path = go.slice(1); waiter.back = W.reversePath(go).slice(1);
        }
      }
      const arrived = stepPathY(waiter, dt, 2.2 * fast); waiter.anim = waiter.path.length ? 1 : 0;
      if (arrived && waiter.state === 'm') {
        const t = v.ents.get(waiter.target); if (t) { this.serve(t); t.targeted = false; }
        waiter.state = 'b'; waiter.path = waiter.back;
      } else if (arrived && waiter.state === 'b') { waiter.state = 'i'; waiter.ry = Math.PI; }
    }
    // yangi mijozlar (sheriklar va bayram ko'proq mijoz olib keladi)
    const owners = Math.max(1, k.names.length);
    this.spawnT -= dt * (1 + 0.5 * (owners - 1)) * (G.event?.mul || 1);
    if (this.spawnT <= 0) { this.spawnT = E.SPAWN_EVERY[k.up.reklama - 1] * rnd(0.8, 1.25); this.spawn(false); }
    if (v.toy && v.toy.left > 0) { this.toyT -= dt; if (this.toyT <= 0) { this.toyT = 1.6; if (this.spawn(true)) v.toy.left--; } }
    // mijozlar va mashinalar
    for (const e of [...v.ents.values()]) {
      if (e.kind === 'v') this.updCar(e, dt);
      else if (e.kind === 'c') this.updCust(e, dt, room, p);
    }
    this.sendT -= dt;
    if (G.online && this.sendT <= 0) { this.sendT = 0.2; net.send({ t: 'ks', kid: v.kid, s: v.snapshot() }); }
    this.rateT -= dt;
    if (this.rateT <= 0) { this.rateT = 10; if (G.online) net.send({ t: 'rating', kid: v.kid, v: v.rating }); else { k.rating = v.rating; saveOffline(); } }
  }
  updCar(c, dt) {
    const v = this.v, p = v.plot;
    if (c.state === 'd') {                                    // to'xtash joyiga kelyapti
      const left = (p.curb.x - c.s) * c.carDir;
      const sp = clamp(left * 0.9, 2, 12);
      c.s += c.carDir * sp * dt;
      if (left <= 0.3) {
        c.state = 's'; c.wait = 2.2;
        const ps = c.passenger, e = v.makeEnt(ps.id, 'c', ps.tint);
        const side = p.roadZ - p.f * W.WALK_OFF;
        e.x = c.s; e.z = p.curb.z - p.f * 1.4; e.ti = ps.seat[0]; e.si = ps.seat[1]; e.state = 'g'; e.guest = ps.guest;
        e.path = [{ x: c.s, z: side }, p.approach, p.door];
      }
    } else if (c.state === 's') { c.wait -= dt; if (c.wait <= 0) c.state = 'l'; }
    else if (c.state === 'l') { c.s += c.carDir * 11 * dt; if (Math.abs(c.s) > W.HALF - 4) { v.dropEnt(c); return; } }
    c.x = c.s; c.z = p.curb.z; c.ry = c.carDir > 0 ? 0 : Math.PI;
  }
  updCust(e, dt, room, p) {
    const v = this.v;
    switch (e.state) {
      case 'g': {                                             // oshxonaga kelyapti (ko'chada)
        e.anim = 1;
        if (stepPath(e, dt, 1.9)) {
          e.room = v.k.plot; e.x = room.doorIn.x; e.z = room.doorIn.z; e.fy = 0;
          const sw = this.seatWorld(e.ti, e.si);
          e.path = [...sw.path, { x: sw.x, z: sw.z, y: sw.y }]; e.state = 'i';
        }
        break;
      }
      case 'i':                                               // ichkarida joyiga boryapti
        e.anim = 1;
        if (stepPathY(e, dt, 1.7)) {
          const sw = this.seatWorld(e.ti, e.si);
          e.state = 'w'; e.anim = 3; e.ry = sw.ry; e.fy = sw.y; e.patMax = E.patienceFor(v.k) * (e.guest ? 2.5 : 1); e.pat = 1;
        }
        break;
      case 'w':                                               // buyurtma kutyapti
        e.pat -= dt / e.patMax;
        if (e.pat <= 0) this.leave(e, false);
        break;
      case 'e':                                               // ovqatlanyapti
        e.eatT -= dt; if (e.eatT <= 0) this.leave(e, true);
        break;
      case 'o':                                               // eshikka chiqib ketyapti
        if (stepPathY(e, dt, 1.7)) {
          e.room = -1; e.x = p.door.x; e.z = p.door.z + p.f * 0.6; e.fy = 0;
          const h = nearHouses(p.approach)[(Math.random() * 18) | 0];
          e.path = [p.approach, ...route(p.approach, h.out), h.out, h.gate, h.door]; e.state = 'h';
        }
        break;
      case 'h':                                               // uyiga qaytyapti
        e.anim = 1;
        if (stepPath(e, dt, 1.9)) v.dropEnt(e);
        break;
    }
  }
}
function playerOnSeat(v, ti, si) { return P.seat && P.seat.kid === v.kid && P.seat.ti === ti && P.seat.si === si; }

function earn(kid, amt, pos, reason = null) {
  floatText('+' + fmt(amt), pos);
  if (pos.distanceTo(P.pos) < 25) sfx.coin();
  if (G.online) net.send({ t: 'earn', kid, amt, reason });
  else { G.money += amt; const k = G.kitchens[kid]; if (k) k.earned = (k.earned || 0) + amt; saveOffline(); }
}

function ensureView(kid) {
  if (!G.views[kid]) G.views[kid] = new KView(kid);
  const v = G.views[kid];
  if (G.hostOf.has(kid) && !v.sim) { v.clear(); v.sim = new Sim(v); }
  if (!G.hostOf.has(kid) && v.sim) { v.sim = null; }
  return v;
}
function setKitchen(k) {
  E.fixKitchen(k);
  const old = G.kitchens[k.id];
  if (old && old.plot !== k.plot) G.plotKid[old.plot] = null;
  G.kitchens[k.id] = k; G.plotKid[k.plot] = k.id;
  world.plotViews[k.plot].set(k);
  ensureView(k.id);
}

// =====================================================================
//  MASHINALAR (ko'cha harakati) VA PIYODALAR
// =====================================================================
const traffic = [];
function spawnTraffic(n) {
  const cols = [0xe9e9ec, 0x1f1f22, 0xb22234, 0x2e5f9e, 0xc9c9c9, 0x3a6e4a, 0xd8c8a0];
  for (let i = 0; i < n; i++) {
    const mesh = W.makeCar(cols[i % cols.length]); scene.add(mesh);
    traffic.push({ mesh, axis: Math.random() < 0.5 ? 'x' : 'z', line: W.LINES[(Math.random() * 6) | 0], dir: Math.random() < 0.5 ? 1 : -1, s: rnd(-180, 180), sp: rnd(8, 12), plan: null, ry: 0 });
  }
}
function updateTraffic(dt) {
  for (const c of traffic) {
    const X = (s) => (c.axis === 'x' ? s : c.line - W.LANE_OFF * c.dir), Z = (s) => (c.axis === 'x' ? c.line + W.LANE_OFF * c.dir : s);
    // o'yinchi oldida bo'lsa to'xtaydi
    const ax = X(c.s + c.dir * 4), az = Z(c.s + c.dir * 4);
    const block = P.room < 0 && Math.hypot(P.pos.x - ax, P.pos.z - az) < 3.2;
    const sp = block ? 0 : c.sp;
    if (!c.plan) {
      const ahead = W.LINES.filter((m) => (m - c.s) * c.dir > 1).sort((a, b) => (a - b) * c.dir)[0];
      if (ahead !== undefined && Math.abs(ahead - c.s) < 14) {
        if (Math.random() < 0.4) {
          const nd = Math.random() < 0.5 ? 1 : -1;
          const tp = c.axis === 'x' ? ahead - W.LANE_OFF * nd : ahead + W.LANE_OFF * nd;
          c.plan = { tp, ahead, nd };
        } else c.plan = { straight: true, ahead };
      }
    }
    c.s += c.dir * sp * dt;
    if (c.plan) {
      if (c.plan.straight) { if ((c.s - c.plan.ahead) * c.dir > 6) c.plan = null; }
      else if ((c.s - c.plan.tp) * c.dir >= 0) {
        const cur = c.axis === 'x' ? Z(c.s) : X(c.s);
        c.axis = c.axis === 'x' ? 'z' : 'x'; c.line = c.plan.ahead; c.dir = c.plan.nd; c.s = cur; c.plan = null;
      }
    }
    if (Math.abs(c.s) > W.HALF - 3) { c.dir = -c.dir; c.s = clamp(c.s, -W.HALF + 3.5, W.HALF - 3.5); }
    const x = X(c.s), z = Z(c.s);
    c.mesh.position.set(x, 0, z);
    const target = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    c.ry = lerpAngle(c.ry, target, Math.min(1, dt * 6)); c.mesh.rotation.y = c.ry;
  }
}
const peds = [];
function spawnPeds(n) {
  for (let i = 0; i < n; i++) {
    const h = world.houses[(Math.random() * world.houses.length) | 0];
    const e = { ch: new Character({ tint: CLOTHES[i % CLOTHES.length] }), x: h.out.x, z: h.out.z, ry: 0, path: [], wait: rnd(0, 6) };
    peds.push(e);
  }
}
function updatePeds(dt) {
  for (const e of peds) {
    if (!e.path.length) {
      e.wait -= dt; e.ch.setAnim(0);
      if (e.wait <= 0) { const h = world.houses[(Math.random() * world.houses.length) | 0]; e.path = route({ x: e.x, z: e.z }, h.out); e.path.push(h.out); e.wait = rnd(3, 10); }
    } else { stepPath(e, dt, 1.4); e.ch.setAnim(1); }
    e.ch.root.position.set(e.x, 0, e.z);
    e.ch.root.rotation.y = lerpAngle(e.ch.root.rotation.y, e.ry, Math.min(1, dt * 8));
  }
}

// =====================================================================
//  BOSHQARUV (klaviatura, sichqoncha, sensor joystik)
// =====================================================================
const keys = {};
let joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 }, look = { id: null, x: 0, y: 0 };
let camYaw = 0, camPitch = 0.32, camDist = 5.5;
addEventListener('keydown', (e) => {
  if (document.activeElement === $('chatIn') || document.activeElement === $('nameIn')) {
    if (e.key === 'Enter' && document.activeElement === $('chatIn')) sendChat();
    return;
  }
  keys[e.code] = true;
  if (e.code === 'KeyE') doAction();
  if (e.code === 'Space') jump();
  if (e.code === 'Enter') { $('chatIn').focus(); e.preventDefault(); }
  if (e.code === 'KeyM' || e.code === 'Tab') { e.preventDefault(); toggleMenu(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
const cvs = renderer.domElement;
let mouseDown = false;
cvs.addEventListener('mousedown', () => { mouseDown = true; });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', (e) => { if (mouseDown && G.mode === 'play') { camYaw -= e.movementX * 0.005; camPitch = clamp(camPitch + e.movementY * 0.004, -0.15, 1.2); } });
cvs.addEventListener('wheel', (e) => { camDist = clamp(camDist + e.deltaY * 0.005, 2.5, 12); });
// sensor: chap tomonda joystik, o'ng tomonda kamera
const joyEl = $('joy'), base = $('joyBase'), knob = $('joyKnob');
joyEl.addEventListener('pointerdown', (e) => {
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joyEl.setPointerCapture(e.pointerId);
  base.style.display = 'block'; base.style.left = e.clientX + 'px'; base.style.top = (e.clientY - joyEl.getBoundingClientRect().top) + 'px';
});
joyEl.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 50;
  if (d > m) { dx = dx / d * m; dy = dy / d * m; }
  joy.x = dx / m; joy.y = -dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; base.style.display = 'none'; knob.style.transform = ''; };
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
cvs.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; } });
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId !== look.id) return;
  camYaw -= (e.clientX - look.x) * 0.008; camPitch = clamp(camPitch + (e.clientY - look.y) * 0.006, -0.15, 1.2);
  look.x = e.clientX; look.y = e.clientY;
});
cvs.addEventListener('pointerup', (e) => { if (e.pointerId === look.id) look.id = null; });
$('runBtn').onclick = () => { P.run = !P.run; $('runBtn').classList.toggle('on', P.run); };
$('jumpBtn').onclick = () => jump();
$('actBtn').onclick = () => doAction();
$('bossBtn').onclick = () => toggleMenu();
$('chatBtn').onclick = () => sendChat();
function jump() { if (G.mode === 'play' && P.y <= 0.001 && !P.seat) P.vy = 5.2; }

// =====================================================================
//  QAHRAMON HARAKATI, TO'QNASHUV, MASHINA HAYDASH, HARAKAT TUGMASI
// =====================================================================
function collide(p, r, cols) {
  let hit = false;
  for (const c of cols) {
    if (c.round) {
      const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz);
      if (d < c.round + r && d > 0.001) { const k = (c.round + r) / d; p.x = c.cx + dx * k; p.z = c.cz + dz * k; hit = true; }
      continue;
    }
    if (p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r) continue;
    const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d > 1e-4) { if (d < r) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; hit = true; } }
    else {
      const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b);
      if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
      hit = true;
    }
  }
  return hit;
}
function currentView() { return P.room >= 0 && G.plotKid[P.room] ? G.views[G.plotKid[P.room]] : null; }
const baseY = () => (P.room >= 0 ? W.floorY(P.floor) : 0);
function inputVec() {
  return {
    ix: clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, -1, 1),
    iy: clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y, -1, 1),
  };
}

function updatePlayer(dt) {
  if (P.drive) return updateDrive(dt);
  const { ix, iy } = inputVec();
  const mag = Math.min(1, Math.hypot(ix, iy));
  let anim = 0;
  if (P.seat) { if (mag > 0.3) standUp(); else anim = 3; }
  if (!P.seat && mag > 0.08) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx;
    const mx = (fx * iy + rx * ix), mz = (fz * iy + rz * ix), ml = Math.hypot(mx, mz) || 1;
    const running = P.run || keys.ShiftLeft || keys.ShiftRight;
    const speed = (running ? 5.6 : 2.3) * (IS_TOUCH ? Math.max(0.45, mag) : 1);
    P.pos.x += mx / ml * speed * dt; P.pos.z += mz / ml * speed * dt;
    P.head = lerpAngle(P.head, Math.atan2(mx, mz), Math.min(1, dt * 12));
    anim = running ? 2 : 1;
  }
  P.vy -= 15 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0;
  const v = currentView();
  const cols = P.room < 0 ? world.colliders : getInterior(P.room).colliders(P.floor, v ? v.k : { up: {} });
  if (!P.seat) collide(P.pos, 0.35, cols);
  P.ch.hidden = false;
  P.ch.root.position.set(P.pos.x, baseY() + (P.seat ? sitRootY() : P.y), P.pos.z);
  P.ch.root.rotation.y = P.head;
  P.ch.setAnim(anim);
  P.anim = anim;
  sendState(dt, anim, P.head);
}
function sendState(dt, anim, head) {
  P.sendT -= dt;
  if (G.online && P.sendT <= 0) {
    P.sendT = 0.1;
    net.send({ t: 'st', s: [+P.pos.x.toFixed(2), +P.ch.root.position.y.toFixed(2), +P.pos.z.toFixed(2), +head.toFixed(2), anim, P.room] });
  }
}

// ---- Damas haydash ----
function startDrive(pv) {
  const d = pv.damas; if (!d) return;
  pv.freeDamas();
  P.drive = { pv, speed: 0, yaw: d.rotation.y };
  P.pos.set(d.position.x, 0, d.position.z);
  P.ch.hidden = true; camDist = 9; camPitch = 0.3;
  audioInit(); engineStart();
  if (G.tut < 9) toast("Joystik: oldinga — gaz, orqaga — tormoz, chap/o'ng — rul.", null, 5);
}
function stopDrive() {
  const D = P.drive; if (!D) return;
  const d = D.pv.damas, yaw = D.yaw;
  P.drive = null;
  if (Math.hypot(d.position.x - D.pv.park.x, d.position.z - D.pv.park.z) < 9) D.pv.parkDamas();     // joyiga qaytdi
  P.pos.set(d.position.x + Math.sin(yaw) * 1.8, 0, d.position.z + Math.cos(yaw) * 1.8);
  collide(P.pos, 0.35, world.colliders);
  P.head = yaw; camDist = 5.5;
  engineStop();
}
function updateDrive(dt) {
  const D = P.drive, d = D.pv.damas, { ix, iy } = inputVec();
  D.speed += iy * (iy * D.speed < 0 ? 16 : 8) * dt;
  if (Math.abs(iy) < 0.1) D.speed *= 1 - 1.4 * dt;
  D.speed = clamp(D.speed, -6, 17);
  D.yaw -= ix * dt * 1.9 * clamp(D.speed / 5, -1, 1);
  const pos = new THREE.Vector3(d.position.x + Math.cos(D.yaw) * D.speed * dt, 0, d.position.z - Math.sin(D.yaw) * D.speed * dt);
  if (collide(pos, 1.5, world.colliders)) D.speed *= 0.4;
  d.position.copy(pos); d.rotation.y = D.yaw;
  P.pos.copy(pos);
  // kamera mashina orqasidan yuradi
  if (look.id === null && !mouseDown) camYaw = lerpAngle(camYaw, Math.atan2(-Math.cos(D.yaw), Math.sin(D.yaw)), Math.min(1, dt * 3));
  if (SND.eng) engineSet(Math.abs(D.speed) / 17, 0.25);
  sendState(dt, 4, D.yaw);
}

// ---- harakat tugmasi: vaziyatga qarab ----
let currentAction = null;
const atBazaar = () => P.room < 0 && Math.abs(P.pos.x - 0) < 26 && Math.abs(P.pos.z + 64) < 26;
function findAction() {
  if (P.seat) return { label: 'Turish', fn: standUp };
  if (P.drive) {
    if (P.order?.kind === 'yetkazish' && P.cargo && Math.hypot(P.pos.x - P.order.target.x, P.pos.z - P.order.target.z) < 12) return { label: "To'yga topshirish", fn: deliverOrder };
    return { label: 'Mashinadan tushish', fn: stopDrive };
  }
  if (P.room < 0) {
    for (const p of W.PLOTS) {
      const kid = G.plotKid[p.i];
      if (kid && Math.hypot(P.pos.x - p.door.x, P.pos.z - p.door.z) < 3.2) return { label: 'Kirish', fn: () => enterRoom(p.i) };
      const pv = world.plotViews[p.i];
      if (kid && isMine(kid) && pv.damas && pv.damas.position.distanceTo(P.pos) < 3.4) {
        const o = P.order;
        if (o?.kind === 'yetkazish' && !P.cargo && o.kid === kid) return { label: `Damasga yuklash (${o.n} porsiya)`, fn: () => loadOrder(G.views[kid]) };
        return { label: "Damasga o'tirish", fn: () => startDrive(pv) };
      }
    }
    if (atBazaar()) return { label: 'Masalliq olish', fn: () => { menuTab = 'bozor'; markTab(); if ($('menu').classList.contains('hide')) toggleMenu(); else renderMenu(); } };
    if (P.order?.kind === 'yetkazish' && P.cargo && Math.hypot(P.pos.x - P.order.target.x, P.pos.z - P.order.target.z) < 6) return { label: "To'yga topshirish", fn: deliverOrder };
    return null;
  }
  const room = getInterior(P.room), v = currentView(), k = v?.k;
  if (!k) return null;
  const near = (pt, r) => Math.hypot(P.pos.x - pt.x, P.pos.z - pt.z) < r;
  // zinapoyalar
  for (const st of room.stairs) {
    if (P.floor === st.from && near(st.bottom, 1.5)) {
      if ((k.up.qavat || 1) > st.from) return { label: `${st.from + 1}-qavatga chiqish`, fn: () => changeFloor(st.from + 1, st.top) };
      return { label: `${st.from + 1}-qavat yopiq`, fn: () => toast(`${st.from + 1}-qavatni Boshqaruv → Qavatlar bo'limida qurasiz`) };
    }
    if (P.floor === st.from + 1 && near(st.downAt, 1.6)) return { label: 'Pastga tushish', fn: () => changeFloor(st.from, st.back) };
  }
  if (P.floor === 1 && near(room.doorIn, 1.8)) return { label: 'Chiqish', fn: exitRoom };
  const owner = isMine(v.kid);
  if (P.floor === 1) {
    const nq = W.qozonCount(k.up.qozon);
    if (owner && v.cook <= 0 && room.qozons.slice(0, nq).some((q) => near(q, 3.9))) {
      return { label: v.portions > 0 ? 'Yana pishirish' : 'Pishirish', fn: () => kAction(v, 'cook') };
    }
  }
  if (owner && v.portions > 0) {
    for (const e of v.ents.values()) if (e.kind === 'c' && e.state === 'w' && Math.abs(e.y - baseY() - sitRootY()) < 2 && near(e, 2.3)) {
      return { label: `${E.BUSINESS[k.type].dish} berish`, fn: () => kAction(v, 'serve', e.id) };
    }
  }
  for (const ti of W.visibleTables(k)) for (let si = 0; si < 4; si++) {
    const sw = room.seatW(ti, si);
    if (sw.floor !== P.floor || !near(sw.app, 0.9) || v.seatTaken(ti, si)) continue;
    return { label: "O'tirish", fn: () => { P.seat = { kid: v.kid, ti, si, back: new THREE.Vector3(sw.app.x, 0, sw.app.z) }; P.pos.set(sw.x, 0, sw.z); P.head = sw.ry; } };
  }
  return null;
}
function standUp() { if (!P.seat) return; P.pos.copy(P.seat.back); P.seat = null; }
function doAction() { if (G.mode === 'play' && currentAction) currentAction.fn(); }

function kAction(v, act, cid) {
  if (v.sim) {
    if (act === 'cook') {
      const r = v.sim.startCook();
      if (r === 'ok') P.ch.bubble(`${E.BUSINESS[v.k.type].dish} tayyorlanyapti…`, 2.5);
      if (r === 'nostock') toast("Masalliq tugadi! Bozorga boring yoki Boshqaruv → Bozor bo'limidan oling.");
    }
    if (act === 'serve') v.sim.serve(v.ents.get(cid));
  } else net.send({ t: 'act', kid: v.kid, act, cid });
  if (act === 'cook' && G.tut < 2) setTut(2);
  if (act === 'serve' && G.tut < 3) setTut(3);
}
function changeFloor(f, pt) {
  fadeThen(() => { P.floor = f; P.pos.set(pt.x, 0, pt.z); P.y = 0; });
}

function fadeThen(fn) {
  const f = $('fade'); f.style.opacity = 1;
  setTimeout(() => { fn(); f.style.opacity = 0; }, 360);
}
function enterRoom(plot) {
  fadeThen(() => {
    const room = getInterior(plot);
    P.room = plot; P.floor = 1; P.pos.set(room.doorIn.x, 0, room.doorIn.z - 0.6); P.head = Math.PI;
    camYaw = 0; camDist = 4.2;
    if (G.tut < 1 && isMine(G.plotKid[plot])) setTut(1);
  });
}
function exitRoom() {
  fadeThen(() => {
    const p = W.PLOTS[P.room];
    P.room = -1; P.floor = 1; P.pos.set(p.door.x, 0, p.door.z + p.f * 1.6); P.head = p.f > 0 ? 0 : Math.PI;
    camYaw = p.f > 0 ? 0 : Math.PI; camDist = 5.5;
  });
}

// ---- to'y buyurtmalari ----
const orderBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 40, 16, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xf06292, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
orderBeacon.visible = false; scene.add(orderBeacon);
let orderT = 70;
function offerOrder() {
  const kid = G.mine[0], k = G.kitchens[kid]; if (!k || P.order) return;
  const o = E.weddingOrder(k);
  const hall = (k.up.qavat || 1) >= 3 && Math.random() < 0.5;
  const order = hall ? { kind: 'zal', kid, ...o, reward: o.reward * 1.5 } : { kind: 'yetkazish', kid, ...o };
  const txt = hall
    ? `To'y buyurtmasi: banket zalingizda ${E.WEDDING_GUESTS} mehmon. Bonus: ${fmt(order.reward)}`
    : `To'y buyurtmasi: ${order.n} porsiya ${E.BUSINESS[k.type].dish.toLowerCase()}ni Damasda to'yxonaga yetkazing. Mukofot: ${fmt(order.reward)}`;
  toast(txt, [{ t: 'Qabul qilish', fn: () => acceptOrder(order) }, { t: 'Keyinroq', no: true }], 15);
}
function acceptOrder(o) {
  if (o.kind === 'zal') {
    const v = G.views[o.kid];
    if (v?.sim) v.sim.startToy(o); else net.send({ t: 'act', kid: o.kid, act: 'toy', cid: o.reward });
    toast("Mehmonlar kelyapti! Banket zalida (3-qavat) ularga ovqat bering.");
    return;
  }
  const far = world.houses.filter((h) => Math.hypot(h.out.x - P.pos.x, h.out.z - P.pos.z) > 70);
  const h = far[(Math.random() * far.length) | 0];
  P.order = { ...o, target: { x: h.out.x, z: h.out.z } }; P.cargo = 0;
  toast(`Avval oshxonada ${o.n} porsiya tayyorlang, keyin Damasga yuklang.`, null, 6);
}
function loadOrder(v) {
  const n = P.order.n;
  if (v.sim) { if (!v.sim.load(n)) { toast(`Oshxonada ${n} porsiya tayyor bo'lishi kerak (hozir ${v.portions})`); return; } }
  else { if (v.portions < n) { toast(`Oshxonada ${n} porsiya tayyor bo'lishi kerak (hozir ${v.portions})`); return; } net.send({ t: 'act', kid: v.kid, act: 'load', cid: n }); }
  P.cargo = n; toast("Yuklandi! Pushti nur ko'rsatgan to'yxonaga haydang.");
}
function deliverOrder() {
  const o = P.order; if (!o) return;
  earn(o.kid, o.reward, P.pos.clone(), 'toy');
  toast(`To'y egalari xursand! +${fmt(o.reward)}`);
  P.order = null; P.cargo = 0;
}

// =====================================================================
//  KAMERA
// =====================================================================
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const inside = P.room >= 0, by = baseY();
  const ty = P.drive ? 1.8 : by + (P.seat ? 0.9 : P.y) + 1.55;
  camTarget.lerp(new THREE.Vector3(P.pos.x, ty, P.pos.z), Math.min(1, dt * 12));
  if (Math.abs(camTarget.y - ty) > 3) camTarget.y = ty;                  // qavat almashganda
  const d = inside ? Math.min(camDist, 4.6) : camDist;
  const pos = new THREE.Vector3(
    camTarget.x + Math.sin(camYaw) * Math.cos(camPitch) * d,
    camTarget.y + Math.sin(camPitch) * d,
    camTarget.z + Math.cos(camYaw) * Math.cos(camPitch) * d);
  if (inside) {
    const b = getInterior(P.room).bounds(P.floor, P.pos.x);
    pos.x = clamp(pos.x, b.x0, b.x1); pos.z = clamp(pos.z, b.z0, b.z1); pos.y = clamp(pos.y, b.y0, b.y1);
  } else pos.y = Math.max(0.5, pos.y);
  camera.position.copy(pos); camera.lookAt(camTarget);
}

// yorug'lik: ichkarida issiq chiroq, tashqarida oy nuri
function updateLights(t) {
  const inside = (G.mode === 'play' ? P.room : -1) >= 0;
  const focus = G.mode === 'intro' ? camTarget : P.pos;
  moon.position.set(focus.x + 45, 90, focus.z + 30); moon.target.position.copy(focus);
  fillLight.position.set(focus.x + Math.sin(camYaw) * 2.5, 3.6, focus.z + Math.cos(camYaw) * 2.5);
  fillLight.intensity = 0;
  if (inside) {
    const room = getInterior(P.room), v = currentView();
    moon.intensity = 0.8; hemi.intensity = 1.05;
    roomLight.position.set(room.origin.x, baseY() + 4.8, room.origin.z); roomLight.intensity = 22;
    const fireOn = v && v.cook > 0 && P.floor === 1;
    fireLight.position.set(room.qozons[0].x, 0.8, room.qozons[0].z + 1.4);
    fireLight.intensity = (fireOn ? 9 : 3) * (0.8 + Math.sin(t * 17) * 0.1 + Math.sin(t * 7.3) * 0.1);
    room.qozons.forEach((q, j) => {
      q.fires.forEach((f, i) => { f.scale.y = (fireOn ? 1.2 : 0.55) * (0.8 + Math.sin(t * 13 + i * 2 + j) * 0.25); });
      q.osh.visible = !!v && v.portions > 0;
    });
  } else {
    moon.intensity = 2.2; hemi.intensity = 1.6; roomLight.intensity = 0; fireLight.intensity = 0;
  }
}

// =====================================================================
//  MULTIPLAYER (tarmoq)
// =====================================================================
const net = { ws: null, send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); } };
function serverUrl() {
  const q = new URLSearchParams(location.search).get('server');
  if (q) return q;
  if (DEFAULT_SERVER) return DEFAULT_SERVER;                           // APK, kompyuter dasturi, GitHub Pages
  if (window.Capacitor || window.OSH_DESKTOP) return null;              // server sozlanmagan: oflayn
  if (/^https?:/.test(location.protocol) && !/github\.io$/.test(location.hostname)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  return DEFAULT_SERVER || null;
}
function connect(url) {
  return new Promise((res) => {
    if (!url) return res(false);
    let done = false;
    const fin = (v) => { if (!done) { done = true; res(v); } };
    let ws; try { ws = new WebSocket(url); } catch { return res(false); }
    const to = setTimeout(() => { try { ws.close(); } catch { } fin(false); }, 4000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: G.name, look: myLook, token: localStorage.osh_token || null }));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.t === 'welcome' && !done) { clearTimeout(to); net.ws = ws; onWelcome(m); fin(true); }
      else if (done) onMsg(m);
    };
    ws.onclose = () => { clearTimeout(to); if (!done) fin(false); else if (net.ws === ws) onDisconnect(); };
  });
}
function onWelcome(m) {
  G.online = true; G.myId = m.id; localStorage.osh_token = m.token;
  G.money = m.money; G.mine = m.mine; G.hostOf = new Set();
  for (const k of Object.values(m.kitchens)) setKitchen(k);
  for (const p of m.players) addRemote(p.id, p.name, p.st, p.look);
}
function onDisconnect() {
  toast('Server bilan aloqa uzildi. Qayta ulanmoqda…');
  setTimeout(async () => { if (!(await connect(serverUrl()))) onDisconnect(); else toast('Qayta ulandi'); }, 4000);
}
function addRemote(id, name, st, look) {
  if (G.remotes.has(id)) return;
  const ch = new Character({ name, gender: look?.gender || 'm', look: look || {} });
  const r = { id, name, ch, x: 0, y: 0, z: 0, ry: 0, anim: 0, room: -1, tx: 0, ty: 0, tz: 0 };
  G.remotes.set(id, r);
  if (st) applyRemote(r, st, true);
  updateOnline();
}
function applyRemote(r, s, snap) {
  [r.tx, r.ty, r.tz, r.ry, r.anim, r.room] = s;
  if (snap) { r.x = r.tx; r.y = r.ty; r.z = r.tz; }
}
function onMsg(m) {
  switch (m.t) {
    case 'join': addRemote(m.id, m.name, null, m.look); toast(`${m.name} o'yinga kirdi`); break;
    case 'leave': { const r = G.remotes.get(m.id); if (r) { r.ch.dispose(); if (r.car) scene.remove(r.car); G.remotes.delete(m.id); updateOnline(); } break; }
    case 'st': { const r = G.remotes.get(m.id); if (r) applyRemote(r, m.s, false); break; }
    case 'chat': {
      addChat(m.name, m.text);
      const r = G.remotes.get(m.id); if (r) r.ch.bubble(m.text);
      break;
    }
    case 'kitchen': setKitchen(m.k); if (!$('menu').classList.contains('hide')) renderMenu(); break;
    case 'mine': G.mine = m.mine; if (!$('menu').classList.contains('hide')) renderMenu(); break;
    case 'money': G.money = m.v; break;
    case 'host': if (m.on) G.hostOf.add(m.kid); else G.hostOf.delete(m.kid); if (G.kitchens[m.kid]) ensureView(m.kid); break;
    case 'ks': { const v = G.views[m.kid]; if (v && !v.sim) v.apply(m.s); break; }
    case 'act': {
      const v = G.views[m.kid]; if (!v || !v.sim) break;
      if (m.act === 'cook') v.sim.startCook();
      if (m.act === 'serve') v.sim.serve(v.ents.get(m.cid));
      if (m.act === 'load') v.sim.load(+m.cid || 0);
      if (m.act === 'toy') v.sim.startToy({ reward: +m.cid || 0 });
      break;
    }
    case 'toast': toast(m.text); break;
    case 'invite':
      toast(`${m.from} sizni sherikchilikka taklif qilyapti (${E.BUSINESS[m.biz].name}). Har bir sherik to'liq pul oladi.`, [
        { t: 'Qabul qilish', fn: () => net.send({ t: 'accept', kid: m.kid }) }, { t: 'Rad etish', no: true },
      ], 20);
      break;
  }
}
function updateRemotes(dt) {
  for (const r of G.remotes.values()) {
    const d = Math.hypot(r.tx - r.x, r.tz - r.z);
    if (d > 8 || Math.abs(r.ty - r.y) > 3) { r.x = r.tx; r.z = r.tz; r.y = r.ty; } else { const a = Math.min(1, dt * 10); r.x += (r.tx - r.x) * a; r.z += (r.tz - r.z) * a; }
    r.y += (r.ty - r.y) * Math.min(1, dt * 10);
    const driving = r.anim === 4;
    if (driving && !r.car) { r.car = W.makeDamas(); scene.add(r.car); }
    if (r.car) { r.car.visible = driving; r.car.position.set(r.x, 0, r.z); r.car.rotation.y = lerpAngle(r.car.rotation.y, r.ry, Math.min(1, dt * 10)); }
    r.ch.hidden = driving;
    r.ch.root.position.set(r.x, r.y, r.z);
    if (!driving) { r.ch.root.rotation.y = lerpAngle(r.ch.root.rotation.y, r.ry, Math.min(1, dt * 10)); r.ch.setAnim(r.anim); }
  }
}
function updateOnline() { $('online').textContent = G.online ? `Onlayn ${G.remotes.size + 1}` : 'Oflayn rejim'; }

// =====================================================================
//  CHAT, XABARLAR
// =====================================================================
function addChat(name, text) {
  const d = document.createElement('div'); d.innerHTML = `<b></b> <span></span>`;
  d.querySelector('b').textContent = name + ':'; d.querySelector('span').textContent = text;
  $('chatLog').appendChild(d);
  while ($('chatLog').children.length > 6) $('chatLog').firstChild.remove();
}
function sendChat() {
  const t = $('chatIn').value.trim(); $('chatIn').value = ''; $('chatIn').blur();
  if (!t) return;
  addChat(G.name, t); P.ch.bubble(t);
  if (G.online) net.send({ t: 'chat', text: t });
}
function toast(text, buttons = null, secs = 4) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = text;
  if (buttons) {
    const row = document.createElement('div');
    for (const b of buttons) {
      const bt = document.createElement('button'); bt.textContent = b.t; if (b.no) bt.className = 'no';
      bt.onclick = () => { b.fn?.(); d.remove(); }; row.appendChild(bt);
    }
    d.appendChild(row);
  }
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), secs * 1000);
}

// =====================================================================
//  BOSHQARUV MENYUSI
// =====================================================================
let menuTab = 'up', menuKid = null;
function toggleMenu() {
  if (G.mode !== 'play') return;
  const m = $('menu');
  if (m.classList.contains('hide')) {
    const cv = currentView();
    menuKid = cv && isMine(cv.kid) ? cv.kid : (G.mine.includes(menuKid) ? menuKid : G.mine[0]);
    m.classList.remove('hide'); renderMenu();
  } else m.classList.add('hide');
}
$('menuClose').onclick = () => $('menu').classList.add('hide');
$('menu').addEventListener('pointerdown', (e) => { if (e.target.id === 'menu') $('menu').classList.add('hide'); });
function markTab() { document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === menuTab)); }
document.querySelectorAll('#tabs button').forEach((b) => b.onclick = () => { menuTab = b.dataset.t; markTab(); renderMenu(); });
function buy(kid, what, key) {
  const k = G.kitchens[kid];
  const bz = what === 'stock' && atBazaar();
  if (G.online) { net.send({ t: 'buy', kid, what, key, atBazaar: bz }); return; }
  const r = E.tryBuy(k, G.money, what, key, { atBazaar: bz });
  if (!r.ok) { toast(r.msg); return; }
  if (what === 'biz') {
    const used = new Set(Object.values(G.kitchens).map((x) => x.plot));
    const plot = W.PLOTS.findIndex((p) => !used.has(p.i));
    if (plot < 0) { toast("Shaharda bo'sh joy qolmadi"); return; }
    G.money -= r.cost;
    const id = 'k' + (Object.keys(G.kitchens).length + 1) + Date.now().toString(36).slice(-3);
    const nk = E.newKitchen(id, plot, r.newType, [...k.owners], [...k.names]);
    G.mine.push(id); G.hostOf.add(id); setKitchen(nk);
    toast(`${E.BUSINESS[r.newType].name} ochildi! Xaritada yangi bino paydo bo'ldi.`);
  } else {
    G.money -= r.cost; r.apply(); setKitchen(k);
    toast(what === 'stock' ? 'Masalliq olindi' : 'Kuchaytirildi!');
  }
  saveOffline(); renderMenu();
}
function renderMenu() {
  const kid = menuKid && G.kitchens[menuKid] ? menuKid : G.mine[0];
  menuKid = kid;
  const k = G.kitchens[kid]; if (!k) return;
  const B = E.BUSINESS[k.type];
  $('menuTitle').innerHTML = `Boshqaruv <small></small>`;
  $('menuTitle').querySelector('small').textContent = `${B.name} · ${k.names.join(', ')} · ★ ${(G.views[kid]?.rating || k.rating).toFixed(1)}`;
  const body = $('menuBody'); body.innerHTML = '';
  const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; body.appendChild(d); return d; };
  if (G.mine.length > 1) {
    const d = add(`<div class="row" style="border:0"><span class="sub">Biznes:</span><select></select></div>`);
    const sel = d.querySelector('select');
    for (const id of G.mine) { const kk = G.kitchens[id]; if (!kk) continue; const o = document.createElement('option'); o.value = id; o.textContent = `${E.BUSINESS[kk.type].name} (${kk.names.join(', ')})`; o.selected = id === kid; sel.appendChild(o); }
    sel.onchange = () => { menuKid = sel.value; renderMenu(); };
  }
  if (menuTab === 'up') {
    for (const [key, u] of Object.entries(E.UPGRADES)) {
      const lvl = k.up[key] || 1, max = lvl >= u.max, cost = max ? 0 : E.upgradeCost(key, lvl, k.type);
      const nextRoom = E.ROOMS[lvl];
      const eff = {
        qozon: `${W.qozonCount(lvl)} ta ${B.equip.toLowerCase()}, ${E.QOZON_CAP[lvl - 1]} porsiya, ${E.COOK_TIME[lvl - 1]} soniyada`,
        tapchan: `${E.tapchanCount(lvl)} ta stol (${E.tapchanCount(lvl) * 4} o'rin)`,
        reklama: `taxminan har ${E.SPAWN_EVERY[lvl - 1]} soniyada mijoz`,
        bezak: `porsiya ${fmt(E.priceFor(k))}, sabr ${E.patienceFor(k)} s`,
        xona: `${E.ROOMS.filter((r) => r.lvl <= lvl).map((r) => r.name).join(', ')}` + (nextRoom ? ` · keyingisi: ${nextRoom.name} (${nextRoom.desc.toLowerCase()})` : ''),
        qavat: [`1 qavat · keyingisi: 2-qavat VIP zal (mijoz 2 baravar to'laydi)`, `2 qavat (VIP) · keyingisi: 3-qavat banket zali (to'ylar)`, `3 qavat: VIP zal va banket zali`][lvl - 1],
      }[key];
      const d = add(`<div class="row"><div class="ic">${u.icon}</div><div style="flex:1"><div>${E.upgradeName(key, k.type)}</div><div class="sub">${eff}</div><div class="lv">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div><button class="buy"></button></div>`);
      const b = d.querySelector('button'); b.textContent = max ? 'Maks' : fmt(cost); b.disabled = max || G.money < cost;
      b.onclick = () => buy(kid, 'up', key);
    }
  } else if (menuTab === 'work') {
    for (const [key, w] of Object.entries(E.WORKERS)) {
      const has = k.workers[key], cost = E.workerCost(key, k.type);
      const d = add(`<div class="row"><div class="ic" style="background:#dff0e4;color:#2e6b3a">${key === 'oshpaz' ? 'O' : 'F'}</div><div style="flex:1"><div>${w.name}</div><div class="sub">${w.desc}</div></div><button class="buy"></button></div>`);
      const b = d.querySelector('button'); b.textContent = has ? 'Yollangan' : 'Yollash · ' + fmt(cost); b.disabled = has || G.money < cost;
      b.onclick = () => buy(kid, 'worker', key);
    }
  } else if (menuTab === 'part') {
    add(`<div class="card"><b>Sheriklar (${k.names.length}/${E.MAX_OWNERS})</b><div class="sub" style="margin-top:4px">${k.names.map((n) => '• ' + escapeHtml(n)).join('<br>')}</div><div class="sub" style="margin-top:8px">Mijoz pul to'lasa, har bir sherik to'liq summani oladi. Sheriklar ko'p bo'lsa, mijozlar ham ko'proq keladi.</div></div>`);
    if (!G.online) add(`<div class="card sub">Sheriklik multiplayer serverga ulanganda ishlaydi.</div>`);
    else if (k.names.length >= E.MAX_OWNERS) add(`<div class="card sub">Sheriklar soni to'lgan.</div>`);
    else {
      const list = [...G.remotes.values()];
      if (!list.length) add(`<div class="card sub">Hozir onlayn boshqa o'yinchi yo'q.</div>`);
      for (const r of list) {
        const d = add(`<div class="row"><div class="nm" style="flex:1"></div><button class="buy">Taklif qilish</button></div>`);
        d.querySelector('.nm').textContent = r.name;
        d.querySelector('button').onclick = () => net.send({ t: 'invite', kid, to: r.id });
      }
    }
  } else if (menuTab === 'bozor') {
    const mul = E.marketMul(), prev = E.marketMul(Date.now() - 90000), bz = atBazaar();
    const per = E.stockCost(k, 10, bz) / 10, cap = E.stockCap(k);
    add(`<div class="card"><b>Masalliq: ${Math.floor(k.stock)} / ${cap} porsiya</b><div class="sub" style="margin-top:4px">Bozor narxi: ${fmt(per)} (1 porsiya uchun) ${mul > prev ? '↑ qimmatlashyapti' : mul < prev ? '↓ arzonlashyapti' : ''}</div><div class="sub" style="margin-top:4px">${bz ? 'Siz bozordasiz: 15% arzon!' : "Bozorga borib olsangiz 15% arzon tushadi."}${E.hasRoom(k, 'sovutgich') ? ' Sovutgich: yana 10% arzon.' : ''}</div></div>`);
    for (const n of [5, 20, 50, 100]) {
      const can = Math.min(n, cap - Math.floor(k.stock)), cost = can > 0 ? E.stockCost(k, can, bz) : 0;
      const d = add(`<div class="row"><div class="ic">+</div><div style="flex:1"><div>${n} porsiya masalliq</div><div class="sub">guruch, go'sht, sabzi, yog'</div></div><button class="buy"></button></div>`);
      const b = d.querySelector('button'); b.textContent = can > 0 ? fmt(cost) : "Ombor to'la"; b.disabled = can <= 0 || G.money < cost;
      b.onclick = () => buy(kid, 'stock', can);
    }
    add(`<div class="card sub">Ombor sig'imini «Xonalar» kuchaytirishi oshiradi. Narxlar har bir necha daqiqada o'zgaradi — arzon paytda ko'proq oling.</div>`);
  } else if (menuTab === 'order') {
    const o = P.order, v = G.views[kid];
    if (v?.toy) add(`<div class="card"><b>Banket zalida to'y</b><div class="sub">Mehmonlar: ${v.toy.done}/${v.toy.total} · Bonus: ${fmt(v.toy.bonus)}</div></div>`);
    if (o) add(`<div class="card"><b>Yetkazib berish: ${o.n} porsiya</b><div class="sub" style="margin-top:4px">${P.cargo ? "Damasda yuk bor — pushti nurga haydang." : "Oshxonada tayyorlab, Damasga yuklang."} Mukofot: ${fmt(o.reward)}</div></div>`);
    if (!o && !v?.toy) add(`<div class="card sub">Hozir buyurtma yo'q. To'y buyurtmalari vaqti-vaqti bilan keladi.</div>`);
    const d = add(`<div class="row"><div style="flex:1" class="sub">Yangi buyurtma so'rash</div><button class="buy">So'rash</button></div>`);
    d.querySelector('button').disabled = !!o; d.querySelector('button').onclick = () => { offerOrder(); $('menu').classList.add('hide'); };
    if (o) { const c = add(`<div class="row"><div style="flex:1" class="sub">Buyurtmadan voz kechish</div><button class="buy" style="background:#b02030">Bekor qilish</button></div>`); c.querySelector('button').onclick = () => { P.order = null; P.cargo = 0; renderMenu(); }; }
  } else if (menuTab === 'top') {
    const list = Object.values(G.kitchens).sort((a, b) => (b.earned || 0) - (a.earned || 0));
    add(`<div class="card sub">Mahalla reytingi: eng ko'p daromad qilgan bizneslar. Birinchi o'rindagi binoning tepasida toj turadi.</div>`);
    list.forEach((kk, i) => {
      const d = add(`<div class="row"><div class="ic" style="${i === 0 ? 'background:#ffe08a' : ''}">${i + 1}</div><div style="flex:1"><div class="nm"></div><div class="sub">${E.BUSINESS[kk.type].name} · ★ ${(kk.rating || 4).toFixed(1)}</div></div><b>${fmt(kk.earned || 0)}</b></div>`);
      d.querySelector('.nm').textContent = kk.names.join(', ');
    });
  } else if (menuTab === 'biz') {
    for (const id of G.mine) {
      const kk = G.kitchens[id]; if (!kk) continue;
      add(`<div class="card"><b>${E.BUSINESS[kk.type].name}</b> <span class="sub">— ${escapeHtml(kk.names.join(', '))}${E.isMaxed(kk) ? ' · maksimal' : ''}</span></div>`);
    }
    const nt = E.NEXT_BUSINESS[k.type];
    if (!nt) add(`<div class="card sub">Siz eng katta biznesga yetdingiz. Keyingi yangilanishda yangi bizneslar qo'shiladi.</div>`);
    else {
      const cost = E.NEW_BUSINESS_COST[nt], ok = E.isMaxed(k);
      const d = add(`<div class="card"><b>${E.BUSINESS[nt].name} ochish</b><div class="sub" style="margin:6px 0">${ok ? 'Tayyor! Sheriklaringiz ham yangi biznesga egalik qiladi.' : `${E.BUSINESS[k.type].name}dagi barcha kuchaytirishlar 5-darajada va ikkala ishchi yollangan bo'lishi kerak.`}</div><button class="buy"></button></div>`);
      const b = d.querySelector('button'); b.textContent = fmt(cost); b.disabled = !ok || G.money < cost;
      b.onclick = () => buy(kid, 'biz');
    }
  }
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// =====================================================================
//  HUD, YO'L KO'RSATKICH, O'RGATISH
// =====================================================================
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.35, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide }));
beacon.visible = false; scene.add(beacon);
const TUT = ['Oshxonangizga boring', 'Qozon oldiga borib «Pishirish» ni bosing', 'Mijoz yoniga borib «Osh berish» ni bosing', "Pul yig'ib «Boshqaruv» da oshxonani kuchaytiring"];
function setTut(n) { G.tut = n; localStorage.osh_tut = n; }
let hudT = 0, slowT = 0;
function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.15;
  $('money').textContent = fmt(G.money);
  const myK = G.kitchens[G.mine[0]];
  const v = currentView();
  $('rating').textContent = ((v || G.views[G.mine[0]])?.rating || myK?.rating || 4).toFixed(1);
  // bayram, buyurtmalar, reyting toji (sekinroq yangilanadi)
  slowT -= 0.15;
  if (slowT <= 0) {
    slowT = 5;
    const q = new URLSearchParams(location.search).get('event');
    G.event = q ? { id: q, name: q === 'navruz' ? "Navro'z bayrami" : 'Bayram', mul: 1.6, deco: true } : E.eventFor(new Date());
    world.setFestive(!!G.event?.deco);
    $('eventPill').classList.toggle('hide', !G.event);
    if (G.event) $('eventTxt').textContent = `${G.event.name} — mijozlar ko'p!`;
    const top = Object.values(G.kitchens).filter((x) => (x.earned || 0) > 0).sort((a, b) => b.earned - a.earned)[0];
    world.plotViews.forEach((pv) => pv.setCrown(!!top && pv.plot.i === top.plot));
  }
  orderT -= 0.15;
  if (orderT <= 0) { orderT = rnd(150, 240); if (!P.order && !G.views[G.mine[0]]?.toy) offerOrder(); }
  // yo'l ko'rsatkich: buyurtma bo'lsa to'yxonaga yoki Damasga, aks holda oshxonaga
  const o = P.order;
  orderBeacon.visible = !!(o && P.cargo && P.room < 0);
  if (orderBeacon.visible) orderBeacon.position.set(o.target.x, 20, o.target.z);
  const target = o && P.cargo ? { door: o.target, name: "To'yxona" } : myK ? { door: W.PLOTS[myK.plot].door, name: o ? 'Oshxona va Damas' : 'Oshxonangiz' } : null;
  if (target && P.room < 0) {
    const d = Math.hypot(target.door.x - P.pos.x, target.door.z - P.pos.z);
    beacon.visible = !o?.cargo && d > 12; if (myK) beacon.position.set(W.PLOTS[myK.plot].door.x, 20, W.PLOTS[myK.plot].door.z);
    const ang = Math.atan2(target.door.x - P.pos.x, target.door.z - P.pos.z);
    $('arrow').style.transform = `rotate(${-(ang - camYaw - Math.PI)}rad)`;
    $('arrow').style.display = '';
    $('guideTxt').textContent = G.tut === 0 && !o ? `${TUT[0]} · ${Math.round(d)} m` : `${target.name} · ${Math.round(d)} m`;
    $('guide').classList.toggle('hide', d < 6 && G.tut > 0 && !o);
  } else {
    beacon.visible = false; $('arrow').style.display = 'none';
    const showTut = v && isMine(v.kid) && G.tut < TUT.length;
    $('guideTxt').textContent = showTut ? TUT[Math.max(1, G.tut)] : '';
    $('guide').classList.toggle('hide', !showTut);
  }
  // oshxona paneli
  if (v) {
    const k = v.k, cust = [...v.ents.values()].filter((e) => e.kind === 'c' && e.room === k.plot).length;
    $('kpanel').classList.remove('hide');
    const B = E.BUSINESS[k.type];
    $('kTitle').textContent = `${B.name} — ${k.names.join(', ')} · ${P.floor}-qavat`;
    $('kInfo').textContent = (v.cook > 0 ? `${B.dish} tayyorlanyapti… ${Math.ceil(v.cook)} s` : `Tayyor ${B.dish.toLowerCase()}: ${v.portions} porsiya · Mijozlar: ${cust}`)
      + ` · Masalliq: ${Math.floor(k.stock)}` + (v.toy ? ` · To'y: ${v.toy.done}/${v.toy.total}` : '');
    $('kBar').style.width = v.cook > 0 ? `${(1 - v.cook / v.cookTotal) * 100}%` : `${Math.min(100, v.portions / E.QOZON_CAP[k.up.qozon - 1] * 100)}%`;
  } else $('kpanel').classList.add('hide');
  // harakat tugmasi
  currentAction = findAction();
  $('actBtn').classList.toggle('hide', !currentAction);
  if (currentAction) $('actBtn').textContent = currentAction.label + (IS_TOUCH ? '' : ' (E)');
  updateOnline();
  if (!$('menu').classList.contains('hide') && menuTab !== 'part') renderMenuThrottled();
}
let lastMoneyRender = -1;
function renderMenuThrottled() { if (lastMoneyRender !== G.money) { lastMoneyRender = G.money; renderMenu(); } }

// =====================================================================
//  OVOZ: boshidagi video uchun musiqa, effektlar va gaplar.
//  Hammasi kod bilan (WebAudio) yaratiladi — ovoz fayllari yo'q, hajm kichik.
//  Gaplarni telefon/brauzerning o'z nutq ovozi o'qiydi.
// =====================================================================
const SND = { ctx: null, master: null, on: localStorage.osh_mute !== '1', eng: null, music: null };
function audioInit() {
  if (SND.ctx) { SND.ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = SND.ctx = new AC();
  SND.master = ctx.createGain(); SND.master.gain.value = SND.on ? 0.9 : 0; SND.master.connect(ctx.destination);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  SND.noise = nb;
  speechSynthesis?.getVoices?.();
}
function setSound(on) {
  SND.on = on; localStorage.osh_mute = on ? '0' : '1';
  if (SND.master) SND.master.gain.setTargetAtTime(on ? 0.9 : 0, SND.ctx.currentTime, 0.05);
  if (!on) speechSynthesis?.cancel?.();
  document.querySelectorAll('.muteBtn').forEach((b) => { b.textContent = on ? '🔊' : '🔇'; });
}
function env(g, t0, a, peak, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
function tone(freq, t0, dur, { type = 'triangle', vol = 0.15, a = 0.01, to = null, dest = null } = {}) {
  if (!SND.ctx) return; const c = SND.ctx;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  env(g, t0, a, vol, dur); o.connect(g); g.connect(dest || SND.master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, { f = 900, q = 1, vol = 0.25, type = 'bandpass', to = null, a = 0.005, dest = null } = {}) {
  if (!SND.ctx) return; const c = SND.ctx;
  const s = c.createBufferSource(); s.buffer = SND.noise;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain(); env(g, t0, a, vol, dur);
  s.connect(fl); fl.connect(g); g.connect(dest || SND.master); s.start(t0); s.stop(t0 + dur + 0.05);
}
// --- musiqa: doira usuli + o'zbekona kuy (hijoz pardasi) ---
const SCALE = [293.7, 311.1, 370.0, 392.0, 440.0, 466.2, 523.3, 587.3];
function musicStart(vol = 0.5) {
  if (!SND.ctx || SND.music) return;
  const bus = SND.ctx.createGain(); bus.gain.value = vol; bus.connect(SND.master);
  const beat = 0.32; let next = SND.ctx.currentTime + 0.1, bar = 0, note = 4;
  const tick = () => {
    const c = SND.ctx; if (!SND.music) return;
    while (next < c.currentTime + 0.6) {
      // doira: "bum - tak - tak, bum - tak"
      [[0, 'b'], [1, 't'], [1.5, 't'], [2, 'b'], [3, 't'], [3.5, 'k']].forEach(([p, k]) => {
        const t = next + p * beat;
        if (k === 'b') { tone(95, t, 0.28, { type: 'sine', vol: 0.5, to: 55, dest: bus }); noise(t, 0.08, { f: 300, vol: 0.12, dest: bus }); }
        else noise(t, k === 'k' ? 0.05 : 0.09, { f: 2600, q: 0.8, vol: k === 'k' ? 0.08 : 0.14, type: 'highpass', dest: bus });
      });
      // kuy (dutor tovushiga o'xshash)
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.18) continue;
        note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, -1, 0, 1, 1, 2][(Math.random() * 7) | 0]));
        const t = next + i * beat;
        tone(SCALE[note], t, beat * 1.6, { type: 'sawtooth', vol: 0.05, a: 0.005, dest: bus });
        tone(SCALE[note] * 2, t, beat * 0.9, { type: 'triangle', vol: 0.035, dest: bus });
      }
      if (bar % 2 === 0) tone(SCALE[0] / 2, next, beat * 4, { type: 'triangle', vol: 0.07, a: 0.05, dest: bus });
      next += beat * 4; bar++;
    }
  };
  SND.music = { bus, timer: setInterval(tick, 150) }; tick();
}
function musicStop(fade = 1.2) {
  const m = SND.music; if (!m) return; SND.music = null;
  m.bus.gain.setTargetAtTime(0.0001, SND.ctx.currentTime, fade / 3);
  setTimeout(() => { clearInterval(m.timer); m.bus.disconnect(); }, fade * 1000 + 200);
}
// --- limuzin motori ---
function engineStart() {
  if (!SND.ctx || SND.eng) return; const c = SND.ctx;
  const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
  o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 42; o2.frequency.value = 63;
  lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.value = 0.0001;
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(SND.master); o1.start(); o2.start();
  SND.eng = { o1, o2, lp, g };
}
function engineSet(rev, vol) {
  const e = SND.eng; if (!e) return; const t = SND.ctx.currentTime;
  e.o1.frequency.setTargetAtTime(38 + rev * 50, t, 0.1); e.o2.frequency.setTargetAtTime(57 + rev * 75, t, 0.1);
  e.lp.frequency.setTargetAtTime(220 + rev * 500, t, 0.1); e.g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.08);
}
function engineStop() { const e = SND.eng; if (!e) return; SND.eng = null; e.g.gain.setTargetAtTime(0.0001, SND.ctx.currentTime, 0.2); setTimeout(() => { e.o1.stop(); e.o2.stop(); }, 900); }
const sfx = {
  door() { const t = SND.ctx?.currentTime; if (t === undefined) return; noise(t, 0.12, { f: 1400, q: 2, vol: 0.35 }); tone(180, t, 0.1, { type: 'square', vol: 0.08, to: 90 }); },
  doorClose() { const t = SND.ctx?.currentTime; if (t === undefined) return; noise(t, 0.2, { f: 500, q: 1.5, vol: 0.5 }); tone(110, t, 0.18, { type: 'sine', vol: 0.3, to: 60 }); },
  whoosh() { const t = SND.ctx?.currentTime; if (t === undefined) return; noise(t, 0.9, { f: 300, to: 2400, q: 3, vol: 0.3, a: 0.25 }); },
  thud() { const t = SND.ctx?.currentTime; if (t === undefined) return; tone(120, t, 0.35, { type: 'sine', vol: 0.8, to: 40 }); noise(t, 0.25, { f: 700, q: 0.8, vol: 0.45, type: 'lowpass' }); noise(t + 0.15, 0.6, { f: 1200, vol: 0.08, a: 0.1 }); },
  coin() { const t = SND.ctx?.currentTime; if (t === undefined) return; tone(988, t, 0.1, { type: 'square', vol: 0.06 }); tone(1319, t + 0.08, 0.25, { type: 'square', vol: 0.06 }); },
};
// --- gaplar (brauzerning nutq ovozi) ---
function say(text, { pitch = 1, rate = 0.95 } = {}) {
  if (!SND.on || !window.speechSynthesis) return;
  const vs = speechSynthesis.getVoices();
  const v = ['uz', 'tr', 'kk', 'az', 'ru'].map((l) => vs.find((x) => x.lang?.toLowerCase().startsWith(l))).find(Boolean);
  const u = new SpeechSynthesisUtterance(text.replace(/[‘’'`ʼ]/g, ''));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'uz-UZ';
  u.pitch = pitch; u.rate = rate; u.volume = 1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// =====================================================================
//  BOSHIDAGI VIDEO: boy odam qahramonni limuzindan itarib yuboradi
// =====================================================================
const intro = { t: 0, len: 12.5, objs: [] };
function startIntro() {
  G.mode = 'intro';
  $('intro').classList.remove('hide');
  const k = G.kitchens[G.mine[0]], p = W.PLOTS[k ? k.plot : 0];
  const dir = p.carDir, laneZ = p.curb.z, walkZ = p.roadZ - p.f * W.WALK_OFF;
  const stopX = [p.x - dir * 15, p.x - dir * 9, p.x + dir * 9, p.x]
    .find((x) => W.LINES.every((l) => Math.abs(x - l) > 13)) ?? p.x;
  const limo = W.makeCar(0x0b0b0e, { limo: true }); scene.add(limo);
  limo.rotation.y = dir > 0 ? 0 : Math.PI;
  const rich = new Character({ gender: 'm', look: { shirt: 0x1c1c1c, pants: 0x1c1c1c, hat: null, glasses: true, skin: SKINS[0] } }); rich.hidden = true;
  Object.assign(intro, { t: 0, p, dir, laneZ, walkZ, stopX, limo, rich, objs: [limo], dust: [] });
  P.ch.hidden = true;
  audioInit(); musicStart(0.45); engineStart();
  P.pos.set(stopX, 0, walkZ); P.head = p.f > 0 ? Math.PI : 0;
}
function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
function updateIntro(dt) {
  const I = intro; I.t += dt; const t = I.t;
  $('progBar').style.width = `${Math.min(100, t / I.len * 100)}%`;
  const doorSign = -I.p.f;                     // eshik trotuar tomonga qaraydi
  // limuzin
  let lx;
  if (t < 3.2) lx = I.stopX - I.dir * 45 * (1 - ease(t / 3.2));
  else if (t < 7.2) lx = I.stopX;
  else lx = I.stopX + I.dir * 60 * Math.pow((t - 7.2) / 4, 2);
  I.limo.position.set(lx, 0, I.laneZ);
  const door = I.limo.userData.door;
  const open = t < 3.2 ? 0 : t < 3.8 ? (t - 3.2) / 0.6 : t < 6 ? 1 : t < 6.6 ? 1 - (t - 6) / 0.6 : 0;
  door.rotation.y = -open * 1.15;
  // boy odam eshik oldida
  const doorWorld = new THREE.Vector3(-1.2 - 0.6, 0, 0.86).applyMatrix4(I.limo.matrixWorld);
  I.rich.hidden = !(t > 3.6 && t < 6.1);
  I.rich.root.position.set(doorWorld.x, 0, I.laneZ + doorSign * 1.0);
  I.rich.root.rotation.y = doorSign > 0 ? 0 : Math.PI;
  // ovozlar
  const rev = t < 3.2 ? 1 - t / 3.2 : t < 7.2 ? 0.05 : Math.min(1, (t - 7.2) / 1.2);
  const dist = Math.abs(lx - I.stopX);
  engineSet(rev, (t < 7.2 ? 0.35 : 0.5) * Math.max(0.05, 1 - dist / 60));
  const once = (k, at, fn) => { if (t > at && !I[k]) { I[k] = 1; fn(); } };
  once('aDoor', 3.25, sfx.door); once('aWhoosh', 4.0, sfx.whoosh); once('aThud', 5.35, sfx.thud); once('aClose', 6.4, sfx.doorClose);
  once('aSay1', 3.45, () => say("Yo'qol, ko'zimga ko'rinma! Kambag'alga limuzinda joy yo'q!", { pitch: 0.55, rate: 0.9 }));
  once('aSay2', 10.2, () => say("Mayli... Hali ko'rasan! O'z oshxonamni ochaman!", { pitch: myLook.gender === 'f' ? 1.35 : 1.0, rate: 0.95 }));
  if (t > 3.5 && !I.s1) { I.s1 = 1; subtitle('Boy odam: — Yo\'qol, ko\'zimga ko\'rinma! Kambag\'alga limuzinda joy yo\'q!'); }
  // qahramon uchib chiqadi, dumalaydi
  const ch = P.ch; ch.pivot.position.y = 0;
  const startZ = I.laneZ + doorSign * 0.8, endZ = I.walkZ;
  if (t > 4.0) {
    ch.hidden = false; ch.setAnim(0);
    ch.pivot.position.y = -0.9;
    if (t < 5.4) {
      const u = (t - 4.0) / 1.4;
      ch.root.position.set(I.stopX - I.dir * 1.5 + u * 0.6, 0.9 + Math.sin(u * Math.PI) * 1.4 + (1 - u) * 0.3, startZ + (endZ - startZ) * u);
      ch.root.rotation.set(doorSign * u * Math.PI * 2.5, P.head, 0, 'YXZ');
      if (u > 0.95 && !I.dusted) { I.dusted = 1; puff(ch.root.position); }
    } else if (t < 9.4) {
      ch.root.position.set(I.stopX - I.dir * 0.9, 0.25, endZ);
      ch.root.rotation.set(doorSign * Math.PI * 0.5, P.head, 0, 'YXZ');
    } else {
      const u = ease((t - 9.4) / 1.2);
      ch.root.position.set(I.stopX - I.dir * 0.9, 0.25 + u * 0.65, endZ);
      ch.root.rotation.set(doorSign * Math.PI * 0.5 * (1 - u), P.head, 0, 'YXZ');
    }
  }
  if (t > 7.6 && !I.s2) { I.s2 = 1; subtitle(''); }
  if (t > 10.2 && !I.s3) { I.s3 = 1; subtitle(G.name + ': — Mayli… Hali ko\'rasan! O\'z oshxonamni ochaman!'); }
  // kamera
  const side = doorSign;
  const far = I.p.roadZ + I.p.f * 7.5;                 // yo'lning narigi tomoni
  if (t < 7.2) {
    camTarget.set(I.stopX - I.dir * 1.5, 1.1, (I.laneZ + I.walkZ) / 2);
    camera.position.set(I.stopX + I.dir * 7, 2.4, far);
  } else {
    const u = ease((t - 7.2) / 3);
    camTarget.set(I.stopX - I.dir * 0.9, 0.9, I.walkZ);
    camera.position.set(I.stopX + I.dir * (7 - u * 4), 2.4 - u * 0.6, far - I.p.f * u * 5.5);
  }
  camera.lookAt(camTarget);
  for (const d of I.dust) { d.life -= dt; d.s.scale.multiplyScalar(1 + dt * 1.5); d.s.material.opacity = Math.max(0, d.life * 0.6); }
  if (t >= I.len) endIntro();
}
function puff(pos) {
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.TEX.glow, color: 0x9a9080, transparent: true, opacity: 0.6, depthWrite: false }));
    s.position.set(pos.x + rnd(-0.8, 0.8), 0.3, pos.z + rnd(-0.6, 0.6)); s.scale.set(1, 1, 1); scene.add(s);
    intro.dust.push({ s, life: 1.2 }); intro.objs.push(s);
  }
}
function subtitle(text) { const s = $('subtitle'); s.textContent = text; s.classList.toggle('hide', !text); }
function endIntro() {
  if (G.mode !== 'intro') return;
  for (const o of intro.objs) scene.remove(o);
  intro.rich.dispose();
  const ch = P.ch; ch.pivot.position.y = 0; ch.hidden = false; ch.root.rotation.set(0, 0, 0);
  P.pos.set(intro.stopX - intro.dir * 0.9, 0, intro.walkZ);
  P.head = intro.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  camYaw = P.head + Math.PI;
  subtitle(''); $('intro').classList.add('hide');
  engineStop(); musicStop(); speechSynthesis?.cancel?.();
  G.mode = 'play'; $('hud').classList.remove('hide');
  localStorage.osh_seenIntro = '1';
  toast('Joystik bilan yuring. Oshxonangizni sariq nur ko\'rsatadi.', null, 5);
}
$('skipBtn').onclick = () => endIntro();
document.querySelectorAll('.muteBtn').forEach((b) => { b.onclick = () => { audioInit(); setSound(!SND.on); }; });
setSound(SND.on);

// =====================================================================
//  ASOSIY SIKL
// =====================================================================
const clock = new THREE.Clock();
let T = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05) * (window.__osh?.TS || 1); T += dt;
  if (G.mode === 'play') updatePlayer(dt);
  if (G.mode === 'intro') updateIntro(dt);
  if (G.mode !== 'start') {
    for (const v of Object.values(G.views)) { if (v.sim) v.sim.update(dt); v.render(dt, !v.sim); }
    updateTraffic(dt); updatePeds(dt); updateRemotes(dt);
  }
  if (G.mode === 'play') { updateCamera(dt); updateHud(dt); }
  if (G.mode === 'start') {                 // boshlash ekrani orqasida shahar aylanadi
    camera.position.set(Math.sin(T * 0.05) * 90, 45, Math.cos(T * 0.05) * 90); camera.lookAt(0, 0, 0);
  }
  for (const c of chars) c.update(dt, camera.position);
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.life -= dt; f.s.position.y += dt * 0.8; f.s.material.opacity = Math.min(1, f.life);
    if (f.life <= 0) { scene.remove(f.s); floaters.splice(i, 1); }
  }
  updateLights(T);
  world.update(T, camera.position);
  renderer.render(scene, camera);
}

// =====================================================================
//  ISHGA TUSHIRISH
// =====================================================================
$('nameIn').value = localStorage.osh_name || '';
spawnTraffic(IS_TOUCH ? 10 : 16);
frame();
spawnPeds(IS_TOUCH ? 8 : 14);
$('startBtn').disabled = false; $('startBtn').textContent = 'Boshlash';
// personaj tanlash (erkak / ayol) — tanlov saqlanadi
let myLook = (() => { try { return JSON.parse(localStorage.osh_look); } catch { return null; } })() ||
  { gender: 'm', shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0], pants: 0x2c3e50, skin: SKINS[1], hair: HAIRS[0], hat: 'doppi', scarf: null };
function markGender() { document.querySelectorAll('#genderRow button').forEach((b) => b.classList.toggle('on', b.dataset.g === myLook.gender)); }
document.querySelectorAll('#genderRow button').forEach((b) => b.onclick = () => {
  myLook.gender = b.dataset.g; myLook.hat = myLook.gender === 'm' ? 'doppi' : null; myLook.scarf = myLook.gender === 'f' ? SCARFS[0] : null; markGender();
});
markGender();
$('startBtn').onclick = async () => {
  audioInit();
  const name = $('nameIn').value.trim().slice(0, 16) || 'Oshpaz';
  G.name = name; localStorage.osh_name = name;
  $('startBtn').disabled = true; $('startBtn').textContent = 'Ulanmoqda…';
  try { if (IS_TOUCH) await document.documentElement.requestFullscreen?.(); } catch { }
  const ok = await connect(serverUrl());
  if (!ok) { G.online = false; loadOffline(); for (const k of Object.values(G.kitchens)) setKitchen(k); }
  for (const p of W.PLOTS) if (!G.plotKid[p.i]) world.plotViews[p.i].set(null);
  localStorage.osh_look = JSON.stringify(myLook);
  P.ch = new Character({ gender: myLook.gender, look: myLook });
  $('start').classList.add('hide');
  updateOnline();
  if (!ok) toast("Oflayn rejim: multiplayer uchun serverga ulaning (README'ga qarang)", null, 6);
  if (new URLSearchParams(location.search).has('nointro')) { startIntro(); endIntro(); } else startIntro();
};

// sinov uchun (brauzer konsolida): __osh.G, __osh.P
window.__osh = { TS: 1, intro, G, P, SIT, Character, setKitchen, startDrive, offerOrder, acceptOrder, changeFloor, world, doAction, findAction, exitRoom, scene, camera, W, E, enterRoom, getInterior, setCam: (y, p, d) => { camYaw = y; camPitch = p; camDist = d; } };

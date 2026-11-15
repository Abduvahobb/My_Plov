// =====================================================================
//  OSH MARKAZI — dunyo: Andijon shahri, yo'llar, chiroqlar, hovlilar,
//  maydon, bozor, park, futbol maydoni, oshxona binolari va ichki xonalar.
//  Hamma narsa kod bilan yasaladi (rasm fayllari yo'q) — hajm kichik.
// =====================================================================
import * as THREE from 'three';

// ---------- shahar tarhi ----------
export const LINES = [-160, -96, -32, 32, 96, 160];     // yo'llar (x va z bo'yicha)
export const HALF = 200;                                 // shahar chegarasi
export const ROAD_W = 10;
export const WALK_OFF = 6.5;                             // trotuar yo'l o'rtasidan masofa
export const LANE_OFF = 2.5;                             // mashina yo'lagi
export const WALK = {
  X: LINES.flatMap((l) => [l - WALK_OFF, l + WALK_OFF]),
  Z: LINES.flatMap((l) => [l - WALK_OFF, l + WALK_OFF]),
};
const BC = [-128, -64, 0, 64, 128];                      // kvartal markazlari

// Biznes uchun 12 ta joy. f = eshik qaragan tomon (+1 => +z, -1 => -z)
export const PLOTS = [
  [-76, 14, 1], [-52, 14, 1], [-76, -14, -1], [-52, -14, -1],
  [52, 14, 1], [76, 14, 1], [52, -14, -1], [76, -14, -1],
  [-12, 52, -1], [12, 52, -1], [-12, 76, 1], [12, 76, 1],
].map(([x, z, f], i) => {
  const roadZ = f > 0 ? Math.min(...LINES.filter((l) => l > z)) : Math.max(...LINES.filter((l) => l < z));
  return {
    i, x, z, f,
    door: { x, z: z + f * 6.4 },
    approach: { x, z: z + f * 8.5 },
    roadZ,
    curb: { x, z: roadZ - f * LANE_OFF },                // mashina to'xtaydigan joy
    carDir: f > 0 ? -1 : 1,                              // shu yo'lakdagi harakat yo'nalishi
  };
});

export const interiorOrigin = (i) => new THREE.Vector3(1500 + i * 60, 0, 1500);
export const ROOM = { hx: 13, hz: 9, h: 6 };

// ---------- yordamchi teksturalar ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function noise(g, w, h, base, n, a) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
  }
}
export const TEX = {};
function makeTextures() {             // Roblox uslubi: toza, yorqin, sodda ranglar
  TEX.asphalt = canvasTex(128, 128, (g, w, h) => noise(g, w, h, '#4b4f58', 600, 0.06), [1, 40]);
  TEX.sidewalk = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d4d6da'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  });
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#62c24e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,210,90' : '80,170,60'},0.25)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(8, 30), 0, 7); g.fill(); }
  }, [120, 120]);
  TEX.plaster = canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#fbf2e2', 120, 0.04));
  TEX.wood = canvasTex(256, 64, (g, w, h) => {
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = `hsl(28,${55 + Math.random() * 10}%,${46 + Math.random() * 8}%)`; g.fillRect(0, y, w, 15);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 15, w, 1);
    }
  });
  const tilePat = (bg, star, mid, dot, line) => canvasTex(128, 128, (g, w, h) => {   // o'zbekcha koshin naqsh
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const cx = 32 + x * 64, cy = 32 + y * 64;
      g.fillStyle = star; g.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 14 : 28; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.fill();
      g.fillStyle = mid; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
      g.fillStyle = dot; g.beginPath(); g.arc(cx, cy, 3.5, 0, 7); g.fill();
    }
    g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  });
  TEX.tile = tilePat('#1f7ad1', '#5ec8ff', '#fff6dc', '#f4b630', '#a8e4ff');
  TEX.tileTeal = tilePat('#14a394', '#7fe0cf', '#ffffff', '#f4b630', '#bff3e8');
  TEX.tileRed = tilePat('#9e1f2e', '#e0a040', '#fff3d6', '#1f5fb0', '#f0c070');
  TEX.parquet = canvasTex(128, 128, (g, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = `hsl(22,${45 + Math.random() * 10}%,${26 + Math.random() * 7}%)`; g.fillRect(x * 32, y * 32, 32, 32);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 4; k++) { const o = k * 8; g.beginPath(); if ((x + y) % 2) { g.moveTo(x * 32 + o, y * 32); g.lineTo(x * 32 + o, y * 32 + 32); } else { g.moveTo(x * 32, y * 32 + o); g.lineTo(x * 32 + 32, y * 32 + o); } g.stroke(); }
    }
  });
  TEX.somsa = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) { g.fillStyle = '#e0a24a'; g.beginPath(); const cx = 40 + (k % 2) * 48, cy = 40 + Math.floor(k / 2) * 48; g.moveTo(cx, cy - 26); g.lineTo(cx + 26, cy + 18); g.lineTo(cx - 26, cy + 18); g.fill(); g.fillStyle = '#3a2a1a'; for (let j = 0; j < 6; j++) g.fillRect(cx - 8 + Math.random() * 16, cy - 4 + Math.random() * 12, 2, 2); }
  });
  TEX.shashlik = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) { const y = 30 + k * 34; g.strokeStyle = '#9aa4ae'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, y); g.lineTo(120, y); g.stroke(); for (let j = 0; j < 5; j++) { g.fillStyle = j % 2 ? '#8a3a1a' : '#a54a24'; g.beginPath(); g.arc(22 + j * 20, y, 9, 0, 7); g.fill(); } }
    g.fillStyle = '#f2f2f2'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4, 0, 7); g.fill(); }
  });
  TEX.brick = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#e8d6c0'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
      g.fillStyle = `hsl(12,${55 + Math.random() * 8}%,${48 + Math.random() * 6}%)`; g.fillRect(x + 1.5, y + 1.5, 29, 13);
    }
  });
  TEX.carpet = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c8202f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4c14e'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#1e3f8a'; g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#c8202f'; g.fillRect(20, 20, w - 40, h - 40);
    g.fillStyle = '#f4c14e';
    for (let i = 0; i < 4; i++) { g.save(); g.translate(64, 64); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, -30); g.lineTo(10, -14); g.lineTo(0, 0); g.lineTo(-10, -14); g.fill(); g.restore(); }
  });
  TEX.plaza = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ece6f2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,70,120,0.18)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 42) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, [12, 12]);
  TEX.glow = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  TEX.field = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#86cf5c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(60,130,40,0.45)'; g.fillRect(0, y, w, 3); }
  }, [30, 30]);
  TEX.awning = [['#e8402f', '#ffffff'], ['#2f80e0', '#ffffff'], ['#f4b630', '#ffffff'], ['#2fb05a', '#ffffff']].map(([a, b]) =>
    canvasTex(64, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = a; g.fillRect(x, 0, 8, h); g.fillStyle = b; g.fillRect(x + 8, 0, 8, h); } }));
  TEX.night = canvasTex(256, 128, (g, w, h) => {     // derazadan ko'rinadigan kunduzgi shahar
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5aa8f0'); gr.addColorStop(1, '#d8f0ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = Math.random() * w, y = rnd(10, 40); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 9, y + (k % 2) * 3, 9, 0, 7); g.fill(); } }
    for (let x = 0; x < w; x += rnd(18, 34)) {
      const bh = rnd(25, 60); g.fillStyle = ['#f2e6d0', '#e8d8bc', '#fff4e0'][(Math.random() * 3) | 0]; g.fillRect(x, h - bh, rnd(14, 28), bh);
      g.fillStyle = ['#e8402f', '#2f80e0', '#2fb05a'][(Math.random() * 3) | 0]; g.fillRect(x - 2, h - bh - 4, 30, 5);
    }
    g.fillStyle = '#62c24e'; g.fillRect(0, h - 10, w, 10);
  });
  TEX.marble = canvasTex(128, 128, (g, w, h) => {     // zal poli (kafel)
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#f3ece0' : '#fffaf2'; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = 'rgba(160,130,90,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64);
    g.fillStyle = '#d9b26a'; g.beginPath(); g.moveTo(64, 56); g.lineTo(72, 64); g.lineTo(64, 72); g.lineTo(56, 64); g.fill();
  });
  TEX.whiteTile = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,140,160,0.35)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  });
  TEX.oshTop = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e0aa45'; g.beginPath(); g.arc(64, 64, 64, 0, 7); g.fill();
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.7 ? '#f6e7bc' : '#cf9136'; g.fillRect(Math.random() * w, Math.random() * h, 3, 1.5); }
    for (let i = 0; i < 160; i++) { g.fillStyle = '#f0702a'; g.fillRect(Math.random() * w, Math.random() * h, 6, 1.6); }
    for (let i = 0; i < 25; i++) { g.fillStyle = '#7a4222'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4, 0, 7); g.fill(); }
  });
}

// Matn tasviri (vivеska, ism yorlig'i)
export function textTexture(lines, { w = 512, h = 128, bg = '#3b1f0e', fg = '#f6d27a', font = 'bold 52px sans-serif', border = null, radius = 0 } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      if (radius) { g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, radius); g.fill(); } else g.fillRect(0, 0, w, h);
    }
    if (border) { g.strokeStyle = border; g.lineWidth = 6; if (radius) { g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, radius); g.stroke(); } else g.strokeRect(4, 4, w - 8, h - 8); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((ln, i) => {
      g.font = i === 0 ? font : font.replace(/\d+px/, (m) => Math.round(parseInt(m) * 0.6) + 'px');
      g.fillText(ln, w / 2, h / (arr.length + 1) * (i + 1) + (arr.length > 1 && i === 0 ? -4 : 0));
    });
  });
}
export function makeLabel(text, { color = '#1e2433', bg = 'rgba(255,255,255,0.92)', dot = null, scale = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '500 30px sans-serif';
  const tw = Math.min(236, g.measureText(text).width + (dot ? 56 : 36));
  g.fillStyle = bg; g.beginPath(); g.roundRect((256 - tw) / 2, 8, tw, 48, 24); g.fill();
  if (dot) { g.fillStyle = dot; g.beginPath(); g.arc((256 - tw) / 2 + 24, 32, 8, 0, 7); g.fill(); }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128 + (dot ? 10 : 0), 33, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true }));
  s.scale.set(1.6 * scale, 0.4 * scale, 1);
  s.renderOrder = 10;
  return s;
}

// ---------- materiallar ----------
const M = {};
function makeMaterials() {
  // yerga yotgan qatlamlar maysa bilan "urishmasligi" uchun polygonOffset (telefonlarda muhim)
  const lift = (m, k) => Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -4 * k });
  M.asphalt = lift(new THREE.MeshLambertMaterial({ map: TEX.asphalt }), 1);
  M.asphaltV = lift(new THREE.MeshLambertMaterial({ map: TEX.asphalt }), 2);
  M.sidewalk = lift(new THREE.MeshLambertMaterial({ map: TEX.sidewalk }), 2);
  M.white = lift(new THREE.MeshBasicMaterial({ color: 0xf4f4f4 }), 3);
  M.ground = (c) => lift(new THREE.MeshLambertMaterial({ color: c }), 1);
  M.grass = new THREE.MeshLambertMaterial({ map: TEX.grass });
  M.plaster = new THREE.MeshLambertMaterial({ map: TEX.plaster });
  M.tile = new THREE.MeshLambertMaterial({ map: TEX.tile });
  M.wood = new THREE.MeshLambertMaterial({ map: TEX.wood });
  M.brick = new THREE.MeshLambertMaterial({ map: TEX.brick });
  M.dark = new THREE.MeshLambertMaterial({ color: 0x3c4048 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.6, roughness: 0.35 });
  M.lit = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, metalness: 0.3 });   // shisha
  M.litDim = new THREE.MeshStandardMaterial({ color: 0x8ec8ee, roughness: 0.1, metalness: 0.3 });
  M.bulb = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  M.glowPool = new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0xffb860, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
  M.water = new THREE.MeshStandardMaterial({ color: 0x3fa6e0, metalness: 0.25, roughness: 0.12 });
  M.carpet = new THREE.MeshLambertMaterial({ map: TEX.carpet });
  M.inst = new THREE.MeshLambertMaterial({ color: 0xffffff });     // instancing uchun (rang alohida)
}

// ---------- instanced yordamchi ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
class Batch {
  constructor(geo, mat, cap) { this.geo = geo; this.mat = mat; this.items = []; }
  add(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, color = null, rx = 0) { this.items.push([x, y, z, ry, sx, sy, sz, color, rx]); }
  build(scene, { shadow = false, receive = false } = {}) {
    if (!this.items.length) return null;
    const im = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    this.items.forEach(([x, y, z, ry, sx, sy, sz, color, rx], i) => {
      _e.set(rx, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
      _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
      if (color !== null) im.setColorAt(i, _c.set(color));
    });
    im.castShadow = shadow; im.receiveShadow = receive;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    scene.add(im); return im;
  }
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);   // yerga yotqizilgan
const vPlane = new THREE.PlaneGeometry(1, 1);                            // tik turgan

function archShape(w, h) {           // tepasi yarim doira (arka)
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
  return s;
}
function pointedArch(w, h) {         // o'tkir uchli sharqona arka
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h * 0.62);
  s.quadraticCurveTo(-r, h * 0.92, 0, h); s.quadraticCurveTo(r, h * 0.92, r, h * 0.62);
  s.lineTo(r, 0); s.lineTo(-r, 0);
  return s;
}

// ---------- mashina (yumaloq shakl, to'rtburchak emas) ----------
export function makeCar(color = 0xe2e2e2, { limo = false } = {}) {
  const E = limo ? 2.8 : 0;          // limuzin uzunligi
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(2.25, 0.32); s.lineTo(2.3, 0.62); s.quadraticCurveTo(2.25, 0.86, 1.85, 0.9);
  s.lineTo(0.95, 0.96); s.quadraticCurveTo(0.6, 1.36, 0.25, 1.4);
  s.lineTo(-1.05 - E, 1.4); s.quadraticCurveTo(-1.55 - E, 1.36, -1.75 - E, 1.0);
  s.lineTo(-2.2 - E, 0.92); s.quadraticCurveTo(-2.32 - E, 0.7, -2.28 - E, 0.32); s.lineTo(2.25, 0.32);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 10 }),
    new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32 }));
  body.position.z = -0.81; body.castShadow = true; g.add(body);
  const gs = new THREE.Shape();
  gs.moveTo(0.86, 0.98); gs.quadraticCurveTo(0.55, 1.32, 0.24, 1.35); gs.lineTo(-1.0 - E, 1.35); gs.quadraticCurveTo(-1.45 - E, 1.3, -1.62 - E, 1.0); gs.lineTo(0.86, 0.98);
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 1.7, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0x1c2333, metalness: 0.9, roughness: 0.1 }));
  glass.position.z = -0.85; g.add(glass);
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18).rotateX(Math.PI / 2);
  const wm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const rimG = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12).rotateX(Math.PI / 2);
  const rimM = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 });
  for (const wx of [1.4, -1.45 - E]) for (const wz of [0.82, -0.82]) {
    const w = new THREE.Mesh(wg, wm); w.position.set(wx, 0.36, wz); g.add(w);
    const r = new THREE.Mesh(rimG, rimM); r.position.copy(w.position); g.add(r);
  }
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), tl = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  for (const z of [0.55, -0.55]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hl); h.scale.set(0.5, 1, 1.4); h.position.set(2.3, 0.7, z); g.add(h);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), tl); t.scale.set(0.5, 1, 1.6); t.position.set(-2.33 - E, 0.72, z); g.add(t);
  }
  const beam = new THREE.Mesh(unitPlane, new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0xfff0c0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.scale.set(9, 1, 5); beam.position.set(6.5, 0.06, 0); beam.visible = false; g.add(beam);
  if (limo) {                        // limuzin eshigi (ochiladi)
    const door = new THREE.Group(); door.position.set(-1.2, 0, 0.86);
    const dm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 0.06), body.material); dm.position.set(-0.65, 0.85, 0); door.add(dm);
    g.add(door); g.userData.door = door;
  }
  return g;
}

// =====================================================================
//  SHAHARNI QURISH
// =====================================================================
export function buildWorld(scene) {
  makeTextures(); makeMaterials();
  const colliders = [];              // {x0,x1,z0,z1}
  const addBox = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  const houses = [];                 // mijozlar chiqadigan uylar
  const updaters = [];

  // --- osmon ---
  const skyGeo = new THREE.SphereGeometry(700, 32, 16);
  const skyCol = [], top = new THREE.Color(0x3a8ae6), mid = new THREE.Color(0x86c4f7), hor = new THREE.Color(0xe4f4ff);
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 700; const c = new THREE.Color();
    if (y > 0.25) c.copy(mid).lerp(top, Math.min(1, (y - 0.25) / 0.5)); else c.copy(hor).lerp(mid, Math.max(0, y / 0.25));
    skyCol.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  const starG = new THREE.BufferGeometry(), starP = [];
  for (let i = 0; i < 600; i++) { const a = Math.random() * Math.PI * 2, e = rnd(0.25, 1.3); starP.push(Math.cos(a) * Math.cos(e) * 650, Math.sin(e) * 650, Math.sin(a) * Math.cos(e) * 650); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(starP, 3));

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xfffbe8, fog: false }));
  sun.position.set(280, 330, -360); sun.scale.set(90, 90, 1); sky.add(sun);
  // bulutlar (yumshoq, oq)
  const cloudM = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xdde8f5, fog: false });
  const puff = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 26; i++) {
    const cg = new THREE.Group(), a = Math.random() * Math.PI * 2, r = rnd(380, 560);
    cg.position.set(Math.cos(a) * r, rnd(140, 240), Math.sin(a) * r);
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(puff, cloudM); const sc = rnd(14, 26); m.scale.set(sc * 1.3, sc * 0.8, sc); m.position.set(rnd(-30, 30), rnd(-4, 6), rnd(-14, 14)); cg.add(m); }
    sky.add(cg);
  }
  sky.userData.follow = true;

  // --- yer ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), M.grass);
  ground.receiveShadow = true; scene.add(ground);
  for (const [fx, fz, w, d] of [[0, -265, 520, 110], [0, 265, 520, 110], [-265, 0, 110, 300], [265, 0, 110, 300]]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: TEX.field }));
    f.position.set(fx, 0.01, fz); scene.add(f);
  }

  // --- yo'llar, trotuarlar, chiziqlar, piyodalar o'tish joyi ---
  const len = HALF * 2;
  for (const l of LINES) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(len, ROAD_W).rotateX(-Math.PI / 2), M.asphalt);
    h.position.set(0, 0.02, l); h.receiveShadow = true; scene.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, len).rotateX(-Math.PI / 2), M.asphaltV);
    v.position.set(l, 0.05, 0); v.receiveShadow = true; scene.add(v);
  }
  const dash = new Batch(unitPlane, M.white), walkB = new Batch(unitPlane, M.sidewalk), zebra = new Batch(unitPlane, M.white);
  const stops = [-HALF, ...LINES, HALF];
  for (const l of LINES) {
    for (let k = 0; k < stops.length - 1; k++) {
      const a = stops[k] + (LINES.includes(stops[k]) ? ROAD_W / 2 : 0), b = stops[k + 1] - (LINES.includes(stops[k + 1]) ? ROAD_W / 2 : 0);
      const mid = (a + b) / 2, L = b - a;
      for (const side of [-1, 1]) {
        walkB.add(mid, 0.08, l + side * 6.5, 0, L, 1, 3);        // gorizontal yo'l trotuari
        walkB.add(l + side * 6.5, 0.081, mid, 0, 3, 1, L);       // vertikal yo'l trotuari
      }
      for (let d = a + 3; d < b - 3; d += 7) { dash.add(d, 0.09, l, 0, 3, 1, 0.18); dash.add(l, 0.09, d, 0, 0.18, 1, 3); }
    }
    for (const m of LINES) for (let s = -2; s <= 2; s++) {        // zebra
      zebra.add(m + s * 1.6, 0.085, l - 6.5, 0, 0.8, 1, 2.6); zebra.add(m + s * 1.6, 0.085, l + 6.5, 0, 0.8, 1, 2.6);
      zebra.add(l - 6.5, 0.086, m + s * 1.6, 0, 2.6, 1, 0.8); zebra.add(l + 6.5, 0.086, m + s * 1.6, 0, 2.6, 1, 0.8);
    }
  }
  dash.build(scene); walkB.build(scene, { receive: true }); zebra.build(scene);

  // --- ko'cha chiroqlari (rasmdagidek: yerga sariq nur tushadi) ---
  const poleB = new Batch(new THREE.CylinderGeometry(0.07, 0.11, 1, 8), M.dark);
  const armB = new Batch(unitBox, M.dark), bulbB = new Batch(new THREE.SphereGeometry(0.22, 10, 8), M.bulb);
  const poolB = new Batch(unitPlane, M.glowPool);
  const halos = [];
  const lamp = (x, z, dx, dz) => {
    poleB.add(x, 3, z, 0, 1, 6, 1);
    armB.add(x + dx * 0.6, 6, z + dz * 0.6, 0, Math.abs(dx) * 1.2 + 0.1, 0.08, Math.abs(dz) * 1.2 + 0.1);
    const bx = x + dx * 1.2, bz = z + dz * 1.2;
    bulbB.add(bx, 5.85, bz, 0, 1, 0.6, 1);
    poolB.add(bx, 0.1, bz, 0, 11, 1, 11);
    halos.push(bx, 5.8, bz);
  };
  for (const l of LINES) for (let d = -HALF + 8; d < HALF; d += 16) {
    if (LINES.some((m) => Math.abs(d - m) < 8)) continue;
    const side = ((d + 400) / 16) % 2 < 1 ? 1 : -1;
    lamp(d, l + side * 7.6, 0, -side); lamp(l + side * 7.6, d, -side, 0);
  }
  poleB.build(scene); armB.build(scene); bulbB.build(scene);   // kunduzi yerga nur tushmaydi
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));


  // --- daraxtlar ---
  const trunkB = new Batch(new THREE.CylinderGeometry(0.15, 0.22, 1, 7), new THREE.MeshLambertMaterial({ color: 0x8a5a34 }));
  const crownB = new Batch(new THREE.IcosahedronGeometry(1, 1), M.inst);
  const tree = (x, z, s = 1) => {
    const h = rnd(2.2, 3.2) * s; trunkB.add(x, h / 2, z, 0, s, h, s);
    const g = new THREE.Color().setHSL(rnd(0.25, 0.34), rnd(0.55, 0.7), rnd(0.36, 0.46));
    crownB.add(x, h + 1.1 * s, z, rnd(0, 6), rnd(1.4, 1.9) * s, rnd(1.5, 2.1) * s, rnd(1.4, 1.9) * s, g);
  };

  // --- hovlilar (uylar) ---
  const bodyB = new Batch(unitBox, M.inst), fenceB = new Batch(unitBox, M.inst);
  const yardB = new Batch(unitPlane, M.ground(0xd9c49a));
  const roofGeo = (() => { const s = new THREE.Shape(); s.moveTo(-4.6, 0); s.lineTo(0, 2.3); s.lineTo(4.6, 0); s.lineTo(-4.6, 0); return new THREE.ExtrudeGeometry(s, { depth: 12.4, bevelEnabled: false }).translate(0, 0, -6.2).rotateY(Math.PI / 2); })();
  const roofB = new Batch(roofGeo, M.inst);
  const doorB = new Batch(vPlane, new THREE.MeshLambertMaterial({ map: TEX.wood }));
  const winLit = new Batch(vPlane, M.lit), winDark = new Batch(vPlane, M.litDim);
  const ROOFS = [0xe8402f, 0x2f80e0, 0x2fb05a, 0xd8344a, 0x3fa0f0, 0xf07a2a];
  const WALLS = [0xfff6e6, 0xffeccf, 0xf6e2c4, 0xfffaf0, 0xf2e8d8];
  function hovli(cx, cz, f) {        // f=+1: oldi +z tomonda
    const W = (lx, lz) => [cx + lx * f, cz + lz * f];            // f=-1 => 180° burilgan
    const ry = f > 0 ? 0 : Math.PI;
    let [x, z] = W(0, -3.5);
    bodyB.add(x, 2, z, ry, 11, 4, 8, WALLS[(Math.random() * WALLS.length) | 0]); addBox(x, z, 11, 8);
    roofB.add(x, 4, z, ry, 1, 1, 1, ROOFS[(Math.random() * ROOFS.length) | 0]);
    [x, z] = W(0, 0.52); doorB.add(x, 1.1, z, ry, 1.2, 2.2, 1);
    for (const wx of [-3.4, 3.4]) { [x, z] = W(wx, 0.52); (Math.random() < 0.65 ? winLit : winDark).add(x, 2.1, z, ry, 1.5, 1.2, 1); }
    [x, z] = W(0, 0); yardB.add(x, 0.04, z, 0, 15.4, 1, 23.4);
    const fc = 0xf0dfc0;
    const wall = (lx, lz, w, d) => { const [wx, wz] = W(lx, lz); const ww = f > 0 ? w : w, dd = d; fenceB.add(wx, 0.9, wz, 0, ww, 1.8, dd, fc); addBox(wx, wz, ww, dd); };
    wall(-4.75, 11.6, 5.5, 0.3); wall(4.75, 11.6, 5.5, 0.3);        // old devor (darvoza ochiq)
    wall(-7.6, 0, 0.3, 23.4); wall(7.6, 0, 0.3, 23.4); wall(0, -11.6, 15.5, 0.3);
    for (const tx of [-5, 5]) { const [ax, az] = W(tx, 7); tree(ax, az, 0.9); }
    const [dx, dz] = W(0, 1.2), [gx, gz] = W(0, 11.6), [ox, oz] = W(0, 13.5);
    houses.push({ door: { x: dx, z: dz }, gate: { x: gx, z: gz }, out: { x: ox, z: oz } });
  }
  const special = new Set(['2,2', '2,1', '1,1', '3,3', '1,3', '1,2', '3,2', '2,3']);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if (special.has(`${i},${j}`)) continue;
    for (const hx of [-16, 0, 16]) { hovli(BC[i] + hx, BC[j] - 12, -1); hovli(BC[i] + hx, BC[j] + 12, 1); }
  }
  // tashqi halqa: dala bo'yida daraxtlar va qishloq uylari
  for (let d = -HALF + 10; d < HALF; d += 24) {
    for (const s of [-1, 1]) { tree(d + rnd(-3, 3), s * rnd(172, 190)); tree(s * rnd(172, 190), d + rnd(-3, 3)); }
  }
  for (let k = 0; k < 140; k++) {
    const a = Math.random() * Math.PI * 2, r = rnd(215, 330);
    tree(Math.cos(a) * r, Math.sin(a) * r, rnd(0.8, 1.3));
  }

  // --- markaziy maydon (pishtoq, minoralar, gulzor, favvora, bayroq) ---
  {
    const g = new THREE.Group(); scene.add(g);
    const pz = new THREE.Mesh(new THREE.PlaneGeometry(50, 50).rotateX(-Math.PI / 2), Object.assign(new THREE.MeshLambertMaterial({ map: TEX.plaza }), { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
    pz.position.y = 0.06; pz.receiveShadow = true; g.add(pz);
    const border = new THREE.MeshLambertMaterial({ color: 0x9a3a2c });
    for (const [x, z, w, d] of [[0, 25, 50, 0.6], [0, -25, 50, 0.6], [25, 0, 0.6, 50], [-25, 0, 0.6, 50]]) {
      const b = new THREE.Mesh(unitBox, border); b.scale.set(w, 0.3, d); b.position.set(x, 0.15, z); g.add(b);
    }
    // pishtoq (katta peshtoq)
    const face = new THREE.Shape(); face.moveTo(-9, 0); face.lineTo(9, 0); face.lineTo(9, 15); face.lineTo(-9, 15); face.lineTo(-9, 0);
    face.holes.push(pointedArch(8, 11));
    const portal = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: 2.4, bevelEnabled: false }), M.tile);
    portal.material = [M.tile, new THREE.MeshLambertMaterial({ color: 0xc9a66b })];
    portal.position.set(0, 0, -14); portal.castShadow = true; g.add(portal);
    const niche = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(8, 11)), new THREE.MeshLambertMaterial({ color: 0x23324f }));
    niche.position.set(0, 0, -15); g.add(niche);
    const ndoor = new THREE.Mesh(new THREE.ShapeGeometry(archShape(3, 5)), new THREE.MeshBasicMaterial({ color: 0xffc77a }));
    ndoor.position.set(0, 0, -14.95); g.add(ndoor);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 12), M.plaster); hall.position.set(0, 4.5, -21); hall.castShadow = true; g.add(hall);
    const band = new THREE.Mesh(new THREE.BoxGeometry(26.3, 1, 12.3), M.tile); band.position.set(0, 8.6, -21); g.add(band);
    const domeM = new THREE.MeshStandardMaterial({ color: 0x2fb5c9, roughness: 0.35, metalness: 0.2 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeM);
    dome.scale.y = 1.25; dome.position.set(0, 10.6, -21); g.add(dome);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 1.8, 32), M.tile); drum.position.set(0, 9.7, -21); g.add(drum);
    for (const mx of [-11.5, 11.5]) {
      const mn = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.45, 22, 20), M.brick); mn.position.set(mx, 11, -13.5); mn.castShadow = true; g.add(mn);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.2, 20), M.tile); ring.position.set(mx, 17, -13.5); g.add(ring);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.0, 1.6, 20), M.tile); lan.position.set(mx, 22.6, -13.5); g.add(lan);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 8, 0, 7, 0, Math.PI / 2), domeM); cap.position.set(mx, 23.4, -13.5); g.add(cap);
      addBox(mx, -13.5, 3, 3);
    }
    addBox(0, -13, 18, 2.6); addBox(0, -21, 26, 12);
    // gulzorlar
    const flowers = [0xd9453b, 0xe8a13a, 0xe8d23a, 0x3fa65a, 0x2e6fa8];
    for (const sx of [-14, 14]) flowers.forEach((c, k) => {
      const b = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: c })); b.scale.set(14, 0.35, 1.3); b.position.set(sx, 0.2, 6 + k * 2.6); g.add(b);
    });
    // favvora
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.3, 0.8, 40), new THREE.MeshLambertMaterial({ color: 0xd8d0c0 })); basin.position.set(0, 0.4, 10); g.add(basin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40).rotateX(-Math.PI / 2), M.water); water.position.set(0, 0.75, 10); g.add(water);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.5, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.45 })); jet.position.set(0, 2.4, 10); g.add(jet);
    addBox(0, 10, 10, 10);
    updaters.push((t) => { jet.scale.y = 1 + Math.sin(t * 3) * 0.12; jet.rotation.y = t; });
    // bayroq
    const flagTex = canvasTex(192, 96, (q) => {
      q.fillStyle = '#1eb4e6'; q.fillRect(0, 0, 192, 32); q.fillStyle = '#fff'; q.fillRect(0, 32, 192, 32); q.fillStyle = '#1eb53a'; q.fillRect(0, 64, 192, 32);
      q.fillStyle = '#ce1126'; q.fillRect(0, 31, 192, 3); q.fillRect(0, 62, 192, 3);
      q.fillStyle = '#fff'; q.beginPath(); q.arc(26, 16, 10, 0, 7); q.fill(); q.fillStyle = '#1eb4e6'; q.beginPath(); q.arc(30, 16, 9, 0, 7); q.fill();
      q.fillStyle = '#fff'; for (let i = 0; i < 12; i++) q.fillRect(44 + (i % 5) * 9, 6 + Math.floor(i / 5) * 8, 3, 3);
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 14, 8), M.metal); pole.position.set(-20, 7, -6); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5, 10, 1), new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(-17.5, 12.5, -6); g.add(flag);
    const fp = flag.geometry.attributes.position, fx0 = Float32Array.from(fp.array);
    updaters.push((t) => { for (let i = 0; i < fp.count; i++) { const x = fx0[i * 3]; fp.setZ(i, Math.sin(t * 3 + x * 1.2) * 0.25 * (x + 2.5) / 5); } fp.needsUpdate = true; });
    for (const [bx, bz] of [[-8, 18], [8, 18], [-20, 18], [20, 18]]) bench(g, bx, bz, 0);
    for (const tx of [-21, 21]) for (const tz of [-2, 21]) tree(tx, tz, 1.1);
  }
  function bench(g, x, z, ry) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), M.wood); seat.position.y = 0.5; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), M.wood); back.position.set(0, 0.85, -0.28); b.add(back);
    for (const lx of [-0.9, 0.9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), M.dark); l.position.set(lx, 0.25, 0); b.add(l); }
    g.add(b);
  }

  // --- bozor (2,1) ---
  {
    const cx = 0, cz = -64;
    const pv = new THREE.Mesh(new THREE.PlaneGeometry(48, 48).rotateX(-Math.PI / 2), M.ground(0xd8cfc2));
    pv.position.set(cx, 0.05, cz); scene.add(pv);
    const tableB = new Batch(unitBox, M.inst), fruitB = new Batch(new THREE.SphereGeometry(0.22, 8, 6), M.inst);
    const fruitCols = [0xe8641e, 0xd9453b, 0xe8d23a, 0x3fa65a, 0x7a3e9e, 0xd9b26a];
    let n = 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = cx - 15 + c * 10, z = cz - 12 + r * 11;
      tableB.add(x, 0.5, z, 0, 3.4, 1, 1.6, 0xc9894a); addBox(x, z, 3.6, 1.8);
      for (const px of [-1.6, 1.6]) for (const pz of [-0.7, 0.7]) tableB.add(x + px, 1.4, z + pz, 0, 0.1, 2.8, 0.1, 0x8a5a34);
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), new THREE.MeshLambertMaterial({ map: TEX.awning[n++ % 4], side: THREE.DoubleSide }));
      aw.rotation.x = -Math.PI / 2 + 0.25; aw.position.set(x, 2.85, z); scene.add(aw);
      const fc = fruitCols[(Math.random() * fruitCols.length) | 0];
      for (let k = 0; k < 14; k++) fruitB.add(x + rnd(-1.4, 1.4), 1.12, z + rnd(-0.6, 0.6), 0, 1, 1, 1, Math.random() < 0.8 ? fc : fruitCols[k % 6]);
      if (Math.random() < 0.5) for (let k = 0; k < 3; k++) fruitB.add(x + rnd(-1, 1), 1.3, z + rnd(-0.4, 0.4), 0, 2.4, 1.6, 1.6, 0x9ccc4a); // qovun
    }
    tableB.build(scene, { shadow: true }); fruitB.build(scene);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2), new THREE.MeshBasicMaterial({ map: textTexture('Andijon bozori', { bg: '#2e6fa8', fg: '#fff' }) }));
    sign.position.set(cx, 5.2, cz + 24.3); scene.add(sign);
    for (const sx of [-5.2, 5.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6, 10), M.tile); p.position.set(cx + sx, 3, cz + 24.3); scene.add(p); addBox(cx + sx, cz + 24.3, 0.5, 0.5); }
  }

  // --- ko'lli park (1,1) ---
  {
    const cx = -64, cz = -64;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(13, 48).rotateX(-Math.PI / 2), M.water); lake.position.set(cx, 0.07, cz); scene.add(lake);
    const shore = new THREE.Mesh(new THREE.RingGeometry(13, 14.5, 48).rotateX(-Math.PI / 2), M.ground(0xe8d6a8)); shore.position.set(cx, 0.06, cz); scene.add(shore);
    colliders.push({ x0: cx - 12, x1: cx + 12, z0: cz - 12, z1: cz + 12, round: 13, cx, cz });
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; tree(cx + Math.cos(a) * rnd(17, 22), cz + Math.sin(a) * rnd(17, 22)); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; bench(scene, cx + Math.cos(a) * 15.5, cz + Math.sin(a) * 15.5, -a - Math.PI / 2); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.4), new THREE.MeshBasicMaterial({ map: textTexture("Ko'lli park", { bg: '#2e6b3a', fg: '#fff' }) }));
    sign.position.set(cx, 3, cz + 24.2); scene.add(sign);
  }
  // --- bog' (1,3) ---
  {
    const cx = -64, cz = 64;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i || j) tree(cx + i * 9 + rnd(-1, 1), cz + j * 9 + rnd(-1, 1), rnd(0.9, 1.3));
    const ch = new THREE.Group(); ch.position.set(cx, 0, cz); scene.add(ch);     // chorpoya
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 3), M.wood); base.position.y = 0.25; ch.add(base);
    const cp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 2.6), M.carpet); cp.position.y = 0.54; ch.add(cp);
    for (const [px, pz] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3), M.wood); p.position.set(px, 1.5, pz); ch.add(p); }
    const rf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 3.4), M.wood); rf.position.y = 3; ch.add(rf);
    addBox(cx, cz, 4, 3);
  }
  // --- futbol maydoni (3,3) ---
  {
    const cx = 64, cz = 64;
    const ft = canvasTex(256, 160, (g, w, h) => {
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#2f7a3a' : '#2a6e34'; g.fillRect(i * w / 10, 0, w / 10, h); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(4, 4, w - 8, h - 8);
      g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w / 2, h - 4); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 20, 0, 7); g.stroke();
      g.strokeRect(4, h / 2 - 30, 30, 60); g.strokeRect(w - 34, h / 2 - 30, 30, 60);
    });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(42, 28).rotateX(-Math.PI / 2), Object.assign(new THREE.MeshLambertMaterial({ map: ft }), { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })); f.position.set(cx, 0.06, cz); scene.add(f);
    for (const s of [-1, 1]) {
      const goal = new THREE.Group(); goal.position.set(cx + s * 20.5, 0, cz); scene.add(goal);
      for (const z of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4), M.white); p.position.set(0, 1.2, z); goal.add(p); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.2), M.white); bar.rotation.x = Math.PI / 2; bar.position.y = 2.4; goal.add(bar);
    }
    const fenceM = new THREE.MeshBasicMaterial({ color: 0x8aa0a8, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    for (const [x, z, w, ry] of [[cx, cz - 17, 48, 0], [cx, cz + 17, 48, 0], [cx - 23.5, cz, 34, Math.PI / 2], [cx + 23.5, cz, 34, Math.PI / 2]]) {
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), fenceM); fm.position.set(x, 1.5, z); fm.rotation.y = ry; scene.add(fm);
    }
    for (const lx of [-20, 20]) for (const lz of [-16, 16]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 12), M.dark); p.position.set(cx + lx, 6, cz + lz); scene.add(p);
    }
  }

  trunkB.build(scene, { shadow: true }); crownB.build(scene, { shadow: true });
  bodyB.build(scene, { shadow: true, receive: true }); roofB.build(scene, { shadow: true }); fenceB.build(scene, { receive: true });
  yardB.build(scene, { receive: true }); doorB.build(scene); winLit.build(scene); winDark.build(scene);

  // chegara (shahar tashqarisiga chiqib ketmaslik)
  for (const [x, z, w, d] of [[0, -HALF - 5, 2 * HALF + 20, 10], [0, HALF + 5, 2 * HALF + 20, 10], [-HALF - 5, 0, 10, 2 * HALF + 20], [HALF + 5, 0, 10, 2 * HALF + 20]]) addBox(x, z, w, d);

  // --- biznes joylari (tashqi ko'rinish) ---
  const plotViews = PLOTS.map((p) => makePlotView(scene, p, colliders));

  // bayram bezaklari: ko'chalar ustida bayroqchalar
  let festive = null;
  function setFestive(on) {
    if (on && !festive) {
      festive = new THREE.Group(); scene.add(festive);
      const fm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const pos = [], col = [], cols = [[0.12, 0.7, 0.9], [1, 1, 1], [0.12, 0.7, 0.23], [0.9, 0.2, 0.2], [1, 0.8, 0.2]];
      const flag = (x, y, z, dx, dz, c) => { pos.push(x, y, z, x + dx * 0.6, y, z + dz * 0.6, x + dx * 0.3, y - 0.7, z + dz * 0.3); for (let i = 0; i < 3; i++) col.push(...c); };
      let n = 0;
      for (const l of [-32, 32]) for (let d = -150; d <= 150; d += 30) {
        for (let k = 0; k < 18; k++) {
          const u = k / 17, sag = Math.sin(u * Math.PI) * 1.2, y = 6 - sag;
          flag(d, y, l - 7.5 + u * 15, 0, 1, cols[n++ % 5]);      // gorizontal yo'l ustida
          flag(l - 7.5 + u * 15, y, d, 1, 0, cols[n++ % 5]);      // vertikal yo'l ustida
        }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      festive.add(new THREE.Mesh(geo, fm));
    }
    if (festive) festive.visible = on;
  }

  return {
    colliders, houses, plotViews, sky, setFestive,
    update(t, camPos) {
      sky.position.copy(camPos);
      for (const u of updaters) u(t);
    },
  };
}

// ---------- oshxona binosi (tashqi) ----------
function makePlotView(scene, p, colliders) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.f > 0 ? 0 : Math.PI;
  scene.add(g);
  const col = { x0: p.x - 7, x1: p.x + 7, z0: p.z - 6, z1: p.z + 6, off: false };
  colliders.push(col);
  let built = null, signMesh = null, lastKey = '', lastK = null;

  function empty() {
    const lot = new THREE.Group();
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(15, 13).rotateX(-Math.PI / 2), M.ground(0xc9b48a));
    dirt.position.y = 0.05; lot.add(dirt);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ map: textTexture(["Bo'sh joy", 'biznes uchun'], { bg: '#f2b632', fg: '#3b2410' }) }));
    s.position.set(0, 1.6, 5.5); lot.add(s);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6), M.dark); post.position.set(0, 0.8, 5.45); lot.add(post);
    return lot;
  }

  function building(k) {
    const b = new THREE.Group();
    const roofCol = { oshxona: 0x8b2e1e, kafe: 0x2e6fa8, restoran: 0x5b2a86 }[k.type];
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 12), M.plaster); body.position.y = 3; body.castShadow = true; body.receiveShadow = true; b.add(body);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.6, 12.3), M.brick); plinth.position.y = 0.3; b.add(plinth);
    const band = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.9, 12.3), M.tile); band.position.y = 5.45; b.add(band);
    const fl = k.up?.qavat || 1, topY = 6 + (fl - 1) * 5;
    for (let f = 2; f <= fl; f++) {                    // yuqori qavatlar
      const y0 = 6 + (f - 2) * 5;
      const up = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5, 11.6), M.plaster); up.position.y = y0 + 2.5; up.castShadow = true; b.add(up);
      const ub = new THREE.Mesh(new THREE.BoxGeometry(13.9, 0.6, 11.9), M.tile); ub.position.y = y0 + 4.6; b.add(ub);
      for (const wx of [-4.6, -1.5, 1.5, 4.6]) {
        const wf = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(2.0, 2.9)), M.tile); wf.position.set(wx, y0 + 0.9, 5.82); b.add(wf);
        const w = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(1.6, 2.5)), M.lit); w.position.set(wx, y0 + 1.05, 5.84); b.add(w);
      }
      const bal = new THREE.Mesh(new THREE.BoxGeometry(13, 0.15, 1.2), M.wood); bal.position.set(0, y0 + 0.05, 6.4); b.add(bal);
      for (let r = -6; r <= 6; r += 0.75) { const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), M.wood); pst.position.set(r, y0 + 0.55, 6.95); b.add(pst); }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.1), M.wood); rail.position.set(0, y0 + 1.0, 6.95); b.add(rail);
    }
    const corn = new THREE.Mesh(new THREE.BoxGeometry(fl > 1 ? 14.2 : 14.8, 0.35, fl > 1 ? 12.2 : 12.8), new THREE.MeshLambertMaterial({ color: roofCol })); corn.position.y = topY + 0.05; b.add(corn);
    // eshik va arkali derazalar
    const frame = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(3.2, 4)), M.tile); frame.position.set(0, 0, 6.02); b.add(frame);
    const door = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(2.4, 3.4)), new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0xb07040 })); door.position.set(0, 0, 6.04); b.add(door);
    const dline = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 3.2), M.dark); dline.position.set(0, 1.6, 6.05); b.add(dline);
    for (const wx of [-4.4, 4.4]) {
      const wf = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.8, 3.5)), M.tile); wf.position.set(wx, 1.0, 6.02); b.add(wf);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.3, 3.1)), M.lit); w.position.set(wx, 1.2, 6.04); b.add(w);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.6), M.dark); bar.position.set(wx, 2.4, 6.05); b.add(bar);
    }
    // ayvon (ustunlar va soyabon)
    for (const cx of [-2.4, 2.4]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.9, 12), M.wood); c.position.set(cx, 1.95, 8.2); c.castShadow = true; b.add(c);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.3, 12), M.tile); cap.position.set(cx, 3.8, 8.2); b.add(cap);
    }
    const awn = new THREE.Mesh(new THREE.BoxGeometry(6, 0.22, 2.8), new THREE.MeshLambertMaterial({ color: roofCol })); awn.position.set(0, 4.05, 7.2); awn.castShadow = true; b.add(awn);
    // fonar
    for (const lx of [-1.9, 1.9]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.45, 8), M.lit); l.position.set(lx, 3.0, 6.2); b.add(l);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      h.scale.set(2.4, 2.4, 1); h.position.copy(l.position); b.add(h);
    }
    // peshlavha
    const name = { oshxona: 'Osh markazi', kafe: 'Kafe', restoran: 'Restoran' }[k.type];
    signMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.3),
      new THREE.MeshBasicMaterial({ map: textTexture([name, k.names.join(' · ')], { bg: '#3b1f0e', fg: '#f6d27a', border: '#c9a66b' }) }));
    signMesh.position.set(0, 4.85, 6.08); b.add(signMesh);
    // sharqona tom ustidagi gumbaz (restoran) yoki parapet
    if (k.type === 'restoran') {
      const dm = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 12, 0, 7, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2fb5c9, roughness: 0.35 }));
      dm.scale.y = 1.3; dm.position.y = topY + 0.2; b.add(dm);
    }
    return b;
  }
  // Damas to'xtash joyi (bino yonida)
  const cosF = p.f > 0 ? 1 : -1;
  const park = { x: p.x + 9.6 * cosF, z: p.z + 3.5 * cosF, ry: p.f > 0 ? -Math.PI / 2 : Math.PI / 2 };
  const dcol = { x0: 99999, x1: 99999, z0: 99999, z1: 99999 }; colliders.push(dcol);
  let crown = null;

  return {
    plot: p, group: g, park, damas: null,
    parkDamas() {                    // Damasni joyiga qo'yish (to'qnashuv bilan)
      if (!this.damas) return;
      this.damas.position.set(park.x, 0, park.z); this.damas.rotation.y = park.ry;
      Object.assign(dcol, { x0: park.x - 1.0, x1: park.x + 1.0, z0: park.z - 1.9, z1: park.z + 1.9 });
    },
    freeDamas() { Object.assign(dcol, { x0: 99999, x1: 99999, z0: 99999, z1: 99999 }); },
    setCrown(on) {                   // mahallada eng zo'r biznes — toj
      if (on && !crown) {
        crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 96, (q) => {
          q.fillStyle = '#ffc928'; q.beginPath(); q.moveTo(10, 80); q.lineTo(18, 24); q.lineTo(42, 52); q.lineTo(64, 10); q.lineTo(86, 52); q.lineTo(110, 24); q.lineTo(118, 80); q.closePath(); q.fill();
          q.strokeStyle = '#b8860b'; q.lineWidth = 4; q.stroke(); q.fillStyle = '#e8402f'; [30, 64, 98].forEach((x) => { q.beginPath(); q.arc(x, 66, 7, 0, 7); q.fill(); });
        }) }));
        crown.scale.set(4, 3, 1); scene.add(crown);
      }
      if (crown) { crown.visible = on; crown.position.set(p.x, 12 + ((lastK?.up?.qavat || 1) - 1) * 5 + Math.sin(performance.now() / 500) * 0.3, p.z); }
    },
    set(k) {                         // k = biznes yoki null (bo'sh)
      lastK = k;
      if (k && !this.damas) { this.damas = makeDamas(); scene.add(this.damas); this.parkDamas(); }
      if (!k && this.damas) { scene.remove(this.damas); this.damas = null; this.freeDamas(); }
      const key = k ? `${k.type}|${k.names.join(',')}|${k.up?.qavat || 1}` : 'empty';
      if (key === lastKey) return; lastKey = key;
      if (built) { g.remove(built); }
      built = k ? building(k) : empty();
      g.add(built);
      col.off = !k; col.x0 = k ? p.x - 7 : 0; col.x1 = k ? p.x + 7 : 0;
      if (!k) { col.x0 = col.x1 = col.z0 = col.z1 = 99999; } else { col.z0 = p.z - 6; col.z1 = p.z + 6; }
      // ayvon ustunlari
    },
  };
}

// =====================================================================
//  ICHKI BINO — 3 qavat:
//   1-qavat: katta zal (stol-stullar, peshtaxta, qozon/tandir/mangal) +
//            chap qanotda xonalar: ombor, sovutgich, ishchilar xonasi, hojatxona
//   2-qavat: VIP zal (alohida kabinalar)
//   3-qavat: banket zali (to'ylar uchun)
//  Kafe va restoranning bezagi, jihozi va taomi boshqacha.
//  (har bir biznesning binosi shahar tashqarisida joylashgan)
// =====================================================================
export const FLOOR_H = 7;
export const floorY = (f) => (f - 1) * FLOOR_H;
export const QOZON_X = [0, -4.6, 4.6];
export const qozonCount = (lvl) => (lvl >= 4 ? 3 : lvl >= 2 ? 2 : 1);
const HALL_SLOTS = [[-8, 4], [8, 4], [-8, -1.2], [8, -1.2], [0, -1.2], [0, 4]];
const VIP_SLOTS = [[-8, -6.2], [0, -6.2], [8, -6.2]];
const TOY_SLOTS = [[-6, -3.8], [0, -3.8], [6, -3.8], [-6, 3.2], [0, 3.2], [6, 3.2]];
export const TABLE_KIND = [...HALL_SLOTS.map(() => 'hall'), ...VIP_SLOTS.map(() => 'vip'), ...TOY_SLOTS.map(() => 'toy')];
const AISLE = 4.3, STOVE_Z = -7.7, COUNTER_Z = -5.0, ANNEX_X = -23;
// zinapoyalar: [qaysi qavatdan, pastki nuqta, yuqoridagi tushish nuqtasi]
export const STAIRS = [
  { from: 1, bottom: { x: 11.8, z: 3.7 }, top: { x: 10.0, z: -3.4 }, back: { x: 10.4, z: 4.4 }, downAt: { x: 11.7, z: -3.6 } },
  { from: 2, bottom: { x: -11.8, z: 3.7 }, top: { x: -10.0, z: -3.4 }, back: { x: -10.4, z: 4.4 }, downAt: { x: -11.7, z: -3.6 } },
];
const STYLE = () => ({
  oshxona: { tile: TEX.tile, floor: TEX.marble, floorRep: [13, 9], cloth: 0xffffff, chair: 0xc98a4a, wall: 0xfff8ec, gold: 0xe0b04a, food: TEX.oshTop },
  kafe: { tile: TEX.tileTeal, floor: TEX.wood, floorRep: [8, 30], cloth: 0xe4f7f1, chair: 0xffffff, wall: 0xf2fbf8, gold: 0x1fb5a8, food: TEX.somsa },
  restoran: { tile: TEX.tileRed, floor: TEX.parquet, floorRep: [10, 10], cloth: 0xfff2dc, chair: 0x5a2e1a, wall: 0xf8eee2, gold: 0xd4a640, food: TEX.shashlik },
});

export function buildInterior(scene, plotIndex, type = 'oshxona') {
  const O = interiorOrigin(plotIndex), ST = STYLE()[type] || STYLE().oshxona;
  const root = new THREE.Group(); root.position.copy(O); scene.add(root);
  const { hx, hz, h } = ROOM;
  const lm = (c) => new THREE.MeshLambertMaterial({ color: c });
  const sm = (c, r = 0.5, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
  const box = (w, hh, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; parent.add(b); return b; };
  const texM = (t, rep, extra = {}) => { const m = new THREE.MeshLambertMaterial({ map: t.clone(), ...extra }); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(rep[0], rep[1]); m.map.needsUpdate = true; return m; };
  const gold = sm(ST.gold, 0.35, 0.55), wallM = lm(ST.wall), tileM = new THREE.MeshLambertMaterial({ map: ST.tile });
  const chairM = lm(ST.chair), legM = lm(0x6a4022), clothM = lm(ST.cloth);
  const cols = { 1: [], 2: [], 3: [] };
  const C = (f, x0, x1, z0, z1) => cols[f].push({ x0: x0 + O.x, x1: x1 + O.x, z0: z0 + O.z, z1: z1 + O.z });
  const sign = (text, w, x, y, z, ry, parent, bg = '#2b1a10') => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.25), new THREE.MeshBasicMaterial({ map: textTexture(text, { bg, fg: '#fff', w: 512, h: 128, font: 'bold 54px sans-serif' }) }));
    s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s;
  };
  // devor (ixtiyoriy eshik teshigi bilan): o'qi bo'yicha [a,b], teshik [g0,g1]
  function wall(f, parent, axis, at, a, b, gaps = []) {
    const segs = []; let cur = a;
    for (const [g0, g1] of gaps) { segs.push([cur, g0]); cur = g1; }
    segs.push([cur, b]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.05) continue;
      const L = s1 - s0, mid = (s0 + s1) / 2;
      if (axis === 'x') { box(L, h, 0.3, wallM, mid, h / 2, at, parent); box(L, 1.3, 0.34, tileM, mid, 0.65, at, parent); box(L, 0.5, 0.34, tileM, mid, h - 0.55, at, parent); C(f, s0, s1, at - 0.2, at + 0.2); }
      else { box(0.3, h, L, wallM, at, h / 2, mid, parent); box(0.34, 1.3, L, tileM, at, 0.65, mid, parent); box(0.34, 0.5, L, tileM, at, h - 0.55, mid, parent); C(f, at - 0.2, at + 0.2, s0, s1); }
    }
    for (const [g0, g1] of gaps) {                   // eshik ustidagi devor bo'lagi
      const L = g1 - g0, mid = (g0 + g1) / 2;
      if (axis === 'x') box(L, h - 3.2, 0.3, wallM, mid, 3.2 + (h - 3.2) / 2, at, parent); else box(0.3, h - 3.2, L, wallM, at, 3.2 + (h - 3.2) / 2, mid, parent);
    }
  }
  function floorPlane(parent, x0, x1, z0, z1) {
    const w = x1 - x0, d = z1 - z0;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), texM(ST.floor, [ST.floorRep[0] * w / 26, ST.floorRep[1] * d / 18]));
    fl.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2); fl.receiveShadow = true; parent.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), lm(0xfffaf0)); ce.position.set((x0 + x1) / 2, h, (z0 + z1) / 2); parent.add(ce);
  }
  function windows(parent, sx, zs) {
    const viewM = new THREE.MeshBasicMaterial({ map: TEX.night });
    for (const wz of zs) {
      const fr = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(2.6, 3.4)), lm(0xffffff)); fr.position.set(sx * (hx - 0.16), 1.5, wz); fr.rotation.y = -sx * Math.PI / 2; parent.add(fr);
      const win = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(2.2, 3.0)), viewM); win.position.set(sx * (hx - 0.18), 1.6, wz); win.rotation.y = -sx * Math.PI / 2; parent.add(win);
      const uv = win.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 1.1) / 2.2 * 0.4 + ((wz + 9) / 18) * 0.6, uv.getY(i) / 3);
    }
  }
  function chandelier(parent, x, z) {
    const ch = new THREE.Group(); ch.position.set(x, h - 1.3, z); parent.add(ch);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1), gold); rod.position.y = 0.75; ch.add(rod);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 32), gold); ring.rotation.x = Math.PI / 2; ch.add(ring);
    ch.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), gold));
    for (let k = 0; k < 8; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); b.position.set(Math.cos(k / 8 * Math.PI * 2) * 0.7, 0.12, Math.sin(k / 8 * Math.PI * 2) * 0.7); ch.add(b); }
  }
  function plant(parent, x, z, s = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.28 * s, 0.6 * s, 16), lm(0xc0603a)); pot.position.set(x, 0.3 * s, z); parent.add(pot);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 1), lm(0x3fae4a)); leaf.position.set(x, 1.0 * s, z); leaf.scale.y = 1.3; parent.add(leaf);
  }
  function stairs(parent, f, sx) {                   // zinapoya (pastga yoki yuqoriga)
    const x0 = sx > 0 ? 10.95 : -12.75, w = 1.8, cx = x0 + w / 2;
    for (let i = 0; i < 12; i++) box(w, 0.5 * (i + 1), 0.46, chairM, cx, 0.25 * (i + 1), 2.6 - i * 0.45, parent);
    box(0.08, 1.0, 5.6, gold, x0 - 0.05 * sx, 3.5, -0.1, parent).rotation.x = -0.84;
    C(f, x0 - 0.15, x0 + w + 0.2, -2.7, 2.9);
  }
  function stairHole(parent, f, sx) {                // yuqori qavatdagi zinapoya o'rni (to'siq bilan)
    const x0 = sx > 0 ? 10.95 : -12.75, cx = x0 + 0.9;
    box(0.08, 1.0, 5.5, gold, sx > 0 ? x0 - 0.05 : x0 + 1.85, 0.5, 0, parent);
    box(1.9, 1.0, 0.08, gold, cx, 0.5, 2.8, parent);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 5.4).rotateX(-Math.PI / 2), lm(0x5a3a22)); hole.position.set(cx, 0.02, 0); parent.add(hole);
    C(f, x0 - 0.15, x0 + 2.0, -2.7, 2.9);
  }
  // ---- stol va 4 ta stul ----
  const tables = [];
  function table(parent, f, tx, tz, kind, lux = false) {
    const t = new THREE.Group(); t.position.set(tx, 0, tz); parent.add(t);
    box(2.2, 0.08, 1.25, chairM, 0, 0.76, 0, t);
    box(2.3, 0.02, 1.35, lux ? lm(0xfff0c8) : clothM, 0, 0.81, 0, t);
    for (const lx of [-0.95, 0.95]) for (const lz of [-0.5, 0.5]) box(0.08, 0.76, 0.08, legM, lx, 0.38, lz, t);
    const choy = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), sm(0x2f80e0, 0.3)); choy.position.set(0, 0.93, 0); t.add(choy);
    if (kind === 'toy') { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), lm(0xf06292)); fl.position.set(-0.35, 0.98, 0); t.add(fl); }
    const seats = [];
    for (const dx of [-0.55, 0.55]) for (const dz of [-1, 1]) {
      const c = new THREE.Group(); c.position.set(dx, 0, dz * 0.98); c.rotation.y = dz > 0 ? Math.PI : 0; t.add(c);
      box(0.5, 0.06, 0.48, lux ? lm(0xd4a640) : chairM, 0, 0.45, 0, c);
      box(0.5, lux ? 0.75 : 0.55, 0.06, lux ? lm(0xb02030) : chairM, 0, lux ? 0.85 : 0.75, -0.22, c);
      for (const lx of [-0.21, 0.21]) for (const lz of [-0.2, 0.2]) box(0.05, 0.45, 0.05, legM, lx, 0.22, lz, c);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 20), lm(0xffffff)); plate.position.set(dx, 0.85, dz * 0.38); t.add(plate);
      const food = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.06, 18), new THREE.MeshLambertMaterial({ map: ST.food })); food.position.set(dx, 0.89, dz * 0.38); food.visible = false; t.add(food);
      seats.push({ x: tx + dx, z: tz + dz * 0.98, ry: dz > 0 ? Math.PI : 0, food, dx, dz });
    }
    const tb = { group: t, seats, floor: f, kind, tx, tz, box: { x0: tx - 1.15, x1: tx + 1.15, z0: tz - 1.3, z1: tz + 1.3 } };
    tables.push(tb); return tb;
  }

  // =================== 1-QAVAT ===================
  const F1 = new THREE.Group(); root.add(F1);
  floorPlane(F1, -hx, hx, -hz, hz); floorPlane(F1, ANNEX_X, -hx, -hz, hz);
  for (let x = -hx + 4.3; x < hx; x += 4.3) box(0.25, 0.25, hz * 2, gold, x, h - 0.13, 0, F1);
  wall(1, F1, 'x', -hz, ANNEX_X, hx); wall(1, F1, 'x', hz, ANNEX_X, hx, [[-1.3, 1.3]]);
  wall(1, F1, 'z', hx, -hz, hz); wall(1, F1, 'z', -hx, -hz, hz, [[0.2, 2.6]]); wall(1, F1, 'z', ANNEX_X, -hz, hz);
  windows(F1, 1, [-6.4, 6.3]); windows(F1, -1, [-6.4, 6.3]);
  const door = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(2.6, 3.2)), new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0xd09060, side: THREE.DoubleSide }));
  door.position.set(0, 0, hz - 0.17); door.rotation.y = Math.PI; F1.add(door);
  const ex = sign('Chiqish', 1.8, 0, 3.7, hz - 0.18, Math.PI, F1, '#2fb05a');
  for (const cz of [-3.8, 3.7]) {                    // chap devor bo'yidagi ustunlar
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, h, 20), sm(0xfff3dc, 0.45)); c.position.set(-(hx - 0.9), h / 2, cz); c.castShadow = true; F1.add(c);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.34, 0.4, 20), tileM); cap.position.set(-(hx - 0.9), h - 0.45, cz); F1.add(cap);
    C(1, -(hx - 0.9) - 0.4, -(hx - 0.9) + 0.4, cz - 0.4, cz + 0.4);
  }
  for (const [cx, cz] of [[-6, 1.4], [0, 1.4], [6, 1.4]]) chandelier(F1, cx, cz);
  // oshxona qismi
  const wt = new THREE.Mesh(new THREE.PlaneGeometry(17, 3.6), texM(TEX.whiteTile, [10, 2])); wt.position.set(0, 2.3, -hz + 0.2); F1.add(wt);
  const brickM = new THREE.MeshLambertMaterial({ map: TEX.brick });
  box(15.6, 1.0, 2.2, brickM, 0, 0.5, STOVE_Z, F1);
  box(15.8, 0.12, 2.4, sm(0xb9b2a8, 0.6), 0, 1.04, STOVE_Z, F1);
  box(15.6, 0.8, 2.4, sm(0xc4ccd4, 0.3, 0.7), 0, 4.7, STOVE_Z, F1);
  box(1.2, 1.2, 1.2, sm(0xc4ccd4, 0.3, 0.7), 0, 5.6, STOVE_Z, F1);
  C(1, -7.9, 7.9, STOVE_Z - 1.2, STOVE_Z + 1.15);
  const fire = (q, x, y, z, n = 4) => { const fs = []; for (let k = 0; k < n; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 8), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffd25a : 0xff8a24 })); f.position.set(x - 0.4 + k * 0.27, y, z); q.add(f); fs.push(f); } return fs; };
  const qozonG = new THREE.LatheGeometry([0, 0.35, 0.7, 1.0, 1.2, 1.3, 1.34].map((r, i) => new THREE.Vector2(r, i * 0.14)), 36);
  const qozonM = sm(0x2a2a2e, 0.35, 0.7); qozonM.side = THREE.DoubleSide;
  const qozons = QOZON_X.map((qx) => {
    const q = new THREE.Group(); q.position.set(qx, 0, STOVE_Z); F1.add(q);
    let osh, fires;
    if (type === 'kafe') {                            // tandir
      const tand = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), lm(0xd9a46a)); tand.position.y = 1.1; tand.scale.y = 1.25; q.add(tand);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x3a1a08 })); mouth.position.set(0, 1.7, 0.72); mouth.rotation.x = -0.55; q.add(mouth);
      osh = new THREE.Group(); q.add(osh);
      for (let k = 0; k < 5; k++) { const sm2 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.17), lm(0xe0a24a)); sm2.position.set(-0.8 + k * 0.4, 1.2, 1.15); sm2.rotation.set(0.3, k, 0.2); osh.add(sm2); }
      fires = fire(q, 0, 1.75, 0.8, 3);
    } else if (type === 'restoran') {                 // mangal
      box(3.2, 0.6, 0.9, sm(0x3a3a3e, 0.4, 0.6), 0, 1.35, 0.2, q);
      const coal = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a1a })); coal.position.set(0, 1.66, 0.2); q.add(coal);
      osh = new THREE.Group(); q.add(osh);
      for (let k = 0; k < 6; k++) {
        const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), sm(0xb0b8c0, 0.3, 0.8)); sk.rotation.x = Math.PI / 2; sk.position.set(-1.25 + k * 0.5, 1.78, 0.2); osh.add(sk);
        for (let j = 0; j < 4; j++) { const mt = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lm(0x8a3a1a)); mt.position.set(-1.25 + k * 0.5, 1.78, -0.15 + j * 0.2); osh.add(mt); }
      }
      fires = fire(q, 0, 1.8, 0.2, 5);
    } else {                                          // qozon
      const bowl = new THREE.Mesh(qozonG, qozonM); bowl.position.y = 1.08; q.add(bowl);
      osh = new THREE.Mesh(new THREE.CircleGeometry(1.2, 36).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: TEX.oshTop })); osh.position.y = 1.86; q.add(osh);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), new THREE.MeshBasicMaterial({ color: 0x2a1206 })); mouth.position.set(0, 0.4, 1.11); q.add(mouth);
      fires = fire(q, 0, 0.32, 1.06);
      const kapgir = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8), M.metal); kapgir.position.set(1.0, 1.9, 0.3); kapgir.rotation.z = 0.6; q.add(kapgir);
    }
    return { group: q, osh, fires, x: qx + O.x, z: STOVE_Z + O.z };
  });
  box(17, 1.05, 0.9, tileM, -1.0, 0.525, COUNTER_Z, F1);
  box(17.2, 0.1, 1.1, sm(0xf6efe4, 0.25), -1.0, 1.1, COUNTER_Z, F1);
  C(1, -9.5, 7.5, COUNTER_Z - 0.5, COUNTER_Z + 0.5);
  for (let k = 0; k < 6; k++) {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.04, 24), lm(0xffffff)); lg.position.set(-8 + k * 2.6, 1.17, COUNTER_Z); F1.add(lg);
    const non = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 20), lm(0xd99a4a)); non.position.set(-7 + k * 2.6, 1.19, COUNTER_Z + 0.15); F1.add(non);
  }
  const dishList = { oshxona: "Osh · Choy · Non · Salat", kafe: "Somsa · Choy · Kofe · Shirinlik", restoran: "Shashlik · Lag'mon · Sho'rva · Salat" }[type];
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshBasicMaterial({ map: textTexture(['Menyu', dishList], { w: 512, h: 330, bg: '#2b1a10', fg: '#f6d27a', border: '#e0b04a', font: 'bold 64px sans-serif' }) }));
  menu.position.set(9.4, 3.0, -hz + 0.2); F1.add(menu);
  box(2.6, 1.1, 0.9, new THREE.MeshLambertMaterial({ map: TEX.wood }), 8.2, 0.55, 6.8, F1);
  box(2.8, 0.08, 1.1, sm(0xf6efe4, 0.25), 8.2, 1.14, 6.8, F1);
  box(0.5, 0.35, 0.4, sm(0x2b2b30, 0.4), 8.2, 1.36, 6.8, F1);
  C(1, 6.8, 9.6, 6.3, 7.3);
  for (const [px, pz] of [[-12, 8], [-2.3, 8.3], [2.3, 8.3], [12, 8]]) plant(F1, px, pz);
  stairs(F1, 1, 1);
  sign('2-qavat ↑', 1.6, 12.84, 4.6, 3.6, -Math.PI / 2, F1, '#d4a640');
  HALL_SLOTS.forEach(([tx, tz]) => table(F1, 1, tx, tz, 'hall'));
  // ---- chap qanot: koridor va xonalar ----
  const ROOMZ = [-6.75, -2.25, 2.25, 6.75];
  wall(1, F1, 'z', -17, -hz, hz, ROOMZ.map((z) => [z - 0.7, z + 0.7]));
  for (const z of [-4.5, 0, 4.5]) wall(1, F1, 'x', z, ANNEX_X, -17);
  const roomDoors = ROOMZ.map((z, i) => {
    const r = ['Ombor', 'Sovutgich', 'Ishchilar xonasi', 'Hojatxona'][i];
    sign(r, 1.9, -16.83, 3.6, z, Math.PI / 2, F1, '#2f80e0');
    const panel = box(0.12, 3.1, 1.4, new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0x9a6a40 }), -17, 1.55, z, F1);
    const lock = sign('Yopiq', 1.0, -16.9, 2.0, z, Math.PI / 2, F1, '#b02030');
    return { panel, lock, col: { x0: -17.2 + O.x, x1: -16.8 + O.x, z0: z - 0.75 + O.z, z1: z + 0.75 + O.z } };
  });
  // ombor: qoplar, yashiklar, javon
  for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.4, 4, 10), lm(0xf4efe2)); s.position.set(-22 + (k % 4) * 0.8, 0.55, -8.2 + Math.floor(k / 4) * 0.8); F1.add(s); }
  for (let k = 0; k < 3; k++) { box(0.9, 0.5, 0.6, lm(0xc98a4a), -19 - k * 1.1, 0.25, -5.3, F1); for (let j = 0; j < 5; j++) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), lm(0xf0702a)); cr.rotation.z = Math.PI / 2; cr.position.set(-19.3 - k * 1.1 + j * 0.15, 0.58, -5.3); F1.add(cr); } }
  // sovutgich: muzdek devor, osilgan go'sht
  box(5.6, 5.6, 0.1, sm(0xcfe8f5, 0.2, 0.4), -20, 2.8, -4.4, F1);
  box(5.6, 0.08, 0.08, sm(0x9aa4ae, 0.3, 0.8), -20, 3.4, -2.25, F1);
  for (let k = 0; k < 4; k++) { const mt = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 10), lm(0xd96a6a)); mt.position.set(-22 + k * 1.2, 2.7, -2.25); F1.add(mt); }
  // ishchilar xonasi: divan, stol, shkaflar
  box(3, 0.45, 1, lm(0x5a7cc0), -21.8, 0.35, 2.25, F1).scale.set(1, 1, 1);
  box(3, 0.8, 0.3, lm(0x4a6ab0), -22.3, 0.8, 2.25, F1).rotation.y = Math.PI / 2;
  box(1.2, 0.5, 0.8, lm(0xc98a4a), -19.6, 0.4, 2.25, F1);
  for (let k = 0; k < 3; k++) box(0.6, 2, 0.5, lm(0x8aa0b0), -19 - k * 0.65, 1, 0.5, F1);
  // hojatxona: rakovinalar, oyna, kabinalar
  for (let k = 0; k < 2; k++) { box(0.8, 0.9, 0.5, lm(0xffffff), -21.5 + k * 1.2, 0.45, 8.5, F1); box(0.8, 0.8, 0.04, sm(0xbfe6ff, 0.05, 0.6), -21.5 + k * 1.2, 1.8, 8.75, F1); }
  for (let k = 0; k < 2; k++) box(0.06, 2.2, 1.6, lm(0xa8c8e0), -21 + k * 1.6, 1.1, 5.3, F1);
  C(1, -23, -20.6, -9, -7.4); C(1, -22.6, -18.4, -5.6, -5.0); C(1, -23, -20.2, 1.6, 2.9);

  // =================== 2-QAVAT (VIP) ===================
  const F2 = new THREE.Group(); F2.position.y = FLOOR_H; root.add(F2);
  floorPlane(F2, -hx, hx, -hz, hz);
  wall(2, F2, 'x', -hz, -hx, hx); wall(2, F2, 'x', hz, -hx, hx); wall(2, F2, 'z', hx, -hz, hz); wall(2, F2, 'z', -hx, -hz, hz);
  windows(F2, 1, [-6.4, 6.3]); windows(F2, -1, [-6.4, 6.3]);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35 });
  for (const px of [-4, 4]) { box(0.08, 3, 5.2, glassM, px, 1.5, -6.4, F2); box(0.12, 0.12, 5.2, gold, px, 3.0, -6.4, F2); C(2, px - 0.1, px + 0.1, -9, -3.8); }
  VIP_SLOTS.forEach(([tx, tz]) => table(F2, 2, tx, tz, 'vip', true));
  sign('VIP zal', 2.6, 0, 4.4, -hz + 0.2, 0, F2, '#b02030');
  for (const [sx, sz] of [[-7, 5.5], [7, 5.5]]) { box(3, 0.5, 1, lm(0xb02030), sx, 0.35, sz, F2); box(3, 0.9, 0.3, lm(0x8a1a28), sx, 0.75, sz + 0.5, F2); C(2, sx - 1.5, sx + 1.5, sz - 0.5, sz + 0.65); }
  for (const [px, pz] of [[-12, 8], [12, 8], [0, 8]]) plant(F2, px, pz, 1.2);
  for (const cx of [-8, 0, 8]) chandelier(F2, cx, -6.2);
  stairHole(F2, 2, 1); stairs(F2, 2, -1);
  sign('3-qavat ↑', 1.6, -12.84, 4.6, 3.6, Math.PI / 2, F2, '#d4a640');

  // =================== 3-QAVAT (banket zali) ===================
  const F3 = new THREE.Group(); F3.position.y = FLOOR_H * 2; root.add(F3);
  floorPlane(F3, -hx, hx, -hz, hz);
  wall(3, F3, 'x', -hz, -hx, hx); wall(3, F3, 'x', hz, -hx, hx); wall(3, F3, 'z', hx, -hz, hz); wall(3, F3, 'z', -hx, -hz, hz);
  windows(F3, 1, [-6.4, 0, 6.3]); windows(F3, -1, [6.3]);
  box(12, 0.4, 1.8, lm(0xf4e6ff), 0, 0.2, -8.0, F3); C(3, -6, 6, -9, -7.1);
  const arch = new THREE.Mesh(new THREE.ShapeGeometry(pointedArch(5, 4.4)), lm(0xf8bbd0)); arch.position.set(0, 0.4, -8.75); F3.add(arch);
  for (let k = 0; k < 14; k++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), lm([0xf06292, 0xffffff, 0xffd54f][k % 3])); const a = Math.PI * k / 13; fl.position.set(Math.cos(a) * 2.4, 0.6 + Math.sin(a) * 4.0, -8.6); F3.add(fl); }
  sign("Baxtli bo'linglar!", 4, 0, 5.2, -hz + 0.2, 0, F3, '#c2185b');
  for (let k = 0; k < 10; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), lm([0xf06292, 0xffffff, 0x64b5f6, 0xffd54f][k % 4])); b.position.set(-11 + k * 2.4, h - 0.9, -8.5 + (k % 2) * 0.4); F3.add(b); }
  TOY_SLOTS.forEach(([tx, tz]) => table(F3, 3, tx, tz, 'toy'));
  for (const cx of [-6, 0, 6]) chandelier(F3, cx, -0.3);
  stairHole(F3, 3, -1);

  // ---------- o'rindiqqa boriladigan yo'l (qavatlar orasida "tp" = zinapoyadan chiqish) ----------
  const P = (x, z, f, tp = false) => ({ x: x + O.x, z: z + O.z, y: floorY(f) + O.y, tp });
  const UP1 = [P(4.3, 7.2, 1), P(10.4, 4.4, 1), P(STAIRS[0].bottom.x, STAIRS[0].bottom.z, 1), P(STAIRS[0].top.x, STAIRS[0].top.z, 2, true)];
  const UP2 = [...UP1, P(9, 0, 2), P(-10.4, 0, 2), P(STAIRS[1].bottom.x, STAIRS[1].bottom.z, 2), P(STAIRS[1].top.x, STAIRS[1].top.z, 3, true)];
  function seatPath(tb, s) {
    const appZ = tb.tz + s.dz * 1.9;
    if (tb.floor === 1) {
      const ax = tb.tx === 0 ? Math.sign(s.dx) * AISLE : Math.sign(tb.tx) * AISLE;
      return { app: P(s.x, appZ, 1), path: [P(ax, 7.2, 1), P(ax, appZ, 1), P(s.x, appZ, 1)] };
    }
    if (tb.floor === 2) {
      if (s.dz > 0) return { app: P(s.x, appZ, 2), path: [...UP1, P(s.x, -3.4, 2), P(s.x, appZ, 2)] };
      const lane = tb.tx + Math.sign(s.dx) * 1.8;
      return { app: P(s.x, appZ, 2), path: [...UP1, P(lane, -3.4, 2), P(lane, appZ, 2), P(s.x, appZ, 2)] };
    }
    return { app: P(s.x, appZ, 3), path: [...UP2, P(-10, appZ, 3), P(s.x, appZ, 3)] };
  }
  tables.forEach((tb) => tb.seats.forEach((s) => Object.assign(s, seatPath(tb, s))));

  return {
    origin: O, group: root, type, tables, qozons, roomDoors,
    floors: [F1, F2, F3],
    qozon: new THREE.Vector3(O.x, O.y, O.z + STOVE_Z + 1.55),            // oshpaz turadigan joy
    kassa: new THREE.Vector3(O.x + 8.2, O.y, O.z + 5.9),
    waiterHome: new THREE.Vector3(O.x + 9.6, O.y, O.z - 3.2),
    doorIn: new THREE.Vector3(O.x, O.y, O.z + hz - 1.0),
    stairs: STAIRS.map((s) => ({
      from: s.from,
      bottom: P(s.bottom.x, s.bottom.z, s.from), top: P(s.top.x, s.top.z, s.from + 1),
      back: P(s.back.x, s.back.z, s.from), downAt: P(s.downAt.x, s.downAt.z, s.from + 1),
    })),
    seatW(ti, si) {
      const tb = tables[ti], s = tb.seats[si];
      return { x: s.x + O.x, z: s.z + O.z, y: floorY(tb.floor) + O.y, ry: s.ry, floor: tb.floor, kind: tb.kind, app: s.app, path: s.path };
    },
    colliders(f, k) {
      let list = cols[f].slice();
      if (f === 1) roomDoors.forEach((d, i) => { if ((k.up.xona || 1) < i + 1) list.push(d.col); });
      const n = E_TABLES(k);
      tables.forEach((tb, i) => { if (tb.floor === f && n.has(i)) list.push({ x0: tb.box.x0 + O.x, x1: tb.box.x1 + O.x, z0: tb.box.z0 + O.z, z1: tb.box.z1 + O.z }); });
      return list;
    },
    bounds(f, x) {                                    // kamera chegarasi
      const ann = f === 1 && x < O.x - hx;
      return { x0: O.x + (ann ? ANNEX_X : -hx) + 0.4, x1: O.x + (ann ? -hx : hx) - 0.4, z0: O.z - hz + 0.4, z1: O.z + hz - 0.4, y0: floorY(f) + 0.6, y1: floorY(f) + h - 0.3 };
    },
    update(k) {                                       // darajaga qarab ko'rinish
      const n = E_TABLES(k), fl = k.up.qavat || 1;
      tables.forEach((tb, i) => { tb.group.visible = n.has(i); });
      qozons.forEach((q, i) => { q.group.visible = i < qozonCount(k.up.qozon); });
      F2.visible = fl >= 2; F3.visible = fl >= 3;
      roomDoors.forEach((d, i) => { const open = (k.up.xona || 1) >= i + 1; d.panel.visible = !open; d.lock.visible = !open; });
    },
  };
}
// ko'rinadigan stollar: 1-qavatda daraja bo'yicha, VIP va banket qavat ochilganda
function E_TABLES(k) {
  const s = new Set(), n = (k.up.tapchan || 1) + 1, fl = k.up.qavat || 1;
  TABLE_KIND.forEach((kind, i) => {
    if (kind === 'hall' && i < n) s.add(i);
    if (kind === 'vip' && fl >= 2) s.add(i);
    if (kind === 'toy' && fl >= 3) s.add(i);
  });
  return s;
}
export const visibleTables = E_TABLES;

// yo'lni teskari qilish (zinapoyadagi "sakrash" nuqtalari to'g'ri joyda qolishi uchun)
export function reversePath(path) {
  const rev = path.slice().reverse();
  return rev.map((p, i) => ({ ...p, tp: i > 0 ? !!rev[i - 1].tp : false }));
}

// ---------- Damas (yetkazib berish mashinasi) ----------
export function makeDamas(color = 0xf4f4f4) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(1.7, 0.35); s.lineTo(1.75, 0.8); s.quadraticCurveTo(1.72, 1.15, 1.35, 1.3);
  s.lineTo(1.05, 1.9); s.quadraticCurveTo(0.95, 2.02, 0.7, 2.02); s.lineTo(-1.6, 2.02);
  s.quadraticCurveTo(-1.75, 2.0, -1.75, 1.8); s.lineTo(-1.75, 0.35); s.lineTo(1.7, 0.35);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }));
  body.position.z = -0.75; body.castShadow = true; g.add(body);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2a3a52, roughness: 0.1, metalness: 0.6 });
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.62), glassM); ws.position.set(1.22, 1.62, 0); ws.rotation.order = 'YXZ'; ws.rotation.set(-0.45, Math.PI / 2, 0); g.add(ws);
  for (const sz of [0.84, -0.84]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), glassM); sw.position.set(0.55, 1.6, sz); sw.rotation.y = sz > 0 ? 0 : Math.PI; g.add(sw);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.12), new THREE.MeshBasicMaterial({ color: 0x2f80e0 })); stripe.position.set(-0.05, 0.95, sz * 1.01); stripe.rotation.y = sz > 0 ? 0 : Math.PI; g.add(stripe);
  }
  const wg = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16).rotateX(Math.PI / 2);
  const wm = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  for (const wx of [1.15, -1.15]) for (const wz of [0.72, -0.72]) { const w = new THREE.Mesh(wg, wm); w.position.set(wx, 0.32, wz); g.add(w); }
  for (const z of [0.5, -0.5]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); hl.scale.set(0.5, 1, 1.2); hl.position.set(1.77, 0.75, z); g.add(hl); }
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: textTexture('Osh yetkazish', { bg: '#ffffff', fg: '#2f80e0', w: 512, h: 128, font: 'bold 60px sans-serif' }) }));
  for (const sz of [0.86, -0.86]) { const l = lbl.clone(); l.position.set(-0.6, 1.5, sz); l.rotation.y = sz > 0 ? 0 : Math.PI; g.add(l); }
  return g;
}

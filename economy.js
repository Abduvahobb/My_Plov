// =====================================================================
//  OSH MARKAZI — iqtisod (narxlar, darajalar, bozor, bayramlar). Mijoz ham,
//  server ham shu faylni ishlatadi, shuning uchun qoidalar bir joyda.
// =====================================================================

export const START_MONEY = 5000;
export const START_STOCK = 40;           // yangi biznesdagi masalliq (porsiya hisobida)
export const DISH_PRICE = 3000;          // bitta porsiya oshning asosiy narxi
export const GROWTH = 2.5;               // har daraja oldingisidan 2.5 baravar qimmat
export const MAX_OWNERS = 3;             // bitta biznesda eng ko'pi 3 sherik

// Biznes turlari: oshxona -> kafe -> restoran
export const BUSINESS = {
  oshxona:  { name: 'Osh markazi', dish: 'Osh',      equip: 'Katta qozon', priceMul: 1,  costMul: 1,   roof: 0x8b2e1e },
  kafe:     { name: 'Kafe',        dish: 'Somsa',    equip: 'Tandir',      priceMul: 3,  costMul: 10,  roof: 0x2e6fa8 },
  restoran: { name: 'Restoran',    dish: 'Shashlik', equip: 'Mangal',      priceMul: 10, costMul: 100, roof: 0x5b2a86 },
};
export const NEXT_BUSINESS = { oshxona: 'kafe', kafe: 'restoran', restoran: null };
export const NEW_BUSINESS_COST = { kafe: 150000, restoran: 1500000 };

// Kuchaytirishlar
export const UPGRADES = {
  qozon:   { name: 'Qozon',             icon: 'Q', base: 2000,  max: 5 },
  tapchan: { name: 'Stol va stullar',   icon: 'S', base: 1500,  max: 5 },
  reklama: { name: 'Reklama',           icon: 'R', base: 1000,  max: 5 },
  bezak:   { name: 'Bezak va qulaylik', icon: 'B', base: 2500,  max: 5 },
  xona:    { name: 'Xonalar',           icon: 'X', base: 8000,  max: 4 },   // 1-qavatdagi qo'shimcha xonalar
  qavat:   { name: 'Qavatlar',          icon: 'H', base: 25000, max: 3 },   // 2-qavat VIP, 3-qavat banket zali
};
export const upgradeName = (key, type) => (key === 'qozon' ? BUSINESS[type].equip : UPGRADES[key].name);

export const WORKERS = {
  oshpaz:    { name: 'Oshpaz yordamchisi', cost: 6000, desc: "Ovqat tugasa o'zi pishiradi" },
  ofitsiant: { name: 'Ofitsiant',          cost: 4000, desc: "Mijozlarga ovqatni o'zi olib boradi" },
};

// 1-qavatdagi xonalar (xona darajasi bilan ochiladi)
export const ROOMS = [
  { id: 'ombor',    name: 'Ombor',            lvl: 1, desc: "Masalliq saqlanadi" },
  { id: 'sovutgich', name: 'Sovutgich',       lvl: 2, desc: "Masalliq 10% arzon tushadi" },
  { id: 'ishchi',   name: 'Ishchilar xonasi', lvl: 3, desc: "Ishchilar 30% tezroq ishlaydi" },
  { id: 'hojat',    name: 'Hojatxona',        lvl: 4, desc: "Mijozlar 15 soniya ko'proq kutadi" },
];
export const STOCK_CAP = [80, 200, 500, 1200];             // ombor sig'imi (xona darajasi bo'yicha)

// Daraja bo'yicha qiymatlar (indeks = daraja - 1)
export const QOZON_CAP   = [10, 20, 40, 80, 150];   // bir pishirishda chiqadigan porsiya
export const COOK_TIME   = [20, 16, 13, 10, 8];     // pishirish vaqti (soniya)
export const SPAWN_EVERY = [22, 17, 13, 10, 7];     // mijoz kelish oralig'i (soniya)

export const tapchanCount = (lvl) => lvl + 1;               // 2..6 stol (har birida 4 o'rin)
export const hasRoom = (k, id) => (k.up.xona || 1) >= ROOMS.find((r) => r.id === id).lvl;
export const floors = (k) => k.up.qavat || 1;
export const priceFor = (k, vip = false) =>
  Math.round(DISH_PRICE * BUSINESS[k.type].priceMul * (1 + 0.15 * (k.up.bezak - 1)) * (vip ? 2 : 1) / 100) * 100;
export const patienceFor = (k) => 45 + 10 * (k.up.bezak - 1) + (hasRoom(k, 'hojat') ? 15 : 0);
export const cookTimeFor = (k, byWorker = false) => COOK_TIME[k.up.qozon - 1] * (byWorker && hasRoom(k, 'ishchi') ? 0.7 : 1);
export const stockCap = (k) => STOCK_CAP[(k.up.xona || 1) - 1];

// ---------- bozor narxlari (vaqt bo'yicha o'zgaradi, hamma o'yinchida bir xil) ----------
export const INGREDIENT_COST = 800;                      // bir porsiya uchun masalliq (osh)
export function marketMul(t = Date.now()) {
  const m = t / 60000;                                   // daqiqalar
  return Math.round((1 + 0.22 * Math.sin(m / 7 * Math.PI * 2) + 0.08 * Math.sin(m / 2.3 * Math.PI * 2 + 1)) * 100) / 100;
}
export function stockCost(k, n, atBazaar = false, t = Date.now()) {
  const c = n * INGREDIENT_COST * BUSINESS[k.type].priceMul * marketMul(t) *
    (hasRoom(k, 'sovutgich') ? 0.9 : 1) * (atBazaar ? 0.85 : 1);
  return Math.max(100, Math.round(c / 100) * 100);
}

// ---------- to'y buyurtmalari ----------
export function weddingOrder(k, seed = Math.random()) {
  const n = [20, 30, 40, 60][Math.floor(seed * 4)] * (k.type === 'oshxona' ? 1 : 0.5);
  return { n, reward: Math.round(n * priceFor(k) * 1.6 / 1000) * 1000 };
}
export const WEDDING_GUESTS = 16;                        // banket zaliga keladigan mehmonlar

// ---------- bayramlar (mijozlar ko'payadi, ko'chalar bezatiladi) ----------
// Hayit sanalari oy taqvimiga bog'liq, shuning uchun taxminiy berilgan.
const HOLIDAYS = [
  { id: 'navruz', name: "Navro'z bayrami", mmdd: ['03-20', '03-21', '03-22'], mul: 1.6 },
  { id: 'mustaqillik', name: 'Mustaqillik kuni', mmdd: ['08-31', '09-01', '09-02'], mul: 1.5 },
  { id: 'yangiyil', name: 'Yangi yil', mmdd: ['12-30', '12-31', '01-01', '01-02'], mul: 1.5 },
  { id: 'xotira', name: 'Xotira va qadrlash kuni', mmdd: ['05-09'], mul: 1.3 },
  { id: 'hayit', name: 'Hayit', dates: ['2026-03-20', '2026-03-21', '2026-05-27', '2026-05-28', '2027-03-10', '2027-03-11', '2027-05-17', '2027-05-18', '2028-02-27', '2028-05-05'], mul: 1.7 },
];
export function eventFor(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const mmdd = `${p(d.getMonth() + 1)}-${p(d.getDate())}`, ymd = `${d.getFullYear()}-${mmdd}`;
  const h = HOLIDAYS.find((x) => x.mmdd?.includes(mmdd) || x.dates?.includes(ymd));
  if (h) return { ...h, deco: true };
  if (d.getDay() === 5) return { id: 'juma', name: 'Juma — osh kuni', mul: 1.3, deco: false };
  return null;
}

export function upgradeCost(key, lvl, type) {
  const c = UPGRADES[key].base * Math.pow(GROWTH, lvl - 1) * BUSINESS[type].costMul;
  return Math.round(c / 100) * 100;
}
export const workerCost = (key, type) => WORKERS[key].cost * BUSINESS[type].costMul;

export function isMaxed(k) {
  return Object.keys(UPGRADES).every((u) => (k.up[u] || 1) >= UPGRADES[u].max) &&
         Object.keys(WORKERS).every((w) => k.workers[w]);
}

export function newKitchen(id, plot, type, owners, names) {
  return {
    id, plot, type, owners, names,
    up: { qozon: 1, tapchan: 1, reklama: 1, bezak: 1, xona: 1, qavat: 1 },
    workers: { oshpaz: false, ofitsiant: false },
    rating: 4.0, stock: START_STOCK, earned: 0,
  };
}
// eski saqlangan bizneslarga yangi maydonlarni qo'shish
export function fixKitchen(k) {
  k.up = { qozon: 1, tapchan: 1, reklama: 1, bezak: 1, xona: 1, qavat: 1, ...k.up };
  if (typeof k.stock !== 'number') k.stock = START_STOCK;
  if (typeof k.earned !== 'number') k.earned = 0;
  return k;
}

// Sotib olish qoidasi (serverda ham, oflayn rejimda ham bir xil)
// natija: { ok, cost, msg, apply }
export function tryBuy(k, money, what, key, extra = {}) {
  if (what === 'up') {
    const u = UPGRADES[key]; if (!u) return { ok: false, msg: 'Xato' };
    if ((k.up[key] || 1) >= u.max) return { ok: false, msg: 'Maksimal daraja' };
    const cost = upgradeCost(key, k.up[key] || 1, k.type);
    if (money < cost) return { ok: false, msg: 'Pul yetmaydi' };
    return { ok: true, cost, apply: () => { k.up[key] = (k.up[key] || 1) + 1; } };
  }
  if (what === 'worker') {
    if (!WORKERS[key] || k.workers[key]) return { ok: false, msg: 'Allaqachon yollangan' };
    const cost = workerCost(key, k.type);
    if (money < cost) return { ok: false, msg: 'Pul yetmaydi' };
    return { ok: true, cost, apply: () => { k.workers[key] = true; } };
  }
  if (what === 'stock') {                                 // masalliq sotib olish
    const n = Math.max(1, Math.min(Math.floor(+key || 0), stockCap(k) - k.stock));
    if (k.stock >= stockCap(k)) return { ok: false, msg: "Ombor to'la" };
    const cost = stockCost(k, n, !!extra.atBazaar);
    if (money < cost) return { ok: false, msg: 'Pul yetmaydi' };
    return { ok: true, cost, apply: () => { k.stock += n; } };
  }
  if (what === 'biz') {
    const nt = NEXT_BUSINESS[k.type];
    if (!nt) return { ok: false, msg: 'Eng katta biznes' };
    if (!isMaxed(k)) return { ok: false, msg: `${BUSINESS[k.type].name} maksimal darajada bo'lishi kerak` };
    const cost = NEW_BUSINESS_COST[nt];
    if (money < cost) return { ok: false, msg: 'Pul yetmaydi' };
    return { ok: true, cost, newType: nt };
  }
  return { ok: false, msg: 'Xato' };
}

# Osh markazi — 3D onlayn o'yin (Andijon)

Andijonda o'z oshxonangizni ochib, uni osh markaziga, keyin kafe va restoranga aylantiradigan 3D multiplayer o'yin.
Grafikasi Roblox uslubida: yorqin va sodda, lekin odamlar yumaloq, to'rtburchak emas.

Sinov uchun: manzil oxiriga `?event=navruz` qo'shsangiz, bayram bezaklari ko'rinadi.

## Fayllar (5 ta kod fayli)

| Fayl | Nima qiladi |
|---|---|
| `index.html` | Ekran: boshlash oynasi, tugmalar, joystik, menyu, chat |
| `game.js` | Asosiy o'yin: personaj, yurish/yugurish/o'tirish, mashina haydash, kamera, mijozlar, ishchilar, to'y buyurtmalari, multiplayer, ovozli boshlang'ich video, menyu |
| `world.js` | Shahar va binolar: yo'llar, hovlilar, maydon, bozor, park, 3 qavatli osh markazi/kafe/restoran ichi, Damas |
| `economy.js` | Narxlar, darajalar, bozor narxlari, to'y buyurtmalari, bayramlar |
| `server.js` | Multiplayer server (o'yinchilar, chat, sheriklik, pul, saqlash) |

`package.json` faqat server uchun sozlama, `.github/workflows/build.yml` esa APK, Windows dasturi va sahifani yig'ish uchun. Rasm, model yoki ovoz fayllari yo'q, hammasi kod bilan yasalgan.

## Kompyuterda ishga tushirish

1. [Node.js](https://nodejs.org) o'rnating (18 yoki yangiroq).
2. Papkada: `npm install`, keyin `npm start`.
3. Brauzerda oching: `http://localhost:3000`. Ikkinchi oynada ham ochsangiz, multiplayer ko'rinadi.
   Bir xil Wi-Fi'dagi telefondan ham kirish mumkin: `http://KOMPYUTER-IP:3000`.

## GitHub'ga yuklash

1. GitHub'da yangi repozitoriy oching (masalan `osh-markazi`).
2. Shu papkadagi fayllarni yuklang (**Add file → Upload files**). `node_modules` va `data.json` ni yuklamang.

## Internetda multiplayer (bepul)

1. [render.com](https://render.com) ga GitHub orqali kiring, **New → Web Service** ni tanlang va repozitoriyni ulang.
2. Build: `npm install`, Start: `npm start`.
3. Berilgan manzil (masalan `https://osh-markazi.onrender.com`) ni do'stlaringizga yuboring. O'yin va server bitta manzilda ishlaydi.

> Faqat GitHub Pages'da ochilsa, o'yin oflayn (bir kishilik) rejimda ishlaydi.
> Pages'da ham multiplayer kerak bo'lsa, `game.js` tepasidagi `DEFAULT_SERVER` ga server manzilini yozing (`wss://...`).

## Yuklab olish va o'ynash

- **Telefon (Android APK):** https://github.com/Abduvahobb/My_Plov/releases/latest/download/OshMarkazi.apk
- **Kompyuter (Windows):** https://github.com/Abduvahobb/My_Plov/releases/latest/download/OshMarkazi-Windows.exe (o'rnatish shart emas, yuklab olib ochasiz)
- **Brauzerda o'ynash:** https://abduvahobb.github.io/My_Plov/

Bularning hammasini GitHub o'zi yig'adi (`.github/workflows/build.yml`): har safar `main` ga yangi narsa yuklanganda yangi versiya avtomatik chiqadi.
Multiplayer uchun serverni ishga tushirib (pastga qarang), **Settings → Secrets and variables → Actions → Variables** bo'limida `SERVER_URL` = `wss://...` qo'shing.

## Boshqaruv

- **Telefon:** chap tomonda joystik, o'ng tomonda barmoq bilan kamera. Tugmalar: Yugurish, Sakrash va vaziyatga qarab o'zgaradigan harakat tugmasi (Kirish, Pishirish, Osh berish, O'tirish, Qavatga chiqish, Damasga o'tirish, Masalliq olish...).
- **Kompyuter:** W A S D bilan yurish, Shift bilan yugurish, Space bilan sakrash, E harakat tugmasi. Sichqoncha bilan kamera, M yoki Tab bilan Boshqaruv menyusi, Enter bilan chat.
- **Mashina:** oldinga — gaz, orqaga — tormoz/orqaga yurish, chap/o'ng — rul.

## O'yinda nimalar bor

**1-bosqich**
- **Ovozli boshlang'ich video:** boy odam qahramonni limuzindan itarib yuboradi. Musiqa, motor va yiqilish ovozlari, gaplar.
- **Andijon shahri (Roblox uslubida):** yo'llar, chiroqlar, hovlilar, maydon, bozor, ko'lli park, bog', futbol maydoni, ko'cha harakati.
- **Yumaloq personajlar:** erkak yoki ayol, oddiy kiyimda. Yuradi, yuguradi, sakraydi, stulga o'tiradi.
- **Mijozlar:** uydan chiqib piyoda yoki mashinadan tushib keladi, o'tiradi, buyurtma beradi, yeb pul to'laydi, uyiga qaytadi.
- **Boshqaruv menyusi, ishchilar, multiplayer va sheriklik** (har bir sherik to'liq pul oladi).

**2-bosqich**
- **3 qavatli bino.** 1-qavatda zal va chap qanotda 4 ta xona (Xonalar kuchaytirishi bilan ochiladi):
  - Ombor: masalliq saqlanadi, darajasi oshgan sari sig'imi kattalashadi.
  - Sovutgich: masalliq 10% arzon.
  - Ishchilar xonasi: ishchilar 30% tez.
  - Hojatxona: mijozlar 15 soniya ko'proq kutadi.
- **2-qavat VIP zal:** u yerdagi mijozlar 2 baravar to'laydi. **3-qavat banket zali:** to'ylar uchun. Mijozlar va ofitsiant zinapoyadan chiqib-tushadi.
- **Kafe va restoranning alohida zali:** kafe tandir va somsa, firuza bezak bilan; restoran mangal va shashlik, qizil-oltin bezak bilan.
- **Bozor narxlari:** ovqat tayyorlash uchun masalliq kerak. Narxi har bir necha daqiqada o'zgaradi, bozorga borib olsangiz 15% arzon.
- **To'y buyurtmalari:**
  - Damas bilan yetkazish: tayyorlab, Damasga yuklab, pushti nurdagi to'yxonaga haydaysiz.
  - Banket zalida to'y: 16 ta mehmon keladi, oxirida katta bonus beriladi.
- **Mashina haydash:** har bir biznesning o'z Damasi bor, boshqa o'yinchilar ham ko'radi.
- **Mahalla reytingi:** eng ko'p daromad qilgan biznes binosi tepasida toj turadi.
- **Bayramlar:** Navro'z, Mustaqillik, Yangi yil, Hayit va 9-may kunlari ko'chalar bayroqchalar bilan bezatiladi, mijozlar ko'payadi. Har juma "osh kuni".
- **Telefon uchun APK, Windows dasturi va brauzer sahifasi:** GitHub o'zi yig'adi.

## Keyingi g'oyalar

- O'yinchilar bir-biriga pul o'tkazishi va oila qurishi
- Damas bilan oddiy mijozlarga ham yetkazib berish
- Haqiqiy musiqa va ko'proq ovozlar
- Kechasi va kunduzi almashinuvi

## Davom ettirish

Yangi narsa qo'shmoqchi bo'lsangiz, Claude'ga shu fayllarni (yoki GitHub manzilini) bering va nima qo'shishni yozing. Ish shu joydan davom etadi.

# QR Etkinlik Yonetim Sistemi

Startech 2026 etkinligi icin gelistirilen QR tabanli puan toplama ve oda yonetim sistemi. Katilimcilar etkinlik boyunca QR kod taratarak puan kazanir, odalara giris/cikis yapar ve liderlik tablosunda yarisir.

## Ozellikler

- **QR Kod Tabanli Puanlama** - TOTP tabanli dinamik QR kodlar ile guvenli puan transferi
- **Oda Yonetimi** - Mulakat ve vaka calismasi odalarina giris/cikis takibi
- **Liderlik Tablosu** - Canli puan siralamalari
- **Surpriz Kodlar** - Tek kullanimlik ozel puan kodlari
- **Onay Mekanizmasi** - Mentor/gorevli onayiyla puan kazanimi
- **Admin Paneli** - Etkinlik, kullanici, oda ve puan yonetimi
- **Rol Bazli Erisim** - Admin, mentor, startup, katilimci, gorevli rolleri
- **PWA Destegi** - Mobil cihazlarda uygulama olarak yuklenebilir
- **Coklu Dil** - Turkce ve Ingilizce arayuz

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js, Express |
| Veritabani | PostgreSQL |
| Frontend | Vanilla JS, HTML, CSS |
| Guvenlik | JWT, TOTP (speakeasy), bcrypt, Helmet |
| Diger | PWA, Nodemailer, xlsx |

## Kurulum

### Gereksinimler

- Node.js >= 18
- PostgreSQL >= 14

### Adimlar

```bash
# 1. Bagimliliklari yukle
npm install

# 2. Ortam degiskenlerini ayarla
cp .env.example .env
# .env dosyasini duzenle (DB sifresi, JWT secret vb.)

# 3. Veritabanini olustur
psql -U postgres -c "CREATE DATABASE qr_sistem;"
npm run db:init

# 4. Sunucuyu baslat
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000` adresinde calisir.

## Proje Yapisi

```
├── database/
│   └── schema.sql          # PostgreSQL tablo tanimlari
├── public/                  # Frontend (PWA)
│   ├── css/main.css
│   ├── js/                  # API, auth, scanner, QR modulleri
│   ├── pages/               # HTML sayfalari
│   ├── locales/             # i18n dil dosyalari (tr, en)
│   └── sw.js                # Service Worker
├── server/
│   ├── app.js               # Express uygulama giris noktasi
│   ├── config/              # DB, env, mail konfigurasyonu
│   ├── controllers/         # Route handler'lari
│   ├── middleware/           # Auth, rol, rate-limit, etkinlik kontrolu
│   ├── models/              # Veritabani modelleri
│   ├── routes/              # API route tanimlari
│   ├── services/            # Is mantigi servisleri
│   └── utils/               # Yardimci fonksiyonlar
├── .env.example             # Ornek ortam degiskenleri
├── ecosystem.config.js      # PM2 production konfigurasyonu
└── package.json
```

## API Endpointleri

| Yol | Aciklama |
|-----|----------|
| `/api/auth` | Kayit, giris, cikis, sifre sifirlama |
| `/api/qr` | QR kod uretimi |
| `/api/scan` | QR tarama ve puan isleme |
| `/api/code` | Surpriz kod kullanimi |
| `/api/approval` | Onay kuyrugu islemleri |
| `/api/rooms` | Oda giris/cikis yonetimi |
| `/api/surprise` | Surpriz kod olusturma (admin) |
| `/api/user` | Kullanici profili ve islemleri |
| `/api/leaderboard` | Puan siralamalari |
| `/api/admin` | Admin yonetim islemleri |

## Production

```bash
# PM2 ile calistirma
npm install -g pm2
pm2 start ecosystem.config.js
```

## Lisans

Bu proje [Uludag Yazilim Toplulugu](https://github.com/uludagyazilimtoplulugu) tarafindan Startech 2026 etkinligi icin gelistirilmistir.

# Jeda Backend API 🌐
> **Layanan RESTful API & Gamification Engine untuk Ekosistem Jeda.**  
> Mengelola autentikasi pengguna, sinkronisasi cloud, leaderboard, sistem pertemanan, kalkulasi poin detoks, dan tantangan digital mindfulness.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Pooler-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Firebase Admin](https://img.shields.io/badge/Firebase%20Admin-Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-ISC-blue)](#lisensi)

---

## 📋 Ikhtisar Layanan

Backend Jeda berfungsi sebagai sentral data cloud yang menyinkronkan pencapaian pengguna dari aplikasi mobile tanpa mengganggu operasional offline perangkat:

* **Sistem Autentikasi Fleksibel**: Mendukung OAuth Google via Firebase Admin, login email/password manual, serta verifikasi OTP email 6-digit dengan proteksi masa kedaluwarsa.
* **Gamification & Points Engine**: Menghitung poin secara otomatis dari streak harian, jam bebas distraksi, dan memberikan penalti toleransi jika aplikasi terblokir dipaksa dibuka.
* **Tantangan & Peringkat (Leaderboard)**: Mengelola tantangan publik dan 1v1 antar teman, menghitung peringkat poin tertinggi dan streak terpanjang secara real-time.
* **Grafik Sosial & Notifikasi**: Mendukung follow/unfollow pengguna, profil publik, serta notifikasi aktivitas tantangan.

---

## 📁 Struktur Direktori

```
D:/jeda-backend/
├── api/                          # Vercel Serverless Function Wrapper
│   └── index.js
├── src/
│   ├── config/                   # Konfigurasi Database, Firebase Admin, & SMTP
│   │   ├── database.js           # Pooler PostgreSQL (pg)
│   │   ├── firebase.js           # Inisialisasi Firebase SDK
│   │   └── smtp.js               # Transport Nodemailer
│   ├── controllers/              # Request Handlers
│   │   ├── auth.controller.js
│   │   ├── badge.controller.js
│   │   ├── challenge.controller.js
│   │   ├── follow.controller.js
│   │   ├── leaderboard.controller.js
│   │   ├── notification.controller.js
│   │   └── user.controller.js
│   ├── db/                       # Skema, Migrasi & Data Awal
│   │   ├── migrations/           # Skrip migrasi SQL incremental
│   │   ├── seeds/                # Seed lencana (badges.seed.sql)
│   │   └── SUPABASE_FULL_SETUP.sql
│   ├── middleware/               # Auth Guard (JWT) & Validasi Input
│   │   ├── auth.js
│   │   └── validate.js
│   ├── routes/                   # Routing Modular Express
│   ├── services/                 # Business Logic & Database Queries
│   ├── utils/                    # Helper Poin & Evaluasi Lencana
│   │   ├── badge-checker.js
│   │   └── points-calculator.js
│   └── index.js                  # Express App Initialization & Port Listener
├── .env.example                  # Template Variabel Lingkungan
├── package.json                  # Dependensi & NPM Scripts
├── vercel.json                   # Konfigurasi Deploy Vercel
└── API_TESTING_GUIDE.md          # Panduan Pengujian Manual & Postman
```

---

## 🔌 Dokumentasi Endpoint API

Base URL Default: `http://localhost:3000/api`

### 1. 🔐 Autentikasi (`/api/auth`)
| Method | Endpoint | Keterangan | Auth |
|---|---|---|---|
| `GET` | `/health` | Pemeriksaan kesehatan server | Publik |
| `POST` | `/auth/google` | Login/Registrasi via Google ID Token | Publik |
| `POST` | `/auth/register` | Pendaftaran akun manual via Email | Publik |
| `POST` | `/auth/login` | Login via Email & Password | Publik |
| `POST` | `/auth/verify-otp` | Verifikasi kode OTP 6-digit | Publik |
| `POST` | `/auth/resend-otp` | Pengiriman ulang kode OTP email | Publik |
| `GET` | `/auth/me` | Mengambil data profil pengguna yang login | Bearer Token |

### 2. 👤 Pengguna & Profil (`/api/users`)
| Method | Endpoint | Keterangan | Auth |
|---|---|---|---|
| `PUT` | `/users/me` | Memperbarui nama tampilan, bio, avatar | Bearer Token |
| `GET` | `/users/search` | Mencari pengguna berdasarkan username/nama | Bearer Token |
| `GET` | `/users/:id` | Mengambil profil publik pengguna tertentu | Bearer Token |
| `POST` | `/users/me/sync-locks`| Sinkronisasi daftar aplikasi yang dikunci | Bearer Token |
| `POST` | `/users/me/report-forced`| Melaporkan upaya buka paksa & evaluasi streak | Bearer Token |

### 3. 🏆 Gamifikasi, Peringkat & Lencana
| Method | Endpoint | Keterangan | Auth |
|---|---|---|---|
| `GET` | `/leaderboard` | Peringkat global/teman (`type`: `points`/`streak`) | Publik / Token |
| `GET` | `/badges` | Daftar seluruh lencana yang tersedia | Publik |
| `GET` | `/badges/my` | Daftar lencana yang sudah diraih pengguna | Bearer Token |
| `POST` | `/badges/check` | Evaluasi & klaim lencana otomatis | Bearer Token |

### 4. ⚔️ Tantangan Komunitas (`/api/challenges`)
| Method | Endpoint | Keterangan | Auth |
|---|---|---|---|
| `GET` | `/challenges/global` | Daftar tantangan terbuka global | Publik |
| `GET` | `/challenges/my` | Daftar tantangan yang sedang diikuti | Bearer Token |
| `POST` | `/challenges` | Membuat tantangan baru (1v1 atau grup) | Bearer Token |
| `POST` | `/challenges/:id/join` | Bergabung dengan tantangan | Bearer Token |
| `POST` | `/challenges/:id/surrender`| Menyerah dari tantangan aktif | Bearer Token |

---

## 🛠️ Instalasi & Menjalankan Lokal

### 1. Prasyarat
* **Node.js** v18.0.0 atau lebih baru
* **npm** atau **yarn** / **pnpm**
* Akun & Database **PostgreSQL** (misal: Supabase, Neon, atau PostgreSQL lokal)
* Akun **Firebase Console** (untuk kredensial Google Sign-In)

### 2. Langkah Instalasi

1. **Masuk ke folder backend**:
   ```bash
   cd D:/jeda-backend
   ```

2. **Pasang dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable**:
   Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Lengkapi isian `.env` seperti:
   * `DATABASE_URL`: URI koneksi PostgreSQL / Supabase
   * `JWT_SECRET`: Kunci rahasia untuk tanda tangan JWT
   * `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   * `SMTP_USER`, `SMTP_PASS`: Kredensial email pengirim OTP

4. **Inisialisasi Database (Supabase / Postgres)**:
   * Buka SQL Editor di Dashboard database Anda.
   * Eksekusi file `src/db/SUPABASE_FULL_SETUP.sql`.
   * Eksekusi seed badges di `src/db/seeds/badges.seed.sql`.

5. **Jalankan Server (Mode Development)**:
   ```bash
   npm run dev
   ```
   Server akan aktif di: `http://localhost:3000`

---

## 🚀 Deployment (Vercel Ready)

Proyek ini telah dilengkapi `vercel.json` dan folder `api/` sehingga siap di-deploy langsung ke Vercel Serverless Functions:
1. Pastikan seluruh environment variables telah didaftarkan pada tab **Settings > Environment Variables** di Dashboard Vercel.
2. Jalankan:
   ```bash
   vercel --prod
   ```

---

## 📄 Lisensi
ISC License © 2026 Jeda Backend Team.

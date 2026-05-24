# WA Schedule Report Bot

Bot WhatsApp berbasis Node.js dengan fitur sticker, smeme, petpet, schedule, rvo, dan fitur lainnya.

---

## Requirements & Install

Sebelum menjalankan bot, pastikan sudah install:
 
 npm i --legacy-peer-deps --ignore-scripts
-
 Node.js
- Git
- FFmpeg
- WebP Tools / webpmux

---

## Install di Termux

```bash
pkg update && pkg upgrade -y
pkg install nodejs git ffmpeg libwebp -y

Cek apakah sudah terinstall:

node -v
npm -v
git --version
ffmpeg -version
webpmux -version
```
## Install di Windows

1. Install Node.js

Download Node.js LTS:

https://nodejs.org

Cek:

node -v
npm -v
2. Install Git

Download Git:

https://git-scm.com/downloads

Cek:

git --version
3. Install FFmpeg

Download FFmpeg:

https://www.gyan.dev/ffmpeg/builds/

Pilih file:

ffmpeg-release-essentials.zip

Cara pasang:

Extract file ZIP FFmpeg.
Rename folder hasil extract menjadi:
ffmpeg
Pindahkan folder ke:
C:\ffmpeg
Masuk ke folder bin, lalu copy path:
C:\ffmpeg\bin
Tekan Win + S.
Cari:
Environment Variables
Pilih:
Edit the system environment variables
Klik tombol:
Environment Variables...
Pada bagian User variables atau System variables, pilih:
Path
Klik Edit.
Klik New.
Paste path ini:
C:\ffmpeg\bin
Klik OK sampai semua window tertutup.
Tutup terminal / CMD / PowerShell.
Buka ulang terminal.

Cek:

ffmpeg -version
4. Install WebP Tools / webpmux

Download WebP Tools:

[**https://developers.google.com/speed/webp/download**
](https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.4.0-windows-x64.zip)
Cara pasang:

Extract file ZIP WebP Tools.
Rename folder hasil extract menjadi:
libwebp
Pindahkan folder ke:
C:\libwebp
Masuk ke folder bin, lalu copy path:
C:\libwebp\bin
Masukkan path tersebut ke Environment Variables seperti cara FFmpeg.
Tutup terminal / CMD / PowerShell.
Buka ulang terminal.

Cek:

webpmux -version

Kalau muncul versi, berarti sudah berhasil.

Install Project

Clone repository:

git clone LINK_REPO_KAMU
cd NAMA_FOLDER_PROJECT

Install dependencies:

npm install

Jalankan bot:

node index.js
```bash
Struktur Folder

Pastikan struktur folder seperti ini:

BOTGW/
├── assets/
│   ├── font/
│   │   ├── arialbd.ttf
│   │   └── Roboto-Black.ttf
│   └── petpet/
│       ├── 0.png
│       ├── 1.png
│       ├── 2.png
│       ├── 3.png
│       └── 4.png
├── commands/
│   ├── menu.js
│   ├── pet.js
│   ├── rvo.js
│   ├── schedule.js
│   ├── setpp.js
│   └── smeme.js
├── lib/
│   ├── helper.js
│   └── sticker.js
├── tmp/
├── config.js
├── index.js
├── package.json
├── package-lock.json
├── simple.js
└── socket.js
```

Contoh command:

#smeme text atas|text bawah
#pet
#sticker
#rvo
#schedule

Untuk smeme, kirim/reply gambar dengan caption:

#smeme text atas|text bawah

Untuk petpet, kirim/reply gambar dengan caption:

#pet
Troubleshooting
ffmpeg tidak dikenali

Kalau muncul error:

ffmpeg is not recognized

Berarti FFmpeg belum masuk PATH.

Pastikan path ini sudah ditambahkan:

C:\ffmpeg\bin

Lalu tutup terminal dan buka ulang.

webpmux tidak dikenali

Kalau muncul error:

webpmux is not recognized

Berarti WebP Tools belum masuk PATH.

Pastikan path ini sudah ditambahkan:

C:\libwebp\bin

Lalu tutup terminal dan buka ulang.

Sticker gagal di Windows

Pastikan dua command ini bisa jalan:

ffmpeg -version
webpmux -version

Kalau salah satu belum jalan, fitur sticker/smeme/petpet bisa error.

Font error di smeme

Pastikan file font ada di:

assets/font/arialbd.ttf
assets/font/Roboto-Black.ttf
Petpet asset error

Pastikan asset petpet ada di:

assets/petpet/0.png
assets/petpet/1.png
assets/petpet/2.png
assets/petpet/3.png
assets/petpet/4.png
Run Ulang Bot

Kalau bot error, stop dulu dengan:

CTRL + C

Lalu jalankan lagi:

node index.js

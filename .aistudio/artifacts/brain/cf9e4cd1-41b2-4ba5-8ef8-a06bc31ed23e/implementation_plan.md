# AgroCode — Ladang Otomatis dengan Kendaraan Pertanian 3D

AgroCode adalah game simulasi pertanian 3D berbasis pemrograman Python di mana pemain mengendalikan traktor di atas pulau ladang melayang untuk membajak, menanam, memanen, mengelola bahan bakar solar, serta mengotomasi seluruh perkebunan melalui pohon teknologi tiga cabang.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Pilihan desain utama di bawah ini telah disesuaikan dengan jawaban klarifikasi Anda serta dokumen konsep **AgroCode** dan gambar referensi. Silakan tinjau sebelum kami mulai membangun aplikasi.

- **Confirmed Decision 1 — Lingkungan 3D Pulau Melayang (Floating Sky Island)**: Ladang 3D disajikan sebagai blok pulau tanah bertingkat yang melayang di angkasa biru keabu-abuan (seperti gambar referensi *The Farmer Was Replaced*), namun menggunakan **Traktor Pertanian 3D komposit** di darat lengkap dengan roda berputar, cerobong asap, lampu depan, dan alat tempel (*implement*: bajak, penabur, pemanen, pengangkut) yang tampak secara visual di belakang traktor.
- **Confirmed Decision 2 — Jendela Editor Kode Mengambang (Draggable Floating IDE)**: Editor kode Python dirancang sebagai jendela mengambang (*floating window*) yang dapat digeser (*drag*), diminimalkan, atau ditambah tab skripnya (`main`, `rute_panen`, dll.) dengan tombol kontrol hijau lumut (`Play`, `Step`, `Minimize`, `Close`) persis seperti estetika gambar referensi.
- **Confirmed Decision 3 — Progresi Bertahap (Manual ke Otomasi Python)**: Permainan dimulai dari tahap pengenalan mekanik dasar secara manual (membajak, menanam, memanen, mengisi solar, mengantar ke gudang), kemudian membuka editor kode satu baris hingga pohon teknologi penuh (`while`, `if`, `for`, `list`, `def`, `import random`).
- **Integrated Feature — Asisten Optimasi & Analisis Kode (High-Thinking AI Coach)**: Dilengkapi fitur opsional **"Analisis & Optimasi Rute"** berbasis `gemini-4-argon` (`ThinkingLevel.HIGH`) di sisi server untuk membantu pemain menganalisis efisiensi bahan bakar dan memperbaiki bug logika Python saat dibutuhkan tanpa mengganggu kemurnian bermain.

---

### 1. Overview & Core Concept

- **What It Does**: Menggabungkan mekanik *farming automation* bergaya *The Farmer Was Replaced* dengan simulasi logistik traktor darat. Pemain belajar konsep pemrograman Python secara alami (*learning by doing*) karena keterbatasan fisik traktor—seperti kapasitas solar, pergantian alat tempel, lumpur yang memperlambat laju, batu penghalang, dan pengangkutan hasil panen ke gudang—menuntut kode yang cerdas dan efisien.
- **Target Audience / Persona**: Pelajar, penggemar game *coding/automation*, dan pemain kasual yang ingin mempelajari algoritma, struktur kontrol, dan efisiensi rute melalui visualisasi 3D interaktif yang memuaskan.
- **Key Value**: Setiap baris kode Python yang ditulis langsung terlihat dampaknya secara fisik pada traktor 3D di atas grid ladang, lengkap dengan umpan balik suara sintetis Web Audio, partikel tanah/panen, serta progresi target yang jelas di Pohon Teknologi.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Layar Judul (Title Screen)**: Kamera 3D mengorbit perlahan mengelilingi pulau ladang melayang tempat traktor sedang bekerja otomatis. Menampilkan tipografi judul SVG kustom **AGROCODE**, tombol utama `Mulai Bermain (Enter / Space)`, dan baris petunjuk singkat `WASD Manual · Space Aksi · Klik & Geser Kamera · Esc Jeda`.
  2. **Fase 1 — Kontrol Manual & Pengenalan Ladang**: Pemain menggerakkan traktor secara manual menggunakan tombol arah/WASD atau tombol aksi kontekstual untuk memahami siklus dasar: memasang alat `bajak()`, `tanam("jerami")`, menunggu tumbuh, lalu `panen()`.
  3. **Fase 2 — Membuka Jendela Editor Python (`main`)**: Setelah panen pertama terkumpul, jendela editor mengambang terbuka. Pemain menulis perintah API Python (`traktor.maju()`, `traktor.belok("kanan")`, `traktor.bajak()`, `traktor.panen()`) dan menekan tombol **Play (▶)** atau **Step (▷)** untuk mengeksekusi baris demi baris dengan sorotan baris aktif (*active line highlight*).
  4. **Fase 3 — Pohon Teknologi 3 Cabang & Ekspansi Pulau**: Hasil panen (`Jerami`, `Kayu`, `Wortel`, `Labu`, `Batu`) digunakan pada modal Pohon Teknologi untuk membuka:
     - **Cabang Kode**: `while`, `if / else`, `for`, `print()`, `list`, `def`, dan `import random`.
     - **Cabang Alat**: Bajak (`bajak()`), Penabur (`tanam(bibit)`), Pemanen (`panen()`), Pengangkut (`kirim_ke_gudang()`), dan Tangki Solar Besar.
     - **Cabang Logistik**: Pom Bensin (`isi_bahan_bakar()` / `ke_pom_bensin()`), Gudang penyimpanan, dan Jalan beraspal/batu (bonus kecepatan di atas medan berlumpur).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: *Clean Low-Poly Tactile Dioptric* — terinspirasi langsung dari gambar referensi dengan langit atmosferik biru-abu lembut, pulau tanah berlapis batu dan rumput gandum keemasan, serta antarmuka panel gelap minimalis beraksen hijau zaitun/lumut.
  - *Color Palette & Mood*:
    - `--background`: `#6E8596` hingga `#8CA2B2` (Gradien langit atmosferik lembut dengan *exponential fog* senada).
    - `--surface-hud`: `rgba(38, 40, 42, 0.94)` (Panel editor kode mengambang bebas *backdrop-blur* agar performa WebGL 60fps tetap mulus).
    - `--primary`: `#658B1E` (Hijau lumut khas tombol aksi pada gambar referensi).
    - `--accent-amber`: `#E5A93C` (Warna gandum/jerami matang, indikator bahan bakar solar, dan aksen traktor).
    - `--danger`: `#D9534F` (Peringatan solar kritis `< 20%` atau error sintaks Python).
  - *Typography & Hierarchy*:
    - Display / Judul Game: `Outfit` (tegas, geometris, modern).
    - UI & Instruksi: `Plus Jakarta Sans` (bersih dan nyaman dibaca pada ukuran kecil).
    - Editor Kode & Angka Resource: `JetBrains Mono` dengan `tabular-nums` untuk penomoran baris kode, log `print()`, dan penghitung panen.
  - *Component Styling & Layout*:
    - Kanvas 3D memenuhi `100vw x 100vh` dengan >85% area layar bebas halangan.
    - Pojok kanan atas menampilkan tombol ikon kompak bergaya hijau lumut seperti gambar referensi: `+` (Tambah/Buka Skrip Editor), `i` (Dokumentasi API Python & Contoh Kode), `^` (Pohon Teknologi & Target Progres `7 / 10`), serta tombol `AI` (Analisis Optimasi Kode) dan `Mute`.
    - Pojok kiri atas menampilkan klaster status ringkas: Bahan Bakar Solar, Alat Terpasang, isi Pengangkut, dan jumlah Resource Panen (`Jerami`, `Kayu`, `Wortel`, `Labu`, `Batu`).
- **Interactive Feedback & Motion**:
  - Saat traktor membajak, menanam, atau memanen, muncul partikel 3D (bongkahan tanah, percikan bibit, potongan jerami keemasan), guncangan kecil (*squash-and-stretch* sasis traktor), dan efek suara sintetis Web Audio (deru mesin diesel lembut, bunyi bajak tanah, suara panen, dan pengisian solar).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Interpreter Subset Python Kustom di Browser dengan Eksekusi Berbasis Langkah (Step/Tick Generator)**
  - *Chosen Approach*: Membangun parser dan interpreter AST Python ringan di TypeScript yang menerjemahkan sintaks Python pemain (`while True:`, `if traktor.bahan_bakar < 20:`, `for i in range(5):`, `def`, `list`, `import random`, serta fungsi global maupun metode objek `traktor.*`) menjadi *async generator steps* yang selaras dengan *tick* animasi 3D traktor.
  - *Why*: Memungkinkan eksekusi `while True:` berjalan terus-menerus tanpa membekukan browser, menyorot baris kode yang sedang dieksekusi secara *real-time*, mendukung tombol **Step (▷)** satu per satu, dan memvalidasi apakah fitur sintaks (misal `while` atau `for`) sudah dibuka di Pohon Teknologi.
  - *Alternatives Considered*: Menjalankan Python penuh via WebAssembly (Pyodide) memerlukan unduhan puluhan MB dan sulit dihentikan di tengah `while True:` tanpa Web Worker yang rumit.
- **Decision 2 — Model Traktor & Pulau 3D Prosedural Komposit (`THREE.Group`)**
  - *Chosen Approach*: Merakit traktor dari 10+ bagian geometri prosedural (sasis utama, kap mesin ber-bevel, kabin kaca, 2 roda belakang besar beralur, 2 roda depan kemudi, cerobong knalpot dengan partikel asap, lampu depan, serta modul alat tempel di belakang yang berganti secara visual antara Bajak, Penabur, Pemanen, dan Gerobak Pengangkut) di atas pulau melayang berlapis tanah dan bebatuan.
  - *Why*: Menjamin pemuatan instan bebas *error* 404 aset eksternal, pencahayaan studio PBR (`RoomEnvironment` + *warm key light* + *cool hemisphere fill*), dan animasi mekanis yang hidup.
- **Decision 3 — Integrasi Asisten Optimasi Kode dengan `gemini-4-argon` (`ThinkingLevel.HIGH`)**
  - *Chosen Approach*: Menyediakan rute server Express `/api/ai/optimize` yang memanggil model `gemini-4-argon` dengan konfigurasi `thinkingLevel: ThinkingLevel.HIGH` untuk menganalisis kode Python pemain, kondisi grid ladang, dan sisa bahan bakar, lalu memberikan saran perbaikan logika atau efisiensi rute.
  - *Why*: Membantu pemain ketika mengalami kebuntuan logika atau kehabisan solar di tengah ladang berlumpur dengan penalaran algoritma yang mendalam.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGROCODE GAME SHELL (React)                      │
│  ┌───────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Title Screen &    │  │ Top Perimeter HUD    │  │ Tech Tree & API  │  │
│  │ Tutorial Overlay  │  │ (Fuel, Crops, Tools) │  │ Docs Modals      │  │
│  └─────────┬─────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│            │                       │                       │            │
│            ▼                       ▼                       ▼            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              CENTRAL GAME STATE & PROGRESSION STORE               │  │
│  │  • Grid Map State (Soil, Mud, Road, Rock, Gas Station, Barn)      │  │
│  │  • Tractor State (Pos, Dir, Fuel, Implement, Cargo, AnimPhase)    │  │
│  │  • Tech Tree State (Unlocked Code Nodes, Tools, Logistics)        │  │
│  └─────────┬───────────────────────────────────────────────┬─────────┘  │
│            │                                               │            │
│            ▼                                               ▼            │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │   3D FLOATING ISLAND VIEWPORT   │   │ DRAGGABLE PYTHON CODE IDE   │  │
│  │   • Three.js PBR Scene & Fog    │   │ • Multi-tab Script Editor   │  │
│  │   • Composite Tractor & Tools   │   │ • Python AST Step Runner    │  │
│  │   • Instanced Crops & Particles │   │ • Active Line Highlighter   │  │
│  │   • Procedural Web Audio Synth  │   │ • Console Output (`print`)  │  │
│  └─────────────────────────────────┘   └──────────────┬──────────────┘  │
└───────────────────────────────────────────────────────┼─────────────────┘
                                                        │ HTTP POST
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND (`/api/ai/optimize`)                │
│  • `@google/genai` SDK (`gemini-4-argon`, `ThinkingLevel.HIGH`)         │
│  • Analyzes player Python script + farm grid logistics & fuel usage     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Tile Grid (`TileData[][]`)**: Menyimpan koordinat `(x, z)`, tipe medan (`tanah`, `lumpur`, `jalan`, `batu`, `pom_bensin`, `gudang`), status olahan (`liar`, `dibajak`, `ditanam`, `siap_panen`), jenis tanaman (`jerami`, `kayu`, `wortel`, `labu`), dan progres pertumbuhan (`0.0` – `1.0`).
  - **Tractor State**: Posisi grid `(x, z)`, orientasi arah (`utara`, `timur`, `selatan`, `barat`), `bahan_bakar` (`0` – `maxFuel`), alat terpasang (`kosong`, `bajak`, `penabur`, `pemanen`, `pengangkut`), muatan inventori sementara di traktor, dan kecepatan gerak yang dipengaruhi medan.
  - **Tech Tree Nodes (`TechNode[]`)**: Tiga cabang (`kode`, `alat`, `logistik`) dengan status `unlocked`, biaya panen (misal `7 / 10 Jerami`), dan efek pembukaan fitur API/sintaks.
- **Interactive Component & State Mapping**:
  - **Kontrol Manual & Tombol Aksi Cepat**: Pada fase awal (dan kapan saja saat kode tidak berjalan), pemain dapat menggerakkan traktor dengan `WASD` / tombol layar sentuh, mengganti alat tempel, membajak, menanam, memanen, mengisi solar di pom bensin, atau mengirim hasil panen ke gudang.
  - **Floating Python Editor**: Mendukung *drag-and-drop* posisi jendela, *syntax highlighting*, tombol **Run/Loop (▶)**, **Step (▷)** satu langkah, **Stop (■)**, pembuatan file skrip baru (`+`), dan *template* otomatis contoh kode dari dokumen konsep (`while True:`, pengecekan `traktor.bahan_bakar < 20`, `tanaman_siap()`, dll.).
  - **Validasi Pohon Teknologi**: Jika pemain menulis `while` atau `for` sebelum membuka node terkait di Cabang Kode, editor menampilkan pesan panduan ramah yang mengarahkan pemain untuk membuka node tersebut menggunakan hasil panen, disertai opsi **Mode Sandbox (Buka Semua)** bagi pemain yang ingin langsung bereksperimen penuh.

# BGS SHOP — Auto Diagnostic Web Tool
## Panduan Instalasi & Penggunaan

---

## 📁 STRUKTUR FOLDER

```
bgs_shop/
├── app.py                  ← Backend Flask (server utama)
├── requirements.txt        ← Daftar dependensi Python
├── BGS_SHOP.spec           ← Konfigurasi build PyInstaller (.exe)
├── README.md               ← Panduan ini
├── templates/
│   ├── index.html          ← Halaman utama (dashboard)
│   └── report.html         ← Template laporan HTML
└── static/
    ├── css/
    │   └── style.css       ← Stylesheet utama
    └── js/
        └── app.js          ← Logic frontend JavaScript
```

---

## ⚙️ INSTALASI

### 1. Pastikan Python 3.8+ terinstall
```
python --version
```

### 2. Install dependensi
```bash
pip install -r requirements.txt
```

Atau manual:
```bash
pip install flask psutil
```

---

## ▶️ CARA MENJALANKAN

```bash
python app.py
```

Aplikasi akan otomatis membuka browser di:
```
http://localhost:5000
```

---

## 🖥️ CARA PENGGUNAAN

1. **Buka browser** → `http://localhost:5000`
2. **Masukkan nama customer** di kolom input
3. **Klik "SCAN SEKARANG"** → sistem otomatis membaca hardware
4. **Hasil scan tampil** dengan indikator warna:
   - 🟢 **Hijau** = Aman
   - 🟡 **Kuning** = Perlu Perhatian
   - 🔴 **Merah** = Disarankan Upgrade
5. **Klik "Generate Laporan"** → file HTML laporan terbuka di browser

---

## 📊 DATA YANG DISCAN

| Komponen       | Info yang Diambil                            |
|----------------|----------------------------------------------|
| RAM            | Total, terpakai, persentase penggunaan       |
| Processor      | Nama CPU, core, thread, frekuensi, beban     |
| Storage        | Total, terpakai, bebas, persentase per drive |
| Tipe Storage   | SSD / HDD (Windows only via PowerShell)      |
| Baterai        | Persentase, status cas, estimasi sisa waktu  |
| Sistem Operasi | Nama OS, versi, arsitektur, hostname         |

---

## ⚡ REKOMENDASI OTOMATIS

| Kondisi                      | Rekomendasi                        |
|------------------------------|------------------------------------|
| RAM < 4 GB                   | Upgrade RAM segera (min. 8 GB)     |
| RAM 4–8 GB                   | Pertimbangkan upgrade ke 16 GB     |
| Storage < 128 GB             | Upgrade ke SSD 512 GB / 1 TB       |
| Storage 128–256 GB           | Pertimbangkan upgrade storage      |
| Baterai < 40%                | Ganti baterai segera               |
| Baterai 40–70%               | Monitor kondisi baterai            |

---

## 📦 BUILD KE FILE .EXE (Windows)

### 1. Install PyInstaller
```bash
pip install pyinstaller
```

### 2. Build menggunakan spec file
```bash
pyinstaller BGS_SHOP.spec
```

### 3. File .exe ada di folder:
```
dist/BGS_SHOP_Diagnostic.exe
```

### ⚠️ Catatan Build
- Antivirus kadang blokir file PyInstaller — tambahkan ke whitelist
- Ukuran .exe sekitar 30–60 MB (normal, sudah include Python runtime)
- Jalankan .exe sebagai Administrator agar bisa baca semua hardware info
- Pastikan port 5000 tidak dipakai aplikasi lain

---

## 🔧 KONFIGURASI

Edit di `app.py` untuk mengubah:
- **Port server** → cari `port=5000`, ganti sesuai kebutuhan
- **Host** → `host="0.0.0.0"` artinya bisa diakses dari LAN

---

## 📋 DEPENDENCY

| Package    | Fungsi                              |
|------------|-------------------------------------|
| `flask`    | Web framework Python                |
| `psutil`   | Baca info hardware (RAM, CPU, dll.) |

---

## 👨‍💻 PENGEMBANGAN LANJUTAN

Ide fitur untuk versi berikutnya (V2):
- [ ] Database SQLite untuk simpan riwayat scan
- [ ] Export laporan ke PDF
- [ ] Fitur print langsung dari browser
- [ ] Multi-language support
- [ ] Network scan (ping test, koneksi internet)
- [ ] Suhu CPU/GPU monitoring
- [ ] Login teknisi dengan password

---

**BGS SHOP — Computer Service Center**
*Auto Diagnostic Web Tool v1.0*

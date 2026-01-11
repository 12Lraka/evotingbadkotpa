# PANDUAN INSTALASI (VERSI PHP & MYSQL)

Aplikasi ini sekarang mendukung backend PHP dan MySQL untuk hosting standar (cPanel, XAMPP, dll).

## LANGKAH 1: PERSIAPAN DATABASE

1. Buka **phpMyAdmin** di hosting Anda.
2. Buat database baru (misal: `voting_db`).
3. Buka database tersebut, lalu klik menu **Import**.
4. Pilih file `mysql_schema.sql` yang ada di dalam folder zip ini.
5. Klik **Go** / **Kirim** untuk membuat tabel.

## LANGKAH 2: UPLOAD KE HOSTING

1. Upload semua file dan folder (index.html, admin.html, folder assets, folder api, dll) ke `public_html` di hosting Anda.

## LANGKAH 3: KONFIGURASI KONEKSI (WAJIB!)

1. Buka **File Manager** di hosting Anda.
2. Masuk ke folder `api`.
3. Cari file bernama `config.php`, klik kanan dan pilih **Edit**.
4. Ubah bagian berikut sesuai database hosting Anda:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'username_hosting_anda'); // Contoh: u12345_admin
   define('DB_PASS', 'password_hosting_anda');
   define('DB_NAME', 'nama_database_anda');    // Contoh: u12345_voting
   ```
5. Simpan file tersebut.

## LANGKAH 4: CEK KONEKSI (TROUBLESHOOTING)

Jika Anda tidak bisa login, ikuti langkah ini:

1. Buka browser dan akses alamat ini:
   `http://namadomain-anda.com/api/check_db.php`
2. Halaman ini akan mengecek apakah koneksi database berhasil.
3. Jika muncul **MERAH (Error)**: Perbaiki lagi `api/config.php`.
4. Jika muncul **HIJAU (Sukses)**: Anda bisa melihat Email dan Password admin yang aktif di halaman tersebut.
5. Gunakan email dan password tersebut untuk login di `admin.html`.

## LANGKAH 5: PENGGUNAAN

1. Buka halaman pemilih di alamat utama website Anda:
   `http://namadomain-anda.com/`

2. Buka halaman Admin di alamat berikut:
   `http://namadomain-anda.com/admin.html`
   
3. Login ke Admin dengan email/password (Default: `admin@gmail.com` / `25voting`).
   
4. Di halaman Admin:
   - Menu **Kandidat**: Tambahkan data calon ketua.
   - Menu **Voucher**: Generate kode voucher untuk pemilih.
   - Menu **Dashboard**: Lihat hasil perolehan suara secara real-time.

**Catatan:**
- Pastikan hosting Anda mendukung PHP (versi 7.4 atau lebih baru disarankan) dan ekstensi PDO MySQL aktif.
- Aplikasi ini sekarang berkomunikasi dengan file-file di folder `/api/` (misal: `/api/candidates.php`).

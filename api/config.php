<?php
// ==========================================
// KONFIGURASI DATABASE (WAJIB DIUBAH DI HOSTING)
// ==========================================
define('DB_HOST', 'localhost'); // Biasanya 'localhost'
define('DB_USER', 'root');      // Username database hosting Anda
define('DB_PASS', '');          // Password database hosting Anda
define('DB_NAME', 'voting_db'); // Nama database yang Anda buat di hosting

// ==========================================
// KONFIGURASI ADMIN (BISA DIUBAH SESUAI KEINGINAN)
// ==========================================
// Gunakan email dan password ini untuk login pertama kali
define('ADMIN_EMAIL', 'admin@gmail.com');
define('ADMIN_PASS', '25voting');

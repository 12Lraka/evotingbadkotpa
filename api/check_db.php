<?php
require_once 'config.php';

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Cek Koneksi Database</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Diagnosa Sistem Voting</h1>
    
    <div class="info">
        <h3>1. Konfigurasi Database (dari config.php)</h3>
        Host: <?php echo DB_HOST; ?><br>
        User: <?php echo DB_USER; ?><br>
        DB Name: <?php echo DB_NAME; ?><br>
    </div>

    <div class="info">
        <h3>2. Konfigurasi Admin</h3>
        Email Login: <strong><?php echo ADMIN_EMAIL; ?></strong><br>
        Password: <strong><?php echo ADMIN_PASS; ?></strong><br>
    </div>

    <div class="info">
        <h3>3. Test Koneksi Database...</h3>
        <?php
        try {
            $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            echo '<div class="success">✅ KONEKSI SUKSES!</div>';
            
            // Cek tabel
            echo "<br>Mengecek tabel...<br>";
            $tables = ['candidates', 'vouchers', 'votes'];
            foreach ($tables as $t) {
                try {
                    $stmt = $pdo->query("SELECT COUNT(*) FROM $t");
                    $count = $stmt->fetchColumn();
                    echo "Tabel '$t': OK (Jumlah data: $count)<br>";
                } catch (Exception $e) {
                    echo "<div class='error'>❌ Tabel '$t' bermasalah: " . $e->getMessage() . "</div>";
                }
            }
            
        } catch (PDOException $e) {
            echo '<div class="error">❌ KONEKSI GAGAL: ' . $e->getMessage() . '</div>';
            echo '<p>Solusi: Cek file <code>api/config.php</code> dan pastikan DB_USER, DB_PASS, dan DB_NAME sudah benar sesuai hosting Anda.</p>';
        }
        ?>
    </div>
    
    <p><a href="../admin.html">Kembali ke Admin Panel</a></p>
</body>
</html>

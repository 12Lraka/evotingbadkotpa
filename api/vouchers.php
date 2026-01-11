<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Validate Voucher
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'validate') {
    $data = getJsonInput();
    $code = $data['code'] ?? '';
    
    if (!$code) jsonResponse(['valid' => false, 'message' => 'Code required'], 400);
    
    $stmt = $pdo->prepare("SELECT * FROM vouchers WHERE code = ?");
    $stmt->execute([$code]);
    $voucher = $stmt->fetch();
    
    if (!$voucher) {
        // Jika voucher tidak ditemukan, buat baru (auto-register logic dari versi sebelumnya)
        // Atau return false jika ingin strict. Sesuai logic lama: "auto-add if missing" (local storage behavior)
        // Tapi di server-side validation biasanya strict.
        // Mari kita ikuti logic Supabase RPC `validate_voucher`
        // Logic Supabase: Cek exist, jika exist return !used. Jika not exist, return false (atau true tergantung implementasi).
        // Di RPC lama `validate_voucher`:
        /*
          IF EXISTS(SELECT 1 FROM vouchers WHERE code = voucher_code) THEN
            RETURN NOT (SELECT used FROM vouchers WHERE code = voucher_code);
          ELSE
            RETURN FALSE; -- Atau TRUE jika ingin allow unknown codes
          END IF;
        */
        // User request sebelumnya ingin "Strict", jadi return false jika tidak ada.
        jsonResponse(false); 
    } else {
        jsonResponse(!$voucher['is_used']);
    }
}

// Generate Vouchers
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'generate') {
    $data = getJsonInput();
    $count = intval($data['count'] ?? 10);
    $codes = [];
    
    $stmt = $pdo->prepare("INSERT INTO vouchers (code) VALUES (?)");
    
    for ($i = 0; $i < $count; $i++) {
        $code = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));
        try {
            $stmt->execute([$code]);
            $codes[] = $code;
        } catch (Exception $e) {
            // Ignore duplicate collision and retry or skip
            $i--;
        }
    }
    jsonResponse($codes);
}

// List Vouchers
if ($method === 'GET') {
    $limit = $_GET['limit'] ?? 100;
    $stmt = $pdo->prepare("SELECT * FROM vouchers ORDER BY code ASC LIMIT ?");
    $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
    $stmt->execute();
    jsonResponse($stmt->fetchAll());
}

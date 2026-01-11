<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Submit Ballot
if ($method === 'POST') {
    $data = getJsonInput();
    $code = $data['code'] ?? '';
    $candidateIds = $data['candidateIds'] ?? [];
    
    if (!$code || empty($candidateIds)) jsonResponse(['error' => 'Invalid data'], 400);
    
    try {
        $pdo->beginTransaction();
        
        // Cek Voucher
        $stmt = $pdo->prepare("SELECT is_used FROM vouchers WHERE code = ? FOR UPDATE");
        $stmt->execute([$code]);
        $voucher = $stmt->fetch();
        
        if (!$voucher || $voucher['is_used']) {
            $pdo->rollBack();
            jsonResponse(['error' => 'Voucher invalid or used'], 400);
        }
        
        // Mark Used
        $stmt = $pdo->prepare("UPDATE vouchers SET is_used = 1, consumed_at = NOW() WHERE code = ?");
        $stmt->execute([$code]);
        
        // Insert Votes
        $stmt = $pdo->prepare("INSERT INTO votes (candidate_id, voucher_code) VALUES (?, ?)");
        foreach ($candidateIds as $cid) {
            $stmt->execute([$cid, $code]);
        }
        
        $pdo->commit();
        jsonResponse(['success' => true]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// Get Counts
if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT c.id, c.name, c.photo_url, COUNT(v.id) as votes
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY c.id
    ");
    jsonResponse($stmt->fetchAll());
}

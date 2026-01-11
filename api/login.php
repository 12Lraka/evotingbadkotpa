<?php
require_once 'config.php';
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonInput();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if ($email === ADMIN_EMAIL && $password === ADMIN_PASS) {
        // Simple sessionless auth for this demo (or use JWT/Session)
        // Client side just needs to know it's success
        jsonResponse(['success' => true, 'token' => 'dummy-admin-token']);
    } else {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }
}

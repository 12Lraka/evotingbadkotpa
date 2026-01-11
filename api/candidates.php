<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM candidates ORDER BY name ASC");
    jsonResponse($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = getJsonInput();
    if (!isset($data['name'])) jsonResponse(['error' => 'Name required'], 400);
    
    $stmt = $pdo->prepare("INSERT INTO candidates (name, photo_url) VALUES (?, ?)");
    $stmt->execute([$data['name'], $data['photo_url'] ?? '']);
    
    $id = $pdo->lastInsertId();
    $stmt = $pdo->prepare("SELECT * FROM candidates WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse($stmt->fetch());
} elseif ($method === 'PUT') {
    $data = getJsonInput();
    if (!isset($data['id'])) jsonResponse(['error' => 'ID required'], 400);
    
    $fields = [];
    $values = [];
    if (isset($data['name'])) { $fields[] = 'name = ?'; $values[] = $data['name']; }
    if (isset($data['photo_url'])) { $fields[] = 'photo_url = ?'; $values[] = $data['photo_url']; }
    
    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    
    $values[] = $data['id'];
    $stmt = $pdo->prepare("UPDATE candidates SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    $stmt = $pdo->prepare("SELECT * FROM candidates WHERE id = ?");
    $stmt->execute([$data['id']]);
    jsonResponse($stmt->fetch());
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID required'], 400);
    
    $stmt = $pdo->prepare("DELETE FROM candidates WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

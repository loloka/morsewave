<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

$admin = require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);

if ($id === (int) $admin['id']) {
    http_response_code(400);
    echo json_encode(['error' => 'Нельзя удалить свой же админский аккаунт']);
    exit;
}

// user_stats удалится каскадно (FOREIGN KEY ... ON DELETE CASCADE)
$stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
$stmt->execute(['id' => $id]);

echo json_encode(['ok' => true, 'deleted' => $stmt->rowCount() > 0]);

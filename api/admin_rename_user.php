<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);
$name = trim($input['name'] ?? '');

if (mb_strlen($name) < 2 || mb_strlen($name) > 40) {
    http_response_code(422);
    echo json_encode(['error' => 'Имя должно быть от 2 до 40 символов']);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET name = :name WHERE id = :id');
$stmt->execute(['name' => $name, 'id' => $id]);

echo json_encode(['ok' => true]);

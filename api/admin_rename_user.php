<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';

require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);
$name = trim($input['name'] ?? '');

if (mb_strlen($name) < 2 || mb_strlen($name) > 40) {
    http_response_code(422);
    echo json_encode(['error' => t('api.account.name_length')]);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET name = :name WHERE id = :id');
$stmt->execute(['name' => $name, 'id' => $id]);

echo json_encode(['ok' => true]);

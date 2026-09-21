<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

// Выдать/снять статус спонсора пользователю. Только для администратора.
require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);
$makeSponsor = !empty($input['is_sponsor']);

if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['error' => t('api.admin.no_user')]);
    exit;
}

$target = $pdo->prepare('SELECT id, name FROM users WHERE id = :id');
$target->execute(['id' => $id]);
$user = $target->fetch();
if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => t('api.admin.user_not_found')]);
    exit;
}

set_user_sponsor($pdo, $id, $makeSponsor);

echo json_encode([
    'ok'         => true,
    'id'         => $id,
    'is_sponsor' => $makeSponsor,
]);

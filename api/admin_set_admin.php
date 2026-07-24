<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Выдать/снять права администратора другому (или себе) аккаунту. Только для
// действующего админа. Единственная защита от «отстрелить себе ногу» — нельзя
// снять последнего админа: иначе в систему было бы некому попасть.

require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);
$makeAdmin = !empty($input['is_admin']);

if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['error' => 'Не указан пользователь']);
    exit;
}

$target = $pdo->prepare('SELECT id, is_admin FROM users WHERE id = :id');
$target->execute(['id' => $id]);
$user = $target->fetch();
if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Пользователь не найден']);
    exit;
}

// Снятие прав: не даём убрать последнего админа — иначе в админку никто уже
// не зайдёт и вернуть права можно будет только руками в БД.
if (!$makeAdmin && $user['is_admin']) {
    $adminCount = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_admin = 1')->fetchColumn();
    if ($adminCount <= 1) {
        http_response_code(409);
        echo json_encode(['error' => 'Нельзя снять права с последнего администратора — сначала назначь админом кого-то ещё']);
        exit;
    }
}

$pdo->prepare('UPDATE users SET is_admin = :a WHERE id = :id')
    ->execute(['a' => $makeAdmin ? 1 : 0, 'id' => $id]);

echo json_encode(['ok' => true, 'id' => $id, 'is_admin' => $makeAdmin]);

<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Отдаёт сохранённый на сервере полный Progress-объект (user_progress).
// Вызывается один раз сразу после логина/регистрации — результат
// сливается с localStorage через Progress.mergeFromServer() на клиенте.

require_login_json();
$userId = current_user_id();

require_once __DIR__ . '/../includes/donation_service.php';
$suppCheck = $pdo->prepare('
    SELECT 1 FROM users WHERE id = :id AND is_sponsor = 1
    UNION
    SELECT 1 FROM donations WHERE user_id = :id2
    LIMIT 1
');
$suppCheck->execute(['id' => $userId, 'id2' => $userId]);
if ($suppCheck->fetch()) {
    grant_supporter_progress($pdo, $userId);
}

session_write_close(); // дальше только чтение из БД — сессия больше не нужна

$stmt = $pdo->prepare('SELECT progress_json, updated_at FROM user_progress WHERE user_id = :id');
$stmt->execute(['id' => $userId]);
$row = $stmt->fetch();

if (!$row) {
    // На сервере ещё ничего нет (первый логин / никогда не пушился) —
    // это нормальная ситуация, не ошибка.
    echo json_encode(['ok' => true, 'progress' => null]);
    exit;
}

echo json_encode([
    'ok' => true,
    'progress' => json_decode($row['progress_json'], true),
    'updated_at' => $row['updated_at'],
]);

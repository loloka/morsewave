<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Не требуем строго POST/логин через require_login_json — вызывается
// "на всякий случай" при сбросе прогресса, даже если пользователь не
// залогинен (тогда просто тихо ничего не делаем).
$userId = current_user_id();
if ($userId) {
    $pdo->prepare('DELETE FROM user_stats WHERE user_id = :id')->execute(['id' => $userId]);
}

echo json_encode(['ok' => true]);

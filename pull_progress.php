<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Отдаёт сохранённый на сервере полный Progress-объект (user_progress).
// Вызывается один раз сразу после логина/регистрации — результат
// сливается с localStorage через Progress.mergeFromServer() на клиенте.

require_login_json();

$stmt = $pdo->prepare('SELECT progress_json, updated_at FROM user_progress WHERE user_id = :id');
$stmt->execute(['id' => current_user_id()]);
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

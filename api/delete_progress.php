<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Удаление серверной копии прогресса при "Сбросить весь прогресс".
// Без этого следующий логин слил бы (merge по максимуму) старый серверный
// прогресс обратно в обнулённый localStorage — сброс бы "не срабатывал".
// Паттерн терпимости к отсутствию логина — как в unpublish_stats.php:
// вызывается "на всякий случай", без аккаунта тихо ничего не делает.
$userId = current_user_id();
if ($userId) {
    $pdo->prepare('DELETE FROM user_progress WHERE user_id = :id')->execute(['id' => $userId]);
}

echo json_encode(['ok' => true]);

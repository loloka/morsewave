<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

// Тихо игнорируем, если не залогинен — вызывается "на всякий случай"
// при каждом начислении XP, независимо от того, есть аккаунт или нет.
$userId = current_user_id();
if (!$userId) {
    echo json_encode(['ok' => false, 'reason' => 'not_logged_in']);
    exit;
}

// Пока e-mail не подтверждён — в лидерборд не публикуем. Это не защита
// от читерства (прогресс всё равно настоящий), а просто барьер против
// моментального создания кучи аккаунтов ради дублей в таблице лидеров.
$check = $pdo->prepare('SELECT email_verified_at FROM users WHERE id = :id');
$check->execute(['id' => $userId]);
$row = $check->fetch();
if (!$row || !$row['email_verified_at']) {
    echo json_encode(['ok' => false, 'reason' => 'email_not_verified']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$xp = max(0, (int) ($input['xp'] ?? 0));
$streakCount = max(0, (int) ($input['streakCount'] ?? 0));
$streakLastDate = $input['streakLastDate'] ?? null;

if ($streakLastDate !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $streakLastDate)) {
    $streakLastDate = null;
}

$stmt = $pdo->prepare('
    INSERT INTO user_stats (user_id, xp, streak_count, streak_last_date)
    VALUES (:id, :xp, :streak, :date)
    ON DUPLICATE KEY UPDATE xp = :xp2, streak_count = :streak2, streak_last_date = :date2
');
$stmt->execute([
    'id' => $userId,
    'xp' => $xp, 'xp2' => $xp,
    'streak' => $streakCount, 'streak2' => $streakCount,
    'date' => $streakLastDate, 'date2' => $streakLastDate,
]);

echo json_encode(['ok' => true]);

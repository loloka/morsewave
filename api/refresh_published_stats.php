<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Отличие от sync_progress.php: этот эндпоинт НИКОГДА не создаёт новую
// запись в лидерборде (только UPDATE, без INSERT). Вызывается
// автоматически в фоне при каждом изменении прогресса — для тех, кто уже
// сам один раз нажал "Опубликовать". Кто ни разу не публиковался — этот
// вызов просто ничего не находит и тихо ничего не делает (0 строк
// обновлено), в лидерборд не попадает, пока не нажмёт кнопку сам.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$userId = current_user_id();
if (!$userId) {
    echo json_encode(['ok' => false, 'reason' => 'not_logged_in']);
    exit;
}

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
    UPDATE user_stats
    SET xp = :xp, streak_count = :streak, streak_last_date = :date
    WHERE user_id = :id
');
$stmt->execute([
    'xp' => $xp, 'streak' => $streakCount, 'date' => $streakLastDate, 'id' => $userId,
]);

echo json_encode(['ok' => true, 'updated' => $stmt->rowCount() > 0]);

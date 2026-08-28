<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$userId = current_user_id();
if (!$userId) {
    echo json_encode(['ok' => false, 'reason' => 'not_logged_in']);
    exit;
}
session_write_close();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$amount = isset($data['amount']) ? (int)$data['amount'] : 0;
$source = isset($data['source']) ? trim((string)$data['source']) : 'unknown';
$details = isset($data['details']) && is_array($data['details']) ? json_encode($data['details'], JSON_UNESCAPED_UNICODE) : null;

if ($amount <= 0 || empty($source)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid amount or source']);
    exit;
}

try {
    // Добавляем запись о начислении опыта
    $stmt = $pdo->prepare('
        INSERT INTO xp_log (user_id, amount, source, details, created_at) 
        VALUES (:user_id, :amount, :source, :details, NOW())
    ');
    $stmt->execute([
        'user_id' => $userId,
        'amount' => $amount,
        'source' => substr($source, 0, 50),
        'details' => $details
    ]);

    // Ленивая очистка старых логов для этого юзера (старше 30 дней)
    // Вероятность 1/10, чтобы не выполнять этот запрос каждый раз
    if (rand(1, 10) === 1) {
        $cleanup = $pdo->prepare('
            DELETE FROM xp_log 
            WHERE user_id = :user_id 
              AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ');
        $cleanup->execute(['user_id' => $userId]);
    }

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    // Игнорируем ошибку, если таблица еще не создана
    // (админ выполнит миграцию отдельно)
    if (strpos($e->getMessage(), 'Base table or view not found') !== false) {
        echo json_encode(['ok' => false, 'reason' => 'table_not_found']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
}

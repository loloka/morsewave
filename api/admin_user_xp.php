<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../config/database.php';

require_admin_json($pdo);

$userId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user ID']);
    exit;
}

try {
    // Получаем последние транзакции (лог)
    $logStmt = $pdo->prepare('
        SELECT amount, source, details, created_at
        FROM xp_log
        WHERE user_id = :id
        ORDER BY created_at DESC
        LIMIT 100
    ');
    $logStmt->execute(['id' => $userId]);
    $log = $logStmt->fetchAll(PDO::FETCH_ASSOC);

    // Получаем агрегированную статистику по режимам
    $distStmt = $pdo->prepare('
        SELECT source, SUM(amount) as total
        FROM xp_log
        WHERE user_id = :id
        GROUP BY source
        ORDER BY total DESC
    ');
    $distStmt->execute(['id' => $userId]);
    $distribution = $distStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'log' => $log,
        'distribution' => $distribution
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Base table or view not found') !== false) {
        // Если таблица еще не создана
        echo json_encode([
            'ok' => true,
            'log' => [],
            'distribution' => []
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
}

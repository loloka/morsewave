<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

require_admin_json($pdo);

try {
    $stmt = $pdo->query('
        SELECT u.id, u.name, u.email, u.email_verified_at, u.created_at, u.is_admin,
               s.xp, s.streak_count,
               EXISTS(
                   SELECT 1 FROM xp_log 
                   WHERE user_id = u.id 
                     AND amount >= 1500 
                     AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
               ) as recent_anomalies
        FROM users u
        LEFT JOIN user_stats s ON s.user_id = u.id
        ORDER BY u.created_at DESC
    ');
    $users = $stmt->fetchAll();
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Base table or view not found') !== false) {
        // Fallback если таблица xp_log еще не создана
        $stmt = $pdo->query('
            SELECT u.id, u.name, u.email, u.email_verified_at, u.created_at, u.is_admin,
                   s.xp, s.streak_count,
                   0 as recent_anomalies
            FROM users u
            LEFT JOIN user_stats s ON s.user_id = u.id
            ORDER BY u.created_at DESC
        ');
        $users = $stmt->fetchAll();
    } else {
        throw $e;
    }
}

echo json_encode(['users' => $users], JSON_UNESCAPED_UNICODE);

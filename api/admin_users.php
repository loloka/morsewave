<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

require_admin_json($pdo);

$stmt = $pdo->query('
    SELECT u.id, u.name, u.email, u.email_verified_at, u.created_at,
           s.xp, s.streak_count
    FROM users u
    LEFT JOIN user_stats s ON s.user_id = u.id
    ORDER BY u.created_at DESC
');

echo json_encode(['users' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);

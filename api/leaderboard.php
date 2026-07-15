<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';

$limit = isset($_GET['limit']) ? max(1, min((int) $_GET['limit'], 50)) : 10;

$byXp = $pdo->prepare('
    SELECT u.name, s.xp
    FROM user_stats s JOIN users u ON u.id = s.user_id
    ORDER BY s.xp DESC LIMIT :limit
');
$byXp->bindValue(':limit', $limit, PDO::PARAM_INT);
$byXp->execute();

$byStreak = $pdo->prepare('
    SELECT u.name, s.streak_count
    FROM user_stats s JOIN users u ON u.id = s.user_id
    WHERE s.streak_count > 0
    ORDER BY s.streak_count DESC LIMIT :limit
');
$byStreak->bindValue(':limit', $limit, PDO::PARAM_INT);
$byStreak->execute();

echo json_encode([
    'byXp' => $byXp->fetchAll(),
    'byStreak' => $byStreak->fetchAll(),
], JSON_UNESCAPED_UNICODE);

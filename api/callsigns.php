<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';

$count = isset($_GET['count']) ? (int) $_GET['count'] : 1;
$count = max(1, min($count, 50));

$stmt = $pdo->prepare('SELECT callsign, country FROM callsigns ORDER BY RAND() LIMIT :limit');
$stmt->bindValue(':limit', $count, PDO::PARAM_INT);
$stmt->execute();

echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);

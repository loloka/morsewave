<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';

$stmt = $pdo->query('SELECT code, title, description, icon, condition_type, condition_value FROM achievements ORDER BY sort_order ASC');
echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);

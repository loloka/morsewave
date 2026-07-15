<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

$user = current_user($pdo);
echo json_encode(['user' => $user]);

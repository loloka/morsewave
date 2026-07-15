<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

$_SESSION = [];
session_destroy();

echo json_encode(['ok' => true]);

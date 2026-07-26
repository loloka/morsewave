<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/captcha.php';

$morse = captcha_new();
// captcha_new() уже записал ответ в $_SESSION — дальше сессия не нужна,
// закрываем сразу, чтобы не держать блокировку (см. api/me.php).
session_write_close();
echo json_encode(['morse' => $morse]);

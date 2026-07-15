<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/captcha.php';

echo json_encode(['morse' => captcha_new()]);

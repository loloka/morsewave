<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/mailer.php';

require_login_json();

$user = current_user($pdo);
if ($user['email_verified_at']) {
    echo json_encode(['ok' => true, 'already_verified' => true]);
    exit;
}

$token = generate_verification_token($pdo, $user['id']);
$mailSent = send_verification_email($user['email'], $user['name'], $token);

echo json_encode(['ok' => true, 'mail_sent' => $mailSent]);

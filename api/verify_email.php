<?php
require __DIR__ . '/../includes/auth.php';

$token = $_GET['token'] ?? '';

$stmt = $pdo->prepare('SELECT id FROM users WHERE verification_token = :token LIMIT 1');
$stmt->execute(['token' => $token]);
$user = $stmt->fetch();

if ($user) {
    $pdo->prepare('UPDATE users SET email_verified_at = NOW(), verification_token = NULL WHERE id = :id')
        ->execute(['id' => $user['id']]);
    $status = 'ok';
} else {
    $status = 'invalid';
}

header('Location: ../account.php?verify=' . $status);
exit;

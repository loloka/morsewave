<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

$stmt = $pdo->prepare('
    SELECT id, name, email, password_hash, email_verified_at, failed_login_attempts, locked_until
    FROM users WHERE email = :email LIMIT 1
');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

// Одинаковое сообщение для "нет такого юзера" и "неверный пароль" —
// чтобы нельзя было перебором email узнать, какие аккаунты существуют.
$genericError = 'Неверный e-mail или пароль';

if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
    $minutesLeft = (int) ceil((strtotime($user['locked_until']) - time()) / 60);
    http_response_code(429);
    echo json_encode(['error' => "Слишком много неудачных попыток. Попробуй снова через {$minutesLeft} мин."]);
    exit;
}

if (!$user || !password_verify($password, $user['password_hash'])) {
    if ($user) {
        $attempts = $user['failed_login_attempts'] + 1;
        $lockedUntil = null;
        if ($attempts >= MAX_LOGIN_ATTEMPTS) {
            $lockedUntil = date('Y-m-d H:i:s', time() + LOCKOUT_MINUTES * 60);
            $attempts = 0; // после блокировки счётчик обнуляем
        }
        $pdo->prepare('UPDATE users SET failed_login_attempts = :a, locked_until = :l WHERE id = :id')
            ->execute(['a' => $attempts, 'l' => $lockedUntil, 'id' => $user['id']]);
    }
    http_response_code(401);
    echo json_encode(['error' => $genericError]);
    exit;
}

// Успешный вход — сбрасываем счётчик неудачных попыток
$pdo->prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id')
    ->execute(['id' => $user['id']]);

$_SESSION['user_id'] = (int) $user['id'];

echo json_encode(['ok' => true, 'user' => [
    'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'],
    'email_verified_at' => $user['email_verified_at'],
    'is_admin' => is_admin_user($user),
]]);

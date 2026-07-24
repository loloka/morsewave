<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Самостоятельное удаление СВОЕГО аккаунта пользователем. Требует текущий
// пароль — иначе любой, кто сел за оставленную открытой сессию (общий
// компьютер!), мог бы снести аккаунт. Неверный пароль идёт в тот же счётчик
// failed_login_attempts, что и логин/смена пароля — чтобы эндпоинт не стал
// обходным путём для перебора мимо блокировки.
//
// Удаление каскадное: FOREIGN KEY ... ON DELETE CASCADE на user_stats и
// user_progress сносит и публичный слепок для лидерборда, и приватную
// синхронизацию; verification_token/reset_token — колонки самой users.
// Локальный localStorage чистит клиент (account.js) после успеха.

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

require_login_json();
$userId = current_user_id();

$stmt = $pdo->prepare('
    SELECT id, password_hash, failed_login_attempts, locked_until
    FROM users WHERE id = :id
');
$stmt->execute(['id' => $userId]);
$user = $stmt->fetch();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Нужно войти в аккаунт']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$password = (string) ($input['password'] ?? '');

// Активная блокировка уважается и здесь.
if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
    $minutesLeft = (int) ceil((strtotime($user['locked_until']) - time()) / 60);
    http_response_code(429);
    echo json_encode(['error' => "Слишком много неудачных попыток. Попробуй снова через {$minutesLeft} мин."]);
    exit;
}

if (!password_verify($password, $user['password_hash'])) {
    $attempts = $user['failed_login_attempts'] + 1;
    $lockedUntil = null;
    if ($attempts >= MAX_LOGIN_ATTEMPTS) {
        $lockedUntil = date('Y-m-d H:i:s', time() + LOCKOUT_MINUTES * 60);
        $attempts = 0;
    }
    $pdo->prepare('UPDATE users SET failed_login_attempts = :a, locked_until = :l WHERE id = :id')
        ->execute(['a' => $attempts, 'l' => $lockedUntil, 'id' => $user['id']]);
    http_response_code(401);
    echo json_encode(['error' => 'Неверный пароль']);
    exit;
}

// Пароль верный — сносим аккаунт (каскад уберёт user_stats и user_progress).
$pdo->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $userId]);

// Убиваем серверную сессию целиком.
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $p['path'],
        'secure' => $p['secure'],
        'httponly' => $p['httponly'],
        'samesite' => $p['samesite'] ?? 'Lax',
    ]);
}
session_destroy();

echo json_encode(['ok' => true, 'message' => 'Аккаунт удалён']);

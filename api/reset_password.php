<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Установка нового пароля по одноразовому токену из письма
// (request_password_reset.php). Токен живёт 1 час и сгорает после
// использования. Заодно снимаем блокировку от подбора пароля — человек
// доказал владение почтой, старые неудачные попытки больше не о чём.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$token = trim($input['token'] ?? '');
$password = (string) ($input['password'] ?? '');
$passwordConfirm = (string) ($input['passwordConfirm'] ?? '');

if ($password !== $passwordConfirm) {
    http_response_code(422);
    echo json_encode(['error' => 'Пароли не совпадают']);
    exit;
}
if (mb_strlen($password) < 6) {
    http_response_code(422);
    echo json_encode(['error' => 'Пароль должен быть минимум 6 символов']);
    exit;
}
if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
    http_response_code(422);
    echo json_encode(['error' => 'Ссылка недействительна']);
    exit;
}

$stmt = $pdo->prepare('
    SELECT id FROM users
    WHERE reset_token = :token AND reset_token_expires > NOW()
    LIMIT 1
');
$stmt->execute(['token' => $token]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(410);
    echo json_encode(['error' => 'Ссылка недействительна или устарела (действует 1 час) — запроси сброс ещё раз']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo->prepare('
    UPDATE users
    SET password_hash = :hash,
        reset_token = NULL,
        reset_token_expires = NULL,
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = :id
')->execute(['hash' => $hash, 'id' => $user['id']]);

echo json_encode(['ok' => true, 'message' => 'Пароль изменён! Теперь можно войти с новым паролем.']);

<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/mailer.php';
require __DIR__ . '/../includes/captcha.php';
require_once __DIR__ . '/../includes/i18n.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');
$passwordConfirm = (string) ($input['passwordConfirm'] ?? '');
$captchaAnswer = $input['captcha'] ?? '';
$agree = !empty($input['agree']);

// Согласие с соглашением и политикой обязательно — фиксируем факт согласия
// и на сервере, а не только галочкой в браузере (её легко обойти).
if (!$agree) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.must_agree')]);
    exit;
}

if (!captcha_verify($captchaAnswer)) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.captcha_wrong'), 'code' => 'captcha']);
    exit;
}

if ($password !== $passwordConfirm) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.passwords_mismatch')]);
    exit;
}

if (mb_strlen($name) < 2 || mb_strlen($name) > 40) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.name_length')]);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.invalid_email')]);
    exit;
}
if (mb_strlen($password) < 6) {
    http_response_code(422);
    echo json_encode(['error' => t('api.register.password_length')]);
    exit;
}

$check = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$check->execute(['email' => $email]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => t('api.register.email_taken')]);
    exit;
}

// Первый аккаунт на пустой базе автоматически становится админом — иначе на
// свежей установке некому раздать права (флаг is_admin в БД, жёстко зашитого
// e-mail-админа больше нет).
$isFirstUser = ((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 0);

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, is_admin) VALUES (:name, :email, :hash, :admin)');
$stmt->execute(['name' => $name, 'email' => $email, 'hash' => $hash, 'admin' => $isFirstUser ? 1 : 0]);
$userId = (int) $pdo->lastInsertId();

$pdo->prepare('INSERT INTO user_stats (user_id, xp, streak_count) VALUES (:id, 0, 0)')
    ->execute(['id' => $userId]);

$token = generate_verification_token($pdo, $userId);
$mailSent = send_verification_email($email, $name, $token);

$_SESSION['user_id'] = $userId;

echo json_encode([
    'ok' => true,
    'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'email_verified_at' => null],
    'mail_sent' => $mailSent,
]);

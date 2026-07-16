<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/mailer.php';
require __DIR__ . '/../includes/captcha.php';

// Запрос восстановления пароля. Защита от злоупотреблений:
// 1) Капча (та же морзе-капча, что на регистрации) — от скриптов.
// 2) Троттлинг: не чаще одного письма в 5 минут на аккаунт — чтобы формой
//    нельзя было заспамить чужую почту.
// 3) Ответ ВСЕГДА одинаковый, есть такой e-mail или нет — иначе формой
//    можно было бы перебором выяснять, какие адреса зарегистрированы
//    (та же логика, что у "Неверный e-mail или пароль" на логине).
// 4) Токен одноразовый, живёт 1 час (проверяется в reset_password.php).

const RESET_THROTTLE_MINUTES = 5;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($input['email'] ?? ''));
$captchaAnswer = $input['captcha'] ?? '';

if (!captcha_verify($captchaAnswer)) {
    http_response_code(422);
    echo json_encode(['error' => 'Неверный ответ капчи — попробуй ещё раз', 'code' => 'captcha']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => 'Некорректный e-mail']);
    exit;
}

// Один и тот же нейтральный ответ для всех исходов ниже
$genericResponse = ['ok' => true, 'message' =>
    'Если такой e-mail зарегистрирован — письмо со ссылкой уже в пути. Проверь почту (и папку «Спам»).'];

$stmt = $pdo->prepare('SELECT id, name, email, last_reset_request_at FROM users WHERE email = :email LIMIT 1');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode($genericResponse); // не выдаём, что такого адреса нет
    exit;
}

if ($user['last_reset_request_at']
    && strtotime($user['last_reset_request_at']) > time() - RESET_THROTTLE_MINUTES * 60) {
    // Слишком часто — молча не шлём, но отвечаем так же, чтобы по ответу
    // нельзя было отличить троттлинг от «письмо отправлено».
    echo json_encode($genericResponse);
    exit;
}

$token = bin2hex(random_bytes(32));
$pdo->prepare('
    UPDATE users
    SET reset_token = :token,
        reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR),
        last_reset_request_at = NOW()
    WHERE id = :id
')->execute(['token' => $token, 'id' => $user['id']]);

send_password_reset_email($user['email'], $user['name'], $token);

echo json_encode($genericResponse);

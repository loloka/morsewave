<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/mailer.php';

// Настройки аккаунта: смена имени / пароля / e-mail. Один эндпоинт с
// параметром action — операции мелкие и родственные, плодить три файла
// не стали.
//
// Смена пароля и почты требуют ТЕКУЩИЙ пароль — иначе любой, кто сел за
// оставленную открытой сессию (общий компьютер!), мог бы тихо увести
// аккаунт, сменив почту. Неверный текущий пароль засчитывается в тот же
// счётчик failed_login_attempts, что и на логине — иначе этот эндпоинт
// стал бы обходным путём для подбора пароля мимо блокировки.

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
    SELECT id, name, email, password_hash, failed_login_attempts, locked_until
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
$action = $input['action'] ?? '';

/** Проверка текущего пароля с тем же лимитом попыток, что и на логине. */
function verify_current_password($pdo, $user, $password) {
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
        echo json_encode(['error' => 'Неверный текущий пароль']);
        exit;
    }
    $pdo->prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id')
        ->execute(['id' => $user['id']]);
}

switch ($action) {

    case 'name':
        $name = trim($input['name'] ?? '');
        if (mb_strlen($name) < 2 || mb_strlen($name) > 40) {
            http_response_code(422);
            echo json_encode(['error' => 'Имя должно быть от 2 до 40 символов']);
            exit;
        }
        $pdo->prepare('UPDATE users SET name = :name WHERE id = :id')
            ->execute(['name' => $name, 'id' => $userId]);
        echo json_encode(['ok' => true, 'name' => $name, 'message' => 'Имя изменено']);
        break;

    case 'password':
        verify_current_password($pdo, $user, (string) ($input['currentPassword'] ?? ''));
        $new = (string) ($input['newPassword'] ?? '');
        $confirm = (string) ($input['newPasswordConfirm'] ?? '');
        if ($new !== $confirm) {
            http_response_code(422);
            echo json_encode(['error' => 'Новые пароли не совпадают']);
            exit;
        }
        if (mb_strlen($new) < 6) {
            http_response_code(422);
            echo json_encode(['error' => 'Пароль должен быть минимум 6 символов']);
            exit;
        }
        $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')
            ->execute(['hash' => password_hash($new, PASSWORD_DEFAULT), 'id' => $userId]);
        echo json_encode(['ok' => true, 'message' => 'Пароль изменён']);
        break;

    case 'email':
        verify_current_password($pdo, $user, (string) ($input['currentPassword'] ?? ''));
        $newEmail = strtolower(trim($input['newEmail'] ?? ''));
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            http_response_code(422);
            echo json_encode(['error' => 'Некорректный e-mail']);
            exit;
        }
        if ($newEmail === strtolower($user['email'])) {
            http_response_code(422);
            echo json_encode(['error' => 'Это и так твой текущий e-mail']);
            exit;
        }
        $check = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
        $check->execute(['email' => $newEmail, 'id' => $userId]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Такой e-mail уже занят другим аккаунтом']);
            exit;
        }
        // Новая почта не подтверждена — до подтверждения публикация в
        // лидерборд снова недоступна (та же логика, что при регистрации).
        $pdo->prepare('UPDATE users SET email = :email, email_verified_at = NULL WHERE id = :id')
            ->execute(['email' => $newEmail, 'id' => $userId]);
        $token = generate_verification_token($pdo, $userId);
        $mailSent = send_verification_email($newEmail, $user['name'], $token);
        echo json_encode([
            'ok' => true,
            'email' => $newEmail,
            'mail_sent' => $mailSent,
            'message' => $mailSent
                ? 'E-mail изменён — проверь новую почту и подтверди её по ссылке из письма.'
                : 'E-mail изменён, но письмо отправить не получилось — используй кнопку «Отправить ещё раз».',
        ]);
        break;

    default:
        http_response_code(422);
        echo json_encode(['error' => 'Неизвестное действие']);
}

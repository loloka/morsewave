<?php
require_once __DIR__ . '/smtp_mailer.php';

/**
 * Отправка письма с подтверждением e-mail через SMTP (config/mail.php).
 * Если конфиг не заполнен (пароль-плейсхолдер) или отправка не удалась —
 * не роняем регистрацию, просто логируем ссылку в error_log, чтобы можно
 * было подтвердить аккаунт вручную при разработке/отладке.
 */

function base_url() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

function generate_verification_token($pdo, $userId) {
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('UPDATE users SET verification_token = :token WHERE id = :id')
        ->execute(['token' => $token, 'id' => $userId]);
    return $token;
}

function load_mail_config() {
    $path = __DIR__ . '/../config/mail.php';
    if (!file_exists($path)) return null;
    $config = require $path;
    if (empty($config['password']) || strpos($config['password'], 'ВПИШИ_ПАРОЛЬ') !== false) {
        return null; // конфиг ещё не заполнен реальным паролем
    }
    return $config;
}

function send_verification_email($email, $name, $token) {
    $link = base_url() . '/api/verify_email.php?token=' . urlencode($token);

    $subject = 'Подтверди e-mail — MorseWave';
    $body = "Привет, {$name}!\n\n"
        . "Подтверди свой e-mail для аккаунта MorseWave, перейдя по ссылке:\n"
        . "{$link}\n\n"
        . "Если ты не регистрировался на MorseWave — просто проигнорируй это письмо.\n\n"
        . "— MorseWave (morse.r9old.ru)";

    $config = load_mail_config();
    if (!$config) {
        error_log("MorseWave: config/mail.php не настроен. Ссылка для ручной проверки ({$email}): {$link}");
        return false;
    }

    $result = send_smtp_mail($config, $email, $subject, $body);
    if (!$result['success']) {
        error_log("MorseWave: не удалось отправить письмо на {$email}: {$result['error']}. Ссылка для ручной проверки: {$link}");
    }
    return $result['success'];
}

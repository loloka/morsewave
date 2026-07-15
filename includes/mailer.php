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

/**
 * HTML-версия письма в тёмной палитре сайта. Вёрстка — таблицами и
 * инлайн-стилями, как и положено для почтовых клиентов (никакого
 * flexbox/grid — Outlook и веб-почтовики их массово не понимают).
 */
function render_verification_email_html($name, $link) {
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Подтверди e-mail — MorseWave</title>
</head>
<body style="margin:0; padding:0; background-color:#0d0f11;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0f11; padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#16191c; border:1px solid #262b30; border-radius:14px; overflow:hidden;">

        <tr>
          <td style="padding:28px 32px 0 32px;">
            <div style="font-family:'JetBrains Mono',Consolas,monospace; font-size:13px; letter-spacing:0.05em; color:#e8a33d;">·−· −−−−· −−−</div>
            <div style="font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:20px; color:#eae6df; margin-top:4px;">
              R9O <span style="font-weight:500; font-size:11px; letter-spacing:0.08em; color:#8b9198; text-transform:uppercase;">MorseWave</span>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif; color:#eae6df;">
            <h1 style="font-size:20px; margin:0 0 12px 0; color:#eae6df;">Привет, {$safeName}!</h1>
            <p style="font-size:15px; line-height:1.6; color:#8b9198; margin:0 0 24px 0;">
              Подтверди e-mail, чтобы твой прогресс — опыт и серия дней —
              появился в таблице лидеров MorseWave.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px;" align="center">
            <a href="{$safeLink}" target="_blank" rel="noopener"
               style="display:inline-block; background-color:#e8a33d; color:#1a1200; font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:15px; text-decoration:none; padding:13px 28px; border-radius:8px;">
              Подтвердить e-mail
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              Если кнопка не работает, скопируй ссылку в браузер:<br>
              <a href="{$safeLink}" style="color:#4fd8c4; word-break:break-all;">{$safeLink}</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 32px; background-color:#0d0f11; border-top:1px solid #262b30; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              Если ты не регистрировался на MorseWave — просто проигнорируй это письмо.<br>
              — MorseWave · <a href="https://morse.r9old.ru" style="color:#8b9198;">morse.r9old.ru</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
}

function send_verification_email($email, $name, $token) {
    $link = base_url() . '/api/verify_email.php?token=' . urlencode($token);

    $subject = 'Подтверди e-mail — MorseWave';
    $textBody = "Привет, {$name}!\n\n"
        . "Подтверди свой e-mail для аккаунта MorseWave, перейдя по ссылке:\n"
        . "{$link}\n\n"
        . "Если ты не регистрировался на MorseWave — просто проигнорируй это письмо.\n\n"
        . "— MorseWave (morse.r9old.ru)";
    $htmlBody = render_verification_email_html($name, $link);

    $config = load_mail_config();
    if (!$config) {
        error_log("MorseWave: config/mail.php не настроен. Ссылка для ручной проверки ({$email}): {$link}");
        return false;
    }

    $result = send_smtp_mail($config, $email, $subject, $textBody, $htmlBody);
    if (!$result['success']) {
        error_log("MorseWave: не удалось отправить письмо на {$email}: {$result['error']}. Ссылка для ручной проверки: {$link}");
    }
    return $result['success'];
}

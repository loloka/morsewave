<?php
require_once __DIR__ . '/resend_mailer.php';
require_once __DIR__ . '/i18n.php';

/**
 * Отправка письма с подтверждением e-mail через Resend (config/mail.php).
 * Если конфиг не заполнен (ключ-плейсхолдер) или отправка не удалась —
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
    if (empty($config['resend_api_key']) || strpos($config['resend_api_key'], 'ВПИШИ_КЛЮЧ') !== false) {
        return null; // конфиг ещё не заполнен реальным ключом
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
    $lang = mw_current_lang();
    $greeting = htmlspecialchars(t('email.verify_greeting', ['{name}' => $name]), ENT_QUOTES, 'UTF-8');
    $pageTitle = htmlspecialchars(t('email.verify_page_title'), ENT_QUOTES, 'UTF-8');
    $intro = t('email.verify_intro');
    $button = t('email.verify_button');
    $linkFallback = t('email.link_fallback');
    $footer = t('email.verify_footer');

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$pageTitle}</title>
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
            <h1 style="font-size:20px; margin:0 0 12px 0; color:#eae6df;">{$greeting}</h1>
            <p style="font-size:15px; line-height:1.6; color:#8b9198; margin:0 0 24px 0;">
              {$intro}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px;" align="center">
            <a href="{$safeLink}" target="_blank" rel="noopener"
               style="display:inline-block; background-color:#e8a33d; color:#1a1200; font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:15px; text-decoration:none; padding:13px 28px; border-radius:8px;">
              {$button}
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              {$linkFallback}<br>
              <a href="{$safeLink}" style="color:#4fd8c4; word-break:break-all;">{$safeLink}</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 32px; background-color:#0d0f11; border-top:1px solid #262b30; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              {$footer}<br>
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


/**
 * Письмо восстановления пароля — та же тёмная вёрстка таблицами, что и у
 * письма подтверждения (никакого flexbox/grid — почтовые клиенты не поймут).
 */
function render_reset_email_html($name, $link) {
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $lang = mw_current_lang();
    $greeting = htmlspecialchars(t('email.verify_greeting', ['{name}' => $name]), ENT_QUOTES, 'UTF-8');
    $pageTitle = htmlspecialchars(t('email.reset_page_title'), ENT_QUOTES, 'UTF-8');
    $intro = t('email.reset_intro');
    $button = t('email.reset_button');
    $linkFallback = t('email.link_fallback');
    $footer = t('email.reset_footer');

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$pageTitle}</title>
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
            <h1 style="font-size:20px; margin:0 0 12px 0; color:#eae6df;">{$greeting}</h1>
            <p style="font-size:15px; line-height:1.6; color:#8b9198; margin:0 0 24px 0;">
              {$intro}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px;" align="center">
            <a href="{$safeLink}" target="_blank" rel="noopener"
               style="display:inline-block; background-color:#e8a33d; color:#1a1200; font-family:Arial,Helvetica,sans-serif; font-weight:700; font-size:15px; text-decoration:none; padding:13px 28px; border-radius:8px;">
              {$button}
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 28px 32px; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              {$linkFallback}<br>
              <a href="{$safeLink}" style="color:#4fd8c4; word-break:break-all;">{$safeLink}</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 32px; background-color:#0d0f11; border-top:1px solid #262b30; font-family:Arial,Helvetica,sans-serif;">
            <p style="font-size:12px; line-height:1.5; color:#565c62; margin:0;">
              {$footer}<br>
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

function send_password_reset_email($email, $name, $token) {
    $link = base_url() . '/account.php?reset_token=' . urlencode($token);

    $subject = t('email.reset_subject');
    $textBody = t('email.reset_text', ['{name}' => $name, '{link}' => $link]);
    $htmlBody = render_reset_email_html($name, $link);

    $config = load_mail_config();
    if (!$config) {
        error_log("MorseWave: config/mail.php не настроен. Ссылка сброса пароля ({$email}): {$link}");
        return false;
    }

    $result = send_via_resend($config, $email, $subject, $textBody, $htmlBody);
    if (!$result['success']) {
        error_log("MorseWave: не удалось отправить письмо сброса на {$email}: {$result['error']}. Ссылка: {$link}");
    }
    return $result['success'];
}

function send_verification_email($email, $name, $token) {
    $link = base_url() . '/api/verify_email.php?token=' . urlencode($token);

    $subject = t('email.verify_subject');
    $textBody = t('email.verify_text', ['{name}' => $name, '{link}' => $link]);
    $htmlBody = render_verification_email_html($name, $link);

    $config = load_mail_config();
    if (!$config) {
        error_log("MorseWave: config/mail.php не настроен. Ссылка для ручной проверки ({$email}): {$link}");
        return false;
    }

    $result = send_via_resend($config, $email, $subject, $textBody, $htmlBody);
    if (!$result['success']) {
        error_log("MorseWave: не удалось отправить письмо на {$email}: {$result['error']}. Ссылка для ручной проверки: {$link}");
    }
    return $result['success'];
}

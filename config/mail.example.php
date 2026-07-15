<?php
/**
 * Настройки исходящей почты через Resend (https://resend.com/api-keys).
 * Скопируй в config/mail.php и впиши реальный API-ключ.
 *
 * from_email по умолчанию — sandbox-адрес Resend, который работает сразу,
 * без верификации домена (удобно для старта/разработки). Чтобы письма
 * уходили от твоего домена (например noreply@r9old.ru) — верифицируй домен
 * в Resend (Domains → Add Domain, добавить пару их DNS-записей в
 * Cloudflare) и поменяй from_email здесь.
 */

return [
    'resend_api_key' => getenv('RESEND_API_KEY') ?: 'ВПИШИ_КЛЮЧ_RESEND',
    'from_email'      => getenv('MAIL_FROM_EMAIL') ?: 'onboarding@resend.dev',
    'from_name'       => 'MorseWave',
];

<?php
/**
 * Настройки исходящей почты через Resend (https://resend.com/api-keys).
 * Скопируй в config/mail.php и впиши реальный API-ключ.
 *
 * ⚠️ ВАЖНО про from_email по умолчанию (onboarding@resend.dev):
 * это sandbox-адрес, и Resend разрешает слать с него ТОЛЬКО на e-mail,
 * которым сам регистрировался в Resend. На любой другой адрес — 403 ошибка,
 * письмо не уйдёт вообще (проверено на практике: локально работало,
 * потому что тестировали на свою же почту, а на проде для чужого
 * пользователя молча отваливалось).
 *
 * Чтобы слать письма ЛЮБЫМ пользователям — обязательно верифицируй домен:
 * Resend → Domains → Add Domain → добавить их DNS-записи в Cloudflare
 * (тип DNS only, не Proxied) → дождаться верификации → поменять
 * from_email здесь на свой адрес (например noreply@r9old.ru).
 *
 * Проверить статус конкретного письма: https://resend.com/emails —
 * там видно delivered/bounced/restricted с точной причиной по каждому.
 */

return [
    'resend_api_key' => getenv('RESEND_API_KEY') ?: 'ВПИШИ_КЛЮЧ_RESEND',
    'from_email'      => getenv('MAIL_FROM_EMAIL') ?: 'onboarding@resend.dev',
    'from_name'       => 'MorseWave',
];

<?php
/**
 * Настройки исходящей почты для писем-подтверждений.
 * Скопируй в config/mail.php и впиши пароль от почтового ящика
 * (взять в панели хостинга — «Настройка почты»).
 */

return [
    'host'       => getenv('MAIL_HOST') ?: 'mail.r9old.ru',
    'port'       => (int) (getenv('MAIL_PORT') ?: 465), // SMTP SSL/TLS порт
    'username'   => getenv('MAIL_USERNAME') ?: 'noreply@r9old.ru',
    'password'   => getenv('MAIL_PASSWORD') ?: 'ВПИШИ_ПАРОЛЬ_ОТ_ЯЩИКА',
    'from_email' => getenv('MAIL_USERNAME') ?: 'noreply@r9old.ru',
    'from_name'  => 'MorseWave',
];

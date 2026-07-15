<?php
/**
 * ВРЕМЕННЫЙ диагностический скрипт. Открой в браузере:
 *   https://morse.r9old.ru/api/_debug_mail_test.php?to=твоя@почта.ru
 * Покажет: настроен ли config/mail.php, включён ли allow_url_fopen,
 * и результат реальной попытки отправки.
 *
 * УДАЛИ ЭТОТ ФАЙЛ после того, как разберёшься — он не должен
 * оставаться на проде (светит частично замаскированный ключ и вообще
 * не должен быть общедоступным дольше, чем нужно для диагностики).
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=== 1. allow_url_fopen ===\n";
$allowUrlFopen = ini_get('allow_url_fopen');
echo $allowUrlFopen ? "OK — включён\n" : "❌ ВЫКЛЮЧЕН — вот и причина! file_get_contents('https://...') не сможет достучаться до api.resend.com.\n";

echo "\n=== 2. config/mail.php ===\n";
$path = __DIR__ . '/../config/mail.php';
if (!file_exists($path)) {
    echo "❌ Файла config/mail.php нет вообще. Нужно: cp config/mail.example.php config/mail.php, затем вписать реальный ключ.\n";
} else {
    $config = require $path;
    $key = $config['resend_api_key'] ?? '';
    if (empty($key) || strpos($key, 'ВПИШИ_КЛЮЧ') !== false) {
        echo "❌ Файл есть, но ключ не вписан (placeholder). Отредактируй config/mail.php на сервере.\n";
    } else {
        $masked = substr($key, 0, 6) . str_repeat('*', max(strlen($key) - 10, 0)) . substr($key, -4);
        echo "OK — ключ похож на настоящий: {$masked}\n";
        echo "from_email: " . ($config['from_email'] ?? '(не задан)') . "\n";
    }
}

echo "\n=== 3. Реальная попытка отправки ===\n";
$to = $_GET['to'] ?? '';
if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    echo "Добавь ?to=твоя@почта.ru в адрес, чтобы проверить реальную отправку.\n";
} else {
    require __DIR__ . '/../includes/resend_mailer.php';
    require __DIR__ . '/../includes/mailer.php';
    $config = load_mail_config();
    if (!$config) {
        echo "Пропущено — конфиг не настроен (см. пункт 2 выше).\n";
    } else {
        $result = send_via_resend($config, $to, 'MorseWave — тест доставки', 'Тестовое письмо', '<p>Тестовое письмо</p>');
        if ($result['success']) {
            echo "✅ Resend принял письмо! Если всё равно не пришло — смотри Resend Dashboard → Logs, там видно статус по каждому письму (delivered/bounced/etc).\n";
        } else {
            echo "❌ Ошибка отправки:\n{$result['error']}\n";
        }
    }
}

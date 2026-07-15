<?php
/**
 * Отправка через Resend (https://resend.com) — HTTP API вместо SMTP.
 * Причина перехода: у нашего SMTP-хостинга (общий IP на shared-хостинге)
 * не настроен DKIM, а PTR-запись IP вообще не имеет отношения к домену —
 * Gmail тихо резал письма ещё до всякого спама. У Resend с этим уже всё
 * в порядке на их стороне.
 *
 * Без внешних библиотек — простой POST через file_get_contents() с
 * потоковым контекстом (нужен только allow_url_fopen, включён по
 * умолчанию почти everywhere, никаких доп. расширений/пересборки образа).
 */

/**
 * @param array $config resend_api_key, from_email, from_name
 * @return array ['success' => bool, 'error' => string|null]
 */
function send_via_resend(array $config, string $to, string $subject, string $text, string $html) {
    $payload = json_encode([
        'from'    => "{$config['from_name']} <{$config['from_email']}>",
        'to'      => [$to],
        'subject' => $subject,
        'html'    => $html,
        'text'    => $text,
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/json\r\n"
                             . "Authorization: Bearer {$config['resend_api_key']}\r\n",
            'content'       => $payload,
            'timeout'       => 15,
            'ignore_errors' => true, // чтобы прочитать тело ответа даже при 4xx/5xx
        ],
    ]);

    $response = @file_get_contents('https://api.resend.com/emails', false, $context);

    $status = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }

    if ($status >= 200 && $status < 300) {
        return ['success' => true, 'error' => null];
    }

    $errorDetail = $response ?: 'нет ответа от api.resend.com (проверь интернет-соединение контейнера/сервера)';
    return ['success' => false, 'error' => "Resend API вернул код {$status}: {$errorDetail}"];
}

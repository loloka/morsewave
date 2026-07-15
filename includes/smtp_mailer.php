<?php
/**
 * Минимальный SMTP-клиент без внешних библиотек (PHPMailer скачать не
 * получилось — сеть окружения, где собирался проект, режет GitHub-раздачу
 * файлов; да и городить целую библиотеку ради пары писем избыточно). Умеет
 * подключиться по SSL, залогиниться (AUTH LOGIN) и отправить письмо —
 * простое текстовое или multipart/alternative (HTML + текстовый fallback).
 */

function smtp_read_response($socket) {
    $data = '';
    while ($line = fgets($socket, 515)) {
        $data .= $line;
        // Последняя строка многострочного ответа имеет пробел на 4-й позиции
        // (например "250 OK"), а не дефис ("250-...")
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    $code = (int) substr($data, 0, 3);
    return [$code, $data];
}

function smtp_command($socket, $command, $expectedCode) {
    fwrite($socket, $command . "\r\n");
    [$code, $response] = smtp_read_response($socket);
    if ($code !== $expectedCode) {
        throw new Exception("SMTP: ожидался код {$expectedCode}, получено: " . trim($response));
    }
    return $response;
}

/**
 * @param array $config host, port, username, password, from_email, from_name
 * @param string|null $htmlBody Если передан — письмо уходит как
 *   multipart/alternative (HTML + текстовый вариант для клиентов без HTML)
 * @return array ['success' => bool, 'error' => string|null]
 */
function send_smtp_mail(array $config, string $to, string $subject, string $textBody, ?string $htmlBody = null) {
    $socket = null;
    $capturedWarning = null;
    // stream_socket_client с обёрткой ssl:// при ошибке TLS-рукопожатия часто
    // возвращает false с ПУСТЫМИ $errno/$errstr, а реальную причину кидает
    // через обычный PHP-warning — раньше он подавлялся через "@" и терялся.
    // Ловим его вручную, чтобы видеть, что происходит на самом деле.
    set_error_handler(function ($errno, $errstr) use (&$capturedWarning) {
        $capturedWarning = $errstr;
        return true;
    });

    try {
        $context = stream_context_create(['ssl' => [
            // Проверку сертификата отключаем: на бюджетном/shared-хостинге
            // (как здесь) почтовый сервер часто отдаёт сертификат, который
            // не проходит строгую проверку (самоподписанный, не совпадает
            // CN с mail.<домен>, неполная цепочка) — из-за этого соединение
            // рушится с пустой ошибкой ещё до AUTH. Для транзакционного
            // письма с одного и того же сервера на тот же сервер это
            // приемлемый компромисс; если хочешь строгую проверку — включи
            // обратно, когда сертификат на mail.r9old.ru будет валидным.
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ]]);

        $socket = stream_socket_client(
            "ssl://{$config['host']}:{$config['port']}",
            $errno, $errstr, 15,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!$socket) {
            $reason = $errstr ?: ($capturedWarning ?: 'неизвестная ошибка соединения');
            throw new Exception("Не удалось подключиться к {$config['host']}:{$config['port']} — {$reason}");
        }

        smtp_read_response($socket); // приветствие сервера (220)
        smtp_command($socket, "EHLO {$config['host']}", 250);
        smtp_command($socket, "AUTH LOGIN", 334);
        smtp_command($socket, base64_encode($config['username']), 334);
        smtp_command($socket, base64_encode($config['password']), 235);
        smtp_command($socket, "MAIL FROM:<{$config['from_email']}>", 250);
        smtp_command($socket, "RCPT TO:<{$to}>", 250);
        smtp_command($socket, "DATA", 354);

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromHeader = '=?UTF-8?B?' . base64_encode($config['from_name']) . '?=' . " <{$config['from_email']}>";

        $headers = "From: {$fromHeader}\r\n"
            . "To: <{$to}>\r\n"
            . "Subject: {$encodedSubject}\r\n"
            . "Date: " . date('r') . "\r\n"
            . "Message-ID: <" . bin2hex(random_bytes(16)) . "@{$config['host']}>\r\n"
            . "MIME-Version: 1.0\r\n";

        if ($htmlBody !== null) {
            $boundary = 'b_' . bin2hex(random_bytes(16));
            $textPart = preg_replace('/^\./m', '..', $textBody);
            $htmlPart = preg_replace('/^\./m', '..', $htmlBody);

            $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n\r\n";
            $composed = "--{$boundary}\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n"
                . $textPart . "\r\n\r\n"
                . "--{$boundary}\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n"
                . $htmlPart . "\r\n\r\n"
                . "--{$boundary}--";
        } else {
            $headers .= "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n";
            $composed = preg_replace('/^\./m', '..', $textBody);
        }

        $message = $headers . "\r\n" . $composed . "\r\n.";

        smtp_command($socket, $message, 250);
        fwrite($socket, "QUIT\r\n");
        fclose($socket);

        restore_error_handler();
        return ['success' => true, 'error' => null];
    } catch (Exception $e) {
        restore_error_handler();
        if (is_resource($socket)) fclose($socket);
        $error = $e->getMessage();
        if ($capturedWarning && strpos($error, $capturedWarning) === false) {
            $error .= " (доп. детали: {$capturedWarning})";
        }
        return ['success' => false, 'error' => $error];
    }
}

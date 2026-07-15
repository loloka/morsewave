<?php
/**
 * Минимальный SMTP-клиент без внешних библиотек (PHPMailer скачать не
 * получилось — сеть окружения, где собирался проект, режет GitHub-раздачу
 * файлов; да и городить целую библиотеку ради одного текстового письма
 * избыточно). Умеет ровно то, что нужно: подключиться по SSL, залогиниться
 * (AUTH LOGIN) и отправить одно простое текстовое письмо.
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
 * @return array ['success' => bool, 'error' => string|null]
 */
function send_smtp_mail(array $config, string $to, string $subject, string $body) {
    try {
        $context = stream_context_create(['ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ]]);

        $socket = @stream_socket_client(
            "ssl://{$config['host']}:{$config['port']}",
            $errno, $errstr, 15,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!$socket) {
            throw new Exception("Не удалось подключиться к {$config['host']}:{$config['port']} — {$errstr}");
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
        $bodyEscaped = preg_replace('/^\./m', '..', $body); // экранируем строки, начинающиеся с точки

        $message = "From: {$fromHeader}\r\n"
            . "To: <{$to}>\r\n"
            . "Subject: {$encodedSubject}\r\n"
            . "Date: " . date('r') . "\r\n"
            . "Message-ID: <" . bin2hex(random_bytes(16)) . "@{$config['host']}>\r\n"
            . "MIME-Version: 1.0\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: 8bit\r\n"
            . "\r\n"
            . $bodyEscaped . "\r\n.";

        smtp_command($socket, $message, 250);
        fwrite($socket, "QUIT\r\n");
        fclose($socket);

        return ['success' => true, 'error' => null];
    } catch (Exception $e) {
        if (isset($socket) && is_resource($socket)) fclose($socket);
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

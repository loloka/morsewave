<?php
/**
 * Подключение к MySQL.
 *
 * Приоритет: переменные окружения (задаются в docker-compose.yml для
 * Docker) → значения по умолчанию ниже (host=localhost, user=root, без
 * пароля — подходит для большинства локальных PHP+MySQL стендов).
 * На VPS так же можно задать переменные окружения вместо правки файла.
 */

$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DB_NAME') ?: 'morse_trainer';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Без этого зависший/перегруженный MySQL мог держать PHP-FPM
            // воркер (и файловую блокировку сессии — см. includes/auth.php)
            // минутами, пока не сработает таймаут уровня TCP/ОС. Один
            // подвисший запрос так съедал воркеры пула один за другим, пока
            // не переставал отвечать вообще весь сайт (504 на всех
            // страницах, даже не связанных с БД) — было реальным инцидентом.
            // 5 секунд — если MySQL не отвечает так долго, лучше быстрый
            // понятный отказ, чем зависание.
            PDO::ATTR_TIMEOUT             => 5,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['error' => 'Не удалось подключиться к базе данных']));
}

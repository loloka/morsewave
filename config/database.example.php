<?php
/**
 * Подключение к MySQL.
 * Для Laragon по умолчанию: host=localhost, user=root, пароль пустой.
 * На VPS поменяйте значения ниже (или вынесите в переменные окружения).
 */

$DB_HOST = 'localhost';
$DB_NAME = 'morse_trainer';
$DB_USER = 'root';
$DB_PASS = '';

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['error' => 'Не удалось подключиться к базе данных']));
}

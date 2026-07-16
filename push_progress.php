<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// Полная синхронизация прогресса: сохраняет ВЕСЬ Progress-объект из
// localStorage как JSON-блоб (user_progress). Это приватное личное
// хранилище — НЕ лидерборд (тот живёт в user_stats и по-прежнему
// пополняется только явной кнопкой "Опубликовать").
//
// Подтверждённая почта НЕ требуется — сознательно: верификация нужна
// лидерборду как барьер от дублей в публичной таблице, а здесь данные
// приватные, барьер не нужен.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

// Тихо игнорируем без логина — вызывается в фоне при каждом значимом
// изменении прогресса, независимо от того, есть аккаунт или нет
// (тот же паттерн, что refresh_published_stats.php).
$userId = current_user_id();
if (!$userId) {
    echo json_encode(['ok' => false, 'reason' => 'not_logged_in']);
    exit;
}

$raw = file_get_contents('php://input');

// Лимит размера — защита от заливки мусора. Реальный Progress-объект
// занимает единицы килобайт; 64 КБ — запас на годы вперёд.
if (strlen($raw) > 65536) {
    http_response_code(413);
    echo json_encode(['error' => 'Слишком большой объём данных']);
    exit;
}

$state = json_decode($raw, true);
if (!is_array($state)) {
    http_response_code(422);
    echo json_encode(['error' => 'Ожидается JSON-объект с прогрессом']);
    exit;
}

// Пересобираем JSON из распарсенного — гарантия, что в БД лежит валидный
// JSON, а не произвольная строка, прошедшая только проверку длины.
$json = json_encode($state, JSON_UNESCAPED_UNICODE);

$stmt = $pdo->prepare('
    INSERT INTO user_progress (user_id, progress_json)
    VALUES (:id, :json)
    ON DUPLICATE KEY UPDATE progress_json = :json2
');
$stmt->execute(['id' => $userId, 'json' => $json, 'json2' => $json]);

echo json_encode(['ok' => true]);

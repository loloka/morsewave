<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';

$allowedFields = ['total_sessions', 'total_groups', 'total_letters_events', 'total_callsigns'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT total_sessions, total_groups, total_letters_events, total_callsigns FROM global_stats WHERE id = 1');
    echo json_encode($stmt->fetch(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $field = $input['field'] ?? '';
    $amount = isset($input['amount']) ? max(1, min((int) $input['amount'], 100)) : 1;

    if (!in_array($field, $allowedFields, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Неизвестное поле статистики']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE global_stats SET {$field} = {$field} + :amount WHERE id = 1");
    $stmt->execute(['amount' => $amount]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не поддерживается']);

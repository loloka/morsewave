<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/i18n.php';

$allowedFields = ['total_sessions', 'total_groups', 'total_letters_events', 'total_callsigns'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT total_sessions, total_groups, total_letters_events, total_callsigns FROM global_stats WHERE id = 1');
    echo json_encode($stmt->fetch(), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // Пакетное обновление (снижает число запросов и соединений с БД в разы):
    // e.g. { "stats": { "total_groups": 15, "total_sessions": 1 } }
    if (isset($input['stats']) && is_array($input['stats'])) {
        $sets = [];
        $params = [];
        foreach ($input['stats'] as $f => $amt) {
            if (in_array($f, $allowedFields, true)) {
                $val = max(1, min((int) $amt, 1000));
                $paramKey = 'amt_' . $f;
                $sets[] = "{$f} = {$f} + :{$paramKey}";
                $params[$paramKey] = $val;
            }
        }
        if (!empty($sets)) {
            $stmt = $pdo->prepare('UPDATE global_stats SET ' . implode(', ', $sets) . ' WHERE id = 1');
            $stmt->execute($params);
        }
        echo json_encode(['ok' => true]);
        exit;
    }

    // Одиночное обновление (обратная совместимость)
    $field = $input['field'] ?? '';
    $amount = isset($input['amount']) ? max(1, min((int) $input['amount'], 1000)) : 1;

    if (!in_array($field, $allowedFields, true)) {
        http_response_code(400);
        echo json_encode(['error' => t('api.stats.unknown_field')]);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE global_stats SET {$field} = {$field} + :amount WHERE id = 1");
    $stmt->execute(['amount' => $amount]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => t('api.method_not_allowed')]);

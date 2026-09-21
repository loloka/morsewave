<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Получение списка одобренных благодарностей для Стены славы
    $limit = isset($_GET['limit']) ? max(1, min((int) $_GET['limit'], 100)) : 50;
    $donations = get_approved_donations($pdo, $limit);

    // Маскируем имя если анонимно
    foreach ($donations as &$d) {
        if (!empty($d['is_anonymous'])) {
            $d['callsign'] = t('donate.wall_anonymous');
            $d['user_name'] = null;
        }
        $d['id'] = (int) $d['id'];
        $d['amount'] = (int) $d['amount'];
        $d['is_sponsor'] = !empty($d['is_sponsor']);
    }
    unset($d);

    echo json_encode(['donations' => $donations], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $userId = current_user_id();

    $callsign = trim($input['callsign'] ?? '');
    $amount = max(0, (int) ($input['amount'] ?? 0));
    $tierTitle = trim($input['tier_title'] ?? '');
    $message = trim($input['message'] ?? '');
    $isAnonymous = !empty($input['is_anonymous']);

    // Если залогинен и позывной пустой — берём имя пользователя
    if ($userId && $callsign === '') {
        $u = current_user($pdo);
        if ($u) $callsign = $u['name'];
    }

    if ($callsign === '') {
        $callsign = $isAnonymous ? t('donate.wall_anonymous') : 'SWL / Радиолюбитель';
    }

    $donationId = create_donation($pdo, $userId, $callsign, $amount, $tierTitle, $message, $isAnonymous);

    echo json_encode([
        'ok'                   => true,
        'donation_id'          => $donationId,
        'achievement_code'     => 'project_supporter',
        'message'              => t('donate.submit_success'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => t('api.method_not_allowed')]);

<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

require_admin_json($pdo);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $donations = get_admin_donations($pdo);
    foreach ($donations as &$d) {
        $d['id'] = (int) $d['id'];
        $d['user_id'] = $d['user_id'] ? (int) $d['user_id'] : null;
        $d['amount'] = (int) $d['amount'];
        $d['is_anonymous'] = (bool) $d['is_anonymous'];
        $d['is_sponsor'] = !empty($d['is_sponsor']);
    }
    unset($d);

    echo json_encode(['donations' => $donations], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';
    $id = (int) ($input['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid donation ID']);
        exit;
    }

    if ($action === 'set_status') {
        $status = $input['status'] ?? '';
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            http_response_code(422);
            echo json_encode(['error' => 'Invalid status']);
            exit;
        }
        update_donation_status($pdo, $id, $status);
        echo json_encode(['ok' => true, 'id' => $id, 'status' => $status]);
        exit;
    }

    if ($action === 'make_sponsor') {
        // Находим user_id по записи доната
        $stmt = $pdo->prepare("SELECT user_id FROM donations WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row || empty($row['user_id'])) {
            http_response_code(422);
            echo json_encode(['error' => t('admin.donations.no_linked_user')]);
            exit;
        }
        $userId = (int) $row['user_id'];
        $makeSponsor = !empty($input['is_sponsor']);
        set_user_sponsor($pdo, $userId, $makeSponsor);
        if ($makeSponsor) {
            grant_supporter_progress($pdo, $userId);
        }

        echo json_encode([
            'ok'         => true,
            'id'         => $id,
            'user_id'    => $userId,
            'is_sponsor' => $makeSponsor,
        ]);
        exit;
    }

    if ($action === 'delete') {
        delete_donation($pdo, $id);
        echo json_encode(['ok' => true, 'id' => $id]);
        exit;
    }

    http_response_code(422);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => t('api.method_not_allowed')]);

<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

require_admin_json($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

$threads = get_admin_support_threads($pdo);
foreach ($threads as &$th) {
    $th['user_id'] = (int) $th['user_id'];
    $th['unread_count'] = (int) $th['unread_count'];
    $th['is_sponsor'] = !empty($th['is_sponsor']);
}
unset($th);

echo json_encode(['threads' => $threads], JSON_UNESCAPED_UNICODE);

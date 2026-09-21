<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

require_login_json();
$user = current_user($pdo);

if (!$user || !is_sponsor_user($user)) {
    http_response_code(403);
    echo json_encode(['error' => 'Доступно только спонсорам проекта']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$badgeRaw = trim($input['badge'] ?? '');

$slug = sponsor_badge_slug($badgeRaw);
$icon = sponsor_badge_icon($slug);

try {
    $updated = update_user_sponsor_badge($pdo, (int) $user['id'], $slug);
    if (!$updated) {
        http_response_code(500);
        echo json_encode(['error' => 'Не удалось обновить значок в базе данных']);
        exit;
    }

    echo json_encode([
        'ok'    => true,
        'slug'  => $slug,
        'badge' => $slug,
        'icon'  => $icon,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}

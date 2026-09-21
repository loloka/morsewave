<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';

require_login_json();

$currentUserId = current_user_id();
$currentUser = current_user($pdo);
$isAdmin = is_admin_user($currentUser);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Если админ запрашивает переписку конкретного пользователя
    if ($isAdmin && isset($_GET['user_id'])) {
        $targetUserId = (int) $_GET['user_id'];
        $messages = get_user_support_messages($pdo, $targetUserId);
        mark_messages_read($pdo, $targetUserId, 'admin');

        // Информация о пользователе
        $uStmt = $pdo->prepare("SELECT id, name, email, is_sponsor FROM users WHERE id = :id");
        $uStmt->execute(['id' => $targetUserId]);
        $targetUser = $uStmt->fetch();

        echo json_encode([
            'user'     => $targetUser,
            'messages' => $messages,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Обычный пользователь (или админ для своего личного чата)
    $messages = get_user_support_messages($pdo, $currentUserId);
    mark_messages_read($pdo, $currentUserId, 'user');

    echo json_encode([
        'messages'   => $messages,
        'is_sponsor' => is_sponsor_user($currentUser),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $message = trim($input['message'] ?? '');

    if ($message === '') {
        http_response_code(422);
        echo json_encode(['error' => t('chat.empty_message')]);
        exit;
    }

    if ($isAdmin && !empty($input['user_id'])) {
        // Админ пишет в тред конкретного пользователя
        $targetUserId = (int) $input['user_id'];
        $msgId = send_support_message($pdo, $targetUserId, 'admin', $message);
        echo json_encode(['ok' => true, 'id' => $msgId, 'sender_type' => 'admin']);
        exit;
    }

    // Пользователь пишет админу
    $msgId = send_support_message($pdo, $currentUserId, 'user', $message);
    echo json_encode(['ok' => true, 'id' => $msgId, 'sender_type' => 'user']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => t('api.method_not_allowed')]);

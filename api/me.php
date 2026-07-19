<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

$user = current_user($pdo);
if ($user) {
    // Флаг для клиента: показать кнопку «Админка» без перезагрузки страницы.
    $user['is_admin'] = is_admin_user($user);
}
echo json_encode(['user' => $user]);

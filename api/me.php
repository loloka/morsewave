<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

$user = current_user($pdo);
if ($user) {
    // Флаг для клиента: показать кнопку «Админка» без перезагрузки страницы.
    $user['is_admin'] = is_admin_user($user);
}
// Больше в $_SESSION не пишем — освобождаем файловую блокировку сессии
// сразу после чтения. Иначе этот и любой параллельный запрос с тем же
// cookie (achievements.php, captcha.php и т.д. грузятся одновременно на
// account.php) сериализуются и ждут друг друга; если один из них разово
// подвиснет на медленном запросе к БД — вся очередь виснет вместе с ним
// (см. CHANGELOG про 504 на всём сайте).
session_write_close();
echo json_encode(['user' => $user]);

<?php
/**
 * Простая авторизация на PHP-сессиях. Никаких фреймворков — только
 * session_start() + password_hash()/password_verify(). Основной прогресс
 * пользователя по-прежнему в localStorage; аккаунт нужен только для
 * витрины лидеров и (в перспективе) синхронизации между устройствами.
 */

if (session_status() === PHP_SESSION_NONE) {
    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,   // кука уходит только по HTTPS, если сайт на HTTPS
        'httponly' => true,     // недоступна из JS — базовая защита от XSS-кражи сессии
        'samesite' => 'Lax',    // базовая защита от CSRF
    ]);
    session_start();
}

require_once __DIR__ . '/../config/database.php';

function current_user_id() {
    return $_SESSION['user_id'] ?? null;
}

function current_user($pdo) {
    $id = current_user_id();
    if (!$id) return null;
    $stmt = $pdo->prepare('SELECT id, name, email, email_verified_at, created_at FROM users WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_login_json() {
    if (!current_user_id()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Нужно войти в аккаунт']);
        exit;
    }
}

// Единственный админ определён по e-mail — для одного человека этого
// достаточно, не городить отдельную роль/таблицу ради одного аккаунта.
const ADMIN_EMAIL = 'admin@r9o.ru';

function is_admin_user($user) {
    return $user && strtolower($user['email']) === ADMIN_EMAIL;
}

function require_admin_json($pdo) {
    $user = current_user($pdo);
    if (!is_admin_user($user)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Доступ только для администратора']);
        exit;
    }
    return $user;
}

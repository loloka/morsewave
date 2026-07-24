<?php
/**
 * Простая авторизация на PHP-сессиях. Никаких фреймворков — только
 * session_start() + password_hash()/password_verify(). Основной прогресс
 * пользователя по-прежнему в localStorage; аккаунт нужен только для
 * витрины лидеров и (в перспективе) синхронизации между устройствами.
 */

if (session_status() === PHP_SESSION_NONE) {
    // 30 дней — и для куки, и для срока жизни серверного файла сессии.
    $sessionLifetime = 60 * 60 * 24 * 30;
    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    // Раньше кука была lifetime => 0 (жила до закрытия браузера), а серверные
    // файлы сессий чистил сборщик мусора PHP по gc_maxlifetime. На хостинге
    // он часто короткий и ОБЩИЙ с чужими сайтами (сессии лежат в одном
    // системном каталоге), поэтому активного пользователя выкидывало «через
    // несколько часов», хотя localStorage-прогресс оставался — и на том же
    // браузере легко было залогиниться в другой аккаунт и подмержить чужой
    // прогресс. Лечим двумя вещами: (1) своя папка сессий, чтобы чужой GC до
    // них не дотягивался, (2) длинная кука + длинный gc_maxlifetime.
    $sessionDir = __DIR__ . '/../storage/sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0700, true);
    }
    if (is_dir($sessionDir) && is_writable($sessionDir)) {
        ini_set('session.save_path', $sessionDir);
    }
    // Держим протухание нашими руками (в своей папке это безопасно). Даже если
    // папку создать не удалось — просим систему хранить сессии дольше.
    ini_set('session.gc_maxlifetime', (string) $sessionLifetime);

    session_set_cookie_params([
        'lifetime' => $sessionLifetime, // кука живёт 30 дней, а не до закрытия браузера
        'path' => '/',
        'secure' => $isHttps,   // кука уходит только по HTTPS, если сайт на HTTPS
        'httponly' => true,     // недоступна из JS — базовая защита от XSS-кражи сессии
        'samesite' => 'Lax',    // базовая защита от CSRF
    ]);
    session_start();

    // «Скользящее» продление: у залогиненного пользователя на каждом заходе
    // сдвигаем срок куки вперёд, чтобы активный человек не разлогинивался
    // ровно через 30 дней от момента входа, а только после 30 дней БЕЗ визитов.
    if (!empty($_SESSION['user_id'])) {
        setcookie(session_name(), session_id(), [
            'expires' => time() + $sessionLifetime,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}

require_once __DIR__ . '/../config/database.php';

function current_user_id() {
    return $_SESSION['user_id'] ?? null;
}

function current_user($pdo) {
    $id = current_user_id();
    if (!$id) return null;
    $stmt = $pdo->prepare('SELECT id, name, email, email_verified_at, created_at, is_admin FROM users WHERE id = :id');
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

// Админ определяется флагом is_admin в таблице users (раньше был жёстко
// зашит e-mail — но так нельзя было передать права другому аккаунту и снять
// со старого). Права выдаются/снимаются из админки (api/admin_set_admin.php),
// а на пустой базе первый зарегистрированный аккаунт становится админом
// автоматически (api/register.php) — чтобы было кому раздать права.
function is_admin_user($user) {
    return $user && !empty($user['is_admin']);
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

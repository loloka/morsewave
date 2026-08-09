<?php
/**
 * Внешний "рубильник" техобслуживания — НЕ трогает БД и НЕ требует логина
 * через users/сессии (сознательно ничего не подключает из auth.php),
 * поэтому работает даже когда MySQL лежит целиком или заблокирован
 * (см. includes/maintenance.php, CHANGELOG v2.74/v2.75 — ради этого и
 * затевался: страница профиля для переключения не годится, она сама
 * зависит от БД).
 *
 * Единственная защита — длинный секретный токен в query/POST, сравнение
 * timing-safe (hash_equals), как обычный пароль. Неверный/отсутствующий
 * токен — просто 404, без подсказок (не подтверждаем даже существование
 * страницы).
 *
 * Настройка: скопируй config/maintenance_secret.example.php →
 * config/maintenance_secret.php, впиши свой случайный токен.
 * Ссылка на панель по сути пароль — храни в менеджере паролей:
 *   https://morse.r9old.ru/maintenance-switch.php?token=...
 */

$secretFile = __DIR__ . '/config/maintenance_secret.php';
if (!is_file($secretFile)) {
    http_response_code(404);
    exit;
}
require $secretFile; // определяет MW_MAINTENANCE_TOKEN

$token = $_POST['token'] ?? $_GET['token'] ?? '';
if (!is_string($token) || $token === '' || !hash_equals(MW_MAINTENANCE_TOKEN, $token)) {
    http_response_code(404);
    exit;
}

$flagFile = __DIR__ . '/storage/maintenance.flag';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'on') {
        file_put_contents($flagFile, trim($_POST['note'] ?? ''));
    } elseif ($action === 'off') {
        @unlink($flagFile);
    }
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?') . '?token=' . urlencode($token));
    exit;
}

$active = is_file($flagFile);
$note = $active ? trim(@file_get_contents($flagFile) ?: '') : '';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Техобслуживание — рубильник</title>
<style>
    body{background:#0e1420;color:#e8ecf4;font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:60px auto;padding:0 20px}
    h1{font-size:20px}
    .status{padding:12px 16px;border-radius:8px;margin-bottom:20px;font-weight:600}
    .status.on{background:#3a1f1f;color:#ff8080}
    .status.off{background:#1f3a26;color:#7fdb9a}
    textarea{width:100%;box-sizing:border-box;background:#161d2b;color:#e8ecf4;border:1px solid #2a3345;border-radius:8px;padding:10px;font-family:inherit;margin-bottom:12px;resize:vertical}
    button{padding:10px 20px;border-radius:8px;border:none;font-weight:600;cursor:pointer;font-size:14px}
    .btn-on{background:#c0392b;color:#fff}
    .btn-off{background:#27ae60;color:#fff}
</style>
</head>
<body>
    <h1>Техобслуживание MorseWave</h1>
    <div class="status <?= $active ? 'on' : 'off' ?>">
        Сейчас: <?= $active ? 'ВКЛЮЧЕНО' : 'выключено' ?><?= $note !== '' ? ' — ' . htmlspecialchars($note) : '' ?>
    </div>

    <?php if (!$active): ?>
        <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
            <input type="hidden" name="action" value="on">
            <textarea name="note" rows="2" placeholder="Причина (необязательно, покажется на заглушке)"></textarea>
            <button type="submit" class="btn-on">Включить заглушку</button>
        </form>
    <?php else: ?>
        <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">
            <input type="hidden" name="action" value="off">
            <button type="submit" class="btn-off">Выключить заглушку</button>
        </form>
    <?php endif; ?>
</body>
</html>

<?php
/**
 * Технобслуживание: включатель — сам факт существования файла
 * storage/maintenance.flag. Нет файла — сайт работает как обычно.
 *
 * Включить:  создать storage/maintenance.flag (можно пустым; если внутри
 *            есть текст — он допечатается на заглушке отдельной строкой,
 *            выводится как есть, без t() — для быстрой личной пометки
 *            вроде "ETA 30 мин", без правки кода/lang-файлов).
 * Выключить: удалить (или переименовать) storage/maintenance.flag.
 * Делается через FTP/файловый менеджер хостинга — без доступа к консоли
 * и без деплоя.
 *
 * mw_maintenance_guard() — единая точка входа, дергается из ДВУХ мест:
 *   1. includes/header.php (самым первым делом) — для страниц, которые до
 *      header.php к БД вообще не обращаются (learn.php, koch.php, ...).
 *   2. config/database.php (до new PDO(...)) — для api/*.php и для тех
 *      страниц (account.php, admin.php), что сами тянут $pdo ДО
 *      header.php. Важно именно здесь: в реальной ситуации, когда БД и
 *      так недоступна/заблокирована (см. CHANGELOG v2.73, инцидент
 *      2026-08-09), не пытаемся коннектиться вообще — лишняя попытка
 *      только усугубляет счётчик ошибок подключения на стороне MySQL.
 * Различает HTML/JSON по SCRIPT_NAME (есть ли в пути /api/) — так одна
 * функция корректно обслуживает оба контекста без явного параметра.
 */

require_once __DIR__ . '/i18n.php'; // t()/mw_current_lang() — сам БД не трогает, грузить безопасно в любой момент

define('MW_MAINTENANCE_FLAG', __DIR__ . '/../storage/maintenance.flag');

function mw_maintenance_active() {
    return is_file(MW_MAINTENANCE_FLAG);
}

function mw_maintenance_guard() {
    if (!mw_maintenance_active()) return;

    http_response_code(503);
    header('Retry-After: 300'); // просто разумная подсказка ботам/поисковикам, не жёсткая гарантия

    $isApi = strpos($_SERVER['SCRIPT_NAME'] ?? '', '/api/') !== false;

    if ($isApi) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'maintenance', 'maintenance' => true]);
        exit;
    }

    $note = trim(@file_get_contents(MW_MAINTENANCE_FLAG) ?: '');
    ?><!DOCTYPE html>
<html lang="<?= htmlspecialchars(mw_current_lang()) ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars(t('maintenance.title')) ?></title>
<style>
    body{background:#0e1420;color:#e8ecf4;font-family:system-ui,-apple-system,sans-serif;
         display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
    .box{max-width:420px;text-align:center}
    h1{font-size:22px;margin:0 0 12px;font-weight:700}
    p{color:#9aa5b8;line-height:1.5;margin:0 0 8px}
    .note{color:#e8ecf4;font-family:var(--font-mono, monospace);font-size:13px;margin-top:16px}
</style>
</head>
<body>
<div class="box">
    <h1>🛠️ <?= htmlspecialchars(t('maintenance.title')) ?></h1>
    <p><?= htmlspecialchars(t('maintenance.body')) ?></p>
    <?php if ($note !== ''): ?><p class="note"><?= htmlspecialchars($note) ?></p><?php endif; ?>
</div>
</body>
</html>
<?php
    exit;
}

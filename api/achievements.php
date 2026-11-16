<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/i18n.php';
require_once __DIR__ . '/../includes/donation_service.php';
ensure_donation_tables($pdo);

try {
    $pdo->exec("ALTER TABLE achievements MODIFY COLUMN condition_type VARCHAR(64) NOT NULL");
    $pdo->exec("
        INSERT IGNORE INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order) VALUES
        ('contest_first_qso', 'Первое QSO', 'Проведите первую радиосвязь в контест-тренажёре', '📻', 'contest_qsos', 1, 33),
        ('contest_marathon', 'Контест-марафон', 'Проведите суммарно 60 минут в активном эфире контест-тренажёра (+500 XP, повторяемая)', '⏱️', 'contest_time_seconds', 3600, 34)
        ON DUPLICATE KEY UPDATE description = VALUES(description);
    ");
} catch (Throwable $e) {}

$stmt = $pdo->query('SELECT code, title, description, icon, condition_type, condition_value FROM achievements ORDER BY sort_order ASC');
$rows = $stmt->fetchAll();

// Тексты достижений живут в БД на русском (см. database/schema.sql) —
// это единственный источник истины по данным. Для остальных языков
// накладываем перевод по коду достижения из lang/*.php, если он есть;
// если перевода для конкретного кода ещё не завели — молча остаётся
// оригинал из БД, а не ошибка.
foreach ($rows as &$row) {
    $titleKey = 'ach_def.' . $row['code'] . '.title';
    $descKey = 'ach_def.' . $row['code'] . '.desc';
    $translatedTitle = t($titleKey);
    $translatedDesc = t($descKey);
    if ($translatedTitle !== $titleKey) $row['title'] = $translatedTitle;
    if ($translatedDesc !== $descKey) $row['description'] = $translatedDesc;
}
unset($row);

echo json_encode($rows, JSON_UNESCAPED_UNICODE);

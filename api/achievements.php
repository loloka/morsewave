<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/i18n.php';

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

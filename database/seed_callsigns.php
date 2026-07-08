<?php
/**
 * Разовый скрипт: генерирует реалистичные по формату российские позывные
 * радиолюбителей и добавляет их в таблицу callsigns.
 *
 * Запуск: открой в браузере database/seed_callsigns.php?count=200
 * (или из консоли: php seed_callsigns.php 200).
 * После использования файл можно удалить — на сами данные это не влияет.
 */

require __DIR__ . '/../config/database.php';

$count = 200;
if (php_sapi_name() === 'cli') {
    $count = isset($argv[1]) ? (int) $argv[1] : $count;
} else {
    header('Content-Type: text/plain; charset=utf-8');
    $count = isset($_GET['count']) ? (int) $_GET['count'] : $count;
}
$count = max(1, min($count, 1000));

$letters = range('A', 'Z');
function randLetters($pool, $n) {
    $s = '';
    for ($i = 0; $i < $n; $i++) $s .= $pool[array_rand($pool)];
    return $s;
}
function randDigit() {
    return (string) mt_rand(0, 9);
}

// Типичные форматы российских позывных радиолюбителей.
// Обычная функция с switch — без стрелочных функций (fn), чтобы скрипт
// работал даже на старых версиях PHP CLI (некоторые хостинги используют
// для консоли более старый PHP, чем для самого сайта).
function generateCallsign($letters, $twoLetterPrefixes, $uPrefixLetters) {
    $variant = mt_rand(1, 3);
    if ($variant === 1) {
        // R + цифра + 2-3 буквы, напр. R1ABC, R7AB
        return 'R' . randDigit() . randLetters($letters, mt_rand(2, 3));
    }
    if ($variant === 2) {
        // Двухбуквенные RA.. RZ + цифра + 2-3 буквы, напр. RA3XYZ, RN6AB
        return 'R' . $twoLetterPrefixes[array_rand($twoLetterPrefixes)]
            . randDigit() . randLetters($letters, mt_rand(2, 3));
    }
    // UA.. UI + цифра + 2-3 буквы, напр. UA9XYZ, UI8AB
    return 'U' . $uPrefixLetters[array_rand($uPrefixLetters)]
        . randDigit() . randLetters($letters, mt_rand(2, 3));
}

$twoLetterPrefixes = array('A','B','C','D','E','F','G','J','K','L','M','N','O','P','Q','T','U','V','W','X','Y','Z');
$uPrefixLetters = array('A','B','C','D','F','G','I');

$inserted = 0;
$stmt = $pdo->prepare('INSERT IGNORE INTO callsigns (callsign, country) VALUES (:callsign, :country)');
$seen = array();

for ($i = 0; $i < $count; $i++) {
    $callsign = generateCallsign($letters, $twoLetterPrefixes, $uPrefixLetters);
    if ($callsign === '' || isset($seen[$callsign])) {
        $i--; // пробуем ещё раз, не тратя итерацию впустую
        if (count($seen) > 5000) break; // защита от бесконечного цикла
        continue;
    }
    $seen[$callsign] = true;
    $stmt->execute(array('callsign' => $callsign, 'country' => 'Россия'));
    $inserted += $stmt->rowCount();
}

echo "Готово. Уникальных сгенерировано: " . count($seen) . ", реально добавлено новых строк: {$inserted}." . PHP_EOL;
echo "Можно запускать повторно с другим ?count= — дубликаты не добавятся." . PHP_EOL;

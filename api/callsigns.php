<?php
header('Content-Type: application/json; charset=utf-8');
$SUPPRESS_DB_DIE = true;
require __DIR__ . '/../config/database.php';

$count = isset($_GET['count']) ? (int) $_GET['count'] : 1;
$count = max(1, min($count, 50));

$fallbackCallsigns = [
    ['callsign' => 'R1ABC', 'country' => 'Россия'],
    ['callsign' => 'UA3XYZ', 'country' => 'Россия'],
    ['callsign' => 'RA9F', 'country' => 'Россия'],
    ['callsign' => 'RZ6D', 'country' => 'Россия'],
    ['callsign' => 'RK4W', 'country' => 'Россия'],
    ['callsign' => 'R7ABC', 'country' => 'Россия'],
    ['callsign' => 'R2XY', 'country' => 'Россия'],
    ['callsign' => 'RA1XYZ', 'country' => 'Россия'],
    ['callsign' => 'RN6AB', 'country' => 'Россия'],
    ['callsign' => 'RU9CD', 'country' => 'Россия'],
    ['callsign' => 'RV3EF', 'country' => 'Россия'],
    ['callsign' => 'RW4GH', 'country' => 'Россия'],
    ['callsign' => 'RX2IJ', 'country' => 'Россия'],
    ['callsign' => 'RZ8KL', 'country' => 'Россия'],
    ['callsign' => 'RC5MN', 'country' => 'Россия'],
    ['callsign' => 'RD7OP', 'country' => 'Россия'],
    ['callsign' => 'RO1QR', 'country' => 'Россия'],
    ['callsign' => 'UA9XYZ', 'country' => 'Россия'],
    ['callsign' => 'UB4ABC', 'country' => 'Россия'],
    ['callsign' => 'UI8AB', 'country' => 'Россия'],
    ['callsign' => 'R9OGL', 'country' => 'Россия'],
    ['callsign' => 'RK3DJW', 'country' => 'Россия'],
    ['callsign' => 'W1AW', 'country' => 'США'],
    ['callsign' => 'K5ZZ', 'country' => 'США'],
    ['callsign' => 'N4XYZ', 'country' => 'США'],
    ['callsign' => 'AA7BC', 'country' => 'США'],
    ['callsign' => 'G0ABC', 'country' => 'Великобритания'],
    ['callsign' => 'M0XYZ', 'country' => 'Великобритания'],
    ['callsign' => 'DL1ABC', 'country' => 'Германия'],
    ['callsign' => 'DK5XYZ', 'country' => 'Германия'],
    ['callsign' => 'DJ9ZB', 'country' => 'Германия'],
    ['callsign' => 'JA1ABC', 'country' => 'Япония'],
    ['callsign' => 'JH3XYZ', 'country' => 'Япония'],
    ['callsign' => 'F5ABC', 'country' => 'Франция'],
    ['callsign' => 'F4XYZ', 'country' => 'Франция'],
    ['callsign' => 'EA1XYZ', 'country' => 'Испания'],
    ['callsign' => 'SP5ABC', 'country' => 'Польша'],
    ['callsign' => 'SM0XYZ', 'country' => 'Швеция'],
    ['callsign' => 'VE3ABC', 'country' => 'Канада'],
    ['callsign' => 'VK2ABC', 'country' => 'Австралия'],
    ['callsign' => 'ZL1ABC', 'country' => 'Новая Зеландия'],
    ['callsign' => 'HB9ABC', 'country' => 'Швейцария'],
    ['callsign' => 'PY2ABC', 'country' => 'Бразилия'],
    ['callsign' => 'LU1ABC', 'country' => 'Аргентина'],
    ['callsign' => 'OK1ABC', 'country' => 'Чехия'],
    ['callsign' => 'OE3XYZ', 'country' => 'Австрия'],
    ['callsign' => 'I2ABC', 'country' => 'Италия'],
];

$items = [];
if (!empty($pdo)) {
    try {
        $stmt = $pdo->prepare('SELECT callsign, country FROM callsigns ORDER BY RAND() LIMIT :limit');
        $stmt->bindValue(':limit', $count, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
    } catch (Throwable $e) {
        $items = [];
    }
}

if (empty($items)) {
    shuffle($fallbackCallsigns);
    $items = array_slice($fallbackCallsigns, 0, $count);
}

echo json_encode($items, JSON_UNESCAPED_UNICODE);

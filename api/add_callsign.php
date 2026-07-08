<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$callsign = isset($input['callsign']) ? strtoupper(trim($input['callsign'])) : '';
$country = isset($input['country']) ? trim($input['country']) : null;

if ($country !== null) {
    $country = mb_substr($country, 0, 60);
    if ($country === '') $country = null;
}

// Формат реального позывного: 1-3 буквы/цифры, обязательная цифра,
// затем 1-4 буквы. Покрывает большинство международных форматов:
// R7AB, RA3XYZ, UA9XYZ, W1AW, DL1ABC, JA1ABC, 4X1AB, VE3ABC и т.д.
if (!preg_match('/^[A-Z0-9]{1,3}[0-9][A-Z]{1,4}$/', $callsign)) {
    http_response_code(422);
    echo json_encode([
        'error' => 'Не похоже на позывной. Формат: буквы/цифры, обязательно цифра, затем буквы — например R7AB, UA3XYZ, W1AW.',
    ]);
    exit;
}

$check = $pdo->prepare('SELECT id FROM callsigns WHERE callsign = :callsign LIMIT 1');
$check->execute(['callsign' => $callsign]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => "Позывной {$callsign} уже есть в базе."]);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO callsigns (callsign, country) VALUES (:callsign, :country)');
$stmt->execute(['callsign' => $callsign, 'country' => $country]);

echo json_encode(['ok' => true, 'callsign' => $callsign]);

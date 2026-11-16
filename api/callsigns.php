<?php
header('Content-Type: application/json; charset=utf-8');
$SUPPRESS_DB_DIE = true;
require __DIR__ . '/../config/database.php';

$count = isset($_GET['count']) ? (int) $_GET['count'] : 10;
$count = max(1, min($count, 100));

$preset = isset($_GET['preset']) ? trim($_GET['preset']) : '';
$regionsParam = isset($_GET['regions']) ? trim($_GET['regions']) : '';
$shortOnly = !empty($_GET['short_only']) ? 1 : 0;

// Определение списка выбранных регионов
$allowedRegions = ['russia', 'central_asia', 'japan', 'north_america', 'europe', 'other', 'world'];
$selectedRegions = [];

if ($preset === 'ru') {
    $selectedRegions = ['russia'];
} elseif ($preset === 'ru_asia') {
    $selectedRegions = ['russia', 'central_asia'];
} elseif ($preset === 'world') {
    $selectedRegions = ['world'];
} elseif ($regionsParam !== '') {
    $parts = explode(',', strtolower($regionsParam));
    foreach ($parts as $p) {
        $p = trim($p);
        if (in_array($p, $allowedRegions, true)) {
            $selectedRegions[] = $p;
        }
    }
}

// По умолчанию: Россия (дефолтный пресет)
if (empty($selectedRegions)) {
    $selectedRegions = ['russia'];
}

$items = [];

// 1. Попытка запроса из MySQL
if (!empty($pdo)) {
    try {
        $where = [];
        $params = [];

        if (!in_array('world', $selectedRegions, true)) {
            $placeholders = implode(',', array_fill(0, count($selectedRegions), '?'));
            $where[] = "region IN ($placeholders)";
            $params = array_merge($params, $selectedRegions);
        }

        if ($shortOnly) {
            $where[] = "is_short = 1";
        }

        $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT callsign, country, country_code, region, is_short FROM callsigns $whereSql ORDER BY RAND() LIMIT " . (int)$count;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        $items = [];
    }
}

// 2. Если база пуста или недоступна — используем структурированный JSON-фоллбэк
if (empty($items)) {
    $fallbackFile = __DIR__ . '/../database/callsigns_fallback.json';
    if (file_exists($fallbackFile)) {
        $rawPool = json_decode(file_get_contents($fallbackFile), true);
        if (is_array($rawPool)) {
            $candidates = [];
            $isWorld = in_array('world', $selectedRegions, true);

            foreach ($rawPool as $reg => $callList) {
                if ($isWorld || in_array($reg, $selectedRegions, true)) {
                    foreach ($callList as $c) {
                        if ($shortOnly && empty($c['is_short'])) continue;
                        $candidates[] = $c;
                    }
                }
            }

            if (!empty($candidates)) {
                shuffle($candidates);
                $items = array_slice($candidates, 0, $count);
            }
        }
    }
}

// 3. Аварийный минимальный фоллбэк (если JSON файла нет)
if (empty($items)) {
    $hardcodedFallback = [
        ['callsign' => 'R1ABC', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 0],
        ['callsign' => 'UA3XYZ', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 0],
        ['callsign' => 'RA9F', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 1],
        ['callsign' => 'RZ6D', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 1],
        ['callsign' => 'RT6A', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 1],
        ['callsign' => 'R9O', 'country' => 'Россия', 'country_code' => 'RU', 'region' => 'russia', 'is_short' => 1],
        ['callsign' => 'UN7LZ', 'country' => 'Казахстан', 'country_code' => 'KZ', 'region' => 'central_asia', 'is_short' => 0],
        ['callsign' => 'UN9L', 'country' => 'Казахстан', 'country_code' => 'KZ', 'region' => 'central_asia', 'is_short' => 1],
        ['callsign' => 'UK8AA', 'country' => 'Узбекистан', 'country_code' => 'UZ', 'region' => 'central_asia', 'is_short' => 0],
        ['callsign' => 'EX8M', 'country' => 'Кыргызстан', 'country_code' => 'KG', 'region' => 'central_asia', 'is_short' => 1],
        ['callsign' => 'EY8MM', 'country' => 'Таджикистан', 'country_code' => 'TJ', 'region' => 'central_asia', 'is_short' => 0],
        ['callsign' => 'JA1ABC', 'country' => 'Япония', 'country_code' => 'JP', 'region' => 'japan', 'is_short' => 0],
        ['callsign' => 'JH3XYZ', 'country' => 'Япония', 'country_code' => 'JP', 'region' => 'japan', 'is_short' => 0],
        ['callsign' => 'JR4OZR', 'country' => 'Япония', 'country_code' => 'JP', 'region' => 'japan', 'is_short' => 0],
        ['callsign' => 'W1AW', 'country' => 'США', 'country_code' => 'US', 'region' => 'north_america', 'is_short' => 1],
        ['callsign' => 'K5ZZ', 'country' => 'США', 'country_code' => 'US', 'region' => 'north_america', 'is_short' => 1],
        ['callsign' => 'DL1ABC', 'country' => 'Германия', 'country_code' => 'DE', 'region' => 'europe', 'is_short' => 0],
        ['callsign' => 'G0ABC', 'country' => 'Великобритания', 'country_code' => 'GB', 'region' => 'europe', 'is_short' => 0],
    ];

    $filtered = [];
    $isWorld = in_array('world', $selectedRegions, true);
    foreach ($hardcodedFallback as $item) {
        if ($isWorld || in_array($item['region'], $selectedRegions, true)) {
            if ($shortOnly && empty($item['is_short'])) continue;
            $filtered[] = $item;
        }
    }
    if (empty($filtered)) $filtered = $hardcodedFallback;
    shuffle($filtered);
    $items = array_slice($filtered, 0, $count);
}

echo json_encode($items, JSON_UNESCAPED_UNICODE);

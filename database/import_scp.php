<?php
/**
 * Скрипт импорта официальной базы позывных Super Check Partial (MASTER.SCP)
 * и автоматической классификации по регионам (Россия, Средняя Азия, Япония,
 * Северная Америка, Европа, мир).
 *
 * Запуск:
 *   CLI: php database/import_scp.php
 *   Web: /database/import_scp.php (только для локальной разработки или админа)
 */

if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

require_once __DIR__ . '/../config/database.php';

if (empty($pdo)) {
    die("Ошибка: нет подключения к базе данных.\n");
}

echo "=== Импорт и классификация базы позывных ===\n";

// 1. Проверяем и накатываем недостающие колонки
echo "1. Проверка структуры таблицы callsigns...\n";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM callsigns")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('country_code', $cols, true)) {
        echo " - Добавление колонки country_code...\n";
        $pdo->exec("ALTER TABLE callsigns ADD COLUMN country_code VARCHAR(4) NOT NULL DEFAULT 'RU'");
    }
    if (!in_array('region', $cols, true)) {
        echo " - Добавление колонки region...\n";
        $pdo->exec("ALTER TABLE callsigns ADD COLUMN region VARCHAR(20) NOT NULL DEFAULT 'russia'");
    }
    if (!in_array('is_short', $cols, true)) {
        echo " - Добавление колонки is_short...\n";
        $pdo->exec("ALTER TABLE callsigns ADD COLUMN is_short TINYINT(1) NOT NULL DEFAULT 0");
    }
    try {
        $pdo->exec("CREATE INDEX idx_region ON callsigns (region)");
        echo " - Создан индекс idx_region\n";
    } catch (Throwable $e) {}
    try {
        $pdo->exec("CREATE INDEX idx_region_short ON callsigns (region, is_short)");
        echo " - Создан индекс idx_region_short\n";
    } catch (Throwable $e) {}
} catch (Throwable $e) {
    echo "Ошибка миграции колонок: " . $e->getMessage() . "\n";
}

// 2. Классификатор позывных
function classifyCallsign($call) {
    $call = strtoupper(trim($call));
    
    // Средняя Азия (Казахстан, Узбекистан, Таджикистан, Кыргызстан, Туркменистан)
    if (preg_match('/^U[NLPQ]\d/i', $call)) return ['Казахстан', 'KZ', 'central_asia'];
    if (preg_match('/^U[KM]\d/i', $call)) return ['Узбекистан', 'UZ', 'central_asia'];
    if (preg_match('/^EY\d/i', $call)) return ['Таджикистан', 'TJ', 'central_asia'];
    if (preg_match('/^EX\d/i', $call)) return ['Кыргызстан', 'KG', 'central_asia'];
    if (preg_match('/^EZ\d/i', $call)) return ['Туркменистан', 'TM', 'central_asia'];

    // Россия (R, RA..RZ, UA..UI)
    if (preg_match('/^(R[A-Z0-9]?\d|U[A-I]\d)/i', $call)) return ['Россия', 'RU', 'russia'];

    // Япония
    if (preg_match('/^(J[A-S]\d|7[J-N]\d|8[J-N]\d)/i', $call)) return ['Япония', 'JP', 'japan'];

    // Северная Америка (США, Канада)
    if (preg_match('/^([KWN]\d|[KWN][A-Z]\d|A[A-K]\d|A[A-K][A-Z]\d)/i', $call)) return ['США', 'US', 'north_america'];
    if (preg_match('/^(V[A-G]\d|VO\d|VY\d)/i', $call)) return ['Канада', 'CA', 'north_america'];

    // Европа
    if (preg_match('/^D[A-R]\d/i', $call)) return ['Германия', 'DE', 'europe'];
    if (preg_match('/^(G\d|M\d|2[A-Z]\d|G[A-Z]\d|M[A-Z]\d)/i', $call)) return ['Великобритания', 'GB', 'europe'];
    if (preg_match('/^(F\d|TM\d)/i', $call)) return ['Франция', 'FR', 'europe'];
    if (preg_match('/^(I\d|I[A-Z]\d)/i', $call)) return ['Италия', 'IT', 'europe'];
    if (preg_match('/^(E[A-H]\d|AM\d|AN\d|AO\d)/i', $call)) return ['Испания', 'ES', 'europe'];
    if (preg_match('/^(S[N-R]\d|HF\d|3Z\d)/i', $call)) return ['Польша', 'PL', 'europe'];
    if (preg_match('/^(OK\d|OL\d)/i', $call)) return ['Чехия', 'CZ', 'europe'];
    if (preg_match('/^OM\d/i', $call)) return ['Словакия', 'SK', 'europe'];
    if (preg_match('/^(S[A-M]\d|7S\d|8S\d)/i', $call)) return ['Швеция', 'SE', 'europe'];
    if (preg_match('/^O[F-I]\d/i', $call)) return ['Финляндия', 'FI', 'europe'];
    if (preg_match('/^L[A-N]\d/i', $call)) return ['Норвегия', 'NO', 'europe'];
    if (preg_match('/^(U[R-Z]\d|E[M-O]\d)/i', $call)) return ['Украина', 'UA', 'europe'];
    if (preg_match('/^E[U-W]\d/i', $call)) return ['Беларусь', 'BY', 'europe'];
    if (preg_match('/^(HA\d|HG\d)/i', $call)) return ['Венгрия', 'HU', 'europe'];
    if (preg_match('/^(YO\d|YR\d)/i', $call)) return ['Румыния', 'RO', 'europe'];
    if (preg_match('/^LZ\d/i', $call)) return ['Болгария', 'BG', 'europe'];
    if (preg_match('/^SV\d/i', $call)) return ['Греция', 'GR', 'europe'];
    if (preg_match('/^OE\d/i', $call)) return ['Австрия', 'AT', 'europe'];
    if (preg_match('/^HB\d/i', $call)) return ['Швейцария', 'CH', 'europe'];
    if (preg_match('/^P[A-I]\d/i', $call)) return ['Нидерланды', 'NL', 'europe'];
    if (preg_match('/^O[N-T]\d/i', $call)) return ['Бельгия', 'BE', 'europe'];
    if (preg_match('/^(C[R-T]\d|CU\d)/i', $call)) return ['Португалия', 'PT', 'europe'];
    if (preg_match('/^O[U-Z]\d/i', $call)) return ['Дания', 'DK', 'europe'];
    if (preg_match('/^(9A\d|S5\d|E7\d|4O\d|Z3\d|ZA\d|ER\d|ES\d|YL\d|LY\d)/i', $call)) return ['Европа', 'EU', 'europe'];

    return ['Мир', 'DX', 'other'];
}

// 3. Обновляем уже существующие в БД позывные
echo "2. Обновление существующих записей в БД...\n";
try {
    $existing = $pdo->query("SELECT id, callsign FROM callsigns WHERE region = 'russia' AND country_code = 'RU'")->fetchAll();
    $updateStmt = $pdo->prepare("UPDATE callsigns SET country = :country, country_code = :country_code, region = :region, is_short = :is_short WHERE id = :id");
    $updatedCount = 0;
    foreach ($existing as $row) {
        list($country, $code, $reg) = classifyCallsign($row['callsign']);
        $isShort = strlen($row['callsign']) <= 4 ? 1 : 0;
        $updateStmt->execute([
            ':country'      => $country,
            ':country_code' => $code,
            ':region'       => $reg,
            ':is_short'     => $isShort,
            ':id'           => $row['id']
        ]);
        $updatedCount++;
    }
    echo " - Обновлено существующих записей: {$updatedCount}\n";
} catch (Throwable $e) {
    echo "Ошибка обновления: " . $e->getMessage() . "\n";
}

// 4. Загрузка MASTER.SCP (или callsigns_pool.json)
echo "3. Загрузка пула позывных...\n";
$poolFile = __DIR__ . '/callsigns_pool.json';
$scpFile = __DIR__ . '/MASTER.SCP';

$itemsToInsert = [];

if (file_exists($poolFile)) {
    echo " - Загрузка из callsigns_pool.json...\n";
    $json = json_decode(file_get_contents($poolFile), true);
    if (is_array($json)) {
        foreach ($json as $reg => $calls) {
            foreach ($calls as $c) {
                $itemsToInsert[] = $c;
            }
        }
    }
} elseif (file_exists($scpFile)) {
    echo " - Чтение локального MASTER.SCP...\n";
    $lines = file($scpFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $call = trim($line);
        if ($call === '' || $call[0] === '#' || $call[0] === '!') continue;
        list($country, $code, $reg) = classifyCallsign($call);
        $itemsToInsert[] = [
            'callsign'     => $call,
            'country'      => $country,
            'country_code' => $code,
            'region'       => $reg,
            'is_short'     => strlen($call) <= 4 ? 1 : 0,
        ];
    }
} else {
    echo " - Скачивание свежего MASTER.SCP с supercheckpartial.com...\n";
    $raw = @file_get_contents('https://supercheckpartial.com/MASTER.SCP');
    if ($raw) {
        file_put_contents($scpFile, $raw);
        $lines = explode("\n", $raw);
        foreach ($lines as $line) {
            $call = trim($line);
            if ($call === '' || $call[0] === '#' || $call[0] === '!') continue;
            list($country, $code, $reg) = classifyCallsign($call);
            $itemsToInsert[] = [
                'callsign'     => $call,
                'country'      => $country,
                'country_code' => $code,
                'region'       => $reg,
                'is_short'     => strlen($call) <= 4 ? 1 : 0,
            ];
        }
    }
}

echo " - Подготовлено к вставке: " . count($itemsToInsert) . " позывных\n";

// 5. Пакетная вставка в базу данных порциями по 500 строк
echo "4. Пакетная запись в таблицу callsigns...\n";
$batchSize = 500;
$total = count($itemsToInsert);
$inserted = 0;

$pdo->beginTransaction();
try {
    for ($i = 0; $i < $total; $i += $batchSize) {
        $chunk = array_slice($itemsToInsert, $i, $batchSize);
        $placeholders = [];
        $values = [];
        foreach ($chunk as $item) {
            $placeholders[] = '(?, ?, ?, ?, ?)';
            $values[] = $item['callsign'];
            $values[] = $item['country'];
            $values[] = $item['country_code'];
            $values[] = $item['region'];
            $values[] = $item['is_short'];
        }
        $sql = "INSERT IGNORE INTO callsigns (callsign, country, country_code, region, is_short) VALUES " . implode(', ', $placeholders);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        $inserted += $stmt->rowCount();
    }
    $pdo->commit();
    echo " - Успешно добавлено новых позывных: {$inserted}\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    echo "Ошибка пакетной вставки: " . $e->getMessage() . "\n";
}

// 6. Итоговая статистика по таблице
echo "\n=== Статистика по регионам в базе данных ===\n";
try {
    $stats = $pdo->query("SELECT region, COUNT(*) as cnt FROM callsigns GROUP BY region ORDER BY cnt DESC")->fetchAll();
    foreach ($stats as $row) {
        echo sprintf(" %-15s : %d\n", $row['region'], $row['cnt']);
    }
    $totalInDb = $pdo->query("SELECT COUNT(*) FROM callsigns")->fetchColumn();
    echo " Всего в базе: {$totalInDb}\n";
} catch (Throwable $e) {
    echo "Ошибка получения статистики: " . $e->getMessage() . "\n";
}

echo "\nГотово!\n";

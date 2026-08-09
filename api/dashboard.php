<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/i18n.php';

// Batch-эндпоинт: объединяет то, что раньше было 4 отдельными GET-запросами
// (achievements.php, stats.php, leaderboard.php, pull_progress.php),
// вызывавшимися практически одновременно при КАЖДОЙ загрузке страницы
// (app.js: renderNavStats/checkAchievements/syncWithServer — на каждой
// странице сайта через footer.php; home.js добавлял ещё stats+leaderboard
// на главной). Каждый такой запрос открывал своё соединение с MySQL —
// под нагрузкой (много одновременных посетителей) это давало резкий всплеск
// параллельных подключений и ловило "Host is blocked because of many
// connection errors" (см. CHANGELOG/DEPLOY про инцидент 2026-08-09).
//
// Здесь — одно соединение (из auth.php → config/database.php) на все части
// сразу. Клиент запрашивает только то, что ему реально нужно, через ?parts=.
//
// Части, которые ПИШУТ в БД (push_progress.php, refresh_published_stats.php),
// сюда намеренно не включены — это POST с другой семантикой (не читаются
// параллельно, идут последовательно ПОСЛЕ обработки pull на клиенте).

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => t('api.method_not_allowed')]);
    exit;
}

$requested = isset($_GET['parts']) ? explode(',', $_GET['parts']) : ['achievements', 'stats', 'leaderboard', 'progress'];
$requested = array_map('trim', $requested);
$want = array_flip($requested);

$userId = current_user_id();
// Прогресс и "моё место" в лидерборде читаются из БД — дальше $_SESSION не
// нужен, закрываем блокировку сразу (тот же приём, что в pull_progress.php).
session_write_close();

// Всегда отдаём отдельным полем, независимо от запрошенных parts: клиенту
// (Progress.syncWithServer) нужно ОТЛИЧИТЬ гостя (progress:null, ничего не
// мержим и не пушим) от залогиненного без серверной копии прогресса
// (progress:null, но мержим/пушим как обычно) — раньше это отличал
// HTTP-статус pull_progress.php (401 vs ok:true), тут его больше нет.
$out = ['loggedIn' => (bool) $userId];

if (isset($want['achievements'])) {
    $stmt = $pdo->query('SELECT code, title, description, icon, condition_type, condition_value FROM achievements ORDER BY sort_order ASC');
    $rows = $stmt->fetchAll();

    // Тексты достижений живут в БД на русском — единственный источник
    // истины. Для остальных языков накладываем перевод по коду, если он
    // есть; иначе молча остаётся оригинал из БД (см. api/achievements.php).
    foreach ($rows as &$row) {
        $titleKey = 'ach_def.' . $row['code'] . '.title';
        $descKey = 'ach_def.' . $row['code'] . '.desc';
        $translatedTitle = t($titleKey);
        $translatedDesc = t($descKey);
        if ($translatedTitle !== $titleKey) $row['title'] = $translatedTitle;
        if ($translatedDesc !== $descKey) $row['description'] = $translatedDesc;
    }
    unset($row);

    $out['achievements'] = $rows;
}

if (isset($want['stats'])) {
    $stmt = $pdo->query('SELECT total_sessions, total_groups, total_letters_events, total_callsigns FROM global_stats WHERE id = 1');
    $out['stats'] = $stmt->fetch();
}

if (isset($want['leaderboard'])) {
    $limit = isset($_GET['limit']) ? max(1, min((int) $_GET['limit'], 50)) : 10;

    $byXp = $pdo->prepare('
        SELECT u.id AS user_id, u.name, s.xp
        FROM user_stats s JOIN users u ON u.id = s.user_id
        WHERE s.xp > 0
        ORDER BY s.xp DESC, u.id ASC
        LIMIT :limit
    ');
    $byXp->bindValue(':limit', $limit, PDO::PARAM_INT);
    $byXp->execute();

    $byStreak = $pdo->prepare('
        SELECT u.id AS user_id, u.name, s.streak_count
        FROM user_stats s JOIN users u ON u.id = s.user_id
        WHERE s.streak_count > 0
        ORDER BY s.streak_count DESC, u.id ASC
        LIMIT :limit
    ');
    $byStreak->bindValue(':limit', $limit, PDO::PARAM_INT);
    $byStreak->execute();

    $me = null;
    if ($userId) {
        $meStmt = $pdo->prepare('
            SELECT u.id AS user_id, u.name, s.xp, s.streak_count
            FROM user_stats s JOIN users u ON u.id = s.user_id
            WHERE s.user_id = :id
        ');
        $meStmt->execute(['id' => $userId]);
        $meRow = $meStmt->fetch();

        if ($meRow) {
            $me = ['user_id' => (int) $meRow['user_id'], 'name' => $meRow['name']];

            if ((int) $meRow['xp'] > 0) {
                $rankStmt = $pdo->prepare('SELECT COUNT(*) + 1 FROM user_stats WHERE xp > :xp');
                $rankStmt->execute(['xp' => $meRow['xp']]);
                $me['xp'] = (int) $meRow['xp'];
                $me['xp_rank'] = (int) $rankStmt->fetchColumn();
            }

            if ((int) $meRow['streak_count'] > 0) {
                $rankStmt = $pdo->prepare('SELECT COUNT(*) + 1 FROM user_stats WHERE streak_count > :s');
                $rankStmt->execute(['s' => $meRow['streak_count']]);
                $me['streak_count'] = (int) $meRow['streak_count'];
                $me['streak_rank'] = (int) $rankStmt->fetchColumn();
            }
        }
    }

    $out['leaderboard'] = [
        'byXp' => $byXp->fetchAll(),
        'byStreak' => $byStreak->fetchAll(),
        'me' => $me,
    ];
}

if (isset($want['progress'])) {
    if (!$userId) {
        // Как и pull_progress.php — без логина это не ошибка, просто нечего
        // отдавать. Клиент (Progress.syncWithServer) отличает null от
        // отсутствия ключа тем же способом, что раньше отличал ok:false.
        $out['progress'] = null;
    } else {
        $stmt = $pdo->prepare('SELECT progress_json, updated_at FROM user_progress WHERE user_id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        $out['progress'] = $row ? json_decode($row['progress_json'], true) : null;
        $out['progress_updated_at'] = $row['updated_at'] ?? null;
    }
}

echo json_encode($out, JSON_UNESCAPED_UNICODE);

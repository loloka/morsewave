<?php
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/auth.php';

// full=1 — вся таблица (для отдельной страницы leaderboard.php), иначе —
// верхушка для витрины на главной (limit, по умолчанию 10, потолок 50).
$full = isset($_GET['full']) && $_GET['full'] === '1';
$limit = $full ? 500 : (isset($_GET['limit']) ? max(1, min((int) $_GET['limit'], 50)) : 10);

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

// «Моё место» — реальное место залогиненного опубликованного пользователя
// в общем зачёте, даже если сам он не попал в переданный срез (топ-10 на
// главной). Нужно, чтобы показать на главной отдельной строкой "+1" к
// десятке — не смещать человека из виду, а просто дописать его настоящее
// место, не догружая для этого всю таблицу.
$me = null;
$userId = current_user_id();
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

echo json_encode([
    'byXp' => $byXp->fetchAll(),
    'byStreak' => $byStreak->fetchAll(),
    'me' => $me,
], JSON_UNESCAPED_UNICODE);

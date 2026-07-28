<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('leaderboard.h1');
$activePage = '';
$pageScript = 'leaderboard.js';
include __DIR__ . '/includes/header.php';
?>

<div class="flex-between flex-wrap gap-2">
    <div>
        <div class="card-eyebrow"><?= t('leaderboard.eyebrow') ?></div>
        <h1 class="mt-0"><?= mw_icon('trophy', 22) ?> <?= t('leaderboard.h1') ?></h1>
    </div>
    <a href="index.php" class="link"><?= t('leaderboard.back_link') ?></a>
</div>
<p class="muted mt-0"><?= t('index.leaderboard_intro') ?></p>

<div class="card mt-3">
    <div class="chip-row">
        <div class="chip active" data-board="xp"><?= t('index.board_by_xp') ?></div>
        <div class="chip" data-board="streak"><?= t('index.board_by_streak') ?></div>
    </div>
    <div class="mt-2" id="leaderboard-full-xp"><p class="muted"><?= t('index.loading') ?></p></div>
    <div class="mt-2" id="leaderboard-full-streak" style="display:none;"><p class="muted"><?= t('index.loading') ?></p></div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

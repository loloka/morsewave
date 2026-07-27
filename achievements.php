<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('ach.title');
$activePage = 'achievements';
$pageScript = 'achievements.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('ach.eyebrow') ?></div>
<h1><?= t('ach.h1') ?></h1>
<p><?= t('ach.intro') ?></p>

<div class="grid grid-2 mt-3" id="achievements-grid"></div>

<div class="card mt-3">
    <div class="flex-between flex-wrap gap-2">
        <div>
            <h3 class="mt-0"><?= t('ach.reset_title') ?></h3>
            <p class="mt-0 mb-2"><?= t('ach.reset_intro') ?></p>
        </div>
        <button class="btn" id="reset-progress-btn" style="border-color:var(--danger);color:var(--danger);">
            <?= t('ach.reset_btn') ?>
        </button>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

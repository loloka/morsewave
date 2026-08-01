<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('keyhardware.title');
$activePage = '';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('keyhardware.eyebrow') ?></div>
<h1><?= t('keyhardware.h1') ?></h1>
<p class="muted mt-0"><?= t('keyhardware.updated') ?></p>

<?= t('keyhardware.body') ?>

<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('privacy.title');
$activePage = '';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('legal.docs_eyebrow') ?></div>
<h1><?= t('privacy.h1') ?></h1>
<p class="muted mt-0"><?= t('privacy.updated') ?></p>

<?= t('privacy.body') ?>

<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('terms.title');
$activePage = '';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('legal.docs_eyebrow') ?></div>
<h1><?= t('terms.h1') ?></h1>
<p class="muted mt-0"><?= t('terms.updated') ?></p>

<?= t('terms.body') ?>

<?php include __DIR__ . '/includes/footer.php'; ?>

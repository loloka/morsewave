<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('keyhardware.title');
$activePage = 'keyhardware';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('keyhardware.eyebrow') ?></div>
<h1><?= t('keyhardware.h1') ?></h1>
<p class="muted mt-0"><?= t('keyhardware.updated') ?></p>

<div class="alert alert-info mt-3 mb-4" style="background: rgba(79, 216, 196, 0.08); border: 1px solid rgba(79, 216, 196, 0.3); border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
    <div>
        <div style="font-weight: 700; color: #4fd8c4; margin-bottom: 4px;">⚡ Интерактивный боевой ключ MorseWave Pro (R9OGL Edition)</div>
        <div style="font-size: 14px; color: var(--text-muted, #94a3b8);">
            Ищете страницу подключения нового электронного ключа с OLED-экраном, WebSerial и эхо-тренажером?
        </div>
    </div>
    <a href="keyer.php" class="btn btn-primary" style="white-space: nowrap; font-size: 13px; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 600; background: #4fd8c4; color: #0b0f12;">
        Открыть хаб ключа →
    </a>
</div>

<?= t('keyhardware.body') ?>

<?php include __DIR__ . '/includes/footer.php'; ?>

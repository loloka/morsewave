<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('cs.title');
$activePage = 'callsigns';
$pageScript = 'callsigns.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('cs.eyebrow') ?></div>
<h1><?= t('cs.h1') ?></h1>
<p><?= t('cs.intro') ?></p>

<div class="card mt-3" id="setup-panel">
    <h3><?= t('cs.settings') ?></h3>
    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <div class="speed-control">
            <?= t('cs.speed') ?>
            <input type="range" id="cs-wpm" min="5" max="35" step="1" value="12">
            <span class="speed-value" id="cs-wpm-value">12</span> wpm
        </div>
        <label class="chip"><?= t('cs.per_session') ?>
            <select id="cs-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="5" selected>5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option>
            </select>
        </label>
    </div>
    <button class="btn btn-primary mt-2" id="start-session"><?= t('cs.start_session') ?></button>
    <div class="feedback mt-2" id="setup-error"></div>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono"><?= t('cs.callsign_label') ?> <span id="cs-index">1</span> / <span id="cs-total">5</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="cs-lamp"></div>
            <button class="btn btn-sm" id="cs-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn"><?= t('cs.replay') ?></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>
    <input type="text" id="cs-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('cs.answer_placeholder')) ?>" autocomplete="off">
    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="submit-answer"><?= t('cs.check') ?></button>
    </div>
    <div class="feedback mt-2" id="cs-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('cs.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('cs.result_exact') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('cs.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('cs.result_xp') ?></span></div>
    </div>
    <button class="btn btn-primary mt-2" id="restart-btn"><?= t('cs.new_session') ?></button>
</div>

<div class="card mt-3">
    <h3><?= t('cs.add_title') ?></h3>
    <p class="mt-0 muted" style="font-size:13px;"><?= t('cs.add_intro') ?></p>
    <div class="flex-wrap gap-2">
        <input type="text" id="new-callsign-input" class="answer-input" style="flex:2;min-width:140px;"
               placeholder="<?= htmlspecialchars(t('cs.add_placeholder')) ?>" autocomplete="off">
        <input type="text" id="new-callsign-country" class="answer-input" style="flex:1;min-width:140px;"
               placeholder="<?= htmlspecialchars(t('cs.add_country_placeholder')) ?>" autocomplete="off">
        <button class="btn btn-primary" id="add-callsign-btn"><?= t('cs.add_btn') ?></button>
    </div>
    <div class="feedback mt-2" id="add-callsign-feedback"></div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

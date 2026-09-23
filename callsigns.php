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
            <span class="muted cpm-hint" id="cs-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>
        <label class="chip"><?= t('cs.per_session') ?>
            <select id="cs-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="5" selected>5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option>
            </select>
        </label>
        <label class="chip">
            <input type="checkbox" id="cs-farnsworth-enabled"> <?= t('groups.farnsworth') ?>
        </label>
        <label class="chip">
            <input type="checkbox" id="cs-buffer-enabled"> <?= t('groups.buffer_input') ?>
        </label>
    </div>

    <!-- Панель настройки Фарнсворта в Позывных -->
    <div id="cs-farnsworth-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <div>
                <div style="font-weight:700; font-size:13px;"><?= t('koch.farnsworth') ?></div>
                <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.farnsworth_speed_desc') ?></div>
            </div>
            <div class="speed-control" id="cs-farnsworth-wrap">
                <input type="range" id="cs-farnsworth" min="5" max="30" step="1" value="10">
                <span class="speed-value" id="cs-farnsworth-value">10</span> wpm
            </div>
        </div>
        <div class="muted mt-2" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
            💡 <?= t('koch.farnsworth_tooltip') ?>
        </div>
    </div>

    <!-- Панель настройки буфера памяти в Позывных -->
    <div id="cs-buffer-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <div>
                <div style="font-weight:700; font-size:13px;"><?= t('groups.buffer_depth_label') ?></div>
                <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.buffer_depth_desc') ?></div>
            </div>
            <div class="chip-row" id="cs-buffer-depth-chips">
                <div class="chip" data-depth="1">1 <?= t('groups.chars_short') ?></div>
                <div class="chip" data-depth="2">2 <?= t('groups.chars_short') ?></div>
                <div class="chip" data-depth="3">3 <?= t('groups.chars_short') ?></div>
                <div class="chip" data-depth="4">4 <?= t('groups.chars_short') ?></div>
                <div class="chip active" data-depth="all"><?= t('cs.buffer_depth_all') ?></div>
            </div>
        </div>
        <div class="muted mt-2" id="cs-buffer-tip-text" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
            💡 <?= t('groups.buffer_tooltip') ?>
        </div>
        <div class="muted mt-1" style="font-size:11px; opacity:0.85;">
            <?= t('groups.buffer_hint') ?>
        </div>
    </div>

    <button class="btn btn-primary mt-2" id="start-session" title="<?= t('common.shortcut_enter') ?>"><?= t('cs.start_session') ?> <kbd class="btn-kbd">Enter</kbd></button>
    <div class="feedback mt-2" id="setup-error"></div>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono"><?= t('cs.callsign_label') ?> <span id="cs-index">1</span> / <span id="cs-total">5</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="cs-lamp"></div>
            <button class="btn btn-sm" id="cs-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn" title="F7"><?= t('cs.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>
    <input type="text" id="cs-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('cs.answer_placeholder')) ?>" autocomplete="off">
    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="submit-answer"><?= t('cs.check') ?> <kbd class="btn-kbd">Enter</kbd></button>
        <button class="btn" id="cs-stop-btn" type="button"><?= t('groups.words_stop') ?> <kbd class="btn-kbd">Esc</kbd></button>
    </div>

    <div class="vkb mt-2" id="cs-vkb" style="display:none;"></div>
    <div class="feedback mt-3" id="cs-feedback" style="margin-top:24px;"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('cs.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('cs.result_exact') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('cs.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('cs.result_xp') ?></span></div>
    </div>

    <div class="card mt-2" id="cs-daily-time-block" style="display:none; background:var(--surface-2); padding:10px 14px; text-align:center; font-size:13px; color:var(--text-muted);">
        <span id="cs-daily-time-text"></span>
        <div class="muted mt-1" style="font-size:11px;"><?= t('groups.daily_time_change_hint') ?></div>
    </div>

    <button class="btn btn-primary mt-2" id="restart-btn" title="<?= t('common.shortcut_enter') ?>"><?= t('cs.new_session') ?> <kbd class="btn-kbd">Enter</kbd></button>
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

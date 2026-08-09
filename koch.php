<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('koch.title');
$activePage = 'koch';
$pageScript = 'koch.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('koch.eyebrow') ?></div>
<h1><?= t('koch.h1') ?></h1>
<p><?= t('koch.intro') ?></p>

<div class="card mt-3">
    <div class="flex-between flex-wrap gap-2">
        <div>
            <div class="card-eyebrow"><?= t('koch.opened') ?></div>
            <div class="value mono" style="font-size:28px;color:var(--accent)" id="koch-level">2</div>
        </div>
        <div style="max-width:480px;flex:1;">
            <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('koch.current_charset_hint') ?></div>
            <div class="chip-row" id="koch-charset"></div>
        </div>
    </div>
    <div class="progress-bar mt-2"><span id="koch-progress-bar" style="width:5%"></span></div>
    <div class="feedback mt-1" id="koch-charset-feedback"></div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <span class="muted" style="font-size:13px;"><?= t('koch.jump_hint') ?></span>
        <input type="range" id="koch-jump" min="2" max="38" step="1" value="2">
        <span class="speed-value mono" id="koch-jump-value">2</span>
        <button class="btn btn-sm" id="koch-jump-apply"><?= t('koch.jump_apply') ?></button>
    </div>
</div>

<div class="card mt-3" id="setup-panel">
    <h3><?= t('koch.session_settings') ?></h3>
    <div class="flex-wrap gap-2 mt-1" style="align-items:center;">
        <div class="speed-control">
            <?= t('koch.symbol_speed') ?>
            <input type="range" id="koch-wpm" min="10" max="40" step="1" value="12">
            <span class="speed-value" id="koch-wpm-value">12</span> wpm
            <span class="muted cpm-hint" id="koch-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>

        <label class="chip" style="gap:8px;">
            <input type="checkbox" id="koch-farnsworth-enabled"> <?= t('koch.farnsworth') ?>
            <span class="info-icon" id="koch-farnsworth-info">?</span>
        </label>
        <div class="tooltip-box" id="koch-farnsworth-tooltip" style="display:none;">
            <?= t('koch.farnsworth_tooltip') ?>
        </div>
        <div class="speed-control" id="koch-farnsworth-wrap" style="display:none;">
            <input type="range" id="koch-farnsworth" min="5" max="30" step="1" value="10">
            <span class="speed-value" id="koch-farnsworth-value">10</span> wpm
        </div>

        <label class="chip"><?= t('koch.groups_per_session') ?>
            <select id="koch-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="10" selected>10</option><option value="20">20</option><option value="30">30</option>
            </select>
        </label>
    </div>
    <button class="btn btn-primary mt-2" id="start-session"><?= t('koch.start_session') ?></button>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between flex-wrap gap-1">
        <div class="muted mono" style="white-space:nowrap;"><?= t('koch.group_label') ?> <span id="group-index">1</span> / <span id="group-total">20</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="koch-lamp"></div>
            <button class="btn btn-sm" id="koch-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn"><?= t('koch.replay') ?></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="koch-signal"></div>
    <input type="text" id="koch-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('koch.answer_placeholder')) ?>" autocomplete="off">

    <!-- Экранная клавиатура — только на телефонах/планшетах (см. koch.js).
         На Кохе набор символов часто смешивает буквы, цифры и знаки
         (. и ?), а у стандартной клавиатуры телефона они на разных
         "страницах" — переключение туда-обратно между каждой группой
         утомляет и съедает время. Своя клавиатура показывает сразу все
         символы текущего уровня на одном экране; на компьютере её нет,
         ввод остаётся обычным, с физической клавиатуры. -->
    <div class="vkb mt-2" id="koch-vkb" style="display:none;"></div>

    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="submit-answer"><?= t('koch.check') ?></button>
    </div>
    <div class="feedback mt-2" id="koch-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('koch.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('koch.result_accuracy') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('koch.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('koch.result_xp') ?></span></div>
    </div>
    <div class="feedback mt-2 show" id="result-message"></div>
    <button class="btn btn-primary mt-2" id="restart-btn"><?= t('koch.new_session') ?></button>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('groups.title');
$activePage = 'groups';
$pageScript = 'groups.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('groups.eyebrow') ?></div>
<h1><?= t('groups.h1') ?></h1>
<p><?= t('groups.intro') ?></p>

<div class="mode-switch">
    <div class="chip active" data-mode="groups"><?= t('groups.mode_groups') ?></div>
    <div class="chip" data-mode="words"><?= t('groups.mode_words') ?></div>
    <div class="chip" data-mode="abbrev"><?= t('groups.mode_abbrev') ?></div>
</div>

<!-- ======================= РЕЖИМ: ГРУППЫ СИМВОЛОВ ======================= -->
<div id="groups-mode">

<div class="card mt-2" id="setup-panel">
    <h3><?= t('groups.settings') ?></h3>

    <div class="mt-2">
        <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('groups.length_label') ?></div>
        <div class="chip-row" id="length-chips">
            <div class="chip" data-len="2">2</div>
            <div class="chip active" data-len="3">3</div>
            <div class="chip" data-len="4">4</div>
            <div class="chip" data-len="5">5</div>
        </div>
    </div>

    <div class="mt-2">
        <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('groups.charset_label') ?></div>
        <div class="chip-row" id="charset-chips">
            <div class="chip active" data-set="letters"><?= t('groups.set_letters') ?></div>
            <div class="chip" data-set="digits"><?= t('groups.set_digits') ?></div>
            <div class="chip" data-set="mixed"><?= t('groups.set_mixed') ?></div>
            <div class="chip" data-set="learned"><?= t('groups.set_learned') ?></div>
            <div class="chip" data-set="custom"><?= t('groups.set_custom') ?></div>
        </div>
        <input type="text" id="custom-charset-input" class="answer-input mt-1"
               placeholder="<?= htmlspecialchars(t('groups.custom_placeholder')) ?>"
               style="display:none; text-transform:uppercase;" autocomplete="off">
        <div class="muted" id="custom-charset-hint" style="display:none; font-size:11px; margin-top:4px;"><?= t('groups.custom_hint') ?></div>
    </div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;" id="groups-speed-row">
        <div class="speed-control" id="groups-wpm-control">
            <?= t('groups.speed') ?>
            <input type="range" id="groups-wpm" min="5" max="60" step="1" value="12">
            <span class="speed-value" id="groups-wpm-value">12</span> wpm
            <span class="muted cpm-hint" id="groups-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>
        <div class="muted" id="groups-exam-speed-note" style="display:none; font-size:13px;">
            <?= t('groups.exam_speed_fixed') ?>
        </div>

        <label class="chip" style="gap:8px;">
            <input type="checkbox" id="groups-farnsworth-enabled"> <?= t('groups.farnsworth') ?>
            <span class="info-icon" id="groups-farnsworth-info">?</span>
        </label>
        <div class="speed-control" id="groups-farnsworth-wrap" style="display:none;">
            <input type="range" id="groups-farnsworth" min="5" max="30" step="1" value="10">
            <span class="speed-value" id="groups-farnsworth-value">10</span> wpm
        </div>

        <label class="chip"><?= t('groups.groups_per_session') ?>
            <select id="groups-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="10" selected>10</option><option value="20">20</option>
                <option value="30">30</option><option value="50">50</option>
            </select>
        </label>
    </div>
    <div class="tooltip-box" id="groups-farnsworth-tooltip" style="display:none;">
        <?= t('groups.farnsworth_tooltip') ?>
    </div>

    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="start-session"><?= t('groups.start_session') ?></button>
        <button class="btn" id="exam-mode-btn"><?= t('groups.exam_mode') ?></button>
    </div>
    <p class="muted mt-1" style="font-size:12px;">
        <?= t('groups.exam_hint') ?>
    </p>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono"><?= t('groups.group_label') ?> <span id="group-index">1</span> / <span id="group-total">10</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="groups-lamp"></div>
            <button class="btn btn-sm" id="groups-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn" title="F7"><?= t('groups.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="groups-signal"></div>
    <input type="text" id="groups-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('groups.answer_placeholder')) ?>" autocomplete="off">
    <div class="btn-row mt-2" id="groups-submit-row">
        <button class="btn btn-primary" id="submit-answer"><?= t('groups.check') ?></button>
    </div>

    <textarea id="exam-answer" class="answer-input mt-2" style="display:none; min-height:180px; resize:vertical;"
        placeholder="<?= htmlspecialchars(t('groups.exam_placeholder')) ?>"></textarea>
    <div class="btn-row mt-2" id="exam-submit-row" style="display:none;">
        <button class="btn btn-primary" id="exam-submit-btn" disabled><?= t('groups.exam_transmitting') ?></button>
    </div>

    <div class="feedback mt-2" id="groups-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('groups.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('groups.result_accuracy') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('groups.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('groups.result_xp') ?></span></div>
    </div>
    
    <div id="exam-diff-block" class="mt-2" style="display:none; font-family: var(--font-mono); font-size: 15px; letter-spacing: 1px; color: var(--text); background: var(--surface-2); padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; text-align: left;"></div>

    <div class="card mt-2" id="mistakes-block" style="display:none; background:var(--surface-2);">
        <p class="mt-0" style="font-size:14px;"><?= t('groups.mistakes_hint') ?></p>
        <button class="btn btn-primary" id="retrain-mistakes-btn"><?= t('groups.retrain_mistakes') ?><span id="mistake-count">0</span>)</button>
    </div>

    <button class="btn btn-primary mt-2" id="restart-btn"><?= t('groups.new_session') ?></button>
</div>

</div>

<!-- ======================= РЕЖИМ: РЕАЛЬНЫЕ СЛОВА ======================= -->
<div id="words-mode" style="display:none;">

<div class="card mt-2" id="words-setup">
    <p class="mt-0"><?= t('groups.words_intro') ?></p>

    <div class="mt-2">
        <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('groups.words_what') ?></div>
        <div class="chip-row" id="words-set-chips">
            <div class="chip active" data-wset="words"><?= t('groups.wset_words') ?></div>
            <div class="chip" data-wset="phrases"><?= t('groups.wset_phrases') ?></div>
            <div class="chip" data-wset="mixed"><?= t('groups.wset_mixed') ?></div>
        </div>
        <div class="muted mt-1" style="font-size:12px;" id="words-set-hint">
            <?= t('groups.wset_hint_words') ?>
        </div>
    </div>

    <div class="flex-wrap gap-2 mt-3" style="align-items:center;">
        <div class="speed-control">
            <?= t('groups.speed') ?>
            <input type="range" id="words-wpm" min="5" max="60" step="1" value="12">
            <span class="speed-value" id="words-wpm-value">12</span> wpm
            <span class="muted cpm-hint" id="words-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>

        <label class="chip" style="gap:8px;">
            <input type="checkbox" id="words-farnsworth-enabled" checked> <?= t('groups.farnsworth') ?>
        </label>
        <div class="speed-control" id="words-farnsworth-wrap">
            <input type="range" id="words-farnsworth" min="5" max="30" step="1" value="9">
            <span class="speed-value" id="words-farnsworth-value">9</span> wpm
        </div>

        <label class="chip"><?= t('groups.words_per_session') ?>
            <select id="words-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="10" selected>10</option><option value="20">20</option>
                <option value="30">30</option><option value="50">50</option>
            </select>
        </label>
    </div>
    <p class="muted mt-1" style="font-size:12px;">
        <?= t('groups.words_farnsworth_note') ?>
    </p>

    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="words-start-btn"><?= t('groups.start_session') ?></button>
    </div>
</div>

<div class="card mt-3" id="words-session" style="display:none;">
    <div class="flex-between">
        <div class="muted mono"><span id="words-index">1</span> / <span id="words-total">10</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="words-lamp"></div>
            <button class="btn btn-sm" id="words-signal-toggle"></button>
            <button class="btn btn-sm" id="words-replay-btn" title="F7"><?= t('groups.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="words-signal"></div>
    <input type="text" id="words-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('groups.words_answer_placeholder')) ?>" autocomplete="off">
    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="words-submit-btn"><?= t('groups.check') ?></button>
        <button class="btn" id="words-stop-btn"><?= t('groups.words_stop') ?></button>
    </div>
    <div class="feedback mt-2" id="words-feedback"></div>
</div>

<div class="card mt-3" id="words-result" style="display:none;">
    <h3><?= t('groups.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="words-result-accuracy">0%</span><span class="label"><?= t('groups.result_accuracy') ?></span></div>
        <div class="stat"><span class="value" id="words-result-correct">0</span><span class="label"><?= t('groups.words_result_correct') ?></span></div>
        <div class="stat"><span class="value" id="words-result-xp">0</span><span class="label"><?= t('groups.result_xp') ?></span></div>
    </div>
    <div class="mt-2" id="words-mistakes" style="display:none;"></div>
    <button class="btn btn-primary mt-2" id="words-restart-btn"><?= t('groups.new_session') ?></button>
</div>

</div>

<!-- ======================= РЕЖИМ: СОКРАЩЕНИЯ ======================= -->
<div id="abbrev-mode" style="display:none;">
    <div class="card mt-2">
        <p class="mt-0"><?= t('groups.abbrev_intro') ?></p>

        <div class="flex-between flex-wrap gap-2">
            <div class="speed-control">
                <?= t('groups.speed') ?>
                <input type="range" id="abbrev-wpm" min="10" max="35" step="1" value="12">
                <span class="speed-value" id="abbrev-wpm-value">12</span> wpm
                <span class="muted cpm-hint" id="abbrev-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="abbrev-lamp"></div>
                <button class="btn btn-sm" id="abbrev-signal-toggle"></button>
                <button class="btn btn-primary btn-sm" id="abbrev-start-btn"><?= t('groups.abbrev_start') ?></button>
                <button class="btn btn-sm" id="abbrev-stop-btn" style="display:none;"><?= t('groups.abbrev_stop') ?></button>
            </div>
        </div>

        <div class="signal-line mt-2" id="abbrev-signal"></div>

        <div class="flex-between mt-2" id="abbrev-stats">
            <div class="muted mono"><?= t('groups.abbrev_streak') ?> <b id="abbrev-streak">0</b> · <?= t('groups.abbrev_correct') ?> <b id="abbrev-correct">0</b> <?= t('groups.abbrev_of') ?> <b id="abbrev-total">0</b></div>
        </div>

        <!-- Системные сообщения (например, "Остановлено") — короткие и
             разовые, для них старого поведения (появилось/исчезло) хватает. -->
        <div class="feedback mt-2" id="abbrev-feedback"></div>

        <!-- История ответов — раньше расшифровка "верно/неверно" была одной
             строкой, которая гасла уже через ~0.9с (со стартом следующего
             сокращения) — на телефоне прочитать не успевал. Теперь ответы
             копятся списком (последний сверху) и остаются на экране, пока
             их не вытеснят более новые. -->
        <div class="mt-2" id="abbrev-history"></div>

        <div class="tile-grid mt-2" id="abbrev-grid"></div>

        <button class="btn btn-sm mt-3" id="abbrev-reference-toggle"><?= t('groups.abbrev_reference_toggle') ?></button>
        <div id="abbrev-reference" class="mt-2" style="display:none;"></div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

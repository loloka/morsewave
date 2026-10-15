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
    <div class="koch-status-head">
        <div class="koch-status-level">
            <div class="card-eyebrow"><?= t('koch.opened') ?></div>
            <div class="value mono" style="font-size:28px;color:var(--accent)" id="koch-level">2</div>
        </div>
        <div class="koch-status-symbols">
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

    <div class="groups-quick-row mt-2">
        <div class="groups-quick-col" style="max-width:280px;">
            <div class="groups-param-label"><?= t('koch.groups_per_session') ?></div>
            <div class="groups-select-wrap">
                <select id="koch-count" class="select-styled">
                    <option value="10" selected>10 <?= t('groups.groups_unit') ?></option>
                    <option value="20">20 <?= t('groups.groups_unit') ?></option>
                    <option value="30">30 <?= t('groups.groups_unit') ?></option>
                    <option value="40">40 <?= t('groups.groups_unit') ?></option>
                    <option value="50">50 <?= t('groups.groups_unit') ?></option>
                </select>
            </div>
        </div>
    </div>

    <div class="groups-speed-bar mt-2">
        <div class="speed-control" id="koch-wpm-control">
            <span class="speed-label"><?= t('koch.symbol_speed') ?></span>
            <input type="range" id="koch-wpm" min="10" max="40" step="1" value="12">
            <span class="speed-value" id="koch-wpm-value">12</span> <span class="speed-unit">wpm</span>
            <span class="muted cpm-hint" id="koch-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>
    </div>

    <!-- Дополнительные параметры в Кохе (сворачиваемый спойлер) -->
    <div class="groups-extra-wrapper mt-2">
        <button type="button" class="groups-extra-btn" id="koch-extra-toggle-btn">
            <span class="groups-extra-btn-left">
                <span class="groups-extra-icon"><?= mw_icon('sliders', 14) ?></span>
                <span><?= t('groups.extra_settings') ?></span>
                <span class="badge-active-dot" id="koch-extra-active-dot" style="display:none;" title="Включены доп. параметры"></span>
            </span>
            <span class="groups-chevron" id="koch-extra-chevron">▾</span>
        </button>

        <div class="groups-extra-content subcard mt-1" id="koch-extra-content" style="display:none;">
            <div class="chip-row" style="gap:8px;">
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="koch-farnsworth-enabled"> <?= t('koch.farnsworth') ?>
                </label>
                <label class="chip" style="gap:8px;" id="koch-buffer-label">
                    <input type="checkbox" id="koch-buffer-enabled"> <?= t('groups.buffer_input') ?>
                </label>
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="koch-paper-enabled"> <?= t('groups.paper_mode') ?>
                </label>
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="koch-ready-signal-enabled" checked> <?= t('groups.ready_signal_chip') ?>
                </label>
            </div>

            <!-- Панель настройки Фарнсворта в Кохе -->
            <div id="koch-farnsworth-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('koch.farnsworth') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.farnsworth_speed_desc') ?></div>
                    </div>
                    <div class="speed-control" id="koch-farnsworth-wrap">
                        <input type="range" id="koch-farnsworth" min="5" max="30" step="1" value="10">
                        <span class="speed-value" id="koch-farnsworth-value">10</span> wpm
                        <span class="muted cpm-hint" id="koch-farnsworth-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 50]) ?></span>
                    </div>
                </div>
                <div class="muted mt-2" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                    <?= mw_icon('info', 14) ?> <?= t('koch.farnsworth_tooltip') ?>
                </div>
            </div>

            <!-- Панель настройки буфера памяти в Кохе -->
            <div id="koch-buffer-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.buffer_depth_label') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.buffer_depth_desc') ?></div>
                    </div>
                    <div class="chip-row" id="koch-buffer-depth-chips">
                        <div class="chip" data-depth="1">1 <?= t('groups.chars_short') ?></div>
                        <div class="chip" data-depth="2">2 <?= t('groups.chars_short') ?></div>
                        <div class="chip" data-depth="3">3 <?= t('groups.chars_short') ?></div>
                        <div class="chip" data-depth="4">4 <?= t('groups.chars_short') ?></div>
                        <div class="chip active" data-depth="all"><?= t('groups.buffer_depth_all') ?></div>
                    </div>
                </div>
                <div class="muted mt-2" id="koch-buffer-tip-text" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                    <?= mw_icon('info', 14) ?> <?= t('groups.buffer_tooltip') ?>
                </div>
                <div class="muted mt-1" style="font-size:11px; opacity:0.85;">
                    <?= t('groups.buffer_hint') ?>
                </div>
            </div>

            <!-- Панель настройки приёма на бумагу в Кохе -->
            <div id="koch-paper-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.paper_gap_label') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.paper_gap_desc') ?></div>
                    </div>
                    <div class="speed-control" id="koch-paper-gap-wrap">
                        <input type="range" id="koch-paper-gap" min="1" max="10" step="0.5" value="3">
                        <span class="speed-value" id="koch-paper-gap-value">3.0</span> <?= t('groups.seconds_short') ?>
                    </div>
                </div>
                <div class="muted mt-2" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                    <?= mw_icon('info', 14) ?> <?= t('groups.paper_tooltip') ?>
                </div>
            </div>

            <!-- Тон и шум эфира в Кохе -->
            <div class="subcard mt-2" style="border-left:3px solid var(--accent); width:100%; padding:12px 14px;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.extra_audio_title') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.extra_audio_desc') ?></div>
                    </div>
                    <div class="speed-control">
                        <input type="range" id="koch-tone-freq" min="300" max="1000" step="10" value="600">
                        <span class="speed-value mono" id="koch-tone-freq-value">600</span> Hz
                    </div>
                </div>
                <div class="flex-between flex-wrap gap-2 mt-2" style="align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                    <div class="muted" style="font-size:12px;"><?= t('groups.cw_noise_title') ?>:</div>
                    <div class="chip-row" id="koch-cw-noise-chips" style="gap:6px;">
                        <div class="chip chip-sm active" data-noise="0"><?= t('acc.cw_noise_off') ?></div>
                        <div class="chip chip-sm" data-noise="0.035"><?= t('acc.cw_noise_low') ?></div>
                        <div class="chip chip-sm" data-noise="0.07"><?= t('acc.cw_noise_med') ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button class="btn btn-primary mt-2" id="start-session" title="<?= t('common.shortcut_enter') ?>"><?= t('koch.start_session') ?> <kbd class="btn-kbd">Enter</kbd></button>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between flex-wrap gap-1">
        <div class="muted mono" style="white-space:nowrap;"><?= t('koch.group_label') ?> <span id="group-index">1</span> / <span id="group-total">20</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="koch-lamp"></div>
            <button class="btn btn-sm" id="koch-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn" title="F7"><?= t('koch.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="koch-signal"></div>

    <!-- Режим приёма на бумагу: индикатор воспроизведения / паузы -->
    <div id="koch-paper-session-display" style="display:none; text-align:center; padding:24px 0;">
        <div class="flex gap-1" style="align-items:center; justify-content:center; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--accent); font-weight:700;"><?= mw_icon('notebook', 16) ?> <?= t('groups.paper_mode') ?></div>
        <div id="koch-paper-status-msg" class="flex gap-1" style="align-items:center; justify-content:center; font-size:22px; color:var(--text); font-weight:700; margin-top:8px;"><?= mw_icon('headphones', 22) ?> <?= t('groups.paper_listening') ?></div>
        <div id="koch-paper-sub-msg" class="muted mt-2" style="font-size:14px; min-height:24px;"></div>
        <div id="koch-paper-progress-wrap" style="max-width:320px; margin:16px auto 0; background:rgba(255,255,255,0.08); height:6px; border-radius:3px; overflow:hidden; display:none;">
            <div id="koch-paper-progress-bar" style="width:100%; height:100%; background:var(--accent); transition:width 0.1s linear;"></div>
        </div>
    </div>

    <input type="text" id="koch-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('koch.answer_placeholder')) ?>" autocomplete="off">

    <!-- Экранная клавиатура — только на телефонах/планшетах -->
    <div class="vkb mt-2" id="koch-vkb" style="display:none;"></div>

    <div class="btn-row mt-2" id="koch-submit-row">
        <button class="btn btn-primary" id="submit-answer"><?= t('koch.check') ?> <kbd class="btn-kbd">Enter</kbd></button>
        <button class="btn" id="koch-stop-btn" type="button"><?= t('groups.words_stop') ?> <kbd class="btn-kbd">Esc</kbd></button>
    </div>

    <div class="btn-row mt-2" id="koch-paper-controls-row" style="display:none;">
        <button class="btn" id="koch-paper-stop-btn" type="button"><?= t('groups.words_stop') ?> <kbd class="btn-kbd">Esc</kbd></button>
    </div>

    <div class="feedback mt-3" id="koch-feedback" style="margin-top:24px;"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('koch.result_title') ?></h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('koch.result_accuracy') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('koch.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('koch.result_xp') ?></span></div>
    </div>
    <div class="feedback mt-2 show" id="result-message"></div>

    <!-- Блок радиограммы для проверки записи на бумагу -->
    <div id="koch-paper-result-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:16px;">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <h4 class="mt-0" style="color:var(--accent);"><?= t('groups.paper_radiogram_title') ?></h4>
            <button class="btn btn-sm" id="koch-paper-copy-btn" type="button"><?= mw_icon('copy', 14) ?> <?= t('common.copy') ?></button>
        </div>
        <div class="muted mt-1" style="font-size:12px;"><?= t('groups.paper_radiogram_desc') ?></div>
        <pre id="koch-paper-radiogram-text" style="background:var(--surface); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:12px; font-family:var(--font-mono); font-size:16px; letter-spacing:2px; line-height:1.8; margin-top:10px; white-space:pre-wrap; word-break:break-word;"></pre>
    </div>
    
    <div class="card mt-2" id="mistakes-block" style="display:none; background:var(--surface-2);">
        <p class="mt-0" style="font-size:14px;"><?= t('groups.mistakes_hint') ?></p>
        <button class="btn btn-primary" id="retrain-mistakes-btn"><?= t('groups.retrain_mistakes') ?><span id="mistake-count">0</span>)</button>
    </div>

    <!-- Деликатная рекомендация тренировки проблемной пары -->
    <div class="card mt-2" id="pair-prompt-block" style="display:none; background:var(--surface-2); border-left:3px solid var(--accent); padding:12px 16px;">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <div>
                <div style="font-weight:700; font-size:13px; color:var(--accent);"><?= mw_icon('zap', 14) ?> <?= t('groups.pair_prompt_title') ?></div>
                <div class="muted mt-1" style="font-size:12px;" id="pair-prompt-text"></div>
            </div>
            <button class="btn btn-sm btn-primary" id="pair-prompt-btn" type="button"><?= t('groups.pair_prompt_btn') ?></button>
        </div>
    </div>

    <div class="card mt-2" id="koch-daily-time-block" style="display:none; background:var(--surface-2); padding:10px 14px; text-align:center; font-size:13px; color:var(--text-muted);">
        <span id="koch-daily-time-text"></span>
        <div class="muted mt-1" style="font-size:11px;"><?= t('groups.daily_time_change_hint') ?></div>
    </div>

    <button class="btn btn-primary mt-2" id="restart-btn" title="<?= t('common.shortcut_enter') ?>"><?= t('koch.new_session') ?> <kbd class="btn-kbd">Enter</kbd></button>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

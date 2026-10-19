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

    <div class="groups-speed-bar mt-2">
        <div class="speed-control" id="cs-wpm-control">
            <span class="speed-label"><?= t('cs.speed') ?></span>
            <input type="range" id="cs-wpm" min="5" max="45" step="1" value="12">
            <span class="speed-value" id="cs-wpm-value">12</span> <span class="speed-unit">wpm</span>
            <span class="muted cpm-hint" id="cs-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>
    </div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <label class="chip"><?= t('cs.per_session') ?>
            <select id="cs-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="5" selected>5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option><option value="50">50</option>
            </select>
        </label>
    </div>

    <!-- Дополнительные параметры в Позывных (сворачиваемый спойлер) -->
    <div class="groups-extra-wrapper mt-2">
        <button type="button" class="groups-extra-btn" id="cs-extra-toggle-btn">
            <span class="groups-extra-btn-left">
                <span class="groups-extra-icon"><?= mw_icon('sliders', 14) ?></span>
                <span><?= t('groups.extra_settings') ?></span>
                <span class="badge-active-dot" id="cs-extra-active-dot" style="display:none;" title="Включены доп. параметры"></span>
            </span>
            <span class="groups-chevron" id="cs-extra-chevron">▾</span>
        </button>

        <div class="groups-extra-content subcard mt-1" id="cs-extra-content" style="display:none;">
            <div class="chip-row" style="gap:8px;">
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="cs-farnsworth-enabled"> <?= t('groups.farnsworth') ?>
                </label>
                <label class="chip" style="gap:8px;" id="cs-buffer-label">
                    <input type="checkbox" id="cs-buffer-enabled"> <?= t('groups.buffer_input') ?>
                </label>
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="cs-paper-enabled"> <?= t('groups.paper_mode') ?>
                </label>
                <label class="chip" style="gap:8px;">
                    <input type="checkbox" id="cs-ready-signal-enabled"> <?= t('groups.ready_signal_chip') ?>
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
                        <span class="muted cpm-hint" id="cs-farnsworth-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 50]) ?></span>
                    </div>
                </div>
                <div class="muted mt-2" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                    <?= mw_icon('info', 14) ?> <?= t('koch.farnsworth_tooltip') ?>
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
                    <?= mw_icon('info', 14) ?> <?= t('groups.buffer_tooltip') ?>
                </div>
                <div class="muted mt-1" style="font-size:11px; opacity:0.85;">
                    <?= t('groups.buffer_hint') ?>
                </div>
            </div>

            <!-- Панель настройки приёма на бумагу в Позывных -->
            <div id="cs-paper-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); width:100%;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.paper_gap_label') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.paper_gap_desc') ?></div>
                    </div>
                    <div class="speed-control" id="cs-paper-gap-wrap">
                        <input type="range" id="cs-paper-gap" min="1" max="10" step="0.5" value="3">
                        <span class="speed-value" id="cs-paper-gap-value">3.0</span> <?= t('groups.seconds_short') ?>
                    </div>
                </div>
                <div class="muted mt-2" style="font-size:12px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                    <?= mw_icon('info', 14) ?> <?= t('groups.paper_tooltip') ?>
                </div>
            </div>

            <!-- Тон и шум эфира в Позывных -->
            <div class="subcard mt-2" style="border-left:3px solid var(--accent); width:100%; padding:12px 14px;">
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.extra_audio_title') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.extra_audio_desc') ?></div>
                    </div>
                    <div class="speed-control">
                        <input type="range" id="cs-tone-freq" min="300" max="1000" step="10" value="600">
                        <span class="speed-value mono" id="cs-tone-freq-value">600</span> Hz
                    </div>
                </div>
                <div class="flex-between flex-wrap gap-2 mt-2" style="align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                    <div>
                        <div style="font-weight:700; font-size:13px;"><?= t('groups.volume_title') ?></div>
                        <div class="muted" style="font-size:11px; margin-top:2px;"><?= t('groups.volume_desc') ?></div>
                    </div>
                    <div class="speed-control">
                        <input type="range" id="cs-volume" min="0" max="100" step="5" value="80">
                        <span class="speed-value mono" id="cs-volume-value">80</span> %
                    </div>
                </div>
                <div class="flex-between flex-wrap gap-2 mt-2" style="align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                    <div class="muted" style="font-size:12px;"><?= t('groups.cw_noise_title') ?>:</div>
                    <div class="chip-row" id="cs-cw-noise-chips" style="gap:6px;">
                        <div class="chip chip-sm active" data-noise="0"><?= t('acc.cw_noise_off') ?></div>
                        <div class="chip chip-sm" data-noise="0.035"><?= t('acc.cw_noise_low') ?></div>
                        <div class="chip chip-sm" data-noise="0.07"><?= t('acc.cw_noise_med') ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button class="btn btn-primary mt-2" id="start-session" title="<?= t('common.shortcut_enter') ?>"><?= t('cs.start_session') ?> <kbd class="btn-kbd">Enter</kbd></button>
    <div class="feedback mt-2" id="setup-error"></div>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between flex-wrap gap-1">
        <div class="muted mono" style="white-space:nowrap;"><?= t('cs.callsign_label') ?> <span id="cs-index">1</span> / <span id="cs-total">5</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="cs-lamp"></div>
            <button class="btn btn-sm" id="cs-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn" title="F7"><?= t('cs.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>

    <!-- Режим приёма на бумагу: индикатор воспроизведения / паузы -->
    <div id="cs-paper-session-display" style="display:none; text-align:center; padding:24px 0;">
        <div class="flex gap-1" style="align-items:center; justify-content:center; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--accent); font-weight:700;"><?= mw_icon('notebook', 16) ?> <?= t('groups.paper_mode') ?></div>
        <div id="cs-paper-status-msg" class="flex gap-1" style="align-items:center; justify-content:center; font-size:22px; color:var(--text); font-weight:700; margin-top:8px;"><?= mw_icon('headphones', 22) ?> <?= t('groups.paper_listening') ?></div>
        <div id="cs-paper-sub-msg" class="muted mt-2" style="font-size:14px; min-height:24px;"></div>
        <div id="cs-paper-progress-wrap" style="max-width:320px; margin:16px auto 0; background:rgba(255,255,255,0.08); height:6px; border-radius:3px; overflow:hidden; display:none;">
            <div id="cs-paper-progress-bar" style="width:100%; height:100%; background:var(--accent); transition:width 0.1s linear;"></div>
        </div>
    </div>

    <input type="text" id="cs-answer" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('cs.answer_placeholder')) ?>" autocomplete="off">
    <div class="btn-row mt-2" id="cs-submit-row">
        <button class="btn btn-primary" id="submit-answer"><?= t('cs.check') ?> <kbd class="btn-kbd">Enter</kbd></button>
        <button class="btn" id="cs-stop-btn" type="button"><?= t('groups.words_stop') ?> <kbd class="btn-kbd">Esc</kbd></button>
    </div>

    <div class="btn-row mt-2" id="cs-paper-controls-row" style="display:none;">
        <button class="btn" id="cs-paper-stop-btn" type="button"><?= t('groups.words_stop') ?> <kbd class="btn-kbd">Esc</kbd></button>
    </div>

    <div class="vkb mt-2" id="cs-vkb" style="display:none;"></div>
    <div class="feedback mt-3" id="cs-feedback" style="margin-top:24px;"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3><?= t('cs.result_title') ?></h3>
    <div class="grid grid-3 mt-1" id="cs-standard-stat-grid">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label"><?= t('cs.result_exact') ?></span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label"><?= t('cs.result_correct') ?></span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label"><?= t('cs.result_xp') ?></span></div>
    </div>

    <!-- Блок радиограммы для проверки записи на бумагу -->
    <div id="cs-paper-result-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:16px;">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <h4 class="mt-0" style="color:var(--accent);"><?= t('cs.paper_log_title') ?></h4>
            <button class="btn btn-sm" id="cs-paper-copy-btn" type="button"><?= mw_icon('copy', 14) ?> <?= t('common.copy') ?></button>
        </div>
        <div class="muted mt-1" style="font-size:12px;"><?= t('cs.paper_log_desc') ?></div>
        <pre id="cs-paper-radiogram-text" style="background:var(--surface); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:12px; font-family:var(--font-mono); font-size:15px; letter-spacing:1px; line-height:1.8; margin-top:10px; white-space:pre-wrap; word-break:break-word;"></pre>
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

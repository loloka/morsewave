<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

$pageTitle = t('cs.title');
$activePage = 'callsigns';
$pageScript = 'callsigns.js';

$currentUser = !empty($pdo) ? current_user($pdo) : null;
$defaultCall = 'R9O';
if (!empty($currentUser['name'])) {
    $cand = trim(strtoupper($currentUser['name']));
    // Проверяем: валидный радиолюбительский позывной:
    // Префикс (1-2 буквы или цифра+буква), цифра района, суффикс (1-4 буквы)
    // Примеры: R9O, R9OLD, UA3AAA, K1N, 4X4DK, 9A1A.
    // Без пробелов и кириллицы
    if (preg_match('/^([A-Z]{1,2}\d[A-Z]{1,4}|[0-9][A-Z]\d[A-Z]{1,4})(\/[A-Z0-9]{1,4})?$/i', $cand)) {
        $defaultCall = $cand;
    }
}

include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('cs.eyebrow') ?></div>
<h1><?= t('cs.h1') ?></h1>
<div id="live-daily-timer-mount"></div>
<p><?= t('cs.intro') ?></p>

<div class="card mt-3" id="setup-panel">
    <h3><?= t('cs.settings') ?></h3>

    <!-- Выбор режима: 2 основных режима -->
    <div class="mt-2">
        <div class="muted" style="font-size:12px; margin-bottom:6px;"><?= t('cs.mode_title') ?></div>
        <div class="chip-row flex-wrap" id="cs-mode-chips" style="gap:8px;">
            <div class="chip active" data-mode="standard"><?= mw_icon('headphones', 14) ?> <?= t('cs.mode_standard') ?></div>
            <div class="chip" data-mode="contest"><?= mw_icon('radio', 14) ?> <?= t('cs.mode_contest') ?></div>
        </div>
    </div>

    <!-- Режим Спринта (адаптивная скорость RufzXP) внутри Тренировки позывных -->
    <div id="cs-sprint-toggle-wrap" class="subcard mt-2" style="border-left:3px solid var(--accent); padding:10px 14px;">
        <label class="chip" style="gap:8px; font-weight:700; cursor:pointer;">
            <input type="checkbox" id="cs-sprint-enabled"> <?= mw_icon('zap', 14) ?> <?= t('cs.mode_sprint_toggle') ?>
        </label>
        <div class="muted mt-1" id="cs-sprint-desc" style="font-size:12px; line-height:1.4;">
            <?= t('cs.mode_sprint_desc') ?>
        </div>
    </div>

    <!-- Выбор базы / регионов позывных -->
    <div class="mt-3" id="cs-region-controls">
        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
            <span class="muted" style="font-size:12px;"><?= t('cs.filter_regions') ?></span>
            <button type="button" class="btn btn-sm btn-ghost" id="cs-custom-regions-toggle" style="font-size:12px; padding:2px 8px;">
                <?= t('cs.filter_custom_btn') ?>
            </button>
        </div>
        <div class="chip-row flex-wrap mt-1" id="cs-preset-chips" style="gap:8px;">
            <div class="chip active" data-preset="ru"><?= t('cs.preset_ru') ?></div>
            <div class="chip" data-preset="ru_asia"><?= t('cs.preset_ru_asia') ?></div>
            <div class="chip" data-preset="world"><?= t('cs.preset_world') ?></div>
        </div>

        <div id="cs-custom-regions-panel" class="subcard mt-2" style="display:none; border-left:3px solid var(--accent); padding:10px 14px;">
            <div class="chip-row flex-wrap" style="gap:8px;">
                <label class="chip"><input type="checkbox" class="cs-reg-check" value="russia" checked> <?= t('cs.reg_russia') ?></label>
                <label class="chip"><input type="checkbox" class="cs-reg-check" value="central_asia"> <?= t('cs.reg_central_asia') ?></label>
                <label class="chip"><input type="checkbox" class="cs-reg-check" value="japan"> <?= t('cs.reg_japan') ?></label>
                <label class="chip"><input type="checkbox" class="cs-reg-check" value="north_america"> <?= t('cs.reg_north_america') ?></label>
                <label class="chip"><input type="checkbox" class="cs-reg-check" value="europe"> <?= t('cs.reg_europe') ?></label>
            </div>
            <div class="mt-2" style="border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                <label class="chip"><input type="checkbox" id="cs-short-only"> <?= t('cs.short_calls_only') ?></label>
            </div>
        </div>
    </div>

    <!-- Параметры для режима Контеста -->
    <div id="cs-contest-setup-wrap" class="subcard mt-3" style="display:none; border-left:3px solid var(--accent); padding:12px 14px;">
        <div class="flex-wrap gap-3" style="align-items:center;">
            <label style="font-size:13px; font-weight:700;">
                <?= t('cs.contest_my_call') ?>
                <input type="text" id="cs-contest-mycall" class="answer-input mono" style="width:130px; text-transform:uppercase; margin-left:6px; padding:4px 8px; font-size:14px;" value="<?= htmlspecialchars($defaultCall) ?>" data-default-call="<?= htmlspecialchars($defaultCall) ?>" maxlength="10">
            </label>
            <div class="muted" style="font-size:12px;">
                Формат обмена: RST <b>599</b> (авто) + порядковый номер QSO
            </div>
        </div>
        <div class="mt-2" style="border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
            <label class="chip" style="gap:8px; font-size:12px; cursor:pointer;">
                <input type="checkbox" id="cs-contest-detune" checked> <?= t('cs.contest_detune_label') ?>
            </label>
            <div class="muted mt-1" style="font-size:11px; margin-left:26px;"><?= t('cs.contest_detune_hint') ?></div>
        </div>
        <div class="mt-2" style="border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
            <label class="chip" style="gap:8px; font-size:12px; cursor:pointer;">
                <input type="checkbox" id="cs-contest-cut-numbers" checked> <?= t('cs.contest_cut_numbers_label') ?>
            </label>
            <div class="muted mt-1" style="font-size:11px; margin-left:26px;"><?= t('cs.contest_cut_numbers_hint') ?></div>
        </div>
    </div>

    <div class="groups-speed-bar mt-3">
        <div class="speed-control" id="cs-wpm-control">
            <span class="speed-label"><?= t('cs.speed') ?></span>
            <input type="range" id="cs-wpm" min="5" max="45" step="1" value="12">
            <span class="speed-value" id="cs-wpm-value">12</span> <span class="speed-unit">wpm</span>
            <span class="muted cpm-hint" id="cs-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 60]) ?></span>
        </div>
    </div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;" id="cs-count-wrapper">
        <label class="chip"><?= t('cs.per_session') ?>
            <select id="cs-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option><option value="50" selected>50</option><option value="100">100</option><option value="999">∞</option>
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
    <div class="flex-between flex-wrap gap-1" id="cs-session-header">
        <div class="muted mono" id="cs-session-counter" style="white-space:nowrap;"><?= t('cs.callsign_label') ?> <span id="cs-index">1</span> / <span id="cs-total">5</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="cs-lamp"></div>
            <button class="btn btn-sm" id="cs-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn" title="F7"><?= t('cs.replay') ?> <span style="opacity: 0.6; font-size: 0.9em; margin-left: 4px;">[F7]</span></button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>

    <style>
        .cs-hk-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 10px;
            align-items: stretch;
            margin: 12px 0;
        }
        .cs-hk-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--surface-2, rgba(255,255,255,0.06));
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text);
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }
        .cs-hk-btn:hover {
            background: var(--surface-3, rgba(255,255,255,0.14));
            border-color: var(--accent);
            color: var(--accent);
            transform: translateY(-1px);
        }
        .cs-hk-btn:active {
            transform: translateY(0);
        }
        .cs-hk-btn .btn-kbd {
            background: rgba(255,255,255,0.12);
            color: var(--accent);
            font-size: 11px;
            font-weight: 700;
            padding: 2px 5px;
            border-radius: 4px;
            font-family: var(--font-mono);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .cs-hk-desc {
            opacity: 0.75;
            font-weight: 400;
            font-size: 11px;
            margin-left: 2px;
        }
        @media (max-width: 640px) {
            .cs-hk-grid {
                gap: 6px;
            }
            .cs-hk-btn {
                padding: 6px 8px;
                font-size: 11px;
                flex: 1 1 calc(50% - 6px);
                justify-content: center;
            }
            .cs-contest-inputs-row {
                flex-direction: column;
                align-items: stretch !important;
                gap: 8px;
            }
            .cs-contest-inputs-subrow {
                display: flex;
                gap: 6px;
                width: 100%;
            }
            #cs-contest-rst { width: 55px !important; }
            #cs-contest-sent-nr { width: 55px !important; }
            #cs-contest-recv-nr { flex: 1 !important; width: auto !important; }
            #cs-contest-log-table { font-size: 11px; }
            #cs-contest-log-table th, #cs-contest-log-table td { padding: 4px 6px; }
        }
    </style>

    <!-- Виджет контеста: статусная строка, поля ввода и аппаратный журнал в стиле соревнований -->
    <div id="cs-contest-session-display" style="display:none; margin-top:10px;">
        <div class="flex-between flex-wrap gap-2 subcard" style="align-items:center; padding:10px 14px;">
            <div class="mono" style="font-size:14px; display:flex; align-items:center; gap:8px;">
                <span class="badge" style="background:var(--accent); color:#000; font-weight:700; font-size:11px; padding:2px 7px; border-radius:4px;">CONTEST</span>
                <b>CQ DE</b> <span id="cs-contest-live-mycall" style="color:var(--accent); font-weight:700;">R9O</span>
            </div>
            <div class="flex flex-wrap gap-3 mono" style="font-size:13px; align-items:center;">
                <span>QSO: <b id="cs-contest-live-qsos">0</b></span>
                <span>Rate: <b id="cs-contest-live-rate">0</b>/h</span>
                <span>⏱ <b id="cs-contest-live-timer">00:00</b></span>
                <span>XP: <b id="cs-contest-live-xp" style="color:var(--accent);">0</b></span>
                <span id="cs-contest-live-rit" class="muted" style="font-size:12px; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">RIT: 0 Hz</span>
            </div>
        </div>

        <div class="flex-wrap gap-2 mt-2 cs-contest-inputs-row" style="align-items:center;">
            <div style="flex:2; min-width:140px; position:relative; display:flex; align-items:center;">
                <input type="text" id="cs-contest-call" class="answer-input mono" placeholder="<?= htmlspecialchars(t('cs.contest_call_placeholder')) ?>" style="width:100%; text-transform:uppercase; font-size:18px; font-weight:700;" autocomplete="off">
                <span id="cs-contest-dupe-badge" class="badge" style="display:none; position:absolute; right:8px; background:#ef4444; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; pointer-events:none; z-index:2;">⚠️ DUPE</span>
            </div>
            <div class="cs-contest-inputs-subrow flex gap-2" style="align-items:center;">
                <input type="text" id="cs-contest-rst" class="answer-input mono text-center" value="599" style="width:70px; opacity:0.85; font-size:16px; cursor:default;" readonly title="Рапорт 599 ставится автоматически">
                <input type="text" id="cs-contest-sent-nr" class="answer-input mono text-center" value="001" style="width:70px; opacity:0.85; font-size:16px; cursor:default;" readonly title="Ваш исходящий номер">
                <input type="text" id="cs-contest-recv-nr" class="answer-input mono text-center" placeholder="<?= htmlspecialchars(t('cs.contest_nr_placeholder')) ?>" style="width:120px; font-size:18px; font-weight:700;" autocomplete="off">
            </div>
        </div>

        <!-- Горячие клавиши контеста -->
        <div class="cs-hk-grid mt-2" id="cs-contest-hotkeys-toolbar">
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f1" title="F1 — Общий вызов CQ"><kbd class="btn-kbd">F1</kbd> <span>CQ</span> <span class="cs-hk-desc">(Вызов)</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f2" title="F2 — Контрольный номер (Exchange): рапорт 599 и порядковый номер"><kbd class="btn-kbd">F2</kbd> <span>Номер (Exch)</span> <span class="cs-hk-desc">(599 №)</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f3" title="F3 — Завершить и зачесть связь (TU — Thank You)"><kbd class="btn-kbd">F3</kbd> <span>Зачёт (TU)</span> <span class="cs-hk-desc">(Спасибо)</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f4" title="F4 — Передать свой позывной"><kbd class="btn-kbd">F4</kbd> <span>Мой call</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f5" title="F5 — Передать позывной корреспондента"><kbd class="btn-kbd">F5</kbd> <span>Его call</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f6" title="F6 — Запросить повтор номера (?)"><kbd class="btn-kbd">F6</kbd> <span>?</span> <span class="cs-hk-desc">(Повтор AGN)</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-f7" title="F7 — Повторить свой контрольный номер"><kbd class="btn-kbd">F7</kbd> <span>Повтор 599 №</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-enter" title="Enter — Умный авто-шаг (ESM: вызов → номер → зачёт TU)"><kbd class="btn-kbd">Enter</kbd> <span>Авто-шаг (ESM)</span></button>
            <button type="button" class="btn btn-sm cs-hk-btn" id="cs-key-esc" title="Esc — Прервать воспроизведение звука"><kbd class="btn-kbd">Esc</kbd> <span>Стоп звук</span></button>
        </div>
        <div class="subcard mt-2" style="font-size:12px; line-height:1.5; padding:10px 14px; background:rgba(0,0,0,0.2);">
            <div style="font-weight:700; color:var(--accent); margin-bottom:4px;">💡 Пояснения и алгоритм соревнований (ESM — Enter Sends Message):</div>
            <div>• <b>Exch (Exchange)</b> — контрольный номер (рапорт RST 599 + порядковый номер связи).</div>
            <div>• <b>TU (Thank You)</b> — благодарность за связь, фиксация QSO в журнале и начисление очков.</div>
            <div class="mt-1"><b>Быстрый цикл связи:</b></div>
            <div><b>1.</b> <kbd>Enter</kbd> или <kbd>F1</kbd> — общий вызов (<b>CQ</b>).</div>
            <div><b>2.</b> Принимаем позывной корреспондента, пишем в первое поле.</div>
            <div><b>3.</b> Нажимаем <kbd>Enter</kbd> (или <kbd>F2</kbd>) — передаём <b>Exch</b> (599 и наш порядковый номер).</div>
            <div><b>4.</b> Корреспондент передаёт свой номер. Вводим его во второе поле. Если не расслышали — <kbd>F6</kbd> (повтор <b>?</b>).</div>
            <div><b>5.</b> Нажимаем <kbd>Enter</kbd> (или <kbd>F3</kbd>) — <b>TU</b> (зачёт связи в аппаратный журнал, начисление XP). Фокус сразу вернётся в поле позывного.</div>
            <div class="muted mt-1" style="font-size:11px;">Клавиши <kbd>Space</kbd> / <kbd>Tab</kbd> быстро переключают фокус между позывным и номером. <kbd>Esc</kbd> глушит звук.</div>
        </div>

        <!-- Аппаратный журнал контеста (Live QSO Log) -->
        <div id="cs-contest-log-wrap" class="mt-3 subcard" style="padding:12px; border-left:3px solid var(--accent);">
            <div class="flex-between flex-wrap gap-2" style="align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; margin-bottom:8px;">
                <span style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--accent);">
                    <?= mw_icon('list', 14) ?> <?= t('cs.contest_log_title') ?>
                </span>
                <span class="muted" style="font-size:12px;" id="cs-contest-log-count">0 связей</span>
            </div>
            <div style="overflow-x:auto; max-height:240px; overflow-y:auto; -webkit-overflow-scrolling:touch; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
                <table style="width:100%; font-family:var(--font-mono); font-size:13px; border-collapse:collapse;" id="cs-contest-log-table">
                    <thead>
                        <tr style="text-align:left; border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted); font-size:11px; text-transform:uppercase;">
                            <th style="padding:4px 8px; width:45px;">#</th>
                            <th style="padding:4px 8px; width:70px;">Время</th>
                            <th style="padding:4px 8px;">Позывной</th>
                            <th style="padding:4px 8px; width:90px;">RST/Отпр</th>
                            <th style="padding:4px 8px; width:150px;">RST/Принят</th>
                            <th style="padding:4px 8px; width:120px; text-align:right;">Очки (XP)</th>
                        </tr>
                    </thead>
                    <tbody id="cs-contest-log-body">
                        <tr id="cs-contest-log-empty">
                            <td colspan="6" class="muted text-center" style="padding:14px; font-style:italic;">
                                <?= t('cs.contest_log_empty') ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="btn-row mt-3">
                <button class="btn btn-sm btn-primary" id="cs-contest-finish-btn" type="button">
                    <?= mw_icon('check-circle', 14) ?> <?= t('cs.contest_finish_btn') ?>
                </button>
            </div>
        </div>
    </div>

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

    <!-- Результаты Спринта позывных и график скорости -->
    <div id="cs-rufz-result-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:16px;">
        <h4 class="mt-0" style="color:var(--accent);">Спринт позывных</h4>
        <div class="grid grid-3 mt-2">
            <div class="stat"><span class="value" id="cs-rufz-score">0</span><span class="label"><?= t('cs.rufz_hst_score') ?></span></div>
            <div class="stat"><span class="value" id="cs-rufz-peak">0</span><span class="label"><?= t('cs.rufz_peak_wpm') ?></span></div>
            <div class="stat"><span class="value" id="cs-rufz-avg">0</span><span class="label"><?= t('cs.rufz_avg_wpm') ?></span></div>
        </div>
        <div class="muted mt-2" style="font-size:12px;">Динамика скорости WPM по позывным сессии:</div>
        <div id="cs-rufz-chart-wrap" class="mt-2" style="width:100%; height:140px; background:var(--surface); border:1px solid rgba(255,255,255,0.08); border-radius:6px; overflow:hidden;">
            <svg id="cs-rufz-svg" width="100%" height="100%" viewBox="0 0 500 140" style="display:block;"></svg>
        </div>
    </div>

    <!-- Контест результаты -->
    <div id="cs-contest-result-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:16px;">
        <h4 class="mt-0" style="color:var(--accent);">Итоги соревнований (Contest mode)</h4>
        <div class="grid grid-3 mt-2">
            <div class="stat"><span class="value" id="cs-contest-res-qsos">0</span><span class="label"><?= t('cs.contest_qsos') ?></span></div>
            <div class="stat"><span class="value" id="cs-contest-res-rate">0</span><span class="label"><?= t('cs.contest_rate') ?></span></div>
            <div class="stat"><span class="value" id="cs-contest-res-time">00:00</span><span class="label"><?= t('cs.contest_time') ?></span></div>
        </div>
        <div class="mt-2 text-center" style="font-size:15px; font-weight:700; color:var(--accent);">
            Начислено опыта: +<span id="cs-contest-res-xp">0</span> XP
        </div>
    </div>

    <!-- Отработка ошибок (как в Группах) -->
    <div class="card mt-2" id="cs-mistakes-block" style="display:none; background:var(--surface-2);">
        <p class="mt-0" style="font-size:14px;"><?= t('groups.mistakes_hint') ?></p>
        <button class="btn btn-primary" id="cs-retrain-mistakes-btn" type="button">
            <?= t('cs.retrain_mistakes') ?><span id="cs-mistake-count">0</span>)
        </button>
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

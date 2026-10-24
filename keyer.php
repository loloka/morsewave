<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/auth.php';

$pageTitle = t('keyer.page_title');
$activePage = 'keyer';
$pageScript = 'keyhardware.js';
$extraScripts = ['timinglab.js'];

include __DIR__ . '/includes/header.php';
?>

<link rel="stylesheet" href="<?= asset_v('assets/css/keyhardware.css') ?>">

<div class="hardware-hero">
    <div class="hardware-callsign-badge">
        <span>⚡</span> R9OGL HARDWARE EDITION · v1.7.2 BETA
    </div>
    <h1><?= t('keyer.hero_title') ?></h1>
    <p class="muted mt-0" style="font-size: 16px; max-width: 860px; line-height: 1.6;">
        <?= t('keyer.hero_desc') ?>
    </p>

    <!-- Совместимость браузеров (Chromium WebSerial) -->
    <div style="background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 12px; padding: 12px 18px; margin-top: 14px; max-width: 860px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 13.5px; line-height: 1.5;">
            <span style="font-size: 20px;">🌐</span>
            <div>
                <strong style="color: #60a5fa;"><?= t('keyer.browsers_supported') ?></strong>
                <span style="color: var(--text);"><?= t('keyer.browsers_desc') ?></span>
            </div>
        </div>
        <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #f87171; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 10px; border-radius: 6px;">
            <span>❌</span> <?= t('keyer.browsers_unsupported') ?>
        </div>
    </div>

    <!-- Верхний баннер быстрого перехода к сборке ключа своими руками -->
    <div style="background: linear-gradient(90deg, rgba(79, 216, 196, 0.12) 0%, rgba(232, 163, 61, 0.08) 100%); border: 1px solid rgba(79, 216, 196, 0.35); border-radius: 12px; padding: 12px 18px; margin-top: 14px; max-width: 860px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🛠️</span>
            <div>
                <strong style="color: var(--text); font-size: 14px;"><?= t('keyer.banner_diy_title') ?></strong>
                <div style="font-size: 13px; color: var(--text-muted);"><?= t('keyer.banner_diy_desc') ?></div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <a href="donate.php" class="btn btn-secondary" style="white-space: nowrap; font-size: 13px; font-weight: 700; padding: 7px 14px; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; border-color: rgba(232, 163, 61, 0.45); color: #e8a33d;">
                <span>💖</span> <?= t('keyer.banner_donate') ?>
            </a>
            <a href="#diy-keyer" class="btn btn-primary" style="white-space: nowrap; font-size: 13px; font-weight: 700; padding: 7px 16px; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                <?= t('keyer.banner_diy_btn') ?>
            </a>
        </div>
    </div>

    
    <!-- Баннер боевого симулятора Вторжение-2: Радиоперехват -->
    <div style="background: linear-gradient(90deg, rgba(0, 255, 102, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%); border: 1px solid rgba(0, 255, 102, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 14px; max-width: 860px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">🎯</span>
            <div>
                <strong style="color: #00ff66; font-size: 15px;"><?= t('invaders.promo_in_keyer') ?></strong>
                <div style="font-size: 13px; color: var(--text-muted);"><?= t('invaders.promo_in_keyer_desc') ?></div>
            </div>
        </div>
        <a href="invaders.php" class="btn btn-primary" style="white-space: nowrap; font-size: 13.5px; font-weight: 700; padding: 8px 18px; text-decoration: none; border-radius: 6px; background: #00ff66; color: #030604; border: none; box-shadow: 0 0 14px rgba(0, 255, 102, 0.4);">
            <?= t('invaders.promo_in_keyer_btn') ?>
        </a>
    </div>

    <!-- Информационная плашка подключения -->
    <div class="hardware-connect-info-card" style="background: rgba(79, 216, 196, 0.06); border: 1px solid rgba(79, 216, 196, 0.25); border-radius: 12px; padding: 16px 20px; margin-top: 18px; max-width: 860px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #4fd8c4; font-size: 15px;">
                <span>🔌</span> <?= t('keyer.info_title') ?>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: #f87171; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 6px; letter-spacing: 0.04em;">
                <?= t('keyer.info_in_dev') ?>
            </span>
        </div>
        <div style="font-size: 14px; color: var(--text); line-height: 1.6;">
            <?= t('keyer.info_desc_main') ?>
            <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <a href="keydocs.php?doc=sketch" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(79, 216, 196, 0.15); border: 1px solid #4fd8c4; color: #4fd8c4; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 13px; text-decoration: none;">
                    <span>💻</span> <?= t('keyer.info_open_sketch') ?>
                </a>
                <a href="keydocs.php?download=sketch" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.2); color: var(--text); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; text-decoration: none;">
                    <span>📥</span> <?= t('keyer.info_download_ino') ?>
                </a>
            </div>
        </div>
        <div style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            <?= t('keyer.info_paddle_support') ?>
        </div>
    </div>
</div>

<!-- =========================================================
     РАБОЧАЯ ПАНЕЛЬ: ЭМУЛЯТОР OLED + WEBSERIAL ТЕЛЕМЕТРИЯ
     ========================================================= -->
<div class="keyer-workspace-grid">
    
    <!-- Левая колонка: Виртуальный OLED 0.96" SSD1306 -->
    <div class="oled-card">
        <div class="oled-status-bar">
            <div class="key-led-wrapper">
                <div class="key-led" id="key-led-indicator" title="<?= htmlspecialchars(t('keyer.led_title')) ?>"></div>
                <span>TX KEY</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <label style="font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--text-muted);">
                    <input type="checkbox" id="sidetone-toggle">
                    <span><?= t('keyer.oled_audio_toggle') ?></span>
                </label>
                <span class="badge" style="font-family:var(--font-mono); font-size:11px; background:#11161b; color:#4fd8c4; border:1px solid #23343c;">SSD1306 FAST I2C</span>
            </div>
        </div>

        <!-- Экран OLED 128x64 (Информативный эмулятор SSD1306 Fast I2C) -->
        <div class="oled-bezel">
            <div class="oled-header-line">
                <span id="oled-wpm-text">WPM: 20</span>
                <span style="opacity:0.85; font-size:11.5px; letter-spacing:0.04em;">[CURTIS B · LATCH]</span>
                <span id="oled-pitch-text">700Hz</span>
            </div>

            <!-- Главный информативный блок: текущий напев + распознанный знак -->
            <div class="oled-main-display-row">
                <div class="oled-code-col">
                    <div class="oled-code-label"><?= t('keyer.oled_label_morse') ?></div>
                    <div class="oled-morse-code" id="oled-morse-display">- READY -</div>
                </div>
                <div class="oled-char-col">
                    <div class="oled-char-label"><?= t('keyer.oled_label_char') ?></div>
                    <div class="oled-char-badge" id="oled-last-char">_</div>
                </div>
            </div>

            <!-- Бегущая строка радиограммы с кнопкой очистки -->
            <div class="oled-footer-row">
                <div class="oled-footer-ticker" id="oled-ticker-text">
                    TXT: VVV = R9OGL KEYER ONLINE
                </div>
                <button type="button" id="btn-clear-oled" class="oled-clear-btn" title="<?= htmlspecialchars(t('keyer.oled_clear_tooltip')) ?>">
                    ✕
                </button>
            </div>
        </div>
        
        <!-- Блок живой метрологии и параметров тайминга -->
        <div class="oled-subcard-telemetry" style="margin-top:16px; background:#040608; border:1px solid #1c232a; border-radius:10px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">
                <span><?= t('keyer.metro_title') ?></span>
                <span style="color:#4fd8c4; font-family:var(--font-mono); font-size:11px;"><?= t('keyer.metro_standard') ?></span>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; text-align:center; font-family:var(--font-mono);">
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;"><?= t('keyer.metro_dit') ?></div>
                    <div id="val-dit-ms" style="font-size:13px; font-weight:700; color:#4fd8c4; margin-top:2px;">60 <?= t('js.common.ms') ?? 'ms' ?></div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;"><?= t('keyer.metro_dah') ?></div>
                    <div id="val-dah-ms" style="font-size:13px; font-weight:700; color:#e8a33d; margin-top:2px;">180 <?= t('js.common.ms') ?? 'ms' ?></div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;"><?= t('keyer.metro_char_pause') ?></div>
                    <div id="val-char-pause-ms" style="font-size:13px; font-weight:700; color:var(--text); margin-top:2px;">180 <?= t('js.common.ms') ?? 'ms' ?></div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;"><?= t('keyer.metro_word_pause') ?></div>
                    <div id="val-word-pause-ms" style="font-size:13px; font-weight:700; color:var(--text-muted); margin-top:2px;">420 <?= t('js.common.ms') ?? 'ms' ?></div>
                </div>
            </div>

            <div style="margin-top:8px; font-size:11px; color:var(--text-faint); text-align:center; font-family:var(--font-mono); border-top:1px dashed #1a222c; padding-top:6px;">
                <?= t('keyer.metro_formula') ?>
            </div>

            <!-- Архитектурные подсказки с понятным объяснением -->
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px; font-size:12px;">
                <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);" title="<?= htmlspecialchars(t('keyer.metro_curtis_tip')) ?>">
                    <span style="color:#4fd8c4;">⏱</span>
                    <span><b><?= t('keyer.metro_curtis_title') ?></b> <?= t('keyer.metro_curtis_desc') ?></span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);" title="<?= htmlspecialchars(t('keyer.metro_memory_tip')) ?>">
                    <span style="color:#e8a33d;">🧠</span>
                    <span><b><?= t('keyer.metro_memory_title') ?></b> <?= t('keyer.metro_memory_desc') ?></span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);" title="<?= htmlspecialchars(t('keyer.metro_debounce_tip')) ?>">
                    <span style="color:#60a5fa;">🛡️</span>
                    <span><b><?= t('keyer.metro_debounce_title') ?></b> <?= t('keyer.metro_debounce_desc') ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Правая колонка: Подключение по USB и Телеметрия -->
    <div class="connect-panel">
        
        <!-- Кнопка подключения -->
        <div class="card" style="padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);"><?= t('keyer.card_arduino') ?></span>
                <span id="serial-status-badge" class="badge" style="font-size:12px; border-color:var(--border);"><?= t('keyer.status_disconnected') ?></span>
            </div>
            
            <button id="btn-connect-serial" class="btn-usb-connect" style="width:100%;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span><?= t('keyer.btn_connect') ?></span>
            </button>
            <div style="font-size:11px; color:var(--text-faint); margin-top:8px; text-align:center; line-height:1.4;">
                <?= t('keyer.engine_notice') ?>
            </div>
        </div>

        <!-- Датчики скорости и тона -->
        <div class="telemetry-gauges">
            <div class="gauge-box">
                <span class="gauge-title"><?= t('keyer.gauge_wpm') ?></span>
                <span class="gauge-value" id="gauge-wpm-value">20</span>
                <div class="gauge-bar-track">
                    <div class="gauge-bar-fill wpm" id="gauge-wpm-bar" style="width: 20%;"></div>
                </div>
            </div>

            <div class="gauge-box">
                <span class="gauge-title"><?= t('keyer.gauge_pitch') ?></span>
                <span class="gauge-value" id="gauge-pitch-value">700</span>
                <div class="gauge-bar-track">
                    <div class="gauge-bar-fill pitch" id="gauge-pitch-bar" style="width: 37%;"></div>
                </div>
            </div>
        </div>

        <!-- Консоль Serial терминала -->
        <div class="serial-terminal-card">
            <div class="terminal-header">
                <span><?= t('keyer.terminal_title') ?></span>
                <button id="btn-clear-terminal" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;"><?= t('keyer.terminal_clear') ?></button>
            </div>
            <div class="terminal-log-box" id="terminal-log-stream">
                <span class="log-sys"><?= t('keyer.terminal_initial_sys') ?></span>
            </div>
        </div>

    </div>

</div>

<!-- =========================================================
     ЭХО-ТРЕНАЖЕР: ПРОВЕРКА ПЕРЕДАЧИ В РЕАЛЬНОМ ВРЕМЕНИ (CW PRO)
     ========================================================= -->
<div class="keyer-echo-test">
    <div class="echo-header-bar" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div>
            <div class="card-eyebrow"><?= t('keyer.echo_eyebrow') ?></div>
            <h2 style="margin:0;"><?= t('keyer.echo_title') ?></h2>
        </div>
        <div class="echo-stats-pill" style="display:inline-flex; align-items:center; gap:10px; background:var(--surface-2); border:1px solid var(--border); padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600;">
            <span><?= t('keyer.echo_streak') ?> <b id="echo-streak-val" style="color:var(--signal);">0</b> 🔥</span>
            <span style="opacity:0.4;">·</span>
            <span><?= t('keyer.echo_copied') ?> <b id="echo-score-val" style="color:var(--accent);">0</b></span>
        </div>
    </div>

    <!-- Переключатель режима и категорий -->
    <div class="echo-controls-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; background:var(--surface-2); padding:10px 14px; border-radius:10px; border:1px solid var(--border);">
        <div class="echo-mode-switch" style="display:inline-flex; gap:6px;">
            <button type="button" class="btn echo-mode-btn active" data-mode="echo" id="btn-mode-echo" style="font-size:12px; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer;">
                <?= t('keyer.echo_mode_audio') ?>
            </button>
            <button type="button" class="btn echo-mode-btn" data-mode="visual" id="btn-mode-visual" style="font-size:12px; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; background:transparent; border:1px solid transparent; color:var(--text-muted);">
                <?= t('keyer.echo_mode_visual') ?>
            </button>
        </div>

        <div style="display:inline-flex; align-items:center; gap:8px;">
            <label for="echo-category-select" style="font-size:12px; color:var(--text-muted); font-weight:600; margin:0;"><?= t('keyer.echo_category_label') ?></label>
            <select id="echo-category-select" style="font-size:12px; padding:5px 10px; background:#0b0f12; color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer;">
                <option value="callsigns" selected><?= t('keyer.echo_cat_callsigns') ?></option>
                <option value="qcodes"><?= t('keyer.echo_cat_qcodes') ?></option>
                <option value="contest"><?= t('keyer.echo_cat_contest') ?></option>
                <option value="groups"><?= t('keyer.echo_cat_groups') ?></option>
            </select>
        </div>
    </div>

    <p class="muted" id="echo-instructions-text" style="margin-top:0; font-size:14px;">
        <?= t('keyer.echo_instructions') ?>
    </p>

    <!-- Поле цели и кнопки управления -->
    <div class="echo-target-line" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
        <div style="display:inline-flex; align-items:baseline; gap:10px;">
            <span style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;"><?= t('keyer.echo_target_label') ?></span>
            <span id="echo-target-text" style="letter-spacing:2px;">R9OGL</span>
        </div>
        <div style="display:inline-flex; align-items:center; gap:8px;">
            <button id="btn-toggle-echo" class="btn btn-primary" style="font-size:12px; padding:6px 14px; background:#10b981; color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                <span>▶</span> <span id="echo-toggle-label"><?= t('keyer.echo_btn_start') ?></span>
            </button>
            <button id="btn-play-echo" class="btn btn-secondary" style="font-size:12px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px;" title="<?= htmlspecialchars(t('keyer.echo_play_tip')) ?>">
                <span>🔊</span> <span><?= t('keyer.echo_btn_repeat') ?></span>
            </button>
            <button id="btn-reset-echo" class="btn btn-secondary" style="font-size:12px; padding:6px 12px;" title="<?= htmlspecialchars(t('keyer.echo_reset_tip')) ?>">
                ⌫ <?= t('keyer.echo_btn_reset') ?>
            </button>
            <button id="btn-next-echo" class="btn btn-secondary" style="font-size:12px; padding:6px 14px;">
                <?= t('keyer.echo_btn_next') ?>
            </button>
        </div>
    </div>

    <div style="margin-top:14px;">
        <span style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;"><?= t('keyer.echo_user_label') ?></span>
        <div class="echo-user-result" id="echo-result-text" style="letter-spacing:2px;"><?= t('keyer.echo_user_prompt') ?></div>
    </div>
</div>

<!-- =========================================================
     ЛАБОРАТОРИЯ ТАЙМИНГОВ И АНАЛИЗАТОР ПАУЗ 3T / 7T (ITU / PARIS)
     ========================================================= -->
<div class="keyer-timing-lab" id="keyer-timing-lab">
    <div class="timing-lab-header">
        <div>
            <div class="card-eyebrow" style="color:#4fd8c4;"><?= t('keyer.timing_eyebrow') ?></div>
            <h2 style="margin:0 0 6px;"><?= t('keyer.timing_title') ?></h2>
            <p class="muted" style="margin:0; font-size:14px; max-width:820px; line-height:1.5;">
                <?= t('keyer.timing_desc') ?>
            </p>
        </div>
        <div style="display:inline-flex; align-items:center; gap:10px;">
            <div class="timing-badge-status" id="timing-status-badge"><?= t('keyer.timing_status_ready') ?></div>
            <button id="btn-timing-start" class="btn btn-primary" style="font-size:12px; padding:7px 16px; background:#10b981; color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                <span>▶</span> <span><?= t('keyer.timing_btn_start') ?></span>
            </button>
            <button id="btn-timing-reset" class="btn btn-secondary" style="font-size:12px; padding:7px 12px;" title="<?= htmlspecialchars(t('keyer.timing_reset_tip')) ?>">
                ↺ <?= t('keyer.timing_btn_reset') ?>
            </button>
        </div>
    </div>

    <!-- Панель выбора контрольного текста -->
    <div class="timing-presets-bar">
        <div style="display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:12px; color:var(--text-muted); font-weight:700; text-transform:uppercase;"><?= t('keyer.timing_preset_label') ?></span>
            <button type="button" class="timing-preset-btn active" data-preset="paris"><?= t('keyer.timing_preset_paris') ?></button>
            <button type="button" class="timing-preset-btn" data-preset="contest"><?= t('keyer.timing_preset_contest') ?></button>
            <button type="button" class="timing-preset-btn" data-preset="russian"><?= t('keyer.timing_preset_russian') ?></button>
            <button type="button" class="timing-preset-btn" data-preset="custom"><?= t('keyer.timing_preset_custom') ?></button>
        </div>
        <div id="timing-class-badge" style="font-size:13px; font-weight:700;">
            <span style="color:var(--text-muted);"><?= t('keyer.timing_accuracy_label') ?> <b id="timing-badge-pct" style="color:#4fd8c4;">--%</b> <?= t('keyer.timing_waiting') ?></span>
        </div>
    </div>

    <!-- Поле ввода своего текста (скрыто по умолчанию) -->
    <div id="timing-custom-wrap" style="display:none; align-items:center; gap:8px; margin-bottom:14px; background:#0b0f15; padding:8px 12px; border-radius:8px; border:1px solid #1c2633;">
        <input type="text" id="timing-custom-input" placeholder="<?= htmlspecialchars(t('keyer.timing_custom_ph')) ?>" style="flex:1; background:#111822; border:1px solid #253342; color:#fff; padding:6px 10px; border-radius:6px; font-family:var(--font-mono); font-size:13px; text-transform:uppercase;">
        <button type="button" id="btn-apply-custom" class="btn btn-secondary" style="font-size:12px; padding:6px 14px; font-weight:700; color:#4fd8c4;"><?= t('keyer.timing_custom_apply') ?></button>
    </div>

    <!-- Блок отображения цели с токенами знаков -->
    <div class="timing-target-card">
        <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom:6px; letter-spacing:0.05em;"><?= t('keyer.timing_target_bar_title') ?></div>
        <div class="timing-target-chars" id="timing-target-chars">
            <!-- Токены генерируются JS -->
        </div>
    </div>

    <!-- Сетка из 4 индикаторов-метров -->
    <div class="timing-gauges-grid">
        <!-- 1. Соотношение Тире / Точка -->
        <div class="timing-gauge-card">
            <div class="timing-gauge-title"><?= t('keyer.timing_gauge_ratio_title') ?></div>
            <div class="timing-gauge-value" id="gauge-ratio-val">3.00×</div>
            <div class="timing-gauge-sub"><?= t('keyer.timing_gauge_ratio_norm') ?></div>
            <div class="timing-gauge-track">
                <div class="timing-gauge-fill" id="gauge-ratio-bar" style="width:50%;"></div>
            </div>
            <div class="timing-gauge-status" id="gauge-ratio-status">
                <span style="color:#10b981;"><?= t('keyer.timing_gauge_ratio_perfect') ?></span>
            </div>
        </div>

        <!-- 2. Межзнаковая пауза 3T -->
        <div class="timing-gauge-card">
            <div class="timing-gauge-title"><?= t('keyer.timing_gauge_char_title') ?></div>
            <div class="timing-gauge-value" id="gauge-char-pause-val">3.0T (180 <?= t('js.common.ms') ?? 'ms' ?>)</div>
            <div class="timing-gauge-sub"><?= t('keyer.timing_gauge_char_norm') ?></div>
            <div class="timing-gauge-track">
                <div class="timing-gauge-fill" id="gauge-char-pause-bar" style="width:50%;"></div>
            </div>
            <div class="timing-gauge-status" id="gauge-char-pause-status">
                <span style="color:#10b981;"><?= t('keyer.timing_gauge_char_perfect') ?></span>
            </div>
        </div>

        <!-- 3. Межсловная пауза 7T -->
        <div class="timing-gauge-card">
            <div class="timing-gauge-title"><?= t('keyer.timing_gauge_word_title') ?></div>
            <div class="timing-gauge-value" id="gauge-word-pause-val">7.0T (420 <?= t('js.common.ms') ?? 'ms' ?>)</div>
            <div class="timing-gauge-sub"><?= t('keyer.timing_gauge_word_norm') ?></div>
            <div class="timing-gauge-track">
                <div class="timing-gauge-fill" id="gauge-word-pause-bar" style="width:50%;"></div>
            </div>
            <div class="timing-gauge-status" id="gauge-word-pause-status">
                <span style="color:#10b981;"><?= t('keyer.timing_gauge_word_perfect') ?></span>
            </div>
        </div>

        <!-- 4. Скорость и класс руки -->
        <div class="timing-gauge-card">
            <div class="timing-gauge-title"><?= t('keyer.timing_gauge_speed_title') ?></div>
            <div class="timing-gauge-value" id="timing-wpm-val" style="color:#4fd8c4;">20 WPM</div>
            <div class="timing-gauge-sub"><?= t('keyer.timing_gauge_actual_pace') ?> <b id="timing-cpm-val">~100 <?= t('js.common.cpm') ?? 'cpm' ?></b></div>
            <div class="timing-gauge-track">
                <div class="timing-gauge-fill" id="timing-score-bar" style="width:96%; background:#4fd8c4;"></div>
            </div>
            <div class="timing-gauge-status">
                <?= t('keyer.timing_gauge_accuracy_status') ?> <b id="timing-score-val" style="color:#10b981; margin-left:4px;">100%</b>
            </div>
        </div>
    </div>

    <!-- Холст таймлайна (осциллограмма передачи) -->
    <div class="timing-timeline-wrap">
        <div class="timing-timeline-header">
            <span><?= t('keyer.timing_timeline_title') ?></span>
            <span style="color:#4fd8c4;"><?= t('keyer.timing_timeline_clock') ?></span>
        </div>
        <canvas id="timing-canvas" height="80"></canvas>
    </div>

    <!-- Журнал посимвольного судейского аудита -->
    <div class="timing-audit-wrap">
        <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom:8px; display:flex; justify-content:space-between;">
            <span><?= t('keyer.timing_audit_title') ?></span>
            <span style="color:var(--text-muted);"><?= t('keyer.timing_audit_rule') ?></span>
        </div>
        <table class="timing-audit-table">
            <thead>
                <tr>
                    <th><?= t('keyer.timing_col_char') ?></th>
                    <th><?= t('keyer.timing_col_ratio') ?></th>
                    <th><?= t('keyer.timing_col_pause') ?></th>
                    <th><?= t('keyer.timing_col_verdict') ?></th>
                    <th><?= t('keyer.timing_col_score') ?></th>
                </tr>
            </thead>
            <tbody id="timing-audit-body">
                <tr>
                    <td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">
                        <?= t('keyer.timing_empty_prompt') ?>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- =========================================================
     СПЕЦИФИКАЦИЯ И НАЧИНКА КЛЮЧА
     ========================================================= -->
<div class="mt-5">
    <div class="card-eyebrow"><?= t('keyer.specs_eyebrow') ?></div>
    <h2><?= t('keyer.specs_title') ?></h2>
    <p class="muted">
        <?= t('keyer.specs_intro') ?>
    </p>

    <div class="specs-grid">
        <div class="spec-item">
            <div class="spec-item-icon">⚡</div>
            <div class="spec-item-title"><?= t('keyer.spec_curtis_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_curtis_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🛡️</div>
            <div class="spec-item-title"><?= t('keyer.spec_debounce_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_debounce_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🎛</div>
            <div class="spec-item-title"><?= t('keyer.spec_pots_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_pots_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🔊</div>
            <div class="spec-item-title"><?= t('keyer.spec_audio_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_audio_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">📟</div>
            <div class="spec-item-title"><?= t('keyer.spec_oled_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_oled_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🧠</div>
            <div class="spec-item-title"><?= t('keyer.spec_decoder_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_decoder_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🎯</div>
            <div class="spec-item-title"><?= t('keyer.spec_latch_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_latch_desc') ?>
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">⏱️</div>
            <div class="spec-item-title"><?= t('keyer.spec_threshold_title') ?></div>
            <div class="spec-item-desc">
                <?= t('keyer.spec_threshold_desc') ?>
            </div>
        </div>
    </div>

    <!-- Выделенный шоукейс фабричной печатной платы (полная ширина, без пустых мест в сетке характеристик) -->
    <div class="card mt-3" style="background:linear-gradient(135deg, rgba(14,20,26,0.98), rgba(9,12,16,0.98)); border:1px solid rgba(79,216,196,0.3); border-radius:14px; padding:22px; position:relative; overflow:hidden;">
        <div class="pcb-showcase-grid">
            <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                    <span style="font-size:11px; font-weight:800; color:#4fd8c4; background:rgba(79,216,196,0.12); border:1px solid rgba(79,216,196,0.3); padding:3px 8px; border-radius:4px; letter-spacing:0.06em; text-transform:uppercase;">
                        <?= t('keyer.pcb_badge_platform') ?>
                    </span>
                    <span style="font-size:11px; font-weight:800; color:#fff; background:#dc2626; border:1px solid #ef4444; padding:3px 8px; border-radius:4px; letter-spacing:0.06em; text-transform:uppercase; box-shadow:0 0 10px rgba(220,38,38,0.4);">
                        <?= t('keyer.pcb_badge_dev') ?>
                    </span>
                </div>
                <h3 style="margin:0 0 8px; font-size:18px; color:#4fd8c4;">
                    <?= t('keyer.pcb_title') ?>
                </h3>
                <p class="muted" style="font-size:14px; line-height:1.6; margin:0 0 14px;">
                    <?= t('keyer.pcb_desc') ?>
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:11px; margin-bottom:16px;">
                    <span class="badge" style="background:rgba(79,216,196,0.1); color:#4fd8c4; border:1px solid rgba(79,216,196,0.3);">100% THT Classic (0 SMD)</span>
                    <span class="badge" style="background:rgba(96,165,250,0.1); color:#60a5fa; border:1px solid rgba(96,165,250,0.3);"><?= t('keyer.pcb_badge_drc') ?></span>
                    <span class="badge" style="background:rgba(232,163,61,0.1); color:#e8a33d; border:1px solid rgba(232,163,61,0.3);"><?= t('keyer.pcb_badge_gnd') ?></span>
                    <span class="badge" style="background:rgba(168,85,247,0.1); color:#c084fc; border:1px solid rgba(168,85,247,0.3);"><?= t('keyer.pcb_badge_pots') ?></span>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <a href="keydocs.php?doc=pcb" class="btn btn-secondary" style="font-size:13px; display:inline-flex; align-items:center; gap:6px; padding:7px 16px; font-weight:700;">
                        <span>🏭</span> <?= t('keyer.pcb_btn_docs') ?>
                    </a>
                    <a href="donate.php" class="btn" style="background:rgba(232,163,61,0.15); color:#e8a33d; border:1px solid rgba(232,163,61,0.45); font-size:13px; display:inline-flex; align-items:center; gap:6px; padding:7px 16px; font-weight:700; text-decoration:none; border-radius:6px;">
                        <span>🛠️</span> <?= t('keyer.pcb_btn_donate') ?>
                    </a>
                </div>
            </div>

            <!-- Правая колонка: интерактивный просмотр 3D платы -->
            <div style="background:#06080a; border:1px solid rgba(79,216,196,0.25); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <span style="font-size:11px; color:var(--text-muted); font-weight:600;"><?= t('keyer.pcb_view_label') ?></span>
                    <div style="display:inline-flex; gap:6px;">
                        <button type="button" id="btn-pcb-top" onclick="setPcbView('top')" style="font-size:11px; padding:3px 10px; border-radius:6px; font-weight:700; cursor:pointer; background:#162330; border:1px solid #4fd8c4; color:#4fd8c4; transition:all 0.2s ease;">
                            <?= t('keyer.pcb_view_top') ?>
                        </button>
                        <button type="button" id="btn-pcb-iso" onclick="setPcbView('iso')" style="font-size:11px; padding:3px 10px; border-radius:6px; font-weight:600; cursor:pointer; background:transparent; border:1px solid #233140; color:var(--text-muted); transition:all 0.2s ease;">
                            <?= t('keyer.pcb_view_iso') ?>
                        </button>
                    </div>
                </div>

                <div style="position:relative; border-radius:6px; overflow:hidden; background:#040608;">
                    <img id="pcb-preview-img" src="<?= asset_v('assets/img/morsewave_pro_3d_top.png') ?>" data-top="<?= asset_v('assets/img/morsewave_pro_3d_top.png') ?>" data-iso="<?= asset_v('assets/img/morsewave_pro_3d_iso.png') ?>" alt="Плата MorseWave Pro v2.0 (100% THT)" style="width:100%; height:auto; display:block; transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                </div>
            </div>
        </div>

        <script>
        function setPcbView(view) {
            var img = document.getElementById('pcb-preview-img');
            var btnTop = document.getElementById('btn-pcb-top');
            var btnIso = document.getElementById('btn-pcb-iso');
            if (!img) return;
            if (view === 'iso') {
                img.src = img.getAttribute('data-iso');
                btnIso.style.background = '#162330';
                btnIso.style.borderColor = '#4fd8c4';
                btnIso.style.color = '#4fd8c4';
                btnIso.style.fontWeight = '700';
                btnTop.style.background = 'transparent';
                btnTop.style.borderColor = '#233140';
                btnTop.style.color = 'var(--text-muted)';
                btnTop.style.fontWeight = '600';
            } else {
                img.src = img.getAttribute('data-top');
                btnTop.style.background = '#162330';
                btnTop.style.borderColor = '#4fd8c4';
                btnTop.style.color = '#4fd8c4';
                btnTop.style.fontWeight = '700';
                btnIso.style.background = 'transparent';
                btnIso.style.borderColor = '#233140';
                btnIso.style.color = 'var(--text-muted)';
                btnIso.style.fontWeight = '600';
            }
        }
        </script>
    </div>

    <!-- Сравнение с китайским MX-K2 -->
    <div class="card mt-4" style="background:#090d11; border:1px solid #1c232a; border-radius:14px; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
            <div>
                <div class="card-eyebrow" style="color:#e8a33d;"><?= t('keyer.compare_eyebrow') ?></div>
                <h3 style="margin:0;"><?= t('keyer.compare_title') ?></h3>
            </div>
            <span style="font-size:12px; font-weight:600; background:#161f28; color:#4fd8c4; border:1px solid #233140; padding:4px 12px; border-radius:12px;">
                <?= t('keyer.compare_badge') ?>
            </span>
        </div>

        <p class="muted" style="font-size:14px; margin-top:0; margin-bottom:18px;">
            <?= t('keyer.compare_desc') ?>
        </p>

        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead>
                    <tr style="border-bottom:1px solid #233140; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
                        <th style="padding:10px 12px;"><?= t('keyer.comp_col_param') ?></th>
                        <th style="padding:10px 12px; color:var(--text-muted); width:35%;"><?= t('keyer.comp_col_mxk2') ?></th>
                        <th style="padding:10px 12px; color:#4fd8c4; width:45%;"><?= t('keyer.comp_col_mwpro') ?></th>
                    </tr>
                </thead>
                <tbody style="line-height:1.5;">
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row1_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row1_mxk2') ?></td>
                        <td style="padding:12px; color:#4fd8c4; font-weight:600;"><?= t('keyer.comp_row1_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row2_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row2_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row2_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row3_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row3_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row3_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row4_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row4_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row4_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row5_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row5_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row5_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row6_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row6_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row6_mwpro') ?></td>
                    </tr>
                    <tr style="border-bottom:1px solid #141a21;">
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row7_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row7_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row7_mwpro') ?></td>
                    </tr>
                    <tr>
                        <td style="padding:12px; font-weight:600; color:var(--text);"><?= t('keyer.comp_row8_param') ?></td>
                        <td style="padding:12px; color:var(--text-muted);"><?= t('keyer.comp_row8_mxk2') ?></td>
                        <td style="padding:12px; color:var(--text);"><?= t('keyer.comp_row8_mwpro') ?></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Блок "Где взять ключ / Сборка своими руками" -->
    <div id="diy-keyer" class="card mt-4" style="background:#090d11; border:1px solid #1c232a; border-radius:14px; padding:24px; scroll-margin-top: 80px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
            <div>
                <div class="card-eyebrow" style="color:#4fd8c4;"><?= t('keyer.diy_eyebrow') ?></div>
                <h3 style="margin:0 0 6px;"><?= t('keyer.diy_title') ?></h3>
                <p class="muted" style="margin:0; font-size:14px; max-width:820px; line-height:1.6;">
                    <?= t('keyer.diy_desc') ?>
                </p>
            </div>
            <span style="font-size:11px; font-weight:800; color:#fff; background:#dc2626; border:1px solid #ef4444; padding:4px 10px; border-radius:6px; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap;">
                <?= t('keyer.info_in_dev') ?>
            </span>
        </div>

        <!-- Сетка полезных ссылок и гайдов (встроенный центр документации сайта) -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin-top:16px;">
            <a href="keydocs.php?doc=guide" style="text-decoration:none; display:flex; flex-direction:column; gap:4px; background:#0f151c; border:1px solid #222f3d; padding:14px 16px; border-radius:10px; transition:border-color 0.2s ease;" onmouseover="this.style.borderColor='#4fd8c4'" onmouseout="this.style.borderColor='#222f3d'">
                <div style="font-weight:700; color:#4fd8c4; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>📘</span> <?= t('keyer.diy_guide_title') ?>
                </div>
                <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
                    <?= t('keyer.diy_guide_desc') ?>
                </div>
            </a>

            <a href="keydocs.php?doc=wiring" style="text-decoration:none; display:flex; flex-direction:column; gap:4px; background:#0f151c; border:1px solid #222f3d; padding:14px 16px; border-radius:10px; transition:border-color 0.2s ease;" onmouseover="this.style.borderColor='#4fd8c4'" onmouseout="this.style.borderColor='#222f3d'">
                <div style="font-weight:700; color:#4fd8c4; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>🔌</span> <?= t('keyer.diy_wiring_title') ?>
                </div>
                <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
                    <?= t('keyer.diy_wiring_desc') ?>
                </div>
            </a>

            <a href="keydocs.php?doc=schematic" style="text-decoration:none; display:flex; flex-direction:column; gap:4px; background:#0f151c; border:1px solid #222f3d; padding:14px 16px; border-radius:10px; transition:border-color 0.2s ease;" onmouseover="this.style.borderColor='#4fd8c4'" onmouseout="this.style.borderColor='#222f3d'">
                <div style="font-weight:700; color:#4fd8c4; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>📐</span> <?= t('keyer.diy_schematic_title') ?>
                </div>
                <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
                    <?= t('keyer.diy_schematic_desc') ?>
                </div>
            </a>

            <a href="keydocs.php?doc=sketch" style="text-decoration:none; display:flex; flex-direction:column; gap:4px; background:#0f151c; border:1px solid #222f3d; padding:14px 16px; border-radius:10px; transition:border-color 0.2s ease;" onmouseover="this.style.borderColor='#4fd8c4'" onmouseout="this.style.borderColor='#222f3d'">
                <div style="font-weight:700; color:#e8a33d; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>💻</span> <?= t('keyer.diy_sketch_title') ?>
                </div>
                <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
                    <?= t('keyer.diy_sketch_desc') ?>
                </div>
            </a>

            <a href="keydocs.php?doc=pcb" style="text-decoration:none; display:flex; flex-direction:column; gap:4px; background:#0f151c; border:1px solid #222f3d; padding:14px 16px; border-radius:10px; transition:border-color 0.2s ease;" onmouseover="this.style.borderColor='#4fd8c4'" onmouseout="this.style.borderColor='#222f3d'">
                <div style="font-weight:700; color:#a78bfa; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <span>🏭</span> <?= t('keyer.diy_pcb_title') ?>
                </div>
                <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
                    <?= t('keyer.diy_pcb_desc') ?>
                </div>
            </a>
        </div>

        <!-- Нижняя плашка центра документации -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:18px; padding-top:14px; border-top:1px dashed #1c2633;">
            <div style="font-size:13px; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                <span>🛠️</span>
                <span><?= t('keyer.docs_footer_note') ?></span>
            </div>
            <a href="keydocs.php" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:8px; font-size:13px;">
                <span>📚</span>
                <span><?= t('keyer.docs_footer_btn') ?></span>
            </a>
        </div>

        <!-- Баннер поддержки разработки ключа -->
        <div class="card mt-4" style="background: linear-gradient(135deg, rgba(232, 163, 61, 0.1) 0%, rgba(79, 216, 196, 0.08) 100%); border: 1px solid rgba(232, 163, 61, 0.35); border-radius: 14px; padding: 22px 26px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 18px;">
                <div style="display: flex; align-items: flex-start; gap: 16px; max-width: 720px;">
                    <span style="font-size: 32px; line-height: 1;">🛠️</span>
                    <div>
                        <div style="font-size: 11px; font-weight: 800; color: #e8a33d; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">
                            <?= t('keyer.fund_eyebrow') ?>
                        </div>
                        <h3 style="margin: 0 0 6px; font-size: 18px; color: var(--text);">
                            <?= t('keyer.fund_title') ?>
                        </h3>
                        <div style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6;">
                            <?= t('keyer.fund_desc') ?>
                        </div>
                    </div>
                </div>
                <a href="donate.php" class="btn" style="background: var(--accent); color: #111; font-weight: 700; font-size: 14px; padding: 11px 22px; white-space: nowrap; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(232, 163, 61, 0.25);">
                    <span>💖</span>
                    <span><?= t('keyer.fund_btn') ?></span>
                </a>
            </div>
        </div>
    </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

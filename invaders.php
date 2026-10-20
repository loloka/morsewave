<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/auth.php';

$pageTitle = t('invaders.title');
$activePage = 'invaders';
$pageScript = 'invaders.js';

include __DIR__ . '/includes/header.php';
?>

<link rel="stylesheet" href="<?= asset_v('assets/css/invaders.css') ?>">

<div class="card-eyebrow"><?= t('invaders.radar_badge') ?></div>
<div class="flex-between flex-wrap gap-2" style="align-items: center; margin-bottom: 6px;">
    <div>
        <h1 style="margin: 0; font-family: var(--font-mono, monospace); letter-spacing: 0.04em; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span><?= t('invaders.title') ?></span>
            <span class="badge-beta" style="font-size: 11.5px; vertical-align: middle;">BETA</span>
        </h1>
        <p class="muted mt-1 mb-0" style="font-size: 14.5px; max-width: 780px;">
            <?= t('invaders.subtitle') ?>
        </p>
    </div>
    <div>
        <a href="keyer.php" class="btn btn-secondary btn-sm" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            <?= mw_icon('zap', 14) ?> <span>Хаб ключа MorseWave Pro →</span>
        </a>
    </div>
</div>

<!-- Информационная плашка: Режим в разработке -->
<div class="alert alert-info mt-3 mb-3" style="background: rgba(79, 216, 196, 0.06); border: 1px solid rgba(79, 216, 196, 0.25); border-radius: 10px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
    <div style="display: flex; align-items: center; gap: 10px; font-size: 13.5px;">
        <span style="font-size: 18px;">⚡</span>
        <div>
            <strong style="color: #4fd8c4;"><?= t('invaders.dev_banner_title') ?></strong>
            <span style="color: var(--text-muted);"><?= t('invaders.dev_banner_desc') ?></span>
        </div>
    </div>
    <span style="font-size: 11px; font-weight: 800; color: #f87171; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 6px; letter-spacing: 0.04em; white-space: nowrap;">
        ⚡ В РАЗРАБОТКЕ
    </span>
</div>

<!-- =========================================================
     ТЕРМИНАЛ: CRT РАДАР ПЕРЕХВАТА
     ========================================================= -->
<div class="invaders-terminal-wrap">
    
    <!-- Верхняя статусная строка -->
    <div class="invaders-top-bar">
        <div class="invaders-brand">
            <span class="invaders-radar-blip"></span>
            <span>MORSEWAVE PRO KEY AIR DEFENSE · SECTOR P1-RADAR</span>
        </div>
        <div class="invaders-serial-ctrl">
            <div class="invaders-pro-status hidden" id="invaders-pro-badge">
                <span>⚡</span>
                <span>MORSEWAVE PRO ACTIVE</span>
            </div>
            <button id="btn-serial-connect" class="invaders-btn-serial" type="button">
                <?= t('invaders.connect_key') ?>
            </button>
        </div>
    </div>

    <!-- HUD Боевых параметров -->
    <div class="invaders-hud-panel">
        <div class="hud-tile hud-hp" id="hud-hp-tile">
            <span class="hud-label"><?= t('invaders.base_integrity') ?></span>
            <span class="hud-value" id="hud-hp-val">100%</span>
        </div>
        <div class="hud-tile" id="hud-wave-tile">
            <span class="hud-label"><?= t('invaders.wave') ?></span>
            <span class="hud-value" id="hud-wave-val">1</span>
        </div>
        <div class="hud-tile" id="hud-score-tile">
            <span class="hud-label"><?= t('invaders.score') ?></span>
            <span class="hud-value" id="hud-score-val">0</span>
        </div>
        <div class="hud-tile hud-combo" id="hud-combo-tile">
            <span class="hud-label"><?= t('invaders.combo') ?></span>
            <span class="hud-value" id="hud-combo-val">0x</span>
        </div>
        <div class="hud-tile" id="hud-crit-tile">
            <span class="hud-label"><?= t('invaders.critical') ?></span>
            <span class="hud-value" id="hud-crit-val">0</span>
        </div>
    </div>

    <!-- CRT Экран кинескопа с Canvas -->
    <div class="invaders-screen-bezel" id="invaders-screen-bezel">
        <canvas id="invaders-radar-canvas" class="invaders-canvas"></canvas>
        <div class="invaders-scanlines"></div>
        <div class="invaders-vignette"></div>
        <div class="invaders-crit-flash" id="invaders-crit-flash"></div>
        <div class="invaders-glitch-overlay" id="invaders-glitch-overlay"></div>
        
        <!-- Тактический всплывающий баннер волны и связи -->
        <div class="invaders-tactical-banner hidden" id="invaders-tactical-banner">
            <div class="tactical-banner-title" id="tactical-banner-title">WAVE 1 // SECTOR ENGAGED</div>
            <div class="tactical-banner-sub" id="tactical-banner-sub">TRANSMIT TARGET CHARACTERS WITH KEY</div>
        </div>

        <div class="invaders-buffer-display" id="invaders-buffer-display">READY</div>

        <!-- Стартовый оверлей -->
        <div class="invaders-overlay-modal" id="invaders-start-overlay">
            <div class="invaders-overlay-title">РАДИОПЕРЕХВАТ: БОЕВОЙ РЕЖИМ</div>
            <div class="invaders-overlay-desc">
                Вражеские дроны и радиопомехи атакуют антенное поле базы!<br>
                Отбивайте падающие знаки <b>на телеграфном ключе</b> (удерживайте <b>ПРОБЕЛ</b>, экранную педаль или подключите <b>MorseWave Pro</b> по USB).<br><br>
                ⚡ Идеальный ритм 1:3:1 даёт <b>Критический перехват (х2 XP)</b>. Ошибки сбивают комбо!
            </div>
            <button id="btn-start-game" class="invaders-btn-start" type="button">
                <?= t('invaders.start_game') ?>
            </button>
        </div>

        <!-- Оверлей итогов боя (Дебрифинг) -->
        <div class="invaders-overlay-modal hidden" id="invaders-debrief-overlay">
            <div class="invaders-overlay-title" style="color: #ef4444;"><?= t('invaders.game_over_title') ?></div>
            <div class="debrief-stats-grid">
                <div class="debrief-stat-item">
                    <div class="d-label"><?= t('invaders.debrief_score') ?></div>
                    <div class="d-value" id="debrief-score-val">0</div>
                </div>
                <div class="debrief-stat-item">
                    <div class="d-label"><?= t('invaders.debrief_wave') ?></div>
                    <div class="d-value" id="debrief-wave-val">1</div>
                </div>
                <div class="debrief-stat-item">
                    <div class="d-label"><?= t('invaders.debrief_crits') ?></div>
                    <div class="d-value" id="debrief-crits-val">0</div>
                </div>
                <div class="debrief-stat-item debrief-xp-reward">
                    <div class="d-label"><?= t('invaders.debrief_xp') ?></div>
                    <div class="d-value" id="debrief-xp-val">+0 XP</div>
                </div>
            </div>
            <button id="btn-debrief-restart" class="invaders-btn-start" type="button">
                <?= t('invaders.debrief_restart') ?>
            </button>
        </div>
    </div>

    <!-- Нижняя консоль управления и манипулятор -->
    <div class="invaders-bottom-console">
        <div class="invaders-settings-bar">
            <div class="invaders-wpm-slider-wrap">
                <label for="invaders-wpm-slider"><?= t('invaders.wpm_label') ?></label>
                <input type="range" id="invaders-wpm-slider" min="10" max="35" step="1" value="18">
                <span class="mono" style="font-weight: 700; color: var(--crt-p1-bright);"><span id="invaders-wpm-val">18</span> WPM</span>
            </div>
            <div class="invaders-controls-hint">
                <?= t('invaders.key_space_hint') ?>
            </div>
        </div>

        <!-- Большой экранный сенсорный ключ с 3D-механикой -->
        <button id="touch-key-paddle" class="invaders-key-paddle" type="button">
            <span class="paddle-lamp"></span>
            <span><?= t('invaders.touch_key_btn') ?></span>
        </button>
    </div>
</div>

<!-- =========================================================
     РУКОВОДСТВО ОПЕРАТОРА: РАСЧЁТ ОЧКОВ И РИТМИКА МОРЗЕ
     ========================================================= -->
<div class="invaders-manual-section card mt-4">
    <div class="flex-between flex-wrap gap-2" style="align-items: center; margin-bottom: 14px;">
        <div>
            <h2 style="margin: 0; font-size: 19px; display: flex; align-items: center; gap: 8px;">
                <?= mw_icon('notebook', 20) ?>
                <span><?= t('invaders.manual_title') ?></span>
            </h2>
            <p class="muted mt-1 mb-0" style="font-size: 13.5px;">
                <?= t('invaders.manual_subtitle') ?>
            </p>
        </div>
        <div class="mono" style="font-size: 12px; color: var(--crt-p1-green, #00ff66); background: rgba(0, 255, 102, 0.08); border: 1px solid rgba(0, 255, 102, 0.25); padding: 5px 12px; border-radius: 6px;">
            PARIS: T = 1200 / WPM
        </div>
    </div>

    <!-- Таблица допусков таймингов (1:3:1) -->
    <div class="manual-timing-table-wrap">
        <table class="manual-timing-table">
            <thead>
                <tr>
                    <th>Элемент передачи</th>
                    <th>Эталонная длительность</th>
                    <th>Допустимое отклонение (Критический перехват х2)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><b><?= t('invaders.manual_el_dit') ?></b></td>
                    <td><span class="badge-timing"><?= t('invaders.manual_ideal_dit') ?></span></td>
                    <td class="timing-highlight"><?= t('invaders.manual_tol_dit') ?></td>
                </tr>
                <tr>
                    <td><b><?= t('invaders.manual_el_dah') ?></b></td>
                    <td><span class="badge-timing"><?= t('invaders.manual_ideal_dah') ?></span></td>
                    <td class="timing-highlight"><?= t('invaders.manual_tol_dah') ?></td>
                </tr>
                <tr>
                    <td><b><?= t('invaders.manual_el_pause') ?></b></td>
                    <td><span class="badge-timing"><?= t('invaders.manual_ideal_pause') ?></span></td>
                    <td><?= t('invaders.manual_tol_pause') ?></td>
                </tr>
                <tr>
                    <td><b><?= t('invaders.manual_el_finalize') ?></b></td>
                    <td><span class="badge-timing"><?= t('invaders.manual_ideal_finalize') ?></span></td>
                    <td style="color: var(--crt-p1-bright, #33ff88);"><?= t('invaders.manual_tol_finalize') ?></td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Карточки пояснений -->
    <div class="manual-cards-grid mt-3">
        <div class="manual-rule-card">
            <div class="m-card-header">
                <span class="m-card-icon">⚡</span>
                <strong><?= t('invaders.manual_rhythm_heading') ?></strong>
            </div>
            <p><?= t('invaders.manual_rhythm_text') ?></p>
        </div>

        <div class="manual-rule-card">
            <div class="m-card-header">
                <span class="m-card-icon">🔥</span>
                <strong><?= t('invaders.manual_combo_heading') ?></strong>
            </div>
            <p><?= t('invaders.manual_combo_text') ?></p>
        </div>

        <div class="manual-rule-card">
            <div class="m-card-header">
                <span class="m-card-icon">🏆</span>
                <strong><?= t('invaders.manual_xp_heading') ?></strong>
            </div>
            <p><?= t('invaders.manual_xp_text') ?></p>
        </div>

        <div class="manual-rule-card">
            <div class="m-card-header">
                <span class="m-card-icon">🛠️</span>
                <strong><?= t('invaders.manual_hardware_heading') ?></strong>
            </div>
            <p><?= t('invaders.manual_hardware_text') ?></p>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/auth.php';

$pageTitle = 'Боевой ключ MorseWave Pro · R9OGL Edition';
$activePage = 'keyer';
$pageScript = 'keyhardware.js';

include __DIR__ . '/includes/header.php';
?>

<link rel="stylesheet" href="<?= asset_v('assets/css/keyhardware.css') ?>">

<div class="hardware-hero">
    <div class="hardware-callsign-badge">
        <span>⚡</span> R9OGL HARDWARE EDITION · v1.7 BETA
    </div>
    <h1>Боевой телеграфный ключ MorseWave Pro</h1>
    <p class="muted mt-0" style="font-size: 16px; max-width: 860px; line-height: 1.6;">
        Интерактивный хаб для подключения физического манипулятора к тренажёру MorseWave через браузер по обычному USB-кабелю (WebSerial COM-порт, 115200 бод).
    </p>

    <!-- Информационная плашка подключения -->
    <div class="hardware-connect-info-card" style="background: rgba(79, 216, 196, 0.06); border: 1px solid rgba(79, 216, 196, 0.25); border-radius: 12px; padding: 16px 20px; margin-top: 18px; max-width: 860px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #4fd8c4; font-size: 15px;">
            <span>🔌</span> Как устроен и подключается ключ:
        </div>
        <div style="font-size: 14px; color: var(--text); line-height: 1.6;">
            Манипулятор подключается к компьютеру через плату <b>Arduino (Nano / Uno)</b> с открытой <a href="https://github.com/loloka/morsewave/tree/main/hardware/cw-keyer" target="_blank" style="color:#4fd8c4; font-weight:600; text-decoration:underline;">прошивкой MorseWave Pro v1.7 (GitHub) ↗</a>.
        </div>
        <div style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            Поддерживается <b>любой манипулятор</b> — двухрычажный ямбический (с упором на режим Iambic B) или однорычажное весло — через стандартный разъём <b>Jack 3.5 мм</b> (поддержка классического прямого ключа-клоподава будет добавлена в следующих версиях).
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
                <div class="key-led" id="key-led-indicator" title="KEY LED (пин D8 на Arduino)"></div>
                <span>TX KEY</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <label style="font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer; color:var(--text-muted);">
                    <input type="checkbox" id="sidetone-toggle">
                    <span>Звук в браузере</span>
                </label>
                <span class="badge" style="font-family:var(--font-mono); font-size:11px; background:#11161b; color:#4fd8c4; border:1px solid #23343c;">SSD1306 FAST I2C</span>
            </div>
        </div>

        <!-- Экран OLED 128x64 -->
        <div class="oled-bezel">
            <div class="oled-header-line">
                <span id="oled-wpm-text">WPM: 20</span>
                <span>[CW CURTIS]</span>
                <span id="oled-pitch-text">700Hz</span>
            </div>

            <div class="oled-middle-char" id="oled-morse-display">
                - READY -
            </div>

            <div class="oled-footer-ticker" id="oled-ticker-text">
                TXT: VVV = R9OGL KEYER ONLINE
            </div>
        </div>
        
        <!-- Блок живой метрологии и параметров тайминга -->
        <div class="oled-subcard-telemetry" style="margin-top:16px; background:#040608; border:1px solid #1c232a; border-radius:10px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">
                <span>Метрология тайминга элементов</span>
                <span style="color:#4fd8c4; font-family:var(--font-mono); font-size:11px;">СТАНДАРТ ITU (1:3:1)</span>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; text-align:center; font-family:var(--font-mono);">
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Точка (Dit)</div>
                    <div id="val-dit-ms" style="font-size:13px; font-weight:700; color:#4fd8c4; margin-top:2px;">60 мс</div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Тире (Dah)</div>
                    <div id="val-dah-ms" style="font-size:13px; font-weight:700; color:#e8a33d; margin-top:2px;">180 мс</div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Межзнак</div>
                    <div id="val-char-pause-ms" style="font-size:13px; font-weight:700; color:var(--text); margin-top:2px;">180 мс</div>
                </div>
                <div style="background:#0c1015; border:1px solid #1a222c; border-radius:6px; padding:8px 4px;">
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Межсловная</div>
                    <div id="val-word-pause-ms" style="font-size:13px; font-weight:700; color:var(--text-muted); margin-top:2px;">420 мс</div>
                </div>
            </div>

            <!-- Архитектурные подсказки с понятным объяснением -->
            <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px; font-size:12px;">
                <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);" title="Curtis 8044: аппаратный эталон телеграфных ключей. Автоматически формирует безупречную длину точек (1T) и тире (3T). Режим A доигрывает текущий элемент до конца.">
                    <span style="color:#4fd8c4;">⏱</span>
                    <span><b>Тайминг Curtis:</b> Автомат эталонной длины знаков (Режим A)</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);" title="Память элементов Lookahead: чип запоминает нажатие следующего элемента прямо во время звучания текущего, исключая залипания и пропуск элементов в знаках K и R.">
                    <span style="color:#e8a33d;">🧠</span>
                    <span><b>Память элементов:</b> Предвыборка Lookahead (без залипаний)</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Правая колонка: Подключение по USB и Телеметрия -->
    <div class="connect-panel">
        
        <!-- Кнопка подключения -->
        <div class="card" style="padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Связь с Arduino</span>
                <span id="serial-status-badge" class="badge" style="font-size:12px; border-color:var(--border);">● ОТКЛЮЧЕН</span>
            </div>
            
            <button id="btn-connect-serial" class="btn-usb-connect" style="width:100%;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span>Подключить ключ по USB (115200)</span>
            </button>
            <div style="font-size:11px; color:var(--text-faint); margin-top:8px; text-align:center;">
                Работает напрямую через WebSerial в Chrome, Edge, Яндекс.Браузере и Opera
            </div>
        </div>

        <!-- Датчики скорости и тона -->
        <div class="telemetry-gauges">
            <div class="gauge-box">
                <span class="gauge-title">Скорость WPM</span>
                <span class="gauge-value" id="gauge-wpm-value">20</span>
                <div class="gauge-bar-track">
                    <div class="gauge-bar-fill wpm" id="gauge-wpm-bar" style="width: 20%;"></div>
                </div>
            </div>

            <div class="gauge-box">
                <span class="gauge-title">Тон PITCH</span>
                <span class="gauge-value" id="gauge-pitch-value">700</span>
                <div class="gauge-bar-track">
                    <div class="gauge-bar-fill pitch" id="gauge-pitch-bar" style="width: 37%;"></div>
                </div>
            </div>
        </div>

        <!-- Консоль Serial терминала -->
        <div class="serial-terminal-card">
            <div class="terminal-header">
                <span>SERIAL STREAM (RAW 115200)</span>
                <button id="btn-clear-terminal" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;">Очистить</button>
            </div>
            <div class="terminal-log-box" id="terminal-log-stream">
                <span class="log-sys">[СИСТЕМА] Нажмите «Подключить ключ», выберите COM-порт Arduino Nano и начните передачу веслом...</span>
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
            <div class="card-eyebrow">ИНТЕРАКТИВНЫЙ САМОКОНТРОЛЬ · ЭХО-ТРЕНАЖЁР CW PRO</div>
            <h2 style="margin:0;">Эхо-тренажёр боевой передачи</h2>
        </div>
        <div class="echo-stats-pill" style="display:inline-flex; align-items:center; gap:10px; background:var(--surface-2); border:1px solid var(--border); padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600;">
            <span>Серия: <b id="echo-streak-val" style="color:var(--signal);">0</b> 🔥</span>
            <span style="opacity:0.4;">·</span>
            <span>Принято: <b id="echo-score-val" style="color:var(--accent);">0</b></span>
        </div>
    </div>

    <!-- Переключатель режима и категорий -->
    <div class="echo-controls-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; background:var(--surface-2); padding:10px 14px; border-radius:10px; border:1px solid var(--border);">
        <div class="echo-mode-switch" style="display:inline-flex; gap:6px;">
            <button type="button" class="btn echo-mode-btn active" data-mode="echo" id="btn-mode-echo" style="font-size:12px; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer;">
                🎧 Режим Эхо (на слух)
            </button>
            <button type="button" class="btn echo-mode-btn" data-mode="visual" id="btn-mode-visual" style="font-size:12px; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; background:transparent; border:1px solid transparent; color:var(--text-muted);">
                👁 Чтение с экрана
            </button>
        </div>

        <div style="display:inline-flex; align-items:center; gap:8px;">
            <label for="echo-category-select" style="font-size:12px; color:var(--text-muted); font-weight:600; margin:0;">Категория:</label>
            <select id="echo-category-select" style="font-size:12px; padding:5px 10px; background:#0b0f12; color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer;">
                <option value="callsigns" selected>📻 Позывные (R9OGL, R8OA...)</option>
                <option value="qcodes">💬 Q-коды и радиожаргон (73, CQ, 599)</option>
                <option value="contest">🏆 Контест-номера (5NN 001)</option>
                <option value="groups">🔤 Сокращения и группы (VVV =, PARIS)</option>
            </select>
        </div>
    </div>

    <p class="muted" id="echo-instructions-text" style="margin-top:0; font-size:14px;">
        Сайт воспроизводит позывной в эфире. Внимательно прослушайте его и повторите веслом на ключе!
    </p>

    <!-- Поле цели и кнопки управления -->
    <div class="echo-target-line" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
        <div style="display:inline-flex; align-items:baseline; gap:10px;">
            <span style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Цель:</span>
            <span id="echo-target-text" style="letter-spacing:2px;">R9OGL</span>
        </div>
        <div style="display:inline-flex; align-items:center; gap:8px;">
            <button id="btn-play-echo" class="btn btn-secondary" style="font-size:12px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px;">
                <span>▶</span> <span>Прослушать</span>
            </button>
            <button id="btn-reset-echo" class="btn btn-secondary" style="font-size:12px; padding:6px 12px;" title="Очистить ваш ввод и попробовать снова">
                ⌫ Сброс
            </button>
            <button id="btn-next-echo" class="btn btn-primary" style="font-size:12px; padding:6px 14px; background:#4fd8c4; color:#0b0f12; font-weight:700;">
                Следующая →
            </button>
        </div>
    </div>

    <div style="margin-top:14px;">
        <span style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Ваш ответ с ключа:</span>
        <div class="echo-user-result" id="echo-result-text" style="letter-spacing:2px;">Ожидание передачи веслом...</div>
    </div>
</div>

<!-- =========================================================
     СПЕЦИФИКАЦИЯ И НАЧИНКА КЛЮЧА
     ========================================================= -->
<div class="mt-5">
    <div class="card-eyebrow">ИНЖЕНЕРНАЯ АРХИТЕКТУРА</div>
    <h2>Что внутри электронного блока MorseWave Pro (R9OGL Edition)</h2>
    <p class="muted">
        Схемотехника и прошивка разработаны радиолюбителем с упором на ямбический режим B и комфортную работу с любым манипулятором:
    </p>

    <div class="specs-grid">
        <div class="spec-item">
            <div class="spec-item-icon">⚡</div>
            <div class="spec-item-title">Алгоритм Curtis 8044 + Lookahead</div>
            <div class="spec-item-desc">
                Двухуровневая предвыборка памяти элементов. Знаки «K» (-.-) и «R» (.-.) отдаются быстро без залипаний и без необходимости «дожимать» весло. 100% защита от дребезга контактов.
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🎛</div>
            <div class="spec-item-title">Регулировка WPM и Тона на лету</div>
            <div class="spec-item-desc">
                Скорость от 10 до олимпийских 60 WPM и тон от 400 до 1200 Гц перестраиваются прямо во время передачи. Цифровой фильтр АЦП (EMA) полностью изолирует помехи динамика.
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">🔊</div>
            <div class="spec-item-title">Аналоговый теплый звук</div>
            <div class="spec-item-desc">
                Усилитель на NPN-транзисторе BC547 с конденсатором 100 нФ для сглаживания колючего меандра. Овальный динамик 8 Ом 1.5 Вт в капсуле звучит сочно и мягко без звона.
            </div>
        </div>

        <div class="spec-item">
            <div class="spec-item-icon">📟</div>
            <div class="spec-item-title">Экран OLED 0.96" Fast I2C</div>
            <div class="spec-item-desc">
                Шина разогнана до 400 кГц. Позонное обновление экрана занимает 0.3 мс, исключая лаги звука. Вывод скорости, тона, крупного знака Морзе и бегущей строки текста с честными пробелами.
            </div>
        </div>
    </div>

    <div class="card mt-4" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
            <h4 style="margin:0 0 4px;">Хотите собрать такой же ключ своими руками?</h4>
            <p class="muted" style="margin:0; font-size:14px;">
                Полный мануал, список покупок с артикулами (BOM), карта проводки макетки и код прошивки v1.7 лежат в репозитории проекта.
            </p>
        </div>
        <div style="display:flex; gap:10px;">
            <a href="https://github.com/loloka/morsewave/tree/main/hardware/cw-keyer" target="_blank" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:8px;">
                <span>Исходники на GitHub ↗</span>
            </a>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

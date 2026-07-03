<?php
$pageTitle = 'Позывные';
$activePage = 'callsigns';
$pageScript = 'callsigns.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Практика радиста</div>
<h1>Тренировка позывных</h1>
<p>Расшифровывай реальные по формату позывные радиолюбителей — максимально
    приближенно к настоящему эфиру. Позывные подтягиваются из базы MySQL.</p>

<div class="card mt-3" id="setup-panel">
    <h3>Настройки</h3>
    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <div class="speed-control">
            Скорость
            <input type="range" id="cs-wpm" min="5" max="35" step="1" value="15">
            <span class="speed-value" id="cs-wpm-value">15</span> wpm
        </div>
        <label class="chip">Позывных в сессии:
            <select id="cs-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="5" selected>5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option>
            </select>
        </label>
    </div>
    <button class="btn btn-primary mt-2" id="start-session">▶ Начать сессию</button>
    <div class="feedback mt-2" id="setup-error"></div>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono">Позывной <span id="cs-index">1</span> / <span id="cs-total">5</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="cs-lamp"></div>
            <button class="btn btn-sm" id="replay-btn">🔁 Повторить</button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>
    <input type="text" id="cs-answer" class="answer-input mt-2" placeholder="Введи позывной… (можно печатать сразу)" autocomplete="off">
    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="submit-answer">Проверить →</button>
    </div>
    <div class="feedback mt-2" id="cs-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3>Результат сессии</h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label">Точных совпадений</span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label">Верно</span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label">Получено XP</span></div>
    </div>
    <button class="btn btn-primary mt-2" id="restart-btn">Новая сессия</button>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

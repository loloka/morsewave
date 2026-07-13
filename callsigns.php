<?php
$pageTitle = 'Позывные';
$activePage = 'callsigns';
$pageScript = 'callsigns.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Практика радиста</div>
<h1>Тренировка позывных</h1>
<p>Расшифровывай реальные по формату позывные радиолюбителей — максимально
    приближенно к настоящему эфиру. База пополняется самими радиолюбителями —
    добавь свой позывной ниже, если его тут ещё нет.</p>

<div class="card mt-3" id="setup-panel">
    <h3>Настройки</h3>
    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <div class="speed-control">
            Скорость
            <input type="range" id="cs-wpm" min="5" max="35" step="1" value="12">
            <span class="speed-value" id="cs-wpm-value">12</span> wpm
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
            <button class="btn btn-sm" id="cs-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn">🔁 Повторить</button>
        </div>
    </div>
    <div class="signal-line mt-2" id="cs-signal"></div>
    <input type="text" id="cs-answer" class="answer-input mt-2" placeholder="Введи позывной…" autocomplete="off">
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

<div class="card mt-3">
    <h3>Добавить свой позывной</h3>
    <p class="mt-0 muted" style="font-size:13px;">Знаешь позывной, которого здесь ещё нет? Добавь —
        он попадёт в общую тренировку для всех. Формат — как у настоящих позывных
        (буквы и цифры вперемешку, например R7AB, UA3XYZ, W1AW).</p>
    <div class="flex-wrap gap-2">
        <input type="text" id="new-callsign-input" class="answer-input" style="flex:2;min-width:140px;"
               placeholder="Например: R7AB" autocomplete="off">
        <input type="text" id="new-callsign-country" class="answer-input" style="flex:1;min-width:140px;"
               placeholder="Страна (необязательно)" autocomplete="off">
        <button class="btn btn-primary" id="add-callsign-btn">Добавить</button>
    </div>
    <div class="feedback mt-2" id="add-callsign-feedback"></div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

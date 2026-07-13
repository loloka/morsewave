<?php
$pageTitle = 'Метод Коха';
$activePage = 'koch';
$pageScript = 'koch.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Классика CW</div>
<h1>Метод Коха</h1>
<p>Символы сразу звучат на целевой скорости — вместо того, чтобы замедлять сигнал,
    ты постепенно добавляешь новые символы. Пройди сессию из групп по 5 символов
    с точностью ≥ 90%, чтобы открыть следующий символ.</p>

<div class="card mt-3">
    <div class="flex-between flex-wrap gap-2">
        <div>
            <div class="card-eyebrow">Открыто символов</div>
            <div class="value mono" style="font-size:28px;color:var(--accent)" id="koch-level">2</div>
        </div>
        <div style="max-width:480px;flex:1;">
            <div class="muted" style="font-size:13px;margin-bottom:6px;">Текущий набор символов — тапни, чтобы услышать</div>
            <div class="chip-row" id="koch-charset"></div>
        </div>
    </div>
    <div class="progress-bar mt-2"><span id="koch-progress-bar" style="width:5%"></span></div>
    <div class="feedback mt-1" id="koch-charset-feedback"></div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <span class="muted" style="font-size:13px;">Уже не новичок — или наоборот, хочешь начать заново? Установи нужное число открытых символов (можно и уменьшить):</span>
        <input type="range" id="koch-jump" min="2" max="38" step="1" value="2">
        <span class="speed-value mono" id="koch-jump-value">2</span>
        <button class="btn btn-sm" id="koch-jump-apply">Установить</button>
    </div>
</div>

<div class="card mt-3" id="setup-panel">
    <h3>Настройки сессии</h3>
    <div class="flex-wrap gap-2 mt-1" style="align-items:center;">
        <div class="speed-control">
            Скорость символа
            <input type="range" id="koch-wpm" min="10" max="40" step="1" value="12">
            <span class="speed-value" id="koch-wpm-value">12</span> wpm
        </div>

        <label class="chip" style="gap:8px;">
            <input type="checkbox" id="koch-farnsworth-enabled"> Фарнсворт
            <span class="info-icon" id="koch-farnsworth-info">?</span>
        </label>
        <div class="tooltip-box" id="koch-farnsworth-tooltip" style="display:none;">
            Метод Фарнсворта — это популярная методика изучения азбуки Морзе, при которой
            отдельные знаки передаются быстро, но паузы между ними и словами делаются длиннее.
            Это позволяет воспринимать букву как единый звуковой образ, а не считать точки
            и тире в уме.
        </div>
        <div class="speed-control" id="koch-farnsworth-wrap" style="display:none;">
            <input type="range" id="koch-farnsworth" min="5" max="30" step="1" value="10">
            <span class="speed-value" id="koch-farnsworth-value">10</span> wpm
        </div>

        <label class="chip">Групп в сессии:
            <select id="koch-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="10" selected>10</option><option value="20">20</option><option value="30">30</option>
            </select>
        </label>
    </div>
    <button class="btn btn-primary mt-2" id="start-session">▶ Начать сессию</button>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono">Группа <span id="group-index">1</span> / <span id="group-total">20</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="koch-lamp"></div>
            <button class="btn btn-sm" id="koch-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn">🔁 Повторить</button>
        </div>
    </div>
    <div class="signal-line mt-2" id="koch-signal"></div>
    <input type="text" id="koch-answer" class="answer-input mt-2" placeholder="Введи символы…" autocomplete="off">
    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="submit-answer">Проверить →</button>
    </div>
    <div class="feedback mt-2" id="koch-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3>Результат сессии</h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label">Точность</span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label">Верно символов</span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label">Получено XP</span></div>
    </div>
    <div class="feedback mt-2 show" id="result-message"></div>
    <button class="btn btn-primary mt-2" id="restart-btn">Новая сессия</button>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

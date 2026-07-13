<?php
$pageTitle = 'Учить буквы';
$activePage = 'learn';
$pageScript = 'learn.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Основы</div>
<h1>Учить буквы и цифры</h1>
<p>Два режима: <b>отправка</b> — сам выстукиваешь символ ключом, и <b>приём на слух</b> —
    слушаешь и нажимаешь услышанную букву на экранной клавиатуре. Второй режим
    отлично подходит, когда буквы по отдельности уже выучены.</p>

<div class="mode-switch">
    <div class="chip active" data-mode="send">📡 Отправка ключом</div>
    <div class="chip" data-mode="recognize">👂 Приём на слух</div>
</div>

<!-- ======================= РЕЖИМ: ОТПРАВКА ======================= -->
<div id="send-mode">
    <div class="chip-row mt-2" id="order-chips">
        <div class="chip active" data-order="alphabet">Алфавит</div>
        <div class="chip" data-order="koch">Порядок Коха</div>
    </div>
    <div class="tile-grid mt-2" id="letter-grid"></div>

    <section class="section card" id="practice-panel" style="display:none;">
        <div class="flex-between flex-wrap gap-1">
            <div>
                <div class="card-eyebrow">Тренируем символ</div>
                <h2 id="practice-letter" style="font-family:var(--font-mono)">A</h2>
            </div>
            <div class="speed-control">
                Скорость
                <input type="range" id="wpm-select" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="wpm-value">12</span> wpm
            </div>
        </div>

        <div class="morse-pattern mt-2" id="practice-pattern"></div>
        <div class="morse-tita" id="practice-tita"></div>
        <div class="morse-napev" id="practice-napev"></div>

        <div class="flex-between mt-2 gap-2 flex-wrap">
            <div class="muted" style="font-size:13px;">Верных повторов подряд: <b class="mono" id="streak-count">0</b> / 5</div>
            <div class="progress-bar" style="width:120px;"><span id="streak-bar" style="width:0%"></span></div>
        </div>
        <div class="feedback mt-1" id="practice-feedback"></div>

        <div class="flex-between flex-wrap gap-2 mt-2">
            <div class="key-wrap" style="flex:1;">
                <div class="telegraph-key" id="telegraph-key" tabindex="0">Тап или<br>пробел</div>
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="practice-lamp"></div>
                <button class="btn btn-sm" id="play-btn">▶ Прослушать</button>
            </div>
        </div>

        <div class="signal-line mt-2" id="practice-signal"></div>
    </section>
</div>

<!-- ======================= РЕЖИМ: ПРИЁМ НА СЛУХ ======================= -->
<div id="recognize-mode" style="display:none;">
    <div class="card mt-2">
        <p class="mt-0">Нажми «Начать тренировку» — символы будут звучать один за другим без
            остановки. После каждого ответа (тапом по плитке <b>или клавиатурой</b>) сразу
            звучит следующий символ — пропустить не отвечая нельзя.</p>

        <div class="chip-row mt-1" id="rec-charset-chips">
            <div class="chip active" data-set="all">Все буквы и цифры</div>
            <div class="chip" data-set="letters">Только буквы</div>
            <div class="chip" data-set="digits">Только цифры</div>
            <div class="chip" data-set="learned">Только выученные</div>
            <div class="chip" data-set="custom">Свои символы</div>
        </div>
        <input type="text" id="rec-custom-input" class="answer-input mt-1"
               placeholder="Например: A E I O U (мин. 5, через пробел)"
               style="display:none; text-transform:uppercase;" autocomplete="off">

        <div class="flex-between flex-wrap gap-2 mt-2">
            <div class="speed-control">
                Скорость
                <input type="range" id="rec-wpm" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="rec-wpm-value">12</span> wpm
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="rec-lamp"></div>
                <button class="btn btn-sm" id="rec-signal-toggle"></button>
                <button class="btn btn-primary btn-sm" id="rec-start-btn">▶ Начать тренировку</button>
                <button class="btn btn-sm" id="rec-stop-btn" style="display:none;">⏹ Остановить</button>
            </div>
        </div>

        <div class="signal-line mt-2" id="rec-signal"></div>

        <div class="grid grid-4 mt-2">
            <div class="stat"><span class="value" id="rec-streak">0</span><span class="label">🔥 Серия</span></div>
            <div class="stat"><span class="value" id="rec-best">0</span><span class="label">🏆 Рекорд серии</span></div>
            <div class="stat"><span class="value" id="rec-accuracy">—</span><span class="label">🎯 Точность сессии</span></div>
            <div class="stat"><span class="value" id="rec-total">0</span><span class="label">✅ Верно всего</span></div>
        </div>

        <div class="tile-grid mt-2" id="recognize-grid"></div>
        <div class="feedback mt-2" id="rec-feedback"></div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

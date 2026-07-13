<?php
$pageTitle = 'Группы символов';
$activePage = 'groups';
$pageScript = 'groups.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Приём на слух</div>
<h1>Группы символов</h1>
<p>Классическая тренировка приёма: слушай случайные группы символов и записывай
    их на слух. Ввод доступен сразу — печатай прямо во время воспроизведения.</p>

<div class="mode-switch">
    <div class="chip active" data-mode="groups">🔢 Группы символов</div>
    <div class="chip" data-mode="abbrev">📻 Сокращения</div>
</div>

<!-- ======================= РЕЖИМ: ГРУППЫ СИМВОЛОВ ======================= -->
<div id="groups-mode">

<div class="card mt-2" id="setup-panel">
    <h3>Настройки</h3>

    <div class="mt-2">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Длина группы</div>
        <div class="chip-row" id="length-chips">
            <div class="chip" data-len="2">2</div>
            <div class="chip active" data-len="3">3</div>
            <div class="chip" data-len="4">4</div>
            <div class="chip" data-len="5">5</div>
        </div>
    </div>

    <div class="mt-2">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Набор символов</div>
        <div class="chip-row" id="charset-chips">
            <div class="chip active" data-set="letters">Буквы</div>
            <div class="chip" data-set="digits">Цифры</div>
            <div class="chip" data-set="mixed">Буквы + цифры</div>
            <div class="chip" data-set="learned">Только выученные</div>
            <div class="chip" data-set="custom">Свои символы</div>
        </div>
        <input type="text" id="custom-charset-input" class="answer-input mt-1"
               placeholder="Например: A E I O U (мин. 5, через пробел)"
               style="display:none; text-transform:uppercase;" autocomplete="off">
    </div>

    <div class="flex-wrap gap-2 mt-2" style="align-items:center;">
        <div class="speed-control">
            Скорость
            <input type="range" id="groups-wpm" min="5" max="60" step="1" value="12">
            <span class="speed-value" id="groups-wpm-value">12</span> wpm
        </div>

        <label class="chip" style="gap:8px;">
            <input type="checkbox" id="groups-farnsworth-enabled"> Фарнсворт
            <span class="info-icon" id="groups-farnsworth-info">?</span>
        </label>
        <div class="speed-control" id="groups-farnsworth-wrap" style="display:none;">
            <input type="range" id="groups-farnsworth" min="5" max="30" step="1" value="10">
            <span class="speed-value" id="groups-farnsworth-value">10</span> wpm
        </div>

        <label class="chip">Групп в сессии:
            <select id="groups-count" style="background:transparent;border:none;color:var(--text);margin-left:6px;">
                <option value="10" selected>10</option><option value="20">20</option>
                <option value="30">30</option><option value="50">50</option>
            </select>
        </label>
    </div>
    <div class="tooltip-box" id="groups-farnsworth-tooltip" style="display:none;">
        Метод Фарнсворта — это популярная методика изучения азбуки Морзе, при которой
        отдельные знаки передаются быстро, но паузы между ними и словами делаются длиннее.
        Это позволяет воспринимать букву как единый звуковой образ, а не считать точки
        и тире в уме.
    </div>

    <div class="btn-row mt-2">
        <button class="btn btn-primary" id="start-session">▶ Начать сессию</button>
        <button class="btn" id="exam-mode-btn">🎓 Режим экзамена</button>
    </div>
    <p class="muted mt-1" style="font-size:12px;">
        Режим экзамена: 50 групп по 5 символов (буквы + цифры), 250 знаков всего,
        скорость 12 wpm (60 зн/мин), тон 850 Гц. Группы звучат одна за другой с
        небольшой паузой, не дожидаясь ответа — тренировка выносливости, как на
        настоящем экзамене.
    </p>
</div>

<div class="card mt-3" id="session-panel" style="display:none;">
    <div class="flex-between">
        <div class="muted mono">Группа <span id="group-index">1</span> / <span id="group-total">10</span></div>
        <div class="lamp-row">
            <div class="morse-lamp" id="groups-lamp"></div>
            <button class="btn btn-sm" id="groups-signal-toggle"></button>
            <button class="btn btn-sm" id="replay-btn">🔁 Повторить</button>
        </div>
    </div>
    <div class="signal-line mt-2" id="groups-signal"></div>
    <input type="text" id="groups-answer" class="answer-input mt-2" placeholder="Введи символы…" autocomplete="off">
    <div class="btn-row mt-2" id="groups-submit-row">
        <button class="btn btn-primary" id="submit-answer">Проверить →</button>
    </div>

    <textarea id="exam-answer" class="answer-input mt-2" style="display:none; min-height:180px; resize:vertical;"
        placeholder="Печатай группы через пробел или с новой строки…"></textarea>
    <div class="btn-row mt-2" id="exam-submit-row" style="display:none;">
        <button class="btn btn-primary" id="exam-submit-btn" disabled>⏳ Идёт передача…</button>
    </div>

    <div class="feedback mt-2" id="groups-feedback"></div>
</div>

<div class="card mt-3" id="result-panel" style="display:none;">
    <h3>Результат сессии</h3>
    <div class="grid grid-3 mt-1">
        <div class="stat"><span class="value" id="result-accuracy">0%</span><span class="label">Точность</span></div>
        <div class="stat"><span class="value" id="result-correct">0</span><span class="label">Верно символов</span></div>
        <div class="stat"><span class="value" id="result-xp">0</span><span class="label">Получено XP</span></div>
    </div>

    <div class="card mt-2" id="mistakes-block" style="display:none; background:var(--surface-2);">
        <p class="mt-0" style="font-size:14px;">Есть символы, в которых закралась ошибка — не страшно, это нормальная
            часть тренировки. Можно спокойно пройтись именно по ним ещё раз, отдельно от остальных.</p>
        <button class="btn btn-primary" id="retrain-mistakes-btn">🔁 Повторить только ошибки (<span id="mistake-count">0</span>)</button>
    </div>

    <button class="btn btn-primary mt-2" id="restart-btn">Новая сессия</button>
</div>

</div>

<!-- ======================= РЕЖИМ: СОКРАЩЕНИЯ ======================= -->
<div id="abbrev-mode" style="display:none;">
    <div class="card mt-2">
        <p class="mt-0">Играется случайное радиолюбительское сокращение (Q-код, служебный код
            или общепринятое сокращение) — нажми на карточку с тем, что услышал. После ответа
            покажем расшифровку, даже если ошибся.</p>

        <div class="flex-between flex-wrap gap-2">
            <div class="speed-control">
                Скорость
                <input type="range" id="abbrev-wpm" min="10" max="35" step="1" value="12">
                <span class="speed-value" id="abbrev-wpm-value">12</span> wpm
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="abbrev-lamp"></div>
                <button class="btn btn-sm" id="abbrev-signal-toggle"></button>
                <button class="btn btn-primary btn-sm" id="abbrev-start-btn">▶ Начать тренировку</button>
                <button class="btn btn-sm" id="abbrev-stop-btn" style="display:none;">⏹ Остановить</button>
            </div>
        </div>

        <div class="signal-line mt-2" id="abbrev-signal"></div>

        <div class="flex-between mt-2">
            <div class="muted mono">Серия: <b id="abbrev-streak">0</b> · Верно: <b id="abbrev-correct">0</b> из <b id="abbrev-total">0</b></div>
        </div>

        <div class="tile-grid mt-2" id="abbrev-grid" style="grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));"></div>
        <div class="feedback mt-2" id="abbrev-feedback"></div>

        <button class="btn btn-sm mt-3" id="abbrev-reference-toggle">📖 Показать все сокращения со значениями</button>
        <div id="abbrev-reference" class="mt-2" style="display:none;"></div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

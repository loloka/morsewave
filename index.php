<?php
$pageTitle = 'Главная';
$activePage = 'index';
$pageScript = 'home.js';
include __DIR__ . '/includes/header.php';
?>

<section class="hero">
    <div class="card-eyebrow">· − · · · − &nbsp;· · − &nbsp;· −</div>
    <h1>Слушай сигнал. Расшифровывай телеграфный код. Говори на языке эфира.</h1>
    <p class="lead">MorseWave — тренажёр азбуки Морзе с методом Коха, тренировкой групп символов
        и позывных. Занимайся с телефона или компьютера, набирай опыт и выполняй тренировки
        несколько дней подряд.</p>

    <div id="hero-signal" class="signal-line" style="margin: 20px 0;"></div>

    <div class="btn-row">
        <a href="learn.php" class="btn btn-primary">Начать с букв</a>
        <a href="koch.php" class="btn">Метод Коха</a>
    </div>
</section>

<section class="section">
    <div class="grid grid-4">
        <div class="card stat">
            <span class="label">Опыт (XP)</span>
            <span class="value" data-nav-xp>0</span>
        </div>
        <div class="card stat">
            <span class="label">Уровень</span>
            <span class="value" data-nav-level>1</span>
        </div>
        <div class="card stat">
            <span class="label">Серия дней</span>
            <span class="value">🔥 <span data-nav-streak>0</span></span>
        </div>
        <div class="card stat">
            <span class="label">Символов выучено</span>
            <span class="value" id="home-learned-count">0</span>
        </div>
    </div>
</section>

<section class="section" id="leaderboard-section">
    <div class="flex-between flex-wrap gap-2">
        <h2 class="mt-0">🏆 Таблица лидеров</h2>
        <a href="account.php" class="btn btn-sm">Присоединиться</a>
    </div>
    <p class="muted mt-0" style="font-size:13px;">Публикуют свои цифры те, кто завёл аккаунт и сам нажал
        «Опубликовать» — это не обязательно, весь прогресс и без аккаунта прекрасно живёт у тебя в браузере.</p>

    <div class="card mt-2">
        <div class="chip-row">
            <div class="chip active" data-board="xp">⭐ По опыту</div>
            <div class="chip" data-board="streak">🔥 По серии дней</div>
        </div>
        <div class="mt-2" id="leaderboard-xp"><p class="muted">Загрузка…</p></div>
        <div class="mt-2" id="leaderboard-streak" style="display:none;"><p class="muted">Загрузка…</p></div>
    </div>
</section>

<section class="section">
    <div class="card-eyebrow">С чего начать</div>
    <h2>Путь новичка: от тишины до эфира за 5 шагов</h2>
    <p class="muted">Не обязательно идти строго по порядку, но именно в такой
        последовательности азбуку Морзе учат быстрее всего.</p>

    <div class="onboarding-steps mt-3">
        <div class="onboarding-step">
            <div class="step-num">1</div>
            <div class="step-content">
                <div class="step-icon">📖</div>
                <h3>Выучи первые символы</h3>
                <p>Начни со страницы «Буквы» — выстукивай каждый символ ключом (тап по экрану
                    или удержание пробела) и слушай, как он звучит. Не старайся выучить всё
                    сразу — для старта достаточно 5–10 символов.</p>
                <a href="learn.php" class="btn btn-primary btn-sm">Начать с букв →</a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">2</div>
            <div class="step-content">
                <div class="step-icon">🎯</div>
                <h3>Переходи на метод Коха</h3>
                <p>Как только выучишь первые пару символов — время для метода Коха: символы сразу
                    звучат на боевой скорости, никакого «сначала медленно, потом быстрее». Новый
                    символ открывается автоматически, когда точность стабильно высокая.</p>
                <a href="koch.php" class="btn btn-sm">Метод Коха →</a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">3</div>
            <div class="step-content">
                <div class="step-icon">🔢</div>
                <h3>Набирай скорость на группах</h3>
                <p>Когда в Кохе открыто хотя бы 10 символов — переходи к группам: тренируй приём
                    случайных сочетаний по 2–5 символов на слух. Здесь оттачивается именно скорость
                    и уверенность приёма, а не заучивание.</p>
                <a href="groups.php" class="btn btn-sm">Группы символов →</a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">4</div>
            <div class="step-content">
                <div class="step-icon">📡</div>
                <h3>Погружайся в настоящий эфир</h3>
                <p>Финальный этап — позывные радиолюбителей и служебные сокращения (CQ, QTH, 73…).
                    Это уже максимально близко к тому, что реально звучит в эфире.</p>
                <div class="btn-row">
                    <a href="callsigns.php" class="btn btn-sm">Позывные →</a>
                    <a href="groups.php" class="btn btn-sm">Сокращения →</a>
                </div>
            </div>
        </div>

        <!-- Пятым шагом — связка с родственным проектом Morse Walker (r9o.ru).
             Сознательно внутри «пути новичка», а не отдельной секцией ниже:
             это логичное продолжение маршрута (приём отдельных знаков → работа
             в эфире), и так «Задание дня» не уезжает вниз страницы. -->
        <div class="onboarding-step">
            <div class="step-num">5</div>
            <div class="step-content">
                <div class="step-icon">📻</div>
                <h3>Выходи в эфир — Morse Walker</h3>
                <p>Когда уверенно принимаешь позывные и сокращения, тренажёр своё дело сделал:
                    дальше нужен не приём отдельных знаков, а работа в эфире. Morse Walker —
                    симулятор радиосвязи с pile-up: станции отвечают на твой CQ, их надо
                    разобрать и провести QSO. Есть режимы контестов и POTA, скорость и
                    интервалы Фарнсворта настраиваются, помехи и замирания — по вкусу.</p>
                <p class="muted" style="font-size:12px;">Автор проекта —
                    <a href="https://github.com/sc0tfree/morsewalker" target="_blank" rel="noopener">W6NYC</a>,
                    доработка и русификация —
                    <a href="https://github.com/loloka/morsewalker" target="_blank" rel="noopener">R9OGL</a>, автор MorseWave.</p>
                <a href="https://morse.r9o.ru" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Открыть Morse Walker →</a>
            </div>
        </div>
    </div>
</section>

<section class="section card daily-card" id="daily-card">
    <div class="card-eyebrow">🎯 Задание дня</div>
    <h3 id="daily-title">Загрузка…</h3>
    <p id="daily-desc" class="mt-0"></p>
    <a href="#" id="daily-link" class="btn btn-primary">Пройти задание (+50 XP)</a>
</section>

<section class="section card" id="community-stats">
    <div class="card-eyebrow">Сообщество</div>
    <p class="mt-0">Вместе с другими радистами MorseWave: расшифровано
        <b class="mono" id="stat-groups">…</b> групп символов и
        <b class="mono" id="stat-callsigns">…</b> позывных.</p>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>

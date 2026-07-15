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

<section class="section">
    <h2>Разделы тренажёра</h2>
    <div class="grid grid-2 mt-2">
        <a href="learn.php" class="card card-link">
            <span class="card-icon">📖</span>
            <div class="card-eyebrow">Основы</div>
            <h3>Учить буквы</h3>
            <p>Изучай каждый символ отдельно: слушай, смотри на паттерн и воспроизводи его тапом
                или клавиатурой, как настоящим ключом.</p>
        </a>
        <a href="koch.php" class="card card-link">
            <span class="card-icon">🎯</span>
            <div class="card-eyebrow">Классика CW</div>
            <h3>Метод Коха</h3>
            <p>Символы сразу звучат на целевой скорости. Новый символ открывается, когда точность
                предыдущих стабильно высокая.</p>
        </a>
        <a href="groups.php" class="card card-link">
            <span class="card-icon">🔢</span>
            <div class="card-eyebrow">Приём на слух</div>
            <h3>Группы символов</h3>
            <p>Тренируй приём случайных групп по 2–5 символов: буквы, цифры или всё вместе,
                на выбранной скорости.</p>
        </a>
        <a href="callsigns.php" class="card card-link">
            <span class="card-icon">📡</span>
            <div class="card-eyebrow">Практика радиолюбителя</div>
            <h3>Позывные</h3>
            <p>Расшифровывай позывные радиолюбителей со всего мира — приближайся к реальному эфиру.</p>
        </a>
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

<section class="section" id="leaderboard-section">
    <div class="flex-between flex-wrap gap-2">
        <h2 class="mt-0">🏆 Таблица лидеров</h2>
        <a href="account.php" class="btn btn-sm">Присоединиться</a>
    </div>
    <p class="muted mt-0" style="font-size:13px;">Публикуют свои цифры те, кто завёл аккаунт — это
        не обязательно, весь прогресс и без аккаунта прекрасно живёт у тебя в браузере.</p>
    <div class="grid grid-2 mt-2">
        <div class="card">
            <div class="card-eyebrow">⭐ По опыту</div>
            <div id="leaderboard-xp"><p class="muted">Загрузка…</p></div>
        </div>
        <div class="card">
            <div class="card-eyebrow">🔥 По серии дней</div>
            <div id="leaderboard-streak"><p class="muted">Загрузка…</p></div>
        </div>
    </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>

<?php
require __DIR__ . '/includes/auth.php';
$pageTitle = 'Профиль и настройки';
$activePage = 'account';
$pageScript = 'account.js';
$loggedInUser = current_user($pdo);
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Профиль</div>
<h1>Аккаунт</h1>
<p>Аккаунт нужен для двух вещей: чтобы попасть в таблицу лидеров на главной
    по опыту и по сериям дней (по желанию — только если сам нажмёшь
    «Опубликовать» ниже), и чтобы совсем скоро можно было подтягивать свой
    прогресс на другом устройстве — например, продолжить с телефона то, что
    начал на компьютере. Пока прогресс тренировок хранится только у тебя в
    браузере — синхронизация между устройствами в разработке.</p>

<div id="guest-block" style="display:none;">
    <div class="mode-switch">
        <div class="chip active" data-mode="login">Войти</div>
        <div class="chip" data-mode="register">Регистрация</div>
    </div>

    <div class="card mt-2" id="login-form">
        <h3>Вход</h3>
        <input type="email" id="login-email" class="answer-input mt-1" placeholder="E-mail" autocomplete="email" style="text-transform:none;">
        <input type="password" id="login-password" class="answer-input mt-2" placeholder="Пароль" autocomplete="current-password" style="text-transform:none;">
        <button class="btn btn-primary mt-2" id="login-btn">Войти</button>
        <div class="feedback mt-2" id="login-feedback"></div>
    </div>

    <div class="card mt-2" id="register-form" style="display:none;">
        <h3>Регистрация</h3>
        <p class="mt-0 muted" style="font-size:13px;">Имя будет видно всем в таблице лидеров — можно указать
            позывной или ник, необязательно настоящее имя.</p>
        <input type="text" id="register-name" class="answer-input mt-1" placeholder="Имя или позывной" autocomplete="nickname" style="text-transform:none;">
        <input type="email" id="register-email" class="answer-input mt-2" placeholder="E-mail (для восстановления доступа)" autocomplete="email" style="text-transform:none;">
        <input type="password" id="register-password" class="answer-input mt-2" placeholder="Пароль (минимум 6 символов)" autocomplete="new-password" style="text-transform:none;">
        <input type="password" id="register-password-confirm" class="answer-input mt-2" placeholder="Повтори пароль" autocomplete="new-password" style="text-transform:none;">

        <div class="mt-2">
            <div class="muted" style="font-size:13px;margin-bottom:6px;">Расшифруй код Морзе — это капча, защита от ботов</div>
            <div class="morse-pattern" id="captcha-pattern" style="font-size:22px;"></div>
            <div class="btn-row mt-1">
                <button type="button" class="btn btn-sm" id="captcha-play-btn">▶ Прослушать</button>
                <button type="button" class="btn btn-sm" id="captcha-refresh-btn">🔄 Другой код</button>
            </div>
            <input type="text" id="captcha-answer" class="answer-input mt-1" placeholder="Что здесь зашифровано?" autocomplete="off">
        </div>

        <button class="btn btn-primary mt-2" id="register-btn">Создать аккаунт</button>
        <div class="feedback mt-2" id="register-feedback"></div>
    </div>
</div>

<div id="profile-block" style="display:none;">
    <div class="card mt-2">
        <div class="flex-between flex-wrap gap-2">
            <div>
                <div class="card-eyebrow">Вошёл как</div>
                <h2 class="mt-0" id="profile-name" style="margin-bottom:0;"></h2>
                <p class="muted mt-0" id="profile-email" style="font-size:13px;"></p>
            </div>
            <div class="btn-row">
                <?php if (is_admin_user($loggedInUser)): ?>
                <a href="admin.php" class="btn btn-sm">🛠 Админка</a>
                <?php endif; ?>
                <button class="btn" id="logout-btn">Выйти</button>
            </div>
        </div>
        <div class="mt-2" id="verify-status"></div>
    </div>

    <div class="card mt-2">
        <h3>Опубликовать текущий прогресс</h3>
        <p class="mt-0 muted" style="font-size:13px;">Твой XP и серия дней хранятся локально в этом браузере и
            <b>нигде не публикуются автоматически</b>. Пока не нажмёшь кнопку ниже — тебя не будет видно
            в таблице лидеров вообще. Пока e-mail не подтверждён — публикация недоступна (это защита от
            случайных дублей в таблице, не от читерства).</p>
        <div class="grid grid-2 mt-2">
            <div class="stat"><span class="value" id="local-xp">0</span><span class="label">Твой XP (локально)</span></div>
            <div class="stat"><span class="value" id="local-streak">0</span><span class="label">Твоя серия дней</span></div>
        </div>
        <button class="btn btn-primary mt-2" id="sync-btn">🔄 Опубликовать в лидерборд</button>
        <div class="feedback mt-2" id="sync-feedback"></div>
    </div>
</div>

<!-- ======================= НАСТРОЙКИ (доступны и без аккаунта) ======================= -->
<div class="card-eyebrow mt-3">Настройки</div>
<h1>Тон сигнала</h1>
<p>Настройки применяются сразу и действуют на всех страницах тренажёра —
    во время прослушивания, отправки ключом и сайдтона. Аккаунт для них не
    нужен — хранятся в этом браузере.</p>

<div class="card mt-2">
    <div class="mt-1">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Частота тона</div>
        <div class="speed-control">
            <input type="range" id="tone-freq" min="300" max="1000" step="10" value="600">
            <span class="speed-value mono" id="tone-freq-value">600</span> Гц
        </div>
    </div>

    <div class="mt-3">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Форма волны</div>
        <div class="chip-row" id="waveform-chips">
            <div class="chip active" data-wave="sine">Синусоида (мягкая)</div>
            <div class="chip" data-wave="triangle">Треугольная (тёплая)</div>
            <div class="chip" data-wave="square">Прямоугольная (резкая)</div>
            <div class="chip" data-wave="sawtooth">Пилообразная (жужжащая)</div>
        </div>
    </div>

    <div class="btn-row mt-3">
        <button class="btn btn-primary" id="test-tone-btn">▶ Проверить звук</button>
        <button class="btn" id="reset-tone-btn">Сбросить по умолчанию</button>
    </div>

    <p class="muted mt-2" style="font-size:12px;">
        600 Гц синусоида — классический тон CW-радиостанций, ближе всего к
        реальному эфиру. Прямоугольная/пилообразная звучат резче и жужжащее —
        кому-то удобнее различать точки/тире на слух именно с ними.
    </p>
</div>

<h1 class="mt-3">Отображение</h1>
<div class="card mt-2">
    <label class="flex gap-2" style="align-items:center; cursor:pointer;">
        <input type="checkbox" id="show-signal-line-toggle" checked>
        <span>Показывать сигнальную линию (точки-тире) во время приёма на слух</span>
    </label>
    <p class="muted mt-2" style="font-size:12px;">
        Точки-тире на экране — по сути подсказка: глазами прочитать проще, чем
        разобрать на слух. Если хочешь тренировать именно слух, а не зрение —
        выключи. Этот же переключатель есть прямо на каждой странице приёма
        на слух (кнопка рядом с лампой) — настройка общая, где ни включи,
        применится везде.
    </p>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
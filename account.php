<?php
require __DIR__ . '/includes/auth.php';
$pageTitle = 'Профиль и настройки';
$activePage = 'account';
$pageScript = 'account.js';
$loggedInUser = current_user($pdo);
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Профиль</div>
<h1>Профиль и настройки</h1>

<!-- Вкладки: звук/отображение/бэкап доступны и без аккаунта, поэтому панель
     "Профиль" внутри сама переключает вид гость/залогинен (account.js). -->
<div class="account-tabs" id="account-tabs" role="tablist">
    <button class="chip active" data-tab="profile">👤 Профиль</button>
    <button class="chip" data-tab="sound">🔊 Звук</button>
    <button class="chip" data-tab="display">👁 Отображение</button>
    <button class="chip" data-tab="backup">💾 Бэкап</button>
</div>

<!-- ======================= ВКЛАДКА: ПРОФИЛЬ ======================= -->
<div class="account-tab-panel" data-tab-panel="profile">
    <p class="muted mt-2" style="font-size:13px;">Аккаунт нужен для двух вещей: таблица лидеров на главной
        (по желанию — только если сам нажмёшь «Опубликовать») и синхронизация прогресса между устройствами.
        Без аккаунта всё тоже работает — прогресс живёт в этом браузере.</p>

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
            <p class="muted mt-2" style="font-size:13px;">
                <a href="#" id="forgot-link">Забыл пароль?</a>
            </p>
        </div>

        <div class="card mt-2" id="reset-request-form" style="display:none;">
            <h3>Восстановление пароля</h3>
            <p class="mt-0 muted" style="font-size:13px;">Пришлём на почту ссылку для установки нового пароля
                (действует 1 час). Чаще одного раза в 5 минут письмо не отправляется.</p>
            <input type="email" id="reset-email" class="answer-input mt-1" placeholder="E-mail аккаунта" autocomplete="email" style="text-transform:none;">

            <div class="mt-2">
                <div class="muted" style="font-size:13px;margin-bottom:6px;">Расшифруй код Морзе — это капча, защита от ботов</div>
                <div class="morse-pattern" id="reset-captcha-pattern" style="font-size:22px;"></div>
                <div class="btn-row mt-1">
                    <button type="button" class="btn btn-sm" id="reset-captcha-play-btn">▶ Прослушать</button>
                    <button type="button" class="btn btn-sm" id="reset-captcha-refresh-btn">🔄 Другой код</button>
                </div>
                <input type="text" id="reset-captcha-answer" class="answer-input mt-1" placeholder="Что здесь зашифровано?" autocomplete="off">
            </div>

            <button class="btn btn-primary mt-2" id="reset-request-btn">Отправить ссылку</button>
            <div class="feedback mt-2" id="reset-request-feedback"></div>
        </div>

        <div class="card mt-2" id="reset-password-form" style="display:none;">
            <h3>Новый пароль</h3>
            <p class="mt-0 muted" style="font-size:13px;">Ты перешёл по ссылке из письма — задай новый пароль для аккаунта.</p>
            <input type="password" id="reset-new-password" class="answer-input mt-1" placeholder="Новый пароль (минимум 6 символов)" autocomplete="new-password" style="text-transform:none;">
            <input type="password" id="reset-new-password-confirm" class="answer-input mt-2" placeholder="Повтори новый пароль" autocomplete="new-password" style="text-transform:none;">
            <button class="btn btn-primary mt-2" id="reset-password-btn">Сохранить пароль</button>
            <div class="feedback mt-2" id="reset-password-feedback"></div>
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

            <label for="register-agree" class="mt-2" style="display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="register-agree" style="margin-top:3px;flex:0 0 auto;">
                <span>Принимаю <a href="terms.php" target="_blank" rel="noopener">пользовательское соглашение</a>
                    и <a href="privacy.php" target="_blank" rel="noopener">политику конфиденциальности</a>,
                    согласен на обработку персональных данных.</span>
            </label>

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
                <div class="btn-row" id="profile-actions">
                    <?php if (is_admin_user($loggedInUser)): ?>
                    <a href="admin.php" id="admin-link" class="btn btn-sm">🛠 Админка</a>
                    <?php endif; ?>
                    <button class="btn" id="logout-btn" title="Прогресс сохранён в аккаунте и вернётся при следующем входе">Выйти</button>
                </div>
            </div>
            <p class="muted mt-1" style="font-size:12px;">При выходе прогресс тренировок убирается из этого браузера —
                он сохранён в аккаунте и вернётся, как только войдёшь снова (удобно на общем компьютере).</p>
            <div class="muted mt-1" id="sync-indicator" style="font-size:12px;"></div>
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

        <!-- Редкие действия со аккаунтом — под раскрывашкой, чтобы не растягивать
             вкладку. Открывается по клику, IDs внутри не менялись. -->
        <details class="card mt-2" id="account-settings-details">
            <summary style="cursor:pointer;font-weight:600;">Настройки аккаунта — имя, пароль, e-mail</summary>

            <div class="mt-2">
                <div class="muted" style="font-size:13px;margin-bottom:6px;">Имя (видно в таблице лидеров)</div>
                <input type="text" id="change-name-input" class="answer-input" placeholder="Имя или позывной" autocomplete="nickname" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-name-btn">Сменить имя</button>
                <div class="feedback mt-1" id="change-name-feedback"></div>
            </div>

            <div class="mt-3">
                <div class="muted" style="font-size:13px;margin-bottom:6px;">Смена пароля</div>
                <input type="password" id="change-pass-current" class="answer-input" placeholder="Текущий пароль" autocomplete="current-password" style="text-transform:none;">
                <input type="password" id="change-pass-new" class="answer-input mt-1" placeholder="Новый пароль (минимум 6 символов)" autocomplete="new-password" style="text-transform:none;">
                <input type="password" id="change-pass-confirm" class="answer-input mt-1" placeholder="Повтори новый пароль" autocomplete="new-password" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-pass-btn">Сменить пароль</button>
                <div class="feedback mt-1" id="change-pass-feedback"></div>
            </div>

            <div class="mt-3">
                <div class="muted" style="font-size:13px;margin-bottom:6px;">Смена e-mail (новый адрес нужно будет подтвердить по письму)</div>
                <input type="password" id="change-email-pass" class="answer-input" placeholder="Текущий пароль" autocomplete="current-password" style="text-transform:none;">
                <input type="email" id="change-email-new" class="answer-input mt-1" placeholder="Новый e-mail" autocomplete="email" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-email-btn">Сменить e-mail</button>
                <div class="feedback mt-1" id="change-email-feedback"></div>
            </div>
        </details>

        <!-- Опасная зона: удаление аккаунта. -->
        <div class="card mt-2" style="border-color:var(--danger);">
            <h3 class="mt-0" style="color:var(--danger);">Удалить аккаунт</h3>
            <p class="mt-0 muted" style="font-size:13px;">Аккаунт, публикация в лидерборде и серверная копия
                прогресса удаляются безвозвратно. Локальный прогресс в этом браузере останется — его при желании
                можно убрать отдельно кнопкой «Сбросить весь прогресс» на странице достижений. По вопросам удаления
                можно также написать на <a href="mailto:morse@r9o.ru">morse@r9o.ru</a>.</p>
            <button class="btn btn-sm" id="delete-account-reveal-btn" style="border-color:var(--danger);color:var(--danger);">Удалить аккаунт…</button>
            <div id="delete-account-confirm" style="display:none;" class="mt-2">
                <input type="password" id="delete-account-pass" class="answer-input" placeholder="Пароль для подтверждения" autocomplete="current-password" style="text-transform:none;">
                <div class="btn-row mt-1">
                    <button class="btn btn-sm" id="delete-account-cancel-btn">Отмена</button>
                    <button class="btn btn-sm" id="delete-account-confirm-btn" style="border-color:var(--danger);color:var(--danger);">Да, удалить навсегда</button>
                </div>
                <div class="feedback mt-1" id="delete-account-feedback"></div>
            </div>
        </div>
    </div>
</div>

<!-- ======================= ВКЛАДКА: ЗВУК ======================= -->
<div class="account-tab-panel" data-tab-panel="sound" style="display:none;">
    <h2 class="mt-2">Тон сигнала</h2>
    <p class="muted" style="font-size:13px;">Применяется сразу на всех страницах тренажёра — прослушивание,
        отправка ключом и сайдтон. Аккаунт не нужен, хранится в этом браузере.</p>

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
</div>

<!-- ======================= ВКЛАДКА: ОТОБРАЖЕНИЕ ======================= -->
<div class="account-tab-panel" data-tab-panel="display" style="display:none;">
    <h2 class="mt-2">Отображение</h2>
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
</div>

<!-- ======================= ВКЛАДКА: БЭКАП ======================= -->
<div class="account-tab-panel" data-tab-panel="backup" style="display:none;">
    <h2 class="mt-2">Резервная копия прогресса</h2>
    <p class="muted" style="font-size:13px;">Весь прогресс хранится в этом браузере. Чистишь историю, меняешь
        компьютер или просто хочешь подстраховаться — сохрани файл и держи рядом. Аккаунт не нужен.</p>

    <div class="card mt-2">
        <div class="btn-row">
            <button class="btn btn-primary" id="backup-export-btn">⬇ Скачать бэкап</button>
            <button class="btn" id="backup-import-btn">⬆ Загрузить бэкап</button>
        </div>
        <input type="file" id="backup-file-input" accept="application/json,.json" style="display:none;">
        <div class="feedback mt-2" id="backup-feedback"></div>
        <p class="muted mt-2" style="font-size:12px;">
            Загрузка бэкапа ничего не стирает: данные из файла и текущие
            складываются по принципу «что больше, то и остаётся». Выученные буквы
            и достижения объединяются. Так что загрузить старый файл поверх
            нового прогресса — безопасно.
        </p>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

(function () {
    const guestBlock = document.getElementById('guest-block');
    const profileBlock = document.getElementById('profile-block');
    const CLAIM_KEY = 'morsewave_claimed_by';

    /* ---------- Капча (код Морзе) ----------
       Виджет обобщён: одна и та же капча используется на регистрации и на
       запросе сброса пароля. ВАЖНО: серверная сессия хранит только ОДНО
       загаданное слово — поэтому обновление капчи в одной форме
       инвалидирует другую. На практике формы не видны одновременно, так
       что конфликтов нет. */
    function makeCaptchaWidget(patternId, playBtnId, refreshBtnId, answerId) {
        let morse = '';

        async function load() {
            try {
                const res = await fetch('api/captcha.php');
                const data = await res.json();
                morse = data.morse;
                document.getElementById(patternId).innerHTML = morse.split(' ').map(code =>
                    code.split('').map(s => `<span class="sym">${s === '.' ? '•' : '−'}</span>`).join('')
                ).join(' &nbsp; ');
                document.getElementById(answerId).value = '';
            } catch {
                document.getElementById(patternId).textContent = 'Не удалось загрузить капчу — обнови страницу';
            }
        }

        document.getElementById(refreshBtnId).addEventListener('click', load);
        document.getElementById(playBtnId).addEventListener('click', async () => {
            if (!morse) return;
            const spans = document.querySelectorAll(`#${patternId} .sym`);
            let i = 0;
            const audio = new MorseAudio({ wpm: 15 });
            await audio.playPattern(morse, {
                onSymbol: () => { spans[i]?.classList.add('playing'); i++; },
            });
            spans.forEach(s => s.classList.remove('playing'));
        });

        return { load, answer: () => document.getElementById(answerId).value.trim() };
    }

    const registerCaptcha = makeCaptchaWidget('captcha-pattern', 'captcha-play-btn', 'captcha-refresh-btn', 'captcha-answer');
    const resetCaptcha = makeCaptchaWidget('reset-captcha-pattern', 'reset-captcha-play-btn', 'reset-captcha-refresh-btn', 'reset-captcha-answer');
    const loadCaptcha = registerCaptcha.load; // имя сохранено — используется ниже при ошибке капчи

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
            document.getElementById('register-form').style.display = mode === 'register' ? 'block' : 'none';
        });
    });

    function renderVerifyStatus(user) {
        const box = document.getElementById('verify-status');
        if (user.email_verified_at) {
            box.innerHTML = '<span class="feedback show ok" style="display:inline-block;">✅ E-mail подтверждён</span>';
            return;
        }
        box.innerHTML = `
            <span class="feedback show bad" style="display:inline-block;">
                ✉️ E-mail не подтверждён — проверь почту (в т.ч. папку «Спам»).
                Без подтверждения прогресс не попадёт в таблицу лидеров.
            </span>
            <button class="btn btn-sm mt-1" id="resend-verify-btn">Отправить письмо ещё раз</button>
        `;
        document.getElementById('resend-verify-btn').addEventListener('click', async (e) => {
            e.target.disabled = true;
            e.target.textContent = 'Отправляю…';
            try {
                const res = await fetch('api/resend_verification.php', { method: 'POST' });
                const data = await res.json();
                e.target.textContent = data.mail_sent ? 'Письмо отправлено ✓' : 'Не получилось отправить — попробуй позже';
            } catch {
                e.target.textContent = 'Ошибка сети — попробуй позже';
            }
        });
    }

    function showProfile(user) {
        guestBlock.style.display = 'none';
        profileBlock.style.display = 'block';
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        renderVerifyStatus(user);
        const state = Progress.load();
        document.getElementById('local-xp').textContent = state.xp;
        document.getElementById('local-streak').textContent = state.streak.count;
    }

    function showGuest() {
        guestBlock.style.display = 'block';
        profileBlock.style.display = 'none';
    }

    async function refreshAuthState() {
        try {
            const res = await fetch('api/me.php');
            const data = await res.json();
            if (data.user) showProfile(data.user); else showGuest();
        } catch {
            showGuest();
        }
    }

    // Переход по ссылке из письма (api/verify_email.php редиректит сюда)
    (function handleVerifyRedirect() {
        const params = new URLSearchParams(location.search);
        const verify = params.get('verify');
        if (!verify) return;
        const banner = document.createElement('div');
        banner.className = verify === 'ok' ? 'feedback show ok mt-2' : 'feedback show bad mt-2';
        banner.textContent = verify === 'ok'
            ? '✅ Почта подтверждена! Теперь можно опубликовать прогресс в лидерборде.'
            : 'Ссылка недействительна или уже использована.';
        document.querySelector('h1').insertAdjacentElement('afterend', banner);
        history.replaceState({}, '', location.pathname); // убираем ?verify= из адресной строки
    })();

    document.getElementById('login-btn').addEventListener('click', async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const feedback = document.getElementById('login-feedback');
        try {
            const res = await fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                showProfile(data.user);
                // Тихое слияние прогресса с сервером (max/union — ничего не
                // теряется, поэтому без диалогов подтверждения).
                Progress.syncWithServer();
            } else {
                feedback.textContent = data.error || 'Не получилось войти';
                feedback.className = 'feedback show bad';
            }
        } catch {
            feedback.textContent = 'Не удалось связаться с сервером';
            feedback.className = 'feedback show bad';
        }
    });

    document.getElementById('register-btn').addEventListener('click', async () => {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const captcha = document.getElementById('captcha-answer').value.trim();
        const feedback = document.getElementById('register-feedback');

        if (password !== passwordConfirm) {
            feedback.textContent = 'Пароли не совпадают';
            feedback.className = 'feedback show bad';
            return;
        }

        try {
            const res = await fetch('api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, passwordConfirm, captcha }),
            });
            const data = await res.json();
            if (res.ok) {
                showProfile(data.user);
                // Для нового аккаунта на сервере пусто — merge ничего не
                // изменит, но сразу запушится текущий локальный прогресс.
                Progress.syncWithServer();
                feedback.textContent = data.mail_sent
                    ? 'Аккаунт создан! Проверь почту, чтобы подтвердить e-mail.'
                    : 'Аккаунт создан, но письмо отправить не получилось — попробуй кнопку "Отправить ещё раз" ниже.';
                feedback.className = 'feedback show ok';
            } else {
                feedback.textContent = data.error || 'Не получилось зарегистрироваться';
                feedback.className = 'feedback show bad';
                if (data.code === 'captcha') loadCaptcha(); // новый код взамен неверно разгаданного
            }
        } catch {
            feedback.textContent = 'Не удалось связаться с сервером';
            feedback.className = 'feedback show bad';
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        // Сначала дожимаем прогресс на сервер (debounce мог не успеть) —
        // после этого локальную копию безопасно стирать.
        try { await Progress.pushNow(); } catch { /* не критично */ }

        await fetch('api/logout.php', { method: 'POST' });

        // Локальный прогресс при выходе стирается ВСЕГДА (v2.29), без
        // вопросов. Две причины: (1) общий компьютер — следующий человек
        // не должен получить чужой прогресс; (2) анти-абуз — иначе можно
        // было выйти, сохранив прогресс в localStorage, войти в другой
        // аккаунт и слить себе тот же XP второй раз (merge складывает
        // «только вверх»). Прогресс не теряется: он уже на сервере и
        // вернётся при следующем входе в СВОЙ аккаунт.
        Progress.resetAll();               // только localStorage — серверная копия остаётся!
        localStorage.removeItem(CLAIM_KEY); // и метка "кто публиковался с этого браузера"
        showGuest();
    });

    async function doSync() {
        const state = Progress.load();
        const feedback = document.getElementById('sync-feedback');
        try {
            const res = await fetch('api/sync_progress.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xp: state.xp,
                    streakCount: state.streak.count,
                    streakLastDate: state.streak.lastDate,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                feedback.textContent = 'Готово! Цифры обновлены в лидерборде.';
                feedback.className = 'feedback show ok';
            } else if (data.reason === 'email_not_verified') {
                feedback.textContent = 'Сначала подтверди e-mail (ссылка выше) — тогда прогресс появится в лидерборде.';
                feedback.className = 'feedback show bad';
            } else {
                feedback.textContent = 'Не получилось опубликовать прогресс.';
                feedback.className = 'feedback show bad';
            }
        } catch {
            feedback.textContent = 'Не удалось связаться с сервером';
            feedback.className = 'feedback show bad';
        }
    }

    async function syncNow() {
        // Мягкая подсказка (не жёсткая блокировка): если прогресс в этом
        // браузере уже публиковался от имени другого аккаунта, спрашиваем,
        // точно ли человек хочет засветить те же цифры ещё и здесь —
        // иначе в лидерборде появятся два одинаковых результата.
        try {
            const res = await fetch('api/me.php');
            const data = await res.json();
            if (!data.user) return;

            const claim = JSON.parse(localStorage.getItem(CLAIM_KEY) || 'null');
            if (claim && claim.userId !== data.user.id) {
                const proceed = confirm(
                    `Этот прогресс в браузере уже публиковался от имени «${claim.name}».\n` +
                    `Опубликовать те же цифры ещё и от аккаунта «${data.user.name}»?\n` +
                    `Тогда в таблице лидеров появятся две одинаковые записи.`
                );
                if (!proceed) return;
            }

            await doSync();
            localStorage.setItem(CLAIM_KEY, JSON.stringify({ userId: data.user.id, name: data.user.name }));
        } catch {
            await doSync();
        }
    }
    /* ---------- Восстановление пароля ---------- */

    document.getElementById('forgot-link').addEventListener('click', (e) => {
        e.preventDefault();
        const box = document.getElementById('reset-request-form');
        const opening = box.style.display === 'none';
        box.style.display = opening ? 'block' : 'none';
        if (opening) {
            resetCaptcha.load();
            document.getElementById('reset-email').value = document.getElementById('login-email').value;
        }
    });

    document.getElementById('reset-request-btn').addEventListener('click', async () => {
        const feedback = document.getElementById('reset-request-feedback');
        const btn = document.getElementById('reset-request-btn');
        btn.disabled = true;
        try {
            const res = await fetch('api/request_password_reset.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('reset-email').value.trim(),
                    captcha: resetCaptcha.answer(),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                feedback.textContent = data.message;
                feedback.className = 'feedback show ok';
            } else {
                feedback.textContent = data.error || 'Не получилось отправить';
                feedback.className = 'feedback show bad';
                if (data.code === 'captcha') resetCaptcha.load();
            }
        } catch {
            feedback.textContent = 'Не удалось связаться с сервером';
            feedback.className = 'feedback show bad';
        }
        btn.disabled = false;
    });

    // Переход по ссылке из письма: account.php?reset_token=... —
    // показываем форму нового пароля вместо обычного входа.
    const resetToken = new URLSearchParams(location.search).get('reset_token');
    if (resetToken) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'block';

        document.getElementById('reset-password-btn').addEventListener('click', async () => {
            const feedback = document.getElementById('reset-password-feedback');
            try {
                const res = await fetch('api/reset_password.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: resetToken,
                        password: document.getElementById('reset-new-password').value,
                        passwordConfirm: document.getElementById('reset-new-password-confirm').value,
                    }),
                });
                const data = await res.json();
                if (res.ok) {
                    feedback.textContent = data.message + ' Открываю форму входа…';
                    feedback.className = 'feedback show ok';
                    history.replaceState({}, '', location.pathname); // убираем токен из адресной строки
                    setTimeout(() => {
                        document.getElementById('reset-password-form').style.display = 'none';
                        document.getElementById('login-form').style.display = 'block';
                    }, 1500);
                } else {
                    feedback.textContent = data.error || 'Не получилось сменить пароль';
                    feedback.className = 'feedback show bad';
                }
            } catch {
                feedback.textContent = 'Не удалось связаться с сервером';
                feedback.className = 'feedback show bad';
            }
        });
    }

    /* ---------- Настройки аккаунта (имя / пароль / e-mail) ---------- */

    async function updateAccount(payload, feedbackId) {
        const feedback = document.getElementById(feedbackId);
        try {
            const res = await fetch('api/update_account.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            feedback.textContent = res.ok ? data.message : (data.error || 'Не получилось');
            feedback.className = res.ok ? 'feedback show ok' : 'feedback show bad';
            return res.ok ? data : null;
        } catch {
            feedback.textContent = 'Не удалось связаться с сервером';
            feedback.className = 'feedback show bad';
            return null;
        }
    }

    document.getElementById('change-name-btn').addEventListener('click', async () => {
        const name = document.getElementById('change-name-input').value.trim();
        const data = await updateAccount({ action: 'name', name }, 'change-name-feedback');
        if (data) {
            document.getElementById('profile-name').textContent = data.name;
            document.getElementById('change-name-input').value = '';
        }
    });

    document.getElementById('change-pass-btn').addEventListener('click', async () => {
        const data = await updateAccount({
            action: 'password',
            currentPassword: document.getElementById('change-pass-current').value,
            newPassword: document.getElementById('change-pass-new').value,
            newPasswordConfirm: document.getElementById('change-pass-confirm').value,
        }, 'change-pass-feedback');
        if (data) {
            ['change-pass-current', 'change-pass-new', 'change-pass-confirm']
                .forEach(id => document.getElementById(id).value = '');
        }
    });

    document.getElementById('change-email-btn').addEventListener('click', async () => {
        const data = await updateAccount({
            action: 'email',
            currentPassword: document.getElementById('change-email-pass').value,
            newEmail: document.getElementById('change-email-new').value.trim(),
        }, 'change-email-feedback');
        if (data) {
            document.getElementById('change-email-pass').value = '';
            document.getElementById('change-email-new').value = '';
            document.getElementById('profile-email').textContent = data.email;
            refreshAuthState(); // перерисует статус "e-mail не подтверждён" с кнопкой повторной отправки
        }
    });

    document.getElementById('sync-btn').addEventListener('click', syncNow);

    refreshAuthState();
    loadCaptcha();
})();

/* ======================= Настройки звука и отображения =======================
   Перенесено из settings.js при объединении страниц «Профиль» и «Звук»
   в одну (v2.24). Аккаунт не требуется — всё в localStorage. */
(function () {
    const freqSlider = document.getElementById('tone-freq');
    const freqValue = document.getElementById('tone-freq-value');
    const waveChips = document.querySelectorAll('#waveform-chips .chip');

    let current = AudioSettings.load();
    freqSlider.value = current.freq;
    freqValue.textContent = current.freq;
    waveChips.forEach(c => c.classList.toggle('active', c.dataset.wave === current.waveform));

    function save() {
        AudioSettings.save(current);
    }

    freqSlider.addEventListener('input', () => {
        current.freq = parseInt(freqSlider.value, 10);
        freqValue.textContent = current.freq;
        save();
    });

    waveChips.forEach(chip => {
        chip.addEventListener('click', () => {
            waveChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            current.waveform = chip.dataset.wave;
            save();
        });
    });

    document.getElementById('test-tone-btn').addEventListener('click', () => {
        const audio = new MorseAudio({ wpm: 15 });
        audio.play('MORSE', {});
    });

    document.getElementById('reset-tone-btn').addEventListener('click', () => {
        current = AudioSettings.defaults();
        save();
        freqSlider.value = current.freq;
        freqValue.textContent = current.freq;
        waveChips.forEach(c => c.classList.toggle('active', c.dataset.wave === current.waveform));
    });

    /* ---------- Отображение сигнальной линии ---------- */
    const signalToggle = document.getElementById('show-signal-line-toggle');
    signalToggle.checked = DisplaySettings.load().showSignalLine !== false;
    signalToggle.addEventListener('change', () => {
        const settings = DisplaySettings.load();
        settings.showSignalLine = signalToggle.checked;
        DisplaySettings.save(settings);
    });
})();

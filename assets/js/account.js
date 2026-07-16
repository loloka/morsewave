(function () {
    const guestBlock = document.getElementById('guest-block');
    const profileBlock = document.getElementById('profile-block');
    const CLAIM_KEY = 'morsewave_claimed_by';

    /* ---------- Капча (код Морзе) ---------- */
    let currentCaptchaMorse = '';

    function renderCaptchaPattern(morse) {
        const el = document.getElementById('captcha-pattern');
        el.innerHTML = morse.split(' ').map(code =>
            code.split('').map(s => `<span class="sym">${s === '.' ? '•' : '−'}</span>`).join('')
        ).join(' &nbsp; ');
    }

    async function loadCaptcha() {
        try {
            const res = await fetch('api/captcha.php');
            const data = await res.json();
            currentCaptchaMorse = data.morse;
            renderCaptchaPattern(currentCaptchaMorse);
            document.getElementById('captcha-answer').value = '';
        } catch {
            document.getElementById('captcha-pattern').textContent = 'Не удалось загрузить капчу — обнови страницу';
        }
    }

    document.getElementById('captcha-refresh-btn').addEventListener('click', loadCaptcha);
    document.getElementById('captcha-play-btn').addEventListener('click', async () => {
        if (!currentCaptchaMorse) return;
        const spans = document.querySelectorAll('#captcha-pattern .sym');
        let i = 0;
        const audio = new MorseAudio({ wpm: 15 });
        await audio.playPattern(currentCaptchaMorse, {
            onSymbol: () => { spans[i]?.classList.add('playing'); i++; },
        });
        spans.forEach(s => s.classList.remove('playing'));
    });

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
        await fetch('api/logout.php', { method: 'POST' });
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

(function () {
    const guestBlock = document.getElementById('guest-block');
    const profileBlock = document.getElementById('profile-block');
    const CLAIM_KEY = 'morsewave_claimed_by';
    const TAB_KEY = 'morsewave_account_tab';

    /* ---------- Вкладки профиля ----------
       Звук/Отображение/Бэкап доступны и без аккаунта, поэтому вкладки — общий
       переключатель поверх всего. Выбранную вкладку запоминаем, чтобы возврат
       на страницу открывал её же (например, часто ходишь в «Звук»). */
    (function initAccountTabs() {
        const tabs = [...document.querySelectorAll('#account-tabs .chip')];
        const panels = [...document.querySelectorAll('.account-tab-panel')];
        if (!tabs.length) return;

        function show(tab) {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            panels.forEach(p => { p.style.display = p.dataset.tabPanel === tab ? 'block' : 'none'; });
            try { localStorage.setItem(TAB_KEY, tab); } catch { /* приватный режим — не критично */ }
        }

        tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));

        let saved = null;
        try { saved = localStorage.getItem(TAB_KEY); } catch { /* ignore */ }
        show(tabs.some(t => t.dataset.tab === saved) ? saved : 'profile');
    })();

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
                document.getElementById(patternId).textContent = t('js.account.captcha_load_error');
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
            box.innerHTML = '<span class="feedback show ok" style="display:inline-block;">' + t('js.account.email_verified') + '</span>';
            return;
        }
        box.innerHTML = `
            <span class="feedback show bad" style="display:inline-block;">
                ${t('js.account.email_not_verified_text')}
            </span>
            <button class="btn btn-sm mt-1" id="resend-verify-btn">${t('js.account.resend_email_btn')}</button>
        `;
        document.getElementById('resend-verify-btn').addEventListener('click', async (e) => {
            e.target.disabled = true;
            e.target.textContent = t('js.account.resend_sending');
            try {
                const res = await fetch('api/resend_verification.php', { method: 'POST' });
                const data = await res.json();
                e.target.textContent = data.mail_sent ? t('js.account.resend_sent') : t('js.account.resend_failed');
            } catch {
                e.target.textContent = t('js.account.network_error_short');
            }
        });
    }

    // Кнопка «Админка» рендерится сервером только при загрузке страницы с уже
    // активной сессией. После AJAX-логина сессия появляется без перезагрузки —
    // поэтому кнопку добавляем/убираем на клиенте по флагу is_admin (иначе она
    // всплывала бы только после F5).
    function renderAdminLink(user) {
        const actions = document.getElementById('profile-actions');
        if (!actions) return;
        let link = document.getElementById('admin-link');
        if (user.is_admin) {
            if (!link) {
                link = document.createElement('a');
                link.id = 'admin-link';
                link.href = 'admin.php';
                link.className = 'btn btn-sm';
                link.textContent = t('acc.admin_link');
                actions.insertBefore(link, actions.firstChild);
            }
        } else if (link) {
            link.remove();
        }
    }

    // «Твой XP (локально)» и «Твоя серия дней» в профиле. Вынесено в отдельную
    // функцию, потому что после логина слияние с сервером идёт асинхронно
    // (Progress.syncWithServer) и по завершении шлёт progress:updated — числа
    // нужно перерисовать, иначе они показывали бы значения ДО слияния (0 сразу
    // после входа) до ручной перезагрузки страницы (F5).
    function updateLocalStats(state) {
        state = state || Progress.load();
        const xpEl = document.getElementById('local-xp');
        const streakEl = document.getElementById('local-streak');
        if (xpEl) xpEl.textContent = state.xp;
        if (streakEl) streakEl.textContent = state.streak.count;
    }

    /* ---------- Индикатор синхронизации ----------
       Push прогресса на сервер идёт тихо в фоне, и человеку неоткуда было
       узнать, сработал ли он вообще. Показываем момент последнего успешного
       push'а (Progress.lastSyncAt) человеческим языком. */
    // Русское склонение (минуту/минуты/минут) — актуально только для ru;
    // для en используется простое единственное/множественное число ниже.
    function pluralRu(n, one, few, many) {
        const n10 = n % 10;
        const n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return one;
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
        return many;
    }

    function unitWord(n, kind) {
        if (window.MW_LANG === 'ru') {
            return pluralRu(n, t(`js.account.unit_${kind}_one`), t(`js.account.unit_${kind}_few`), t(`js.account.unit_${kind}_many`));
        }
        return n === 1 ? t(`js.account.unit_${kind}_one`) : t(`js.account.unit_${kind}_few`);
    }

    function humanAgo(date) {
        const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
        if (sec < 15) return t('js.account.time_just_now');
        if (sec < 60) return t('js.account.time_less_minute');
        const min = Math.floor(sec / 60);
        if (min < 60) return t('js.account.time_ago', { '{n}': min, '{unit}': unitWord(min, 'minute') });
        const hours = Math.floor(min / 60);
        if (hours < 24) return t('js.account.time_ago', { '{n}': hours, '{unit}': unitWord(hours, 'hour') });
        const days = Math.floor(hours / 24);
        if (days < 30) return t('js.account.time_ago', { '{n}': days, '{unit}': unitWord(days, 'day') });
        return date.toLocaleDateString(window.MW_LANG === 'en' ? 'en-US' : 'ru-RU');
    }

    function renderSyncIndicator() {
        const el = document.getElementById('sync-indicator');
        if (!el) return;
        const at = Progress.lastSyncAt();
        el.textContent = at
            ? t('js.account.sync_indicator_synced', { '{ago}': humanAgo(at) })
            : t('js.account.sync_indicator_never');
    }

    // Перерисовываем и по событию (успешный push), и по таймеру — иначе
    // «только что» так и висело бы «только что» через полчаса на открытой
    // вкладке.
    window.addEventListener('progress:synced', renderSyncIndicator);
    setInterval(renderSyncIndicator, 30000);

    function showProfile(user) {
        guestBlock.style.display = 'none';
        profileBlock.style.display = 'block';
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        renderAdminLink(user);
        renderVerifyStatus(user);
        updateLocalStats();
        renderSyncIndicator();
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
            ? t('js.account.verify_redirect_ok')
            : t('js.account.verify_redirect_bad');
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
                feedback.textContent = data.error || t('js.account.login_failed_default');
                feedback.className = 'feedback show bad';
            }
        } catch {
            feedback.textContent = t('js.account.network_error');
            feedback.className = 'feedback show bad';
        }
    });

    document.getElementById('register-btn').addEventListener('click', async () => {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const captcha = document.getElementById('captcha-answer').value.trim();
        const agree = document.getElementById('register-agree').checked;
        const feedback = document.getElementById('register-feedback');

        if (password !== passwordConfirm) {
            feedback.textContent = t('api.register.passwords_mismatch');
            feedback.className = 'feedback show bad';
            return;
        }

        if (!agree) {
            feedback.textContent = t('js.account.must_agree_client');
            feedback.className = 'feedback show bad';
            return;
        }

        try {
            const res = await fetch('api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, passwordConfirm, captcha, agree }),
            });
            const data = await res.json();
            if (res.ok) {
                showProfile(data.user);
                // Для нового аккаунта на сервере пусто — merge ничего не
                // изменит, но сразу запушится текущий локальный прогресс.
                Progress.syncWithServer();
                feedback.textContent = data.mail_sent
                    ? t('js.account.account_created_check_email')
                    : t('js.account.account_created_mail_failed');
                feedback.className = 'feedback show ok';
            } else {
                feedback.textContent = data.error || t('js.account.register_failed_default');
                feedback.className = 'feedback show bad';
                if (data.code === 'captcha') loadCaptcha(); // новый код взамен неверно разгаданного
            }
        } catch {
            feedback.textContent = t('js.account.network_error');
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

    /* ---------- Удаление аккаунта ---------- */
    const delReveal = document.getElementById('delete-account-reveal-btn');
    const delConfirmWrap = document.getElementById('delete-account-confirm');
    const delCancel = document.getElementById('delete-account-cancel-btn');
    const delConfirm = document.getElementById('delete-account-confirm-btn');
    const delPass = document.getElementById('delete-account-pass');
    const delFeedback = document.getElementById('delete-account-feedback');

    if (delReveal) {
        delReveal.addEventListener('click', () => {
            delConfirmWrap.style.display = 'block';
            delReveal.style.display = 'none';
            delPass.focus();
        });
        delCancel.addEventListener('click', () => {
            delConfirmWrap.style.display = 'none';
            delReveal.style.display = 'inline-flex';
            delPass.value = '';
            delFeedback.className = 'feedback';
        });
        delConfirm.addEventListener('click', async () => {
            const password = delPass.value;
            if (!password) {
                delFeedback.textContent = t('js.account.delete_need_password');
                delFeedback.className = 'feedback show bad';
                return;
            }
            delConfirm.disabled = true;
            try {
                const res = await fetch('api/delete_account.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                const data = await res.json();
                if (res.ok && data.ok) {
                    // Аккаунт снесён на сервере — чистим и локальную копию, как при выходе.
                    Progress.resetAll();
                    localStorage.removeItem(CLAIM_KEY);
                    delConfirmWrap.style.display = 'none';
                    showGuest();
                    const gf = document.getElementById('login-feedback');
                    if (gf) {
                        gf.textContent = t('js.account.delete_success');
                        gf.className = 'feedback show ok';
                    }
                } else {
                    delFeedback.textContent = data.error || t('js.account.delete_failed_default');
                    delFeedback.className = 'feedback show bad';
                }
            } catch {
                delFeedback.textContent = t('js.account.network_error');
                delFeedback.className = 'feedback show bad';
            } finally {
                delConfirm.disabled = false;
            }
        });
    }

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
                feedback.textContent = t('js.account.sync_success');
                feedback.className = 'feedback show ok';
            } else if (data.reason === 'email_not_verified') {
                feedback.textContent = t('js.account.sync_need_verify');
                feedback.className = 'feedback show bad';
            } else {
                feedback.textContent = t('js.account.sync_failed_default');
                feedback.className = 'feedback show bad';
            }
        } catch {
            feedback.textContent = t('js.account.network_error');
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
                const proceed = confirm(t('js.account.claim_confirm', { '{claimName}': claim.name, '{userName}': data.user.name }));
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
                feedback.textContent = data.error || t('js.account.reset_request_failed_default');
                feedback.className = 'feedback show bad';
                if (data.code === 'captcha') resetCaptcha.load();
            }
        } catch {
            feedback.textContent = t('js.account.network_error');
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
                    feedback.textContent = data.message + t('js.account.reset_password_opening');
                    feedback.className = 'feedback show ok';
                    history.replaceState({}, '', location.pathname); // убираем токен из адресной строки
                    setTimeout(() => {
                        document.getElementById('reset-password-form').style.display = 'none';
                        document.getElementById('login-form').style.display = 'block';
                    }, 1500);
                } else {
                    feedback.textContent = data.error || t('js.account.reset_password_failed_default');
                    feedback.className = 'feedback show bad';
                }
            } catch {
                feedback.textContent = t('js.account.network_error');
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
            feedback.textContent = res.ok ? data.message : (data.error || t('js.account.update_failed_default'));
            feedback.className = res.ok ? 'feedback show ok' : 'feedback show bad';
            return res.ok ? data : null;
        } catch {
            feedback.textContent = t('js.account.network_error');
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

    // Ручная приватная синхронизация (НЕ публикация в лидерборд — это выше,
    // sync-btn/syncNow). Раньше пул+мёрж с сервером срабатывал только один
    // раз, сразу после логина — если человек оставался залогинен на
    // устройстве днями, оно никогда больше не подтягивало то, что за это
    // время наиграли на других устройствах, и это было легко принять за
    // баг ("нажимаю синхронизировать, а он не подтягивает с базы"). Кнопка
    // просто дёргает тот же Progress.syncWithServer(), что и логин: тянет
    // с сервера, мержит по максимуму, сохраняет и пушит результат.
    document.getElementById('manual-sync-btn').addEventListener('click', async () => {
        const btn = document.getElementById('manual-sync-btn');
        const feedback = document.getElementById('manual-sync-feedback');
        btn.disabled = true;
        const before = Progress.load().xp;
        const merged = await Progress.syncWithServer();
        btn.disabled = false;
        if (!merged) {
            feedback.textContent = t('js.account.manual_sync_failed');
            feedback.className = 'feedback show bad';
            return;
        }
        feedback.textContent = merged.xp > before
            ? t('js.account.manual_sync_pulled', { '{before}': before, '{after}': merged.xp })
            : t('js.account.manual_sync_uptodate');
        feedback.className = 'feedback show ok';
    });

    // Слияние прогресса с сервером после логина завершается асинхронно и
    // шлёт это событие — перерисовываем локальные цифры в профиле (счётчики
    // в шапке обновляет app.js по тому же событию).
    window.addEventListener('progress:updated', (e) => updateLocalStats(e.detail));

    refreshAuthState();
    loadCaptcha();
})();

/* ======================= Бэкап прогресса файлом =======================
   Страховка для тех, кто тренируется без аккаунта (и просто перед чисткой
   браузера). Сознательно всего две кнопки, без настроек и без диалогов
   подтверждения: импорт идёт через Progress.importBackup() → merge «только
   вверх», потерять данные им физически нельзя. */
(function () {
    const exportBtn = document.getElementById('backup-export-btn');
    const importBtn = document.getElementById('backup-import-btn');
    const fileInput = document.getElementById('backup-file-input');
    const feedback = document.getElementById('backup-feedback');
    if (!exportBtn || !importBtn || !fileInput) return;

    function say(text, ok) {
        feedback.textContent = text;
        feedback.className = ok ? 'feedback show ok' : 'feedback show bad';
    }

    exportBtn.addEventListener('click', () => {
        try {
            const data = Progress.exportBackup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `morsewave-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            // Отзываем ссылку не сразу — Safari успевает начать скачивание
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            say(t('js.account.backup_saved', { '{xp}': data.xp, '{count}': data.learnedLetters.length }), true);
        } catch (e) {
            console.error(e);
            say(t('js.account.backup_build_failed'), false);
        }
    });

    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
            const merged = Progress.importBackup(JSON.parse(await file.text()));
            say(t('js.account.backup_loaded', { '{xp}': merged.xp, '{count}': merged.learnedLetters.length }), true);
        } catch (e) {
            say(e instanceof SyntaxError ? t('js.account.backup_corrupt') : e.message, false);
        }
        fileInput.value = ''; // иначе повторный выбор того же файла не даст change
    });
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

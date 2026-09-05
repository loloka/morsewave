(async function () {
    // Декоративная, но честная демонстрация сигнальной линии
    const heroEl = document.getElementById('hero-signal');
    const heroLine = new SignalLine(heroEl, 46);
    const DEMO_PHRASES = [
        'CQ CQ CQ DE MORSEWAVE PSE K ',
        'GM UR RST 599 5NN FB 73 ES GL DE MORSEWAVE ',
        'QRZ DE MORSEWAVE OP ALEX QTH MOSCOW HW CPY? ',
        'CQ CONTEST MORSEWAVE TEST ',
        'CW IS NOT DEAD IT IS ART ',
        'RADIO WAVE CONNECTS THE WORLD 73 ',
        'TNX FER QSO 73 SK DE MORSEWAVE EE '
    ];

    // Предзаполняем ленту с самого старта, чтобы блок сразу был полон символов,
    // и пользователь видел поток, а не пустую коробку
    (function prefillSignalLine() {
        const seed = 'MORSEWAVE CQ ';
        for (const ch of seed) {
            if (ch === ' ') {
                heroLine.gap('word-gap');
                continue;
            }
            const code = (typeof MORSE_CODE !== 'undefined') ? MORSE_CODE[ch] : null;
            if (code) {
                for (const sym of code) {
                    const bar = document.createElement('div');
                    bar.className = `signal-bar ${sym === '.' ? 'dot' : 'dash'}`;
                    heroEl.appendChild(bar);
                }
                heroLine.gap('char-gap');
            }
        }
        while (heroEl.children.length > 46) {
            heroEl.removeChild(heroEl.firstChild);
        }
    })();

    // Бесконечный цикл: новый символ рождается справа, ярко подсвечивается,
    // а предыдущие плавно уплывают влево.
    (async function visualOnlyLoop() {
        let phraseIdx = 0;
        while (true) {
            const phrase = DEMO_PHRASES[phraseIdx % DEMO_PHRASES.length];
            phraseIdx++;
            for (let i = 0; i < phrase.length; i++) {
                const ch = phrase[i];
                if (ch === ' ') {
                    heroLine.gap('word-gap');
                    await new Promise((r) => setTimeout(r, 450));
                    continue;
                }
                const code = (typeof MORSE_CODE !== 'undefined') ? MORSE_CODE[ch] : null;
                if (code) {
                    for (let s = 0; s < code.length; s++) {
                        const sym = code[s];
                        const dur = sym === '.' ? 130 : 270;
                        heroLine.pulse(sym === '.' ? 'dot' : 'dash', dur);
                        await new Promise((r) => setTimeout(r, dur + 90));
                    }
                    heroLine.gap('char-gap');
                    await new Promise((r) => setTimeout(r, 260));
                }
            }
            await new Promise((r) => setTimeout(r, 1200));
        }
    })();

    // Счётчик выученных символов
    const state = Progress.load();
    document.getElementById('home-learned-count').textContent = state.learnedLetters.length;

    // Задание дня: целевое под этап игрока (новичку — изучить буквы, дальше —
    // приём на слух, знающему алфавит — группы). Единый расчёт в daily.js,
    // чтобы главная и режим-исполнитель не разошлись.
    (function renderDailyChallenge() {
        const dateStr = DailyChallenge.todayStr();
        const task = DailyChallenge.forToday(state);

        document.getElementById('daily-title').textContent = task.title;
        document.getElementById('daily-desc').textContent = task.desc;

        const link = document.getElementById('daily-link');
        link.href = task.href;

        if (state.dailyChallengeDate === dateStr) {
            // Явная отметка «пройдено» — заметная плашка на карточке, а не
            // только текст ссылки (его легко не заметить).
            const card = document.getElementById('daily-card');
            card.classList.add('daily-card-done');

            const badge = document.createElement('div');
            badge.className = 'daily-done-badge';
            badge.textContent = t('js.home.daily_done_badge');
            card.querySelector('.card-eyebrow').after(badge);

            document.getElementById('daily-desc').textContent = t('js.home.daily_done_desc');
            link.textContent = t('js.home.daily_repeat_no_bonus');
            link.classList.remove('btn-primary');
            link.classList.add('btn');
        }
    })();

    // Общая статистика сообщества + таблица лидеров — раньше два отдельных
    // fetch'а (stats.php, leaderboard.php), теперь один batch-запрос к
    // api/dashboard.php (см. progress.js: fetchDashboard кэширует ответ в
    // sessionStorage на минуту, повторные заходы на главную в той же
    // вкладке БД не дёргают). Общий try/catch — если запрос не прошёл,
    // отваливаются обе секции разом, но это один сетевой сбой, не два.
    let dash = {};
    try {
        dash = await Progress.fetchDashboard(['stats', 'leaderboard']);
    } catch { /* обработка ниже — dash остаётся {} */ }

    const stats = dash.stats || null;
    document.getElementById('stat-groups').textContent = stats ? (stats.total_groups ?? 0) : '—';
    document.getElementById('stat-callsigns').textContent = stats ? (stats.total_callsigns ?? 0) : '—';

    // Таблица лидеров: топ-10 + (если пользователь опубликован, но не попал
    // в десятку) отдельной строкой его настоящее место — "…" перед ней,
    // только если между концом десятки и его местом есть разрыв (иначе на
    // 11-м месте многоточие перед единственной пропущенной строкой смотрится
    // странно — там и так ничего не пропущено).
    function renderLeaderboard(el, rows, valueKey, rankKey, me) {
        if (!rows.length && !(me && me[rankKey])) {
            el.innerHTML = '<p class="muted" style="font-size:13px;">' + t('js.home.leaderboard_empty') + '</p>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        let html = rows.map((row, i) => `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">${medals[i] || (i + 1)}</span>
                <span class="leaderboard-name">${escapeHtml(row.name)}</span>
                <span class="leaderboard-value">${row[valueKey]}</span>
            </div>
        `).join('');

        if (me && me[rankKey] && me[rankKey] > rows.length) {
            if (me[rankKey] > rows.length + 1) {
                html += '<div class="leaderboard-row leaderboard-row-ellipsis"><span class="leaderboard-rank">⋯</span></div>';
            }
            html += `
                <div class="leaderboard-row leaderboard-row-me">
                    <span class="leaderboard-rank">${me[rankKey]}</span>
                    <span class="leaderboard-name">${escapeHtml(me.name)} <span class="leaderboard-you-badge">${t('leaderboard.you_badge')}</span></span>
                    <span class="leaderboard-value">${me[valueKey]}</span>
                </div>
            `;
        }

        el.innerHTML = html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    if (dash.leaderboard) {
        renderLeaderboard(document.getElementById('leaderboard-xp'), dash.leaderboard.byXp || [], 'xp', 'xp_rank', dash.leaderboard.me);
        renderLeaderboard(document.getElementById('leaderboard-streak'), dash.leaderboard.byStreak || [], 'streak_count', 'streak_rank', dash.leaderboard.me);
    } else {
        document.getElementById('leaderboard-xp').innerHTML = '<p class="muted">' + t('js.home.leaderboard_load_failed') + '</p>';
        document.getElementById('leaderboard-streak').innerHTML = '<p class="muted">' + t('js.home.leaderboard_load_failed') + '</p>';
    }

    document.querySelectorAll('#leaderboard-section .chip[data-board]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#leaderboard-section .chip[data-board]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const board = chip.dataset.board;
            document.getElementById('leaderboard-xp').style.display = board === 'xp' ? 'block' : 'none';
            document.getElementById('leaderboard-streak').style.display = board === 'streak' ? 'block' : 'none';
        });
    });
})();

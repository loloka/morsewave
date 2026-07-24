(async function () {
    // Декоративная, но честная демонстрация сигнальной линии
    const heroLine = new SignalLine(document.getElementById('hero-signal'), 24);
    const demoAudio = new MorseAudio({ wpm: 18, farnsworthWpm: 12 });
    const demoText = 'CQ CQ MORSEWAVE';

    async function loopDemo() {
        await demoAudio.play(demoText, {
            onSymbol: ({ symbol }) => heroLine.pulse(symbol === '.' ? 'dot' : 'dash'),
        });
        setTimeout(loopDemo, 1200);
    }
    // Звук не включаем автоматически (браузеры блокируют autoplay) —
    // просто анимируем визуально через видимые импульсы по таймеру.
    (function visualOnlyLoop() {
        const codeStream = demoText.toUpperCase().split('').filter(c => c !== ' ').join('');
        let i = 0;
        setInterval(() => {
            const ch = codeStream[i % codeStream.length];
            const code = MORSE_CODE[ch];
            if (code) {
                let d = 0;
                for (const sym of code) {
                    setTimeout(() => heroLine.pulse(sym === '.' ? 'dot' : 'dash'), d);
                    d += sym === '.' ? 140 : 320;
                }
            }
            i++;
        }, 420);
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
            badge.textContent = '✓ Задание дня пройдено';
            card.querySelector('.card-eyebrow').after(badge);

            document.getElementById('daily-desc').textContent =
                'Бонус +50 XP за сегодня уже получен. Можно повторить для тренировки — опыт за верные символы начисляется как обычно.';
            link.textContent = 'Повторить без бонуса';
            link.classList.remove('btn-primary');
            link.classList.add('btn');
        }
    })();

    // Общая статистика сообщества
    try {
        const res = await fetch('api/stats.php');
        const stats = await res.json();
        document.getElementById('stat-groups').textContent = stats.total_groups ?? 0;
        document.getElementById('stat-callsigns').textContent = stats.total_callsigns ?? 0;
    } catch {
        document.getElementById('stat-groups').textContent = '—';
        document.getElementById('stat-callsigns').textContent = '—';
    }

    // Таблица лидеров
    function renderLeaderboard(el, rows, valueKey, medalless = false) {
        if (!rows.length) {
            el.innerHTML = '<p class="muted" style="font-size:13px;">Пока никто не опубликовал свои цифры — будь первым!</p>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        el.innerHTML = rows.map((row, i) => `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">${medals[i] || (i + 1)}</span>
                <span class="leaderboard-name">${escapeHtml(row.name)}</span>
                <span class="leaderboard-value">${row[valueKey]}</span>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    try {
        const res = await fetch('api/leaderboard.php?limit=10');
        const data = await res.json();
        renderLeaderboard(document.getElementById('leaderboard-xp'), data.byXp || [], 'xp');
        renderLeaderboard(document.getElementById('leaderboard-streak'), data.byStreak || [], 'streak_count');
    } catch {
        document.getElementById('leaderboard-xp').innerHTML = '<p class="muted">Не удалось загрузить</p>';
        document.getElementById('leaderboard-streak').innerHTML = '<p class="muted">Не удалось загрузить</p>';
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

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

    // Задание дня: детерминированный набор параметров на основе сегодняшней даты,
    // одинаковый для всех — создаёт ощущение общего "вызова дня".
    (function renderDailyChallenge() {
        const dateStr = new Date().toISOString().slice(0, 10);
        let seed = 0;
        for (const ch of dateStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        const pick = (arr) => arr[seed % arr.length];

        const lens = [2, 3, 4, 5];
        const counts = [10, 15, 20];
        const wpms = [12, 15, 18, 20, 24];
        const len = pick(lens);
        seed = (seed * 7 + 3) >>> 0;
        const count = counts[seed % counts.length];
        seed = (seed * 7 + 3) >>> 0;
        const wpm = wpms[seed % wpms.length];

        document.getElementById('daily-title').textContent =
            `${count} групп по ${len} символа(ов) на ${wpm} wpm`;
        document.getElementById('daily-desc').textContent =
            'Одинаковое задание для всех сегодня. Бонус +50 XP начисляется один раз в день.';

        const link = document.getElementById('daily-link');
        link.href = `groups.php?daily=1&len=${len}&count=${count}&wpm=${wpm}`;

        if (state.dailyChallengeDate === dateStr) {
            link.textContent = '✓ Уже пройдено сегодня (можно повторить без бонуса)';
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
})();

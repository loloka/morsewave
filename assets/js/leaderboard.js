(async function () {
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Полная таблица: ранг тут — это просто позиция в уже отсортированном
    // списке (сервер отдаёт до 500 строк, на практике это все опубликованные
    // разом), поэтому отдельный запрос на ранг, как на главной, не нужен —
    // строку "я" просто подсвечиваем по совпадению user_id.
    function renderFull(el, rows, valueKey, me) {
        if (!rows.length) {
            el.innerHTML = '<p class="muted" style="font-size:13px;">' + t('js.leaderboard.empty') + '</p>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        el.innerHTML = rows.map((row, i) => {
            const isMe = me && me.user_id === row.user_id;
            return `
                <div class="leaderboard-row${isMe ? ' leaderboard-row-me' : ''}">
                    <span class="leaderboard-rank">${medals[i] || (i + 1)}</span>
                    <span class="leaderboard-name">${escapeHtml(row.name)}${isMe ? ' <span class="leaderboard-you-badge">' + t('leaderboard.you_badge') + '</span>' : ''}</span>
                    <span class="leaderboard-value">${row[valueKey]}</span>
                </div>
            `;
        }).join('');
    }

    try {
        const res = await fetch('api/leaderboard.php?full=1');
        const data = await res.json();
        renderFull(document.getElementById('leaderboard-full-xp'), data.byXp || [], 'xp', data.me);
        renderFull(document.getElementById('leaderboard-full-streak'), data.byStreak || [], 'streak_count', data.me);
    } catch {
        document.getElementById('leaderboard-full-xp').innerHTML = '<p class="muted">' + t('js.leaderboard.load_failed') + '</p>';
        document.getElementById('leaderboard-full-streak').innerHTML = '<p class="muted">' + t('js.leaderboard.load_failed') + '</p>';
    }

    document.querySelectorAll('.chip-row .chip[data-board]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip-row .chip[data-board]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const board = chip.dataset.board;
            document.getElementById('leaderboard-full-xp').style.display = board === 'xp' ? 'block' : 'none';
            document.getElementById('leaderboard-full-streak').style.display = board === 'streak' ? 'block' : 'none';
        });
    });
})();

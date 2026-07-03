(function () {
    const setupPanel = document.getElementById('setup-panel');
    const sessionPanel = document.getElementById('session-panel');
    const resultPanel = document.getElementById('result-panel');
    const csIndexEl = document.getElementById('cs-index');
    const csTotalEl = document.getElementById('cs-total');
    const answerInput = document.getElementById('cs-answer');
    const feedbackEl = document.getElementById('cs-feedback');
    const setupError = document.getElementById('setup-error');
    const signalLine = new SignalLine(document.getElementById('cs-signal'));
    const lamp = new MorseLamp(document.getElementById('cs-lamp'));

    const wpmSlider = document.getElementById('cs-wpm');
    const wpmValue = document.getElementById('cs-wpm-value');
    wpmSlider.addEventListener('input', () => { wpmValue.textContent = wpmSlider.value; });

    let session = null;
    let isPlaying = false;
    const replayBtn = document.getElementById('replay-btn');

    async function fetchCallsigns(count) {
        const res = await fetch(`api/callsigns.php?count=${count}`);
        if (!res.ok) throw new Error('network');
        return res.json();
    }

    async function playCurrent() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        replayBtn.disabled = true;
        signalLine.clear();
        const audio = new MorseAudio({ wpm: session.wpm });
        await audio.play(session.items[session.index].callsign, {
            onSymbol: ({ symbol, durationMs }) => {
                signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                lamp.flash(durationMs);
            },
        });
        isPlaying = false;
        replayBtn.disabled = false;
    }

    async function startSession() {
        const wpm = parseInt(wpmSlider.value, 10);
        const count = parseInt(document.getElementById('cs-count').value, 10);
        setupError.className = 'feedback';

        let items;
        try {
            items = await fetchCallsigns(count);
            if (!items.length) throw new Error('empty');
        } catch {
            setupError.textContent = 'Не удалось получить позывные из базы данных. Проверь, что MySQL запущена и таблица callsigns заполнена (см. database/schema.sql).';
            setupError.className = 'feedback show bad';
            return;
        }

        session = { items, index: 0, wpm, correct: 0 };
        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        csTotalEl.textContent = items.length;
        csIndexEl.textContent = 1;
        feedbackEl.className = 'feedback';
        answerInput.value = '';
        answerInput.focus();
        playCurrent();
    }

    function submitAnswer() {
        if (!session) return;
        const expected = session.items[session.index].callsign.toUpperCase();
        const typed = answerInput.value.trim().toUpperCase();
        const isCorrect = typed === expected;

        if (isCorrect) {
            session.correct++;
            feedbackEl.textContent = `Верно: ${expected} (+20 XP)`;
            feedbackEl.className = 'feedback show ok';
            // Начисляем сразу — не нужно дожидаться конца сессии,
            // чтобы засчитанный позывной действительно засчитался.
            Progress.addXp(20);
            Progress.incrementStat('callsignsCompleted', 1);
            postStat('total_callsigns', 1);
        } else {
            feedbackEl.textContent = `Было: ${expected} — введено: ${typed || '(пусто)'}`;
            feedbackEl.className = 'feedback show bad';
        }

        session.index++;
        answerInput.value = '';
        if (session.index >= session.items.length) {
            setTimeout(finishSession, 700);
        } else {
            csIndexEl.textContent = session.index + 1;
            answerInput.focus();
            setTimeout(playCurrent, 900);
        }
    }

    async function finishSession() {
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const total = session.items.length;
        const accuracy = total ? session.correct / total : 0;
        const xpEarned = session.correct * 20;

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correct}/${total}`;
        document.getElementById('result-xp').textContent = xpEarned;

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);
    }

    async function postStat(field, amount) {
        if (amount <= 0) return;
        try {
            await fetch('api/stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, amount }),
            });
        } catch { /* игнорируем офлайн */ }
    }

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    replayBtn.addEventListener('click', playCurrent);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
    });
    answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });
})();

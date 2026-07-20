(function () {
    const GROUP_LEN = 5;
    const PASS_THRESHOLD = 0.9;

    /**
     * Та же логика, что и в groups.js: маленький открытый набор символов
     * (например, только K и M в начале метода Коха) — угадать куда проще,
     * чем весь алфавит, поэтому и награда меньше. Раньше здесь была плоская
     * ставка 2 XP/символ независимо от того, открыто 2 символа или все 38 —
     * несоразмерно с балансом остальных режимов.
     *
     * ВНИМАНИЕ: формула здесь намеренно НЕ такая, как в groups.js (там с
     * v2.33 делитель 26 и корень). Не «унифицируй» их. Причина: в Кохе
     * набор символов задан уровнем, а не выбором человека, — пофармить
     * маленьким набором нельзя, для этого пришлось бы сидеть на низком
     * уровне, который и так даёт мало XP. Лазейка, которую закрывали в
     * groups.js, тут физически невозможна, а ужесточение только срезало
     * бы мотивацию на средних уровнях метода.
     */
    function xpRateForSession(charsetSize, len) {
        const charsetFactor = Math.min(1, Math.max(0.15, charsetSize / 15));
        const lengthFactor = len / 3;
        return 2 * charsetFactor * lengthFactor;
    }

    const kochLevelEl = document.getElementById('koch-level');
    const kochCharsetEl = document.getElementById('koch-charset');
    const kochProgressBar = document.getElementById('koch-progress-bar');

    const jumpSlider = document.getElementById('koch-jump');
    const jumpValue = document.getElementById('koch-jump-value');
    const jumpApplyBtn = document.getElementById('koch-jump-apply');

    const wpmSlider = document.getElementById('koch-wpm');
    const wpmValue = document.getElementById('koch-wpm-value');
    const fwEnabled = document.getElementById('koch-farnsworth-enabled');
    const fwWrap = document.getElementById('koch-farnsworth-wrap');
    const fwSlider = document.getElementById('koch-farnsworth');
    const fwValue = document.getElementById('koch-farnsworth-value');

    const setupPanel = document.getElementById('setup-panel');
    const sessionPanel = document.getElementById('session-panel');
    const resultPanel = document.getElementById('result-panel');

    const groupIndexEl = document.getElementById('group-index');
    const groupTotalEl = document.getElementById('group-total');
    const answerInput = document.getElementById('koch-answer');
    const feedbackEl = document.getElementById('koch-feedback');
    const signalLine = new SignalLine(document.getElementById('koch-signal'));
    wireSignalVisibilityToggle(document.getElementById('koch-signal-toggle'), document.getElementById('koch-signal'));
    const lamp = new MorseLamp(document.getElementById('koch-lamp'));

    let session = null;
    let isPlaying = false;
    const replayBtn = document.getElementById('replay-btn');

    function currentCharset() {
        const state = Progress.load();
        return KOCH_ORDER.slice(0, state.kochLevel);
    }

    const kochCharsetFeedback = document.getElementById('koch-charset-feedback');

    function renderHeader() {
        const state = Progress.load();
        const charset = currentCharset();
        kochLevelEl.textContent = state.kochLevel;
        kochProgressBar.style.width = `${(state.kochLevel / KOCH_ORDER.length) * 100}%`;
        jumpSlider.value = state.kochLevel;
        jumpValue.textContent = jumpSlider.value;

        kochCharsetEl.innerHTML = '';
        charset.forEach((ch) => {
            const chip = document.createElement('div');
            chip.className = 'chip mono';
            chip.textContent = ch;
            chip.title = 'Тапни, чтобы услышать';
            chip.addEventListener('click', () => playCharsetLetter(ch, chip));
            kochCharsetEl.appendChild(chip);
        });
    }

    async function playCharsetLetter(ch, chip) {
        const wpm = parseInt(wpmSlider.value, 10) || 12;
        const audio = new MorseAudio({ wpm });
        chip.classList.add('active');
        const mnemonic = MORSE_MNEMONICS[ch];
        const tita = MORSE_CODE[ch].split('').map(s => s === '.' ? 'ти' : 'та').join('-');
        kochCharsetFeedback.className = 'feedback show ok';
        kochCharsetFeedback.textContent = mnemonic
            ? `«${ch}»: ${tita} (напев: ${mnemonic.join('-')})`
            : `«${ch}»: ${tita}`;
        await audio.play(ch, {});
        chip.classList.remove('active');
    }

    jumpSlider.addEventListener('input', () => { jumpValue.textContent = jumpSlider.value; });
    jumpApplyBtn.addEventListener('click', () => {
        const level = parseInt(jumpSlider.value, 10);
        const state = Progress.load();
        if (level === state.kochLevel) return;

        if (level < state.kochLevel) {
            const ok = confirm(
                `Уменьшить число открытых символов с ${state.kochLevel} до ${level}?\n` +
                `Прогресс метода Коха откатится назад.`
            );
            if (!ok) return;
        }

        Progress.setKochLevel(level);
        renderHeader();
        feedbackEl.textContent = `Теперь открыто ${level} символов метода Коха.`;
        feedbackEl.className = 'feedback show ok';
        setTimeout(() => { feedbackEl.className = 'feedback'; }, 2500);
    });

    wpmSlider.addEventListener('input', () => { wpmValue.textContent = wpmSlider.value; });
    fwSlider.addEventListener('input', () => { fwValue.textContent = fwSlider.value; });
    fwEnabled.addEventListener('change', () => {
        const on = fwEnabled.checked;
        fwWrap.style.display = on ? 'inline-flex' : 'none';
        fwValue.style.display = on ? 'inline-block' : 'none';
    });
    document.getElementById('koch-farnsworth-info').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const box = document.getElementById('koch-farnsworth-tooltip');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });

    function randomGroup(charset, len) {
        let g = '';
        for (let i = 0; i < len; i++) g += charset[Math.floor(Math.random() * charset.length)];
        return g;
    }

    async function playCurrentGroup() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        replayBtn.disabled = true;
        signalLine.clear();
        answerInput.focus();
        try {
            const audio = new MorseAudio({
                wpm: session.wpm,
                farnsworthWpm: session.farnsworth || null,
            });
            await audio.play(session.groups[session.index], {
                onSymbol: ({ symbol, durationMs }) => {
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения группы:', e);
        } finally {
            isPlaying = false;
            replayBtn.disabled = false;
            answerInput.focus();
        }
    }

    function startSession() {
        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled.checked ? parseInt(fwSlider.value, 10) : 0;
        const count = parseInt(document.getElementById('koch-count').value, 10);
        const charset = currentCharset();

        session = {
            groups: Array.from({ length: count }, () => randomGroup(charset, GROUP_LEN)),
            index: 0,
            wpm, farnsworth, count,
            correctChars: 0,
            totalChars: 0,
            xpEarned: 0,
            xpRate: xpRateForSession(charset.length, GROUP_LEN),
        };

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        groupTotalEl.textContent = count;
        feedbackEl.className = 'feedback';
        renderGroupIndex();
        answerInput.value = '';
        answerInput.focus();
        playCurrentGroup();
    }

    function renderGroupIndex() {
        groupIndexEl.textContent = session.index + 1;
    }

    function scoreAnswer(expected, typed) {
        let correct = 0;
        for (let i = 0; i < expected.length; i++) {
            if (typed[i] && typed[i].toUpperCase() === expected[i]) correct++;
        }
        return correct;
    }

    function submitAnswer() {
        if (!session) return;
        const expected = session.groups[session.index];
        const typed = answerInput.value.trim();
        const correct = scoreAnswer(expected, typed);

        session.correctChars += correct;
        session.totalChars += expected.length;

        // Начисляем сразу за эту группу — если сессия не будет
        // пройдена до конца, заработанное всё равно не потеряется.
        const xpGain = Math.round(correct * session.xpRate);
        session.xpEarned += xpGain;
        if (xpGain > 0) Progress.addXp(xpGain);
        Progress.incrementStat('groupsCompleted', 1);
        postStat('total_groups', 1);

        if (correct === expected.length) {
            feedbackEl.textContent = `Верно: ${expected}`;
            feedbackEl.className = 'feedback show ok';
        } else {
            feedbackEl.textContent = `Было: ${expected} — введено: ${typed || '(пусто)'}`;
            feedbackEl.className = 'feedback show bad';
        }

        session.index++;
        answerInput.value = '';
        if (session.index >= session.groups.length) {
            setTimeout(finishSession, 600);
        } else {
            renderGroupIndex();
            answerInput.focus();
            setTimeout(playCurrentGroup, 800);
        }
    }

    async function finishSession() {
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const accuracy = session.totalChars ? session.correctChars / session.totalChars : 0;
        let xpEarned = session.xpEarned;
        if (accuracy >= PASS_THRESHOLD) {
            // Бонус за пройденную сессию пропорционален её длине: 10/20/30
            // групп → +10/+20/+30 XP (раньше был плоский +30 — короткая
            // сессия из 10 групп награждалась как длинная из 30, нелогично).
            // Клампим на случай подмены значения select в DOM.
            const bonus = Math.min(30, Math.max(0, Math.round(session.count) || 0));
            xpEarned += bonus;
            Progress.addXp(bonus);
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);

        const msg = document.getElementById('result-message');
        const state = Progress.load();
        if (accuracy >= PASS_THRESHOLD && state.kochLevel < KOCH_ORDER.length) {
            Progress.setKochLevel(state.kochLevel + 1);
            msg.textContent = `Отличная точность! Открыт новый символ: «${KOCH_ORDER[state.kochLevel]}»`;
            msg.className = 'feedback show ok';
        } else if (accuracy >= PASS_THRESHOLD) {
            msg.textContent = 'Точность отличная — все символы метода Коха уже открыты!';
            msg.className = 'feedback show ok';
        } else {
            msg.textContent = `Точность ${Math.round(accuracy * 100)}% ниже порога 90% — потренируйся ещё на этом наборе символов.`;
            msg.className = 'feedback show bad';
        }
        renderHeader();
    }

    async function postStat(field, amount) {
        try {
            await fetch('api/stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, amount }),
            });
        } catch { /* тихо игнорируем, если сервер недоступен */ }
    }

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    replayBtn.addEventListener('click', playCurrentGroup);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
    });
    answerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    renderHeader();
})();

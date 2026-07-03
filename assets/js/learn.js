(function () {
    const REQUIRED_STREAK = 5; // сколько верных повторов подряд нужно для "выучено"

    /* ===================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ===================== */
    const sendModeEl = document.getElementById('send-mode');
    const recognizeModeEl = document.getElementById('recognize-mode');
    let recognizeModeActive = false;

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            sendModeEl.style.display = mode === 'send' ? 'block' : 'none';
            recognizeModeEl.style.display = mode === 'recognize' ? 'block' : 'none';
            recognizeModeActive = mode === 'recognize';
            if (recognizeModeActive) {
                initRecognizeGrid();
                startRecognizeSession();
            }
        });
    });

    /* ===================== РЕЖИМ: ОТПРАВКА ===================== */
    const grid = document.getElementById('letter-grid');
    const panel = document.getElementById('practice-panel');
    const letterEl = document.getElementById('practice-letter');
    const patternEl = document.getElementById('practice-pattern');
    const playBtn = document.getElementById('play-btn');
    const wpmSlider = document.getElementById('wpm-select');
    const wpmValue = document.getElementById('wpm-value');
    const keyEl = document.getElementById('telegraph-key');
    const lampEl = document.getElementById('practice-lamp');
    const signalEl = document.getElementById('practice-signal');
    const streakCountEl = document.getElementById('streak-count');
    const streakBarEl = document.getElementById('streak-bar');
    const feedbackEl = document.getElementById('practice-feedback');

    let current = null;
    let currentWasLearnedAtStart = false;
    let correctStreak = 0;
    let isPlaying = false;
    const signalLine = new SignalLine(signalEl);
    const lamp = new MorseLamp(lampEl);

    function renderTiles() {
        const state = Progress.load();
        grid.innerHTML = '';
        ALL_LEARNABLE.forEach((ch) => {
            const tile = document.createElement('div');
            tile.className = 'letter-tile' + (state.learnedLetters.includes(ch) ? ' learned' : '');
            tile.dataset.ch = ch;
            tile.innerHTML = `<div class="ch">${ch}</div><div class="code">${MORSE_CODE[ch]}</div>`;
            tile.addEventListener('click', () => selectLetter(ch));
            grid.appendChild(tile);
        });
    }

    function renderPattern(ch) {
        const code = MORSE_CODE[ch];
        patternEl.innerHTML = code.split('').map(s => `<span class="sym">${s === '.' ? '•' : '−'}</span>`).join(' ');

        const titaEl = document.getElementById('practice-tita');
        titaEl.innerHTML = code.split('').map(s => `<span class="unit">${s === '.' ? 'ти' : 'та'}</span>`).join('-');

        const napevEl = document.getElementById('practice-napev');
        const mnemonic = MORSE_MNEMONICS[ch];
        napevEl.innerHTML = mnemonic
            ? 'напев: ' + mnemonic.map(syl => `<span class="syl">${syl}</span>`).join('-')
            : '';
    }

    function selectLetter(ch) {
        current = ch;
        currentWasLearnedAtStart = Progress.load().learnedLetters.includes(ch);
        correctStreak = 0;
        updateStreakUI();
        [...grid.children].forEach(t => t.classList.toggle('selected', t.dataset.ch === ch));
        letterEl.textContent = ch;
        renderPattern(ch);
        panel.style.display = 'block';
        feedbackEl.className = 'feedback';
        signalLine.clear();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function currentWpm() {
        return parseInt(wpmSlider.value, 10);
    }

    async function playCurrent() {
        if (!current || isPlaying) return;
        isPlaying = true;
        playBtn.disabled = true;
        signalLine.clear();
        const audio = new MorseAudio({ wpm: currentWpm() });
        const spans = patternEl.querySelectorAll('.sym');
        const titaSpans = document.querySelectorAll('#practice-tita .unit');
        const napevSpans = document.querySelectorAll('#practice-napev .syl');
        let i = 0;
        await audio.play(current, {
            onSymbol: ({ symbol, durationMs }) => {
                spans[i]?.classList.add('playing');
                titaSpans[i]?.classList.add('playing');
                napevSpans[i]?.classList.add('playing');
                const idx = i;
                setTimeout(() => {
                    titaSpans[idx]?.classList.remove('playing');
                    napevSpans[idx]?.classList.remove('playing');
                }, durationMs);
                i++;
                lamp.flash(durationMs);
            },
        });
        spans.forEach(s => s.classList.remove('playing'));
        isPlaying = false;
        playBtn.disabled = false;
    }

    function updateStreakUI() {
        streakCountEl.textContent = correctStreak;
        streakBarEl.style.width = `${Math.min(correctStreak / REQUIRED_STREAK, 1) * 100}%`;
    }

    function handleDecodedLetter(decoded) {
        if (!current) return;

        if (decoded === current) {
            correctStreak++;
            // Звучит сам символ в подтверждение — приятная обратная связь
            const audio = new MorseAudio({ wpm: currentWpm() });
            const titaSpans = document.querySelectorAll('#practice-tita .unit');
            const napevSpans = document.querySelectorAll('#practice-napev .syl');
            let ci = 0;
            audio.play(current, {
                onSymbol: ({ durationMs }) => {
                    lamp.flash(durationMs);
                    titaSpans[ci]?.classList.add('playing');
                    napevSpans[ci]?.classList.add('playing');
                    const idx = ci;
                    setTimeout(() => {
                        titaSpans[idx]?.classList.remove('playing');
                        napevSpans[idx]?.classList.remove('playing');
                    }, durationMs);
                    ci++;
                },
            });

            if (currentWasLearnedAtStart) {
                feedbackEl.textContent = `Верно! Это «${decoded}» — символ уже освоен, тренируемся без XP`;
                feedbackEl.className = 'feedback show ok';
            } else if (correctStreak < REQUIRED_STREAK) {
                // XP пока не начисляем — награда даётся один раз, целиком,
                // только за реально пройденную серию, чтобы нельзя было
                // фармить попытками (успех-успех-успех-...-ошибка-заново).
                feedbackEl.textContent = `Верно! Это «${decoded}» (${correctStreak}/${REQUIRED_STREAK}, XP будет за всю серию)`;
                feedbackEl.className = 'feedback show ok';
            } else {
                Progress.markLetterLearned(current);
                Progress.addXp(25);
                Progress.markDailyActivity();
                currentWasLearnedAtStart = true; // чтобы дальше не начислять XP при повторах
                feedbackEl.textContent = `Символ «${current}» выучен! +25 XP`;
                feedbackEl.className = 'feedback show ok';
                renderTiles();
                [...grid.children].find(t => t.dataset.ch === current)?.classList.add('selected');
            }
        } else {
            correctStreak = 0;
            feedbackEl.textContent = `Получилось «${decoded}», а нужно «${current}». Попробуй ещё раз.`;
            feedbackEl.className = 'feedback show bad';
        }
        updateStreakUI();
        setTimeout(() => signalLine.clear(), 500); // готовим линию к следующей попытке
    }

    const key = new TelegraphKey(keyEl, {
        wpm: 15,
        onSymbol: (symbol) => signalLine.pulse(symbol === '.' ? 'dot' : 'dash'),
        onLetter: handleDecodedLetter,
        onPress: (isDown) => { if (isDown) lamp.on(); else lamp.off(); },
    });

    wpmSlider.addEventListener('input', () => {
        wpmValue.textContent = wpmSlider.value;
        key.setWpm(currentWpm());
    });
    playBtn.addEventListener('click', playCurrent);

    renderTiles();

    /* ===================== РЕЖИМ: ПРИЁМ НА СЛУХ ===================== */
    const recGrid = document.getElementById('recognize-grid');
    const recWpmSlider = document.getElementById('rec-wpm');
    const recWpmValue = document.getElementById('rec-wpm-value');
    const recStartBtn = document.getElementById('rec-start-btn');
    const recStopBtn = document.getElementById('rec-stop-btn');
    const recLamp = new MorseLamp(document.getElementById('rec-lamp'));
    const recSignalLine = new SignalLine(document.getElementById('rec-signal'));
    const recFeedback = document.getElementById('rec-feedback');
    const recStreakEl = document.getElementById('rec-streak');
    const recBestEl = document.getElementById('rec-best');
    const recAccuracyEl = document.getElementById('rec-accuracy');
    const recTotalEl = document.getElementById('rec-total');

    let recTarget = null;
    let recStreak = 0;
    let recBest = 0;
    let recSessionCorrect = 0;
    let recSessionTotal = 0;
    let recBusy = false;
    let recRunning = false;
    let recGridBuilt = false;
    let recCharsetKey = 'all';

    document.querySelectorAll('#rec-charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#rec-charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            recCharsetKey = chip.dataset.set;
            document.getElementById('rec-custom-input').style.display = recCharsetKey === 'custom' ? 'block' : 'none';
        });
    });

    function initRecognizeGrid() {
        if (recGridBuilt) return;
        recGridBuilt = true;
        recGrid.innerHTML = '';
        ALL_LEARNABLE.forEach((ch) => {
            const tile = document.createElement('div');
            tile.className = 'letter-tile';
            tile.dataset.ch = ch;
            tile.innerHTML = `<div class="ch">${ch}</div>`;
            tile.addEventListener('click', () => handleRecognizeAnswer(ch, tile));
            recGrid.appendChild(tile);
        });
    }

    // Вызывается при каждом заходе на вкладку "Приём на слух" —
    // серия/точность считаются за текущую сессию, рекорд и общий счёт — навсегда.
    function startRecognizeSession() {
        const state = Progress.load();
        recStreak = 0;
        recSessionCorrect = 0;
        recSessionTotal = 0;
        recRunning = false;
        recBest = state.stats.recognizeBestStreak || 0;
        renderRecStats(state.stats.recognizedCount || 0);
        recStartBtn.style.display = 'inline-flex';
        recStopBtn.style.display = 'none';
    }

    function renderRecStats(totalAllTime) {
        recStreakEl.textContent = recStreak;
        recBestEl.textContent = recBest;
        recAccuracyEl.textContent = recSessionTotal
            ? `${Math.round((recSessionCorrect / recSessionTotal) * 100)}%`
            : '—';
        recTotalEl.textContent = totalAllTime;
    }

    function recognizePool() {
        const state = Progress.load();
        switch (recCharsetKey) {
            case 'letters': return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            case 'digits': return '0123456789'.split('');
            case 'learned':
                return state.learnedLetters.length >= 5 ? state.learnedLetters : ALL_LEARNABLE;
            case 'custom': {
                const raw = document.getElementById('rec-custom-input').value.toUpperCase();
                const chars = [...new Set(raw.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).flatMap(s => s.split(''))
                    .filter(ch => MORSE_CODE[ch]))];
                return chars.length >= 5 ? chars : ALL_LEARNABLE;
            }
            default: return ALL_LEARNABLE;
        }
    }

    async function playRecognizeTarget() {
        const pool = recognizePool();
        recTarget = pool[Math.floor(Math.random() * pool.length)];
        recBusy = true;
        recFeedback.className = 'feedback';
        recSignalLine.clear();
        const audio = new MorseAudio({ wpm: parseInt(recWpmSlider.value, 10) });
        await audio.play(recTarget, {
            onSymbol: ({ symbol, durationMs }) => {
                recSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                recLamp.flash(durationMs);
            },
        });
        recBusy = false;
    }

    function handleRecognizeAnswer(ch, tile) {
        if (recBusy || !recTarget || !recRunning) return;
        const isCorrect = ch === recTarget;
        tile.classList.add(isCorrect ? 'correct' : 'wrong');
        setTimeout(() => tile.classList.remove('correct', 'wrong'), 500);

        recSessionTotal++;
        let state = Progress.load();

        if (isCorrect) {
            // Блокируем повторные ответы по этой же цели сразу — иначе можно
            // было бы спамить верную плитку в паузе перед следующим раундом
            // и бесконечно фармить XP за один и тот же символ.
            recBusy = true;
            recStreak++;
            recSessionCorrect++;
            recFeedback.textContent = `Верно: «${recTarget}» (+3 XP)`;
            recFeedback.className = 'feedback show ok';
            Progress.addXp(3);
            Progress.incrementStat('recognizedCount', 1);

            if (recStreak > recBest) {
                recBest = recStreak;
                state = Progress.load();
                state.stats.recognizeBestStreak = recBest;
                Progress.save(state);
                Progress.checkAchievements();
                recFeedback.textContent += ' — новый личный рекорд серии! 🏆';
            }
        } else {
            recStreak = 0;
            recFeedback.textContent = `Было «${recTarget}», нажата «${ch}»`;
            recFeedback.className = 'feedback show bad';
        }

        renderRecStats(Progress.load().stats.recognizedCount || 0);
        if (recRunning) setTimeout(playRecognizeTarget, 700);
    }

    // Ввод с физической клавиатуры — так же, как тап по плитке
    window.addEventListener('keydown', (e) => {
        if (!recognizeModeActive || recBusy || !recRunning) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const ch = e.key.toUpperCase();
        if (!ALL_LEARNABLE.includes(ch)) return;
        const tile = recGrid.querySelector(`[data-ch="${ch}"]`);
        if (tile) { e.preventDefault(); handleRecognizeAnswer(ch, tile); }
    });

    recWpmSlider.addEventListener('input', () => { recWpmValue.textContent = recWpmSlider.value; });
    recStartBtn.addEventListener('click', () => {
        recRunning = true;
        recStartBtn.style.display = 'none';
        recStopBtn.style.display = 'inline-flex';
        playRecognizeTarget();
    });
    recStopBtn.addEventListener('click', () => {
        recRunning = false;
        recStartBtn.style.display = 'inline-flex';
        recStopBtn.style.display = 'none';
    });
})();

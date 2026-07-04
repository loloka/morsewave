(function () {
    const groupsModeEl = document.getElementById('groups-mode');
    const abbrevModeEl = document.getElementById('abbrev-mode');
    let abbrevModeActive = false;

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            groupsModeEl.style.display = mode === 'groups' ? 'block' : 'none';
            abbrevModeEl.style.display = mode === 'abbrev' ? 'block' : 'none';
            abbrevModeActive = mode === 'abbrev';
            if (abbrevModeActive) initAbbrevGrid();
        });
    });

    const setupPanel = document.getElementById('setup-panel');
    const sessionPanel = document.getElementById('session-panel');
    const resultPanel = document.getElementById('result-panel');
    const groupIndexEl = document.getElementById('group-index');
    const groupTotalEl = document.getElementById('group-total');
    const answerInput = document.getElementById('groups-answer');
    const feedbackEl = document.getElementById('groups-feedback');
    const signalLine = new SignalLine(document.getElementById('groups-signal'));
    const lamp = new MorseLamp(document.getElementById('groups-lamp'));

    const wpmSlider = document.getElementById('groups-wpm');
    const wpmValue = document.getElementById('groups-wpm-value');
    const fwEnabled = document.getElementById('groups-farnsworth-enabled');
    const fwWrap = document.getElementById('groups-farnsworth-wrap');
    const fwSlider = document.getElementById('groups-farnsworth');
    const fwValue = document.getElementById('groups-farnsworth-value');

    let groupLen = 3;
    let charsetKey = 'letters';
    let session = null;
    let isDailyChallenge = false;
    let pendingExamMode = false;
    let isPlaying = false;
    const replayBtn = document.getElementById('replay-btn');

    wpmSlider.addEventListener('input', () => { wpmValue.textContent = wpmSlider.value; });
    fwSlider.addEventListener('input', () => { fwValue.textContent = fwSlider.value; });
    fwEnabled.addEventListener('change', () => {
        const on = fwEnabled.checked;
        fwWrap.style.display = on ? 'inline-flex' : 'none';
        fwValue.style.display = on ? 'inline-block' : 'none';
    });
    document.getElementById('groups-farnsworth-info').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const box = document.getElementById('groups-farnsworth-tooltip');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('#length-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#length-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            groupLen = parseInt(chip.dataset.len, 10);
        });
    });
    const customInput = document.getElementById('custom-charset-input');
    document.querySelectorAll('#charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            charsetKey = chip.dataset.set;
            customInput.style.display = charsetKey === 'custom' ? 'block' : 'none';
        });
    });

    const MIN_LEARNED_FOR_FILTER = 5;

    function parseCustomCharset() {
        const raw = customInput.value.toUpperCase();
        const chars = [...new Set(raw.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).flatMap(s => s.split('')))];
        return chars.filter(ch => MORSE_CODE[ch]);
    }

    function getCharset() {
        const state = Progress.load();
        switch (charsetKey) {
            case 'digits': return '0123456789'.split('');
            case 'mixed': return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
            case 'learned':
                return state.learnedLetters.length >= MIN_LEARNED_FOR_FILTER
                    ? state.learnedLetters
                    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            case 'custom': {
                const custom = parseCustomCharset();
                return custom.length >= MIN_LEARNED_FOR_FILTER ? custom : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            }
            default: return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }
    }

    function randomGroup(charset, len) {
        let g = '';
        for (let i = 0; i < len; i++) g += charset[Math.floor(Math.random() * charset.length)];
        return g;
    }

    /**
     * Ставка XP за один верный символ. Маленький кастомный набор (например,
     * 5 лёгких букв) — это существенно проще полного алфавита, поэтому
     * даёт меньше опыта: иначе можно было бы фармить XP почти бесплатно.
     * Длинные группы (5 символов) держать в памяти сложнее коротких (3) —
     * поэтому дают чуть больше опыта за символ.
     */
    function xpRateForSession(charsetSize, len) {
        const charsetFactor = Math.min(1, Math.max(0.15, charsetSize / 15));
        const lengthFactor = len / 3;
        return Math.round(2 * charsetFactor * lengthFactor * 10) / 10;
    }

    async function playCurrentGroup() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        replayBtn.disabled = true;
        signalLine.clear();
        const audio = new MorseAudio({ wpm: session.wpm, farnsworthWpm: session.farnsworth || null });
        await audio.play(session.groups[session.index], {
            onSymbol: ({ symbol, durationMs }) => {
                signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                lamp.flash(durationMs);
            },
        });
        isPlaying = false;
        replayBtn.disabled = false;
    }

    const examAnswerEl = document.getElementById('exam-answer');
    const examSubmitRow = document.getElementById('exam-submit-row');
    const examSubmitBtn = document.getElementById('exam-submit-btn');
    const groupsSubmitRow = document.getElementById('groups-submit-row');
    const EXAM_GROUP_GAP_MS = 1500; // небольшая пауза между группами в экзамене

    function startSession() {
        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled.checked ? parseInt(fwSlider.value, 10) : 0;
        const count = parseInt(document.getElementById('groups-count').value, 10);
        const state = Progress.load();
        const learnedTooFew = charsetKey === 'learned' && state.learnedLetters.length < MIN_LEARNED_FOR_FILTER;
        const customTooFew = charsetKey === 'custom' && parseCustomCharset().length < MIN_LEARNED_FOR_FILTER;
        const charset = getCharset();
        const isExam = pendingExamMode;
        pendingExamMode = false;

        session = {
            groups: Array.from({ length: count }, () => randomGroup(charset, groupLen)),
            index: 0, wpm, farnsworth,
            correctChars: 0, totalChars: 0, xpEarned: 0,
            xpRate: xpRateForSession(charset.length, groupLen),
            isExam, examStopped: false, playedCount: 0, finished: false,
            wrongGroups: [],
        };

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        groupTotalEl.textContent = count;
        groupIndexEl.textContent = 1;
        if (learnedTooFew) {
            feedbackEl.textContent = `Для фильтра «Только выученные» нужно знать хотя бы ${MIN_LEARNED_FOR_FILTER} символов (иначе группу можно угадать не слушая) — сейчас используется полный алфавит.`;
            feedbackEl.className = 'feedback show bad';
        } else if (customTooFew) {
            feedbackEl.textContent = `В «Своих символах» нужно указать хотя бы ${MIN_LEARNED_FOR_FILTER} допустимых латинских символов (A-Z, 0-9) — сейчас используется полный алфавит.`;
            feedbackEl.className = 'feedback show bad';
        } else {
            feedbackEl.className = 'feedback';
        }

        if (isExam) {
            answerInput.style.display = 'none';
            groupsSubmitRow.style.display = 'none';
            examAnswerEl.style.display = 'block';
            examSubmitRow.style.display = 'flex';
            examAnswerEl.value = '';
            examSubmitBtn.disabled = false;
            examSubmitBtn.textContent = '⏹ Остановить и проверить';
            replayBtn.style.display = 'none';
            examAnswerEl.focus();
            runExamPlayback();
        } else {
            answerInput.style.display = 'block';
            groupsSubmitRow.style.display = 'flex';
            examAnswerEl.style.display = 'none';
            examSubmitRow.style.display = 'none';
            replayBtn.style.display = 'inline-flex';
            answerInput.value = '';
            answerInput.focus();
            playCurrentGroup();
        }
    }

    async function runExamPlayback() {
        for (session.index = 0; session.index < session.groups.length; session.index++) {
            if (session.examStopped) return;
            groupIndexEl.textContent = session.index + 1;
            await playCurrentGroup();
            session.playedCount = session.index + 1;
            if (session.examStopped) return;
            if (session.index < session.groups.length - 1) {
                await new Promise(resolve => setTimeout(resolve, EXAM_GROUP_GAP_MS));
                if (session.examStopped) return;
            }
        }
        examSubmitBtn.textContent = 'Проверить →';
    }

    function finishExamSession() {
        if (session.finished) return;
        session.finished = true;
        session.examStopped = true; // на случай досрочной остановки — обрываем цикл проигрывания

        // ВАЖНО: без fallback на session.groups.length — иначе остановка
        // экзамена ДО того, как отыграла хоть одна группа (playedCount === 0),
        // засчитывалась как полный экзамен из-за приведения 0 к "ложному" в ||.
        const playedGroups = session.groups.slice(0, session.playedCount);
        const fullyCompleted = session.playedCount >= session.groups.length;

        const typed = examAnswerEl.value.toUpperCase().trim().split(/\s+/).filter(Boolean);
        let correctChars = 0;
        let totalChars = 0;
        let wrongGroupCount = 0;
        playedGroups.forEach((expected, i) => {
            const guess = typed[i] || '';
            totalChars += expected.length;
            let groupCorrect = 0;
            for (let c = 0; c < expected.length; c++) {
                if (guess[c] === expected[c]) { correctChars++; groupCorrect++; }
            }
            if (groupCorrect !== expected.length) { session.wrongGroups.push(expected); wrongGroupCount++; }
        });
        session.correctChars = correctChars;
        session.totalChars = totalChars;
        session.examFullyCompleted = fullyCompleted;
        session.examWrongGroupCount = wrongGroupCount;

        if (fullyCompleted) {
            // Опыт за экзамен — только если пройден целиком, размер зависит от % точности
            session.xpEarned = Math.round(correctChars * session.xpRate * 10) / 10;
            Progress.addXp(session.xpEarned);
            if (wrongGroupCount <= 3) {
                Progress.incrementStat('examsPassed', 1);
            }
        } else {
            session.xpEarned = 0;
        }

        // Частично отыгранные группы всё равно реально прозвучали и были
        // отвечены — они честно идут в общий счётчик "групп_50/500",
        // просто без специальной экзаменационной награды.
        if (playedGroups.length > 0) {
            Progress.incrementStat('groupsCompleted', playedGroups.length);
            postStat('total_groups', playedGroups.length);
        }
        finishSession();
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

        // Начисляем сразу за эту группу — так прогресс не теряется,
        // даже если сессия не будет пройдена до конца.
        const xpGain = Math.round(correct * session.xpRate * 10) / 10;
        session.xpEarned += xpGain;
        if (xpGain > 0) Progress.addXp(xpGain);
        Progress.incrementStat('groupsCompleted', 1);
        postStat('total_groups', 1);

        if (correct === expected.length) {
            feedbackEl.textContent = `Верно: ${expected}`;
            feedbackEl.className = 'feedback show ok';
        } else {
            session.wrongGroups.push(expected);
            feedbackEl.textContent = `Было: ${expected} — введено: ${typed || '(пусто)'}`;
            feedbackEl.className = 'feedback show bad';
        }

        session.index++;
        answerInput.value = '';
        if (session.index >= session.groups.length) {
            setTimeout(finishSession, 600);
        } else {
            groupIndexEl.textContent = session.index + 1;
            answerInput.focus();
            setTimeout(playCurrentGroup, 800);
        }
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    async function finishSession() {
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const accuracy = session.totalChars ? session.correctChars / session.totalChars : 0;
        let xpEarned = session.xpEarned;

        let dailyBonusMsg = '';
        if (isDailyChallenge && !session.skipDailyCheck) {
            const state = Progress.load();
            if (state.dailyChallengeDate !== today()) {
                xpEarned += 50;
                Progress.addXp(50);
                state.dailyChallengeDate = today();
                Progress.save(state);
                dailyBonusMsg = ' + бонус 50 XP за задание дня!';
            } else {
                dailyBonusMsg = ' (задание дня на сегодня уже выполнено, бонус не начисляется повторно)';
            }
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.className = 'feedback show ok mt-2';
            note.textContent = 'Задание дня пройдено' + dailyBonusMsg;
            document.getElementById('result-panel').appendChild(note);
        }

        if (session.isExam) {
            const note = document.createElement('div');
            if (!session.examFullyCompleted) {
                note.className = 'feedback show bad mt-2';
                note.textContent = `Экзамен остановлен досрочно (сыграно ${session.playedCount}/${session.groups.length} групп) — XP за экзамен не начисляется, но результат честно учтён в общем счётчике групп.`;
            } else if (session.examWrongGroupCount <= 3) {
                note.className = 'feedback show ok mt-2';
                note.textContent = `Экзамен пройден: ошибок в ${session.examWrongGroupCount} из ${session.groups.length} групп — это уровень «Первая категория радиолюбителя»! 🎖️`;
            } else {
                note.className = 'feedback show bad mt-2';
                note.textContent = `Экзамен пройден целиком, но ошибок многовато (${session.examWrongGroupCount} из ${session.groups.length} групп) для категории — для нужной точности их должно быть не больше 3. Продолжай тренироваться!`;
            }
            document.getElementById('result-panel').appendChild(note);
        }

        const mistakesBlock = document.getElementById('mistakes-block');
        if (session.wrongGroups && session.wrongGroups.length > 0) {
            document.getElementById('mistake-count').textContent = session.wrongGroups.length;
            mistakesBlock.style.display = 'block';
        } else {
            mistakesBlock.style.display = 'none';
        }
    }

    function retrainMistakes() {
        if (!session || !session.wrongGroups || !session.wrongGroups.length) return;
        const retrySession = {
            groups: [...session.wrongGroups],
            index: 0, wpm: session.wpm, farnsworth: session.farnsworth,
            correctChars: 0, totalChars: 0, xpEarned: 0,
            xpRate: session.xpRate,
            isExam: false, examStopped: false, playedCount: 0, finished: false,
            wrongGroups: [], skipDailyCheck: true,
        };
        session = retrySession;

        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        answerInput.style.display = 'block';
        groupsSubmitRow.style.display = 'flex';
        examAnswerEl.style.display = 'none';
        examSubmitRow.style.display = 'none';
        replayBtn.style.display = 'inline-flex';
        groupTotalEl.textContent = session.groups.length;
        groupIndexEl.textContent = 1;
        answerInput.value = '';
        feedbackEl.textContent = `Разбираем ${session.groups.length} групп(ы), в которых были ошибки — не спеша.`;
        feedbackEl.className = 'feedback show ok';
        answerInput.focus();
        playCurrentGroup();
    }
    document.getElementById('retrain-mistakes-btn').addEventListener('click', retrainMistakes);

    async function postStat(field, amount) {
        try {
            await fetch('api/stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, amount }),
            });
        } catch { /* игнорируем офлайн */ }
    }

    document.getElementById('exam-mode-btn').addEventListener('click', () => {
        document.querySelectorAll('#length-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.len === '5'));
        groupLen = 5;
        document.querySelectorAll('#charset-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.set === 'mixed'));
        charsetKey = 'mixed';
        customInput.style.display = 'none';
        wpmSlider.value = '12'; // 60 знаков/мин по формуле PARIS = 12 wpm
        wpmValue.textContent = '12';
        fwEnabled.checked = false;
        fwWrap.style.display = 'none';
        fwValue.style.display = 'none';
        document.getElementById('groups-count').value = '50';
        pendingExamMode = true;

        // Классический тон проверки приёма — 850 Гц
        const audioSettings = AudioSettings.load();
        audioSettings.freq = 850;
        AudioSettings.save(audioSettings);

        feedbackEl.textContent = 'Режим экзамена настроен: 50 групп по 5 символов, 250 знаков, 12 wpm (60 зн/мин), тон 850 Гц, группы идут одна за другой без ожидания ответа. Жми «Начать сессию».';
        feedbackEl.className = 'feedback show ok';
    });

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    examSubmitBtn.addEventListener('click', () => finishExamSession());
    replayBtn.addEventListener('click', playCurrentGroup);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
    });
    answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });

    /* ---------- Задание дня (пришли по ссылке с главной) ---------- */
    (function applyDailyParams() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') !== '1') return;
        isDailyChallenge = true;

        const len = parseInt(params.get('len'), 10);
        const count = parseInt(params.get('count'), 10);
        const wpm = parseInt(params.get('wpm'), 10);

        if (len) {
            document.querySelectorAll('#length-chips .chip').forEach(c => {
                const match = parseInt(c.dataset.len, 10) === len;
                c.classList.toggle('active', match);
                if (match) groupLen = len;
            });
        }
        if (count) {
            const countSelect = document.getElementById('groups-count');
            if ([...countSelect.options].some(o => parseInt(o.value, 10) === count)) countSelect.value = String(count);
        }
        if (wpm) {
            wpmSlider.value = String(wpm);
            wpmValue.textContent = String(wpm);
        }

        const banner = document.createElement('div');
        banner.className = 'feedback show ok mt-2';
        banner.textContent = '🎯 Это задание дня — за его прохождение полагается бонус +50 XP (один раз в день).';
        setupPanel.appendChild(banner);
    })();

    /* ======================= РЕЖИМ: СОКРАЩЕНИЯ ======================= */
    const abbrevGrid = document.getElementById('abbrev-grid');
    const abbrevWpmSlider = document.getElementById('abbrev-wpm');
    const abbrevWpmValue = document.getElementById('abbrev-wpm-value');
    const abbrevStartBtn = document.getElementById('abbrev-start-btn');
    const abbrevStopBtn = document.getElementById('abbrev-stop-btn');
    const abbrevLamp = new MorseLamp(document.getElementById('abbrev-lamp'));
    const abbrevSignalLine = new SignalLine(document.getElementById('abbrev-signal'));
    const abbrevFeedback = document.getElementById('abbrev-feedback');
    const abbrevStreakEl = document.getElementById('abbrev-streak');
    const abbrevCorrectEl = document.getElementById('abbrev-correct');
    const abbrevTotalEl = document.getElementById('abbrev-total');
    const referenceToggle = document.getElementById('abbrev-reference-toggle');
    const referenceBox = document.getElementById('abbrev-reference');

    let abbrevGridBuilt = false;
    let abbrevTarget = null;
    let abbrevBusy = false;
    let abbrevRunning = false;
    let abbrevStreak = 0;
    let abbrevCorrect = 0;
    let abbrevTotal = 0;

    function initAbbrevGrid() {
        if (abbrevGridBuilt) return;
        abbrevGridBuilt = true;
        abbrevGrid.innerHTML = '';
        ABBREVIATIONS.forEach((item) => {
            const tile = document.createElement('div');
            tile.className = 'letter-tile';
            tile.dataset.code = item.code;
            tile.innerHTML = `<div class="ch" style="font-size:13px; white-space:nowrap;">${item.code}</div>`;
            tile.addEventListener('click', () => handleAbbrevAnswer(item, tile));
            abbrevGrid.appendChild(tile);
        });
    }

    async function playAbbrevTarget() {
        abbrevTarget = ABBREVIATIONS[Math.floor(Math.random() * ABBREVIATIONS.length)];
        abbrevBusy = true;
        abbrevFeedback.className = 'feedback';
        abbrevSignalLine.clear();
        const audio = new MorseAudio({ wpm: parseInt(abbrevWpmSlider.value, 10) });
        await audio.play(abbrevTarget.code, {
            onSymbol: ({ symbol, durationMs }) => {
                abbrevSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                abbrevLamp.flash(durationMs);
            },
        });
        abbrevBusy = false;
    }

    function handleAbbrevAnswer(item, tile) {
        if (abbrevBusy || !abbrevTarget || !abbrevRunning) return;
        const isCorrect = item.code === abbrevTarget.code;
        tile.classList.add(isCorrect ? 'correct' : 'wrong');
        setTimeout(() => tile.classList.remove('correct', 'wrong'), 600);

        abbrevTotal++;
        if (isCorrect) {
            abbrevStreak++;
            abbrevCorrect++;
            Progress.addXp(5);
            Progress.incrementStat('groupsCompleted', 1);
            postStat('total_groups', 1);
            abbrevFeedback.textContent = `Верно: ${abbrevTarget.code} — ${abbrevTarget.meaning} (+5 XP)`;
            abbrevFeedback.className = 'feedback show ok';
        } else {
            abbrevStreak = 0;
            abbrevFeedback.textContent = `Было «${abbrevTarget.code}» (${abbrevTarget.meaning}), а нажато «${item.code}»`;
            abbrevFeedback.className = 'feedback show bad';
        }

        abbrevStreakEl.textContent = abbrevStreak;
        abbrevCorrectEl.textContent = abbrevCorrect;
        abbrevTotalEl.textContent = abbrevTotal;

        if (abbrevRunning) setTimeout(playAbbrevTarget, 900);
    }

    abbrevWpmSlider.addEventListener('input', () => { abbrevWpmValue.textContent = abbrevWpmSlider.value; });
    abbrevStartBtn.addEventListener('click', () => {
        abbrevRunning = true;
        abbrevStreak = 0;
        abbrevCorrect = 0;
        abbrevTotal = 0;
        abbrevStreakEl.textContent = '0';
        abbrevCorrectEl.textContent = '0';
        abbrevTotalEl.textContent = '0';
        abbrevStartBtn.style.display = 'none';
        abbrevStopBtn.style.display = 'inline-flex';
        playAbbrevTarget();
    });
    abbrevStopBtn.addEventListener('click', () => {
        abbrevRunning = false;
        abbrevStartBtn.style.display = 'inline-flex';
        abbrevStopBtn.style.display = 'none';
    });

    referenceToggle.addEventListener('click', () => {
        const show = referenceBox.style.display === 'none';
        referenceBox.style.display = show ? 'block' : 'none';
        if (show && !referenceBox.dataset.built) {
            referenceBox.dataset.built = '1';
            const cards = ABBREVIATIONS.map(function (item) {
                const code = item && item.code ? item.code : '?';
                const meaning = item && item.meaning ? item.meaning : 'без описания';
                return '<div class="card" style="padding:12px;"><b class="mono">' + code +
                    '</b> — <span class="muted">' + meaning + '</span></div>';
            }).join('');
            referenceBox.innerHTML = '<div class="grid grid-2">' + cards + '</div>';
        }
    });
})();

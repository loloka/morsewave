(function () {
    const groupsModeEl = document.getElementById('groups-mode');
    const wordsModeEl = document.getElementById('words-mode');
    const abbrevModeEl = document.getElementById('abbrev-mode');
    let abbrevModeActive = false;

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            groupsModeEl.style.display = mode === 'groups' ? 'block' : 'none';
            wordsModeEl.style.display = mode === 'words' ? 'block' : 'none';
            abbrevModeEl.style.display = mode === 'abbrev' ? 'block' : 'none';
            abbrevModeActive = mode === 'abbrev';
            if (abbrevModeActive) initAbbrevGrid();
            // Уход со вкладки не должен оставлять звук играть в фоне
            if (mode !== 'abbrev') {
                haltAbbrev();
                abbrevStartBtn.style.display = 'inline-flex';
                abbrevStopBtn.style.display = 'none';
            }
            if (mode !== 'words') haltWords();
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
    wireSignalVisibilityToggle(document.getElementById('groups-signal-toggle'), document.getElementById('groups-signal'));
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
    const customHint = document.getElementById('custom-charset-hint');
    document.querySelectorAll('#charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            charsetKey = chip.dataset.set;
            const isCustom = charsetKey === 'custom';
            customInput.style.display = isCustom ? 'block' : 'none';
            customHint.style.display = isCustom ? 'block' : 'none';
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
     *
     * Про нормировку на 26 (v2.33). Раньше здесь было `charsetSize / 15`, и
     * множитель упирался в потолок уже на 15 символах — свой набор из 15
     * самых простых знаков давал РОВНО ту же ставку, что полный алфавит,
     * хотя угадывать среди 15 несопоставимо легче. Это был обход правила
     * «XP не должен фармиться». Делитель 26 (полный латинский алфавит)
     * закрывает лазейку, а корень вместо линейной пропорции нужен, чтобы
     * честные промежуточные наборы («Цифры» — 10 знаков) не штрафовались
     * жёстко. Ключевое свойство подобранных чисел: оба основных пресета,
     * «Буквы» (26) и «Буквы + цифры» (36), дают ровно те же 2.0, что и до
     * правки — баланс существующих режимов не поехал.
     *
     * В koch.js формула СОЗНАТЕЛЬНО оставлена старой: там набор символов
     * не выбирается человеком, а жёстко задан уровнем, так что фармить
     * маленьким набором нельзя — для этого пришлось бы сидеть на низком
     * уровне, а он и так даёт мало.
     */
    function xpRateForSession(charsetSize, len) {
        const charsetFactor = Math.min(1, Math.max(0.15, Math.sqrt(charsetSize / 26)));
        const lengthFactor = len / 3;
        return 2 * charsetFactor * lengthFactor;
    }

    async function playCurrentGroup() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        replayBtn.disabled = true;
        signalLine.clear();
        if (session && session.isExam) examAnswerEl.focus(); else answerInput.focus();
        try {
            const audio = new MorseAudio({ wpm: session.wpm, farnsworthWpm: session.farnsworth || null });
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
            if (session && session.isExam) examAnswerEl.focus(); else answerInput.focus();
        }
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
            session.xpEarned = Math.round(correctChars * session.xpRate);
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
        const xpGain = Math.round(correct * session.xpRate);
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
            const matchesRequirement = dailyRequired
                && session.groups.length === dailyRequired.count
                && groupLen === dailyRequired.len
                && session.wpm === dailyRequired.wpm;

            // Защита от "прокликивания": раньше можно было жать "Ответить"
            // с пустым полем и в конце всё равно получить бонус — проверялись
            // только параметры сессии, но не результат. Теперь для бонуса
            // нужно реально принять минимум половину символов.
            const DAILY_MIN_ACCURACY = 0.5;
            const accuracyOk = accuracy >= DAILY_MIN_ACCURACY;

            if (!matchesRequirement) {
                dailyBonusMsg = ` (это не совпадает с заданием дня — нужно было ${dailyRequired ? dailyRequired.count : '?'} групп по ${dailyRequired ? dailyRequired.len : '?'} символов на ${dailyRequired ? dailyRequired.wpm : '?'} wpm, бонус не начислен, но обычный опыт за тренировку остаётся)`;
            } else if (!accuracyOk) {
                dailyBonusMsg = ` (для бонуса нужна точность не ниже ${Math.round(DAILY_MIN_ACCURACY * 100)}%, у тебя ${Math.round(accuracy * 100)}% — бонус не начислен, но обычный опыт за верные символы остаётся; попробуй ещё раз!)`;
            } else {
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
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            const isFail = dailyBonusMsg.includes('не совпадает') || dailyBonusMsg.includes('бонус не начислен');
            note.className = isFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2';
            note.textContent = isFail ? ('Задание дня' + dailyBonusMsg) : ('Задание дня пройдено' + dailyBonusMsg);
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
            xpRate: 1, // отработка уже известных ошибок — не полная ставка свежей сессии
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
        customHint.style.display = 'none';
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
    let dailyRequired = null; // { len, count, wpm } — что реально нужно пройти

    (function applyDailyParams() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') !== '1') return;
        isDailyChallenge = true;

        const len = parseInt(params.get('len'), 10);
        const count = parseInt(params.get('count'), 10);
        const wpm = parseInt(params.get('wpm'), 10);
        dailyRequired = { len, count, wpm };

        if (len) {
            document.querySelectorAll('#length-chips .chip').forEach(c => {
                const match = parseInt(c.dataset.len, 10) === len;
                c.classList.toggle('active', match);
                if (match) groupLen = len;
            });
        }
        if (count) {
            const countSelect = document.getElementById('groups-count');
            const hasOption = [...countSelect.options].some(o => parseInt(o.value, 10) === count);
            if (!hasOption) {
                // На случай будущего рассинхрона между генератором на главной
                // и вариантами в select — добавляем недостающий вариант сами,
                // а не молча оставляем старое значение (это и было причиной
                // бага: задание требовало 15, а выбор оставался на 10).
                const opt = document.createElement('option');
                opt.value = String(count);
                opt.textContent = String(count);
                countSelect.appendChild(opt);
            }
            countSelect.value = String(count);
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
    wireSignalVisibilityToggle(document.getElementById('abbrev-signal-toggle'), document.getElementById('abbrev-signal'));
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
    let abbrevAudio = null;      // проигрыватель текущей группы — чтобы его можно было оборвать
    let abbrevNextTimer = null;  // отложенный запуск следующей группы
    let abbrevSessionId = 0;     // токен запуска: старая await-цепочка узнаёт, что она уже не актуальна

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

    /**
     * Полная остановка потока: гасит звук, снимает отложенный запуск и
     * инвалидирует уже идущую await-цепочку через abbrevSessionId. Иначе
     * спам «Остановить»/«Начать» плодил параллельные playAbbrevTarget()
     * и звук накладывался сам на себя.
     */
    function haltAbbrev() {
        abbrevSessionId++;
        abbrevRunning = false;
        abbrevBusy = false;
        abbrevTarget = null;
        clearTimeout(abbrevNextTimer);
        abbrevNextTimer = null;
        if (abbrevAudio) { abbrevAudio.stop(); abbrevAudio = null; }
        abbrevSignalLine.clear();
        abbrevLamp.off();
    }

    async function playAbbrevTarget() {
        if (!abbrevRunning) return;
        const mySession = abbrevSessionId;
        abbrevTarget = ABBREVIATIONS[Math.floor(Math.random() * ABBREVIATIONS.length)];
        abbrevBusy = true;
        abbrevFeedback.className = 'feedback';
        abbrevSignalLine.clear();
        try {
            abbrevAudio = new MorseAudio({ wpm: parseInt(abbrevWpmSlider.value, 10) });
            await abbrevAudio.play(abbrevTarget.code, {
                onSymbol: ({ symbol, durationMs }) => {
                    if (mySession !== abbrevSessionId) return;
                    abbrevSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    abbrevLamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения, пропускаем группу:', e);
        } finally {
            if (mySession === abbrevSessionId) abbrevBusy = false;
        }
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

        if (abbrevRunning) {
            clearTimeout(abbrevNextTimer);
            abbrevNextTimer = setTimeout(playAbbrevTarget, 900);
        }
    }

    abbrevWpmSlider.addEventListener('input', () => { abbrevWpmValue.textContent = abbrevWpmSlider.value; });
    abbrevStartBtn.addEventListener('click', () => {
        if (abbrevRunning) return;
        haltAbbrev(); // добить хвосты предыдущего запуска, если они ещё живы
        abbrevRunning = true;
        abbrevFeedback.className = 'feedback';
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
        haltAbbrev();
        abbrevFeedback.textContent = 'Остановлено. Нажмите «Начать тренировку», чтобы продолжить.';
        abbrevFeedback.className = 'feedback show';
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

    /* ======================= РЕЖИМ: РЕАЛЬНЫЕ СЛОВА =======================
       Приём слов и радиообменных фраз (банк — assets/js/words.js). Отличия
       от «Групп символов» намеренные:
       - текст берётся из фиксированного банка, а не генерируется случайно;
       - в фразах есть пробелы, поэтому сверка идёт по нормализованной
         строке (схлопнутые пробелы, верхний регистр);
       - XP не начисляется, если слово принято хуже чем на 60 % — иначе
         режим фармился бы вслепую: банк невелик и предсказуем, можно было
         бы вбивать одно и то же частое слово и собирать частичные
         совпадения. В «Группах» такой защиты нет и не нужно — там текст
         случайный, угадывать нечего. */
    const wordsSetup = document.getElementById('words-setup');
    const wordsSessionPanel = document.getElementById('words-session');
    const wordsResultPanel = document.getElementById('words-result');
    const wordsIndexEl = document.getElementById('words-index');
    const wordsTotalEl = document.getElementById('words-total');
    const wordsAnswerInput = document.getElementById('words-answer');
    const wordsFeedback = document.getElementById('words-feedback');
    const wordsWpmSlider = document.getElementById('words-wpm');
    const wordsWpmValue = document.getElementById('words-wpm-value');
    const wordsFwEnabled = document.getElementById('words-farnsworth-enabled');
    const wordsFwWrap = document.getElementById('words-farnsworth-wrap');
    const wordsFwSlider = document.getElementById('words-farnsworth');
    const wordsFwValue = document.getElementById('words-farnsworth-value');
    const wordsReplayBtn = document.getElementById('words-replay-btn');
    const wordsSetHint = document.getElementById('words-set-hint');
    const wordsLamp = new MorseLamp(document.getElementById('words-lamp'));
    const wordsSignalLine = new SignalLine(document.getElementById('words-signal'));
    wireSignalVisibilityToggle(document.getElementById('words-signal-toggle'), document.getElementById('words-signal'));

    const WORDS_SET_HINTS = {
        words: 'Короткие и самые частые английские слова — с них начинают набирать скорость.',
        phrases: 'Реальные куски радиообмена: вызов, рапорт, QTH, служебные коды. Есть цифры и пробелы — заметно сложнее, и XP за них выше.',
        mixed: 'Слова и фразы вперемешку — ближе всего к реальному эфиру.',
    };

    // Ставка XP за верно принятый символ. Ниже, чем в «Группах» (там 2.0
    // при полном наборе): осмысленный текст предсказуем — недослышанную
    // букву часто можно восстановить по смыслу, значит и стоит он меньше.
    // Фразы дороже слов: длиннее, вперемешку с цифрами и позывными.
    const WORDS_XP_RATE = 1.2;
    const PHRASES_XP_RATE = 1.5;
    const WORDS_MIN_ACCURACY = 0.6;

    let wordsSet = 'words';
    let wordsSession = null;
    let wordsAudio = null;
    let wordsPlaying = false;
    let wordsSessionId = 0;

    document.querySelectorAll('#words-set-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#words-set-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            wordsSet = chip.dataset.wset;
            wordsSetHint.textContent = WORDS_SET_HINTS[wordsSet] || '';
        });
    });

    wordsWpmSlider.addEventListener('input', () => { wordsWpmValue.textContent = wordsWpmSlider.value; });
    wordsFwSlider.addEventListener('input', () => { wordsFwValue.textContent = wordsFwSlider.value; });
    wordsFwEnabled.addEventListener('change', () => {
        wordsFwWrap.style.display = wordsFwEnabled.checked ? 'inline-flex' : 'none';
    });

    function wordsPool() {
        if (wordsSet === 'phrases') return RADIO_PHRASES;
        if (wordsSet === 'mixed') return COMMON_WORDS.concat(RADIO_PHRASES);
        return COMMON_WORDS;
    }

    // Пробелы схлопываем: на слух пауза между словами одна, и требовать
    // от человека угадать точное число пробелов бессмысленно.
    function normalizeText(s) {
        return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
    }

    function isPhrase(text) {
        return text.includes(' ');
    }

    /** Полная остановка режима — тот же шаблон, что в haltAbbrev(). */
    function haltWords() {
        wordsSessionId++;
        wordsPlaying = false;
        if (wordsAudio) { wordsAudio.stop(); wordsAudio = null; }
        wordsSignalLine.clear();
        wordsLamp.off();
    }

    async function playCurrentWord() {
        if (!wordsSession || wordsPlaying) return; // защита от спама «Повторить»
        const mySession = wordsSessionId;
        wordsPlaying = true;
        wordsReplayBtn.disabled = true;
        wordsSignalLine.clear();
        wordsAnswerInput.focus();
        try {
            wordsAudio = new MorseAudio({
                wpm: wordsSession.wpm,
                farnsworthWpm: wordsSession.farnsworth || null,
            });
            await wordsAudio.play(wordsSession.items[wordsSession.index], {
                onSymbol: ({ symbol, durationMs }) => {
                    if (mySession !== wordsSessionId) return;
                    wordsSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    wordsLamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения слова:', e);
        } finally {
            if (mySession === wordsSessionId) {
                wordsPlaying = false;
                wordsReplayBtn.disabled = false;
            }
        }
    }

    function startWordsSession() {
        const pool = wordsPool();
        const count = parseInt(document.getElementById('words-count').value, 10);
        const wpm = parseInt(wordsWpmSlider.value, 10);
        const farnsworth = wordsFwEnabled.checked ? parseInt(wordsFwSlider.value, 10) : null;

        haltWords();
        wordsSession = {
            items: Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]),
            index: 0, wpm, farnsworth,
            correctChars: 0, totalChars: 0, fullyCorrect: 0, xpEarned: 0,
            missed: [],
        };

        wordsSetup.style.display = 'none';
        wordsResultPanel.style.display = 'none';
        wordsSessionPanel.style.display = 'block';
        wordsTotalEl.textContent = count;
        wordsIndexEl.textContent = '1';
        wordsAnswerInput.value = '';
        wordsFeedback.className = 'feedback';
        playCurrentWord();
    }

    function submitWordAnswer() {
        if (!wordsSession) return;
        const expected = normalizeText(wordsSession.items[wordsSession.index]);
        const typed = normalizeText(wordsAnswerInput.value);

        // Пробелы в счёт не идут: они не звучат отдельным знаком, и давать
        // за них XP — это дарить опыт за длину фразы. Позиции при этом
        // сохраняем (сравниваем по индексу), поэтому пропуск пробела
        // сдвигает остаток и честно ломает совпадение.
        let correct = 0;
        let scorable = 0;
        for (let i = 0; i < expected.length; i++) {
            if (expected[i] === ' ') continue;
            scorable++;
            if (typed[i] === expected[i]) correct++;
        }
        const accuracy = scorable ? correct / scorable : 0;

        wordsSession.correctChars += correct;
        wordsSession.totalChars += scorable;

        // XP — сразу за каждое слово, чтобы не терялось при досрочном
        // выходе, но только если слово принято не хуже порога.
        const rate = isPhrase(expected) ? PHRASES_XP_RATE : WORDS_XP_RATE;
        const xpGain = accuracy >= WORDS_MIN_ACCURACY ? Math.round(correct * rate) : 0;
        wordsSession.xpEarned += xpGain;
        if (xpGain > 0) Progress.addXp(xpGain);
        Progress.incrementStat('wordsCompleted', 1);

        if (correct === scorable && typed.length === expected.length) {
            wordsSession.fullyCorrect++;
            wordsFeedback.textContent = `Верно: ${expected}${xpGain ? ` (+${xpGain} XP)` : ''}`;
            wordsFeedback.className = 'feedback show ok';
        } else {
            wordsSession.missed.push({ expected, typed: typed || '(пусто)' });
            wordsFeedback.textContent = `Было: ${expected} — введено: ${typed || '(пусто)'}`
                + (xpGain ? ` (+${xpGain} XP)` : ' (XP не начислен — принято меньше 60 %)');
            wordsFeedback.className = 'feedback show bad';
        }

        wordsSession.index++;
        wordsAnswerInput.value = '';
        if (wordsSession.index >= wordsSession.items.length) {
            setTimeout(finishWordsSession, 700);
        } else {
            wordsIndexEl.textContent = wordsSession.index + 1;
            setTimeout(playCurrentWord, 700);
        }
    }

    function finishWordsSession() {
        haltWords();
        if (!wordsSession) return;

        const accuracy = wordsSession.totalChars
            ? Math.round((wordsSession.correctChars / wordsSession.totalChars) * 100)
            : 0;
        document.getElementById('words-result-accuracy').textContent = `${accuracy}%`;
        document.getElementById('words-result-correct').textContent =
            `${wordsSession.fullyCorrect} / ${wordsSession.index}`;
        document.getElementById('words-result-xp').textContent = wordsSession.xpEarned;

        const mistakesBox = document.getElementById('words-mistakes');
        if (wordsSession.missed.length) {
            mistakesBox.style.display = 'block';
            mistakesBox.innerHTML = '<div class="muted" style="font-size:13px;margin-bottom:6px;">Что не поймалось:</div>'
                + wordsSession.missed.map(function (m) {
                    return '<div class="mono" style="font-size:13px;">' + m.expected +
                        ' <span class="muted">← ' + m.typed + '</span></div>';
                }).join('');
        } else {
            mistakesBox.style.display = 'none';
        }

        // Серия дней — только за реально доигранную сессию, как в группах.
        if (wordsSession.index >= wordsSession.items.length) {
            Progress.markDailyActivity();
            Progress.incrementStat('sessionsCompleted', 1);
        }

        wordsSessionPanel.style.display = 'none';
        wordsResultPanel.style.display = 'block';
        wordsSession = null;
    }

    document.getElementById('words-start-btn').addEventListener('click', startWordsSession);
    document.getElementById('words-submit-btn').addEventListener('click', submitWordAnswer);
    wordsReplayBtn.addEventListener('click', playCurrentWord);
    document.getElementById('words-stop-btn').addEventListener('click', finishWordsSession);
    document.getElementById('words-restart-btn').addEventListener('click', () => {
        wordsResultPanel.style.display = 'none';
        wordsSetup.style.display = 'block';
    });
    wordsAnswerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submitWordAnswer(); }
    });
})();

(function () {
    const REQUIRED_STREAK = 5; // сколько верных повторов подряд нужно для "выучено"

    // Решение владельца после тестирования v2.51/v2.51.1 (2026-07-27): за
    // отправку ключом кириллица XP не повышает — тот же плоский LEARN_XP,
    // что и для латиницы. В приёме на слух сперва пробовали дать кириллице
    // небольшой бонус (+2 против +1), но это оказалось только запутывающим —
    // одинаково выглядящие латинская и кириллическая «M» давали разный XP.
    // Убрали разницу (v2.51.7): один и тот же символ по звучанию — одна и та
    // же ставка, без исключений.
    const LEARN_XP = 25;
    const REC_XP = 1;

    // "Оценка ритма ключа" (CLAUDE.md, бэклог п.2) — анти-фарм по ТОЙ ЖЕ схеме,
    // что и "Отправка ключом" (REQUIRED_STREAK выше): XP не капает за каждую
    // попытку (иначе фармится спамом одного и того же лёгкого символа), а
    // выдаётся один раз, целиком, когда набрано REQUIRED_RHYTHM_STREAK точных
    // повторов подряд — см. комментарий у handleRhythmLetter.
    const RHYTHM_ACCURATE_THRESHOLD = 0.8; // от этой точности попытка считается "точной"
    const REQUIRED_RHYTHM_STREAK = 5;      // столько точных подряд нужно, чтобы "отточить" ритм буквы
    const RHYTHM_MASTER_XP = 25;           // тот же порядок величины, что и LEARN_XP — сопоставимое усилие
    // Классика телеграфной азбуки: пауза МЕЖДУ СИГНАЛАМИ ВНУТРИ одной буквы
    // равна 1×unit (столько же, сколько точка) — это отдельная величина от
    // паузы между буквами (3×unit) и паузы между словами (7×unit), с которыми
    // её легко перепутать. Раньше в CLAUDE.md было записано 1.7 без
    // объяснения — после сверки с владельцем (2026-07-29) заменили на честную
    // теоретическую 1, никакого скрытого смысла в 1.7 не было.
    const RHYTHM_IDEAL_PAUSE_UNITS = 1;

    /* ===================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ===================== */
    const sendModeEl = document.getElementById('send-mode');
    const recognizeModeEl = document.getElementById('recognize-mode');
    const rhythmModeEl = document.getElementById('rhythm-mode');
    const invasionModeEl = document.getElementById('invasion-mode');
    let recognizeModeActive = false;
    let invasionModeActive = false;

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            sendModeEl.style.display = mode === 'send' ? 'block' : 'none';
            recognizeModeEl.style.display = mode === 'recognize' ? 'block' : 'none';
            rhythmModeEl.style.display = mode === 'rhythm' ? 'block' : 'none';
            invasionModeEl.style.display = mode === 'invasion' ? 'block' : 'none';
            recognizeModeActive = mode === 'recognize';
            if (recognizeModeActive) {
                initRecognizeGrid();
                startRecognizeSession();
            } else {
                // уход со вкладки не должен оставлять звук играть в фоне
                haltRecognize();
                recStartBtn.style.display = 'inline-flex';
                recStopBtn.style.display = 'none';
            }
            if (mode === 'rhythm') {
                renderRhythmTiles();
                startRhythmSession();
            } else {
                // уход со вкладки не должен оставлять недоигранный символ,
                // который потом "выстрелит" onLetter уже в другом режиме
                rhythmKey.reset();
                resetRhythmBuffers();
            }
            invasionModeActive = mode === 'invasion';
            if (invasionModeActive) {
                initInvasionGrid();
                resizeInvasionCanvas();
            } else {
                // уход со вкладки во время волны — тихо останавливаем, без
                // текста поражения (это не проигрыш, просто ушли с вкладки)
                stopInvasion();
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
    const wpmCpm = document.getElementById('wpm-cpm');
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
    let letterOrder = 'alphabet';

    // "Буквы → отправка ключом": кириллица — третий набор наравне с
    // «Алфавит» и «Порядок Коха» (см. CLAUDE.md, бэклог п.1).
    function isCyrillicOrder() {
        return letterOrder === 'cyrillic';
    }

    // Кириллица хранится в Progress.learnedLetters с префиксом — латинская A
    // и кириллическая А обязаны быть разными записями, иначе разблокировка
    // "Полный алфавит" и прогресс между наборами перепутались бы.
    function progressKeyFor(ch) {
        return isCyrillicOrder() ? CYRILLIC_PREFIX + ch : ch;
    }

    function codeFor(ch) {
        return isCyrillicOrder() ? CYRILLIC_CODE[ch] : MORSE_CODE[ch];
    }

    function orderedLetters() {
        if (letterOrder === 'koch') {
            return KOCH_ORDER.filter(ch => ALL_LEARNABLE.includes(ch));
        }
        if (letterOrder === 'cyrillic') {
            return CYRILLIC_LEARNABLE;
        }
        return ALL_LEARNABLE;
    }

    document.querySelectorAll('#order-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#order-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            letterOrder = chip.dataset.order;
            // Прежде выбранный символ мог принадлежать другому набору (нет
            // смысла держать открытой панель практики латинской буквы, когда
            // сетка тайлов уже кириллическая) — прячем панель до нового выбора.
            current = null;
            panel.style.display = 'none';
            renderTiles();
        });
    });

    function renderTiles() {
        const state = Progress.load();
        grid.innerHTML = '';
        orderedLetters().forEach((ch) => {
            const tile = document.createElement('div');
            const isLearned = state.learnedLetters.includes(progressKeyFor(ch));
            tile.className = 'letter-tile' + (isLearned ? ' learned' : '');
            tile.dataset.ch = ch;
            tile.innerHTML = `<div class="ch">${ch}</div><div class="code">${codeFor(ch)}</div>`
                + (isLearned ? `<span class="check">${MWIcon('check', 12)}</span>` : '');
            tile.addEventListener('click', () => selectLetter(ch));
            grid.appendChild(tile);
        });
    }

    function renderPattern(ch) {
        const code = codeFor(ch);
        patternEl.innerHTML = code.split('').map(s => `<span class="sym">${s === '.' ? '•' : '−'}</span>`).join(' ');

        const titaEl = document.getElementById('practice-tita');
        titaEl.innerHTML = code.split('').map(s => `<span class="unit">${s === '.' ? t('js.common.dit') : t('js.common.dah')}</span>`).join('-');

        const napevEl = document.getElementById('practice-napev');
        // У кириллицы свой словарь напевов (CYRILLIC_MNEMONICS) — свои слоги
        // под свои буквы, путать с латинским MORSE_MNEMONICS нельзя.
        const mnemonic = isCyrillicOrder() ? CYRILLIC_MNEMONICS[ch] : MORSE_MNEMONICS[ch];
        napevEl.innerHTML = mnemonic
            ? t('js.learn.napev_prefix') + mnemonic.map(syl => `<span class="syl">${syl}</span>`).join('-')
            : '';
    }

    function selectLetter(ch) {
        current = ch;
        currentWasLearnedAtStart = Progress.load().learnedLetters.includes(progressKeyFor(ch));
        correctStreak = 0;
        updateStreakUI();
        [...grid.children].forEach(t => t.classList.toggle('selected', t.dataset.ch === ch));
        letterEl.textContent = ch;
        renderPattern(ch);
        panel.style.display = 'block';
        feedbackEl.className = 'feedback';
        signalLine.clear();
        // Декодирование ключом — раздельные таблицы для латиницы и кириллицы
        // (совпадающие коды дали бы непредсказуемый результат при смешении,
        // см. morse-data.js), поэтому подсовываем нужную таблицу под текущий набор.
        key.setTable(isCyrillicOrder() ? CYRILLIC_TO_CHAR : MORSE_TO_CHAR);
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
        const spans = patternEl.querySelectorAll('.sym');
        const titaSpans = document.querySelectorAll('#practice-tita .unit');
        const napevSpans = document.querySelectorAll('#practice-napev .syl');
        let i = 0;
        try {
            const audio = new MorseAudio({ wpm: currentWpm() });
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
        } catch (e) {
            console.error('Ошибка воспроизведения:', e);
        } finally {
            spans.forEach(s => s.classList.remove('playing'));
            isPlaying = false;
            playBtn.disabled = false;
        }
    }

    function updateStreakUI() {
        streakCountEl.textContent = correctStreak;
        streakBarEl.style.width = `${Math.min(correctStreak / REQUIRED_STREAK, 1) * 100}%`;
    }

    function handleDecodedLetter(decoded) {
        if (!current) return;
        const cyr = isCyrillicOrder();
        // Е и Ё физически неразличимы по коду (см. morse-data.js) — при
        // тренировке кириллицы принимаем оба варианта как верный ответ.
        const isMatch = cyr ? isCyrillicMatch(decoded, current) : decoded === current;

        if (isMatch) {
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
                feedbackEl.textContent = t('js.learn.correct_known', { '{ch}': decoded });
                feedbackEl.className = 'feedback show ok';
            } else if (correctStreak < REQUIRED_STREAK) {
                // XP пока не начисляем — награда даётся один раз, целиком,
                // только за реально пройденную серию, чтобы нельзя было
                // фармить попытками (успех-успех-успех-...-ошибка-заново).
                feedbackEl.textContent = t('js.learn.correct_streak', { '{ch}': decoded, '{streak}': correctStreak, '{req}': REQUIRED_STREAK });
                feedbackEl.className = 'feedback show ok';
            } else {
                Progress.markLetterLearned(progressKeyFor(current));
                Progress.addXp(LEARN_XP);
                Progress.logXp(LEARN_XP, 'learn_send');
                Progress.markDailyActivity();
                currentWasLearnedAtStart = true; // чтобы дальше не начислять XP при повторах
                feedbackEl.textContent = t('js.learn.learned_symbol', { '{ch}': current, '{xp}': LEARN_XP });
                feedbackEl.className = 'feedback show ok';
                renderTiles();
                [...grid.children].find(t => t.dataset.ch === current)?.classList.add('selected');
                tickDaily('learn'); // засчитываем новую букву в задание дня, если оно активно
            }
        } else {
            correctStreak = 0;
            feedbackEl.textContent = t('js.learn.wrong', { '{got}': decoded, '{want}': current });
            feedbackEl.className = 'feedback show bad';
        }
        updateStreakUI();
        setTimeout(() => signalLine.clear(), 500); // готовим линию к следующей попытке
    }

    const key = new TelegraphKey(keyEl, {
        wpm: 12,
        onSymbol: (symbol) => signalLine.pulse(symbol === '.' ? 'dot' : 'dash'),
        onLetter: handleDecodedLetter,
        onPress: (isDown) => { if (isDown) lamp.on(); else lamp.off(); },
    });

    const savedLearnWpm = localStorage.getItem('morse_learn_wpm');
    if (savedLearnWpm) {
        wpmSlider.value = savedLearnWpm;
        wpmValue.textContent = savedLearnWpm;
        wpmCpm.textContent = cpmHintText(savedLearnWpm);
    }
    
    wpmSlider.addEventListener('input', () => {
        wpmValue.textContent = wpmSlider.value;
        wpmCpm.textContent = cpmHintText(wpmSlider.value);
        key.setWpm(currentWpm());
        localStorage.setItem('morse_learn_wpm', wpmSlider.value);
    });
    if (savedLearnWpm) key.setWpm(currentWpm());
    playBtn.addEventListener('click', playCurrent);

    renderTiles();

    /* ===================== РЕЖИМ: ПРИЁМ НА СЛУХ ===================== */
    const recGrid = document.getElementById('recognize-grid');
    const recWpmSlider = document.getElementById('rec-wpm');
    const recWpmValue = document.getElementById('rec-wpm-value');
    const recWpmCpm = document.getElementById('rec-wpm-cpm');
    const recStartBtn = document.getElementById('rec-start-btn');
    const recStopBtn = document.getElementById('rec-stop-btn');
    const recLamp = new MorseLamp(document.getElementById('rec-lamp'));
    const recSignalLine = new SignalLine(document.getElementById('rec-signal'));
    wireSignalVisibilityToggle(document.getElementById('rec-signal-toggle'), document.getElementById('rec-signal'));
    const recFeedback = document.getElementById('rec-feedback');
    const recHistory = document.getElementById('rec-history');
    const REC_HISTORY_MAX = 6; // больше — уже скорее простыня, чем подсказка (см. groups.js ABBREV_HISTORY_MAX)
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
    let recGridLetters = ALL_LEARNABLE; // какие символы сейчас реально отрисованы тайлами в recGrid
    let recAudio = null;         // проигрыватель текущего символа — чтобы его можно было оборвать
    let recNextTimer = null;     // отложенный запуск следующего символа
    let recSessionId = 0;        // токен запуска: старая await-цепочка узнаёт, что она уже не актуальна

    const recCustomInput = document.getElementById('rec-custom-input');
    const MIN_REC_CUSTOM = 5; // тот же анти-фарм порог, что и в groups.js (MIN_LEARNED_FOR_FILTER)

    // "Свои символы" здесь может содержать и кириллицу — логично, раз в
    // приёме на слух уже есть отдельный кириллический набор (в отличие от
    // групп/метода Коха, которые остаются латинскими, см. CLAUDE.md). Regex
    // допускает и A-Z0-9, и А-ЯЁ; фильтр по MORSE_CODE/CYRILLIC_CODE в конце
    // на всякий случай отсекает то, чему всё равно нет кода.
    function parseRecCustomCharset() {
        const raw = recCustomInput.value.toUpperCase();
        const chars = [...new Set(raw.replace(/[^A-ZА-ЯЁ0-9]/g, ' ').split(/\s+/).filter(Boolean).flatMap(s => s.split('')))];
        return chars.filter((ch) => MORSE_CODE[ch] || CYRILLIC_CODE[ch]);
    }

    // Какими символами заполнить сетку тайлов-ответов под выбранный набор.
    // Для "letters"/"digits"/"learned"/"all" тайлы остаются полным латинским
    // алфавитом (как и раньше — ограничивается только пул случайных целей,
    // см. recognizePool()), а вот "cyrillic" и "custom" могут состоять из
    // символов, которых в латинском алфавите просто нет — для них тайлы
    // строим по фактическому набору, иначе ответить будет нечем.
    function recGridLettersFor(key) {
        if (key === 'cyrillic') return CYRILLIC_LEARNABLE;
        if (key === 'custom') {
            const chars = parseRecCustomCharset();
            return chars.length >= MIN_REC_CUSTOM ? chars : ALL_LEARNABLE;
        }
        return ALL_LEARNABLE;
    }

    document.querySelectorAll('#rec-charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#rec-charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            recCharsetKey = chip.dataset.set;
            const recIsCustom = recCharsetKey === 'custom';
            recCustomInput.style.display = recIsCustom ? 'block' : 'none';
            document.getElementById('rec-custom-hint').style.display = recIsCustom ? 'block' : 'none';
            buildRecGrid(recGridLettersFor(recCharsetKey));
        });
    });

    // Живой фильтр по вводу — то же самое, что завели в group.js для «Своих
    // символов» групп, но с допуском кириллицы. Пока набор печатается, тайлы
    // (и цель для распознавания) пересобираются под текущий ввод.
    recCustomInput.addEventListener('input', () => {
        const cleaned = recCustomInput.value.replace(/[^A-Za-zА-Яа-яЁё0-9 ]/g, '');
        if (cleaned !== recCustomInput.value) recCustomInput.value = cleaned;
        if (recCharsetKey === 'custom') buildRecGrid(recGridLettersFor('custom'));
    });

    function buildRecGrid(letters) {
        recGridBuilt = true;
        recGridLetters = letters;
        recGrid.innerHTML = '';
        letters.forEach((ch) => {
            const tile = document.createElement('div');
            tile.className = 'letter-tile';
            tile.dataset.ch = ch;
            tile.innerHTML = `<div class="ch">${ch}</div>`;
            tile.addEventListener('click', () => handleRecognizeAnswer(ch, tile));
            recGrid.appendChild(tile);
        });
    }

    function initRecognizeGrid() {
        if (recGridBuilt) return;
        buildRecGrid(ALL_LEARNABLE);
    }

    /**
     * Добавляет запись в историю ответов (последняя — сверху). Раньше разбор
     * "верно/неверно" был одной строкой в recFeedback, которую следующий
     * символ гасил меньше чем через секунду — на слух прочитать не успевали.
     * Тот же приём, что и в "Сокращениях" (см. groups.js pushAbbrevHistory):
     * ответы копятся списком и остаются на экране, пока их не вытеснят более
     * новые (лимит — REC_HISTORY_MAX, старые просто уходят из DOM).
     */
    function pushRecHistory(isCorrect, text) {
        const entry = document.createElement('div');
        entry.className = 'feedback show ' + (isCorrect ? 'ok' : 'bad') + ' rec-history-item';
        entry.textContent = text;
        recHistory.insertBefore(entry, recHistory.firstChild);
        while (recHistory.children.length > REC_HISTORY_MAX) {
            recHistory.removeChild(recHistory.lastChild);
        }
    }

    // Вызывается при каждом заходе на вкладку "Приём на слух" —
    // серия/точность считаются за текущую сессию, рекорд и общий счёт — навсегда.
    function startRecognizeSession() {
        const state = Progress.load();
        recStreak = 0;
        recSessionCorrect = 0;
        recSessionTotal = 0;
        haltRecognize();
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
            case 'learned': {
                // Тайлы для этого набора — латинские (см. buildRecGrid), поэтому
                // отфильтровываем кириллические ключи ('RU_...' — см.
                // morse-data.js), иначе целью мог бы стать символ, ответить на
                // который тайлом просто нечем.
                const learnedLatin = state.learnedLetters.filter((ch) => ALL_LEARNABLE.includes(ch));
                return learnedLatin.length >= 5 ? learnedLatin : ALL_LEARNABLE;
            }
            case 'cyrillic': return CYRILLIC_LEARNABLE;
            // "Свои символы" теперь может включать и кириллицу — цель тянется
            // из того же набора, что уже отрисован тайлами (см. recGridLettersFor()),
            // так что ответить всегда есть чем.
            case 'custom': return recGridLettersFor('custom');
            default: return ALL_LEARNABLE;
        }
    }

    /**
     * Останавливает поток символов начисто: гасит звук, снимает отложенный
     * запуск следующего символа и инвалидирует уже запущенную await-цепочку
     * через recSessionId. Без этого спам «Остановить»/«Начать» плодил
     * параллельные playRecognizeTarget(), и звук накладывался сам на себя.
     */
    function haltRecognize() {
        recSessionId++;
        recRunning = false;
        recBusy = false;
        recTarget = null;
        clearTimeout(recNextTimer);
        recNextTimer = null;
        if (recAudio) { recAudio.stop(); recAudio = null; }
        recSignalLine.clear();
        recLamp.off();
    }

    async function playRecognizeTarget() {
        if (!recRunning) return;
        const mySession = recSessionId;
        const pool = recognizePool();
        recTarget = pool[Math.floor(Math.random() * pool.length)];
        recBusy = true;
        recFeedback.className = 'feedback';
        recSignalLine.clear();
        try {
            recAudio = new MorseAudio({ wpm: parseInt(recWpmSlider.value, 10) });
            await recAudio.play(recTarget, {
                onSymbol: ({ symbol, durationMs }) => {
                    if (mySession !== recSessionId) return;
                    recSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    recLamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения, пропускаем символ:', e);
        } finally {
            // Флаги трогаем, только если это всё ещё актуальный запуск —
            // иначе оборванная цепочка сбросит recBusy у новой.
            if (mySession === recSessionId) recBusy = false;
        }
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
            let correctText = t('js.learn.rec_correct', { '{ch}': recTarget, '{xp}': REC_XP });
            Progress.addXp(REC_XP);
            Progress.logXp(REC_XP, 'learn_listen');
            Progress.incrementStat('recognizedCount', 1);
            // Отдельно от XP — отмечаем сам символ как хоть раз опознанный на
            // слух (для ачивок вида "весь кириллический набор на слух").
            Progress.markRecognizedUnique(progressKeyForChar(recTarget));

            if (recStreak > recBest) {
                recBest = recStreak;
                state = Progress.load();
                state.stats.recognizeBestStreak = recBest;
                Progress.save(state);
                Progress.checkAchievements();
                correctText += t('js.learn.rec_new_record');
            }
            pushRecHistory(true, correctText);
            tickDaily('recognize'); // засчитываем верный приём в задание дня, если оно активно
        } else {
            recStreak = 0;
            pushRecHistory(false, t('js.learn.rec_wrong', { '{target}': recTarget, '{ch}': ch }));
        }

        renderRecStats(Progress.load().stats.recognizedCount || 0);
        if (recRunning) {
            clearTimeout(recNextTimer);
            recNextTimer = setTimeout(playRecognizeTarget, 700);
        }
    }

    // Ввод с физической клавиатуры — так же, как тап по плитке
    window.addEventListener('keydown', (e) => {
        if (!recognizeModeActive || recBusy || !recRunning) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        
        // Если печатают на русской раскладке — выводим красивое сообщение
        if (/[а-яё]/i.test(e.key)) {
            e.preventDefault();
            recFeedback.textContent = t('js.learn.wrong_layout');
            recFeedback.className = 'feedback show bad';
            return;
        }

        const ch = e.key.toUpperCase();
        // Проверяем против фактически отрисованных тайлов, а не жёстко
        // латиницы/кириллицы целиком — так работает и для смешанного набора
        // "Свои символы".
        if (!recGridLetters.includes(ch)) return;
        const tile = recGrid.querySelector(`[data-ch="${ch}"]`);
        if (tile) { e.preventDefault(); handleRecognizeAnswer(ch, tile); }
    });

    const savedRecWpm = localStorage.getItem('morse_rec_wpm');
    if (savedRecWpm) {
        recWpmSlider.value = savedRecWpm;
        recWpmValue.textContent = savedRecWpm;
        recWpmCpm.textContent = cpmHintText(savedRecWpm);
    }
    recWpmSlider.addEventListener('input', () => { 
        recWpmValue.textContent = recWpmSlider.value; 
        recWpmCpm.textContent = cpmHintText(recWpmSlider.value); 
        localStorage.setItem('morse_rec_wpm', recWpmSlider.value);
    });
    recStartBtn.addEventListener('click', () => {
        if (recRunning) return;
        haltRecognize(); // добить хвосты предыдущего запуска, если они ещё живы
        recRunning = true;
        recFeedback.className = 'feedback';
        recHistory.innerHTML = '';
        recStartBtn.style.display = 'none';
        recStopBtn.style.display = 'inline-flex';
        playRecognizeTarget();
    });
    recStopBtn.addEventListener('click', () => {
        haltRecognize();
        recFeedback.textContent = t('js.learn.stopped');
        recFeedback.className = 'feedback show';
        recStartBtn.style.display = 'inline-flex';
        recStopBtn.style.display = 'none';
    });

    /* ===================== РЕЖИМ: РИТМ КЛЮЧА =====================
       Третий подрежим "Буквы" (CLAUDE.md, бэклог п.2) — не про то, какую
       букву ты нажал (это уже проверяют "Отправка"/"Приём"), а про то,
       НАСКОЛЬКО РОВНО ты её выстучал: сравниваем реальные длительности
       нажатий/пауз с идеальными соотношениями точка:тире:пауза = 1:3:1
       относительно текущего wpm (см. unit() в input.js). Набор символов —
       только "Латиница + цифры" и "Кириллица" (без "Порядка Коха" — тот
       про последовательность ИЗУЧЕНИЯ новых букв, здесь все буквы и так
       открыты для выбора сразу, порядок изучения не при чём, см. v2.53.1).
       Выбор буквы и статистика — полностью отдельные от send-mode. */
    const rhythmGrid = document.getElementById('rhythm-grid');
    const rhythmPanel = document.getElementById('rhythm-panel');
    const rhythmLetterEl = document.getElementById('rhythm-letter');
    const rhythmPatternEl = document.getElementById('rhythm-pattern');
    const rhythmWpmSlider = document.getElementById('rhythm-wpm');
    const rhythmWpmValue = document.getElementById('rhythm-wpm-value');
    const rhythmWpmCpm = document.getElementById('rhythm-wpm-cpm');
    const rhythmKeyEl = document.getElementById('rhythm-key');
    const rhythmLampEl = new MorseLamp(document.getElementById('rhythm-lamp'));
    const rhythmSignalLine = new RhythmSignalLine(document.getElementById('rhythm-signal'));
    const rhythmTempoHintEl = document.getElementById('rhythm-tempo-hint');
    const rhythmFeedbackEl = document.getElementById('rhythm-feedback');
    const rhythmStreakEl = document.getElementById('rhythm-streak');
    const rhythmStreakBarEl = document.getElementById('rhythm-streak-bar');
    const rhythmBestEl = document.getElementById('rhythm-best');
    const rhythmAccuracyEl = document.getElementById('rhythm-accuracy');
    const rhythmTotalEl = document.getElementById('rhythm-total');

    let rhythmOrder = 'alphabet';
    let rhythmCurrent = null;
    let rhythmCurrentWasMasteredAtStart = false; // ритм ЭТОЙ буквы уже отточен раньше — тренируемся без XP
    let rhythmSymbols = [];   // { symbol: '.'|'-', duration } за текущую попытку (одна буква)
    let rhythmPauses = [];    // паузы между нажатиями внутри текущей буквы, мс
    let rhythmLastUp = null;  // момент последнего отпускания ключа, для расчёта паузы
    let rhythmStreak = 0;     // точных повторов подряд ДЛЯ ТЕКУЩЕЙ буквы (сбрасывается при её смене)
    let rhythmBest = 0;       // личный рекорд ТЕКУЩЕЙ буквы (%), из Progress.rhythmBestByLetter
    let rhythmSessionTotal = 0; // верно опознанных попыток за этот заход на вкладку (любая точность)
    let rhythmSessionSum = 0;   // сумма их точности (0..1) — для среднего по сессии

    function isCyrillicOrderRhythm() {
        return rhythmOrder === 'cyrillic';
    }

    function codeForRhythm(ch) {
        return isCyrillicOrderRhythm() ? CYRILLIC_CODE[ch] : MORSE_CODE[ch];
    }

    // Порядка Коха тут намеренно нет (в отличие от "Отправки ключом") — он
    // задаёт последовательность ИЗУЧЕНИЯ новых символов, а в "Ритме" все
    // буквы уже открыты для выбора сразу, порядок изучения тут ни при чём.
    function orderedRhythmLetters() {
        if (rhythmOrder === 'cyrillic') {
            return CYRILLIC_LEARNABLE;
        }
        return ALL_LEARNABLE;
    }

    document.querySelectorAll('#rhythm-order-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#rhythm-order-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            rhythmOrder = chip.dataset.order;
            rhythmCurrent = null;
            rhythmPanel.style.display = 'none';
            renderRhythmTiles();
        });
    });

    function renderRhythmTiles() {
        const state = Progress.load();
        rhythmGrid.innerHTML = '';
        orderedRhythmLetters().forEach((ch) => {
            const tile = document.createElement('div');
            const key = progressKeyForChar(ch);
            // Два РАЗНЫХ статуса на одной плитке — не путать: "learned" (бирюзовая
            // галочка в правом углу) про "Отправку ключом" вообще (сам факт, что
            // символ освоен), "rhythm-mastered" (жёлтая нота в левом углу) — про
            // ЭТОТ режим конкретно: ровный ритм именно этой буквы уже отточен.
            // Плитка может быть в любой комбинации этих двух статусов сразу.
            const isLearned = state.learnedLetters.includes(key);
            const isMastered = Array.isArray(state.rhythmMasteredLetters) && state.rhythmMasteredLetters.includes(key);
            tile.className = 'letter-tile'
                + (isLearned ? ' learned' : '')
                + (isMastered ? ' rhythm-mastered' : '');
            tile.dataset.ch = ch;
            tile.innerHTML = `<div class="ch">${ch}</div><div class="code">${codeForRhythm(ch)}</div>`
                + (isLearned ? `<span class="check">${MWIcon('check', 12)}</span>` : '')
                + (isMastered ? `<span class="check rhythm-check">🎵</span>` : '');
            tile.addEventListener('click', () => selectRhythmLetter(ch));
            rhythmGrid.appendChild(tile);
        });
    }

    function renderRhythmPattern(ch) {
        const code = codeForRhythm(ch);
        rhythmPatternEl.innerHTML = code.split('').map(s => `<span class="sym">${s === '.' ? '•' : '−'}</span>`).join(' ');
    }

    function resetRhythmBuffers() {
        rhythmSymbols = [];
        rhythmPauses = [];
        rhythmLastUp = null;
    }

    function selectRhythmLetter(ch) {
        rhythmCurrent = ch;
        // Серия "точных подряд" — свойство КОНКРЕТНОЙ буквы, а не сессии в
        // целом (как и correctStreak в "Отправке" — см. selectLetter()), при
        // смене буквы начинаем с нуля.
        rhythmStreak = 0;
        const state = Progress.load();
        const key = progressKeyForChar(ch);
        rhythmCurrentWasMasteredAtStart = Array.isArray(state.rhythmMasteredLetters)
            && state.rhythmMasteredLetters.includes(key);
        // Рекорд — личный, для ЭТОЙ буквы (см. Progress.rhythmBestByLetter):
        // при выборе другой буквы подгружаем её собственный рекорд, а не
        // общий по всем буквам сразу — иначе взятые 100% на лёгком символе
        // "замораживали" цифру для всех остальных букв (см. CHANGELOG v2.53.1).
        rhythmBest = (state.rhythmBestByLetter && state.rhythmBestByLetter[key]) || 0;
        resetRhythmBuffers();
        updateRhythmStreakUI();
        updateRhythmStatsUI();
        [...rhythmGrid.children].forEach(t => t.classList.toggle('selected', t.dataset.ch === ch));
        rhythmLetterEl.textContent = ch;
        renderRhythmPattern(ch);
        rhythmPanel.style.display = 'block';
        rhythmFeedbackEl.className = 'feedback';
        rhythmSignalLine.clear();
        rhythmTempoHintEl.textContent = '';
        rhythmTempoHintEl.className = 'rhythm-tempo-hint';
        rhythmKey.setTable(isCyrillicOrderRhythm() ? CYRILLIC_TO_CHAR : MORSE_TO_CHAR);
        rhythmPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function currentRhythmWpm() {
        return parseInt(rhythmWpmSlider.value, 10);
    }

    // Точность одного замера: 0 при отклонении ≥100% от идеала (в 2 раза длиннее
    // или короче), 1 при идеальном совпадении, линейно между ними. Простая и
    // предсказуемая метрика — не нужна сложная статистика ради тренажёра.
    function timingAccuracy(actualMs, idealMs) {
        if (!idealMs) return 0;
        return Math.max(0, 1 - Math.abs(1 - actualMs / idealMs));
    }

    function accuracyClass(acc) {
        if (acc >= 0.85) return 'rhythm-good';
        if (acc >= 0.6) return 'rhythm-warn';
        return 'rhythm-bad';
    }

    // Живая текстовая подсказка направления ошибки — то же пороговое
    // значение, что определяет, рисовать ли стрелку ▲/▼ над столбиком
    // сигнальной линии (RhythmSignalLine.NOTABLE_RATIO_DEVIATION), чтобы
    // текст и стрелка всегда были согласованы. ratio = actualMs / idealMs
    // последнего нажатия/паузы; мягкая зона вокруг идеала нужна, чтобы
    // подсказка не дёргалась от естественного дрожания руки.
    function updateRhythmTempoHint(ratio) {
        const dev = RhythmSignalLine.NOTABLE_RATIO_DEVIATION;
        if (ratio > 1 + dev) {
            // Держал/паузил ДОЛЬШЕ идеала — значит нужно быстрее (короче).
            rhythmTempoHintEl.textContent = t('js.learn.rhythm_tempo_faster');
            rhythmTempoHintEl.className = 'rhythm-tempo-hint speedup';
        } else if (ratio < 1 - dev) {
            // КОРОЧЕ идеала — значит нужно медленнее (дольше держать/паузить).
            rhythmTempoHintEl.textContent = t('js.learn.rhythm_tempo_slower');
            rhythmTempoHintEl.className = 'rhythm-tempo-hint slowdown';
        } else {
            rhythmTempoHintEl.textContent = t('js.learn.rhythm_tempo_good');
            rhythmTempoHintEl.className = 'rhythm-tempo-hint good';
        }
    }

    // Серия "точных подряд" для текущей буквы — визуально та же полоса-прогресс,
    // что и correctStreak в "Отправке" (updateStreakUI()).
    function updateRhythmStreakUI() {
        rhythmStreakEl.textContent = rhythmStreak;
        rhythmStreakBarEl.style.width = `${Math.min(rhythmStreak / REQUIRED_RHYTHM_STREAK, 1) * 100}%`;
    }

    // rhythm-best — рекорд ВЫБРАННОЙ буквы (обновляется в selectRhythmLetter
    // и в handleRhythmLetter), rhythm-accuracy/rhythm-total — сессионные,
    // общие по вкладке, не привязаны к конкретной букве (как в "Приёме").
    function updateRhythmStatsUI() {
        rhythmBestEl.textContent = `${rhythmBest}%`;
        rhythmAccuracyEl.textContent = rhythmSessionTotal
            ? `${Math.round((rhythmSessionSum / rhythmSessionTotal) * 100)}%`
            : '—';
        rhythmTotalEl.textContent = rhythmSessionTotal;
    }

    // Вызывается при каждом заходе на вкладку "Ритм ключа" — сессионные
    // счётчики (среднее/всего) обнуляются, как и в "Приёме на слух". Рекорд
    // (rhythmBest) сюда не относится — он привязан к конкретной букве и
    // подгружается в selectRhythmLetter().
    function startRhythmSession() {
        rhythmSessionTotal = 0;
        rhythmSessionSum = 0;
        updateRhythmStatsUI();
    }

    /**
     * Итог одной попытки (буква полностью выстучана и декодирована).
     *
     * Защита от фарма (см. CLAUDE.md — "при добавлении нового источника XP
     * закладывай защиту") — та же схема, что уже проверена в "Отправке
     * ключом" (REQUIRED_STREAK/markLetterLearned): XP НЕ капает за каждую
     * отдельную попытку (иначе спам одного и того же простого символа типа
     * "E" фармился бы бесконечно), а выдаётся один раз, целиком, когда
     * человек впервые набирает REQUIRED_RHYTHM_STREAK (5) точных повторов
     * ПОДРЯД для этой конкретной буквы. "Точный" = буква декодирована верно
     * И общая точность ритма ≥ RHYTHM_ACCURATE_THRESHOLD (80%); любая осечка
     * (неверная буква или ритм ниже порога) сбрасывает серию на ноль — так
     * что 5 "почти подряд" не считаются. После первого отточенного ритма
     * дальнейшие попытки по этой букве идут уже без XP (как currentWasLearnedAtStart
     * в "Отправке").
     */
    function handleRhythmLetter(decoded) {
        if (!rhythmCurrent) { resetRhythmBuffers(); return; }
        const unit = rhythmKey.unit();
        const cyr = isCyrillicOrderRhythm();
        const isMatch = cyr ? isCyrillicMatch(decoded, rhythmCurrent) : decoded === rhythmCurrent;

        if (!isMatch) {
            rhythmStreak = 0;
            rhythmFeedbackEl.textContent = t('js.learn.rhythm_wrong', { '{got}': decoded, '{want}': rhythmCurrent });
            rhythmFeedbackEl.className = 'feedback show bad';
            updateRhythmStreakUI();
            resetRhythmBuffers();
            return;
        }

        const symbolAccs = rhythmSymbols.map(s => timingAccuracy(s.duration, s.symbol === '.' ? unit : unit * 3));
        const pauseAccs = rhythmPauses.map(p => timingAccuracy(p, unit * RHYTHM_IDEAL_PAUSE_UNITS));
        const allAccs = [...symbolAccs, ...pauseAccs];
        const overall = allAccs.length ? allAccs.reduce((a, b) => a + b, 0) / allAccs.length : 0;
        const overallPct = Math.round(overall * 100);
        const symPctStr = symbolAccs.length
            ? `${Math.round((symbolAccs.reduce((a, b) => a + b, 0) / symbolAccs.length) * 100)}%`
            : '—';
        const pausePctStr = pauseAccs.length
            ? `${Math.round((pauseAccs.reduce((a, b) => a + b, 0) / pauseAccs.length) * 100)}%`
            : '—';

        rhythmSessionTotal++;
        rhythmSessionSum += overall;

        // Рекорд — персонально для этой буквы (см. Progress.rhythmBestByLetter).
        rhythmBest = Progress.updateRhythmBest(progressKeyForChar(rhythmCurrent), overallPct);

        if (rhythmCurrentWasMasteredAtStart) {
            // Ритм этой буквы уже отточен раньше — просто тренировка,
            // без XP, независимо от текущей точности (как в "Отправке").
            rhythmFeedbackEl.textContent = t('js.learn.rhythm_known', { '{ch}': decoded, '{sym}': symPctStr, '{pause}': pausePctStr, '{acc}': overallPct });
            rhythmFeedbackEl.className = 'feedback show ok';
        } else if (overall >= RHYTHM_ACCURATE_THRESHOLD) {
            rhythmStreak++;
            if (rhythmStreak < REQUIRED_RHYTHM_STREAK) {
                rhythmFeedbackEl.textContent = t('js.learn.rhythm_streak', {
                    '{ch}': decoded, '{sym}': symPctStr, '{pause}': pausePctStr,
                    '{streak}': rhythmStreak, '{req}': REQUIRED_RHYTHM_STREAK,
                });
                rhythmFeedbackEl.className = 'feedback show ok';
            } else {
                Progress.markRhythmMastered(progressKeyForChar(rhythmCurrent));
                Progress.addXp(RHYTHM_MASTER_XP);
                Progress.logXp(RHYTHM_MASTER_XP, 'learn_rhythm');
                Progress.markDailyActivity();
                // Как и в мини-игре: ни markRhythmMastered(), ни addXp() сами
                // ачивки не пересчитывают, поэтому без явного вызова награда
                // за ритм «догонялась» бы только при заходе в другой режим.
                Progress.checkAchievements();
                rhythmCurrentWasMasteredAtStart = true; // дальше — без повторного XP
                rhythmFeedbackEl.textContent = t('js.learn.rhythm_mastered', { '{ch}': rhythmCurrent, '{xp}': RHYTHM_MASTER_XP });
                rhythmFeedbackEl.className = 'feedback show ok';
                renderRhythmTiles();
                [...rhythmGrid.children].find(t => t.dataset.ch === rhythmCurrent)?.classList.add('selected');
            }
        } else {
            // Буква опознана верно, но ритм неровный — серия сбрасывается,
            // "почти точные" попытки в зачёт не идут.
            rhythmStreak = 0;
            rhythmFeedbackEl.textContent = t('js.learn.rhythm_imprecise', {
                '{ch}': decoded, '{sym}': symPctStr, '{pause}': pausePctStr, '{acc}': overallPct,
                '{threshold}': Math.round(RHYTHM_ACCURATE_THRESHOLD * 100),
            });
            rhythmFeedbackEl.className = 'feedback show bad';
        }

        updateRhythmStreakUI();
        updateRhythmStatsUI();
        resetRhythmBuffers();
    }

    const rhythmKey = new TelegraphKey(rhythmKeyEl, {
        wpm: 12,
        onPress: (isDown) => {
            if (isDown) {
                // Начало новой попытки (ни одного символа/паузы ещё не записано) —
                // очищаем линию, чтобы прошлая попытка не "утаскивала" за собой
                // текущую и не заставляла новые столбики выталкивать её за экран
                // на телефоне (см. CLAUDE.md-тикет про сигнальную линию ритма).
                if (rhythmSymbols.length === 0 && rhythmPauses.length === 0) {
                    rhythmSignalLine.clear();
                }
                if (rhythmLastUp !== null) {
                    const pauseMs = performance.now() - rhythmLastUp;
                    rhythmPauses.push(pauseMs);
                    const idealPause = rhythmKey.unit() * RHYTHM_IDEAL_PAUSE_UNITS;
                    const ratio = pauseMs / idealPause;
                    rhythmSignalLine.pulse('pause', ratio, accuracyClass(timingAccuracy(pauseMs, idealPause)));
                    updateRhythmTempoHint(ratio);
                }
                rhythmLampEl.on();
            } else {
                rhythmLastUp = performance.now();
                rhythmLampEl.off();
            }
        },
        onSymbol: (symbol, durationMs) => {
            rhythmSymbols.push({ symbol, duration: durationMs });
            const ideal = symbol === '.' ? rhythmKey.unit() : rhythmKey.unit() * 3;
            const ratio = durationMs / ideal;
            const acc = timingAccuracy(durationMs, ideal);
            rhythmSignalLine.pulse(symbol === '.' ? 'dot' : 'dash', ratio, accuracyClass(acc));
            updateRhythmTempoHint(ratio);
        },
        onLetter: handleRhythmLetter,
    });

    const savedRhythmWpm = localStorage.getItem('morse_rhythm_wpm');
    if (savedRhythmWpm) {
        rhythmWpmSlider.value = savedRhythmWpm;
        rhythmWpmValue.textContent = savedRhythmWpm;
        rhythmWpmCpm.textContent = cpmHintText(savedRhythmWpm);
    }

    rhythmWpmSlider.addEventListener('input', () => {
        rhythmWpmValue.textContent = rhythmWpmSlider.value;
        rhythmWpmCpm.textContent = cpmHintText(rhythmWpmSlider.value);
        rhythmKey.setWpm(currentRhythmWpm());
        localStorage.setItem('morse_rhythm_wpm', rhythmWpmSlider.value);
    });
    if (savedRhythmWpm) rhythmKey.setWpm(currentRhythmWpm());

    /* ===================== РЕЖИМ: ВТОРЖЕНИЕ (BETA) =====================
       Tower-defense мини-игра поверх уже готового цикла "услышал букву на
       слух → выбрал её на клавиатуре" (та же механика, что и в "Приёме на
       слух", просто в другой оболочке). Направление согласовано с владельцем
       2026-07-31 (см. память проекта project_minigame_direction), полировка
       (многодорожечные волны, лопата, QWERTY, скорость по сложности) —
       правки того же дня по фидбеку после первой версии.

       XP: 1 XP за каждое верное попадание (как REC_XP в приёме на слух) +
       разовый бонус ТОЛЬКО при победе волны (100 попаданий) — см. CLAUDE.md
       "Обязательные правила", анти-фарм: бонус нельзя нафармить повторением
       одного лёгкого символа, потому что он не капает за каждое попадание. */
    const INVASION_XP_PER_KILL = 1;
    const INVASION_BASE_HP = 100;
    const INVASION_STAGE1_KILLS = 20; // 20 одиночных пришельцев
    const INVASION_STAGE2_GROUPS = 10; // 10 пар пришельцев (20 знаков)
    const INVASION_STAGE3_GROUPS = 10; // 10 троек пришельцев (30 знаков)
    const INVASION_WIN_KILLS = 100;
    const INVASION_BOSS_SPRITE = '🛸';
    const INVASION_BOSS_BREACH_DAMAGE = 30;

    const INVASION_QUOTES = [
        "VENI VIDI VICI", "MEMENTO MORI", "CARPE DIEM", "PER ASPERA AD ASTRA",
        "COGITO ERGO SUM", "DUM SPIRO SPERO", "AUDENTES FORTUNA IUVAT"
    ];
    // Было только 👽/🦎 — по фидбеку владельца 2026-08-01 "скучно, добавь
    // монстриков" расширили зверинец, не выходя за тему "инопланетное или
    // рептилия" (та же тема, что и в project_minigame_direction): 👾 —
    // классический аркадный пришелец-монстр, 🦖 — ящер-переросток. Спрайт
    // по-прежнему выбирается случайно при каждом спавне, на баланс/скорость
    // не влияет — чисто визуальное разнообразие.
    const INVASION_SPRITES = ['👽', '🦎', '👾', '🦖'];
    const INVASION_MAX_LANES = 5; // = потолок одновременных пришельцев (5-й уровень)
    // Было 220 — реальный фидбек владельца 2026-08-01: "лопата летит слишком
    // быстро, слегка непонятно что это лопата". На 220мс глаз не успевал
    // считать силуэт, даже узнаваемый (см. drawInvasionShovel — форма уже
    // проходила две полировки). Увеличили почти вдвое; на темп волны это не
    // влияет — лопата летит уже ПОСЛЕ того, как буква распознана и попадание
    // засчитано, никакого "штрафа за скорость реакции" тут нет.
    const INVASION_SHOVEL_MS = 400;

    const invasionWpmSlider = document.getElementById('invasion-wpm');
    const invasionWpmValueEl = document.getElementById('invasion-wpm-value');
    const invasionWpmCpmEl = document.getElementById('invasion-wpm-cpm');
    const invasionLampEl = new MorseLamp(document.getElementById('invasion-lamp'));
    const invasionStartBtn = document.getElementById('invasion-start-btn');
    const invasionStopBtn = document.getElementById('invasion-stop-btn');
    const invasionHpBarEl = document.getElementById('invasion-hp-bar');
    const invasionHpLabelEl = document.getElementById('invasion-hp-label');
    const invasionCanvasWrapEl = document.querySelector('.invasion-canvas-wrap');
    const invasionCanvasEl = document.getElementById('invasion-canvas');
    const invasionCtx = invasionCanvasEl.getContext('2d');
    const invasionOverlayEl = document.getElementById('invasion-overlay');
    const invasionKillsEl = document.getElementById('invasion-kills');
    const invasionComboEl = document.getElementById('invasion-combo');
    const invasionBestComboEl = document.getElementById('invasion-best-combo');
    const invasionFeedbackEl = document.getElementById('invasion-feedback');
    const invasionGridEl = document.getElementById('invasion-grid');
    const invasionPuRepair = document.getElementById('invasion-pu-repair');
    const invasionPuSlow = document.getElementById('invasion-pu-slow');
    const invasionPuNuke = document.getElementById('invasion-pu-nuke');

    // QWERTY, а не алфавитный порядок — специально (владелец 2026-07-31):
    // "к ней сразу привыкать" — те же клавиши, что и на физической клавиатуре
    // компа, плюс это естественно компактнее по вертикали (4 строки вместо
    // 6 строк квадратных плиток — раньше на телефоне приходилось скроллить).
    const INVASION_KBD_ROWS = [
        '1234567890'.split(''),
        'QWERTYUIOP'.split(''),
        'ASDFGHJKL'.split(''),
        'ZXCVBNM'.split(''),
    ];

    let invasionGridBuilt = false;
    let invasionRunning = false;
    let invasionHp = INVASION_BASE_HP;
    let invasionKills = 0;
    let invasionCombo = 0;
    let invasionBestCombo = 0;
    // Для бонуса "за скорость" при победе — среднее по всем попаданиям И
    // промахам за волну (не только удачным): 1 = убил почти сразу после
    // появления, 0 = убил в последний момент ИЛИ пришелец вообще прорвался.
    let invasionSpeedScoreSum = 0;
    let invasionSpeedScoreCount = 0;
    let invasionEnemies = [];    // { id, ch, sprite, lane, state, startTime, duration, dieX, dieY, audio }
    let invasionProjectiles = []; // лопаты в полёте: { x0,y0,x1,y1,start,duration,targetId,resolved }
    let invasionParticles = [];
    let invasionLanePool = [];
    let invasionEnemySeq = 0;
    let invasionAudioQueueEndTime = 0;
    let invasionAudioChain = Promise.resolve();
    invasionAudioQueueEndTime = performance.now();
    let invasionRafId = null;
    let invasionWaveStart = 0;
    let invasionCelebrating = false;
    let invasionCelebrateTimers = [];
    let invasionBossPhase = false;
    let invasionStage = 1; // 1 = одиночные, 2 = пары, 3 = тройки
    let invasionStageKills = 0; // счётчик одиночных целей этапа 1
    let invasionStageGroups = 0; // счётчик групп для этапов 2 и 3
    let invasionCurrentBoss = 0; // 0 = нет, 1 = Босс 1, 2 = Босс 2, 3 = Босс 3
    let invasionGroupSpawnTimer = null;
    let invasionDbXpEarned = 0;
    let invasionSessionStartTime = 0;
    let invasionHitFlashTimer = null;
    let invasionPowerups = { slow: 0, nuke: 0 };
    let invasionSlowUntil = 0;

    function initInvasionGrid() {
        if (invasionGridBuilt) return;
        invasionGridBuilt = true;
        invasionGridEl.innerHTML = '';
        INVASION_KBD_ROWS.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'invasion-kbd-row';
            row.forEach((ch) => {
                const key = document.createElement('div');
                key.className = 'invasion-key';
                key.dataset.ch = ch;
                key.textContent = ch;
                key.addEventListener('click', () => handleInvasionAnswer(ch, key));
                rowEl.appendChild(key);
            });
            invasionGridEl.appendChild(rowEl);
        });
    }

    // ВАЖНО: сюда чуть не добавили подсветку клавиш, соответствующих текущим
    // пришельцам (is-target) — но это прямая утечка ответа: с одним
    // пришельцем (большая часть волны) она превращала игру в "нажми
    // единственную подсвеченную клавишу", вообще не слушая сигнал. Убрано
    // по фидбеку владельца 2026-07-31 (см. память проекта). Если понадобится
    // подсказка "куда бить первой" при 2+ пришельцах — она должна кодировать
    // только КОЛИЧЕСТВО активных целей, не их буквенную личность.
    function syncInvasionKeyHighlights() {
        // намеренно пусто — оставлено как точка вызова на будущее (см. выше)
    }

    // Canvas рисуется в CSS-пикселях с поправкой на devicePixelRatio (иначе
    // на Retina/телефонах пришелец и база выглядят мыльными). Пересчитываем
    // при входе на вкладку и при ресайзе окна во время активной волны.
    function resizeInvasionCanvas() {
        const rect = invasionCanvasWrapEl.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        invasionCanvasEl.width = Math.max(1, Math.round(rect.width * dpr));
        invasionCanvasEl.height = Math.max(1, Math.round(rect.height * dpr));
        invasionCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', () => { if (invasionRunning) resizeInvasionCanvas(); });

    function updateInvasionHpUI() {
        const hp = Math.max(0, invasionHp);
        const pct = (hp / INVASION_BASE_HP) * 100;
        invasionHpBarEl.style.width = `${pct}%`;
        invasionHpBarEl.classList.remove('hp-warn', 'hp-bad');
        if (pct <= 25) invasionHpBarEl.classList.add('hp-bad');
        else if (pct <= 55) invasionHpBarEl.classList.add('hp-warn');
        invasionHpLabelEl.textContent = `${hp}/${INVASION_BASE_HP}`;
    }

    function updateInvasionStatsUI() {
        invasionKillsEl.textContent = invasionKills;
        invasionComboEl.textContent = invasionCombo;
        invasionBestComboEl.textContent = invasionBestCombo;
        
        if (invasionCombo >= 15) invasionPowerups.slow = 1;
        if (invasionCombo >= 30) invasionPowerups.nuke = 1;
        
        if (invasionPuSlow) {
            invasionPuSlow.disabled = !invasionPowerups.slow;
            if (invasionPowerups.slow) invasionPuSlow.classList.add('ready'); else invasionPuSlow.classList.remove('ready');
        }
        if (invasionPuNuke) {
            invasionPuNuke.disabled = !invasionPowerups.nuke;
            if (invasionPowerups.nuke) invasionPuNuke.classList.add('ready'); else invasionPuNuke.classList.remove('ready');
        }
    }

    function invasionFeedback(text, kind) {
        invasionFeedbackEl.textContent = text;
        invasionFeedbackEl.className = `feedback show ${kind || ''}`.trim();
    }

    // Урон базе за пропущенного пришельца — по договорённости с владельцем
    // 2026-07-31 (второй заход): было по длине кода буквы (1-4), стало
    // плоское 1 HP за любого пришельца независимо от сложности символа —
    // проще и предсказуемее ("сколько пришельцев пропустил — столько и
    // потерял").
    function invasionDamageFor() {
        return 1;
    }

    // Сложность буквы для скорости пришельца (владелец 2026-07-31): простые
    // короткие/однородные коды (E, T, S='...', O='---') — быстро; средние
    // 3-символьные смешанные (R, W, U, K, G...) — средне; длинные смешанные
    // (F, L, Q, P, J) и цифры (всегда 5 символов) — медленно, чтобы успевать
    // расшифровать более длинный сигнал. "Однородный" код (все точки или все
    // тире) на балл проще того же по длине смешанного — отсюда S/O при длине
    // 3 всё равно попадают в "быстрый" уровень вместе с буквами длины 1-2.
    function invasionComplexityScore(code) {
        const uniform = code.split('').every((c) => c === code[0]);
        return code.length - (uniform ? 1 : 0);
    }

    // v1 полировки (2026-07-31 вечер) множители 16/24/34 оказались СЛИШКОМ
    // быстрыми на практике (реальный фидбек владельца после игры) — вернули
    // порядок величины первой версии (там путь занимал 6000→2200мс), но
    // сохранили саму идею вилки по сложности буквы.
    function invasionTierDuration(ch, wpm) {
        const code = MORSE_CODE[ch] || '.';
        const score = invasionComplexityScore(code);
        const unit = 1200 / wpm;
        if (score <= 2) return unit * 32;  // E,T,I,A,N,M,S,O,...
        if (score === 3) return unit * 45; // R,W,U,K,G,...
        return unit * 60;                  // F,L,Q,P,J и все цифры
    }

    // Грубая (заведомо с запасом) оценка длины ОДНОЙ буквы в очереди звука —
    // нужна только чтобы прибавить пришельцам, стоящим в очереди на озвучку,
    // честный запас времени на дорогу (см. spawnOneInvasionEnemy).
    function invasionAudioEstimate(chStr, wpm) {
        let totalUnits = 0;
        for (let i = 0; i < chStr.length; i++) {
            const code = MORSE_CODE[chStr[i]] || '.';
            let units = 0;
            for (const sym of code) {
                units += (sym === '-' ? 3 : 1) + 1;
            }
            units = units - 1 + 3;
            totalUnits += units;
        }
        return (1200 / wpm) * totalUnits;
    }

    // Время на прослушивание одного символа босса + ввод человеком на клавиатуре:
    // ~12.5 юнитов звука (с паузой) + ~12.5 юнитов на реакцию и нажатие клавиши (с запасом для новичков).
    function invasionBossSymbolTime(wpm) {
        const unit = 1200 / wpm;
        return unit * 25;
    }

    function invasionConcurrency() {
        return invasionStage;
    }

    function acquireInvasionLane() {
        if (!invasionLanePool.length) return Math.floor(Math.random() * INVASION_MAX_LANES);
        const idx = Math.floor(Math.random() * invasionLanePool.length);
        return invasionLanePool.splice(idx, 1)[0];
    }
    function releaseInvasionLane(lane) {
        if (!invasionLanePool.includes(lane)) {
            invasionLanePool.push(lane);
        }
    }

    // Позиция пришельца на канвасе. У "умирающего" (лопата уже летит в него)
    // позиция заморожена в момент попадания — иначе он продолжил бы бежать к
    // базе, пока лопата ещё в воздухе, и выглядело бы так, будто он и убит, и
    // одновременно всё ещё атакует.
    function invasionEnemyPosition(enemy, now, w, h) {
        const laneY = ((enemy.lane + 1) / (INVASION_MAX_LANES + 1)) * h;
        if (enemy.state !== 'active') return { x: enemy.dieX, y: enemy.dieY, progress: 1 };
        
        let elapsed = now - enemy.startTime;
        if (elapsed < 0) {
            return { x: -30, y: laneY, progress: -0.1 };
        }
        let progress = Math.min(1, elapsed / enemy.duration);
        const x = 28 + progress * (w - 60);
        const baseY = h / 2;
        // Корабли летят в базу по центру: интерполируем y к baseY
        const yBase = laneY + (baseY - laneY) * Math.pow(progress, 2);
        const bob = Math.sin((now + enemy.id * 137) / 180) * 5;
        return { x, y: yBase + bob, progress };
    }

    // Лопата рисуется вручную на canvas, а не эмодзи (🪏 "shovel" — символ
    // Unicode 15, 2022 год; на многих десктопных системах шрифт эмодзи его
    // ещё не знает и рисует "тофу"-квадратик — так и было на скриншоте
    // владельца на компьютере, хотя на телефоне современный шрифт эмодзи
    // рисовал нормально). Простая рукописная фигура работает одинаково
    // везде, без зависимости от версии системного шрифта эмодзи.
    // v1 полировки рисовала "лезвие" эллипсом — на такой мелкой сцене эллипс
    // не читался как лопата вообще (реальный фидбек владельца, 2026-07-31:
    // "непонятно что там лопата"). Заменили на узнаваемый силуэт совка:
    // заострённое книзу лезвие (пятиугольник) + прямая ручка + маленькая
    // рукоятка-кружок сверху — так форма читается даже в 20 с небольшим
    // пикселей. Цвета взяты контрастными к тёмному звёздному фону.
    // v2 полировки (2026-08-01) — по образцу, который прислал владелец
    // (эмодзи-лопата с красной D-рукояткой, деревянным черенком и серебристым
    // совком): красная петля-рукоятка сверху, коричневый черенок, серый
    // "воротник"-муфта, совок с бликом для объёма. Раньше форма читалась
    // как лопата, но не была похожа именно на ЭТУ картинку — теперь ближе
    // по цветам и силуэту, оставаясь при этом рисунком на canvas (не эмодзи
    // — см. комментарий у самой функции в истории правок про тофу-квадратики
    // на некоторых десктопах).
    // v3 полировки (2026-08-01, второй заход тем же днём) — тот же фидбек
    // "непонятно что это лопата" повторился даже с узнаваемым силуэтом:
    // проблема была не только в скорости полёта (см. INVASION_SHOVEL_MS
    // выше), но и в том, что силуэт мелкий. Масштабируем прорисовку целиком
    // (ctx.scale) — растут и фигуры, и толщина линий пропорционально, форма
    // не "плывёт" при увеличении.
    function drawInvasionShovel(ctx, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.scale(1.4, 1.4);
        ctx.lineCap = 'round';

        // красная D-рукоятка (петля вверху)
        ctx.strokeStyle = '#e0473b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -19, 4, 6, 0, Math.PI * 0.12, Math.PI * 1.88);
        ctx.stroke();

        // деревянный черенок
        ctx.strokeStyle = '#c98a3e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, 6);
        ctx.stroke();

        // металлическая муфта между черенком и совком
        ctx.fillStyle = '#9aa0a6';
        ctx.fillRect(-3, 4, 6, 4);

        // совок — слегка заострённая трапеция
        ctx.beginPath();
        ctx.moveTo(-7, 7);
        ctx.lineTo(7, 7);
        ctx.lineTo(5, 16);
        ctx.lineTo(0, 20);
        ctx.lineTo(-5, 16);
        ctx.closePath();
        ctx.fillStyle = '#d8dee3';
        ctx.fill();
        ctx.strokeStyle = '#6b7075';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // блик на совке — для объёма
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, 9);
        ctx.lineTo(-1, 17);
        ctx.stroke();

        ctx.restore();
    }

    // Параметры вынесены с дефолтами v1 (обычный взрыв пришельца) — победный
    // салют (см. startInvasionCelebration) зовёт эту же функцию с большими
    // count/speed/life, чтобы вспышки выглядели заметно крупнее и наряднее
    // одиночного попадания лопатой.
    function spawnInvasionParticles(x, y, color, count = 10, speedMin = 40, speedRange = 70, lifeMin = 400, lifeRange = 200) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * speedRange;
            invasionParticles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                maxLife: lifeMin + Math.random() * lifeRange,
                color,
            });
        }
    }

    let invasionBossAudioTimer = null;

    function playBossAudioNow(enemy) {
        if (!invasionRunning || !enemy || enemy.state !== 'active') return;
        if (enemy.audio) {
            enemy.audio.stop();
            enemy.audio = null;
        }
        clearTimeout(invasionBossAudioTimer);
        invasionBossAudioTimer = setTimeout(() => {
            if (!invasionRunning || !enemy || enemy.state !== 'active') return;
            const wpm = parseInt(invasionWpmSlider.value, 10);
            enemy.audio = new MorseAudio({ wpm });
            enemy.audio.play(enemy.ch, {
                onSymbol: ({ durationMs }) => {
                    if (enemy.state === 'active') invasionLampEl.flash(durationMs);
                },
            }).then(() => {
                // Если босс всё ещё жив на этой же букве и ответ ещё не дан — повторить через комфортную паузу
                if (invasionRunning && enemy.state === 'active' && !enemy.audio?._stopped) {
                    const unit = 1200 / wpm;
                    const repeatDelay = Math.max(1200, unit * 7);
                    clearTimeout(invasionBossAudioTimer);
                    invasionBossAudioTimer = setTimeout(() => {
                        if (invasionRunning && enemy.state === 'active') {
                            playBossAudioNow(enemy);
                        }
                    }, repeatDelay);
                }
            }).catch((e) => { console.error('Ошибка воспроизведения (босс):', e); });
        }, 40);
    }

    async function playInvasionEnemyAudio(enemy) {
        if (enemy.isBoss) {
            playBossAudioNow(enemy);
            return;
        }
        // Пока ждали своей очереди в invasionAudioChain, пришельца уже могли
        // убить/пропустить — тогда озвучивать нечего, тихо выходим.
        if (!invasionRunning || enemy.state !== 'active') return;
        const wpm = parseInt(invasionWpmSlider.value, 10);
        enemy.audio = new MorseAudio({ wpm });
        const playPromise = enemy.audio.play(enemy.ch, {
            onSymbol: ({ durationMs }) => {
                if (enemy.state === 'active') invasionLampEl.flash(durationMs);
            },
        }).catch((e) => { console.error('Ошибка воспроизведения (вторжение):', e); });

        // Сторож: максимум 3.5 секунды на одну букву (ранее было enemy.duration + 2000,
        // из-за чего на боссах очередь звука наглухо зависала на 30-40 секунд при сбое/раннем клике).
        await Promise.race([
            playPromise,
            new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);

        // Пауза ПОСЛЕ буквы, если звук не был прерван ответом
        if (invasionRunning && !enemy.audio?._stopped) {
            const unit = 1200 / wpm;
            await new Promise((resolve) => setTimeout(resolve, unit * 3));
        }
    }

    // Сериализуем звук через цепочку промисов для рядовых врагов в строю.
    // Босс озвучивается напрямую через playBossAudioNow без очереди и задержек.
    function queueInvasionAudio(enemy) {
        if (enemy.isBoss) {
            playBossAudioNow(enemy);
            return;
        }
        invasionAudioChain = invasionAudioChain.then(() => playInvasionEnemyAudio(enemy)).catch(() => {});
    }

    // Адаптивная сложность (2026-08-01, по просьбе владельца): буквы, которые
    // лично ты чаще путаешь/пропускаешь, должны вылетать чаще, а не с той же
    // частотой, что и уже отточенные — так и в morsecommand.com (см. память
    // project_minigame_direction). Persist — в Progress.invasionLetterScores
    // (0..1, выше = увереннее), обновляется в resolveInvasionKill/
    // resolveInvasionMiss. Тут — только чтение и превращение в вес для
    // случайного выбора: 0.15 у идеально отточенной буквы (не ноль — иначе
    // она вообще переставала бы появляться и тренировать было бы нечего),
    // до ~1.15 у той, которую постоянно пропускаешь.
    function invasionSpawnWeight(ch) {
        const score = Progress.invasionLetterScore(ch);
        return Math.max(0.15, 1.15 - score);
    }

    // Взвешенный случайный выбор — не topping the deck, а честная лотерея с
    // разными "билетами" на буквы. При пустом/однобуквенном pool ведёт себя
    // как обычный случайный выбор.
    function pickInvasionLetterWeighted(pool) {
        const weights = pool.map(invasionSpawnWeight);
        const total = weights.reduce((sum, w) => sum + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1]; // страховка от погрешности плавающей точки
    }

    function spawnOneInvasionEnemy() {
        if (!invasionRunning || invasionBossPhase) return;
        const wpm = parseInt(invasionWpmSlider.value, 10);
        const ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
        let duration = invasionTierDuration(ch, wpm);
        
        const rand = Math.random();
        let type = 'normal';
        let sprite = INVASION_SPRITES[Math.floor(Math.random() * INVASION_SPRITES.length)];
        let tankHits = 0;
        
        if (rand < 0.06) {
            type = 'tank';
            sprite = '🛡️';
        } else if (rand < 0.12) {
            type = 'rusher';
            sprite = '⚡';
            duration *= 0.6;
        } else if (rand < 0.18) {
            type = 'phantom';
            sprite = '👻';
        }

        const enemy = {
            id: ++invasionEnemySeq,
            type, ch, sprite, duration,
            startTime: performance.now(),
            lane: acquireInvasionLane(),
            state: 'active',
            dieX: 0, dieY: 0,
            audio: null,
            tankHits
        };
        invasionEnemies.push(enemy);
        queueInvasionAudio(enemy);
        syncInvasionKeyHighlights();
    }

    function spawnInvasionGroup(groupSize) {
        if (!invasionRunning || invasionBossPhase) return;
        if (invasionEnemies.length > 0) return;

        const wpm = parseInt(invasionWpmSlider.value, 10);
        const lane = acquireInvasionLane();
        const now = performance.now();

        let cumulativeStagger = 0;
        const groupEnemies = [];

        for (let i = 0; i < groupSize; i++) {
            const ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
            const sprite = INVASION_SPRITES[Math.floor(Math.random() * INVASION_SPRITES.length)];
            const estAudioMs = invasionAudioEstimate(ch, wpm);
            const charDuration = invasionTierDuration(ch, wpm);

            const enemy = {
                id: ++invasionEnemySeq,
                type: 'normal',
                ch,
                sprite,
                duration: charDuration,
                startTime: now + cumulativeStagger,
                lane,
                state: 'active',
                dieX: 0, dieY: 0,
                audio: null,
                tankHits: 0
            };
            groupEnemies.push(enemy);
            cumulativeStagger += estAudioMs;
        }

        groupEnemies.forEach((e) => {
            invasionEnemies.push(e);
            queueInvasionAudio(e);
        });
        syncInvasionKeyHighlights();
    }

    function spawnInvasionBoss(bossNum) {
        if (!invasionRunning) return;
        const wpm = parseInt(invasionWpmSlider.value, 10);
        let ch, bossTotalHits, bossQuote, duration;
        const isMega = (bossNum === 3);

        if (bossNum === 1) {
            ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
            bossTotalHits = 10;
            // 10 символов + запас на 2-3 ошибки с комфортным временем для новичков
            duration = (10 + 3) * invasionBossSymbolTime(wpm);
        } else if (bossNum === 2) {
            ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
            bossTotalHits = 20;
            // 20 символов подряд + допуск на 5-6 ошибок
            duration = (20 + 6) * invasionBossSymbolTime(wpm);
        } else {
            bossQuote = INVASION_QUOTES[Math.floor(Math.random() * INVASION_QUOTES.length)].replace(/\s/g, '');
            ch = bossQuote[0];
            bossTotalHits = bossQuote.length;
            // Фраза на латыни + допуск 1 ошибка на каждые 4 символа
            const extraErrors = Math.max(3, Math.round(bossTotalHits / 4));
            duration = (bossTotalHits + extraErrors) * invasionBossSymbolTime(wpm);
        }

        const enemy = {
            id: ++invasionEnemySeq,
            ch,
            sprite: INVASION_BOSS_SPRITE,
            duration,
            startTime: performance.now(),
            lane: acquireInvasionLane(),
            state: 'active',
            dieX: 0, dieY: 0,
            audio: null,
            isBoss: true,
            isMegaBoss: isMega,
            bossNum,
            bossQuote,
            bossHits: 0,
            bossTotalHits
        };
        invasionEnemies = [enemy];
        queueInvasionAudio(enemy);
        syncInvasionKeyHighlights();

        const bossIncomingMsg = bossNum === 1
            ? t('js.learn.invasion_boss1_incoming')
            : (bossNum === 2 ? t('js.learn.invasion_boss2_incoming') : t('js.learn.invasion_boss3_incoming'));
        invasionFeedback(bossIncomingMsg, 'ok');
    }

    function respawnInvasionBossSegment(enemy) {
        if (enemy.isMegaBoss && enemy.bossQuote) {
            enemy.ch = enemy.bossQuote[enemy.bossHits % enemy.bossQuote.length];
        } else {
            enemy.ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
        }
        queueInvasionAudio(enemy);
        syncInvasionKeyHighlights();
    }

    function advanceToStage(stage) {
        invasionStage = stage;
        invasionStageKills = 0;
        invasionStageGroups = 0;
        invasionBossPhase = false;
        invasionCurrentBoss = 0;
        clearTimeout(invasionGroupSpawnTimer);
        invasionGroupSpawnTimer = null;

        const stageMsg = (stage === 2) ? t('js.learn.invasion_stage2') : t('js.learn.invasion_stage3');
        invasionFeedback(stageMsg, 'ok');

        setTimeout(() => {
            if (invasionRunning && !invasionBossPhase) {
                topUpInvasionEnemies();
            }
        }, 1200);
    }

    function startBossPhase(bossNum) {
        invasionBossPhase = true;
        invasionCurrentBoss = bossNum;
        clearTimeout(invasionGroupSpawnTimer);
        invasionGroupSpawnTimer = null;
        clearTimeout(invasionBossAudioTimer);
        invasionBossAudioTimer = null;
        invasionAudioChain = Promise.resolve();

        invasionEnemies.forEach((e) => {
            if (e.audio) e.audio.stop();
            releaseInvasionLane(e.lane);
        });
        invasionEnemies = [];

        setTimeout(() => {
            if (invasionRunning && invasionBossPhase) {
                spawnInvasionBoss(bossNum);
            }
        }, 800);
    }

    function checkGroupCompletion() {
        if (!invasionRunning || invasionBossPhase || invasionStage === 1) return;
        if (invasionEnemies.length > 0) return;

        invasionStageGroups++;
        const targetGroups = (invasionStage === 2) ? INVASION_STAGE2_GROUPS : INVASION_STAGE3_GROUPS;
        if (invasionStageGroups >= targetGroups) {
            startBossPhase(invasionStage);
        } else {
            const wpm = parseInt(invasionWpmSlider.value, 10);
            const unit = 1200 / wpm;
            const interGroupPause = unit * 7;
            clearTimeout(invasionGroupSpawnTimer);
            invasionGroupSpawnTimer = setTimeout(() => {
                invasionGroupSpawnTimer = null;
                if (invasionRunning && !invasionBossPhase) {
                    topUpInvasionEnemies();
                }
            }, interGroupPause);
        }
    }

    // Полоска-сегменты здоровья босса над спрайтом
    function drawInvasionBossHealth(ctx, x, y, hits, total, bossNum) {
        const barW = Math.min(130, Math.max(80, total * 6));
        const sy = Math.max(12, y - 40);
        
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillRect(x - barW/2, sy, barW, 6);
        
        const healthPct = (total - hits) / total;
        if (healthPct > 0) {
            ctx.fillStyle = '#e0473b';
            ctx.fillRect(x - barW/2, sy, barW * healthPct, 6);
        }

        ctx.fillStyle = '#eae6df';
        ctx.font = '11px sans-serif';
        const label = (bossNum === 3 ? 'МЕГА-БОСС' : `БОСС ${bossNum || 1}`) + ` (${total - hits})`;
        ctx.fillText(label, x, sy - 8);
    }

    function topUpInvasionEnemies() {
        if (!invasionRunning) return;
        
        invasionCanvasWrapEl.className = 'invasion-canvas-wrap zone-' + invasionStage;
        
        if (invasionBossPhase) {
            if (invasionEnemies.length === 0) {
                spawnInvasionBoss(invasionCurrentBoss || 1);
            }
            return;
        }

        if (invasionStage === 1) {
            if (invasionStageKills < INVASION_STAGE1_KILLS) {
                if (invasionEnemies.length === 0) {
                    spawnOneInvasionEnemy();
                }
            } else {
                startBossPhase(1);
            }
        } else if (invasionStage === 2) {
            if (invasionStageGroups < INVASION_STAGE2_GROUPS) {
                if (invasionEnemies.length === 0 && !invasionGroupSpawnTimer) {
                    spawnInvasionGroup(2);
                }
            } else {
                startBossPhase(2);
            }
        } else if (invasionStage === 3) {
            if (invasionStageGroups < INVASION_STAGE3_GROUPS) {
                if (invasionEnemies.length === 0 && !invasionGroupSpawnTimer) {
                    spawnInvasionGroup(3);
                }
            } else {
                startBossPhase(3);
            }
        }
    }

    function invasionFrame(now) {
        // invasionCelebrating держит кадр живым и после конца волны (победа)
        // — см. startInvasionCelebration; при поражении/ручной остановке его
        // не выставляют, так что обычный ранний выход ничего не меняет.
        if (!invasionRunning && !invasionCelebrating) return;
        const w = invasionCanvasWrapEl.clientWidth;
        const h = invasionCanvasWrapEl.clientHeight;
        invasionCtx.clearRect(0, 0, w, h);
        invasionCtx.textAlign = 'center';
        invasionCtx.textBaseline = 'middle';

        const baseX = w - 28;
        const baseY = h / 2;
        invasionCtx.font = '34px serif';
        invasionCtx.fillText('🛰️', baseX, baseY);

        invasionEnemies.forEach((enemy) => {
            const pos = invasionEnemyPosition(enemy, now, w, h);
            if (pos.progress < 0) return; // Ещё не стартовал из очереди группы
            
            if (enemy.type === 'phantom' && enemy.state === 'active') {
                // Появляется полностью, затем медленно исчезает к progress=0.7
                let alpha = 1.0;
                if (pos.progress > 0.2) {
                    alpha = 1.0 - ((pos.progress - 0.2) / 0.5);
                }
                invasionCtx.globalAlpha = Math.max(0, alpha);
            } else {
                invasionCtx.globalAlpha = 1;
            }
            
            invasionCtx.font = enemy.isBoss ? (enemy.isMegaBoss ? '56px serif' : '46px serif') : '30px serif';
            invasionCtx.fillText(enemy.sprite, pos.x, pos.y);
            
            if (enemy.isBoss) {
                invasionCtx.globalAlpha = 1;
                drawInvasionBossHealth(invasionCtx, pos.x, pos.y, enemy.bossHits, enemy.bossTotalHits, enemy.bossNum);
            }
            invasionCtx.globalAlpha = 1;
            
            if (enemy.state === 'active' && pos.progress >= 1) {
                resolveInvasionMiss(enemy);
            }
        });

        if (invasionProjectiles.length) {
            invasionProjectiles = invasionProjectiles.filter((p) => now - p.start < p.duration + 30);
            invasionProjectiles.forEach((p) => {
                const frac = Math.min(1, (now - p.start) / p.duration);
                const x = p.x0 + (p.x1 - p.x0) * frac;
                const y = p.y0 + (p.y1 - p.y0) * frac;
                drawInvasionShovel(invasionCtx, x, y, p.angle);
                if (frac >= 1 && !p.resolved) {
                    p.resolved = true;
                    spawnInvasionParticles(p.x1, p.y1, '#6fcf7a');
                    const enemy = invasionEnemies.find((e) => e.id === p.targetId);
                    if (enemy) {
                        if (p.isBossHit) {
                            // Boss is still alive, do nothing on impact except particles
                        } else {
                            releaseInvasionLane(enemy.lane);
                            invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);
                            syncInvasionKeyHighlights();
                            if (invasionStage > 1) {
                                checkGroupCompletion();
                            }
                            topUpInvasionEnemies();
                        }
                    }
                }
            });
        }

        if (invasionParticles.length) {
            invasionParticles = invasionParticles.filter((p) => p.life < p.maxLife);
            invasionParticles.forEach((p) => {
                p.life += 16;
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                invasionCtx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
                invasionCtx.fillStyle = p.color;
                invasionCtx.beginPath();
                invasionCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                invasionCtx.fill();
            });
            invasionCtx.globalAlpha = 1;
        }

        if (invasionRunning || invasionCelebrating) {
            invasionRafId = requestAnimationFrame(invasionFrame);
        }
    }

    function getFrontActiveEnemy() {
        const now = performance.now();
        const active = invasionEnemies.filter((e) => e.state === 'active' && now >= e.startTime);
        if (!active.length) {
            return invasionEnemies.filter((e) => e.state === 'active').sort((a, b) => a.startTime - b.startTime)[0] || null;
        }
        active.sort((a, b) => {
            const pA = Math.min(1, Math.max(0, (now - a.startTime) / a.duration));
            const pB = Math.min(1, Math.max(0, (now - b.startTime) / b.duration));
            return pB - pA;
        });
        return active[0];
    }

    function handleInvasionAnswer(ch, key) {
        if (!invasionRunning) return;
        getSharedAudioContext();

        const enemy = getFrontActiveEnemy();
        if (!enemy) return;

        if (enemy.ch === ch) {
            key.classList.add('correct');
            setTimeout(() => key.classList.remove('correct'), 400);
            resolveInvasionKill(enemy);
        } else {
            // Если игрок повторно нажал клавишу уже убитого пришельца (пока летит лопата) — не штрафуем как ошибку
            if (invasionEnemies.some((e) => e.ch === ch && e.state === 'dying')) return;

            key.classList.add('wrong');
            setTimeout(() => key.classList.remove('wrong'), 400);
            invasionCombo = 0;
            updateInvasionStatsUI();
            invasionFeedback(t('js.learn.invasion_wrong', { '{got}': ch }), 'bad');

            Progress.recordInvasionAttempt(enemy.ch, false);
            if (ch && window.MORSE_CODE && window.MORSE_CODE[ch]) {
                Progress.recordInvasionAttempt(ch, false);
            }

            // На боссе повторяем звук текущего символа, чтобы использовать право на ошибку
            if (enemy.isBoss) {
                if (enemy.audio) enemy.audio.stop();
                queueInvasionAudio(enemy);
            }
        }
    }

    // Убийство НЕ убирает пришельца немедленно — по просьбе владельца: "с
    // базы вылетает лопата", которая должна долететь и попасть, прежде чем
    // пришелец пропадёт и полетят частицы взрыва. Поэтому позиция замирает
    // (state='dying'), а сам объект живёт до попадания лопаты (см.
    // invasionFrame → invasionProjectiles).
    function resolveInvasionKill(enemy) {
        const w = invasionCanvasWrapEl.clientWidth;
        const h = invasionCanvasWrapEl.clientHeight;
        const pos = invasionEnemyPosition(enemy, performance.now(), w, h);
        
        if (enemy.type === 'tank' && enemy.tankHits === 0) {
            enemy.tankHits++;
            enemy.ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
            enemy.duration += invasionTierDuration(enemy.ch, parseInt(invasionWpmSlider.value, 10));
            enemy.startTime = performance.now();
            queueInvasionAudio(enemy);
            syncInvasionKeyHighlights();
            flashInvasionHit();
            return;
        }

        invasionSpeedScoreSum += 1 - (pos.progress ?? 0);
        invasionSpeedScoreCount++;

        const isFinalBossHit = enemy.isBoss && (enemy.bossHits + 1 >= enemy.bossTotalHits);
        if (!enemy.isBoss || isFinalBossHit) {
            enemy.state = 'dying';
            enemy.dieX = pos.x;
            enemy.dieY = pos.y;
        }
        if (enemy.audio) enemy.audio.stop();

        const x0 = w - 28;
        const y0 = h / 2;
        invasionProjectiles.push({
            x0, y0,
            x1: pos.x, y1: pos.y,
            angle: Math.atan2(pos.y - y0, pos.x - x0),
            start: performance.now(),
            duration: INVASION_SHOVEL_MS,
            targetId: enemy.id,
            resolved: false,
            isBossHit: enemy.isBoss && !isFinalBossHit,
        });

        invasionCombo++;
        if (invasionCombo % 10 === 0 && invasionCombo > 0) {
            invasionHp = Math.min(INVASION_BASE_HP, invasionHp + 1);
            updateInvasionHpUI();
            invasionFeedback('💖 База починена (+1 HP)', 'ok');
        }
        if (invasionCombo > invasionBestCombo) invasionBestCombo = invasionCombo;

        Progress.recordInvasionAttempt(enemy.ch, true);
        
        let xp = INVASION_XP_PER_KILL * invasionStage;
        if (enemy.type === 'tank') xp = 2 * invasionStage;
        
        invasionDbXpEarned += xp;
        Progress.addXp(xp);
        syncInvasionKeyHighlights();

        if (enemy.isBoss) {
            enemy.bossHits++;
            updateInvasionStatsUI();
            if (enemy.bossHits < enemy.bossTotalHits) {
                invasionFeedback(t('js.learn.invasion_boss_hit', { '{hits}': enemy.bossHits, '{total}': enemy.bossTotalHits }), 'ok');
                
                if (enemy.isMegaBoss && enemy.bossQuote) {
                    enemy.ch = enemy.bossQuote[enemy.bossHits % enemy.bossQuote.length];
                } else {
                    enemy.ch = pickInvasionLetterWeighted(ALL_LEARNABLE);
                }
                if (enemy.audio) enemy.audio.stop();
                queueInvasionAudio(enemy);
                syncInvasionKeyHighlights();
                return;
            }
            clearTimeout(invasionBossAudioTimer);
            invasionBossAudioTimer = null;
            
            // Дополнительный опыт за добивание босса
            const bossBonus = enemy.bossTotalHits * 2;
            invasionDbXpEarned += bossBonus;
            Progress.addXp(bossBonus);
            
            if (enemy.isMegaBoss || enemy.bossNum === 3) {
                invasionKills++;
                updateInvasionStatsUI();
                invasionFeedback(t('js.learn.invasion_boss3_kill'), 'ok');
                setTimeout(() => finishInvasion(true), INVASION_SHOVEL_MS + 300);
            } else if (enemy.bossNum === 1) {
                invasionKills++;
                updateInvasionStatsUI();
                invasionFeedback(t('js.learn.invasion_boss1_kill'), 'ok');
                invasionBossPhase = false;
                releaseInvasionLane(enemy.lane);
                invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);
                syncInvasionKeyHighlights();
                advanceToStage(2);
            } else if (enemy.bossNum === 2) {
                invasionKills++;
                updateInvasionStatsUI();
                invasionFeedback(t('js.learn.invasion_boss2_kill'), 'ok');
                invasionBossPhase = false;
                releaseInvasionLane(enemy.lane);
                invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);
                syncInvasionKeyHighlights();
                advanceToStage(3);
            }
            return;
        }

        invasionKills++;
        updateInvasionStatsUI();
        invasionFeedback(t('js.learn.invasion_kill', { '{ch}': enemy.ch }), 'ok');

        if (invasionStage === 1) {
            invasionStageKills++;
            if (invasionStageKills >= INVASION_STAGE1_KILLS) {
                startBossPhase(1);
            }
        }
    }

    // Чисто визуальная обратная связь "тебя ударили" (добавлено 2026-08-01
    // по своей инициативе, владелец не просил конкретно это, но просил
    // "что-нибудь ещё") — короткая тряска поля + красная вспышка по краю
    // канваса, эхо .hp-bad у HP-бара. На логику/урон не влияет.
    function flashInvasionHit() {
        invasionCanvasWrapEl.classList.remove('invasion-hit-flash');
        void invasionCanvasWrapEl.offsetWidth; // форсируем reflow — иначе повторный класс подряд не перезапустит анимацию
        invasionCanvasWrapEl.classList.add('invasion-hit-flash');
        clearTimeout(invasionHitFlashTimer);
        invasionHitFlashTimer = setTimeout(() => {
            invasionCanvasWrapEl.classList.remove('invasion-hit-flash');
        }, 320);
    }

    function resolveInvasionMiss(enemy) {
        if (enemy.state !== 'active') return;
        enemy.state = 'hit';
        const dmg = enemy.isBoss ? INVASION_BOSS_BREACH_DAMAGE : invasionDamageFor(enemy.ch);
        invasionHp = Math.max(0, invasionHp - dmg);
        invasionCombo = 0;
        flashInvasionHit();
        Progress.recordInvasionAttempt(enemy.ch, false);
        invasionSpeedScoreSum += 0;
        invasionSpeedScoreCount++;
        if (enemy.audio) enemy.audio.stop();

        if (enemy.isBoss) {
            updateInvasionHpUI();
            updateInvasionStatsUI();
            if (invasionHp <= 0) {
                invasionFeedback(t('js.learn.invasion_boss_breach', { '{dmg}': dmg }), 'bad');
                releaseInvasionLane(enemy.lane);
                invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);
                finishInvasion(false);
                return;
            }
            invasionFeedback(t('js.learn.invasion_boss_breach', { '{dmg}': dmg }) + ' Повторная атака босса!', 'bad');
            releaseInvasionLane(enemy.lane);
            invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);
            setTimeout(() => {
                if (invasionRunning) spawnInvasionBoss(enemy.bossNum || 1);
            }, 1000);
            return;
        }

        releaseInvasionLane(enemy.lane);
        invasionEnemies = invasionEnemies.filter((e) => e.id !== enemy.id);

        updateInvasionHpUI();
        updateInvasionStatsUI();
        syncInvasionKeyHighlights();
        invasionFeedback(t('js.learn.invasion_hit', { '{ch}': enemy.ch, '{dmg}': dmg }), 'bad');

        if (invasionHp <= 0) {
            finishInvasion(false);
            return;
        }
        if (invasionStage === 1) {
            invasionStageKills++;
            if (invasionStageKills >= INVASION_STAGE1_KILLS) {
                startBossPhase(1);
                return;
            }
        } else {
            checkGroupCompletion();
        }
        topUpInvasionEnemies();
    }

    // Победный салют (2026-08-01, реальная просьба владельца: "в конце
    // отбития волны надо чтобы все взорвались красиво, и типа ура волна
    // отбита"). К моменту победы враги на поле уже не остались (последний
    // убит лопатой чуть раньше — см. resolveInvasionKill), так что "салют"
    // это не взрыв конкретных пришельцев, а несколько цветных фейерверков
    // вразнобой по всему полю. requestAnimationFrame к этому моменту обычно
    // уже остановлен вместе с invasionRunning=false, поэтому кадр держим
    // живым отдельным флагом (см. invasionCelebrating в invasionFrame).
    const INVASION_CELEBRATE_MS = 1500;
    const INVASION_CELEBRATE_BURSTS = 7;
    const INVASION_CELEBRATE_COLORS = ['#6fcf7a', '#f2c94c', '#56ccf2', '#eb5757', '#bb6bd9', '#f2994a'];

    function startInvasionCelebration() {
        invasionCelebrating = true;
        invasionCelebrateTimers.forEach(clearTimeout);
        invasionCelebrateTimers = [];
        if (invasionRafId === null) invasionRafId = requestAnimationFrame(invasionFrame);
        const w = invasionCanvasWrapEl.clientWidth;
        const h = invasionCanvasWrapEl.clientHeight;
        for (let i = 0; i < INVASION_CELEBRATE_BURSTS; i++) {
            invasionCelebrateTimers.push(setTimeout(() => {
                if (!invasionCelebrating) return; // отменили — например, владелец сразу нажал "В бой" заново
                const x = w * (0.12 + Math.random() * 0.76);
                const y = h * (0.15 + Math.random() * 0.7);
                const color = INVASION_CELEBRATE_COLORS[i % INVASION_CELEBRATE_COLORS.length];
                spawnInvasionParticles(x, y, color, 22, 90, 90, 550, 350);
            }, i * 190));
        }
        invasionCelebrateTimers.push(setTimeout(() => {
            invasionCelebrating = false;
            cancelAnimationFrame(invasionRafId);
            invasionRafId = null;
        }, INVASION_CELEBRATE_MS));
    }

    function finishInvasion(won) {
        // Если волну уже остановили руками (stopInvasion) — отложенный вызов
        // (см. setTimeout в resolveInvasionKill на 100-м попадании) не должен
        // задним числом показать экран победы/поражения.
        if (!invasionRunning) return;
        invasionRunning = false;
        invasionEnemies.forEach((e) => { if (e.audio) e.audio.stop(); });
        invasionEnemies = [];
        invasionStartBtn.style.display = 'inline-flex';
        invasionStopBtn.style.display = 'none';

        if (won) {
            // Разовый бонус за волну целиком — НЕ за каждое попадание (см.
            // комментарий выше про анти-фарм). По договорённости с
            // владельцем 2026-07-31 (второй заход): бонус = сколько HP базы
            // уцелело (1:1, т.е. осталось 90 HP — бонус 90) + бонус за
            // скорость реакции 10-30 (среднее по ВСЕМ попаданиям и промахам
            // за волну: убивал почти сразу как пришелец появлялся — ближе к
            // 30, тянул до последнего момента или пропускал пришельцев —
            // ближе к 10).
            const hpBonus = Math.round(Math.max(0, invasionHp));
            const avgSpeedScore = invasionSpeedScoreCount ? (invasionSpeedScoreSum / invasionSpeedScoreCount) : 0;
            const speedBonus = Math.round(10 + avgSpeedScore * 20);
            const bonusXp = hpBonus + speedBonus;
            invasionDbXpEarned += bonusXp;
            Progress.addXp(bonusXp);
            Progress.incrementStat('invasionWavesCompleted', 1);
            Progress.markDailyActivity();
            tickDaily('invasion');
            // Без этого вызова ачивки за волны (invasion_first/invasion_10)
            // не выдавались бы сразу после победы, а «догонялись» бы только
            // при следующей проверке из другого режима — выглядело бы как
            // потерянная награда. incrementStat сам ачивки не пересчитывает.
            Progress.checkAchievements();
            invasionFeedback(t('js.learn.invasion_win', { '{xp}': bonusXp, '{hp}': hpBonus, '{speed}': speedBonus }), 'ok');
            invasionOverlayEl.textContent = t('js.learn.invasion_win_overlay');
            invasionOverlayEl.className = 'invasion-overlay show win';
            startInvasionCelebration();
        } else {
            // Поражению салют не положен — раф останавливаем сразу же, как
            // и раньше.
            cancelAnimationFrame(invasionRafId);
            invasionRafId = null;
            invasionFeedback(t('js.learn.invasion_lose', { '{kills}': invasionKills }), 'bad');
            invasionOverlayEl.textContent = t('js.learn.invasion_lose_overlay', { '{kills}': invasionKills });
            invasionOverlayEl.className = 'invasion-overlay show lose';
        }
        
        logInvasionXp();
        setTimeout(() => { invasionOverlayEl.classList.remove('show'); }, 3500);
    }

    function logInvasionXp() {
        if (invasionDbXpEarned > 0) {
            const dur = Math.round((Date.now() - invasionSessionStartTime) / 1000);
            Progress.logXp(invasionDbXpEarned, 'invasion', {
                wpm: invasionWpmSlider.value,
                dur,
                err: INVASION_BASE_HP - invasionHp,
                acc: invasionSpeedScoreCount ? Math.round((invasionSpeedScoreSum / invasionSpeedScoreCount) * 100) : 0
            });
            invasionDbXpEarned = 0;
        }
    }

    function stopInvasion() {
        if (!invasionRunning && invasionRafId === null) return;
        invasionRunning = false;
        // Останавливаем и незавершённый победный салют (см.
        // startInvasionCelebration) — иначе его отложенные setTimeout всё
        // равно досыпали бы частицы в уже остановленную/новую игру.
        invasionCelebrating = false;
        invasionCelebrateTimers.forEach(clearTimeout);
        invasionCelebrateTimers = [];
        invasionBossPhase = false;
        invasionStage = 1;
        invasionStageKills = 0;
        invasionStageGroups = 0;
        invasionCurrentBoss = 0;
        clearTimeout(invasionGroupSpawnTimer);
        invasionGroupSpawnTimer = null;
        clearTimeout(invasionBossAudioTimer);
        invasionBossAudioTimer = null;
        cancelAnimationFrame(invasionRafId);
        invasionRafId = null;
        invasionEnemies.forEach((e) => { if (e.audio) e.audio.stop(); });
        invasionEnemies = [];
        invasionProjectiles = [];
        invasionParticles = [];
        invasionAudioChain = Promise.resolve(); invasionAudioQueueEndTime = performance.now();
        invasionOverlayEl.classList.remove('show');
        invasionCanvasWrapEl.classList.remove('invasion-hit-flash');
        clearTimeout(invasionHitFlashTimer);
        invasionStartBtn.style.display = 'inline-flex';
        invasionStopBtn.style.display = 'none';
        syncInvasionKeyHighlights();
        
        logInvasionXp();
    }

    function startInvasion() {
        // Явный resume() прямо в обработчике клика по кнопке — подстраховка
        // для мобильных браузеров (см. комментарий у handleInvasionAnswer
        // про пропадающий звук): getSharedAudioContext() и так пытается
        // возобновить контекст сам, но на iOS Safari надёжно это работает,
        // только когда вызвано синхронно внутри настоящего пользовательского
        // жеста — а не откуда-то из середины async-цепочки.
        getSharedAudioContext();
        initInvasionGrid();
        resizeInvasionCanvas();
        // Если "В бой" нажали прямо во время победного салюта прошлой волны
        // (см. startInvasionCelebration) — гасим его, иначе его отложенные
        // setTimeout досыплют случайные фейерверки поверх уже новой игры.
        invasionCelebrating = false;
        invasionCelebrateTimers.forEach(clearTimeout);
        invasionCelebrateTimers = [];
        // На случай того же "нажал В бой во время салюта" — салютный raf-цикл
        // ещё мог быть жив (invasionRafId не null); без явной отмены ниже
        // запустился бы ВТОРОЙ параллельный цикл поверх него (см. хвост
        // invasionFrame — он сам себя планирует, пока invasionRunning ||
        // invasionCelebrating истинно).
        if (invasionRafId !== null) { cancelAnimationFrame(invasionRafId); invasionRafId = null; }
        invasionRunning = true;
        invasionBossPhase = false;
        invasionStage = 1;
        invasionStageKills = 0;
        invasionStageGroups = 0;
        invasionCurrentBoss = 0;
        clearTimeout(invasionGroupSpawnTimer);
        invasionGroupSpawnTimer = null;
        invasionHp = INVASION_BASE_HP;
        invasionKills = 0;
        invasionCombo = 0;
        invasionBestCombo = 0;
        invasionSpeedScoreSum = 0;
        invasionSpeedScoreCount = 0;
        invasionEnemies = [];
        invasionProjectiles = [];
        invasionParticles = [];
        invasionLanePool = Array.from({ length: INVASION_MAX_LANES }, (_, i) => i);
        invasionAudioChain = Promise.resolve(); invasionAudioQueueEndTime = performance.now();
        invasionWaveStart = performance.now();
        invasionDbXpEarned = 0;
        invasionSessionStartTime = Date.now();
        updateInvasionHpUI();
        updateInvasionStatsUI();
        invasionOverlayEl.classList.remove('show');
        invasionStartBtn.style.display = 'none';
        invasionStopBtn.style.display = 'inline-flex';
        invasionFeedback(t('js.learn.invasion_stage1'), 'ok');
        invasionRafId = requestAnimationFrame(invasionFrame);
        topUpInvasionEnemies();
    }

    invasionStartBtn.addEventListener('click', startInvasion);
    invasionStopBtn.addEventListener('click', stopInvasion);
    const savedInvasionWpm = localStorage.getItem('morse_invasion_wpm');
    if (savedInvasionWpm) {
        invasionWpmSlider.value = savedInvasionWpm;
        invasionWpmValueEl.textContent = savedInvasionWpm;
        invasionWpmCpmEl.textContent = cpmHintText(savedInvasionWpm);
    }
    invasionWpmSlider.addEventListener('input', () => {
        invasionWpmValueEl.textContent = invasionWpmSlider.value;
        invasionWpmCpmEl.textContent = cpmHintText(invasionWpmSlider.value);
        localStorage.setItem('morse_invasion_wpm', invasionWpmSlider.value);
    });

    // Ввод с физической клавиатуры — тот же приём, что и в "Приёме на слух"
    // (см. window.addEventListener('keydown', ...) выше для recognizeModeActive).

    function activateInvasionSlow() {
        if (!invasionPowerups.slow || !invasionRunning) return;
        invasionPowerups.slow = 0;
        updateInvasionStatsUI();
        invasionSlowUntil = performance.now() + 6000;
        invasionEnemies.forEach(e => {
            if (e.state === 'active') {
                const elapsed = performance.now() - e.startTime;
                const remaining = e.duration - elapsed;
                e.duration = elapsed + remaining * 2;
            }
        });
        invasionFeedback(t('js.learn.invasion_pu_slow_msg'), 'ok');
        invasionCanvasWrapEl.classList.add('slow-field');
        setTimeout(() => invasionCanvasWrapEl.classList.remove('slow-field'), 6000);
    }

    function activateInvasionNuke() {
        if (!invasionPowerups.nuke || !invasionRunning) return;
        invasionPowerups.nuke = 0;
        updateInvasionStatsUI();
        invasionFeedback(t('js.learn.invasion_pu_nuke_msg'), 'ok');
        invasionCanvasWrapEl.classList.add('nuke-flash');
        setTimeout(() => invasionCanvasWrapEl.classList.remove('nuke-flash'), 500);
        
        invasionEnemies.forEach(e => {
            if (e.state !== 'active') return;
            if (e.isBoss) {
                e.bossHits++; // Deal 1 dmg
                if (e.bossHits < e.bossTotalHits) {
                    respawnInvasionBossSegment(e);
                } else {
                    resolveInvasionKill(e);
                }
            } else {
                resolveInvasionKill(e);
            }
        });
    }

    if (invasionPuSlow) invasionPuSlow.addEventListener('click', activateInvasionSlow);
    if (invasionPuNuke) invasionPuNuke.addEventListener('click', activateInvasionNuke);

    window.addEventListener('keydown', (e) => {
        if (!invasionModeActive || !invasionRunning) return;
        if (e.code === 'Space' && invasionPowerups.slow) {
            e.preventDefault();
            activateInvasionSlow();
            return;
        }
        if (e.code === 'Enter' && invasionPowerups.nuke) {
            e.preventDefault();
            activateInvasionNuke();
            return;
        }
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (/^[a-zA-Z]$/.test(e.key)) {
            if (window.hideLayoutHint) window.hideLayoutHint();
        }

        let ch = e.key.toUpperCase();
        
        // Автозамена кириллицы
        const RU_TO_EN = {
            'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}',
            'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ж': ':', 'Э': '"',
            'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>', 'Ё': '~'
        };
        
        if (/[А-ЯЁ]/i.test(ch)) {
            if (RU_TO_EN[ch]) {
                ch = RU_TO_EN[ch];
                if (window.showLayoutHint) window.showLayoutHint();
            } else {
                e.preventDefault();
                invasionFeedback(t('js.learn.wrong_layout'), 'bad');
                return;
            }
        }

        if (!ALL_LEARNABLE.includes(ch)) return;
        const key = invasionGridEl.querySelector(`[data-ch="${ch}"]`);
        if (key) { e.preventDefault(); handleInvasionAnswer(ch, key); }
    });

    // Своя (системная) клавиатура телефона как альтернативный способ ввода
    // убрана целиком (2026-08-01) — несмотря на несколько попыток починить
    // сброс фокуса на каждое нажатие (сначала отложенная очистка value через
    // setTimeout, потом .select() вместо очистки), реальный фидбек владельца
    // после теста был "не работает" — проблема оказалась глубже, чем можно
    // диагностировать без реального устройства под рукой. Единственный
    // способ ввода в игре снова — самодельная QWERTY-сетка ниже (клик/тап)
    // и физическая клавиатура компа (см. window.keydown выше). Если тема
    // будет подниматься снова — начинать не с патчей текущего подхода, а
    // с альтернативной реализации (см. lessons в project_minigame_direction
    // memory), а не повторять те же две попытки.

    /* ===================== ЗАДАНИЕ ДНЯ =====================
       На этапе новичка задание дня — «изучи N новых букв» (режим отправки),
       на следующем — «прими N символов на слух» (режим приёма). Тип задания
       определяет daily.js по прогрессу; сюда приходим по ссылке с главной
       (learn.php?daily=1[&mode=recognize]). Прогресс считаем за текущий заход,
       бонус +50 XP выдаём через общий Progress.completeDailyChallenge(). */
    let dailyTask = null;   // задание, если оно активно и относится к открытой вкладке
    let dailyCount = 0;     // сделано за этот заход
    let dailyBannerEl = null;

    function makeDailyBanner(container) {
        const b = document.createElement('div');
        b.className = 'feedback show ok mt-2';
        container.insertBefore(b, container.firstChild);
        return b;
    }

    function renderDailyBanner() {
        if (!dailyBannerEl || !dailyTask) return;
        dailyBannerEl.textContent =
            t('js.learn.daily_banner', { '{count}': dailyCount, '{target}': dailyTask.target, '{title}': dailyTask.title });
    }

    // Вызывается из обоих режимов; тикает только если активное задание того же типа.
    function tickDaily(type) {
        if (!dailyTask || dailyTask.type !== type) return;
        dailyCount++;
        if (dailyCount >= dailyTask.target) {
            const granted = Progress.completeDailyChallenge();
            dailyBannerEl.textContent = granted
                ? t('js.learn.daily_done_bonus')
                : t('js.learn.daily_done_norebonus');
            dailyBannerEl.className = 'feedback show ok mt-2';
            dailyTask = null; // больше не тикаем в этом заходе
        } else {
            renderDailyBanner();
        }
    }

    // Прямая ссылка на конкретный подрежим: learn.php?mode=invasion (работает
    // для любого data-mode из .mode-switch). Нужно для промо-карточки на
    // главной — мини-игра лежит четвёртым подрежимом внутри «Букв», и без
    // прямой ссылки те, кто буквы уже прошёл, до неё просто не доходят.
    //
    // ВАЖНО, почему этот блок в самом конце файла, а не рядом с обработчиком
    // .mode-switch наверху: chip.click() синхронно выполняет тот обработчик,
    // а он трогает recStartBtn/rhythmKey и другие const, объявленные НИЖЕ по
    // файлу. Вызов до их инициализации упал бы с ReferenceError (temporal
    // dead zone). Не переносить наверх «для порядка».
    //
    // ?daily=1 обрабатывается отдельно ниже и при необходимости сам
    // переключает вкладку — поэтому тут его пропускаем, чтобы два обработчика
    // не дрались за активный режим.
    (function applyModeFromUrl() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') === '1') return;
        const mode = params.get('mode');
        if (!mode) return;
        const chip = document.querySelector(`.mode-switch .chip[data-mode="${mode}"]`);
        if (chip) chip.click();
    })();

    (function applyLearnDaily() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') !== '1') return;
        const task = DailyChallenge.forToday();
        const wantRecognize = params.get('mode') === 'recognize';

        // Активируем только если сегодняшнее задание совпадает с открытой
        // вкладкой — иначе это просто обычная тренировка без бонуса.
        const wantInvasion = params.get('mode') === 'invasion';
        
        if (task.type === 'learn' && !wantRecognize && !wantInvasion) {
            dailyTask = task;
            dailyBannerEl = makeDailyBanner(sendModeEl);
        } else if (task.type === 'recognize' && wantRecognize) {
            dailyTask = task;
            const chip = document.querySelector('.mode-switch .chip[data-mode="recognize"]');
            if (chip) chip.click();
            dailyBannerEl = makeDailyBanner(recognizeModeEl);
        } else if (task.type === 'invasion' && wantInvasion) {
            // Для вторжения target = 1 (одна волна)
            task.target = 1;
            dailyTask = task;
            const chip = document.querySelector('.mode-switch .chip[data-mode="invasion"]');
            if (chip) chip.click();
            dailyBannerEl = makeDailyBanner(invasionModeEl);
        } else {
            return;
        }

        if (DailyChallenge.isDoneToday()) {
            dailyBannerEl.textContent = t('js.learn.daily_already_done');
            dailyTask = null;
        } else {
            renderDailyBanner();
        }
    })();
})();
window.addEventListener('beforeunload', () => { if (typeof invasionRunning !== 'undefined' && invasionRunning) logInvasionXp(); });

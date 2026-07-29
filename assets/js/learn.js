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
    let recognizeModeActive = false;

    document.querySelectorAll('.mode-switch .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mode-switch .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const mode = chip.dataset.mode;
            sendModeEl.style.display = mode === 'send' ? 'block' : 'none';
            recognizeModeEl.style.display = mode === 'recognize' ? 'block' : 'none';
            rhythmModeEl.style.display = mode === 'rhythm' ? 'block' : 'none';
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
        const ch = e.key.toUpperCase();
        // Проверяем против фактически отрисованных тайлов, а не жёстко
        // латиницы/кириллицы целиком — так работает и для смешанного набора
        // "Свои символы".
        if (!recGridLetters.includes(ch)) return;
        const tile = recGrid.querySelector(`[data-ch="${ch}"]`);
        if (tile) { e.preventDefault(); handleRecognizeAnswer(ch, tile); }
    });

    recWpmSlider.addEventListener('input', () => { recWpmValue.textContent = recWpmSlider.value; });
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
       те же три чипа, что и в "Отправке" (алфавит/Кох/кириллица), но
       выбор буквы и статистика — полностью отдельные от send-mode. */
    const rhythmGrid = document.getElementById('rhythm-grid');
    const rhythmPanel = document.getElementById('rhythm-panel');
    const rhythmLetterEl = document.getElementById('rhythm-letter');
    const rhythmPatternEl = document.getElementById('rhythm-pattern');
    const rhythmWpmSlider = document.getElementById('rhythm-wpm');
    const rhythmWpmValue = document.getElementById('rhythm-wpm-value');
    const rhythmKeyEl = document.getElementById('rhythm-key');
    const rhythmLampEl = new MorseLamp(document.getElementById('rhythm-lamp'));
    const rhythmSignalLine = new SignalLine(document.getElementById('rhythm-signal'));
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
    let rhythmBest = 0;       // лучшая попытка за всё время (%), из Progress.stats
    let rhythmSessionTotal = 0; // верно опознанных попыток за этот заход на вкладку (любая точность)
    let rhythmSessionSum = 0;   // сумма их точности (0..1) — для среднего по сессии

    function isCyrillicOrderRhythm() {
        return rhythmOrder === 'cyrillic';
    }

    function codeForRhythm(ch) {
        return isCyrillicOrderRhythm() ? CYRILLIC_CODE[ch] : MORSE_CODE[ch];
    }

    function orderedRhythmLetters() {
        if (rhythmOrder === 'koch') {
            return KOCH_ORDER.filter(ch => ALL_LEARNABLE.includes(ch));
        }
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
        rhythmCurrentWasMasteredAtStart = Array.isArray(state.rhythmMasteredLetters)
            && state.rhythmMasteredLetters.includes(progressKeyForChar(ch));
        resetRhythmBuffers();
        updateRhythmStreakUI();
        [...rhythmGrid.children].forEach(t => t.classList.toggle('selected', t.dataset.ch === ch));
        rhythmLetterEl.textContent = ch;
        renderRhythmPattern(ch);
        rhythmPanel.style.display = 'block';
        rhythmFeedbackEl.className = 'feedback';
        rhythmSignalLine.clear();
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

    // Серия "точных подряд" для текущей буквы — визуально та же полоса-прогресс,
    // что и correctStreak в "Отправке" (updateStreakUI()).
    function updateRhythmStreakUI() {
        rhythmStreakEl.textContent = rhythmStreak;
        rhythmStreakBarEl.style.width = `${Math.min(rhythmStreak / REQUIRED_RHYTHM_STREAK, 1) * 100}%`;
    }

    // Сессионная статистика (рекорд/средняя точность/всего попыток) — общая
    // по вкладке, не привязана к конкретно выбранной букве (как в "Приёме").
    function updateRhythmStatsUI() {
        rhythmBestEl.textContent = `${rhythmBest}%`;
        rhythmAccuracyEl.textContent = rhythmSessionTotal
            ? `${Math.round((rhythmSessionSum / rhythmSessionTotal) * 100)}%`
            : '—';
        rhythmTotalEl.textContent = rhythmSessionTotal;
    }

    // Вызывается при каждом заходе на вкладку "Ритм ключа" — рекорд общий
    // (из Progress.stats), сессионные счётчики (среднее/всего) — только
    // за этот заход, как и в "Приёме на слух".
    function startRhythmSession() {
        rhythmSessionTotal = 0;
        rhythmSessionSum = 0;
        const state = Progress.load();
        rhythmBest = state.stats.rhythmBestAccuracy || 0;
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

        if (overallPct > rhythmBest) {
            rhythmBest = overallPct;
            const state = Progress.load();
            state.stats.rhythmBestAccuracy = rhythmBest;
            Progress.save(state);
            Progress.checkAchievements();
        }

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
                Progress.markDailyActivity();
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
                if (rhythmLastUp !== null) {
                    rhythmPauses.push(performance.now() - rhythmLastUp);
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
            const acc = timingAccuracy(durationMs, ideal);
            rhythmSignalLine.pulse(`${symbol === '.' ? 'dot' : 'dash'} ${accuracyClass(acc)}`, durationMs);
        },
        onLetter: handleRhythmLetter,
    });

    rhythmWpmSlider.addEventListener('input', () => {
        rhythmWpmValue.textContent = rhythmWpmSlider.value;
        rhythmKey.setWpm(currentRhythmWpm());
    });

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

    (function applyLearnDaily() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') !== '1') return;
        const task = DailyChallenge.forToday();
        const wantRecognize = params.get('mode') === 'recognize';

        // Активируем только если сегодняшнее задание совпадает с открытой
        // вкладкой — иначе это просто обычная тренировка без бонуса.
        if (task.type === 'learn' && !wantRecognize) {
            dailyTask = task;
            dailyBannerEl = makeDailyBanner(sendModeEl);
        } else if (task.type === 'recognize' && wantRecognize) {
            dailyTask = task;
            const chip = document.querySelector('.mode-switch .chip[data-mode="recognize"]');
            if (chip) chip.click(); // переключаемся на приём на слух
            dailyBannerEl = makeDailyBanner(recognizeModeEl);
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
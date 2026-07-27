(function () {
    const REQUIRED_STREAK = 5; // сколько верных повторов подряд нужно для "выучено"

    // Решение владельца после тестирования v2.51 (2026-07-27): за отправку
    // ключом кириллица XP не повышаем — тот же плоский LEARN_XP, что и для
    // латиницы, не усложняем. А вот в приёме на слух кириллица даёт немного
    // больше "для разнообразия" — сознательный выбор, не баг.
    const LEARN_XP = 25;
    const CYRILLIC_RECOGNIZE_XP = 2;
    const LATIN_RECOGNIZE_XP = 1;

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
            } else {
                // уход со вкладки не должен оставлять звук играть в фоне
                haltRecognize();
                recStartBtn.style.display = 'inline-flex';
                recStopBtn.style.display = 'none';
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
        // Слоговые мнемоники есть только для латиницы (см. morse-data.js) —
        // для кириллицы mnemonic будет undefined, блок просто пустеет.
        const mnemonic = MORSE_MNEMONICS[ch];
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
    let recGridMode = 'latin'; // 'latin' | 'cyrillic' — какой набор тайлов сейчас отрисован в recGrid
    let recAudio = null;         // проигрыватель текущего символа — чтобы его можно было оборвать
    let recNextTimer = null;     // отложенный запуск следующего символа
    let recSessionId = 0;        // токен запуска: старая await-цепочка узнаёт, что она уже не актуальна

    document.querySelectorAll('#rec-charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#rec-charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            recCharsetKey = chip.dataset.set;
            const recIsCustom = recCharsetKey === 'custom';
            document.getElementById('rec-custom-input').style.display = recIsCustom ? 'block' : 'none';
            document.getElementById('rec-custom-hint').style.display = recIsCustom ? 'block' : 'none';
            // Тайлы ответа тоже должны быть кириллическими, когда выбран набор
            // "Кириллические символы" — иначе отвечать было бы просто нечем.
            const wantGridMode = recCharsetKey === 'cyrillic' ? 'cyrillic' : 'latin';
            if (wantGridMode !== recGridMode) buildRecGrid(wantGridMode);
        });
    });

    function buildRecGrid(mode) {
        recGridBuilt = true;
        recGridMode = mode;
        recGrid.innerHTML = '';
        const letters = mode === 'cyrillic' ? CYRILLIC_LEARNABLE : ALL_LEARNABLE;
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
        buildRecGrid('latin');
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
            case 'custom': {
                const raw = document.getElementById('rec-custom-input').value.toUpperCase();
                const chars = [...new Set(raw.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).flatMap(s => s.split(''))
                    .filter(ch => MORSE_CODE[ch]))];
                return chars.length >= 5 ? chars : ALL_LEARNABLE;
            }
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
            const xpGained = recGridMode === 'cyrillic' ? CYRILLIC_RECOGNIZE_XP : LATIN_RECOGNIZE_XP;
            recFeedback.textContent = t('js.learn.rec_correct', { '{ch}': recTarget, '{xp}': xpGained });
            recFeedback.className = 'feedback show ok';
            Progress.addXp(xpGained);
            Progress.incrementStat('recognizedCount', 1);

            if (recStreak > recBest) {
                recBest = recStreak;
                state = Progress.load();
                state.stats.recognizeBestStreak = recBest;
                Progress.save(state);
                Progress.checkAchievements();
                recFeedback.textContent += t('js.learn.rec_new_record');
            }
            tickDaily('recognize'); // засчитываем верный приём в задание дня, если оно активно
        } else {
            recStreak = 0;
            recFeedback.textContent = t('js.learn.rec_wrong', { '{target}': recTarget, '{ch}': ch });
            recFeedback.className = 'feedback show bad';
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
        const validPool = recGridMode === 'cyrillic' ? CYRILLIC_LEARNABLE : ALL_LEARNABLE;
        if (!validPool.includes(ch)) return;
        const tile = recGrid.querySelector(`[data-ch="${ch}"]`);
        if (tile) { e.preventDefault(); handleRecognizeAnswer(ch, tile); }
    });

    recWpmSlider.addEventListener('input', () => { recWpmValue.textContent = recWpmSlider.value; });
    recStartBtn.addEventListener('click', () => {
        if (recRunning) return;
        haltRecognize(); // добить хвосты предыдущего запуска, если они ещё живы
        recRunning = true;
        recFeedback.className = 'feedback';
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
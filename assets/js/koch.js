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
    const wpmCpm = document.getElementById('koch-wpm-cpm');
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

    /**
     * Экранная клавиатура — только для тач-устройств (см. koch.php). На
     * Кохе набор символов смешивает буквы/цифры/знаки (. и ?), а у
     * нативной клавиатуры телефона они на разных "страницах" — переключение
     * туда-обратно на каждую группу утомляет. Наша клавиатура показывает
     * весь текущий набор сразу, и inputmode="none" на поле ввода не даёт
     * системной клавиатуре всплывать поверх неё. На компьютере (курсор,
     * а не палец) ничего не меняем — ввод остаётся обычным, с клавиатуры.
     */
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const vkbEl = document.getElementById('koch-vkb');
    if (isTouch) {
        answerInput.setAttribute('inputmode', 'none');
        vkbEl.style.display = 'flex';
    }

    // Раскладка QWERTY — привычнее произвольной сортировки, палец сам
    // помнит, где буква, без разглядывания клавиатуры. Ровно 38 символов —
    // все буквы, все цифры, "." и "?" — весь набор метода Коха целиком.
    const QWERTY_ROWS = [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['Z','X','C','V','B','N','M','.','?'],
    ];

    // ВАЖНО: клавиатура всегда показывает ПОЛНЫЙ набор символов метода Коха,
    // а не только те, что уже открыты на текущем уровне. Если показывать
    // лишь открытые — это подсказка: услышав сигнал, можно угадать букву
    // просто по тому, что вариантов на клавиатуре всего 2-3, даже не
    // разобрав его на слух. Полный набор кнопок не выдаёт ничего лишнего,
    // ровно как обычная физическая клавиатура на компьютере.
    function renderVkb() {
        if (!isTouch) return;
        vkbEl.innerHTML = '';

        QWERTY_ROWS.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'vkb-row';
            row.forEach((ch) => {
                const key = document.createElement('div');
                key.className = 'vkb-key';
                key.textContent = ch;
                key.addEventListener('click', () => {
                    const start = answerInput.selectionStart ?? answerInput.value.length;
                    const end = answerInput.selectionEnd ?? answerInput.value.length;
                    const val = answerInput.value;
                    answerInput.value = val.slice(0, start) + ch + val.slice(end);
                    answerInput.focus();
                    const pos = start + ch.length;
                    answerInput.setSelectionRange(pos, pos);
                });
                rowEl.appendChild(key);
            });
            vkbEl.appendChild(rowEl);
        });

        // "Стереть" — отдельным ПОЛНОШИРИННЫМ рядом снизу, а не втиснута в
        // ряд с буквами: там ей не хватало места и подпись переносилась и
        // вылезала за рамку. Отдельный ряд — места достаточно, ошибиться
        // с чем это кнопка уже нельзя.
        const backRow = document.createElement('div');
        backRow.className = 'vkb-row';
        const back = document.createElement('div');
        back.className = 'vkb-key vkb-backspace';
        back.innerHTML = t('js.koch.erase');
        back.addEventListener('click', () => {
            const start = answerInput.selectionStart ?? answerInput.value.length;
            const end = answerInput.selectionEnd ?? answerInput.value.length;
            const val = answerInput.value;
            if (start !== end) {
                // Есть выделение — стираем его целиком, как обычный backspace.
                answerInput.value = val.slice(0, start) + val.slice(end);
                answerInput.focus();
                answerInput.setSelectionRange(start, start);
            } else if (start > 0) {
                answerInput.value = val.slice(0, start - 1) + val.slice(start);
                answerInput.focus();
                answerInput.setSelectionRange(start - 1, start - 1);
            } else {
                answerInput.focus();
            }
        });
        backRow.appendChild(back);
        vkbEl.appendChild(backRow);
    }

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
            chip.title = t('js.koch.tap_to_hear');
            chip.addEventListener('click', () => playCharsetLetter(ch, chip));
            kochCharsetEl.appendChild(chip);
        });
        renderVkb();
    }

    async function playCharsetLetter(ch, chip) {
        const wpm = parseInt(wpmSlider.value, 10) || 12;
        const audio = new MorseAudio({ wpm });
        chip.classList.add('active');
        const mnemonic = MORSE_MNEMONICS[ch];
        const tita = MORSE_CODE[ch].split('').map(s => s === '.' ? t('js.common.dit') : t('js.common.dah')).join('-');
        kochCharsetFeedback.className = 'feedback show ok';
        kochCharsetFeedback.textContent = mnemonic
            ? t('js.koch.charset_feedback_with_mnemonic', { '{ch}': ch, '{tita}': tita, '{mnemonic}': mnemonic.join('-') })
            : t('js.koch.charset_feedback', { '{ch}': ch, '{tita}': tita });
        await audio.play(ch, {});
        chip.classList.remove('active');
    }

    jumpSlider.addEventListener('input', () => { jumpValue.textContent = jumpSlider.value; });
    jumpApplyBtn.addEventListener('click', () => {
        const level = parseInt(jumpSlider.value, 10);
        const state = Progress.load();
        if (level === state.kochLevel) return;

        if (level < state.kochLevel) {
            const ok = confirm(t('js.koch.confirm_decrease', { '{from}': state.kochLevel, '{to}': level }));
            if (!ok) return;
        }

        Progress.setKochLevel(level);
        renderHeader();
        feedbackEl.textContent = t('js.koch.now_open', { '{level}': level });
        feedbackEl.className = 'feedback show ok';
        setTimeout(() => { feedbackEl.className = 'feedback'; }, 2500);
    });

    wpmSlider.addEventListener('input', () => { wpmValue.textContent = wpmSlider.value; wpmCpm.textContent = cpmHintText(wpmSlider.value); });
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

    /**
     * Тот же принцип, что и weightedRandomGroup в groups.js (2026-08-02) —
     * лёгкий уклон в сторону символов, которые пользователь чаще путает
     * (Progress.kochLetterScore), вес 1.0..1.5, незаметно на глаз. В отличие
     * от "Групп" тут нет отдельного "честного" режима вроде экзамена — но
     * есть PASS_THRESHOLD (0.9) в finishSession, которым меряется открытие
     * следующего символа. Уклон настолько мягкий, что не должен систематически
     * мешать перейти порог — если и мешает, то ровно потому, что открытый
     * набор реально ещё не освоен, а не из-за перекоса выборки.
     */
    function weightedRandomGroup(charset, len) {
        const weights = charset.map(ch => 1 + (1 - Progress.kochLetterScore(ch)) * 0.5);
        const total = weights.reduce((sum, w) => sum + w, 0);
        let g = '';
        for (let i = 0; i < len; i++) {
            let r = Math.random() * total;
            let idx = 0;
            while (idx < charset.length - 1 && r > weights[idx]) {
                r -= weights[idx];
                idx++;
            }
            g += charset[idx];
        }
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
            groups: Array.from({ length: count }, () => weightedRandomGroup(charset, GROUP_LEN)),
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

        // Питает weightedRandomGroup — см. комментарий там.
        {
            const typedUpper = typed.toUpperCase();
            for (let i = 0; i < expected.length; i++) {
                Progress.recordKochAttempt(expected[i], typedUpper[i] === expected[i]);
            }
        }

        // Начисляем сразу за эту группу — если сессия не будет
        // пройдена до конца, заработанное всё равно не потеряется.
        const xpGain = Math.round(correct * session.xpRate);
        session.xpEarned += xpGain;
        if (xpGain > 0) Progress.addXp(xpGain, 'koch', { wpm: session.wpm, fw: session.fwWpm });
        Progress.incrementStat('groupsCompleted', 1);
        postStat('total_groups', 1);

        if (correct === expected.length) {
            feedbackEl.textContent = t('js.koch.correct', { '{expected}': expected });
            feedbackEl.className = 'feedback show ok';
        } else {
            const len = Math.max(expected.length, typed.length);
            let expectedHTML = '';
            let typedHTML = '';
            
            for (let i = 0; i < len; i++) {
                const e = expected[i] || '_';
                const tChar = typed[i] || '_';
                if (e === tChar.toUpperCase()) {
                    expectedHTML += `<span style="color: var(--success);">${e}</span>`;
                    typedHTML += `<span style="color: var(--success);">${tChar.toUpperCase()}</span>`;
                } else {
                    expectedHTML += `<span style="color: var(--text); font-weight: bold; text-decoration: underline;">${e}</span>`;
                    typedHTML += `<span style="color: var(--danger); font-weight: bold; text-decoration: underline;">${tChar.toUpperCase()}</span>`;
                }
            }
            
            const rawText = t('js.koch.wrong', { '{expected}': expectedHTML, '{typed}': typedHTML || t('js.koch.empty_placeholder') });
            feedbackEl.innerHTML = `<span style="font-family: var(--font-mono); font-size: 15px; letter-spacing: 1px; color: var(--text);">${rawText}</span>`;
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
            Progress.addXp(bonus, 'koch_bonus', { wpm: session.wpm, fw: session.fwWpm });
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        let dailyBonusMsg = '';
        let dailyBonusFail = false;
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('daily') === '1') {
            const req = DailyChallenge.forToday();
            if (req.type === 'koch') {
                if (accuracy < 0.6) {
                    dailyBonusFail = true;
                    dailyBonusMsg = t('js.groups.daily_low_accuracy', {
                        '{min}': 60,
                        '{acc}': Math.round(accuracy * 100)
                    });
                } else {
                    if (DailyChallenge.isDoneToday()) {
                        dailyBonusMsg = t('js.groups.daily_already');
                    } else {
                        Progress.completeDailyChallenge();
                        dailyBonusMsg = t('js.groups.daily_bonus');
                    }
                }
            }
        }

        // Clean up previous daily note if any
        const oldNote = document.getElementById('koch-daily-note');
        if (oldNote) oldNote.remove();

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.id = 'koch-daily-note';
            note.className = (dailyBonusFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2') + ' js-result-note';
            note.textContent = (dailyBonusFail ? t('js.groups.daily_note_fail_prefix') : t('js.groups.daily_note_ok_prefix')) + dailyBonusMsg;
            document.querySelector('.grid.grid-3').insertAdjacentElement('afterend', note);
        }

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);

        const msg = document.getElementById('result-message');
        const state = Progress.load();
        if (accuracy >= PASS_THRESHOLD) {
            // Человек реально принял набор из state.kochLevel символов на ≥90% —
            // это и есть честно заработанный уровень (ачивки считаются по нему).
            // Бегунок «Перейти к уровню» сюда не попадает, поэтому протащить
            // его до конца и получить ачивку «все символы» больше нельзя.
            Progress.markKochLevelEarned(state.kochLevel);
        }
        if (accuracy >= PASS_THRESHOLD && state.kochLevel < KOCH_ORDER.length) {
            Progress.setKochLevel(state.kochLevel + 1);
            msg.textContent = t('js.koch.new_symbol_unlocked', { '{ch}': KOCH_ORDER[state.kochLevel] });
            msg.className = 'feedback show ok';
        } else if (accuracy >= PASS_THRESHOLD) {
            msg.textContent = t('js.koch.all_unlocked');
            msg.className = 'feedback show ok';
        } else {
            msg.textContent = t('js.koch.below_threshold', { '{pct}': Math.round(accuracy * 100) });
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

    // Обработка параметров из URL (для заданий дня)
    const initParams = new URLSearchParams(window.location.search);
    if (initParams.get('daily') === '1') {
        if (!DailyChallenge.isDoneToday()) {
            const req = DailyChallenge.forToday();
            if (req.type === 'koch') {
                const banner = document.createElement('div');
                banner.className = 'feedback show mt-2';
                banner.textContent = t('js.groups.daily_banner');
                document.getElementById('setup-panel').appendChild(banner);
            }
        }
    }
})();

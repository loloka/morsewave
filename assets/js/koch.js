(function () {
    let groupLen = parseInt(localStorage.getItem('morse_koch_len'), 10) || 5;
    if (![2, 3, 4, 5].includes(groupLen)) groupLen = 5;
    const PASS_THRESHOLD = 0.9;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        let charsetFactor = Math.min(1, Math.max(0.15, charsetSize / 15));
        
        // Когда появляются цифры (с 18-го уровня) и пунктуация,
        // плавно поднимаем множитель до 1.25 (как в groups.js для mixed).
        if (charsetSize >= 18) {
            charsetFactor = 1.0 + 0.25 * ((charsetSize - 18) / (40 - 18));
        }
        
        const lengthFactor = len / 3;
        return Math.max(1.0, 2 * charsetFactor * lengthFactor);
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
    const fwCpm = document.getElementById('koch-farnsworth-cpm');
    const fwPanel = document.getElementById('koch-farnsworth-panel');

    const bufferCheckbox = document.getElementById('koch-buffer-enabled');
    const bufferPanel = document.getElementById('koch-buffer-panel');
    let selectedBufferDepth = localStorage.getItem('morse_koch_buffer_depth') || 'all';

    const paperCheckbox = document.getElementById('koch-paper-enabled');
    const paperPanel = document.getElementById('koch-paper-panel');
    const paperGapSlider = document.getElementById('koch-paper-gap');
    const paperGapValue = document.getElementById('koch-paper-gap-value');

    const extraToggleBtn = document.getElementById('koch-extra-toggle-btn');
    const extraContent = document.getElementById('koch-extra-content');
    const extraChevron = document.getElementById('koch-extra-chevron');
    const extraActiveDot = document.getElementById('koch-extra-active-dot');

    function updateKochExtraDot() {
        const isFw = !!(fwEnabled && fwEnabled.checked);
        const isBuf = !!(bufferCheckbox && bufferCheckbox.checked);
        const isPaper = !!(paperCheckbox && paperCheckbox.checked);
        const readyEl = document.getElementById('koch-ready-signal-enabled');
        const audioSettings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : null;
        const isNoise = !!(audioSettings && audioSettings.noiseLevel > 0);
        const isReady = !!(readyEl && readyEl.checked);
        const isActive = isFw || isBuf || isPaper || isNoise || isReady;
        if (extraActiveDot) extraActiveDot.style.display = isActive ? 'inline-block' : 'none';
        return isActive;
    }

    function updateKochFarnsworthVisibility() {
        const on = fwEnabled && fwEnabled.checked;
        if (fwPanel) fwPanel.style.display = on ? 'block' : 'none';
        updateKochExtraDot();
    }

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
    let currentAudio = null;
    const replayBtn = document.getElementById('replay-btn');

    function currentCharset() {
        const state = Progress.load();
        return KOCH_ORDER.slice(0, state.kochLevel);
    }

    const kochCharsetFeedback = document.getElementById('koch-charset-feedback');

    const savedWpm = localStorage.getItem('morse_koch_wpm');
    if (savedWpm) {
        wpmSlider.value = savedWpm;
        wpmValue.textContent = savedWpm;
        wpmCpm.textContent = cpmHintText(savedWpm);
    }
    const savedFwEnabled = localStorage.getItem('morse_koch_fw_enabled');
    if (savedFwEnabled === 'true' && fwEnabled) {
        fwEnabled.checked = true;
    }
    updateKochFarnsworthVisibility();
    const savedFwWpm = localStorage.getItem('morse_koch_fw_wpm');
    if (savedFwWpm) {
        fwSlider.value = savedFwWpm;
        fwValue.textContent = savedFwWpm;
    }
    if (fwCpm && typeof cpmHintText === 'function') {
        fwCpm.textContent = cpmHintText(fwSlider.value);
    }

    const kochCountEl = document.getElementById('koch-count');
    const savedKochCount = localStorage.getItem('morse_koch_count');
    if (savedKochCount && kochCountEl) {
        kochCountEl.value = savedKochCount;
    }
    if (kochCountEl) {
        kochCountEl.addEventListener('change', () => {
            localStorage.setItem('morse_koch_count', kochCountEl.value);
        });
    }

    wpmSlider.addEventListener('input', () => { 
        wpmValue.textContent = wpmSlider.value; 
        wpmCpm.textContent = cpmHintText(wpmSlider.value); 
        localStorage.setItem('morse_koch_wpm', wpmSlider.value);
    });
    fwSlider.addEventListener('input', () => { 
        fwValue.textContent = fwSlider.value; 
        if (fwCpm && typeof cpmHintText === 'function') fwCpm.textContent = cpmHintText(fwSlider.value);
        localStorage.setItem('morse_koch_fw_wpm', fwSlider.value);
    });
    if (fwEnabled) {
        fwEnabled.addEventListener('change', () => {
            updateKochFarnsworthVisibility();
            localStorage.setItem('morse_koch_fw_enabled', fwEnabled.checked);
        });
    }

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
                    if (answerInput.disabled) return;
                    if (typeof answerInput.bufferMaxAllowed === 'number') {
                        const start = answerInput.selectionStart ?? answerInput.value.length;
                        const end = answerInput.selectionEnd ?? answerInput.value.length;
                        const selectedLen = end - start;
                        if (answerInput.value.length - selectedLen + ch.length > answerInput.bufferMaxAllowed) {
                            answerInput.classList.remove('pairs-shake');
                            void answerInput.offsetWidth;
                            answerInput.classList.add('pairs-shake');
                            return;
                        }
                    }
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
            if (answerInput.disabled) return;
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


    function updateKochBufferTip(depth) {
        const tipEl = document.getElementById('koch-buffer-tip-text');
        if (!tipEl) return;
        if (depth === 'all') {
            tipEl.textContent = '💡 ' + t('groups.buffer_tip_all');
        } else {
            tipEl.textContent = '💡 ' + t('groups.buffer_tip_lag', { '{n}': depth });
        }
    }

    function updateBufferPanelVisibility() {
        if (bufferPanel) {
            bufferPanel.style.display = (bufferCheckbox && bufferCheckbox.checked) ? 'block' : 'none';
        }
        updateKochExtraDot();
    }

    function updateKochPaperVisibility() {
        const on = paperCheckbox && paperCheckbox.checked;
        if (paperPanel) paperPanel.style.display = on ? 'block' : 'none';
        updateKochExtraDot();
    }

    if (bufferCheckbox) {
        const savedBufferEnabled = localStorage.getItem('morse_koch_buffer_enabled');
        if (savedBufferEnabled !== null) {
            bufferCheckbox.checked = (savedBufferEnabled === 'true');
        }
        updateBufferPanelVisibility();
        bufferCheckbox.addEventListener('change', () => {
            if (bufferCheckbox.checked && paperCheckbox) {
                paperCheckbox.checked = false;
                updateKochPaperVisibility();
                localStorage.setItem('morse_koch_paper_enabled', 'false');
            }
            localStorage.setItem('morse_koch_buffer_enabled', bufferCheckbox.checked);
            updateBufferPanelVisibility();
        });
    }

    if (paperCheckbox) {
        const savedPaper = localStorage.getItem('morse_koch_paper_enabled');
        if (savedPaper !== null) paperCheckbox.checked = (savedPaper === 'true');
        updateKochPaperVisibility();
        paperCheckbox.addEventListener('change', () => {
            if (paperCheckbox.checked && bufferCheckbox) {
                bufferCheckbox.checked = false;
                updateBufferPanelVisibility();
                localStorage.setItem('morse_koch_buffer_enabled', 'false');
            }
            localStorage.setItem('morse_koch_paper_enabled', paperCheckbox.checked);
            updateKochPaperVisibility();
        });
    }

    if (paperGapSlider) {
        const savedGap = localStorage.getItem('morse_koch_paper_gap');
        if (savedGap) {
            paperGapSlider.value = savedGap;
            if (paperGapValue) paperGapValue.textContent = parseFloat(savedGap).toFixed(1);
        }
        paperGapSlider.addEventListener('input', () => {
            if (paperGapValue) paperGapValue.textContent = parseFloat(paperGapSlider.value).toFixed(1);
        });
        paperGapSlider.addEventListener('change', () => {
            localStorage.setItem('morse_koch_paper_gap', paperGapSlider.value);
        });
    }

    if (extraToggleBtn && extraContent) {
        const savedExtraOpen = localStorage.getItem('morse_koch_extra_open') === 'true';
        if (savedExtraOpen) {
            extraContent.style.display = 'block';
            if (extraChevron) extraChevron.textContent = '▴';
            extraToggleBtn.classList.add('is-open');
        }
        extraToggleBtn.addEventListener('click', () => {
            const isOpen = extraContent.style.display !== 'none';
            extraContent.style.display = isOpen ? 'none' : 'block';
            if (extraChevron) extraChevron.textContent = isOpen ? '▾' : '▴';
            extraToggleBtn.classList.toggle('is-open', !isOpen);
            localStorage.setItem('morse_koch_extra_open', !isOpen);
        });
    }
    updateKochExtraDot();

    const readySignalEl = document.getElementById('koch-ready-signal-enabled');
    const kochToneFreq = document.getElementById('koch-tone-freq');
    const kochToneFreqVal = document.getElementById('koch-tone-freq-value');
    const kochCwNoiseChips = document.querySelectorAll('#koch-cw-noise-chips .chip');

    if (typeof AudioSettings !== 'undefined') {
        const audioSettings = AudioSettings.load();
        if (readySignalEl) {
            readySignalEl.checked = !!audioSettings.readySignal;
            readySignalEl.addEventListener('change', () => {
                const s = AudioSettings.load();
                s.readySignal = readySignalEl.checked;
                AudioSettings.save(s);
                localStorage.setItem('morsewave_ready_signal_user_set', '1');
                updateKochExtraDot();
            });
        }
        if (kochToneFreq && kochToneFreqVal) {
            kochToneFreq.value = audioSettings.freq || 600;
            kochToneFreqVal.textContent = audioSettings.freq || 600;
            kochToneFreq.addEventListener('input', () => {
                const s = AudioSettings.load();
                s.freq = parseInt(kochToneFreq.value, 10);
                kochToneFreqVal.textContent = s.freq;
                AudioSettings.save(s);
            });
        }
        if (kochCwNoiseChips.length) {
            const currentNoise = audioSettings.noiseLevel || 0;
            kochCwNoiseChips.forEach(c => c.classList.toggle('active', parseFloat(c.dataset.noise) === currentNoise));
            kochCwNoiseChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    kochCwNoiseChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const s = AudioSettings.load();
                    s.noiseLevel = parseFloat(chip.dataset.noise);
                    AudioSettings.save(s);
                    if (typeof getSharedAudioContext === 'function' && typeof getSharedMorseAudioBus === 'function') {
                        try {
                            const ctx = getSharedAudioContext();
                            if (ctx) getSharedMorseAudioBus(ctx).setNoiseLevel(s.noiseLevel);
                        } catch (e) {}
                    }
                    updateKochExtraDot();
                });
            });
        }
        updateKochExtraDot();
    }

    document.querySelectorAll('#koch-buffer-depth-chips .chip').forEach(chip => {
        if (chip.dataset.depth === selectedBufferDepth) {
            document.querySelectorAll('#koch-buffer-depth-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        }
        chip.addEventListener('click', () => {
            document.querySelectorAll('#koch-buffer-depth-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedBufferDepth = chip.dataset.depth;
            localStorage.setItem('morse_koch_buffer_depth', selectedBufferDepth);
            updateKochBufferTip(selectedBufferDepth);
        });
    });
    updateKochBufferTip(selectedBufferDepth);

    function updateKochBufferDepthOptions(len) {
        const chipsContainer = document.getElementById('koch-buffer-depth-chips');
        if (!chipsContainer) return;
        const chips = chipsContainer.querySelectorAll('.chip');
        chips.forEach(chip => {
            const depth = chip.dataset.depth;
            if (depth === 'all') {
                chip.style.display = '';
            } else {
                const num = parseInt(depth, 10);
                chip.style.display = (num < len) ? '' : 'none';
            }
        });
        if (selectedBufferDepth !== 'all' && parseInt(selectedBufferDepth, 10) >= len) {
            chips.forEach(c => c.classList.remove('active'));
            const allChip = chipsContainer.querySelector('[data-depth="all"]');
            if (allChip) allChip.classList.add('active');
            selectedBufferDepth = 'all';
            localStorage.setItem('morse_koch_buffer_depth', 'all');
            updateKochBufferTip('all');
        }
    }

    const lengthChips = document.querySelectorAll('#koch-length-chips .chip');
    if (lengthChips.length) {
        lengthChips.forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.len, 10) === groupLen);
            c.addEventListener('click', () => {
                lengthChips.forEach(chip => chip.classList.remove('active'));
                c.classList.add('active');
                groupLen = parseInt(c.dataset.len, 10) || 5;
                localStorage.setItem('morse_koch_len', groupLen);
                updateKochBufferDepthOptions(groupLen);
            });
        });
    }
    updateKochBufferDepthOptions(groupLen);

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

        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }

        const isBuffer = !!session?.isBufferMode;
        const bufferDepth = session?.bufferDepth || 'all';
        const targetDepth = parseInt(bufferDepth, 10);

        const updateBufferAllowed = (maxAllowed) => {
            if (!answerInput) return;
            if (maxAllowed === 0) {
                answerInput.disabled = true;
                if (bufferDepth === 'all') {
                    answerInput.placeholder = t('groups.buffer_listening_all');
                } else {
                    answerInput.placeholder = t('groups.buffer_listening_lag', { '{n}': targetDepth });
                }
                answerInput.bufferMaxAllowed = 0;
                answerInput.maxLength = 0;
                if (vkbEl) { vkbEl.style.opacity = '0.5'; vkbEl.style.pointerEvents = 'none'; }
            } else {
                answerInput.disabled = false;
                answerInput.placeholder = t('koch.answer_placeholder');
                answerInput.bufferMaxAllowed = maxAllowed;
                answerInput.maxLength = maxAllowed;
                if (vkbEl) { vkbEl.style.opacity = '1'; vkbEl.style.pointerEvents = 'auto'; }
                if (document.activeElement !== answerInput) {
                    answerInput.focus();
                }
            }
        };

        if (isBuffer) {
            updateBufferAllowed(0);
        } else {
            if (answerInput) {
                answerInput.disabled = false;
                answerInput.placeholder = t('koch.answer_placeholder');
                answerInput.bufferMaxAllowed = null;
                answerInput.removeAttribute('maxlength');
                if (vkbEl) { vkbEl.style.opacity = '1'; vkbEl.style.pointerEvents = 'auto'; }
                answerInput.focus();
            }
        }

        try {
            currentAudio = new MorseAudio({
                wpm: session.wpm,
                farnsworthWpm: session.farnsworth || null,
            });
            await currentAudio.play(session.groups[session.index], {
                onCharStart: ({ index }) => {
                    if (isBuffer && answerInput) {
                        if (!isNaN(targetDepth)) {
                            const maxAllowed = Math.max(0, index + 1 - targetDepth);
                            updateBufferAllowed(maxAllowed);
                        }
                    }
                },
                onSymbol: ({ symbol, durationMs }) => {
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения группы:', e);
        } finally {
            currentAudio = null;
            isPlaying = false;
            replayBtn.disabled = false;
            if (isBuffer && answerInput) {
                answerInput.disabled = false;
                answerInput.placeholder = t('koch.answer_placeholder');
                answerInput.bufferMaxAllowed = null;
                answerInput.removeAttribute('maxlength');
                if (vkbEl) { vkbEl.style.opacity = '1'; vkbEl.style.pointerEvents = 'auto'; }
                answerInput.focus();
            } else if (answerInput) {
                answerInput.focus();
            }
        }
    }

    function abortCurrentSession() {
        if (session) {
            session.finished = true;
            session.paperStopped = true;
        }
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        if (typeof getSharedAudioContext === 'function' && typeof getSharedMorseAudioBus === 'function') {
            try {
                const ctx = getSharedAudioContext();
                if (ctx) getSharedMorseAudioBus(ctx).stopNoise();
            } catch (e) {}
        }
        cancelPaperSleep();
        document.body.classList.remove('morse-session-active');
        if (session && session.dbXpEarned > 0) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            Progress.logXp(session.dbXpEarned, 'koch', {
                wpm: session.wpm,
                fw: session.farnsworth,
                dur,
                err: session.totalChars - session.correctChars,
                acc: session.totalChars > 0 ? Math.round((session.correctChars / session.totalChars) * 100) : 0,
                history: session.history || []
            });
            session.dbXpEarned = 0;
        }
    }

    window.addEventListener('beforeunload', abortCurrentSession);
    window.addEventListener('pagehide', abortCurrentSession);

    const EXAM_ATTENTION_TEXT = 'ЖЖЖ=';
    const EXAM_ATTENTION_COUNTDOWN = { 0: '3', 1: '2', 2: '1' };

    async function runReadyAttentionSequence() {
        const mySession = session;
        const msg3 = (typeof t === 'function' && t('groups.ready_countdown_ready', { '{n}': '3' })) || 'Приготовьтесь: 3…';
        feedbackEl.textContent = msg3;
        feedbackEl.className = 'feedback show ok';
        if (answerInput) answerInput.disabled = true;

        const currentWpm = Math.max(12, session.wpm || 15);
        const audio = new MorseAudio({ wpm: currentWpm });
        currentAudio = audio;

        try {
            await audio.play(EXAM_ATTENTION_TEXT, {
                onCharStart: ({ index }) => {
                    if (session !== mySession || mySession.finished || mySession.paperStopped) {
                        audio.stop();
                        return;
                    }
                    const n = EXAM_ATTENTION_COUNTDOWN[index];
                    feedbackEl.textContent = n !== undefined
                        ? ((typeof t === 'function' && t('groups.ready_countdown_ready', { '{n}': n })) || `Приготовьтесь: ${n}…`)
                        : ((typeof t === 'function' && t('groups.ready_countdown_go')) || 'Приём!');
                    feedbackEl.className = 'feedback show ok';
                },
                onSymbol: ({ symbol, durationMs }) => {
                    if (session !== mySession || mySession.finished || mySession.paperStopped) {
                        audio.stop();
                        return;
                    }
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка сигнала готовности:', e);
        } finally {
            if (currentAudio === audio) currentAudio = null;
        }

        if (session !== mySession || mySession.finished || mySession.paperStopped) return;
        feedbackEl.textContent = (typeof t === 'function' && t('groups.ready_countdown_go')) || 'Приём!';
        feedbackEl.className = 'feedback show ok';
        if (answerInput) {
            answerInput.disabled = false;
        }

        await delay(1400);
        if (session !== mySession || mySession.finished || mySession.paperStopped) return;
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';
    }

    let paperSleepResolve = null;
    let paperSleepTimeout = null;
    function cancelPaperSleep() {
        if (paperSleepTimeout) { clearTimeout(paperSleepTimeout); paperSleepTimeout = null; }
        if (paperSleepResolve) { paperSleepResolve(); paperSleepResolve = null; }
    }

    async function runPaperPlayback() {
        const total = session.groups.length;
        const paperSubMsg = document.getElementById('koch-paper-sub-msg');
        const paperStatusMsg = document.getElementById('koch-paper-status-msg');
        const paperProgressWrap = document.getElementById('koch-paper-progress-wrap');
        const paperProgressBar = document.getElementById('koch-paper-progress-bar');

        for (let i = 0; i < total; i++) {
            if (session.paperStopped || session.finished) break;
            session.index = i;
            renderGroupIndex();
            if (paperStatusMsg) paperStatusMsg.textContent = '🎧 ' + t('groups.paper_listening');
            if (paperSubMsg) {
                paperSubMsg.textContent = t('js.groups.paper_status_playing', {
                    '{current}': i + 1,
                    '{total}': total
                });
            }
            if (paperProgressWrap) paperProgressWrap.style.display = 'none';
            signalLine.clear();

            try {
                if (currentAudio) {
                    currentAudio.stop();
                    currentAudio = null;
                }
                currentAudio = new MorseAudio({
                    wpm: session.wpm,
                    farnsworthWpm: session.farnsworth || null
                });
                await currentAudio.play(session.groups[i], {
                    onSymbol: ({ symbol, durationMs }) => {
                        signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                        lamp.flash(durationMs);
                    }
                });
            } catch (err) {
                console.error('Ошибка в режиме бумаги:', err);
            } finally {
                currentAudio = null;
            }

            if (session.paperStopped || session.finished) break;
            session.playedCount = i + 1;

            if (i < total - 1) {
                const gapMs = Math.round(session.paperGap * 1000);
                if (paperProgressWrap) paperProgressWrap.style.display = 'block';
                if (paperProgressBar) paperProgressBar.style.width = '100%';

                const startTime = Date.now();
                await new Promise(resolve => {
                    paperSleepResolve = resolve;
                    const updateCountdown = () => {
                        if (session.paperStopped || session.finished) {
                            cleanup();
                            resolve();
                            return;
                        }
                        const elapsed = Date.now() - startTime;
                        const remaining = Math.max(0, gapMs - elapsed);
                        const secText = (remaining / 1000).toFixed(1);
                        if (paperStatusMsg) {
                            paperStatusMsg.textContent = '⏸ ' + t('groups.paper_pause', { '{sec}': secText });
                        }
                        if (paperProgressBar) {
                            const pct = Math.max(0, (remaining / gapMs) * 100);
                            paperProgressBar.style.width = pct + '%';
                        }
                        if (remaining <= 0) {
                            cleanup();
                            resolve();
                        } else {
                            paperSleepTimeout = setTimeout(updateCountdown, 50);
                        }
                    };
                    const cleanup = () => {
                        if (paperSleepTimeout) { clearTimeout(paperSleepTimeout); paperSleepTimeout = null; }
                        paperSleepResolve = null;
                    };
                    updateCountdown();
                });

                if (session.paperStopped || session.finished) break;
            }
        }

        if (session.paperStopped) {
            if (session.playedCount > 0) {
                finishPaperSession();
            } else {
                abortCurrentSession();
                sessionPanel.style.display = 'none';
                setupPanel.style.display = 'block';
            }
        } else {
            finishPaperSession();
        }
    }

    function finishPaperSession() {
        if (!session || session.finished) return;
        session.finished = true;
        cancelPaperSleep();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        signalLine.clear();
        lamp.off();

        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const playedGroups = session.groups.slice(0, session.playedCount);
        const lines = [];
        for (let i = 0; i < playedGroups.length; i += 5) {
            lines.push(playedGroups.slice(i, i + 5).join('   '));
        }
        const radiogramText = lines.join('\n');

        const radiogramEl = document.getElementById('koch-paper-radiogram-text');
        if (radiogramEl) radiogramEl.textContent = radiogramText;

        const paperResBlock = document.getElementById('koch-paper-result-block');
        if (paperResBlock) paperResBlock.style.display = 'block';

        const standardGrid = document.querySelector('#result-panel .grid-3');
        if (standardGrid) standardGrid.style.display = 'none';
        const mistakesBlock = document.getElementById('mistakes-block');
        if (mistakesBlock) mistakesBlock.style.display = 'none';
        const pairPromptBlock = document.getElementById('pair-prompt-block');
        if (pairPromptBlock) pairPromptBlock.style.display = 'none';

        const resultMsg = document.getElementById('result-message');
        if (resultMsg) {
            resultMsg.textContent = t('groups.paper_result_hint');
            resultMsg.className = 'feedback show ok mt-2';
        }

        const xpEarned = session.playedCount * 3;
        Progress.addXp(xpEarned, 'koch', {
            wpm: session.wpm,
            paper: true,
            groups: session.playedCount
        });
        const resultXp = document.getElementById('result-xp');
        if (resultXp) resultXp.textContent = `+${xpEarned}`;

        document.body.classList.remove('morse-session-active');
    }

    async function startSession() {
        abortCurrentSession();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        
        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled.checked ? parseInt(fwSlider.value, 10) : 0;
        const count = parseInt(document.getElementById('koch-count').value, 10);
        const charset = currentCharset();
        const isPaperMode = paperCheckbox && paperCheckbox.checked;
        const isBufferMode = !isPaperMode && bufferCheckbox && bufferCheckbox.checked;

        session = {
            groupLen,
            groups: Array.from({ length: count }, () => weightedRandomGroup(charset, groupLen)),
            index: 0,
            wpm, farnsworth, count,
            isBufferMode,
            bufferDepth: selectedBufferDepth,
            isPaperMode,
            paperGap: paperGapSlider ? parseFloat(paperGapSlider.value) || 3.0 : 3.0,
            paperStopped: false,
            playedCount: 0,
            correctChars: 0,
            totalChars: 0,
            xpEarned: 0,
            dbXpEarned: 0,
            xpRate: xpRateForSession(charset.length, groupLen),
            wrongPairs: [],
            startTime: Date.now(),
            history: []
        };

        document.body.classList.add('morse-session-active');
        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';

        const settings = typeof AudioSettings !== 'undefined' ? AudioSettings.load() : { readySignal: false };
        const needReadySignal = readySignalEl ? readySignalEl.checked : (settings.readySignal === true);

        if (needReadySignal) {
            await runReadyAttentionSequence();
            if (!session || session.finished) return;
        }

        if (isPaperMode) {
            const paperDisplay = document.getElementById('koch-paper-session-display');
            if (paperDisplay) paperDisplay.style.display = 'block';
            const paperControls = document.getElementById('koch-paper-controls-row');
            if (paperControls) paperControls.style.display = 'flex';
            const submitRow = document.getElementById('koch-submit-row');
            if (submitRow) submitRow.style.display = 'none';
            if (answerInput) answerInput.style.display = 'none';
            if (vkbEl) vkbEl.style.display = 'none';
            if (replayBtn) replayBtn.style.display = 'none';
            runPaperPlayback();
        } else {
            const paperDisplay = document.getElementById('koch-paper-session-display');
            if (paperDisplay) paperDisplay.style.display = 'none';
            const paperControls = document.getElementById('koch-paper-controls-row');
            if (paperControls) paperControls.style.display = 'none';
            const submitRow = document.getElementById('koch-submit-row');
            if (submitRow) submitRow.style.display = 'flex';
            if (answerInput) answerInput.style.display = 'block';
            if (isTouch && vkbEl) vkbEl.style.display = 'flex';
            if (replayBtn) replayBtn.style.display = 'inline-flex';

            groupTotalEl.textContent = count;
            feedbackEl.className = 'feedback';
            renderGroupIndex();
            answerInput.value = '';
            answerInput.focus();
            playCurrentGroup();
        }
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
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        const expected = session.groups[session.index];
        const typed = answerInput.value.trim();
        const correct = scoreAnswer(expected, typed);

        if (!session.wrongPairs) session.wrongPairs = [];
        const typedUpper = typed.toUpperCase();
        for (let i = 0; i < expected.length; i++) {
            const e = expected[i] || '';
            const tChar = typedUpper[i] || '';
            if (e !== tChar && e) {
                session.wrongPairs.push({ expected: e, typed: tChar });
                if (tChar && typeof Progress.recordPairConfusion === 'function') {
                    Progress.recordPairConfusion(e, tChar);
                }
            }
        }

        session.correctChars += correct;
        session.totalChars += expected.length;

        // Питает weightedRandomGroup — см. комментарий там.
        {
            for (let i = 0; i < expected.length; i++) {
                const e = expected[i];
                const t = typedUpper[i];
                const isCorrect = (e === t);
                Progress.recordKochAttempt(e, isCorrect);
                if (!isCorrect && t && window.MORSE_CODE && window.MORSE_CODE[t]) {
                    Progress.recordKochAttempt(t, false);
                }
            }
        }

        // Начисляем сразу за эту группу — если сессия не будет
        // пройдена до конца, заработанное всё равно не потеряется.
        const xpGain = Math.round(correct * session.xpRate);
        let bonusGain = 0;
        if (session.isRetrain && !session.isAbuse && correct === expected.length) {
            bonusGain = 5;
        }
        
        session.xpEarned += (xpGain + bonusGain);
        if ((xpGain + bonusGain) > 0) {
            session.dbXpEarned += (xpGain + bonusGain);
            Progress.addXp(xpGain + bonusGain);
        }
        
        session.history.push({
            e: expected,
            t: typedUpper,
            xp: xpGain + bonusGain
        });
        
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
        answerInput.bufferMaxAllowed = null;
        answerInput.removeAttribute('maxlength');
        if (session.index >= session.groups.length) {
            setTimeout(finishSession, 600);
        } else {
            renderGroupIndex();
            answerInput.focus();
            setTimeout(playCurrentGroup, 800);
        }
    }

    async function finishSession() {
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const isFullyCompleted = session.index >= session.count;
        const accuracy = session.totalChars ? session.correctChars / session.totalChars : 0;
        let xpEarned = session.xpEarned;
        let baseXP = Math.round(xpEarned);
        let passBonus = 0;
        if (accuracy >= PASS_THRESHOLD && isFullyCompleted) {
            passBonus = Math.min(50, Math.max(0, Math.round(session.count) || 0));
            xpEarned += passBonus;
            session.dbXpEarned += passBonus;
            Progress.addXp(passBonus);
        }

        abortCurrentSession();

        let dailyBonusMsg = '';
        let dailyBonusFail = false;
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('daily') === '1') {
            const req = DailyChallenge.forToday();
            if (req.type === 'koch') {
                if (!isFullyCompleted) {
                    dailyBonusFail = true;
                    dailyBonusMsg = t('js.groups.daily_mismatch', {
                        '{count}': req.count || 10,
                        '{len}': 5,
                        '{wpm}': req.wpm || 12
                    });
                } else if (accuracy < 0.6) {
                    dailyBonusFail = true;
                    dailyBonusMsg = t('js.groups.daily_low_accuracy', {
                        '{min}': 60,
                        '{acc}': Math.round(accuracy * 100)
                    });
                } else {
                    if (DailyChallenge.isDoneToday()) {
                        dailyBonusMsg = t('js.groups.daily_already');
                    } else {
                        if (Progress.completeDailyChallenge()) {
                            xpEarned += 50;
                            dailyBonusMsg = t('js.groups.daily_bonus');
                        }
                    }
                }
            }
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        const grid = document.querySelector('#result-panel .grid.grid-3');
        let oldBr = document.getElementById('koch-xp-breakdown');
        if (oldBr) oldBr.remove();
        let brBox = document.createElement('div');
        brBox.id = 'koch-xp-breakdown';
        brBox.className = 'mt-2 muted mono text-center';
        brBox.style.fontSize = '14px';
        let parts = [`${baseXP} (база)`];
        if (passBonus > 0) parts.push(`${passBonus} (бонус)`);
        if (xpEarned > baseXP + passBonus) parts.push(`50 (задание дня)`);
        brBox.innerHTML = parts.join(' + ') + ` = <b>${Math.round(xpEarned)} XP</b>`;
        grid.insertAdjacentElement('afterend', brBox);

        // Clean up previous result note if any
        document.querySelectorAll('#result-panel .js-result-note').forEach(n => n.remove());

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.id = 'koch-daily-note';
            note.className = (dailyBonusFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2') + ' js-result-note';
            note.textContent = (dailyBonusFail ? t('js.groups.daily_note_fail_prefix') : t('js.groups.daily_note_ok_prefix')) + dailyBonusMsg;
            document.querySelector('.grid.grid-3').insertAdjacentElement('afterend', note);
        }

        if (isFullyCompleted) {
            Progress.incrementStat('sessionsCompleted', 1);
            postStat('total_sessions', 1);
        }
        Progress.markDailyActivity();
        flushStats();

        if (typeof Progress.addTrainingTime === 'function' && session.startTime) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            Progress.addTrainingTime(dur);
            const todaySecs = Progress.getTodayTrainingSeconds();
            const todayMins = Math.floor(todaySecs / 60);
            const goalMins = typeof Progress.getDailyGoalMinutes === 'function' ? Progress.getDailyGoalMinutes() : 30;
            const dailyBlock = document.getElementById('koch-daily-time-block');
            const dailyText = document.getElementById('koch-daily-time-text');
            if (dailyBlock && dailyText) {
                dailyBlock.style.display = 'block';
                if (todayMins >= goalMins) {
                    dailyText.textContent = t('groups.daily_time_done', { '{done}': todayMins, '{goal}': goalMins });
                } else {
                    const leftMins = Math.max(1, goalMins - todayMins);
                    dailyText.textContent = t('groups.daily_time_progress', { '{done}': todayMins, '{goal}': goalMins, '{left}': leftMins });
                }
            }
        }

        const msg = document.getElementById('result-message');
        const state = Progress.load();
        if (accuracy >= PASS_THRESHOLD && isFullyCompleted) {
            // Человек реально принял набор из state.kochLevel символов на ≥90% —
            // это и есть честно заработанный уровень (ачивки считаются по нему).
            // Бегунок «Перейти к уровню» сюда не попадает, поэтому протащить
            // его до конца и получить ачивку «все символы» больше нельзя.
            Progress.markKochLevelEarned(state.kochLevel);
            if (state.kochLevel < KOCH_ORDER.length) {
                Progress.setKochLevel(state.kochLevel + 1);
                msg.textContent = t('js.koch.new_symbol_unlocked', { '{ch}': KOCH_ORDER[state.kochLevel] });
                msg.className = 'feedback show ok mt-2';
            } else {
                msg.textContent = t('js.koch.all_unlocked');
                msg.className = 'feedback show ok mt-2';
            }
        } else if (!isFullyCompleted) {
            msg.textContent = t('js.koch.stopped_early', { '{played}': session.index, '{total}': session.count });
            msg.className = 'feedback show ok mt-2';
        } else {
            if (state.kochLevel === KOCH_ORDER.length) {
                msg.textContent = t('js.koch.below_threshold_max', { '{pct}': Math.round(accuracy * 100) });
            } else {
                msg.textContent = t('js.koch.below_threshold', { '{pct}': Math.round(accuracy * 100) });
            }
            msg.className = 'feedback show bad mt-2';
        }
        const mistakesBlock = document.getElementById('mistakes-block');
        const hasMistakes = session.wrongPairs && session.wrongPairs.length > 0;
        
        if (hasMistakes) {
            const uniquePairs = new Set(session.wrongPairs.map(p => p.expected + '_' + p.typed));
            document.getElementById('mistake-count').textContent = uniquePairs.size;
            mistakesBlock.style.display = 'block';
        } else {
            mistakesBlock.style.display = 'none';
        }

        const pairPromptBlock = document.getElementById('pair-prompt-block');
        if (pairPromptBlock) {
            let promptCount = parseInt(localStorage.getItem('morse_pair_prompt_count') || '0', 10) + 1;
            localStorage.setItem('morse_pair_prompt_count', promptCount);
            const recPair = typeof Progress.getMostConfusedPair === 'function' ? Progress.getMostConfusedPair(10) : null;
            if (recPair && promptCount >= 3) {
                const textEl = document.getElementById('pair-prompt-text');
                const btnEl = document.getElementById('pair-prompt-btn');
                const formattedMistakes = (typeof Progress.formatMistakes === 'function')
                    ? Progress.formatMistakes(recPair.count)
                    : `${recPair.count} ${recPair.count === 1 ? 'ошибка' : 'ошибок'}`;
                if (textEl) {
                    textEl.textContent = t('groups.pair_prompt_msg', {
                        '{A}': recPair.a,
                        '{B}': recPair.b,
                        '{count}': formattedMistakes,
                        '{mistakes}': formattedMistakes
                    });
                }
                if (btnEl) {
                    btnEl.textContent = t('groups.pair_prompt_btn', {
                        '{A}': recPair.a,
                        '{B}': recPair.b
                    });
                    btnEl.onclick = () => {
                        window.location.href = `groups.php?mode=pairs&pair=${recPair.pair}${recPair.pair === 'custom' ? `&a=${recPair.a}&b=${recPair.b}` : ''}`;
                    };
                }
                pairPromptBlock.style.display = 'block';
                localStorage.setItem('morse_pair_prompt_count', '0');
            } else {
                pairPromptBlock.style.display = 'none';
            }
        }
        
        renderHeader();
    }

    let pendingStats = {};
    let postStatTimer = null;

    function flushStats() {
        if (postStatTimer) {
            clearTimeout(postStatTimer);
            postStatTimer = null;
        }
        const statsToSend = { ...pendingStats };
        pendingStats = {};
        const keys = Object.keys(statsToSend);
        if (!keys.length) return;

        try {
            fetch('api/stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stats: statsToSend }),
                keepalive: true,
            }).catch(() => {});
        } catch { /* тихо игнорируем, если сервер недоступен */ }
    }

    function postStat(field, amount = 1) {
        if (!amount || amount <= 0) return;
        pendingStats[field] = (pendingStats[field] || 0) + amount;
        if (!postStatTimer) {
            postStatTimer = setTimeout(flushStats, 10000);
        }
    }

    window.addEventListener('beforeunload', flushStats);
    window.addEventListener('pagehide', flushStats);

    function retrainMistakes() {
        if (!session || !session.wrongPairs || !session.wrongPairs.length) return;
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        
        const uniquePairs = [];
        const seenPairs = new Set();
        for (const p of session.wrongPairs) {
            const sig = p.expected + '_' + p.typed;
            if (!seenPairs.has(sig)) {
                seenPairs.add(sig);
                uniquePairs.push(p);
            }
        }
        
        const pairsToTrain = uniquePairs.slice(0, 20);
        const charset = currentCharset();
        const newGroups = [];
        const retryGroupLen = (session && session.groupLen) ? session.groupLen : groupLen;
        
        for (const p of pairsToTrain) {
            const charsToInsert = [p.expected];
            if (p.typed && window.MORSE_CODE && window.MORSE_CODE[p.typed] && p.typed !== p.expected) {
                charsToInsert.push(p.typed);
            }
            
            const g = [];
            const targetLen = Math.max(retryGroupLen, charsToInsert.length);
            const randomCount = targetLen - charsToInsert.length;
            
            for (let i = 0; i < randomCount; i++) {
                g.push(charset[Math.floor(Math.random() * charset.length)]);
            }
            
            for (const ch of charsToInsert) {
                const insertPos = Math.floor(Math.random() * (g.length + 1));
                g.splice(insertPos, 0, ch);
            }
            newGroups.push(g.join(''));
        }

        const isAbuse = session.totalChars > 0 ? (session.correctChars / session.totalChars) < 0.6 : false;
        const retryXpRate = isAbuse ? 1 : 3;

        const retrySession = {
            groupLen: retryGroupLen,
            groups: newGroups,
            count: session.count, // for bonus computation
            index: 0, wpm: session.wpm,
            farnsworth: session.farnsworth || (fwEnabled && fwEnabled.checked ? parseInt(fwSlider.value, 10) : 0),
            isBufferMode: session.isBufferMode !== undefined ? session.isBufferMode : (bufferCheckbox ? bufferCheckbox.checked : false),
            bufferDepth: session.bufferDepth || selectedBufferDepth,
            correctChars: 0, totalChars: 0, xpEarned: 0, dbXpEarned: 0,
            xpRate: retryXpRate,
            isRetrain: true, isAbuse: isAbuse,
            wrongPairs: [],
            startTime: Date.now(), history: []
        };
        session = retrySession;

        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        const standardGrid = document.querySelector('#result-panel .grid-3');
        if (standardGrid) standardGrid.style.display = '';
        const paperResBlock = document.getElementById('koch-paper-result-block');
        if (paperResBlock) paperResBlock.style.display = 'none';
        document.body.classList.add('morse-session-active');
        answerInput.style.display = 'block';
        answerInput.value = '';
        replayBtn.style.display = 'inline-flex';
        groupTotalEl.textContent = session.groups.length;
        
        renderGroupIndex();
        if (typeof renderVkb !== 'undefined') renderVkb();
        answerInput.focus();
        playCurrentGroup();
    }

    function stopKochSession() {
        if (session) {
            session.finished = true;
            session.paperStopped = true;
        }
        if (session && session.isPaperMode) {
            session.paperStopped = true;
            cancelPaperSleep();
            if (currentAudio) { currentAudio.stop(); currentAudio = null; }
            if (session.playedCount > 0) {
                finishPaperSession();
            } else {
                abortCurrentSession();
                sessionPanel.style.display = 'none';
                setupPanel.style.display = 'block';
            }
            return;
        }
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        if (answerInput) {
            answerInput.bufferMaxAllowed = null;
            answerInput.removeAttribute('maxlength');
        }
        if (!session) {
            sessionPanel.style.display = 'none';
            setupPanel.style.display = 'block';
            return;
        }
        if (session.totalChars > 0) {
            finishSession();
        } else {
            abortCurrentSession();
            sessionPanel.style.display = 'none';
            setupPanel.style.display = 'block';
        }
    }

    const kochStopBtn = document.getElementById('koch-stop-btn');
    if (kochStopBtn) kochStopBtn.addEventListener('click', stopKochSession);

    const kochPaperStopBtn = document.getElementById('koch-paper-stop-btn');
    if (kochPaperStopBtn) kochPaperStopBtn.addEventListener('click', stopKochSession);

    const kochPaperCopyBtn = document.getElementById('koch-paper-copy-btn');
    if (kochPaperCopyBtn) {
        kochPaperCopyBtn.addEventListener('click', () => {
            const textEl = document.getElementById('koch-paper-radiogram-text');
            if (!textEl) return;
            navigator.clipboard.writeText(textEl.textContent).then(() => {
                const orig = kochPaperCopyBtn.innerHTML;
                kochPaperCopyBtn.innerHTML = '✓ ' + (typeof t === 'function' ? t('common.copied') : 'Скопировано');
                setTimeout(() => { kochPaperCopyBtn.innerHTML = orig; }, 2000);
            });
        });
    }

    document.getElementById('retrain-mistakes-btn').addEventListener('click', retrainMistakes);

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    replayBtn.addEventListener('click', playCurrentGroup);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
        const standardGrid = document.querySelector('#result-panel .grid-3');
        if (standardGrid) standardGrid.style.display = '';
        const paperResBlock = document.getElementById('koch-paper-result-block');
        if (paperResBlock) paperResBlock.style.display = 'none';
        document.body.classList.remove('morse-session-active');
    });
    answerInput.addEventListener('keydown', (e) => {
        if (typeof answerInput.bufferMaxAllowed === 'number' && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const start = answerInput.selectionStart ?? answerInput.value.length;
            const end = answerInput.selectionEnd ?? answerInput.value.length;
            const selectedLen = end - start;
            if (answerInput.value.length - selectedLen + 1 > answerInput.bufferMaxAllowed) {
                e.preventDefault();
                answerInput.classList.remove('pairs-shake');
                void answerInput.offsetWidth;
                answerInput.classList.add('pairs-shake');
                return;
            }
        }
        if (e.key === 'Enter') submitAnswer();
    });
    answerInput.addEventListener('input', () => {
        if (typeof answerInput.bufferMaxAllowed === 'number') {
            if (answerInput.value.length > answerInput.bufferMaxAllowed) {
                answerInput.value = answerInput.value.slice(0, answerInput.bufferMaxAllowed);
                answerInput.classList.remove('pairs-shake');
                void answerInput.offsetWidth;
                answerInput.classList.add('pairs-shake');
            }
        }
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

    // Запуск и перезапуск сессии клавишей Enter с экрана настроек/результатов,
    // а также завершение активной сессии по Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sessionPanel && sessionPanel.style.display !== 'none') {
                e.preventDefault();
                stopKochSession();
                return;
            }
        }

        if (e.key !== 'Enter') return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (setupPanel && setupPanel.style.display !== 'none') {
            const startBtn = document.getElementById('start-session');
            if (startBtn && startBtn.offsetParent !== null) {
                e.preventDefault();
                startBtn.click();
                return;
            }
        } else if (resultPanel && resultPanel.style.display !== 'none') {
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn && restartBtn.offsetParent !== null) {
                e.preventDefault();
                restartBtn.click();
                return;
            }
        }
    });
})();

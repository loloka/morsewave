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
            if (mode !== 'groups') {
                qrqStopRequested = true;
                if (qrqAudio) { qrqAudio.stop(); qrqAudio = null; }
            }
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
    const wpmCpm = document.getElementById('groups-wpm-cpm');
    const wpmControl = document.getElementById('groups-wpm-control');
    const examSpeedNote = document.getElementById('groups-exam-speed-note');
    const fwEnabled = document.getElementById('groups-farnsworth-enabled');
    const fwWrap = document.getElementById('groups-farnsworth-wrap');
    const fwSlider = document.getElementById('groups-farnsworth');
    const fwValue = document.getElementById('groups-farnsworth-value');

    let groupLen = 3;
    let charsetKey = 'letters';
    let session = null;
    let isDailyChallenge = false;
    let dailyRequired = null;

    function updateDailyBanner() {
        if (!isDailyChallenge || !dailyRequired) return;
        const banner = document.getElementById('groups-daily-banner');
        if (!banner) return;
        
        const countInput = document.getElementById('groups-count');
        const count = countInput ? parseInt(countInput.value, 10) : 0;
        const wpm = parseInt(wpmSlider.value, 10);
        
        const matchesRequirement = count === dailyRequired.count
            && groupLen === dailyRequired.len
            && wpm === dailyRequired.wpm;
            
        if (matchesRequirement) {
            banner.className = 'feedback show ok mt-2';
            banner.textContent = t('js.groups.daily_banner');
        } else {
            banner.className = 'feedback show bad mt-2';
            banner.textContent = t('js.groups.daily_mismatch', {
                '{count}': dailyRequired.count,
                '{len}': dailyRequired.len,
                '{wpm}': dailyRequired.wpm,
            });
        }
    }

    let currentSubmode = 'training'; // 'training' | 'pairs' | 'qrq' | 'exam'
    let pendingExamMode = false;
    let selectedPairKey = 'SH';
    let selectedPairStage = 1;
    let qrqStopRequested = false;
    let qrqSessionActive = false;
    let qrqAudio = null;
    let currentAudio = null;

    const bufferCheckbox = document.getElementById('groups-buffer-enabled');
    const bufferInfo = document.getElementById('groups-buffer-info');
    const bufferTooltip = document.getElementById('groups-buffer-tooltip');
    const bufferPanel = document.getElementById('groups-buffer-panel');
    let selectedBufferDepth = localStorage.getItem('morse_groups_buffer_depth') || 'all';

    function updateBufferPanelVisibility() {
        if (bufferPanel) {
            bufferPanel.style.display = (bufferCheckbox && bufferCheckbox.checked) ? 'block' : 'none';
        }
    }

    if (bufferCheckbox) {
        const savedBufferEnabled = localStorage.getItem('morse_groups_buffer_enabled');
        if (savedBufferEnabled !== null) {
            bufferCheckbox.checked = (savedBufferEnabled === 'true');
        }
        updateBufferPanelVisibility();
        bufferCheckbox.addEventListener('change', () => {
            localStorage.setItem('morse_groups_buffer_enabled', bufferCheckbox.checked);
            updateBufferPanelVisibility();
        });
    }

    function updateBufferDepthOptions(len) {
        const maxNumericDepth = Math.max(1, len - 1);
        document.querySelectorAll('#buffer-depth-chips .chip').forEach(chip => {
            const d = chip.dataset.depth;
            if (d === 'all') {
                chip.style.display = 'inline-flex';
            } else {
                const num = parseInt(d, 10);
                chip.style.display = (num <= maxNumericDepth) ? 'inline-flex' : 'none';
            }
        });

        if (selectedBufferDepth !== 'all') {
            const currentNum = parseInt(selectedBufferDepth, 10);
            if (isNaN(currentNum) || currentNum > maxNumericDepth) {
                selectedBufferDepth = 'all';
                localStorage.setItem('morse_groups_buffer_depth', 'all');
            }
        }
        document.querySelectorAll('#buffer-depth-chips .chip').forEach(c => {
            c.classList.toggle('active', c.dataset.depth === selectedBufferDepth);
        });
    }

    document.querySelectorAll('#buffer-depth-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#buffer-depth-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedBufferDepth = chip.dataset.depth;
            localStorage.setItem('morse_groups_buffer_depth', selectedBufferDepth);
        });
    });

    updateBufferDepthOptions(groupLen);

    if (bufferInfo && bufferTooltip) {
        bufferInfo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            bufferTooltip.style.display = bufferTooltip.style.display === 'none' ? 'block' : 'none';
        });
        bufferTooltip.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.addEventListener('click', () => { bufferTooltip.style.display = 'none'; });
    }
    
    const vkbEl = document.getElementById('groups-vkb');
    let vkb = null;
    function renderVkb(inputEl, isExam) {
        if (typeof VirtualKeyboard !== 'undefined' && vkbEl) {
            vkb = new VirtualKeyboard(vkbEl, inputEl, { showSpace: isExam });
        }
    }
    let isPlaying = false;
    const replayBtn = document.getElementById('replay-btn');

    // Восстанавливаем сохраненные настройки
    const savedGroupLen = localStorage.getItem('morse_groups_len');
    if (savedGroupLen) {
        document.querySelectorAll('#length-chips .chip').forEach(c => {
            const match = c.dataset.len === savedGroupLen;
            c.classList.toggle('active', match);
            if (match) groupLen = parseInt(savedGroupLen, 10);
        });
    }

    const savedWpm = localStorage.getItem('morse_groups_wpm');
    if (savedWpm) {
        wpmSlider.value = savedWpm;
        wpmValue.textContent = savedWpm;
        wpmCpm.textContent = cpmHintText(savedWpm);
    }

    const groupsCountEl = document.getElementById('groups-count');
    const savedCount = localStorage.getItem('morse_groups_count');
    if (savedCount && groupsCountEl) {
        groupsCountEl.value = savedCount;
    }
    if (groupsCountEl) {
        groupsCountEl.addEventListener('change', () => {
            localStorage.setItem('morse_groups_count', groupsCountEl.value);
            updateDailyBanner();
        });
    }

    const savedFwEnabled = localStorage.getItem('morse_groups_fw_enabled');
    if (savedFwEnabled !== null) {
        fwEnabled.checked = savedFwEnabled === 'true';
        const on = fwEnabled.checked;
        fwWrap.style.display = on ? 'inline-flex' : 'none';
        fwValue.style.display = on ? 'inline-block' : 'none';
    }

    const savedFwWpm = localStorage.getItem('morse_groups_fw_wpm');
    if (savedFwWpm) {
        fwSlider.value = savedFwWpm;
        fwValue.textContent = savedFwWpm;
    }

    wpmSlider.addEventListener('input', () => { 
        wpmValue.textContent = wpmSlider.value; 
        wpmCpm.textContent = cpmHintText(wpmSlider.value); 
        localStorage.setItem('morse_groups_wpm', wpmSlider.value);
        updateDailyBanner();
        updateQrqUI();
    });
    fwSlider.addEventListener('input', () => { 
        fwValue.textContent = fwSlider.value; 
        localStorage.setItem('morse_groups_fw_wpm', fwSlider.value);
    });
    fwEnabled.addEventListener('change', () => {
        const on = fwEnabled.checked;
        fwWrap.style.display = on ? 'inline-flex' : 'none';
        fwValue.style.display = on ? 'inline-block' : 'none';
        localStorage.setItem('morse_groups_fw_enabled', on);
    });
    const fwInfo = document.getElementById('groups-farnsworth-info');
    const fwTooltip = document.getElementById('groups-farnsworth-tooltip');
    if (fwInfo && fwTooltip) {
        fwInfo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fwTooltip.style.display = fwTooltip.style.display === 'none' ? 'block' : 'none';
        });
        fwTooltip.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.addEventListener('click', () => { fwTooltip.style.display = 'none'; });
    }

    document.querySelectorAll('#length-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#length-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            groupLen = parseInt(chip.dataset.len, 10);
            localStorage.setItem('morse_groups_len', groupLen);
            updateDailyBanner();
            updateBufferDepthOptions(groupLen);
        });
    });
    const customInput = document.getElementById('custom-charset-input');
    const customHint = document.getElementById('custom-charset-hint');
    document.querySelectorAll('#charset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#charset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            charsetKey = chip.dataset.set;
            localStorage.setItem('morse_groups_charset', charsetKey);
            const isCustom = charsetKey === 'custom';
            customInput.style.display = isCustom ? 'block' : 'none';
            customHint.style.display = isCustom ? 'block' : 'none';
        });
    });

    const savedCharset = localStorage.getItem('morse_groups_charset');
    if (savedCharset) {
        const chip = document.querySelector(`#charset-chips .chip[data-set="${savedCharset}"]`);
        if (chip) chip.click();
    }

    const MIN_LEARNED_FOR_FILTER = 5;

    // parseCustomCharset() и так молча отфильтровывает всё, кроме A-Z0-9
    // (кириллица там просто не проходит regex-класс [^A-Z0-9]), но само
    // поле ввода это не показывало — можно было напечатать русские буквы
    // и не понять, почему они не учитываются. Чистим прямо по вводу, чтобы
    // недопустимые символы вообще не появлялись в поле.
    customInput.addEventListener('input', () => {
        const cleaned = customInput.value.replace(/[^A-Za-z0-9 ]/g, '');
        if (cleaned !== customInput.value) customInput.value = cleaned;
    });

    function parseCustomCharset() {
        const raw = customInput.value.toUpperCase();
        const chars = [...new Set(raw.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).flatMap(s => s.split('')))];
        return chars.filter(ch => MORSE_CODE[ch]);
    }

    function getCharset(key = charsetKey) {
        const state = Progress.load();
        switch (key) {
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
     * Тот же randomGroup, но с лёгким перекосом вероятности в пользу букв, на
     * которых пользователь чаще ошибается (Progress.groupsLetterScore, 0..1,
     * ниже = слабее). По просьбе владельца (2026-08-02) эффект нарочно
     * мягкий и незаметный — коэффициент 0.5 даёт разброс веса всего 1.0..1.5
     * (самая слабая буква выпадает максимум в полтора раза чаще самой
     * уверенной), никакого доминирования одной буквы в группе. НИКОГДА не
     * зови на экзаменационной сессии — экзамен должен оставаться честно
     * случайным (см. randomGroup выше, которым startSession пользуется для
     * isExam).
     */
    function weightedRandomGroup(charset, len) {
        const weights = charset.map(ch => 1 + (1 - Progress.groupsLetterScore(ch)) * 0.5);
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

    /**
     * Генератор групп для режима «Лечение пар» (по методике R8OA):
     * - Этап 1: знак pairA частый (40-50%), знак pairB СТРОГО ИСКЛЮЧЕН.
     * - Этап 2: знак pairB частый, знак pairA СТРОГО ИСКЛЮЧЕН.
     * - Этап 3: знаки pairA и pairB оба присутствуют с повышенной частотой (дуэль).
     */
    function generatePairGroups(pairA, pairB, stage, count, len) {
        const isDigits = '0123456789'.includes(pairA) || '0123456789'.includes(pairB);
        const baseAlphabet = (isDigits ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            .split('')
            .filter(c => c !== pairA && c !== pairB);

        const groups = [];
        for (let g = 0; g < count; g++) {
            const chars = [];
            const pairTargetCount = Math.min(len - 1, Math.random() < 0.65 ? 2 : 1);

            for (let i = 0; i < len; i++) {
                chars.push(baseAlphabet[Math.floor(Math.random() * baseAlphabet.length)]);
            }

            const positions = [];
            while (positions.length < pairTargetCount) {
                const p = Math.floor(Math.random() * len);
                if (!positions.includes(p)) positions.push(p);
            }

            for (const p of positions) {
                if (stage === 1) {
                    chars[p] = pairA; // B нет вообще
                } else if (stage === 2) {
                    chars[p] = pairB; // A нет вообще
                } else {
                    chars[p] = Math.random() < 0.5 ? pairA : pairB;
                }
            }
            groups.push(chars.join(''));
        }
        return groups;
    }

    function getSelectedPairChars() {
        if (selectedPairKey === 'custom') {
            const inputA = document.getElementById('custom-pair-a');
            const inputB = document.getElementById('custom-pair-b');
            const valA = inputA?.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
            const valB = inputB?.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
            if (valA && valB) {
                return { a: valA[0], b: valB[0] };
            }
            return { a: valA[0] || 'S', b: valB[0] || 'H' };
        }
        const mapping = {
            'SH': { a: 'S', b: 'H' },
            'BD': { a: 'B', b: 'D' },
            'UV': { a: 'U', b: 'V' },
            'H5': { a: 'H', b: '5' },
            '78': { a: '7', b: '8' },
            'B6': { a: 'B', b: '6' },
            'FL': { a: 'F', b: 'L' },
            'PJ': { a: 'P', b: 'J' },
        };
        return mapping[selectedPairKey] || { a: 'S', b: 'H' };
    }

    function updatePairStageUI() {
        const chars = getSelectedPairChars();
        const stage1 = document.getElementById('pairs-stage-1-chip');
        const stage2 = document.getElementById('pairs-stage-2-chip');
        const stage3 = document.getElementById('pairs-stage-3-chip');
        const desc = document.getElementById('pairs-stage-desc');

        if (stage1) stage1.textContent = t('groups.pairs_stage_1', { '{A}': chars.a });
        if (stage2) stage2.textContent = t('groups.pairs_stage_2', { '{B}': chars.b });
        if (stage3) stage3.textContent = t('groups.pairs_stage_3', { '{A}': chars.a, '{B}': chars.b });

        document.querySelectorAll('#pairs-stage-chips .chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.stage, 10) === selectedPairStage);
        });

        if (desc) {
            if (selectedPairStage === 1) {
                desc.textContent = t('groups.pairs_stage_1_desc', { '{A}': chars.a, '{B}': chars.b });
            } else if (selectedPairStage === 2) {
                desc.textContent = t('groups.pairs_stage_2_desc', { '{A}': chars.a, '{B}': chars.b });
            } else {
                desc.textContent = t('groups.pairs_stage_3_desc', { '{A}': chars.a, '{B}': chars.b });
            }
        }
    }

    function setPairStage(stage) {
        selectedPairStage = stage;
        updatePairStageUI();
    }

    function selectPair(pairKey, a, b) {
        selectedPairKey = pairKey;
        document.querySelectorAll('#pairs-chips .chip').forEach(c => {
            c.classList.toggle('active', c.dataset.pair === pairKey);
        });
        const customWrap = document.getElementById('custom-pair-wrap');
        const customA = document.getElementById('custom-pair-a');
        const customB = document.getElementById('custom-pair-b');
        if (customWrap) {
            customWrap.style.display = (pairKey === 'custom') ? 'block' : 'none';
            if (pairKey === 'custom') {
                if (a && customA) customA.value = a.toUpperCase();
                if (b && customB) customB.value = b.toUpperCase();
                if (!a && customA && !customA.value) customA.focus();
            }
        }
        const pt = (typeof Progress.getPairTrainer === 'function') ? Progress.getPairTrainer() : {};
        selectedPairStage = pt[pairKey]?.stage || 1;
        updatePairStageUI();
    }

    function checkPairRecommendation() {
        const recBox = document.getElementById('pairs-smart-recommendation');
        const infoBox = document.getElementById('pairs-smart-info');
        if (infoBox) infoBox.style.display = 'block';
        if (typeof Progress.getRecommendedPair !== 'function') return;
        const rec = Progress.getRecommendedPair();
        if (rec) {
            if (recBox) {
                document.getElementById('pairs-rec-name').textContent = `${rec.a} / ${rec.b}`;
                const reasonEl = document.getElementById('pairs-rec-reason');
                if (reasonEl) {
                    reasonEl.textContent = rec.reason === 'confusion'
                        ? `(${t('groups.pairs_recommendation_reason')}: ${rec.count} ${rec.count === 1 ? 'ошибка' : 'ошибок'})`
                        : `(${t('groups.pairs_recommendation_reason')})`;
                }
                recBox.style.display = 'block';

                const applyBtn = document.getElementById('pairs-apply-rec-btn');
                if (applyBtn) {
                    applyBtn.onclick = () => {
                        selectPair(rec.pair, rec.a, rec.b);
                    };
                }
            }
        } else {
            if (recBox) recBox.style.display = 'none';
        }
    }

    function updateQrqUI() {
        const baseWpm = parseInt(wpmSlider.value, 10);
        const boostWpm = Math.min(60, baseWpm + 6);
        const baseVal = document.getElementById('qrq-base-wpm-val');
        const boostVal = document.getElementById('qrq-boost-wpm-val');
        const diffText = document.getElementById('qrq-speed-diff-text');

        if (baseVal) baseVal.textContent = baseWpm;
        if (boostVal) boostVal.textContent = boostWpm;
        if (diffText) diffText.textContent = t('groups.qrq_speed_diff', { '{base}': baseWpm });
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
    function xpRateForSession(charsetKey, charsetSize, len, opts = {}) {
        let charsetFactor = Math.max(0.15, Math.sqrt(charsetSize / 26));
        if (charsetKey === 'digits') {
            charsetFactor = 1.0;
        } else if (charsetKey === 'mixed') {
            charsetFactor = 1.25;
        }
        const lengthFactor = len / 3;
        // Надбавка за скорость (speedXpFactor из morse-data.js) — ТОЛЬКО для
        // задания дня. В обычных сессиях баланс не трогаем: полный алфавит на
        // любой скорости даёт прежние 2.0/символ. Смысл — задание дня иногда
        // выпадает на неподъёмных для новичка 24 wpm, и без доплаты за скорость
        // высокий wpm там просто наказание. В остальных режимах человек сам
        // выбирает скорость, доплачивать не за что.
        const speed = opts.daily ? speedXpFactor(opts.wpm) : 1;
        return Math.max(1.0, 2 * charsetFactor * lengthFactor * speed);
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
        let bufferUnlocked = false;

        if (isBuffer && answerInput) {
            answerInput.disabled = true;
            answerInput.placeholder = t('groups.buffer_listening');
        }

        if (session && session.isExam) examAnswerEl.focus();
        else if (!isBuffer && answerInput) answerInput.focus();

        try {
            // В экзамене — фиксированный тайминг эталонной записи, а не
            // wpm-слайдер (см. EXAM_CHAR_WPM выше).
            currentAudio = session.isExam
                ? new MorseAudio({ wpm: EXAM_CHAR_WPM, letterGapUnits: EXAM_LETTER_GAP_UNITS })
                : new MorseAudio({ wpm: session.wpm, farnsworthWpm: session.farnsworth || null });
            await currentAudio.play(session.groups[session.index], {
                onCharStart: ({ index }) => {
                    if (isBuffer && answerInput && !bufferUnlocked) {
                        const targetDepth = parseInt(bufferDepth, 10);
                        if (!isNaN(targetDepth) && index >= targetDepth) {
                            bufferUnlocked = true;
                            answerInput.disabled = false;
                            answerInput.placeholder = t('groups.answer_placeholder');
                            answerInput.focus();
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
                answerInput.placeholder = t('groups.answer_placeholder');
                answerInput.focus();
            } else if (session && session.isExam) {
                examAnswerEl.focus();
            } else if (answerInput) {
                answerInput.focus();
            }
        }
    }

    const examAnswerEl = document.getElementById('exam-answer');
    const examSubmitRow = document.getElementById('exam-submit-row');
    const examSubmitBtn = document.getElementById('exam-submit-btn');
    const groupsSubmitRow = document.getElementById('groups-submit-row');

    /**
     * Тайминг «Режима экзамена» — НЕ линейно от wpm-слайдера (как в обычных
     * «Группах»/«Словах»), а фиксированная схема, снятая по огибающей
     * сигнала с эталонной записи настоящего экзамена (файл от R8OA, мастера
     * спорта по скоростной телеграфии, 2026-08-09): dot/dash 60/180 мс —
     * то есть буквы звучат чётко и БЫСТРО, на скорости элемента 20 wpm, а
     * не 12. Межбуквенный интервал внутри группы — 240 мс = 4 единицы
     * (шире стандартных 3, см. letterGapUnits в audio.js — сделан
     * настраиваемым специально ради этого случая, по умолчанию везде
     * остаётся 3). Пауза между группами — везде ровно 960 мс = 16 единиц,
     * та же самая и сразу после сигнала ЖЖЖ= перед первой группой.
     *
     * Из-за такой растянутой паузы реальный ТЕМП приёма (сколько знаков в
     * минуту фактически звучит) получается ~60 зн/мин — гораздо медленнее,
     * чем ощущение от самих букв. Слайдер wpm на панели поэтому для
     * экзамена больше не используется для звука (только косметически
     * показывает «12» — оставлено, чтобы cpm-подсказка рядом продолжала
     * показывать верные «≈60 зн/мин»).
     */
    const EXAM_CHAR_WPM = 20;
    const EXAM_LETTER_GAP_UNITS = 4;
    const EXAM_GROUP_GAP_MS = (1200 / EXAM_CHAR_WPM) * 16;

    function abortCurrentSession() {
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        if (qrqSessionActive) {
            qrqStopRequested = true;
            if (qrqAudio) {
                qrqAudio.stop();
                qrqAudio = null;
            }
            qrqSessionActive = false;
        }
        if (session && !session.finished && session.dbXpEarned > 0) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            const isAbbrev = !!session.abbrevActive;
            const isWords = !!session.wordsActive;
            const isExam = !!session.isExam;
            const isExamAbort = isExam && session.examErrors === undefined; // if not finished fully
            
            let source = 'groups';
            if (isExam) source = isExamAbort ? 'groups_exam_abort' : 'groups_exam';
            else if (isAbbrev) source = 'groups_abbrev';
            else if (isWords) source = 'groups_words';
            
            const err = isExam ? (session.examErrors || (session.totalChars - session.correctChars)) : (session.totalChars - session.correctChars);

            Progress.logXp(session.dbXpEarned, source, {
                wpm: session.wpm,
                fw: session.farnsworth,
                dur,
                err,
                acc: session.totalChars > 0 ? Math.round((session.correctChars / session.totalChars) * 100) : 0,
                history: session.history || []
            });
            session.dbXpEarned = 0;
            session.finished = true;
        }
    }

    // При уходе со страницы или закрытии вкладки
    window.addEventListener('beforeunload', abortCurrentSession);
    window.addEventListener('pagehide', abortCurrentSession);

    function startSession() {
        abortCurrentSession();

        if (currentSubmode === 'qrq') {
            const activeWpm = parseInt(wpmSlider.value, 10);
            startQrqSession(activeWpm);
            return;
        }

        const isExam = (currentSubmode === 'exam');
        const isPairs = (currentSubmode === 'pairs');

        let activeWpm = parseInt(wpmSlider.value, 10);
        let activeFarnsworth = fwEnabled.checked ? parseInt(fwSlider.value, 10) : 0;
        let activeCount = parseInt(document.getElementById('groups-count').value, 10);
        let activeGroupLen = groupLen;
        let activeCharsetKey = charsetKey;

        if (isExam) {
            activeGroupLen = 5;
            activeCharsetKey = 'mixed';
            activeCount = 50;
        } else if (isPairs) {
            const pairsWpmEl = document.getElementById('pairs-wpm');
            if (pairsWpmEl) activeWpm = parseInt(pairsWpmEl.value, 10);
            const pairsCountEl = document.getElementById('pairs-count');
            if (pairsCountEl) activeCount = parseInt(pairsCountEl.value, 10);
            activeGroupLen = 4;
        }

        const isBufferMode = (currentSubmode === 'training') && bufferCheckbox && bufferCheckbox.checked;
        const bufferDepth = selectedBufferDepth || 'all';

        let pairData = null;
        let generatedGroups = null;

        if (isPairs) {
            const pairChars = getSelectedPairChars();
            const pairA = pairChars.a;
            const pairB = pairChars.b;
            const stage = selectedPairStage;
            const isStage1 = (stage === 1);
            const isStage2 = (stage === 2);
            const activeChar = isStage1 ? pairA : (isStage2 ? pairB : null);
            const disabledChar = isStage1 ? pairB : (isStage2 ? pairA : null);

            generatedGroups = generatePairGroups(pairA, pairB, stage, activeCount, activeGroupLen);
            pairData = {
                pairKey: selectedPairKey,
                pairA,
                pairB,
                pairStage: stage,
                activeChar,
                disabledChar,
                pairStats: { aTotal: 0, aCorrect: 0, bTotal: 0, bCorrect: 0 }
            };
        } else {
            const state = Progress.load();
            const charset = getCharset(activeCharsetKey);
            generatedGroups = Array.from({ length: activeCount }, () => (isExam ? randomGroup : weightedRandomGroup)(charset, activeGroupLen));
        }

        session = {
            groups: generatedGroups,
            index: 0, wpm: activeWpm, farnsworth: activeFarnsworth,
            correctChars: 0, totalChars: 0, xpEarned: 0, dbXpEarned: 0,
            xpRate: xpRateForSession(isPairs ? 'letters' : activeCharsetKey, 26, activeGroupLen, { daily: isDailyChallenge, wpm: activeWpm }),
            isExam, examStopped: false, playedCount: 0, finished: false,
            wrongGroups: [], startTime: Date.now(), history: [],
            isBufferMode,
            bufferDepth,
            isPairs,
            ...(pairData || {})
        };

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        groupTotalEl.textContent = activeCount;
        groupIndexEl.textContent = 1;

        const pairsBanner = document.getElementById('pairs-disabled-banner');
        if (isPairs && pairData.disabledChar && pairsBanner) {
            pairsBanner.textContent = t('groups.pairs_banner_disabled', {
                '{DISABLED}': pairData.disabledChar,
                '{ACTIVE}': pairData.activeChar
            });
            pairsBanner.style.display = 'block';
        } else if (pairsBanner) {
            pairsBanner.style.display = 'none';
        }

        const qrqDisplay = document.getElementById('qrq-session-display');
        if (qrqDisplay) qrqDisplay.style.display = 'none';
        const qrqStopBtn = document.getElementById('qrq-stop-btn');
        if (qrqStopBtn) qrqStopBtn.style.display = 'none';

        feedbackEl.className = 'feedback';

        if (isExam) {
            answerInput.style.display = 'none';
            groupsSubmitRow.style.display = 'none';
            examAnswerEl.style.display = 'block';
            examSubmitRow.style.display = 'flex';
            examAnswerEl.value = '';
            examAnswerEl.disabled = true;
            examSubmitBtn.disabled = true;
            examSubmitBtn.textContent = t('js.groups.exam_stop_check');
            replayBtn.style.display = 'none';
            if (typeof renderVkb !== 'undefined') renderVkb(examAnswerEl, true);
            runExamAttentionSequence();
        } else {
            answerInput.style.display = 'block';
            groupsSubmitRow.style.display = 'flex';
            examAnswerEl.style.display = 'none';
            examSubmitRow.style.display = 'none';
            replayBtn.style.display = 'inline-flex';
            answerInput.value = '';
            if (typeof renderVkb !== 'undefined') renderVkb(answerInput, false);
            answerInput.focus();
            playCurrentGroup();
        }
    }

    const QRQ_VOCABULARY = [
        'RADIO', 'MORSE', 'SPEED', 'WAVE', 'POWER', 'SOLAR', 'SPACE',
        'BEAT', 'SOUND', 'LIGHT', 'WORLD', 'FLASH', 'AUDIO', 'MUSIC',
        'TEMPO', 'FOCUS', 'NIGHT', 'STARS', 'EARTH', 'WATER', 'RHYTHM',
        'SIGNAL', 'ANTENNA', 'KEYER', 'PULSE', 'HEART', 'DREAM', 'FLIGHT',
        'OCEAN', 'STORM', 'BRAIN', 'ENERGY', 'ECHO', 'FORCE', 'HERTZ',
        'TOWER', 'VOICE', 'POINT', 'SHARP', 'MAGIC', 'LEVEL', 'TRAIN',
        'QSO', 'QTH', '73', '599', 'RST', 'TEST', 'CQ', 'DX',
        'FB', 'TNX', 'SK', 'GM', 'GA', 'RIG', 'CW'
    ];

    async function startQrqSession(baseWpm) {
        abortCurrentSession();
        const boostWpm = Math.min(60, baseWpm + 6);
        const count = 10;
        const shuffled = [...QRQ_VOCABULARY].sort(() => Math.random() - 0.5);
        const qrqGroups = shuffled.slice(0, count);

        qrqStopRequested = false;
        qrqSessionActive = true;

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';

        answerInput.style.display = 'none';
        groupsSubmitRow.style.display = 'none';
        examAnswerEl.style.display = 'none';
        examSubmitRow.style.display = 'none';
        replayBtn.style.display = 'none';

        const pairsBanner = document.getElementById('pairs-disabled-banner');
        if (pairsBanner) pairsBanner.style.display = 'none';

        const qrqStopBtn = document.getElementById('qrq-stop-btn');
        const qrqDisplay = document.getElementById('qrq-session-display');
        const qrqStatus = document.getElementById('qrq-status-msg');
        const qrqTip = document.getElementById('qrq-tip-msg');
        const qrqRevealed = document.getElementById('qrq-revealed-group');

        if (qrqStopBtn) qrqStopBtn.style.display = 'inline-flex';
        if (qrqDisplay) qrqDisplay.style.display = 'block';

        groupTotalEl.textContent = count;
        const hints = [
            t('groups.qrq_hint_1'),
            t('groups.qrq_hint_2'),
            t('groups.qrq_hint_3'),
        ];

        session = {
            isQrq: true,
            wpm: boostWpm,
            baseWpm: baseWpm,
            groups: qrqGroups,
            index: 0,
            startTime: Date.now(),
            totalChars: qrqGroups.join('').length,
            correctChars: 0,
            xpEarned: 0,
            dbXpEarned: 0,
        };

        qrqAudio = new MorseAudio({ wpm: boostWpm });
        const audio = qrqAudio;

        for (let i = 0; i < count; i++) {
            if (qrqStopRequested) break;
            session.index = i;
            groupIndexEl.textContent = i + 1;
            if (qrqStatus) qrqStatus.textContent = `🎧 ${t('js.groups.qrq_active_listening')} (${i + 1}/${count})`;
            if (qrqTip) qrqTip.textContent = hints[i % hints.length];
            if (qrqRevealed) qrqRevealed.textContent = '· · ·';

            signalLine.clear();
            try {
                await audio.play(qrqGroups[i], {
                    onSymbol: ({ symbol, durationMs }) => {
                        signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                        lamp.flash(durationMs);
                    },
                });
            } catch (e) {
                console.error(e);
            }

            if (qrqStopRequested) break;

            if (qrqRevealed) {
                qrqRevealed.textContent = qrqGroups[i].split('').join(' ');
            }

            await new Promise(r => setTimeout(r, 1400));
        }

        if (qrqStopBtn) qrqStopBtn.style.display = 'none';
        if (qrqDisplay) qrqDisplay.style.display = 'none';
        qrqSessionActive = false;
        qrqAudio = null;

        finishQrqSession();
    }

    function finishQrqSession() {
        if (qrqAudio) {
            qrqAudio.stop();
            qrqAudio = null;
        }
        signalLine.clear();
        lamp.off();

        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const stdGrid = document.getElementById('standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'none';
        const mistakesBlock = document.getElementById('mistakes-block');
        if (mistakesBlock) mistakesBlock.style.display = 'none';
        const pairsRes = document.getElementById('pairs-result-block');
        if (pairsRes) pairsRes.style.display = 'none';
        const diffBlock = document.getElementById('exam-diff-block');
        if (diffBlock) diffBlock.style.display = 'none';
        const oldBr = document.getElementById('groups-xp-breakdown');
        if (oldBr) oldBr.style.display = 'none';
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.style.display = 'none';

        document.querySelectorAll('#result-panel .js-result-note').forEach(n => n.remove());

        const qrqRes = document.getElementById('qrq-result-block');
        if (qrqRes) qrqRes.style.display = 'block';

        const completedCount = session ? session.index + 1 : 1;
        Progress.incrementStat('groupsCompleted', completedCount);
        postStat('total_groups', completedCount);
        Progress.markDailyActivity();
    }

    // «ЖЖЖ=» — русский вариант общепринятого настроечного сигнала (у Ж и
    // латинской V один и тот же код Морзе «...-», см. CYRILLIC_CODE в
    // morse-data.js), «=» на конце — стандартный знак раздела, означающий
    // «начинаю передачу». Отсчёт синхронизирован с самими буквами (не идёт
    // ПОСЛЕ сигнала отдельным шагом), см. onCharStart ниже.
    const EXAM_ATTENTION_TEXT = 'ЖЖЖ=';
    const EXAM_ATTENTION_COUNTDOWN = { 0: '3', 1: '2', 2: '1' };

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Настроечный ЖЖЖ= + видимый обратный отсчёт «Приготовьтесь: 3…2…1…»
     * перед самой передачей экзамена, чтобы человек успел взять карандаш.
     * Цифра переключается ровно в момент начала каждой из трёх букв Ж
     * (audio.play() зовёт onCharStart в начале каждого символа) — отсчёт
     * идёт СИНХРОННО с сигналом, а не отдельным шагом после него. Поле
     * ответа и кнопка «Остановить и проверить» на это время заблокированы
     * (см. startSession): без этого можно было случайно начать печатать
     * ещё до начала передачи. Просьба R8OA, мастера спорта по скоростной
     * телеграфии, 2026-08-09.
     *
     * mySession — снимок session на момент запуска: если пользователь как-то
     * успеет перезапустить сессию, пока эта асинхронная цепочка ещё идёт,
     * дальнейшие шаги (разблокировка поля, запуск playback) должны молча
     * прерваться, а не вмешаться в уже новую сессию.
     */
    async function runExamAttentionSequence() {
        const mySession = session;
        feedbackEl.textContent = t('js.groups.exam_attention');
        feedbackEl.className = 'feedback show ok';

        try {
            const audio = new MorseAudio({ wpm: EXAM_CHAR_WPM, letterGapUnits: EXAM_LETTER_GAP_UNITS });
            await audio.play(EXAM_ATTENTION_TEXT, {
                onCharStart: ({ index }) => {
                    if (session !== mySession || mySession.examStopped) return;
                    const n = EXAM_ATTENTION_COUNTDOWN[index];
                    feedbackEl.textContent = n !== undefined
                        ? t('js.groups.exam_get_ready', { '{n}': n })
                        : t('js.groups.exam_go');
                    feedbackEl.className = 'feedback show ok';
                },
                onSymbol: ({ symbol, durationMs }) => {
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения сигнала ЖЖЖ=:', e);
        }
        if (session !== mySession || mySession.examStopped) return;

        feedbackEl.className = 'feedback';
        examAnswerEl.disabled = false;
        examSubmitBtn.disabled = false;
        examAnswerEl.focus();

        // Раньше первая группа стартовала сразу за «=» и сливалась с ним
        // встык. В эталонной записи пауза после сигнала — той же длины,
        // что и между группами (EXAM_GROUP_GAP_MS), поэтому используем её
        // же здесь, а не отдельное число.
        await delay(EXAM_GROUP_GAP_MS);
        if (session !== mySession || mySession.examStopped) return;

        runExamPlayback();
    }

    async function runExamPlayback() {
        for (session.index = 0; session.index < session.groups.length; session.index++) {
            if (session.examStopped) return;
            groupIndexEl.textContent = session.index + 1;
            await playCurrentGroup();
            session.playedCount = session.index + 1;
            if (session.examStopped) return;
            if (session.index < session.groups.length - 1) {
                await delay(EXAM_GROUP_GAP_MS);
                if (session.examStopped) return;
            }
        }
        examSubmitBtn.textContent = t('groups.check');
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

        const expectedStr = playedGroups.join(' ');
        const rawTyped = examAnswerEl.value.trim();
        session.isPaperMode = (rawTyped === '');
        session.totalChars = playedGroups.reduce((acc, g) => acc + g.length, 0); // Без пробелов, как и было

        session.examFullyCompleted = fullyCompleted;
        
        if (session.isPaperMode) {
            session.correctChars = 0;
            session.examErrors = 0;
            session.examWrongGroupCount = 0;
            session.xpEarned = 0;
            session.wrongPairs = [];
        } else {
            const typedStr = rawTyped.toUpperCase().replace(/\s+/g, ' ');
            const n = expectedStr.length;
            const m = typedStr.length;
            const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
            
            for (let i = 0; i <= n; i++) dp[i][0] = i;
            for (let j = 0; j <= m; j++) dp[0][j] = j;
            
            for (let i = 1; i <= n; i++) {
                for (let j = 1; j <= m; j++) {
                    if (expectedStr[i - 1] === typedStr[j - 1]) {
                        dp[i][j] = dp[i - 1][j - 1];
                    } else {
                        dp[i][j] = 1 + Math.min(
                            dp[i - 1][j],    // пропуск
                            dp[i][j - 1],    // лишний
                            dp[i - 1][j - 1] // замена
                        );
                    }
                }
            }
            
            let i = n, j = m;
            const alignExp = [];
            const alignTyp = [];
            
            while (i > 0 || j > 0) {
                if (i > 0 && j > 0 && expectedStr[i - 1] === typedStr[j - 1]) {
                    alignExp.unshift(expectedStr[i - 1]);
                    alignTyp.unshift(typedStr[j - 1]);
                    i--; j--;
                } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                    alignExp.unshift(expectedStr[i - 1]);
                    alignTyp.unshift(typedStr[j - 1]);
                    i--; j--;
                } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                    alignExp.unshift(expectedStr[i - 1]);
                    alignTyp.unshift('_');
                    i--;
                } else {
                    alignExp.unshift('_');
                    alignTyp.unshift(typedStr[j - 1]);
                    j--;
                }
            }

            session.examErrors = dp[n][m];
            session.correctChars = Math.max(0, session.totalChars - session.examErrors);
            session.alignment = { alignExp, alignTyp };
            session.examWrongGroupCount = session.examErrors; // Используем ошибки вместо "неправильных групп" для экзамена
            
            if (!session.wrongPairs) session.wrongPairs = [];
            for (let k = 0; k < alignExp.length; k++) {
                const e = alignExp[k];
                const t = alignTyp[k];
                if (e !== t && e !== ' ' && e !== '_') {
                    const typedChar = (t === '_' || t === ' ') ? '' : t;
                    session.wrongPairs.push({ expected: e, typed: typedChar });
                    if (typedChar && typeof Progress.recordPairConfusion === 'function') {
                        Progress.recordPairConfusion(e, typedChar);
                    }
                }
            }

            if (fullyCompleted) {
                session.xpEarned = Math.round(session.correctChars * session.xpRate);
                session.dbXpEarned = session.xpEarned;
                Progress.addXp(session.xpEarned);
                if (session.examErrors <= 3) {
                    Progress.incrementStat('examsPassed', 1);
                }
            } else {
                // Если прервали — даём базовый 1 XP за каждый верный символ (но без учета множителей и бонусов)
                session.xpEarned = session.correctChars;
                session.dbXpEarned = session.xpEarned;
                Progress.addXp(session.xpEarned);
            }
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

        if (session.isPairs && session.pairStats) {
            for (let i = 0; i < expected.length; i++) {
                const expChar = expected[i];
                const typChar = typedUpper[i];
                if (expChar === session.pairA) {
                    session.pairStats.aTotal++;
                    if (typChar === expChar) session.pairStats.aCorrect++;
                } else if (expChar === session.pairB) {
                    session.pairStats.bTotal++;
                    if (typChar === expChar) session.pairStats.bCorrect++;
                }
            }
        }

        session.correctChars += correct;
        session.totalChars += expected.length;

        // Питает лёгкое взвешивание будущих групп (weightedRandomGroup) —
        // только не-экзаменационные сессии сюда и попадают, submitAnswer не
        // вызывается на isExam (см. finishExamSession/examSubmitBtn).
        if (!session.isExam) {
            for (let i = 0; i < expected.length; i++) {
                const e = expected[i];
                const t = typedUpper[i];
                const isCorrect = (e === t);
                Progress.recordGroupsAttempt(e, isCorrect);
                if (!isCorrect && t && window.MORSE_CODE && window.MORSE_CODE[t]) {
                    Progress.recordGroupsAttempt(t, false);
                }
            }
        }

        // Начисляем сразу за эту группу — так прогресс не теряется,
        // даже если сессия не будет пройдена до конца.
        const xpGain = Math.round(correct * session.xpRate);
        let bonusGain = 0;
        if (session.isRetrain && !session.isAbuse && correct === expected.length) {
            bonusGain = 5; // Бонус за полностью правильную группу при перетренировке
        }
        
        session.xpEarned += (xpGain + bonusGain);
        if (xpGain + bonusGain > 0) {
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
            feedbackEl.textContent = t('js.groups.correct', { '{expected}': expected });
            feedbackEl.className = 'feedback show ok';
        } else {
            session.wrongGroups.push(expected);
            
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
            
            const rawText = t('js.groups.wrong', { '{expected}': expectedHTML, '{typed}': typedHTML || t('js.groups.empty_placeholder') });
            feedbackEl.innerHTML = `<span style="font-family: var(--font-mono); font-size: 15px; letter-spacing: 1px; color: var(--text);">${rawText}</span>`;
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

        // Убираем заметки, дописанные прошлой сессией (задание дня / экзамен) —
        // иначе они копятся в панели результатов от сессии к сессии.
        resultPanel.querySelectorAll('.js-result-note').forEach(n => n.remove());

        const accuracy = session.totalChars ? session.correctChars / session.totalChars : 0;
        session.finalAccuracy = accuracy; // сохраняем для анти-абуза
        let xpEarned = session.xpEarned;
        
        abortCurrentSession();

        let dailyBonusMsg = '';
        let dailyBonusFail = false;
        if (isDailyChallenge && !session.skipDailyCheck) {
            const matchesRequirement = dailyRequired
                && session.index >= dailyRequired.count
                && groupLen === dailyRequired.len
                && session.wpm === dailyRequired.wpm;

            // Защита от "прокликивания": раньше можно было жать "Ответить"
            // с пустым полем и в конце всё равно получить бонус — проверялись
            // только параметры сессии, но не результат. Теперь для бонуса
            // нужно реально принять минимум половину символов.
            const DAILY_MIN_ACCURACY = 0.5;
            const accuracyOk = accuracy >= DAILY_MIN_ACCURACY;

            if (!matchesRequirement) {
                dailyBonusFail = true;
                dailyBonusMsg = t('js.groups.daily_mismatch', {
                    '{count}': dailyRequired ? dailyRequired.count : '?',
                    '{len}': dailyRequired ? dailyRequired.len : '?',
                    '{wpm}': dailyRequired ? dailyRequired.wpm : '?',
                });
            } else if (!accuracyOk) {
                dailyBonusFail = true;
                dailyBonusMsg = t('js.groups.daily_low_accuracy', {
                    '{min}': Math.round(DAILY_MIN_ACCURACY * 100),
                    '{acc}': Math.round(accuracy * 100),
                });
            } else {
                // Атомарно: +50 XP и метка даты в одном load→save. Никакого
                // ручного Progress.save(state) после addXp — именно он раньше
                // откатывал бонус (показывало 74, начисляло 24).
                if (Progress.completeDailyChallenge()) {
                    xpEarned += 50;
                    dailyBonusMsg = t('js.groups.daily_bonus');
                } else {
                    dailyBonusMsg = t('js.groups.daily_already');
                }
            }
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correctChars}/${session.totalChars}`;
        document.getElementById('result-xp').textContent = xpEarned;

        if (session.index < session.groups.length && !session.isExam && !session.isQrq) {
            const stopNote = document.createElement('div');
            stopNote.className = 'feedback show ok mt-2 js-result-note';
            stopNote.textContent = t('js.groups.stopped_early', {
                '{played}': session.index,
                '{total}': session.groups.length
            });
            const grid = document.querySelector('#result-panel .grid') || document.getElementById('standard-stat-grid');
            if (grid) grid.insertAdjacentElement('beforebegin', stopNote);
        }

        const stdGrid = document.getElementById('standard-stat-grid');
        const mistakesBlockEl = document.getElementById('mistakes-block');
        const pairsBlock = document.getElementById('pairs-result-block');
        const qrqBlock = document.getElementById('qrq-result-block');

        if (session.isPairs && pairsBlock) {
            if (stdGrid) stdGrid.style.display = 'none';
            if (mistakesBlockEl) mistakesBlockEl.style.display = 'none';
            if (qrqBlock) qrqBlock.style.display = 'none';
            pairsBlock.style.display = 'block';

            const pStats = session.pairStats || { aTotal: 0, aCorrect: 0, bTotal: 0, bCorrect: 0 };
            const aAcc = pStats.aTotal ? Math.round((pStats.aCorrect / pStats.aTotal) * 100) : 100;
            const bAcc = pStats.bTotal ? Math.round((pStats.bCorrect / pStats.bTotal) * 100) : 100;
            const pTotal = pStats.aTotal + pStats.bTotal;
            const pCorrect = pStats.aCorrect + pStats.bCorrect;
            const pairAcc = pTotal ? Math.round((pCorrect / pTotal) * 100) : Math.round(accuracy * 100);

            const resPairAcc = document.getElementById('pairs-res-pair-acc');
            if (resPairAcc) resPairAcc.textContent = `${pairAcc}%`;
            const resPairLabel = document.getElementById('pairs-res-pair-label');
            if (resPairLabel) resPairLabel.textContent = t('groups.pairs_accuracy_pair', { '{PAIR}': `${session.pairA} / ${session.pairB}` });

            const resAAcc = document.getElementById('pairs-res-a-acc');
            if (resAAcc) resAAcc.textContent = `${aAcc}% (${pStats.aCorrect}/${pStats.aTotal})`;
            const resALabel = document.getElementById('pairs-res-a-label');
            if (resALabel) resALabel.textContent = `Символ ${session.pairA}`;

            const resBAcc = document.getElementById('pairs-res-b-acc');
            if (resBAcc) resBAcc.textContent = `${bAcc}% (${pStats.bCorrect}/${pStats.bTotal})`;
            const resBLabel = document.getElementById('pairs-res-b-label');
            if (resBLabel) resBLabel.textContent = `Символ ${session.pairB}`;

            if (typeof Progress.savePairStage === 'function') {
                Progress.savePairStage(session.pairKey, session.pairStage, pairAcc);
            }

            const nextBtn = document.getElementById('pairs-next-stage-btn');
            if (nextBtn) {
                if (session.pairStage < 3) {
                    nextBtn.style.display = 'inline-flex';
                    nextBtn.textContent = t('groups.pairs_next_stage', { '{next}': session.pairStage + 1 });
                    nextBtn.onclick = () => {
                        setPairStage(session.pairStage + 1);
                        startSession();
                    };
                } else {
                    nextBtn.style.display = 'inline-flex';
                    nextBtn.textContent = t('groups.pairs_finish_course');
                    nextBtn.onclick = () => {
                        resultPanel.style.display = 'none';
                        setupPanel.style.display = 'block';
                    };
                }
            }

            const repBtn = document.getElementById('pairs-repeat-stage-btn');
            if (repBtn) {
                repBtn.onclick = () => {
                    startSession();
                };
            }
        } else {
            if (stdGrid) stdGrid.style.display = 'grid';
            if (pairsBlock) pairsBlock.style.display = 'none';
            if (qrqBlock) qrqBlock.style.display = 'none';
        }

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.style.display = 'inline-block';

        // XP Breakdown
        const grid = document.querySelector('#result-panel .grid');
        let oldBr = document.getElementById('groups-xp-breakdown');
        if (oldBr) oldBr.remove();
        let brBox = document.createElement('div');
        brBox.id = 'groups-xp-breakdown';
        brBox.className = 'mt-2 muted mono text-center';
        brBox.style.fontSize = '14px';
        let parts = [];
        let baseXP = Math.round(session.xpEarned);
        let speedMult = isDailyChallenge ? speedXpFactor(session.wpm) : 1;
        if (speedMult > 1) {
            parts.push(`${Math.round(baseXP / speedMult)} &times; ${speedMult.toFixed(1)} (скорость)`);
        } else {
            parts.push(`${baseXP} (база)`);
        }
        if (xpEarned > baseXP) {
            parts.push(`50 (бонус)`);
        }
        brBox.innerHTML = parts.join(' + ') + ` = <b>${Math.round(xpEarned)} XP</b>`;
        grid.insertAdjacentElement('afterend', brBox);

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.className = (dailyBonusFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2') + ' js-result-note';
            note.textContent = (dailyBonusFail ? t('js.groups.daily_note_fail_prefix') : t('js.groups.daily_note_ok_prefix')) + dailyBonusMsg;
            document.getElementById('result-panel').appendChild(note);
        }

        if (session.isExam) {
            const note = document.createElement('div');
            if (!session.examFullyCompleted) {
                note.className = 'feedback show bad mt-2';
                note.textContent = t('js.groups.exam_stopped_early', { '{played}': session.playedCount, '{total}': session.groups.length });
            } else if (session.isPaperMode) {
                note.className = 'feedback show ok mt-2';
                note.textContent = t('js.groups.exam_paper_mode');
            } else if (session.examWrongGroupCount <= 3) {
                note.className = 'feedback show ok mt-2';
                note.textContent = t('js.groups.exam_passed_category', { '{wrong}': session.examWrongGroupCount, '{total}': session.groups.length });
            } else {
                note.className = 'feedback show bad mt-2';
                note.textContent = t('js.groups.exam_passed_toomany', { '{wrong}': session.examWrongGroupCount, '{total}': session.groups.length });
            }
            note.classList.add('js-result-note');
            document.getElementById('result-panel').appendChild(note);
        }

        const diffBlock = document.getElementById('exam-diff-block');
        if (session.isExam) {
            diffBlock.style.display = 'block';
            if (session.isPaperMode) {
                diffBlock.innerHTML = `<div style="margin-bottom: 10px; font-weight: bold; font-family: var(--font-ui);">${t('js.groups.exam_diff_paper')}</div>` + session.groups.slice(0, session.playedCount).join(' ');
            } else if (session.alignment) {
                const { alignExp, alignTyp } = session.alignment;
                let html = `<div style="margin-bottom: 10px; font-weight: bold; font-family: var(--font-ui);">${t('js.groups.exam_diff_report')}</div>`;
                html += '<div style="display: flex; flex-wrap: wrap; gap: 15px;">';
                
                let curExp = '';
                let curTyp = '';
                for (let i = 0; i < alignExp.length; i++) {
                    const e = alignExp[i];
                    const t = alignTyp[i];
                    
                    if (e === ' ' && t === ' ') {
                        html += `<div style="display: flex; flex-direction: column; text-align: center;"><div>${curExp}</div><div>${curTyp}</div></div>`;
                        curExp = '';
                        curTyp = '';
                    } else {
                        const displayE = e === ' ' ? '_' : e;
                        const displayT = t === ' ' ? '_' : t;

                        if (e === t) {
                            curExp += `<span style="color: var(--success);">${displayE}</span>`;
                            curTyp += `<span style="color: var(--success);">${displayT}</span>`;
                        } else {
                            curExp += `<span style="color: var(--text); font-weight: bold; text-decoration: underline;">${displayE}</span>`;
                            curTyp += `<span style="color: var(--danger); font-weight: bold; text-decoration: underline;">${displayT}</span>`;
                        }
                    }
                }
                if (curExp || curTyp) {
                    html += `<div style="display: flex; flex-direction: column; text-align: center;"><div>${curExp}</div><div>${curTyp}</div></div>`;
                }
                html += '</div>';
                diffBlock.innerHTML = html;
            }
        } else {
            diffBlock.style.display = 'none';
        }

        const mistakesBlock = document.getElementById('mistakes-block');
        // Показываем кнопку ошибок либо для обычных групп (wrongGroups), либо для экзамена (если есть wrongPairs)
        const hasExamMistakes = session.isExam && !session.isPaperMode && session.wrongPairs && session.wrongPairs.length > 0;
        const hasGroupMistakes = !session.isExam && session.wrongGroups && session.wrongGroups.length > 0;
        
        if (hasGroupMistakes || hasExamMistakes) {
            const count = hasGroupMistakes ? session.wrongGroups.length : session.examErrors;
            document.getElementById('mistake-count').textContent = count;
            mistakesBlock.style.display = 'block';
        } else {
            mistakesBlock.style.display = 'none';
        }
    }

    function retrainMistakes() {
        if (!session || !session.wrongPairs || !session.wrongPairs.length) return;
        
        // Уникальные пары ошибок (чтобы не было 100 групп, если путали одну и ту же букву)
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
        const charset = getCharset();
        const newGroups = [];
        
        for (const p of pairsToTrain) {
            const charsToInsert = [p.expected];
            // Если вместо буквы ввели другой существующий символ, добавляем его в ту же группу,
            // чтобы натренировать отличие между ними на слух!
            if (p.typed && window.MORSE_CODE && window.MORSE_CODE[p.typed] && p.typed !== p.expected) {
                charsToInsert.push(p.typed);
            }
            
            const g = [];
            const targetLen = Math.max(groupLen, charsToInsert.length);
            const randomCount = targetLen - charsToInsert.length;
            
            // Заполняем остаток группы случайными символами
            for (let i = 0; i < randomCount; i++) {
                g.push(charset[Math.floor(Math.random() * charset.length)]);
            }
            
            // Вставляем ошибочные символы в случайные позиции
            for (const ch of charsToInsert) {
                const insertPos = Math.floor(Math.random() * (g.length + 1));
                g.splice(insertPos, 0, ch);
            }
            newGroups.push(g.join(''));
        }

        // Анти-абуз: если точность оригинальной сессии была < 60%, то вместо 3x опыта 
        // за перетренировку начисляется стандартный 1x опыт за верный символ
        const isAbuse = session.finalAccuracy < 0.6;
        const retryXpRate = isAbuse ? 1 : 3;

        const retrySession = {
            groups: newGroups,
            index: 0, wpm: session.wpm, farnsworth: session.farnsworth,
            correctChars: 0, totalChars: 0, xpEarned: 0, dbXpEarned: 0,
            xpRate: retryXpRate,
            isExam: false, examStopped: false, playedCount: 0, finished: false,
            wrongGroups: [], wrongChars: [], skipDailyCheck: true,
            isRetrain: true, isAbuse: isAbuse,
            startTime: Date.now(), history: []
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
        
        let introText = t('js.groups.retrain_intro', { '{count}': session.groups.length });
        if (!isAbuse) introText += ' (Опыт x3 + бонус за группу!)';
        
        feedbackEl.textContent = introText;
        feedbackEl.className = 'feedback show ok';
        if (typeof renderVkb !== 'undefined') renderVkb(answerInput, false);
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

    document.querySelectorAll('#groups-exam-toggle .segmented-tab, #groups-exam-toggle .chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            if (target.classList.contains('active')) return;

            document.querySelectorAll('#groups-exam-toggle .segmented-tab, #groups-exam-toggle .chip').forEach(c => c.classList.remove('active'));
            target.classList.add('active');
            
            const type = target.dataset.type; // 'training' | 'pairs' | 'qrq' | 'exam'
            currentSubmode = type;
            pendingExamMode = (type === 'exam');
            
            const trainingConfig = document.getElementById('groups-training-config');
            const pairsConfig = document.getElementById('groups-pairs-config');
            const qrqConfig = document.getElementById('groups-qrq-config');
            const examHint = document.getElementById('groups-exam-hint-text');
            const startBtn = document.getElementById('start-session');
            
            if (trainingConfig) trainingConfig.style.display = (type === 'training') ? 'block' : 'none';
            if (pairsConfig) pairsConfig.style.display = (type === 'pairs') ? 'block' : 'none';
            if (qrqConfig) qrqConfig.style.display = (type === 'qrq') ? 'block' : 'none';
            if (examHint) examHint.style.display = (type === 'exam') ? 'block' : 'none';

            if (type === 'exam') {
                startBtn.textContent = '▶ ' + t('groups.mode_exam');
                const audioSettings = AudioSettings.load();
                audioSettings.freq = 550;
                AudioSettings.save(audioSettings);
            } else if (type === 'pairs') {
                startBtn.textContent = t('groups.start_session');
                checkPairRecommendation();
                updatePairStageUI();
            } else if (type === 'qrq') {
                startBtn.textContent = t('groups.qrq_start');
                updateQrqUI();
            } else { // training
                startBtn.textContent = t('groups.start_session');
            }
        });
    });

    document.querySelectorAll('#pairs-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            selectPair(chip.dataset.pair);
        });
    });

    const customPairA = document.getElementById('custom-pair-a');
    const customPairB = document.getElementById('custom-pair-b');
    if (customPairA && customPairB) {
        customPairA.addEventListener('input', () => {
            const cleaned = customPairA.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            customPairA.value = cleaned.slice(0, 1);
            if (customPairA.value.length === 1) {
                customPairB.focus();
                customPairB.select();
            }
            updatePairStageUI();
        });
        customPairB.addEventListener('input', () => {
            const cleaned = customPairB.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            customPairB.value = cleaned.slice(0, 1);
            updatePairStageUI();
        });
        customPairA.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                customPairB.focus();
            }
        });
        customPairB.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !customPairB.value) {
                customPairA.focus();
            } else if (e.key === 'ArrowLeft') {
                customPairA.focus();
            }
        });
    }

    document.querySelectorAll('#pairs-stage-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const stage = parseInt(chip.dataset.stage, 10);
            if (stage) setPairStage(stage);
        });
    });

    const pairsWpmSlider = document.getElementById('pairs-wpm');
    const pairsWpmValue = document.getElementById('pairs-wpm-value');
    const pairsWpmCpm = document.getElementById('pairs-wpm-cpm');
    if (pairsWpmSlider) {
        const savedPairsWpm = localStorage.getItem('morse_pairs_wpm') || wpmSlider.value;
        pairsWpmSlider.value = savedPairsWpm;
        if (pairsWpmValue) pairsWpmValue.textContent = savedPairsWpm;
        if (pairsWpmCpm) pairsWpmCpm.textContent = cpmHintText(savedPairsWpm);

        pairsWpmSlider.addEventListener('input', () => {
            if (pairsWpmValue) pairsWpmValue.textContent = pairsWpmSlider.value;
            if (pairsWpmCpm) pairsWpmCpm.textContent = cpmHintText(pairsWpmSlider.value);
            localStorage.setItem('morse_pairs_wpm', pairsWpmSlider.value);
        });
    }

    const KEY_RU_TO_EN = {
        'Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P',
        'Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L',
        'Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M'
    };

    function getForbiddenChars(disChar) {
        const forbidden = new Set();
        if (!disChar) return forbidden;
        const up = disChar.toUpperCase();
        forbidden.add(up);
        // Cyrillic Morse sound equivalent
        if (typeof MORSE_CODE !== 'undefined' && MORSE_CODE[up] && typeof CYRILLIC_TO_CHAR !== 'undefined') {
            const cyr = CYRILLIC_TO_CHAR[MORSE_CODE[up]];
            if (cyr) forbidden.add(cyr.toUpperCase());
        }
        // Keyboard mapping (RU key for this Latin char)
        Object.entries(KEY_RU_TO_EN).forEach(([ru, en]) => {
            if (en === up) forbidden.add(ru);
        });
        return forbidden;
    }

    answerInput.addEventListener('input', () => {
        if (session && session.isPairs && session.disabledChar) {
            const forbidden = getForbiddenChars(session.disabledChar);
            let hasForbidden = false;
            const currentVal = answerInput.value;
            for (let i = 0; i < currentVal.length; i++) {
                if (forbidden.has(currentVal[i].toUpperCase())) {
                    hasForbidden = true;
                    break;
                }
            }
            if (hasForbidden) {
                // Strip all forbidden characters
                answerInput.value = currentVal.split('').filter(c => !forbidden.has(c.toUpperCase())).join('');
                
                // Trigger shake animation
                answerInput.classList.remove('pairs-shake');
                void answerInput.offsetWidth; // force reflow
                answerInput.classList.add('pairs-shake');

                // Visual feedback
                if (feedbackEl) {
                    feedbackEl.textContent = t('groups.pairs_banner_disabled', {
                        '{DISABLED}': session.disabledChar,
                        '{ACTIVE}': session.activeChar || ''
                    });
                    feedbackEl.className = 'feedback show bad';
                }
            }
        }
    });

    const qrqStopBtn = document.getElementById('qrq-stop-btn');
    if (qrqStopBtn) {
        qrqStopBtn.addEventListener('click', () => {
            qrqStopRequested = true;
            if (qrqAudio) {
                qrqAudio.stop();
                qrqAudio = null;
            }
            signalLine.clear();
            lamp.off();
            qrqStopBtn.style.display = 'none';
            const qrqDisplay = document.getElementById('qrq-session-display');
            if (qrqDisplay) qrqDisplay.style.display = 'none';
            qrqSessionActive = false;
            finishQrqSession();
        });
    }

    const qrqReturnBtn = document.getElementById('qrq-return-btn');
    if (qrqReturnBtn) {
        qrqReturnBtn.addEventListener('click', () => {
            resultPanel.style.display = 'none';
            setupPanel.style.display = 'block';
            const trainingChip = document.querySelector('#groups-exam-toggle [data-type="training"]');
            if (trainingChip) trainingChip.click();
        });
    }

    const tipsToggle = document.getElementById('method-tips-toggle');
    const tipsBox = document.getElementById('method-tips-box');
    if (tipsToggle && tipsBox) {
        tipsToggle.addEventListener('click', () => {
            tipsBox.style.display = tipsBox.style.display === 'none' ? 'block' : 'none';
        });
    }

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    function stopGroupsSession() {
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
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
    const groupsStopBtn = document.getElementById('groups-stop-btn');
    if (groupsStopBtn) groupsStopBtn.addEventListener('click', stopGroupsSession);
    examSubmitBtn.addEventListener('click', () => finishExamSession());
    replayBtn.addEventListener('click', playCurrentGroup);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
        const pairsBlock = document.getElementById('pairs-result-block');
        if (pairsBlock) pairsBlock.style.display = 'none';
        const qrqBlock = document.getElementById('qrq-result-block');
        if (qrqBlock) qrqBlock.style.display = 'none';
        const stdGrid = document.getElementById('standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';
        const oldBr = document.getElementById('groups-xp-breakdown');
        if (oldBr) oldBr.style.display = 'block';
    });
    answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });

    /* ---------- Задание дня (пришли по ссылке с главной) ---------- */

    (function applyDailyParams() {
        const params = new URLSearchParams(location.search);
        if (params.get('daily') !== '1') return;
        // Бонус за задание дня начисляется только если СЕГОДНЯШНЕЕ задание для
        // этого игрока — действительно приём групп (на другом этапе оно другого
        // типа и выполняется в другом режиме). Иначе параметры из URL применим,
        // но как к обычной тренировке, без бонуса.
        isDailyChallenge = DailyChallenge.forToday().type === 'groups';

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
            wpmCpm.textContent = cpmHintText(wpm);
        }

        if (isDailyChallenge) {
            const banner = document.createElement('div');
            banner.id = 'groups-daily-banner';
            banner.className = 'feedback show ok mt-2';
            banner.textContent = t('js.groups.daily_banner');
            setupPanel.appendChild(banner);
        }
    })();

    /* ======================= РЕЖИМ: СОКРАЩЕНИЯ ======================= */
    const abbrevGrid = document.getElementById('abbrev-grid');
    const abbrevWpmSlider = document.getElementById('abbrev-wpm');
    const abbrevWpmValue = document.getElementById('abbrev-wpm-value');
    const abbrevWpmCpm = document.getElementById('abbrev-wpm-cpm');
    const abbrevStartBtn = document.getElementById('abbrev-start-btn');
    const abbrevStopBtn = document.getElementById('abbrev-stop-btn');
    const abbrevLamp = new MorseLamp(document.getElementById('abbrev-lamp'));
    const abbrevSignalLine = new SignalLine(document.getElementById('abbrev-signal'));
    wireSignalVisibilityToggle(document.getElementById('abbrev-signal-toggle'), document.getElementById('abbrev-signal'));
    const abbrevFeedback = document.getElementById('abbrev-feedback');
    const abbrevHistory = document.getElementById('abbrev-history');
    const ABBREV_HISTORY_MAX = 6; // больше — уже скорее простыня, чем подсказка
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
            tile.innerHTML = `<div class="ch abbrev-code">${item.code}</div>`;
            tile.addEventListener('click', () => handleAbbrevAnswer(item, tile));
            abbrevGrid.appendChild(tile);
        });
    }

    let abbrevDbXpEarned = 0;
    let abbrevStartTime = 0;
    let abbrevHistoryArr = [];

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
        
        if (abbrevDbXpEarned > 0) {
            const dur = Math.round((Date.now() - abbrevStartTime) / 1000);
            const acc = abbrevTotal ? Math.round((abbrevCorrect / abbrevTotal) * 100) : 0;
            Progress.logXp(abbrevDbXpEarned, 'groups_abbrev', {
                wpm: abbrevWpmSlider.value, 
                dur, 
                err: abbrevTotal - abbrevCorrect, 
                acc,
                history: abbrevHistoryArr
            });
            abbrevDbXpEarned = 0;
            abbrevHistoryArr = [];
        }
        
        abbrevNextTimer = null;
        if (abbrevAudio) { abbrevAudio.stop(); abbrevAudio = null; }
        abbrevSignalLine.clear();
        abbrevLamp.off();
    }
    
    window.addEventListener('beforeunload', haltAbbrev);
    window.addEventListener('pagehide', haltAbbrev);

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

    /**
     * Добавляет запись в историю ответов (последняя — сверху). Раньше был
     * один div с расшифровкой, который playAbbrevTarget() гасил через
     * ~0.9с при старте следующего сокращения — на телефоне прочитать
     * разбор ошибки часто не успевал никто. Теперь ответы копятся списком
     * и остаются на экране, пока их не вытеснят более новые (лимит —
     * ABBREV_HISTORY_MAX, старые просто уходят из DOM).
     */
    function pushAbbrevHistory(isCorrect, text) {
        const entry = document.createElement('div');
        entry.className = 'feedback show ' + (isCorrect ? 'ok' : 'bad') + ' abbrev-history-item';
        entry.textContent = text;
        abbrevHistory.insertBefore(entry, abbrevHistory.firstChild);
        while (abbrevHistory.children.length > ABBREV_HISTORY_MAX) {
            abbrevHistory.removeChild(abbrevHistory.lastChild);
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
            abbrevDbXpEarned += 5;
            Progress.addXp(5);
            Progress.incrementStat('groupsCompleted', 1);
            postStat('total_groups', 1);
            pushAbbrevHistory(true, t('js.groups.abbrev_correct', { '{code}': abbrevTarget.code, '{meaning}': abbrevTarget.meaning }));
            abbrevHistoryArr.push({ e: abbrevTarget.code, t: item.code, xp: 5 });
        } else {
            abbrevStreak = 0;
            pushAbbrevHistory(false, t('js.groups.abbrev_wrong', { '{code}': abbrevTarget.code, '{meaning}': abbrevTarget.meaning, '{got}': item.code }));
            abbrevHistoryArr.push({ e: abbrevTarget.code, t: item.code, xp: 0 });
        }

        abbrevStreakEl.textContent = abbrevStreak;
        abbrevCorrectEl.textContent = abbrevCorrect;
        abbrevTotalEl.textContent = abbrevTotal;

        if (abbrevRunning) {
            clearTimeout(abbrevNextTimer);
            abbrevNextTimer = setTimeout(playAbbrevTarget, 900);
        }
    }

    abbrevWpmSlider.addEventListener('input', () => { abbrevWpmValue.textContent = abbrevWpmSlider.value; abbrevWpmCpm.textContent = cpmHintText(abbrevWpmSlider.value); });
    abbrevStartBtn.addEventListener('click', () => {
        if (abbrevRunning) return;
        haltAbbrev(); // добить хвосты предыдущего запуска, если они ещё живы
        abbrevRunning = true;
        abbrevFeedback.className = 'feedback';
        abbrevHistory.innerHTML = '';
        abbrevStreak = 0;
        abbrevCorrect = 0;
        abbrevTotal = 0;
        abbrevStreakEl.textContent = '0';
        abbrevCorrectEl.textContent = '0';
        abbrevTotalEl.textContent = '0';
        abbrevStartBtn.style.display = 'none';
        abbrevStopBtn.style.display = 'inline-flex';
        // На телефоне кнопка "Начать тренировку" стоит ниже настроек — без
        // скролла счётчик серии/точности оставался за кадром, и первый
        // ответ было не с чем сверить на глаз. scroll-margin-top на
        // #abbrev-stats (см. CSS) учитывает высоту фиксированной шапки.
        document.getElementById('abbrev-stats').scrollIntoView({ behavior: 'smooth', block: 'start' });
        playAbbrevTarget();
    });
    abbrevStopBtn.addEventListener('click', () => {
        haltAbbrev();
        abbrevFeedback.textContent = t('js.groups.stopped');
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
                const meaning = item && item.meaning ? item.meaning : t('js.groups.no_description');
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
    const wordsWpmCpm = document.getElementById('words-wpm-cpm');
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
        words: t('groups.wset_hint_words'),
        phrases: t('js.groups.words_hint_phrases'),
        mixed: t('js.groups.words_hint_mixed'),
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
    
    const vkbWordsEl = document.getElementById('words-vkb');
    let vkbWords = null;
    function renderWordsVkb() {
        if (!vkbWords && typeof VirtualKeyboard !== 'undefined' && vkbWordsEl) {
            vkbWords = new VirtualKeyboard(vkbWordsEl, wordsAnswerInput, { showSpace: false });
        }
    }

    document.querySelectorAll('#words-set-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#words-set-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            wordsSet = chip.dataset.wset;
            wordsSetHint.textContent = WORDS_SET_HINTS[wordsSet] || '';
        });
    });

    wordsWpmSlider.addEventListener('input', () => { wordsWpmValue.textContent = wordsWpmSlider.value; wordsWpmCpm.textContent = cpmHintText(wordsWpmSlider.value); });
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

    function abortWordsSession() {
        if (wordsSession && !wordsSession.finished && wordsSession.dbXpEarned > 0) {
            const dur = Math.round((Date.now() - wordsSession.startTime) / 1000);
            Progress.logXp(wordsSession.dbXpEarned, 'words', {
                wpm: wordsSession.wpm,
                fw: wordsSession.farnsworth,
                dur,
                err: wordsSession.totalChars - wordsSession.correctChars,
                acc: wordsSession.totalChars > 0 ? Math.round((wordsSession.correctChars / wordsSession.totalChars) * 100) : 0,
                history: wordsSession.history || []
            });
            wordsSession.dbXpEarned = 0;
            wordsSession.finished = true;
        }
    }

    window.addEventListener('beforeunload', abortWordsSession);
    window.addEventListener('pagehide', abortWordsSession);

    function startWordsSession() {
        abortWordsSession();
        const pool = wordsPool();
        const count = parseInt(document.getElementById('words-count').value, 10);
        const wpm = parseInt(wordsWpmSlider.value, 10);
        const farnsworth = wordsFwEnabled.checked ? parseInt(wordsFwSlider.value, 10) : null;

        haltWords();
        wordsSession = {
            items: Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]),
            index: 0, wpm, farnsworth,
            correctChars: 0, totalChars: 0, fullyCorrect: 0, xpEarned: 0, dbXpEarned: 0,
            missed: [], startTime: Date.now(), history: []
        };

        wordsSetup.style.display = 'none';
        wordsResultPanel.style.display = 'none';
        wordsSessionPanel.style.display = 'block';
        wordsTotalEl.textContent = count;
        wordsIndexEl.textContent = '1';
        wordsAnswerInput.value = '';
        wordsFeedback.className = 'feedback';
        if (typeof renderWordsVkb !== 'undefined') renderWordsVkb();
        wordsAnswerInput.focus();
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
        if (xpGain > 0) {
            wordsSession.dbXpEarned += xpGain;
            Progress.addXp(xpGain);
        }
        
        wordsSession.history.push({
            e: expected,
            t: typed,
            xp: xpGain
        });
        
        Progress.incrementStat('wordsCompleted', 1);

        if (correct === scorable && typed.length === expected.length) {
            wordsSession.fullyCorrect++;
            wordsFeedback.textContent = t('js.groups.correct', { '{expected}': expected }) + (xpGain ? t('js.groups.words_xp_suffix', { '{xp}': xpGain }) : '');
            wordsFeedback.className = 'feedback show ok';
        } else {
            wordsSession.missed.push({ expected, typed: typed || t('js.groups.empty_placeholder') });
            wordsFeedback.textContent = t('js.groups.wrong', { '{expected}': expected, '{typed}': typed || t('js.groups.empty_placeholder') })
                + (xpGain ? t('js.groups.words_xp_suffix', { '{xp}': xpGain }) : t('js.groups.words_xp_none'));
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

        abortWordsSession();

        const mistakesBox = document.getElementById('words-mistakes');
        if (wordsSession.missed.length) {
            mistakesBox.style.display = 'block';
            mistakesBox.innerHTML = '<div class="muted" style="font-size:13px;margin-bottom:6px;">' + t('js.groups.words_missed_label') + '</div>'
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

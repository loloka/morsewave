/**
 * Учебно-методический контроллер режима «Метод ДОСААФ» для MorseWave.
 * 
 * Логика и педагогический маршрут ступени:
 * 1. Напевы букв (прослушать все карточки новой ступени для допуска к словам).
 * 2. Приём слов (кнопка «Начать приём», автозамена EN->RU раскладки, экранная клавиатура, цель 5 слов).
 * 3. Зачёт ступени (допуск после 5 принятых слов, 10 контрольных слов, порог 80% / 8 из 10, скорость).
 * 4. Классность ДОСААФ (интерактивный расчёт звания: Курсант -> 3-й -> 2-й -> 1-й класс по ЕВСК).
 */

(function () {
    let currentStageNum = 1;
    let maxUnlockedStage = 1;
    let currentSubTab = 'napevs'; // 'napevs', 'words', 'exam', 'ranks'

    let currentWord = null;
    let isWordPlaying = false;
    let currentAudio = null;
    let dosaafLamp = null;

    let wordStreak = 0;
    let wordSessionCorrect = 0;
    let wordSessionTotal = 0;
    let wordsSessionStarted = false;

    // Состояние зачёта (10 слов)
    let examActive = false;
    let examWords = [];
    let examIndex = 0;
    let examCorrect = 0;
    let examXpEarned = 0;

    // Накопленный прогресс пользователя
    let listenedLetters = new Set();
    let stageWordsDone = {}; // { 1: 5, 2: 3, ... }
    let examPassed = {};     // { 1: { score: 9, total: 10, wpm: 12, date: ... }, ... }

    // Карта для прозрачной трансляции английской раскладки в русскую
    const LAYOUT_EN_TO_RU = {
        'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '[': 'Х', ']': 'Ъ',
        'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ';': 'Ж', "'": 'Э',
        'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', ',': 'Б', '.': 'Ю', '`': 'Ё',
        'q': 'Й', 'w': 'Ц', 'e': 'У', 'r': 'К', 't': 'Е', 'y': 'Н', 'u': 'Г', 'i': 'Ш', 'o': 'Щ', 'p': 'З', '{': 'Х', '}': 'Ъ',
        'a': 'Ф', 's': 'Ы', 'd': 'В', 'f': 'А', 'g': 'П', 'h': 'Р', 'j': 'О', 'k': 'Л', 'l': 'Д', ':': 'Ж', '"': 'Э',
        'z': 'Я', 'x': 'Ч', 'c': 'С', 'v': 'М', 'b': 'И', 'n': 'Т', 'm': 'Ь', '<': 'Б', '>': 'Ю', '~': 'Ё'
    };

    // Загрузка и сохранение состояния
    function loadDosaafProgress() {
        try {
            maxUnlockedStage = parseInt(localStorage.getItem('morse_dosaaf_max_stage'), 10) || 1;
            const savedStage = parseInt(localStorage.getItem('morse_dosaaf_current_stage'), 10) || 1;
            currentStageNum = Math.min(Math.max(savedStage, 1), maxUnlockedStage);

            const rawListened = localStorage.getItem('morse_dosaaf_listened_letters');
            if (rawListened) {
                listenedLetters = new Set(JSON.parse(rawListened));
            } else {
                listenedLetters = new Set();
            }

            const rawWords = localStorage.getItem('morse_dosaaf_stage_words_done');
            stageWordsDone = rawWords ? JSON.parse(rawWords) : {};

            const rawExams = localStorage.getItem('morse_dosaaf_exam_passed');
            examPassed = rawExams ? JSON.parse(rawExams) : {};
        } catch (_) {
            maxUnlockedStage = 1;
            currentStageNum = 1;
            listenedLetters = new Set();
            stageWordsDone = {};
            examPassed = {};
        }
    }

    function saveDosaafProgress() {
        try {
            localStorage.setItem('morse_dosaaf_max_stage', String(maxUnlockedStage));
            localStorage.setItem('morse_dosaaf_current_stage', String(currentStageNum));
            localStorage.setItem('morse_dosaaf_listened_letters', JSON.stringify([...listenedLetters]));
            localStorage.setItem('morse_dosaaf_stage_words_done', JSON.stringify(stageWordsDone));
            localStorage.setItem('morse_dosaaf_exam_passed', JSON.stringify(examPassed));
        } catch (_) {}
    }

    function getDosaafWpm() {
        const slider = document.getElementById('dosaaf-wpm');
        return slider ? (parseInt(slider.value, 10) || 12) : 12;
    }

    function getDosaafLamp() {
        if (!dosaafLamp) {
            const lampEl = document.getElementById('dosaaf-lamp');
            if (lampEl && typeof MorseLamp !== 'undefined') {
                dosaafLamp = new MorseLamp(lampEl);
            }
        } else if (dosaafLamp.updateVisibility) {
            dosaafLamp.updateVisibility();
        }
        return dosaafLamp;
    }

    // Инициализация режима
    function initDosaafMode() {
        getDosaafLamp();
        loadDosaafProgress();
        renderStageNav();
        renderCurrentStage();
        setupSpeedControl();
        setupSubTabs();
        setupInputTransliteration();
    }

    // Отрисовка навигатора ступеней (1..7)
    function renderStageNav() {
        const container = document.getElementById('dosaaf-stage-chips');
        if (!container) return;
        container.innerHTML = '';

        DOSAAF_STAGES.forEach(st => {
            const chip = document.createElement('div');
            const isUnlocked = st.stage <= maxUnlockedStage;
            const isCurrent = st.stage === currentStageNum;

            chip.className = 'chip' + (isCurrent ? ' active' : '') + (!isUnlocked ? ' disabled' : '');
            chip.dataset.stage = String(st.stage);

            let statusIcon = '';
            if (examPassed[st.stage]) {
                statusIcon = ' ✓';
            } else if (!isUnlocked) {
                statusIcon = ' 🔒';
            }

            chip.textContent = `${t('dosaaf.stage_short') || 'Ступень'} ${st.stage}${statusIcon}`;

            if (isUnlocked) {
                chip.addEventListener('click', () => {
                    goToStage(st.stage);
                });
            }
            container.appendChild(chip);
        });

        // Плавный скролл активного чипа ступени в горизонтальной полосе
        const activeChip = container.querySelector('.chip.active');
        if (activeChip) {
            activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    // Переход к указанной ступени с сохранением и центрированием
    function goToStage(stageNum) {
        if (stageNum > 7 || stageNum > maxUnlockedStage) return;
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        if (dosaafLamp) {
            dosaafLamp.off();
        }
        currentStageNum = stageNum;
        saveDosaafProgress();
        renderStageNav();
        renderCurrentStage();
        switchToSubTab('napevs', true);
        const stageMode = document.getElementById('dosaaf-mode');
        if (stageMode) {
            stageMode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Отрисовка текущей выбранной ступени
    function renderCurrentStage() {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];

        const titleEl = document.getElementById('dosaaf-stage-title');
        const subtitleEl = document.getElementById('dosaaf-stage-subtitle');
        if (titleEl) titleEl.textContent = stageData.title;
        if (subtitleEl) subtitleEl.textContent = stageData.subtitle;

        const quoteTextEl = document.getElementById('dosaaf-quote-text');
        const quoteAuthorEl = document.getElementById('dosaaf-quote-author');
        if (quoteTextEl && quoteAuthorEl) {
            quoteTextEl.textContent = `«${stageData.quote.text}»`;
            quoteAuthorEl.textContent = `— ${stageData.quote.author}, ${stageData.quote.book}`;
        }

        // Обновляем рекомендуемую скорость в зачёте с учётом типа знаков ступени
        const examSpeedHintEl = document.getElementById('dosaaf-exam-min-speed');
        if (examSpeedHintEl) {
            const minWpm = stageData.minExamWpm || 10;
            const cpmType = getStageCpmType(currentStageNum);
            const minCpm = (typeof getCpmByType === 'function')
                ? getCpmByType(minWpm, cpmType)
                : Math.round(minWpm * (cpmType === 'digits' ? 2.90 : (cpmType === 'mixed' ? 3.65 : 4.22)));
            examSpeedHintEl.textContent = (t('dosaaf.exam_min_speed_hint') || 'Норматив скорости зачёта ступени: не менее {wpm} WPM ({cpm} зн/мин).')
                .replace('{wpm}', minWpm)
                .replace('{cpm}', minCpm);
        }

        updateSpeedCpmHint();
        renderActiveSubTab();
    }

    // Переключение вкладок внутри ступени
    function setupSubTabs() {
        document.querySelectorAll('#dosaaf-subtabs .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                switchToSubTab(chip.dataset.tab, false);
            });
        });

        // Ссылки быстрого перехода при блокировках
        document.getElementById('dosaaf-goto-napevs-btn')?.addEventListener('click', () => {
            switchToSubTab('napevs', true);
        });
        document.getElementById('dosaaf-goto-words-btn')?.addEventListener('click', () => {
            switchToSubTab('words', true);
        });
        document.getElementById('dosaaf-goto-words-next-btn')?.addEventListener('click', () => {
            switchToSubTab('words', true);
            const startBtn = document.getElementById('dosaaf-start-words-btn');
            if (startBtn && startBtn.offsetParent !== null) {
                startWordsPractice();
            }
        });
        document.getElementById('dosaaf-goto-exam-next-btn')?.addEventListener('click', () => {
            switchToSubTab('exam', true);
        });
    }

    function switchToSubTab(tabName, shouldScroll = true) {
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        if (dosaafLamp) {
            dosaafLamp.off();
        }
        currentSubTab = tabName;
        document.querySelectorAll('#dosaaf-subtabs .chip').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tabName);
        });
        renderActiveSubTab();
        if (shouldScroll) {
            const targetView = document.getElementById(`dosaaf-view-${tabName}`);
            if (targetView) {
                targetView.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // Проверка условий открытия разделов
    function isNapevsCompleted(stageNum) {
        const stageData = DOSAAF_STAGES.find(s => s.stage === stageNum) || DOSAAF_STAGES[0];
        return stageData.newLetters.every(ch => listenedLetters.has(ch));
    }

    function getStageWordsDoneCount(stageNum) {
        return stageWordsDone[stageNum] || 0;
    }

    function renderActiveSubTab() {
        const napevsView = document.getElementById('dosaaf-view-napevs');
        const wordsView = document.getElementById('dosaaf-view-words');
        const examView = document.getElementById('dosaaf-view-exam');
        const ranksView = document.getElementById('dosaaf-view-ranks');

        if (napevsView) napevsView.style.display = currentSubTab === 'napevs' ? 'block' : 'none';
        if (wordsView) wordsView.style.display = currentSubTab === 'words' ? 'block' : 'none';
        if (examView) examView.style.display = currentSubTab === 'exam' ? 'block' : 'none';
        if (ranksView) ranksView.style.display = currentSubTab === 'ranks' ? 'block' : 'none';

        if (currentSubTab === 'napevs') {
            renderNapevsGrid();
        } else if (currentSubTab === 'words') {
            renderWordsView();
        } else if (currentSubTab === 'exam') {
            renderExamView();
        } else if (currentSubTab === 'ranks') {
            renderRanksView();
        }
    }

    // =========================================================================
    // 1. НАПЕВЫ БУКВ
    // =========================================================================
    function renderNapevsGrid() {
        const container = document.getElementById('dosaaf-napevs-grid');
        if (!container) return;
        container.innerHTML = '';

        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const newLetters = stageData.newLetters;

        // Расчёт прогресса прослушивания напевов ступени
        let listenedCount = 0;
        newLetters.forEach(ch => {
            if (listenedLetters.has(ch)) listenedCount++;
        });

        const progressTextEl = document.getElementById('dosaaf-napevs-progress-text');
        const progressBarEl = document.getElementById('dosaaf-napevs-progress-bar');
        const doneMsgEl = document.getElementById('dosaaf-napevs-done-msg');

        const totalLetters = newLetters.length;
        const pct = Math.round((listenedCount / totalLetters) * 100);

        if (progressTextEl) {
            progressTextEl.textContent = (t('dosaaf.napevs_progress') || 'Изучено напевов ступени: {done} из {total}')
                .replace('{done}', listenedCount)
                .replace('{total}', totalLetters);
        }
        if (progressBarEl) progressBarEl.style.width = `${pct}%`;

        if (doneMsgEl) {
            const nextActionEl = document.getElementById('dosaaf-napevs-next-action');
            if (listenedCount >= totalLetters) {
                doneMsgEl.style.display = 'block';
                doneMsgEl.textContent = t('dosaaf.napevs_done_msg') || '🎉 Все напевы этой ступени изучены! Раздел «Приём слов» разблокирован.';
                if (nextActionEl) nextActionEl.style.display = 'block';
            } else {
                doneMsgEl.style.display = 'none';
                if (nextActionEl) nextActionEl.style.display = 'none';
            }
        }

        newLetters.forEach(ch => {
            const info = stageData.napevs[ch];
            if (!info) return;

            const isListened = listenedLetters.has(ch);
            const card = document.createElement('div');
            card.className = 'card dosaaf-napev-card' + (isListened ? ' listened' : '');
            card.style.cursor = 'pointer';

            const statusBadge = isListened
                ? `<span class="dosaaf-badge-done">✓ Изучено</span>`
                : `<button type="button" class="btn btn-sm btn-outline dosaaf-play-letter-btn" aria-label="Прослушать">▶</button>`;

            const formattedPattern = info.pattern
                .split('')
                .map(s => s === '.' ? '•' : '—')
                .join(' ');

            card.innerHTML = `
                <div class="flex-between" style="align-items:center;">
                    <span class="dosaaf-letter-char mono" style="font-size:28px; font-weight:800; color:${isListened ? 'var(--success)' : 'var(--accent)'};">${ch}</span>
                    ${statusBadge}
                </div>
                <div class="dosaaf-napev-text bold mt-1" style="font-size:15px; color:var(--text); letter-spacing:0.5px;">${info.napev}</div>
                <div class="dosaaf-pattern-text mono muted" style="font-size:13px; margin-top:3px;"><span class="dosaaf-pattern-symbols" style="letter-spacing:3px; font-weight:700; color:var(--text);">${formattedPattern}</span> <span style="letter-spacing:normal;">(${info.tita})</span></div>
            `;

            card.addEventListener('click', () => {
                listenedLetters.add(ch);
                saveDosaafProgress();
                playDosaafSound(ch);
                renderNapevsGrid();
            });

            container.appendChild(card);
        });
    }

    // =========================================================================
    // 2. ПРИЁМ СЛОВ
    // =========================================================================
    function renderWordsView() {
        const lockedBox = document.getElementById('dosaaf-words-locked');
        const activeBox = document.getElementById('dosaaf-words-active');
        const lockedText = document.getElementById('dosaaf-words-locked-text');

        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const newLetters = stageData.newLetters;
        let listenedCount = 0;
        newLetters.forEach(ch => {
            if (listenedLetters.has(ch)) listenedCount++;
        });

        if (listenedCount < newLetters.length) {
            // Раздел заблокирован до изучения напевов
            if (lockedBox) lockedBox.style.display = 'block';
            if (activeBox) activeBox.style.display = 'none';
            if (lockedText) {
                lockedText.textContent = (t('dosaaf.napevs_not_done_alert') || '🔒 Сначала прослушайте все напевы букв этой ступени в разделе «Напевы букв» (прослушано {done} из {total}).')
                    .replace('{done}', listenedCount)
                    .replace('{total}', newLetters.length);
            }
            return;
        }

        if (lockedBox) lockedBox.style.display = 'none';
        if (activeBox) activeBox.style.display = 'block';

        updateWordsGoalProgress();
        buildMobileKeypad('dosaaf-words-kbd', 'dosaaf-word-input', checkWordAnswer);

        // Если тренировка ещё не запущена — показываем стартовый CTA
        const startBox = document.getElementById('dosaaf-words-start-box');
        const playBox = document.getElementById('dosaaf-words-play-box');

        if (!wordsSessionStarted) {
            if (startBox) startBox.style.display = 'block';
            if (playBox) playBox.style.display = 'none';
        } else {
            if (startBox) startBox.style.display = 'none';
            if (playBox) playBox.style.display = 'block';
        }
    }

    function startWordsTraining() {
        wordsSessionStarted = true;
        const startBox = document.getElementById('dosaaf-words-start-box');
        const playBox = document.getElementById('dosaaf-words-play-box');
        if (startBox) startBox.style.display = 'none';
        if (playBox) playBox.style.display = 'block';

        nextWord(true);
    }

    function updateWordsGoalProgress() {
        const goalTextEl = document.getElementById('dosaaf-words-goal-text');
        const goalBarEl = document.getElementById('dosaaf-words-goal-bar');
        const currentCount = getStageWordsDoneCount(currentStageNum);
        const target = 5;
        const pct = Math.min(100, Math.round((currentCount / target) * 100));

        if (goalTextEl) {
            goalTextEl.textContent = (t('dosaaf.words_practice_goal') || 'Готовность к зачёту ступени: {streak} / {target} слов')
                .replace('{streak}', Math.min(currentCount, target))
                .replaceAll('{target}', target);
        }
        if (goalBarEl) {
            goalBarEl.style.width = `${pct}%`;
            goalBarEl.style.background = pct >= 100 ? 'var(--success)' : 'var(--accent)';
        }

        const nextActionEl = document.getElementById('dosaaf-words-next-action');
        if (nextActionEl) {
            if (currentCount >= target) {
                nextActionEl.style.display = 'block';
            } else {
                nextActionEl.style.display = 'none';
            }
        }
    }

    function nextWord(autoPlay = true) {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const words = stageData.words;
        if (!words || words.length === 0) return;

        let candidate = words[Math.floor(Math.random() * words.length)];
        if (words.length > 1 && candidate === currentWord) {
            candidate = words[Math.floor(Math.random() * words.length)];
        }
        currentWord = candidate;

        const input = document.getElementById('dosaaf-word-input');
        if (input) {
            input.value = '';
            input.disabled = false;
            // Фокусируем только на не-сенсорных устройствах во избежание прыжков экрана
            if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                input.focus();
            }
        }

        const feedback = document.getElementById('dosaaf-word-feedback');
        if (feedback) {
            feedback.className = 'feedback';
            feedback.textContent = '';
        }

        const lenHint = document.getElementById('dosaaf-word-length-hint');
        if (lenHint) {
            lenHint.textContent = `${t('dosaaf.word_length') || 'Длина'}: ${currentWord.length} ${t('dosaaf.chars') || 'букв'}`;
        }

        const warnEl = document.getElementById('dosaaf-words-layout-warn');
        if (warnEl) warnEl.style.display = 'none';

        if (autoPlay) {
            playCurrentWord();
        }
    }

    function playCurrentWord() {
        if (!currentWord) return;
        playDosaafSound(currentWord);
    }

    function checkWordAnswer() {
        const input = document.getElementById('dosaaf-word-input');
        if (!input || !currentWord) return;

        const answer = input.value.trim().toUpperCase();
        if (!answer) return;

        const isCorrect = answer === currentWord.toUpperCase();
        wordSessionTotal++;

        if (isCorrect) {
            wordStreak++;
            wordSessionCorrect++;
            const curDone = getStageWordsDoneCount(currentStageNum);
            stageWordsDone[currentStageNum] = curDone + 1;
            saveDosaafProgress();
            updateWordsGoalProgress();

            if (typeof Progress !== 'undefined') {
                Progress.addXp(1);
                Progress.logXp(1, 'dosaaf_words');
                Progress.markDailyActivity();
            }
        } else {
            wordStreak = 0;
        }

        updateWordStats();
        pushWordHistory(isCorrect, currentWord, answer);

        const feedback = document.getElementById('dosaaf-word-feedback');
        if (feedback) {
            feedback.className = 'feedback show ' + (isCorrect ? 'ok' : 'bad');
            if (isCorrect) {
                feedback.innerHTML = `✓ <b>${currentWord}</b> — ${t('dosaaf.correct') || 'Верно!'} <span class="badge-xp" style="margin-left:6px; font-size:12px; font-weight:700; color:var(--accent);">+1 XP</span>`;
                setTimeout(() => nextWord(true), 900);
            } else {
                const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum);
                let breakdown = currentWord.split('').map(c => {
                    const nap = stageData?.napevs[c]?.napev || '';
                    return nap ? `<b>${c}</b> (${nap})` : `<b>${c}</b>`;
                }).join(' · ');
                feedback.innerHTML = `✗ ${t('dosaaf.wrong_was') || 'Ошибка! Передавалось:'} <b>${currentWord}</b><br><small class="muted">${breakdown}</small>`;
            }
        }
    }

    function updateWordStats() {
        const streakEl = document.getElementById('dosaaf-word-streak');
        const accEl = document.getElementById('dosaaf-word-accuracy');
        const totalEl = document.getElementById('dosaaf-word-total');

        if (streakEl) streakEl.textContent = wordStreak;
        if (totalEl) totalEl.textContent = wordSessionTotal;
        if (accEl) {
            accEl.textContent = wordSessionTotal > 0
                ? `${Math.round((wordSessionCorrect / wordSessionTotal) * 100)}%`
                : '—';
        }
    }

    function pushWordHistory(isCorrect, word, answer) {
        const histEl = document.getElementById('dosaaf-word-history');
        if (!histEl) return;

        const item = document.createElement('div');
        item.className = 'feedback show ' + (isCorrect ? 'ok' : 'bad') + ' rec-history-item';
        item.textContent = isCorrect ? `✓ ${word}` : `✗ ${word} (${answer})`;
        histEl.insertBefore(item, histEl.firstChild);

        while (histEl.children.length > 5) {
            histEl.removeChild(histEl.lastChild);
        }
    }

    // =========================================================================
    // 3. ЗАЧЁТ СТУПЕНИ (10 контрольных слов, 80% порог)
    // =========================================================================
    function renderExamView() {
        const lockedBox = document.getElementById('dosaaf-exam-locked');
        const unlockedBox = document.getElementById('dosaaf-exam-unlocked');
        const lockedText = document.getElementById('dosaaf-exam-locked-text');

        const doneWords = getStageWordsDoneCount(currentStageNum);
        const requiredWords = 5;

        if (doneWords < requiredWords) {
            if (lockedBox) lockedBox.style.display = 'block';
            if (unlockedBox) unlockedBox.style.display = 'none';
            if (lockedText) {
                lockedText.textContent = (t('dosaaf.exam_locked_alert') || '🔒 Зачёт заблокирован. Для допуска необходимо принять минимум {target} слов в тренировке «Приём слов» (прогресс: {done}/{target}).')
                    .replace('{done}', doneWords)
                    .replaceAll('{target}', requiredWords);
            }
            return;
        }

        if (lockedBox) lockedBox.style.display = 'none';
        if (unlockedBox) unlockedBox.style.display = 'block';

        buildMobileKeypad('dosaaf-exam-kbd', 'dosaaf-exam-input', checkExamAnswer);
    }

    function startStageExam() {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        
        // 10 контрольных слов
        examWords = [...stageData.words].sort(() => Math.random() - 0.5).slice(0, 10);
        // Если в ступени меньше 10 слов, дополняем повторами в случайном порядке
        while (examWords.length < 10 && stageData.words.length > 0) {
            examWords.push(stageData.words[Math.floor(Math.random() * stageData.words.length)]);
        }

        examIndex = 0;
        examCorrect = 0;
        examXpEarned = 0;
        examActive = true;

        const panel = document.getElementById('dosaaf-exam-panel');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');
        const resultBox = document.getElementById('dosaaf-exam-result');

        if (panel) panel.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';
        if (resultBox) resultBox.style.display = 'none';

        nextExamWord();
    }

    function nextExamWord() {
        if (examIndex >= examWords.length) {
            finishStageExam();
            return;
        }

        const word = examWords[examIndex];
        const progressEl = document.getElementById('dosaaf-exam-progress');
        if (progressEl) progressEl.textContent = `${examIndex + 1} / ${examWords.length}`;

        const input = document.getElementById('dosaaf-exam-input');
        if (input) {
            input.value = '';
            if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                input.focus();
            }
        }

        const warnEl = document.getElementById('dosaaf-exam-layout-warn');
        if (warnEl) warnEl.style.display = 'none';

        playDosaafSound(word);
    }

    function checkExamAnswer() {
        if (!examActive || examIndex >= examWords.length) return;
        const input = document.getElementById('dosaaf-exam-input');
        if (!input) return;

        const ans = input.value.trim().toUpperCase();
        const target = examWords[examIndex].toUpperCase();

        if (ans === target) {
            examCorrect++;
            // В зачёте контрольное слово рассчитывается как группа символов (коэффициент 1.2 за знак)
            const wordXp = Math.max(2, Math.round(target.length * 1.2));
            examXpEarned += wordXp;
            if (typeof Progress !== 'undefined') {
                Progress.addXp(wordXp);
                Progress.logXp(wordXp, 'dosaaf_exam_word');
                Progress.markDailyActivity();
            }
        }
        examIndex++;
        nextExamWord();
    }

    function finishStageExam() {
        examActive = false;
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        if (dosaafLamp) {
            dosaafLamp.off();
        }
        const panel = document.getElementById('dosaaf-exam-panel');
        const resultBox = document.getElementById('dosaaf-exam-result');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');

        if (panel) panel.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-flex';

        const totalWords = examWords.length || 10;
        const passThreshold = Math.ceil(totalWords * 0.8); // 80% (8 из 10)
        const isPassed = examCorrect >= passThreshold;
        const currentWpm = getDosaafWpm();
        const passBonus = 25;

        if (isPassed) {
            const prev = examPassed[currentStageNum];
            examPassed[currentStageNum] = {
                score: Math.max(prev?.score || 0, examCorrect),
                total: totalWords,
                wpm: Math.max(prev?.wpm || 0, currentWpm),
                date: new Date().toISOString()
            };

            if (currentStageNum === maxUnlockedStage && maxUnlockedStage < 7) {
                maxUnlockedStage++;
            }
            saveDosaafProgress();
            renderStageNav();

            // Бонус опыта за успешную сдачу зачёта ступени (+25 XP)
            examXpEarned += passBonus;
            if (typeof Progress !== 'undefined') {
                Progress.addXp(passBonus);
                Progress.logXp(passBonus, 'dosaaf_exam_pass');
                Progress.markDailyActivity();
                if (typeof Progress.checkAchievements === 'function') {
                    Progress.checkAchievements();
                }
            }
        }

        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.className = 'card mt-2 ' + (isPassed ? 'subcard-success' : 'subcard-warn');
            const pct = Math.round((examCorrect / totalWords) * 100);

            resultBox.innerHTML = `
                <div class="bold" style="font-size:16px;">${isPassed ? (t('dosaaf.exam_passed_title') || '✓ Зачёт сдан!') : (t('dosaaf.exam_failed_title') || '✗ Зачёт не сдан')}</div>
                <p class="muted mt-1" style="font-size:13px; line-height:1.5;">
                    Результат: <b>${examCorrect} из ${totalWords} слов</b> (${pct}%) на скорости <b>${currentWpm} WPM</b>.<br>
                    ${isPassed 
                        ? (currentStageNum < 7 
                            ? '<b>Поздравляем!</b> Зачёт успешно сдан, следующая ступень программы ДОСААФ открыта!' 
                            : '<b>Поздравляем!</b> Полный курс ДОСААФ успешно завершён!')
                        : 'Для зачёта необходимо принять верно минимум ' + passThreshold + ' из ' + totalWords + ' слов (80%). Потренируйтесь на словах и повторите зачёт.'}
                </p>
                ${examXpEarned > 0 ? `
                    <div class="mt-2 p-2" style="background:var(--surface-2); border-radius:var(--radius-sm); border-left:3px solid var(--accent); font-size:13px; font-weight:600;">
                        ✨ <b>+${examXpEarned} XP</b> получено за зачёт ${isPassed ? '(включая бонус +25 XP за сдачу ступени)' : ''}
                    </div>
                ` : ''}
                ${isPassed ? `
                    <div class="mt-3">
                        ${currentStageNum < 7 ? `
                            <button type="button" class="btn btn-primary" id="dosaaf-next-stage-btn" style="width:100%; font-size:15px; padding:12px 18px; font-weight:700;">
                                Перейти к Ступени ${currentStageNum + 1} ➔
                            </button>
                        ` : `
                            <button type="button" class="btn btn-primary" id="dosaaf-view-rank-btn" style="width:100%; font-size:15px; padding:12px 18px; font-weight:700;">
                                🏆 Посмотреть мою классность ДОСААФ ➔
                            </button>
                        `}
                    </div>
                ` : `
                    <div class="mt-3">
                        <button type="button" class="btn btn-outline" id="dosaaf-retry-exam-btn" style="width:100%; padding:10px 16px;">
                            Повторить зачёт
                        </button>
                    </div>
                `}
            `;

            document.getElementById('dosaaf-next-stage-btn')?.addEventListener('click', () => {
                goToStage(currentStageNum + 1);
            });
            document.getElementById('dosaaf-view-rank-btn')?.addEventListener('click', () => {
                switchToSubTab('ranks', true);
            });
            document.getElementById('dosaaf-retry-exam-btn')?.addEventListener('click', () => {
                startStageExam();
            });
        }
    }

    // =========================================================================
    // 4. КЛАССНОСТЬ ДОСААФ (Интерактивная оценка квалификации)
    // =========================================================================
    function computeCurrentRank() {
        // Присвоение классности радиоспециалиста ДОСААФ (по ЕВСК):
        // Обязательное условие: освоение полного курса (все 7 ступеней: буквы и цифры).
        // Класс определяется нормативной скоростью сдачи зачёта 7-й ступени.
        const stage7Exam = examPassed[7];
        if (stage7Exam) {
            const wpm7 = stage7Exam.wpm || 0;
            if (wpm7 >= 28) return 'master'; // 120+ зн/мин
            if (wpm7 >= 24) return 'class1'; // 100+ зн/мин
            if (wpm7 >= 19) return 'class2'; // 80+ зн/мин
            if (wpm7 >= 14) return 'class3'; // 60+ зн/мин
        }
        // Курсант: в процессе обучения (ступени 1-7)
        return 'cadet';
    }

    function renderRanksView() {
        const currentRankCard = document.getElementById('dosaaf-current-rank-card');
        const container = document.getElementById('dosaaf-ranks-list');
        if (!container) return;
        container.innerHTML = '';

        const activeRankId = computeCurrentRank();
        const activeRank = DOSAAF_RANKS.find(r => r.id === activeRankId) || DOSAAF_RANKS[0];

        if (currentRankCard) {
            currentRankCard.innerHTML = `
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <span class="muted small text-uppercase" style="letter-spacing:1px; font-weight:700;">${t('dosaaf.rank_current') || 'Текущее звание'}</span>
                        <h3 class="mt-0 mb-0" style="font-size:18px; color:var(--accent);">${activeRank.title}</h3>
                        <div class="muted mt-1" style="font-size:13px;">${activeRank.description}</div>
                    </div>
                    <span class="badge" style="font-size:14px; font-weight:800; padding:6px 14px; background:var(--accent); color:#1a1200;">${activeRank.badge}</span>
                </div>
            `;
        }

        DOSAAF_RANKS.forEach(rk => {
            const card = document.createElement('div');
            card.className = 'card mt-2';
            card.style.background = 'var(--surface-2)';

            // Проверяем, выполнено ли условие для этого ранга
            let isAchieved = false;
            let statusText = '';
            let statusBadge = '';

            if (rk.id === 'cadet') {
                isAchieved = true;
                statusBadge = `<span class="badge" style="background:rgba(74, 222, 128, 0.15); color:var(--success);">${t('dosaaf.rank_achieved') || '✓ Присвоено'}</span>`;
            } else {
                const stage7Exam = examPassed[7];
                if (stage7Exam && stage7Exam.wpm >= rk.minSpeedWpm) {
                    isAchieved = true;
                    statusBadge = `<span class="badge" style="background:rgba(74, 222, 128, 0.15); color:var(--success);">${t('dosaaf.rank_achieved') || '✓ Присвоено'}</span>`;
                } else {
                    const reqInfo = (t('dosaaf.rank_req_info') || 'Требуется: сдать зачёт полного курса (все 7 ступеней) со скоростью ≥ {wpm} WPM ({cpm} зн/мин).')
                        .replace('{stage}', rk.requiredStage)
                        .replace('{wpm}', rk.minSpeedWpm)
                        .replace('{cpm}', rk.minSpeedCpm);
                    statusBadge = `<span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text-muted);">${t('dosaaf.rank_locked') || '🔒 Не выполнено'}</span>`;
                    statusText = `<div class="muted small mt-1" style="color:var(--accent);">${reqInfo}</div>`;
                }
            }

            card.innerHTML = `
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div class="bold" style="font-size:15px; color:${isAchieved ? 'var(--text)' : 'var(--text-muted)'};">${rk.title}</div>
                        <div class="muted mt-1" style="font-size:13px;">${rk.description}</div>
                        ${statusText}
                    </div>
                    ${statusBadge}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // =========================================================================
    // 5. ЭКРАННАЯ КЛАВИАТУРА ДЛЯ ТЕЛЕФОНА (Mobile-Friendly Keypad)
    // =========================================================================
    function buildMobileKeypad(containerId, inputId, checkCallback) {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        if (!container || !input) return;

        container.innerHTML = '';
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const chars = stageData.allLetters;

        // Формируем аккуратные ряды кнопок (по 6-8 кнопок в ряду)
        const row1 = document.createElement('div');
        row1.className = 'dosaaf-kbd-row';

        const row2 = document.createElement('div');
        row2.className = 'dosaaf-kbd-row';

        const row3 = document.createElement('div');
        row3.className = 'dosaaf-kbd-row';

        const mid = Math.ceil(chars.length / 2);
        const firstHalf = chars.slice(0, mid);
        const secondHalf = chars.slice(mid);

        firstHalf.forEach(ch => {
            const btn = createKeyBtn(ch, () => appendCharToInput(input, ch));
            row1.appendChild(btn);
        });

        secondHalf.forEach(ch => {
            const btn = createKeyBtn(ch, () => appendCharToInput(input, ch));
            row2.appendChild(btn);
        });

        // Служебные кнопки в третьем ряду: Стереть символ (Backspace) и Очистить всё (Clear all)
        const backspaceBtn = document.createElement('div');
        backspaceBtn.className = 'dosaaf-key dosaaf-key-action';
        backspaceBtn.innerHTML = t('dosaaf.btn_backspace') || '⌫ Стереть';
        backspaceBtn.title = t('dosaaf.btn_backspace_title') || 'Стереть последний символ';
        backspaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            input.value = input.value.slice(0, -1);
            input.dispatchEvent(new Event('input'));
        });

        const clearBtn = document.createElement('div');
        clearBtn.className = 'dosaaf-key dosaaf-key-action dosaaf-key-clear';
        clearBtn.innerHTML = t('dosaaf.btn_clear') || '✕ Очистить всё';
        clearBtn.title = t('dosaaf.btn_clear_title') || 'Очистить всё введённое поле';
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            input.value = '';
            input.dispatchEvent(new Event('input'));
        });

        row3.appendChild(backspaceBtn);
        row3.appendChild(clearBtn);

        if (row1.children.length > 0) container.appendChild(row1);
        if (row2.children.length > 0) container.appendChild(row2);
        container.appendChild(row3);
    }

    function createKeyBtn(ch, clickHandler) {
        const btn = document.createElement('div');
        btn.className = 'dosaaf-key';
        btn.textContent = ch;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            clickHandler();
        });
        return btn;
    }

    function appendCharToInput(input, ch) {
        input.value += ch;
    }

    // =========================================================================
    // 6. АВТОПЕРЕВОД РАСКЛАДКИ EN -> RU С ПРЕДУПРЕЖДЕНИЕМ
    // =========================================================================
    function setupInputTransliteration() {
        const wordInput = document.getElementById('dosaaf-word-input');
        const wordWarn = document.getElementById('dosaaf-words-layout-warn');

        const examInput = document.getElementById('dosaaf-exam-input');
        const examWarn = document.getElementById('dosaaf-exam-layout-warn');

        if (wordInput) {
            wordInput.addEventListener('input', () => {
                handleTranslit(wordInput, wordWarn);
            });
        }
        if (examInput) {
            examInput.addEventListener('input', () => {
                handleTranslit(examInput, examWarn);
            });
        }
    }

    function handleTranslit(inputEl, warnEl) {
        const val = inputEl.value;
        let converted = '';
        let hadEnglish = false;

        for (let i = 0; i < val.length; i++) {
            const ch = val[i];
            if (LAYOUT_EN_TO_RU[ch]) {
                converted += LAYOUT_EN_TO_RU[ch];
                hadEnglish = true;
            } else {
                converted += ch.toUpperCase();
            }
        }

        if (converted !== val) {
            inputEl.value = converted;
        }

        if (warnEl) {
            if (hadEnglish) {
                warnEl.style.display = 'block';
                warnEl.textContent = t('dosaaf.layout_warn') || '⚠️ Включена английская раскладка — символы автоматически вводятся в русской раскладке';
            } else {
                warnEl.style.display = 'none';
            }
        }
    }

    // =========================================================================
    // 7. ЗВУКОВОЙ ДВИЖОК
    // =========================================================================
    function playDosaafSound(text) {
        if (!text) return;
        const lamp = getDosaafLamp();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        if (lamp) {
            lamp.off();
        }
        const wpm = getDosaafWpm();
        currentAudio = new MorseAudio({ wpm });
        isWordPlaying = true;

        currentAudio.play(text, {
            onSymbol: ({ symbol, durationMs }) => {
                if (lamp) {
                    lamp.flash(durationMs);
                }
            },
            onDone: () => {
                isWordPlaying = false;
                if (lamp) {
                    lamp.off();
                }
                currentAudio = null;
            }
        });
    }

    function getStageCpmType(stageNum) {
        if (stageNum === 6) return 'digits';
        if (stageNum === 7) return 'mixed';
        return 'letters';
    }

    function updateSpeedCpmHint() {
        const slider = document.getElementById('dosaaf-wpm');
        const valEl = document.getElementById('dosaaf-wpm-val');
        const cpmEl = document.getElementById('dosaaf-wpm-cpm');
        if (!slider) return;
        const w = parseInt(slider.value, 10) || 12;
        if (valEl) valEl.textContent = w;
        if (cpmEl) {
            const cpmType = getStageCpmType(currentStageNum);
            cpmEl.dataset.cpmType = cpmType;
            cpmEl.textContent = (typeof cpmHintText === 'function')
                ? cpmHintText(w, cpmType)
                : `≈${Math.round(w * (cpmType === 'digits' ? 2.90 : (cpmType === 'mixed' ? 3.65 : 4.22)))} зн/мин`;
        }
    }

    // Регулятор скорости
    function setupSpeedControl() {
        const slider = document.getElementById('dosaaf-wpm');
        if (!slider) return;

        const saved = localStorage.getItem('morse_dosaaf_wpm');
        if (saved) {
            slider.value = saved;
        }
        updateSpeedCpmHint();

        slider.addEventListener('input', () => {
            updateSpeedCpmHint();
            localStorage.setItem('morse_dosaaf_wpm', slider.value);
        });
    }

    // Инициализация при загрузке документа
    window.addEventListener('DOMContentLoaded', () => {
        initDosaafMode();

        const startWordsBtn = document.getElementById('dosaaf-start-words-btn');
        const playBtn = document.getElementById('dosaaf-play-word-btn');
        const checkBtn = document.getElementById('dosaaf-check-word-btn');
        const nextBtn = document.getElementById('dosaaf-next-word-btn');
        const wordInput = document.getElementById('dosaaf-word-input');

        startWordsBtn?.addEventListener('click', startWordsTraining);
        playBtn?.addEventListener('click', playCurrentWord);
        checkBtn?.addEventListener('click', checkWordAnswer);
        nextBtn?.addEventListener('click', () => nextWord(true));

        wordInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkWordAnswer();
            }
        });

        const startExamBtn = document.getElementById('dosaaf-start-exam-btn');
        const examCheckBtn = document.getElementById('dosaaf-exam-check-btn');
        const examInput = document.getElementById('dosaaf-exam-input');
        const examPlayBtn = document.getElementById('dosaaf-exam-play-btn');

        startExamBtn?.addEventListener('click', startStageExam);
        examCheckBtn?.addEventListener('click', checkExamAnswer);
        examPlayBtn?.addEventListener('click', () => {
            if (examActive && examWords[examIndex]) {
                playDosaafSound(examWords[examIndex]);
            }
        });
        examInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkExamAnswer();
            }
        });
    });

    window.initDosaafMode = initDosaafMode;
})();

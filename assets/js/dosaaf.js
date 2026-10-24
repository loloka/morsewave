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
    let wordsStartTime = 0;
    let lastWordsTickTime = 0;
    let wordsSessionDurationSec = 0;
    let examStartTime = 0;

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

    // Загрузка и сохранение состояния (с поддержкой облачной синхронизации Progress)
    function loadDosaafProgress() {
        try {
            // Однократный принудительный сброс ступеней для всех пользователей в связи с переходом на непрерывные радиограммы
            const DOSAAF_RESET_VER = '2026-10-19-v3';
            const migrationDone = localStorage.getItem('morse_dosaaf_migration_ver');
            if (migrationDone !== DOSAAF_RESET_VER) {
                localStorage.setItem('morse_dosaaf_migration_ver', DOSAAF_RESET_VER);
                localStorage.setItem('morse_dosaaf_max_stage', '1');
                localStorage.setItem('morse_dosaaf_current_stage', '1');
                localStorage.removeItem('morse_dosaaf_exam_passed');
                localStorage.removeItem('morse_dosaaf_stage_words_done');

                if (typeof Progress !== 'undefined' && Progress.load && Progress.save) {
                    try {
                        const p = Progress.load();
                        if (p) {
                            p.dosaaf = {
                                ...(p.dosaaf || {}),
                                maxStage: 1,
                                currentStage: 1,
                                examVer: 2,
                                examPassed: {},
                                stageWordsDone: {},
                            };
                            Progress.save(p);
                            if (typeof Progress.pushNow === 'function') {
                                Progress.pushNow();
                            }
                        }
                    } catch (_) {}
                }
            }

            let prog = null;
            if (typeof Progress !== 'undefined' && Progress.load) {
                prog = Progress.load()?.dosaaf;
            }

            const examVer = Number(prog?.examVer) || 0;
            if (examVer < 2) {
                // Если данные ещё старые (v1 без непрерывной радиограммы), принудительно ограничиваем 1-й ступенью
                maxUnlockedStage = 1;
                currentStageNum = 1;
                examPassed = {};
                stageWordsDone = {};
            } else {
                const lsMax = parseInt(localStorage.getItem('morse_dosaaf_max_stage'), 10) || 1;
                maxUnlockedStage = Math.max(lsMax, parseInt(prog?.maxStage, 10) || 1);

                const lsSaved = parseInt(localStorage.getItem('morse_dosaaf_current_stage'), 10) || 1;
                const currentCandidate = Math.max(lsSaved, parseInt(prog?.currentStage, 10) || 1);
                currentStageNum = Math.min(Math.max(currentCandidate, 1), maxUnlockedStage);

                const rawWords = localStorage.getItem('morse_dosaaf_stage_words_done');
                const lsWords = rawWords ? JSON.parse(rawWords) : {};
                stageWordsDone = { ...(prog?.stageWordsDone || {}), ...lsWords };

                const rawExams = localStorage.getItem('morse_dosaaf_exam_passed');
                const lsExams = rawExams ? JSON.parse(rawExams) : {};
                examPassed = { ...(prog?.examPassed || {}), ...lsExams };
            }

            const rawListened = localStorage.getItem('morse_dosaaf_listened_letters');
            const lsListened = rawListened ? JSON.parse(rawListened) : [];
            const progListened = Array.isArray(prog?.listenedLetters) ? prog.listenedLetters : [];
            listenedLetters = new Set([...lsListened, ...progListened]);
        } catch (_) {
            maxUnlockedStage = 1;
            currentStageNum = 1;
            listenedLetters = new Set();
            stageWordsDone = {};
            examPassed = {};
        }
    }

    function resetAllDosaafProgress() {
        maxUnlockedStage = 1;
        currentStageNum = 1;
        examPassed = {};
        stageWordsDone = {};
        localStorage.setItem('morse_dosaaf_max_stage', '1');
        localStorage.setItem('morse_dosaaf_current_stage', '1');
        localStorage.removeItem('morse_dosaaf_exam_passed');
        localStorage.removeItem('morse_dosaaf_stage_words_done');

        if (typeof Progress !== 'undefined' && Progress.load && Progress.save) {
            try {
                const p = Progress.load();
                if (p) {
                    p.dosaaf = {
                        ...(p.dosaaf || {}),
                        maxStage: 1,
                        currentStage: 1,
                        examVer: 2,
                        stageWordsDone: {},
                        examPassed: {},
                    };
                    Progress.save(p);
                    if (typeof Progress.pushNow === 'function') {
                        Progress.pushNow();
                    }
                }
            } catch (_) {}
        }

        saveDosaafProgress();
        renderStageNav();
        renderCurrentStage();
        switchToSubTab('napevs', true);
    }

    function saveDosaafProgress() {
        try {
            localStorage.setItem('morse_dosaaf_max_stage', String(maxUnlockedStage));
            localStorage.setItem('morse_dosaaf_current_stage', String(currentStageNum));
            localStorage.setItem('morse_dosaaf_listened_letters', JSON.stringify([...listenedLetters]));
            localStorage.setItem('morse_dosaaf_stage_words_done', JSON.stringify(stageWordsDone));
            localStorage.setItem('morse_dosaaf_exam_passed', JSON.stringify(examPassed));

            if (typeof Progress !== 'undefined' && Progress.load && Progress.save) {
                const pState = Progress.load();
                pState.dosaaf = {
                    maxStage: maxUnlockedStage,
                    currentStage: currentStageNum,
                    examVer: 2,
                    listenedLetters: [...listenedLetters],
                    stageWordsDone: stageWordsDone,
                    examPassed: examPassed,
                };
                Progress.save(pState);
                if (typeof Progress.pushNow === 'function') {
                    Progress.pushNow();
                } else if (typeof Progress.pushFullProgress === 'function') {
                    Progress.pushFullProgress();
                }
            }
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
        wordsStartTime = Date.now();
        lastWordsTickTime = Date.now();
        wordsSessionDurationSec = 0;
        const startBox = document.getElementById('dosaaf-words-start-box');
        const playBox = document.getElementById('dosaaf-words-play-box');
        const wordsDailyBlock = document.getElementById('dosaaf-words-daily-time-block');
        if (wordsDailyBlock) wordsDailyBlock.style.display = 'none';
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
                const doneTitle = document.getElementById('dosaaf-words-done-title');
                if (doneTitle) {
                    doneTitle.textContent = (t('dosaaf.words_goal_reached_title') || '🎯 Норма выполнена: принято {target} слов!').replace('{target}', target);
                }
                if (typeof Progress !== 'undefined' && typeof Progress.renderTrainingSummary === 'function') {
                    Progress.renderTrainingSummary('dosaaf-words-daily-time-block', wordsSessionDurationSec);
                }
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

        if (lastWordsTickTime) {
            const now = Date.now();
            const delta = Math.round((now - lastWordsTickTime) / 1000);
            if (delta >= 1 && delta <= 120) {
                wordsSessionDurationSec += delta;
                if (typeof Progress !== 'undefined') {
                    Progress.addTrainingTime(delta);
                }
            }
            lastWordsTickTime = now;
        }

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
                // Серия дней (стрик) засчитывается при приёме 5 верных слов
                if (wordSessionCorrect >= 5) {
                    Progress.markDailyActivity();
                }
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
    // 3. ЗАЧЁТ СТУПЕНИ (10, 30 или 50 контрольных слов/групп, 80% порог)
    // =========================================================================
    function getExamLength() {
        const saved = parseInt(localStorage.getItem('morse_dosaaf_exam_length'), 10);
        if (saved === 30 || saved === 50) return saved;
        // Для 7-й ступени (квалификация ДОСААФ) по умолчанию предлагаем радиограмму 30 групп, если явно не выбрано 10
        if (currentStageNum === 7 && saved !== 10) return 30;
        return 10;
    }

    function updateExamDescription(targetLength) {
        const descEl = document.getElementById('dosaaf-exam-desc');
        if (!descEl) return;

        const threshold = Math.ceil(targetLength * 0.8);
        const isStage7 = currentStageNum === 7;

        if (targetLength === 10) {
            if (isStage7) {
                descEl.innerHTML = (t('dosaaf.exam_desc_10_stage7') || `Примите комплексную радиограмму из <b>10 контрольных слов и чисел</b> со всего курса (экспресс-зачёт). Для сдачи курса необходимо верно принять минимум <b>{threshold} из 10 слов/групп</b> (80%). <i>Примечание: для подтверждения звания радиотелеграфиста ДОСААФ выберите радиограмму от 30 групп.</i>`).replace('{threshold}', threshold);
            } else {
                descEl.innerHTML = (t('dosaaf.exam_desc_10_default') || `Примите <b>10 контрольных слов</b> подряд. Для сдачи зачёта и открытия следующей ступени необходимо верно принять минимум <b>{threshold} из 10 слов</b> (80%). Бонус: <b>+25 XP</b>.`).replace('{threshold}', threshold);
            }
        } else if (targetLength === 30) {
            if (isStage7) {
                descEl.innerHTML = (t('dosaaf.exam_desc_30_stage7') || `Примите классическую <b>комплексную радиограмму ДОСААФ из 30 групп</b> (~2.5 мин непрерывного приёма). ⚠️ <b>Внимание:</b> радиограмма включает полный курс — смысловые слова из всех 31 буквы алфавита, радиокоды и пятизначные цифровые радиогруппы, как на настоящих экзаменах ДОСААФ! Для получения звания «Радиотелеграфист 3-го, 2-го или 1-го класса» примите верно минимум <b>{threshold} из 30 групп</b> (80%). Бонус: <b>+50 XP</b>.`).replace('{threshold}', threshold);
            } else {
                descEl.innerHTML = (t('dosaaf.exam_desc_30_default') || `Примите зачётную <b>радиограмму ДОСААФ из 30 слов</b> (~2.5 мин непрерывного приёма). Для успешной сдачи зачёта необходимо верно принять минимум <b>{threshold} из 30 слов</b> (80%). Бонус: <b>+50 XP</b>.`).replace('{threshold}', threshold);
            }
        } else if (targetLength === 50) {
            if (isStage7) {
                descEl.innerHTML = (t('dosaaf.exam_desc_50_stage7') || `Примите полный <b>квалификационный радиомарафон из 50 групп</b> (~4.5 мин непрерывного приёма). ⚠️ <b>Внимание:</b> марафон охватывает всю программу радиошколы — слова из всех 31 буквы алфавита, радиокоды и 5-значные цифровые радиогруппы ДОСААФ. Сдача этого марафона со скоростью от 28 WPM (120 зн/мин) необходима для высшего звания <b>«Мастер радиосвязи ДОСААФ»</b> (минимум <b>{threshold} из 50 групп</b> / 80%). Бонус: <b>+100 XP</b>.`).replace('{threshold}', threshold);
            } else {
                descEl.innerHTML = (t('dosaaf.exam_desc_50_default') || `Примите зачётный <b>радиомарафон из 50 слов</b> (~4.5 мин на выносливость). Для успешной сдачи зачёта необходимо верно принять минимум <b>{threshold} из 50 слов</b> (80%). Бонус: <b>+100 XP</b>.`).replace('{threshold}', threshold);
            }
        }
    }

    function setExamLength(len) {
        localStorage.setItem('morse_dosaaf_exam_length', len);
        document.querySelectorAll('#dosaaf-exam-length-chips .chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.length, 10) === len);
        });
        updateExamDescription(len);
    }

    function generateStageExamWords(stageData, targetLength) {
        const result = [];
        const pool = [...stageData.words].sort(() => Math.random() - 0.5);

        if (stageData.stage === 7) {
            // Комплексная зачётная радиограмма полного курса ДОСААФ:
            // сбалансированное сочетание смысловых слов всех ступеней, радиокодов и 5-значных цифровых групп
            while (result.length < targetLength) {
                if (pool.length > 0) {
                    result.push(pool.pop());
                } else {
                    // При нехватке слов (например, при 50 группах) чередуем слова курса и 5-значные группы
                    if (Math.random() < 0.45) {
                        const allStagesWords = DOSAAF_STAGES.flatMap(s => s.words);
                        result.push(allStagesWords[Math.floor(Math.random() * allStagesWords.length)]);
                    } else {
                        const group = Math.floor(10000 + Math.random() * 90000).toString();
                        result.push(group);
                    }
                }
            }
        } else {
            // Для буквенных ступеней 1-6
            while (result.length < targetLength) {
                if (pool.length === 0) {
                    pool.push(...stageData.words.sort(() => Math.random() - 0.5));
                }
                result.push(pool.pop());
            }
        }
        return result.slice(0, targetLength);
    }

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

        const currentLen = getExamLength();
        document.querySelectorAll('#dosaaf-exam-length-chips .chip').forEach(c => {
            c.classList.toggle('active', parseInt(c.dataset.length, 10) === currentLen);
        });
        updateExamDescription(currentLen);

        buildMobileKeypad('dosaaf-exam-kbd', 'dosaaf-exam-input', checkExamAnswer, { showSpace: true });
    }

    let examAudioPlaying = false;
    let examDelayTimer = null;

    function stopExamAudio() {
        examAudioPlaying = false;
        if (examDelayTimer) {
            clearTimeout(examDelayTimer);
            examDelayTimer = null;
        }
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        if (dosaafLamp) {
            dosaafLamp.off();
        }
    }

    function delayExam(ms) {
        return new Promise((resolve) => {
            if (!examAudioPlaying) return resolve();
            examDelayTimer = setTimeout(() => {
                examDelayTimer = null;
                resolve();
            }, ms);
        });
    }

    function playExamMorseChunk(text) {
        return new Promise((resolve) => {
            if (!examAudioPlaying) return resolve();
            const lamp = getDosaafLamp();
            const wpm = getDosaafWpm();
            currentAudio = new MorseAudio({ wpm });
            currentAudio.play(text, {
                onSymbol: ({ durationMs }) => {
                    if (lamp) lamp.flash(durationMs);
                },
                onDone: () => {
                    if (lamp) lamp.off();
                    currentAudio = null;
                    resolve();
                }
            });
        });
    }

    async function runDosaafExamPlayback() {
        stopExamAudio();
        examAudioPlaying = true;

        const progressEl = document.getElementById('dosaaf-exam-progress');
        const statusEl = document.getElementById('dosaaf-exam-audio-status');
        const playBtn = document.getElementById('dosaaf-exam-play-btn');
        const checkBtn = document.getElementById('dosaaf-exam-check-btn');

        if (playBtn) playBtn.disabled = true;

        // 1. Позывной готовности VVV = (военный настроечный сигнал ДОСААФ «ЖЖЖ=»)
        if (progressEl) progressEl.textContent = `VVV =`;
        if (statusEl) {
            statusEl.innerHTML = `📻 Настроечный сигнал: <b>ЖЖЖ = (VVV =)</b>. Приготовьтесь к приёму радиограммы!`;
        }

        await playExamMorseChunk('VVV=');
        if (!examAudioPlaying) {
            if (playBtn) playBtn.disabled = false;
            return;
        }

        // Пауза перед началом передачи радиограммы (~1.4 секунды)
        await delayExam(1400);
        if (!examAudioPlaying) {
            if (playBtn) playBtn.disabled = false;
            return;
        }

        // 2. Непрерывная передача радиограммы
        const total = examWords.length;
        const wpm = getDosaafWpm();
        const unitMs = 1200 / wpm;
        const wordGapMs = Math.round(unitMs * 7);

        for (let i = 0; i < total; i++) {
            if (!examAudioPlaying) break;
            const word = examWords[i];

            if (progressEl) progressEl.textContent = `${i + 1} / ${total}`;
            if (statusEl) {
                statusEl.innerHTML = `🎧 Передача радиограммы: группа <b>${i + 1}</b> из <b>${total}</b>`;
            }

            await playExamMorseChunk(word);
            if (!examAudioPlaying) break;

            if (i < total - 1) {
                await delayExam(wordGapMs);
            }
        }

        if (examAudioPlaying) {
            if (statusEl) {
                statusEl.innerHTML = `✓ Передача радиограммы завершена! Проверьте текст и нажмите <b>«Проверить радиограмму»</b>`;
            }
            if (checkBtn) {
                checkBtn.classList.add('pulse-attention');
            }
        }

        examAudioPlaying = false;
        if (playBtn) playBtn.disabled = false;
    }

    function abortStageExam() {
        if (examStartTime) {
            const dur = Math.round((Date.now() - examStartTime) / 1000);
            if (dur >= 3 && typeof Progress !== 'undefined') {
                Progress.addTrainingTime(dur);
            }
            examStartTime = 0;
        }
        stopExamAudio();
        examActive = false;
        const panel = document.getElementById('dosaaf-exam-panel');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');
        const lengthWrapper = document.getElementById('dosaaf-exam-length-wrapper');
        const statusEl = document.getElementById('dosaaf-exam-audio-status');

        if (panel) panel.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (lengthWrapper) lengthWrapper.style.display = 'block';
        if (statusEl) statusEl.textContent = '';
        const examDailyBlock = document.getElementById('dosaaf-exam-daily-time-block');
        if (examDailyBlock) examDailyBlock.style.display = 'none';
    }

    function startStageExam() {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const targetLength = getExamLength();
        
        examWords = generateStageExamWords(stageData, targetLength);
        examActive = true;
        examStartTime = Date.now();

        const panel = document.getElementById('dosaaf-exam-panel');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');
        const lengthWrapper = document.getElementById('dosaaf-exam-length-wrapper');
        const resultBox = document.getElementById('dosaaf-exam-result');
        const checkBtn = document.getElementById('dosaaf-exam-check-btn');
        const examDailyBlock = document.getElementById('dosaaf-exam-daily-time-block');

        if (panel) panel.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';
        if (lengthWrapper) lengthWrapper.style.display = 'none';
        if (resultBox) resultBox.style.display = 'none';
        if (examDailyBlock) examDailyBlock.style.display = 'none';
        if (checkBtn) {
            checkBtn.classList.remove('pulse-attention');
            checkBtn.disabled = false;
        }

        const input = document.getElementById('dosaaf-exam-input');
        if (input) {
            input.value = '';
            input.disabled = false;
            if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                input.focus();
            }
        }

        const warnEl = document.getElementById('dosaaf-exam-layout-warn');
        if (warnEl) warnEl.style.display = 'none';

        buildMobileKeypad('dosaaf-exam-kbd', 'dosaaf-exam-input', checkExamAnswer, { showSpace: true });

        runDosaafExamPlayback();
    }

    function alignWordSequences(expected, typed) {
        const n = expected.length;
        const m = typed.length;
        const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                if (expected[i] === typed[j]) {
                    dp[i + 1][j + 1] = dp[i][j] + 1;
                } else {
                    dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j]);
                }
            }
        }

        let i = n, j = m;
        const alignment = [];

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && expected[i - 1] === typed[j - 1]) {
                alignment.unshift({ expected: expected[i - 1], typed: typed[j - 1], status: 'ok' });
                i--;
                j--;
            } else if (i > 0 && j > 0 && dp[i - 1][j] === dp[i][j - 1]) {
                alignment.unshift({ expected: expected[i - 1], typed: typed[j - 1], status: 'wrong' });
                i--;
                j--;
            } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
                alignment.unshift({ expected: expected[i - 1], typed: '', status: 'missing' });
                i--;
            } else {
                alignment.unshift({ expected: '', typed: typed[j - 1], status: 'extra' });
                j--;
            }
        }

        let correctCount = 0;
        alignment.forEach(item => {
            if (item.status === 'ok') correctCount++;
        });

        return { alignment, correctCount };
    }

    function checkExamAnswer() {
        if (!examActive) return;
        stopExamAudio();

        const input = document.getElementById('dosaaf-exam-input');
        if (!input) return;

        const typedText = input.value.trim().toUpperCase();
        const typedWords = typedText.split(/\s+/).filter(Boolean);

        const { alignment, correctCount } = alignWordSequences(examWords, typedWords);

        finishStageExam(alignment, correctCount, typedWords);
    }

    function finishStageExam(alignment, correctCount, typedWords) {
        examActive = false;
        stopExamAudio();

        const examDur = examStartTime ? Math.round((Date.now() - examStartTime) / 1000) : 0;
        examStartTime = 0;
        if (examDur >= 3 && typeof Progress !== 'undefined') {
            Progress.addTrainingTime(examDur);
        }

        const panel = document.getElementById('dosaaf-exam-panel');
        const resultBox = document.getElementById('dosaaf-exam-result');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');
        const lengthWrapper = document.getElementById('dosaaf-exam-length-wrapper');

        if (panel) panel.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (lengthWrapper) lengthWrapper.style.display = 'block';

        const totalWords = examWords.length || 10;
        const passThreshold = Math.ceil(totalWords * 0.8); // 80% порог
        const isPassed = correctCount >= passThreshold;
        const currentWpm = getDosaafWpm();
        const passBonus = totalWords >= 50 ? 100 : (totalWords >= 30 ? 50 : 25);

        // Расчёт XP за верно принятые группы
        let wordXpSum = 0;
        alignment.forEach(item => {
            if (item.status === 'ok') {
                wordXpSum += Math.max(2, Math.round(item.expected.length * 1.2));
            }
        });

        let totalXpEarned = wordXpSum;
        if (isPassed) {
            totalXpEarned += passBonus;
        }

        if (typeof Progress !== 'undefined' && totalXpEarned > 0) {
            Progress.addXp(totalXpEarned);
            Progress.logXp(totalXpEarned, isPassed ? 'dosaaf_exam_pass' : 'dosaaf_exam_words');
            if (isPassed) {
                Progress.markDailyActivity();
                if (typeof Progress.incrementStat === 'function') {
                    Progress.incrementStat('examsPassed', 1);
                }
                if (typeof Progress.checkAchievements === 'function') {
                    Progress.checkAchievements();
                }
            }
        }

        if (isPassed) {
            const prev = examPassed[currentStageNum] || {};
            const records = prev.records || {};
            records[totalWords] = Math.max(records[totalWords] || 0, currentWpm);

            examPassed[currentStageNum] = {
                score: Math.max(prev?.score || 0, correctCount),
                total: totalWords,
                wpm: Math.max(prev?.wpm || 0, currentWpm),
                maxPassedWords: Math.max(prev?.maxPassedWords || 0, totalWords),
                records: records,
                date: new Date().toISOString()
            };

            if (currentStageNum === maxUnlockedStage && maxUnlockedStage < 7) {
                maxUnlockedStage++;
            }
            saveDosaafProgress();
            renderStageNav();
        }

        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.className = 'card mt-2 ' + (isPassed ? 'subcard-success' : 'subcard-warn');
            const pct = Math.round((correctCount / totalWords) * 100);

            // Формируем наглядную раскладку принятой радиограммы
            const breakdownHtml = alignment.map((item, idx) => {
                if (item.status === 'ok') {
                    const titleStr = (t('dosaaf.exam_group_ok') || 'Группа {n}: Верно').replace('{n}', idx + 1);
                    return `<span style="display:inline-block; margin:2px 4px; padding:3px 7px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.4); border-radius:4px; font-family:monospace; font-weight:700; color:var(--text); font-size:13px;" title="${titleStr}">✓ ${item.expected}</span>`;
                } else if (item.status === 'wrong') {
                    const titleStr = (t('dosaaf.exam_group_mismatch') || 'Ожидалось: {expected}, получено: {typed}').replace('{expected}', item.expected).replace('{typed}', item.typed);
                    return `<span style="display:inline-block; margin:2px 4px; padding:3px 7px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:4px; font-family:monospace; font-size:13px;" title="${titleStr}">✗ <s>${item.typed}</s> <span style="color:var(--success); font-weight:700;">${item.expected}</span></span>`;
                } else if (item.status === 'missing') {
                    const titleStr = t('dosaaf.exam_group_missing') || 'Группа пропущена';
                    const lblStr = t('dosaaf.exam_label_missing') || '(пропуск)';
                    return `<span style="display:inline-block; margin:2px 4px; padding:3px 7px; background:rgba(239,68,68,0.12); border:1px dashed rgba(239,68,68,0.5); border-radius:4px; font-family:monospace; font-size:13px;" title="${titleStr}">✗ <span style="color:var(--danger); font-weight:700;">${item.expected}</span> <small style="opacity:0.7;">${lblStr}</small></span>`;
                } else if (item.status === 'extra') {
                    const titleStr = t('dosaaf.exam_group_extra') || 'Лишняя группа';
                    const lblStr = t('dosaaf.exam_label_extra') || '(лишняя)';
                    return `<span style="display:inline-block; margin:2px 4px; padding:3px 7px; background:rgba(234,179,8,0.15); border:1px solid rgba(234,179,8,0.4); border-radius:4px; font-family:monospace; font-size:13px;" title="${titleStr}">+ <span style="color:#eab308;">${item.typed}</span> <small style="opacity:0.7;">${lblStr}</small></span>`;
                }
            }).join(' ');

            const examSummaryTpl = t('dosaaf.exam_result_summary') || 'Результат: <b>{correct} из {total} групп</b> ({pct}%) на скорости <b>{wpm} WPM</b>';
            const failHintTpl = t('dosaaf.exam_fail_hint') || 'Для зачёта необходимо принять верно минимум {threshold} из {total} групп (80%). Попробуйте ещё раз!';
            const summaryHtml = examSummaryTpl
                .replace('{correct}', correctCount)
                .replace('{total}', totalWords)
                .replace('{pct}', pct)
                .replace('{wpm}', currentWpm)
                .replace('{cpm}', Math.round(currentWpm * 4.22));

            const passMsgHtml = isPassed 
                ? (currentStageNum < 7 
                    ? (t('dosaaf.exam_congrats_stage') || '<b>Поздравляем!</b> Радиограмма принята, следующая ступень программы ДОСААФ открыта!') 
                    : (t('dosaaf.exam_congrats_stage7') || '<b>Поздравляем!</b> Радиограмма 7-й ступени успешно принята! Проверьте вкладку «Классность ДОСААФ».'))
                : failHintTpl.replace('{threshold}', passThreshold).replace('{total}', totalWords);

            resultBox.innerHTML = `
                <div class="bold" style="font-size:16px;">${isPassed ? (t('dosaaf.exam_passed_title') || '✓ Зачёт сдан!') : (t('dosaaf.exam_failed_title') || '✗ Зачёт не сдан')}</div>
                <p class="muted mt-1" style="font-size:13px; line-height:1.5;">
                    ${summaryHtml}.<br>
                    ${passMsgHtml}
                </p>

                <div class="mt-2 mb-2 p-2" style="background:var(--surface); border-radius:var(--radius-sm); border:1px solid var(--border);">
                    <div class="small muted mb-1"><b>${t('dosaaf.exam_check_heading') || 'Сверка принятой радиограммы:'}</b></div>
                    <div style="line-height:1.8; word-break:break-all;">
                        ${breakdownHtml}
                    </div>
                </div>

                ${totalXpEarned > 0 ? `
                    <div class="mt-2 p-2" style="background:var(--surface-2); border-radius:var(--radius-sm); border-left:3px solid var(--accent); font-size:13px; font-weight:600;">
                        ✨ <b>+${totalXpEarned} XP</b> ${t('dosaaf.exam_xp_earned') || 'получено за зачёт'} ${isPassed ? (t('dosaaf.exam_xp_bonus', {'{bonus}': passBonus}) || `(включая бонус +${passBonus} XP за сдачу)`) : ''}
                    </div>
                ` : ''}
                ${isPassed ? `
                    <div class="mt-3">
                        ${currentStageNum < 7 ? `
                            <button type="button" class="btn btn-primary" id="dosaaf-next-stage-btn" style="width:100%; font-size:15px; padding:12px 18px; font-weight:700;">
                                ${(t('dosaaf.exam_goto_stage_btn') || 'Перейти к Ступени {next} ➔').replace('{next}', currentStageNum + 1)}
                            </button>
                        ` : `
                            <button type="button" class="btn btn-primary" id="dosaaf-view-rank-btn" style="width:100%; font-size:15px; padding:12px 18px; font-weight:700;">
                                ${t('dosaaf.exam_view_ranks_btn') || '🏆 Посмотреть мою классность ДОСААФ ➔'}
                            </button>
                        `}
                    </div>
                ` : `
                    <div class="mt-3">
                        <button type="button" class="btn btn-outline" id="dosaaf-retry-exam-btn" style="width:100%; padding:10px 16px;">
                            ${t('dosaaf.exam_retry_btn') || 'Повторить зачёт'}
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

        if (typeof Progress !== 'undefined' && typeof Progress.renderTrainingSummary === 'function') {
            Progress.renderTrainingSummary('dosaaf-exam-daily-time-block', examDur);
        }
    }

    // =========================================================================
    // 4. КЛАССНОСТЬ ДОСААФ (Интерактивная оценка квалификации)
    // =========================================================================
    function computeCurrentRank() {
        // Присвоение классности радиоспециалиста ДОСААФ (по ЕВСК):
        // Обязательное условие: освоение полного курса (все 7 ступеней: буквы и цифры).
        // Класс определяется нормативной скоростью сдачи зачёта 7-й ступени при достаточном объёме радиограммы.
        const stage7Exam = examPassed[7];
        if (stage7Exam) {
            const records = stage7Exam.records || {};
            const maxWords = stage7Exam.maxPassedWords || (stage7Exam.score >= stage7Exam.total * 0.8 ? stage7Exam.total : 0);
            const generalWpm = stage7Exam.wpm || 0;

            // Мастер радиосвязи ДОСААФ: 28+ WPM (120 зн/мин) И не менее 50 групп в марафоне!
            const wpm50 = Math.max(records[50] || 0, maxWords >= 50 ? generalWpm : 0);
            if (wpm50 >= 28) return 'master';

            // 1-й, 2-й, 3-й классы: норматив скорости на радиограмме не менее 30 групп!
            const wpm30 = Math.max(records[30] || 0, records[50] || 0, maxWords >= 30 ? generalWpm : 0);
            if (wpm30 >= 24) return 'class1'; // 100+ зн/мин
            if (wpm30 >= 19) return 'class2'; // 80+ зн/мин
            if (wpm30 >= 14) return 'class3'; // 60+ зн/мин
        }
        // Курсант: в процессе обучения (ступени 1-7 или экспресс-зачёт до 30 групп)
        return 'cadet';
    }

    function renderRanksView() {
        const currentRankCard = document.getElementById('dosaaf-current-rank-card');
        const container = document.getElementById('dosaaf-ranks-list');
        if (!container) return;
        container.innerHTML = '';

        function getRankTitle(rk) {
            return t('dosaaf.rank_' + rk.id + '_title') || rk.title;
        }
        function getRankBadge(rk) {
            return t('dosaaf.rank_' + rk.id + '_badge') || rk.badge;
        }
        function getRankDesc(rk) {
            return t('dosaaf.rank_' + rk.id + '_desc') || rk.description;
        }

        const activeRankId = computeCurrentRank();
        const activeRank = DOSAAF_RANKS.find(r => r.id === activeRankId) || DOSAAF_RANKS[0];

        if (currentRankCard) {
            currentRankCard.innerHTML = `
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <span class="muted small text-uppercase" style="letter-spacing:1px; font-weight:700;">${t('dosaaf.rank_current') || 'Текущее звание'}</span>
                        <h3 class="mt-0 mb-0" style="font-size:18px; color:var(--accent);">${getRankTitle(activeRank)}</h3>
                        <div class="muted mt-1" style="font-size:13px;">${getRankDesc(activeRank)}</div>
                    </div>
                    <span class="badge" style="font-size:14px; font-weight:800; padding:6px 14px; background:var(--accent); color:#1a1200;">${getRankBadge(activeRank)}</span>
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
                const records = stage7Exam?.records || {};
                const maxWords = stage7Exam?.maxPassedWords || (stage7Exam?.score >= stage7Exam?.total * 0.8 ? stage7Exam.total : 0);
                const generalWpm = stage7Exam?.wpm || 0;
                const minWords = rk.minWords || 30;

                const bestWpmForRank = (minWords === 50)
                    ? Math.max(records[50] || 0, maxWords >= 50 ? generalWpm : 0)
                    : Math.max(records[30] || 0, records[50] || 0, maxWords >= 30 ? generalWpm : 0);

                if (stage7Exam && bestWpmForRank >= rk.minSpeedWpm) {
                    isAchieved = true;
                    statusBadge = `<span class="badge" style="background:rgba(74, 222, 128, 0.15); color:var(--success);">${t('dosaaf.rank_achieved') || '✓ Присвоено'}</span>`;
                    const confTpl = t('dosaaf.rank_confirmed_info') || '✓ Подтверждено: {wpm} WPM на радиограмме {words}+ групп';
                    statusText = `<div class="muted small mt-1" style="color:var(--success);">${confTpl.replace('{wpm}', bestWpmForRank).replace('{words}', minWords)}</div>`;
                } else {
                    const reqTpl = t('dosaaf.rank_req_info') || 'Требуется: сдать зачёт 7 ступени со скоростью ≥ {wpm} WPM ({cpm} зн/мин) на радиограмме не менее {words} групп.';
                    const reqInfo = reqTpl.replace('{wpm}', rk.minSpeedWpm).replace('{cpm}', rk.minSpeedCpm).replace('{words}', minWords);
                    statusBadge = `<span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text-muted);">${t('dosaaf.rank_locked') || '🔒 Не выполнено'}</span>`;
                    statusText = `<div class="muted small mt-1" style="color:var(--accent);">${reqInfo}</div>`;
                }
            }

            card.innerHTML = `
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div class="bold" style="font-size:15px; color:${isAchieved ? 'var(--text)' : 'var(--text-muted)'};">${getRankTitle(rk)}</div>
                        <div class="muted mt-1" style="font-size:13px;">${getRankDesc(rk)}</div>
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
    const JCUKEN_ROWS = [
        ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
        ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
        ['Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю']
    ];

    const ABVGD_ROWS = [
        ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й'],
        ['К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф'],
        ['Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я']
    ];

    function getDosaafKbdLayout() {
        const saved = localStorage.getItem('morse_dosaaf_kbd_layout');
        if (saved === 'dosaaf' || saved === 'jcuken' || saved === 'abvgd') {
            return saved;
        }
        return currentStageNum >= 4 ? 'jcuken' : 'dosaaf';
    }

    function setDosaafKbdLayout(layout) {
        localStorage.setItem('morse_dosaaf_kbd_layout', layout);
        renderAllKeypads();
    }

    function renderAllKeypads() {
        buildMobileKeypad('dosaaf-words-kbd', 'dosaaf-word-input', checkWordAnswer, { showSpace: false });
        buildMobileKeypad('dosaaf-exam-kbd', 'dosaaf-exam-input', checkExamAnswer, { showSpace: true });
    }

    function buildMobileKeypad(containerId, inputId, checkCallback, options = {}) {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        if (!container || !input) return;

        container.innerHTML = '';
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const currentLayout = getDosaafKbdLayout();

        container.className = `dosaaf-kbd layout-${currentLayout}`;

        // Переключатель раскладки (доступен на всех ступенях 1-7)
        const switcher = document.createElement('div');
        switcher.className = 'dosaaf-kbd-switcher';
        switcher.innerHTML = `
            <span class="dosaaf-kbd-switcher-label">${t('dosaaf.kbd_layout_label') || 'Раскладка:'}</span>
            <div class="dosaaf-kbd-switcher-btns">
                <button type="button" class="dosaaf-kbd-tab ${currentLayout === 'dosaaf' ? 'active' : ''}" data-layout="dosaaf" title="${t('dosaaf.kbd_tab_dosaaf_title') || 'Только выученные буквы текущей ступени'}">${t('dosaaf.kbd_tab_dosaaf') || 'ДОСААФ'}</button>
                <button type="button" class="dosaaf-kbd-tab ${currentLayout === 'jcuken' ? 'active' : ''}" data-layout="jcuken" title="${t('dosaaf.kbd_tab_jcuken_title') || 'Стандартная клавиатура ЙЦУКЕН (неизученные буквы неактивны)'}">${t('dosaaf.kbd_tab_jcuken') || 'ЙЦУКЕН'}</button>
                <button type="button" class="dosaaf-kbd-tab ${currentLayout === 'abvgd' ? 'active' : ''}" data-layout="abvgd" title="${t('dosaaf.kbd_tab_abvgd_title') || 'Алфавитный порядок А-Я (неизученные буквы неактивны)'}">${t('dosaaf.kbd_tab_abvgd') || 'АБВГД'}</button>
            </div>
        `;
        switcher.querySelectorAll('.dosaaf-kbd-tab').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                setDosaafKbdLayout(btn.dataset.layout);
            });
        });
        container.appendChild(switcher);

        // На 7-й ступени (освоены цифры) вверху добавляется ряд цифр 1..0
        if (currentStageNum === 7) {
            const numRow = document.createElement('div');
            numRow.className = 'dosaaf-kbd-row';
            const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
            digits.forEach(num => {
                numRow.appendChild(createKeyBtn(num, () => appendCharToInput(input, num)));
            });
            container.appendChild(numRow);
        }

        // Ряды букв в зависимости от выбранной раскладки
        if (currentLayout === 'jcuken') {
            JCUKEN_ROWS.forEach(rowChars => {
                const row = document.createElement('div');
                row.className = 'dosaaf-kbd-row';
                rowChars.forEach(ch => {
                    if (stageData.allLetters.includes(ch)) {
                        row.appendChild(createKeyBtn(ch, () => appendCharToInput(input, ch)));
                    } else {
                        row.appendChild(createDisabledKeyBtn(ch));
                    }
                });
                container.appendChild(row);
            });
        } else if (currentLayout === 'abvgd') {
            ABVGD_ROWS.forEach(rowChars => {
                const row = document.createElement('div');
                row.className = 'dosaaf-kbd-row';
                rowChars.forEach(ch => {
                    if (stageData.allLetters.includes(ch)) {
                        row.appendChild(createKeyBtn(ch, () => appendCharToInput(input, ch)));
                    } else {
                        row.appendChild(createDisabledKeyBtn(ch));
                    }
                });
                container.appendChild(row);
            });
        } else {
            // Режим 'dosaaf': только выученные русские буквы ступени (аккуратные 2 ряда)
            const lettersOnly = stageData.allLetters.filter(ch => isNaN(parseInt(ch, 10)));
            const chars = lettersOnly.length > 0 ? lettersOnly : stageData.allLetters;
            const row1 = document.createElement('div');
            row1.className = 'dosaaf-kbd-row';

            const row2 = document.createElement('div');
            row2.className = 'dosaaf-kbd-row';

            const mid = Math.ceil(chars.length / 2);
            chars.slice(0, mid).forEach(ch => {
                row1.appendChild(createKeyBtn(ch, () => appendCharToInput(input, ch)));
            });
            chars.slice(mid).forEach(ch => {
                row2.appendChild(createKeyBtn(ch, () => appendCharToInput(input, ch)));
            });

            if (row1.children.length > 0) container.appendChild(row1);
            if (row2.children.length > 0) container.appendChild(row2);
        }

        // Служебные кнопки в нижнем ряду: Стереть символ (Backspace), Пробел (если включён) и Очистить всё (Clear all)
        const actionsRow = document.createElement('div');
        actionsRow.className = 'dosaaf-kbd-row dosaaf-kbd-actions';

        const backspaceBtn = document.createElement('div');
        backspaceBtn.className = 'dosaaf-key dosaaf-key-action';
        backspaceBtn.innerHTML = t('dosaaf.btn_backspace') || '⌫ Стереть';
        backspaceBtn.title = t('dosaaf.btn_backspace_title') || 'Стереть символ';
        backspaceBtn.addEventListener('mousedown', (e) => e.preventDefault());
        backspaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            deleteCharFromInput(input);
        });
        actionsRow.appendChild(backspaceBtn);

        if (options && options.showSpace) {
            const spaceBtn = document.createElement('div');
            spaceBtn.className = 'dosaaf-key dosaaf-key-action dosaaf-key-space';
            spaceBtn.innerHTML = t('dosaaf.btn_space') || '␣ Пробел';
            spaceBtn.title = t('dosaaf.btn_space_title') || 'Разделить слова / группы радиограммы';
            spaceBtn.addEventListener('mousedown', (e) => e.preventDefault());
            spaceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                insertAtCursor(input, ' ');
            });
            actionsRow.appendChild(spaceBtn);
        }

        const clearBtn = document.createElement('div');
        clearBtn.className = 'dosaaf-key dosaaf-key-action dosaaf-key-clear';
        clearBtn.innerHTML = t('dosaaf.btn_clear') || '✕ Очистить всё';
        clearBtn.title = t('dosaaf.btn_clear_title') || 'Очистить всё введённое поле';
        clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            input.value = '';
            input.dispatchEvent(new Event('input'));
        });
        actionsRow.appendChild(clearBtn);

        container.appendChild(actionsRow);
    }

    function createKeyBtn(ch, clickHandler) {
        const btn = document.createElement('div');
        btn.className = 'dosaaf-key';
        btn.textContent = ch;
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            clickHandler();
        });
        return btn;
    }

    function createDisabledKeyBtn(ch) {
        const btn = document.createElement('div');
        btn.className = 'dosaaf-key disabled';
        btn.textContent = ch;
        btn.setAttribute('aria-disabled', 'true');
        btn.title = t('dosaaf.kbd_unlearned_letter') || 'Буква ещё не изучена на этой ступени';
        return btn;
    }

    function insertAtCursor(input, text) {
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const val = input.value;
        input.value = val.substring(0, start) + text + val.substring(end);
        const newPos = start + text.length;
        try {
            input.setSelectionRange(newPos, newPos);
        } catch (_) {}
        input.dispatchEvent(new Event('input'));
    }

    function deleteCharFromInput(input) {
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const val = input.value;
        if (start === end) {
            if (start > 0) {
                input.value = val.substring(0, start - 1) + val.substring(end);
                try {
                    input.setSelectionRange(start - 1, start - 1);
                } catch (_) {}
            }
        } else {
            input.value = val.substring(0, start) + val.substring(end);
            try {
                input.setSelectionRange(start, start);
            } catch (_) {}
        }
        input.dispatchEvent(new Event('input'));
    }

    function appendCharToInput(input, ch) {
        insertAtCursor(input, ch);
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
            const cpmUnit = (typeof t === 'function' && t('js.common.cpm_unit')) || 'CPM';
            cpmEl.textContent = (typeof cpmHintText === 'function')
                ? cpmHintText(w, cpmType)
                : `≈${Math.round(w * (cpmType === 'digits' ? 2.90 : (cpmType === 'mixed' ? 3.65 : 4.22)))} ${cpmUnit}`;
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

    /**
     * Привязка кнопки повтора звука (F7 / клик мышью / тач на телефоне)
     * с гарантированным сохранением фокуса в поле ввода (и открытой экранной клавиатуры на мобильных).
     */
    function bindRepeatButton(btn, getInput, playAction) {
        if (!btn) return;

        // 1. Предотвращаем потерю фокуса при нажатии мыши (десктоп)
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // 2. Предотвращаем сброс фокуса и скрытие клавиатуры при касании на телефонах (touch)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let touchHandled = false;

        btn.addEventListener('touchstart', (e) => {
            touchMoved = false;
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        btn.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const dx = Math.abs(e.touches[0].clientX - touchStartX);
                const dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > 10 || dy > 10) {
                    touchMoved = true;
                }
            }
        }, { passive: true });

        btn.addEventListener('touchend', (e) => {
            if (touchMoved) return; // Пользователь скроллил страницу пальцем
            const input = getInput();
            const wasFocused = input && (document.activeElement === input);

            // e.preventDefault() отменяет blur поля ввода и скрытие экранной клавиатуры в мобильных браузерах
            e.preventDefault();
            touchHandled = true;

            playAction();

            // Если поле уже было в фокусе (пользователь печатает на телефоне), удерживаем фокус.
            // На десктопе/не-сенсорных устройствах фокусируем поле, чтобы сразу продолжать ввод.
            if (input) {
                if (wasFocused || !('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                    input.focus({ preventScroll: true });
                }
            }

            setTimeout(() => {
                touchHandled = false;
            }, 400);
        });

        // 3. Стандартный клик (для мыши на десктопе, активации с клавиатуры и программного btn.click() по F7)
        btn.addEventListener('click', (e) => {
            if (touchHandled) {
                touchHandled = false;
                return;
            }
            const input = getInput();
            playAction();
            if (input) {
                input.focus({ preventScroll: true });
            }
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
        bindRepeatButton(playBtn, () => wordInput, playCurrentWord);

        // Предотвращаем сброс фокуса при клике мышкой
        checkBtn?.addEventListener('mousedown', (e) => e.preventDefault());
        checkBtn?.addEventListener('click', () => {
            checkWordAnswer();
            if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                wordInput?.focus({ preventScroll: true });
            }
        });

        nextBtn?.addEventListener('mousedown', (e) => e.preventDefault());
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

        document.querySelectorAll('#dosaaf-exam-length-chips .chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                const len = parseInt(chip.dataset.length, 10);
                if (len === 10 || len === 30 || len === 50) {
                    setExamLength(len);
                }
            });
        });

        startExamBtn?.addEventListener('click', startStageExam);
        bindRepeatButton(examPlayBtn, () => examInput, () => {
            if (examActive && examWords.length > 0) {
                runDosaafExamPlayback();
            }
        });

        const examStopBtn = document.getElementById('dosaaf-exam-stop-btn');
        examStopBtn?.addEventListener('click', abortStageExam);

        examCheckBtn?.addEventListener('mousedown', (e) => e.preventDefault());
        examCheckBtn?.addEventListener('click', checkExamAnswer);

        examInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                checkExamAnswer();
            }
        });

        document.getElementById('dosaaf-reset-progress-btn')?.addEventListener('click', () => {
            if (confirm(t('dosaaf.reset_confirm') || 'Вы уверены, что хотите сбросить открытые ступени ДОСААФ и начать обучение со Ступени 1?')) {
                resetAllDosaafProgress();
            }
        });

        // Реакция на синхронизацию прогресса с сервером (например, открытие с телефона)
        window.addEventListener('progress:updated', () => {
            loadDosaafProgress();
            renderStageNav();
            renderCurrentStage();
        });
        window.addEventListener('progress:synced', () => {
            loadDosaafProgress();
            renderStageNav();
            renderCurrentStage();
        });

        window.addEventListener('beforeunload', () => {
            if (examActive && examStartTime) {
                const dur = Math.round((Date.now() - examStartTime) / 1000);
                if (dur >= 3 && typeof Progress !== 'undefined') {
                    Progress.addTrainingTime(dur);
                }
                examStartTime = 0;
            }
            if (wordsSessionStarted && lastWordsTickTime) {
                const delta = Math.round((Date.now() - lastWordsTickTime) / 1000);
                if (delta >= 1 && delta <= 120 && typeof Progress !== 'undefined') {
                    Progress.addTrainingTime(delta);
                }
                lastWordsTickTime = 0;
            }
        });
    });

    window.initDosaafMode = initDosaafMode;
})();

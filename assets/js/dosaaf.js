/**
 * Логика обучающего режима «Метод ДОСААФ» для MorseWave.
 * Управляет ступенями (1..7), напевами, приёмом смысловых слов и сдачей зачётов.
 */

(function () {
    let currentStageNum = 1;
    let maxUnlockedStage = 1;
    let currentSubTab = 'words'; // 'napevs', 'words', 'exam', 'ranks'
    let currentWord = null;
    let isWordPlaying = false;
    let currentAudio = null;

    let wordStreak = 0;
    let wordSessionCorrect = 0;
    let wordSessionTotal = 0;

    let examActive = false;
    let examWords = [];
    let examIndex = 0;
    let examCorrect = 0;

    // Загрузка сохранённого прогресса
    function loadDosaafProgress() {
        try {
            maxUnlockedStage = parseInt(localStorage.getItem('morse_dosaaf_max_stage'), 10) || 1;
            const savedStage = parseInt(localStorage.getItem('morse_dosaaf_current_stage'), 10) || 1;
            currentStageNum = Math.min(savedStage, maxUnlockedStage);
        } catch (_) {
            maxUnlockedStage = 1;
            currentStageNum = 1;
        }
    }

    function saveDosaafProgress() {
        try {
            localStorage.setItem('morse_dosaaf_max_stage', String(maxUnlockedStage));
            localStorage.setItem('morse_dosaaf_current_stage', String(currentStageNum));
        } catch (_) {}
    }

    function getDosaafWpm() {
        const slider = document.getElementById('dosaaf-wpm');
        return slider ? (parseInt(slider.value, 10) || 12) : 12;
    }

    // Инициализация интерфейса при открытии режима
    function initDosaafMode() {
        loadDosaafProgress();
        renderStageNav();
        renderCurrentStage();
        setupSpeedControl();
        setupSubTabs();
    }

    // Отрисовка навигатора по 7 ступеням
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
            if (st.stage < maxUnlockedStage) statusIcon = ' ✓';
            else if (!isUnlocked) statusIcon = ' 🔒';

            chip.textContent = `${t('dosaaf.stage_short') || 'Ступень'} ${st.stage}${statusIcon}`;
            
            if (isUnlocked) {
                chip.addEventListener('click', () => {
                    currentStageNum = st.stage;
                    saveDosaafProgress();
                    renderStageNav();
                    renderCurrentStage();
                });
            }
            container.appendChild(chip);
        });
    }

    // Отрисовка данных текущей ступени
    function renderCurrentStage() {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];

        // Заголовок и подзаголовок
        const titleEl = document.getElementById('dosaaf-stage-title');
        const subtitleEl = document.getElementById('dosaaf-stage-subtitle');
        if (titleEl) titleEl.textContent = stageData.title;
        if (subtitleEl) subtitleEl.textContent = stageData.subtitle;

        // Историческая цитата
        const quoteTextEl = document.getElementById('dosaaf-quote-text');
        const quoteAuthorEl = document.getElementById('dosaaf-quote-author');
        if (quoteTextEl && quoteAuthorEl) {
            quoteTextEl.textContent = `«${stageData.quote.text}»`;
            quoteAuthorEl.textContent = `— ${stageData.quote.author}, ${stageData.quote.book}`;
        }

        // Обновление активной вкладки
        renderActiveSubTab();
    }

    // Переключение вкладок внутри ступени
    function setupSubTabs() {
        document.querySelectorAll('#dosaaf-subtabs .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#dosaaf-subtabs .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentSubTab = chip.dataset.tab;
                renderActiveSubTab();
            });
        });
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

        if (currentSubTab === 'napevs') renderNapevsGrid();
        else if (currentSubTab === 'words') nextWord(false);
        else if (currentSubTab === 'ranks') renderRanksView();
    }

    // 1. Отрисовка карточек напевов
    function renderNapevsGrid() {
        const container = document.getElementById('dosaaf-napevs-grid');
        if (!container) return;
        container.innerHTML = '';

        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];

        stageData.newLetters.forEach(ch => {
            const info = stageData.napevs[ch];
            if (!info) return;

            const card = document.createElement('div');
            card.className = 'card dosaaf-napev-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="flex-between" style="align-items:center;">
                    <span class="dosaaf-letter-char mono" style="font-size:28px; font-weight:800; color:var(--accent);">${ch}</span>
                    <button type="button" class="btn btn-sm btn-outline dosaaf-play-letter-btn" aria-label="Прослушать">▶</button>
                </div>
                <div class="dosaaf-napev-text bold mt-1" style="font-size:15px; color:var(--text); letter-spacing:0.5px;">${info.napev}</div>
                <div class="dosaaf-pattern-text mono muted" style="font-size:13px; margin-top:3px;">${info.pattern.replace(/\./g, '•').replace(/-/g, '—')} (${info.tita})</div>
            `;

            card.addEventListener('click', () => {
                playDosaafSound(ch);
            });

            container.appendChild(card);
        });
    }

    // 2. Тренажёр приёма смысловых слов
    function nextWord(autoPlay = true) {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        const words = stageData.words;
        if (!words || words.length === 0) return;

        // Выбираем случайное слово, стараясь не повторять то же самое
        let candidate = words[Math.floor(Math.random() * words.length)];
        if (words.length > 1 && candidate === currentWord) {
            candidate = words[Math.floor(Math.random() * words.length)];
        }
        currentWord = candidate;

        const input = document.getElementById('dosaaf-word-input');
        if (input) {
            input.value = '';
            input.disabled = false;
            input.focus();
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
            if (typeof awardXp === 'function') awardXp(2, t('dosaaf.word_xp') || 'Слово ДОСААФ');
        } else {
            wordStreak = 0;
        }

        updateWordStats();
        pushWordHistory(isCorrect, currentWord, answer);

        const feedback = document.getElementById('dosaaf-word-feedback');
        if (feedback) {
            feedback.className = 'feedback show ' + (isCorrect ? 'ok' : 'bad');
            if (isCorrect) {
                feedback.innerHTML = `✓ <b>${currentWord}</b> — ${t('dosaaf.correct') || 'Верно!'}`;
                setTimeout(() => nextWord(true), 900);
            } else {
                const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum);
                let breakdown = currentWord.split('').map(c => {
                    const nap = stageData?.napevs[c]?.napev || '';
                    return `<b>${c}</b> (${nap})`;
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

    // 3. Зачёт ступени
    function startStageExam() {
        const stageData = DOSAAF_STAGES.find(s => s.stage === currentStageNum) || DOSAAF_STAGES[0];
        examWords = [...stageData.words].sort(() => Math.random() - 0.5).slice(0, 5);
        examIndex = 0;
        examCorrect = 0;
        examActive = true;

        const panel = document.getElementById('dosaaf-exam-panel');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');
        if (panel) panel.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';

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
            input.focus();
        }

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
        }
        examIndex++;
        nextExamWord();
    }

    function finishStageExam() {
        examActive = false;
        const panel = document.getElementById('dosaaf-exam-panel');
        const resultBox = document.getElementById('dosaaf-exam-result');
        const startBtn = document.getElementById('dosaaf-start-exam-btn');

        if (panel) panel.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-flex';

        const isPassed = examCorrect >= 4; // 80% порог сдачи
        if (isPassed && currentStageNum === maxUnlockedStage && maxUnlockedStage < 7) {
            maxUnlockedStage++;
            saveDosaafProgress();
            renderStageNav();
        }

        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.className = 'card mt-2 ' + (isPassed ? 'subcard-success' : 'subcard-warn');
            resultBox.innerHTML = `
                <div class="bold" style="font-size:16px;">${isPassed ? '✓ Зачёт сдан!' : '✗ Зачёт не сдан'}</div>
                <p class="muted mt-1" style="font-size:13px;">
                    Результат: <b>${examCorrect} из 5 слов</b> (${Math.round((examCorrect / 5) * 100)}%).
                    ${isPassed ? (maxUnlockedStage > currentStageNum ? 'Следующая ступень открыта!' : 'Ступень успешно освоена!') : 'Для зачёта необходимо принять верно минимум 4 слова. Повторите напевы и попробуйте снова.'}
                </p>
            `;
        }
    }

    // 4. Классность ДОСААФ
    function renderRanksView() {
        const container = document.getElementById('dosaaf-ranks-list');
        if (!container) return;
        container.innerHTML = '';

        DOSAAF_RANKS.forEach(rk => {
            const card = document.createElement('div');
            card.className = 'card mt-2';
            card.style.background = 'var(--surface-2)';
            card.innerHTML = `
                <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                    <div>
                        <div class="bold" style="font-size:15px; color:var(--text);">${rk.title}</div>
                        <div class="muted mt-1" style="font-size:13px;">${rk.description}</div>
                    </div>
                    <span class="badge" style="font-weight:700;">${rk.badge}</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Звуковой движок
    function playDosaafSound(text) {
        if (!text) return;
        if (currentAudio) {
            currentAudio.stop();
        }
        const wpm = getDosaafWpm();
        currentAudio = new MorseAudio({ wpm });
        isWordPlaying = true;
        const lamp = document.getElementById('dosaaf-lamp');

        currentAudio.play(text, {
            onSymbol: () => {
                if (lamp) lamp.classList.add('active');
            },
            onDone: () => {
                isWordPlaying = false;
                if (lamp) lamp.classList.remove('active');
            }
        });
    }

    // Регулятор скорости
    function setupSpeedControl() {
        const slider = document.getElementById('dosaaf-wpm');
        const valEl = document.getElementById('dosaaf-wpm-val');
        const cpmEl = document.getElementById('dosaaf-wpm-cpm');

        if (!slider) return;

        const updateCpm = () => {
            const w = parseInt(slider.value, 10) || 12;
            if (valEl) valEl.textContent = w;
            if (cpmEl) {
                cpmEl.dataset.cpmType = 'letters';
                cpmEl.textContent = (typeof cpmHintText === 'function')
                    ? cpmHintText(w, 'letters')
                    : `≈${Math.round(w * 4.22)} зн/мин`;
            }
        };

        const saved = localStorage.getItem('morse_dosaaf_wpm');
        if (saved) {
            slider.value = saved;
        }
        updateCpm();

        slider.addEventListener('input', () => {
            updateCpm();
            localStorage.setItem('morse_dosaaf_wpm', slider.value);
        });
    }

    // Обработчики кнопок
    window.addEventListener('DOMContentLoaded', () => {
        initDosaafMode();

        const playBtn = document.getElementById('dosaaf-play-word-btn');
        const checkBtn = document.getElementById('dosaaf-check-word-btn');
        const nextBtn = document.getElementById('dosaaf-next-word-btn');
        const wordInput = document.getElementById('dosaaf-word-input');

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

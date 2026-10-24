/**
 * MorseWave Pro — Лаборатория таймингов передачи (ДОСААФ / ITU)
 * Аппаратный и программный анализ соотношений:
 *  - Точка к тире (1:3)
 *  - Межзнаковая пауза (3T)
 *  - Межсловная пауза (7T)
 *  - Скорость WPM / CPM и судейский класс точности
 */
(function() {
    'use strict';

    const PRESETS = {
        paris: 'PARIS PARIS',
        contest: 'CQ TEST R9OGL 599',
        russian: 'РАДИО Ж19Ф5 Э3Ю7'
    };

    // Состояние лаборатории
    const state = {
        isRunning: false,
        activePreset: 'paris',
        targetText: PRESETS.paris,
        targetChars: [],
        currentIndex: 0,
        currentWordBuffer: '',

        // Замеры элементов
        currentWpm: 20,
        ditDurationAvg: 60, // 1200 / 20 = 60ms
        recordedDits: [],
        recordedDahs: [],
        recordedCharPauses: [],
        recordedWordPauses: [],

        // Временные метки
        lastSignalEndTime: 0,
        lastCharEndTime: 0,
        lastWordEndTime: 0,
        elementStartTime: 0,

        // История для осциллограммы
        timelineEvents: [], // { type: 'dit'|'dah'|'pause', duration: ms, pauseType: 'elem'|'char'|'word', label: '' }
        auditLog: [] // { char, ratio, pauseBeforeMs, pauseUnits, status, score }
    };

    // DOM-элементы
    let elTargetContainer = null;
    let elStatusBadge = null;
    let elBtnStart = null;
    let elBtnReset = null;
    let elPresetBtns = [];
    let elCustomWrap = null;
    let elCustomInput = null;
    let elCustomApply = null;

    // Метрики
    let elRatioVal = null;
    let elRatioBar = null;
    let elRatioStatus = null;

    let elCharPauseVal = null;
    let elCharPauseBar = null;
    let elCharPauseStatus = null;

    let elWordPauseVal = null;
    let elWordPauseBar = null;
    let elWordPauseStatus = null;

    let elSpeedWpmVal = null;
    let elSpeedCpmVal = null;
    let elScoreVal = null;
    let elClassBadge = null;

    // Осциллограмма и журнал
    let canvas = null;
    let ctx = null;
    let elAuditBody = null;

    function initDOMElements() {
        elTargetContainer = document.getElementById('timing-target-chars');
        elStatusBadge = document.getElementById('timing-status-badge');
        elBtnStart = document.getElementById('btn-timing-start');
        elBtnReset = document.getElementById('btn-timing-reset');
        elPresetBtns = document.querySelectorAll('.timing-preset-btn');
        elCustomWrap = document.getElementById('timing-custom-wrap');
        elCustomInput = document.getElementById('timing-custom-input');
        elCustomApply = document.getElementById('btn-apply-custom');

        elRatioVal = document.getElementById('gauge-ratio-val');
        elRatioBar = document.getElementById('gauge-ratio-bar');
        elRatioStatus = document.getElementById('gauge-ratio-status');

        elCharPauseVal = document.getElementById('gauge-char-pause-val');
        elCharPauseBar = document.getElementById('gauge-char-pause-bar');
        elCharPauseStatus = document.getElementById('gauge-char-pause-status');

        elWordPauseVal = document.getElementById('gauge-word-pause-val');
        elWordPauseBar = document.getElementById('gauge-word-pause-bar');
        elWordPauseStatus = document.getElementById('gauge-word-pause-status');

        elSpeedWpmVal = document.getElementById('timing-wpm-val');
        elSpeedCpmVal = document.getElementById('timing-cpm-val');
        elScoreVal = document.getElementById('timing-score-val');
        elClassBadge = document.getElementById('timing-class-badge');

        canvas = document.getElementById('timing-canvas');
        if (canvas) {
            ctx = canvas.getContext('2d');
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        }

        elAuditBody = document.getElementById('timing-audit-body');
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = canvas.parentElement.clientWidth || 800;
        canvas.height = 80;
        renderTimeline();
    }

    function setTargetText(text) {
        state.targetText = text.trim().toUpperCase();
        state.targetChars = state.targetText.split('');
        state.currentIndex = 0;
        renderTargetTokens();
    }

    function renderTargetTokens() {
        if (!elTargetContainer) return;
        elTargetContainer.innerHTML = '';

        state.targetChars.forEach((ch, idx) => {
            const span = document.createElement('span');
            span.className = 'timing-char-box';
            if (ch === ' ') {
                span.classList.add('space');
                span.innerHTML = '&middot;';
                span.title = t('timinglab.space_title') || 'Межсловная пауза 7T';
            } else {
                span.textContent = ch;
            }

            if (idx < state.currentIndex) {
                span.classList.add('done');
            } else if (idx === state.currentIndex && state.isRunning) {
                span.classList.add('current');
            }

            elTargetContainer.appendChild(span);
        });
    }

    function startSession() {
        state.isRunning = true;
        state.currentIndex = 0;
        state.recordedDits = [];
        state.recordedDahs = [];
        state.recordedCharPauses = [];
        state.recordedWordPauses = [];
        state.timelineEvents = [];
        state.auditLog = [];

        if (elStatusBadge) {
            elStatusBadge.className = 'timing-badge-status active';
            elStatusBadge.innerHTML = t('timinglab.status_measuring') || '● ИДЁТ ЗАМЕР ТАЙМИНГОВ';
        }
        if (elBtnStart) {
            elBtnStart.innerHTML = '<span>⏹</span> <span>' + (t('timinglab.btn_stop') || 'Завершить замер') + '</span>';
            elBtnStart.style.background = '#f59e0b';
            elBtnStart.style.color = '#000';
        }

        if (elAuditBody) elAuditBody.innerHTML = '';
        renderTargetTokens();
        updateGauges();
        renderTimeline();
    }

    function stopSession() {
        state.isRunning = false;
        if (elStatusBadge) {
            elStatusBadge.className = 'timing-badge-status';
            elStatusBadge.innerHTML = t('timinglab.status_done') || '○ ТЕСТ ЗАВЕРШЁН';
        }
        if (elBtnStart) {
            elBtnStart.innerHTML = '<span>▶</span> <span>' + (t('timinglab.btn_start') || 'Начать замер') + '</span>';
            elBtnStart.style.background = '#10b981';
            elBtnStart.style.color = '#fff';
        }
        renderTargetTokens();
        showFinalVerdict();
    }

    function resetSession() {
        state.isRunning = false;
        state.currentIndex = 0;
        state.recordedDits = [];
        state.recordedDahs = [];
        state.recordedCharPauses = [];
        state.recordedWordPauses = [];
        state.timelineEvents = [];
        state.auditLog = [];

        if (elStatusBadge) {
            elStatusBadge.className = 'timing-badge-status';
            elStatusBadge.innerHTML = t('timinglab.status_ready') || '○ ГОТОВ К ЗАМЕРУ';
        }
        if (elBtnStart) {
            elBtnStart.innerHTML = '<span>▶</span> <span>' + (t('timinglab.btn_start') || 'Начать замер') + '</span>';
            elBtnStart.style.background = '#10b981';
            elBtnStart.style.color = '#fff';
        }

        if (elAuditBody) {
            elAuditBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">' + (t('timinglab.audit_waiting') || 'Передавайте знаки ключом для формирования судейского отчёта...') + '</td></tr>';
        }

        renderTargetTokens();
        updateGauges();
        renderTimeline();
    }

    // --- Обработка сигналов ---
    function onDit() {
        const now = performance.now();
        const ditMs = Math.round(1200 / state.currentWpm);
        state.recordedDits.push(ditMs);

        // Фиксация паузы перед элементом
        if (state.lastSignalEndTime > 0) {
            const pauseMs = Math.round(now - state.lastSignalEndTime);
            pushTimelineEvent('pause', pauseMs);
        }

        pushTimelineEvent('dit', ditMs);
        state.lastSignalEndTime = now + ditMs;

        updateGauges();
        renderTimeline();
    }

    function onDah() {
        const now = performance.now();
        const ditMs = Math.round(1200 / state.currentWpm);
        const dahMs = ditMs * 3;
        state.recordedDahs.push(dahMs);

        if (state.lastSignalEndTime > 0) {
            const pauseMs = Math.round(now - state.lastSignalEndTime);
            pushTimelineEvent('pause', pauseMs);
        }

        pushTimelineEvent('dah', dahMs);
        state.lastSignalEndTime = now + dahMs;

        updateGauges();
        renderTimeline();
    }

    // Таблица соответствий русских и латинских символов с одинаковым кодом Морзе
    const RU_LAT_MAP = {
        'А':'A', 'Б':'B', 'В':'W', 'Г':'G', 'Д':'D', 'Е':'E', 'Ё':'E',
        'Ж':'V', 'З':'Z', 'И':'I', 'Й':'J', 'К':'K', 'Л':'L', 'М':'M',
        'Н':'N', 'О':'O', 'П':'P', 'Р':'R', 'С':'S', 'Т':'T', 'У':'U',
        'Ф':'F', 'Х':'H', 'Ц':'C', 'Ч':'C', 'Ш':'SH', 'Щ':'Q', 'Ы':'Y',
        'Э':'E', 'Ю':'U', 'Я':'A'
    };

    function isCharMatch(inputCh, expCh) {
        if (!inputCh || !expCh) return false;
        if (inputCh === expCh) return true;
        if (RU_LAT_MAP[expCh] && (RU_LAT_MAP[expCh] === inputCh || inputCh === RU_LAT_MAP[expCh])) return true;
        if (RU_LAT_MAP[inputCh] && (RU_LAT_MAP[inputCh] === expCh || expCh === RU_LAT_MAP[inputCh])) return true;
        if (expCh === 'Ж' && (inputCh === 'V' || inputCh === 'Ж')) return true;
        if (expCh === 'Ф' && (inputCh === 'F' || inputCh === 'Ф')) return true;
        if (expCh === 'Ч' && (inputCh === 'CH' || inputCh === 'Ö' || inputCh === 'C' || inputCh === 'Ч')) return true;
        if (expCh === 'Ш' && (inputCh === 'SH' || inputCh === 'Ш')) return true;
        if (expCh === 'Э' && (inputCh === 'É' || inputCh === 'E' || inputCh === 'Э')) return true;
        if (expCh === 'Ю' && (inputCh === 'Ü' || inputCh === 'U' || inputCh === 'Ю')) return true;
        if (expCh === 'Я' && (inputCh === 'Ä' || inputCh === 'A' || inputCh === 'Q' || inputCh === 'Я')) return true;
        return false;
    }

    // Расчёт фактического темпа в знаках в минуту в зависимости от состава текста (буквы, цифры, PARIS)
    function calculateEffectiveCpm(text, wpm) {
        if (!text || text.includes('PARIS')) return Math.round(wpm * 5.0);
        const digits = (text.match(/[0-9]/g) || []).length;
        const letters = (text.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
        if (digits === 0 && letters > 0) return Math.round(wpm * 4.22);
        if (letters === 0 && digits > 0) return Math.round(wpm * 2.90);
        return Math.round(wpm * 3.65);
    }

    function onChar(char) {
        if (!state.isRunning) return;
        const now = performance.now();
        const ch = char.trim().toUpperCase();
        if (!ch) return;

        const expected = state.targetChars[state.currentIndex];
        const isMatch = isCharMatch(ch, expected);

        const ditT = 1200 / state.currentWpm;
        let pauseBeforeMs = 0;
        let pauseUnits = 3.0;

        if (state.lastCharEndTime > 0) {
            pauseBeforeMs = Math.round(now - state.lastCharEndTime);
            pauseUnits = parseFloat((pauseBeforeMs / ditT).toFixed(1));
            state.recordedCharPauses.push(pauseBeforeMs);
        }
        state.lastCharEndTime = now;

        // Расчёт отношения тире:точка для этого знака
        let ratio = 3.0;
        if (state.recordedDahs.length > 0 && state.recordedDits.length > 0) {
            const avgDah = state.recordedDahs.reduce((a, b) => a + b, 0) / state.recordedDahs.length;
            const avgDit = state.recordedDits.reduce((a, b) => a + b, 0) / state.recordedDits.length;
            ratio = parseFloat((avgDah / avgDit).toFixed(2));
        }

        // Оценка знака (0-100)
        let score = 100;
        let status = t('timinglab.status_ideal') || 'Идеал';

        // Проверка межзнаковой паузы (норма 2.5T - 3.6T)
        if (state.recordedCharPauses.length > 0) {
            if (pauseUnits < 2.2) {
                status = t('timinglab.status_char_stick') || 'Слипание букв (<2.2T)';
                score -= 30;
            } else if (pauseUnits > 4.2) {
                status = t('timinglab.status_char_hang') || 'Зависание (>4.2T)';
                score -= 20;
            }
        }

        // Проверка соотношения тире/точка (норма 2.8 - 3.2)
        if (ratio < 2.5) {
            status = t('timinglab.status_dah_short') || 'Куцые тире (<2.5×)';
            score -= 25;
        } else if (ratio > 3.5) {
            status = t('timinglab.status_dah_long') || 'Затянутые тире (>3.5×)';
            score -= 20;
        }

        if (!isMatch) {
            score -= 40;
            const errTpl = t('timinglab.status_error_exp') || 'Ошибка (ожидалось {expected})';
            status = errTpl.replace('{expected}', expected);
        }
        score = Math.max(0, score);

        addAuditRow(ch, ratio, pauseBeforeMs, pauseUnits, status, score);

        if (state.currentIndex < state.targetChars.length) {
            state.currentIndex++;
            renderTargetTokens();
        }

        if (state.currentIndex >= state.targetChars.length) {
            stopSession();
        }

        updateGauges();
    }

    function onSpace() {
        if (!state.isRunning) return;
        const now = performance.now();
        const ditT = 1200 / state.currentWpm;
        let pauseBeforeMs = 0;
        let pauseUnits = 7.0;

        if (state.lastCharEndTime > 0) {
            pauseBeforeMs = Math.round(now - state.lastCharEndTime);
            pauseUnits = parseFloat((pauseBeforeMs / ditT).toFixed(1));
            state.recordedWordPauses.push(pauseBeforeMs);
        }
        state.lastWordEndTime = now;

        const expected = state.targetChars[state.currentIndex];
        let status = t('timinglab.status_word_clean') || 'Чистый пробел 7T';
        let score = 100;

        if (pauseUnits < 4.8) {
            status = t('timinglab.status_word_stick') || 'Слипание слов (<5T)';
            score -= 35;
        } else if (pauseUnits > 9.5) {
            status = t('timinglab.status_word_hang') || 'Затянутый пробел (>9.5T)';
            score -= 20;
        }

        addAuditRow(t('timinglab.space_label') || '(пробел)', 3.0, pauseBeforeMs, pauseUnits, status, score);

        if (expected === ' ' && state.currentIndex < state.targetChars.length) {
            state.currentIndex++;
            renderTargetTokens();
        }

        if (state.currentIndex >= state.targetChars.length) {
            stopSession();
        }

        updateGauges();
    }

    function addAuditRow(char, ratio, pauseMs, pauseUnits, status, score) {
        if (!elAuditBody) return;
        if (state.auditLog.length === 0) {
            elAuditBody.innerHTML = '';
        }

        state.auditLog.push({ char, ratio, pauseMs, pauseUnits, status, score });

        const tr = document.createElement('tr');
        let badgeColor = '#10b981';
        if (score < 70) badgeColor = '#ef4444';
        else if (score < 90) badgeColor = '#f59e0b';

        const msUnit = t('js.paris.dot_unit') || 'мс';
        tr.innerHTML = `
            <td style="font-weight:700; color:#4fd8c4; padding:6px 10px;">${char}</td>
            <td style="color:var(--text); padding:6px 10px;">${ratio.toFixed(2)}×</td>
            <td style="color:var(--text); padding:6px 10px;">${pauseMs > 0 ? `${pauseMs} ${msUnit} (${pauseUnits}T)` : '—'}</td>
            <td style="padding:6px 10px; color:${badgeColor}; font-weight:600;">${status}</td>
            <td style="padding:6px 10px; font-weight:800; color:${badgeColor};">${score}%</td>
        `;
        elAuditBody.prepend(tr);
    }

    function updateGauges() {
        const ditT = 1200 / state.currentWpm;

        // 1. Соотношение Тире / Точка
        let ratio = 3.0;
        if (state.recordedDits.length > 0 && state.recordedDahs.length > 0) {
            const avgDit = state.recordedDits.reduce((a, b) => a + b, 0) / state.recordedDits.length;
            const avgDah = state.recordedDahs.reduce((a, b) => a + b, 0) / state.recordedDahs.length;
            ratio = avgDah / avgDit;
        }
        if (elRatioVal) elRatioVal.textContent = `${ratio.toFixed(2)}×`;
        if (elRatioBar) {
            // Шкала от 1.5× до 4.5×, 3.0× = 50%
            const pct = Math.max(0, Math.min(100, ((ratio - 1.5) / 3.0) * 100));
            elRatioBar.style.width = `${pct}%`;
            elRatioBar.className = 'timing-gauge-fill';
            if (ratio < 2.6 || ratio > 3.4) elRatioBar.classList.add('error');
            else if (ratio < 2.8 || ratio > 3.2) elRatioBar.classList.add('warning');
        }
        if (elRatioStatus) {
            if (ratio >= 2.85 && ratio <= 3.15) {
                elRatioStatus.innerHTML = '<span style="color:#10b981;">' + (t('timinglab.ratio_ideal') || '✓ Идеальный баланс (ITU)') + '</span>';
            } else if (ratio < 2.85) {
                elRatioStatus.innerHTML = '<span style="color:#f59e0b;">' + (t('timinglab.ratio_short') || '⚠️ Тире слегка укорочены') + '</span>';
            } else {
                elRatioStatus.innerHTML = '<span style="color:#f59e0b;">' + (t('timinglab.ratio_long') || '⚠️ Тире затянуты') + '</span>';
            }
        }

        // 2. Межбуквенная пауза (3T)
        let avgCharPause = 3.0 * ditT;
        if (state.recordedCharPauses.length > 0) {
            avgCharPause = state.recordedCharPauses.reduce((a, b) => a + b, 0) / state.recordedCharPauses.length;
        }
        const charUnits = (avgCharPause / ditT).toFixed(1);
        const msUnit = t('js.paris.dot_unit') || 'мс';
        if (elCharPauseVal) elCharPauseVal.textContent = `${charUnits}T (${Math.round(avgCharPause)} ${msUnit})`;
        if (elCharPauseBar) {
            const pct = Math.max(0, Math.min(100, ((parseFloat(charUnits) - 1.0) / 4.0) * 100));
            elCharPauseBar.style.width = `${pct}%`;
            elCharPauseBar.className = 'timing-gauge-fill';
            if (charUnits < 2.3 || charUnits > 4.2) elCharPauseBar.classList.add('error');
            else if (charUnits < 2.6 || charUnits > 3.5) elCharPauseBar.classList.add('warning');
        }
        if (elCharPauseStatus) {
            if (charUnits >= 2.6 && charUnits <= 3.5) {
                elCharPauseStatus.innerHTML = '<span style="color:#10b981;">' + (t('timinglab.char_ideal') || '✓ Чёткий раздельный ритм') + '</span>';
            } else if (charUnits < 2.6) {
                elCharPauseStatus.innerHTML = '<span style="color:#ef4444;">' + (t('timinglab.char_stick') || '⚠️ Буквы слипаются (<2.6T)') + '</span>';
            } else {
                elCharPauseStatus.innerHTML = '<span style="color:#f59e0b;">' + (t('timinglab.char_lag') || '⚠️ Зависание между буквами') + '</span>';
            }
        }

        // 3. Межсловная пауза (7T)
        let avgWordPause = 7.0 * ditT;
        if (state.recordedWordPauses.length > 0) {
            avgWordPause = state.recordedWordPauses.reduce((a, b) => a + b, 0) / state.recordedWordPauses.length;
        }
        const wordUnits = (avgWordPause / ditT).toFixed(1);
        if (elWordPauseVal) elWordPauseVal.textContent = `${wordUnits}T (${Math.round(avgWordPause)} ${msUnit})`;
        if (elWordPauseBar) {
            const pct = Math.max(0, Math.min(100, ((parseFloat(wordUnits) - 3.0) / 8.0) * 100));
            elWordPauseBar.style.width = `${pct}%`;
            elWordPauseBar.className = 'timing-gauge-fill';
            if (wordUnits < 5.0 || wordUnits > 10.0) elWordPauseBar.classList.add('error');
            else if (wordUnits < 6.0 || wordUnits > 8.5) elWordPauseBar.classList.add('warning');
        }
        if (elWordPauseStatus) {
            if (wordUnits >= 6.0 && wordUnits <= 8.5) {
                elWordPauseStatus.innerHTML = '<span style="color:#10b981;">' + (t('timinglab.word_ideal') || '✓ Честный пробел 7T') + '</span>';
            } else if (wordUnits < 6.0) {
                elWordPauseStatus.innerHTML = '<span style="color:#ef4444;">' + (t('timinglab.word_stick') || '⚠️ Слова слипаются (<6T)') + '</span>';
            } else {
                elWordPauseStatus.innerHTML = '<span style="color:#f59e0b;">' + (t('timinglab.word_lag') || '⚠️ Пауза затянута') + '</span>';
            }
        }

        // 4. Скорость и точность ритма
        if (elSpeedWpmVal) elSpeedWpmVal.textContent = `${state.currentWpm} WPM`;
        const effCpm = calculateEffectiveCpm(state.targetText, state.currentWpm);
        const cpmUnit = t('timinglab.cpm_unit') || 'зн/мин';
        if (elSpeedCpmVal) elSpeedCpmVal.textContent = `~${effCpm} ${cpmUnit}`;

        // Итоговый балл
        let totalScore = 100;
        if (state.auditLog.length > 0) {
            const sum = state.auditLog.reduce((acc, row) => acc + row.score, 0);
            totalScore = Math.round(sum / state.auditLog.length);
        }
        if (elScoreVal) elScoreVal.textContent = `${totalScore}%`;

        const elScoreBar = document.getElementById('timing-score-bar');
        if (elScoreBar) {
            elScoreBar.style.width = `${totalScore}%`;
            elScoreBar.style.background = totalScore >= 85 ? '#4fd8c4' : (totalScore >= 70 ? '#f59e0b' : '#ef4444');
        }

        if (elClassBadge) {
            if (!state.isRunning && state.auditLog.length === 0) {
                elClassBadge.innerHTML = '<span style="color:var(--text-muted); font-weight:600;">' + (t('timinglab.badge_waiting') || '○ Ожидание замера') + '</span>';
            } else if (totalScore >= 95) {
                const bText = (t('timinglab.badge_metronome') || '🟢 ЭТАЛОННЫЙ МЕТРОНОМ ({score}%)').replace('{score}', totalScore);
                elClassBadge.innerHTML = `<span style="color:#10b981; font-weight:800;">${bText}</span>`;
            } else if (totalScore >= 85) {
                const bText = (t('timinglab.badge_stable') || '🟢 СТАБИЛЬНЫЙ ПОЧЕРК ({score}%)').replace('{score}', totalScore);
                elClassBadge.innerHTML = `<span style="color:#4fd8c4; font-weight:800;">${bText}</span>`;
            } else if (totalScore >= 70) {
                const bText = (t('timinglab.badge_fair') || '🟡 УДОВЛЕТВОРИТЕЛЬНО ({score}%)').replace('{score}', totalScore);
                elClassBadge.innerHTML = `<span style="color:#f59e0b; font-weight:800;">${bText}</span>`;
            } else {
                const bText = (t('timinglab.badge_unstable') || '🔴 ПЛАВАЮЩИЙ РИТМ ({score}%)').replace('{score}', totalScore);
                elClassBadge.innerHTML = `<span style="color:#ef4444; font-weight:800;">${bText}</span>`;
            }
        }
    }

    // --- Осциллограмма / Таймлайн ---
    function pushTimelineEvent(type, duration) {
        state.timelineEvents.push({ type, duration });
        if (state.timelineEvents.length > 40) {
            state.timelineEvents.shift();
        }
    }

    function renderTimeline() {
        if (!canvas || !ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#020406';
        ctx.fillRect(0, 0, w, h);

        // Сетка
        ctx.strokeStyle = '#0e1722';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // Отрисовка элементов справа налево
        let curX = w - 15;
        const scale = 0.35; // пикселей на миллисекунду

        for (let i = state.timelineEvents.length - 1; i >= 0; i--) {
            const ev = state.timelineEvents[i];
            const evW = Math.max(3, ev.duration * scale);

            if (ev.type === 'dit') {
                ctx.fillStyle = '#4fd8c4';
                ctx.fillRect(curX - evW, h / 2 - 14, evW, 28);
                // Метка длительности
                ctx.fillStyle = '#8396a8';
                ctx.font = '9px monospace';
                ctx.fillText(`${ev.duration}m`, curX - evW, h - 8);
            } else if (ev.type === 'dah') {
                ctx.fillStyle = '#2dd4bf';
                ctx.fillRect(curX - evW, h / 2 - 14, evW, 28);
                ctx.fillStyle = '#8396a8';
                ctx.font = '9px monospace';
                ctx.fillText(`${ev.duration}m`, curX - evW, h - 8);
            } else if (ev.type === 'pause') {
                // Пауза (пунктир)
                ctx.strokeStyle = '#1e2d3d';
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(curX - evW, h / 2);
                ctx.lineTo(curX, h / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            curX -= (evW + 4);
            if (curX < 0) break;
        }
    }

    function showFinalVerdict() {
        if (state.auditLog.length === 0) return;
        const total = state.auditLog.length;
        const sum = state.auditLog.reduce((a, b) => a + b.score, 0);
        const avg = Math.round(sum / total);

        const vTpl = t('timinglab.verdict_title') || "Тест фразы «{text}» завершён!\nТочность ритма: {avg}%\n";
        let verdictText = vTpl.replace('{text}', state.targetText).replace('{avg}', avg);
        if (avg >= 95) verdictText += (t('timinglab.verdict_itu') || 'Идеальный эталонный метроном по нормативам ITU!');
        else if (avg >= 85) verdictText += (t('timinglab.verdict_class1') || 'Отличная передача норматива 1-го разряда!');
        else verdictText += (t('timinglab.verdict_check') || 'Обратите внимание на паузы между знаками в таблице аудита.');

        console.log('[TimingLab Verdict]', verdictText);
    }

    // --- Инициализация событий ---
    function setupEvents() {
        if (elBtnStart) {
            elBtnStart.addEventListener('click', () => {
                if (state.isRunning) {
                    stopSession();
                } else {
                    startSession();
                }
            });
        }

        if (elBtnReset) {
            elBtnReset.addEventListener('click', resetSession);
        }

        elPresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elPresetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const preset = btn.dataset.preset;
                state.activePreset = preset;

                if (preset === 'custom') {
                    if (elCustomWrap) elCustomWrap.style.display = 'flex';
                } else {
                    if (elCustomWrap) elCustomWrap.style.display = 'none';
                    if (PRESETS[preset]) {
                        setTargetText(PRESETS[preset]);
                    }
                }
            });
        });

        if (elCustomApply && elCustomInput) {
            elCustomApply.addEventListener('click', () => {
                const val = elCustomInput.value.trim().toUpperCase();
                if (val.length > 0) {
                    setTargetText(val);
                }
            });
        }

        // Обновление WPM из ключа
        window.addEventListener('morse_wpm_change', (e) => {
            if (e.detail && e.detail.wpm) {
                state.currentWpm = parseInt(e.detail.wpm, 10);
                updateGauges();
            }
        });

        // Клавиатурный режим передачи для тестирования без подключенного ключа
        let spaceDownTime = 0;
        let spaceToneOsc = null;
        let spaceToneGain = null;
        let spaceAudioCtx = null;
        let charAssembleTimer = null;
        let currentMorseSeq = '';

        const MORSE_TABLE = {
            '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
            '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
            '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
            '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
            '-.--': 'Y', '--..': 'Z',
            '.----': '1', '..---': '2', '...--': '3', '....-': '4', '.....': '5',
            '-....': '6', '--...': '7', '---..': '8', '----.': '9', '-----': '0',
            '--..--': ',', '.-.-.-': '.', '..--..': '?', '-...-': '=', '.-.-.': '+',
            '-..-.': '/', '...-.-': 'SK', '.-...': 'AS', '-.--.': 'KN', '...---...': 'SOS'
        };

        function startKeyAudio() {
            try {
                if (!spaceAudioCtx) {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    if (AC) spaceAudioCtx = new AC();
                }
                if (spaceAudioCtx && spaceAudioCtx.state === 'suspended') {
                    spaceAudioCtx.resume();
                }
                if (!spaceAudioCtx) return;
                const now = spaceAudioCtx.currentTime;
                spaceToneOsc = spaceAudioCtx.createOscillator();
                spaceToneGain = spaceAudioCtx.createGain();
                spaceToneOsc.type = 'sine';
                spaceToneOsc.frequency.setValueAtTime(700, now);
                spaceToneGain.gain.setValueAtTime(0, now);
                spaceToneGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
                spaceToneOsc.connect(spaceToneGain).connect(spaceAudioCtx.destination);
                spaceToneOsc.start(now);
            } catch (e) {}
        }

        function stopKeyAudio() {
            if (!spaceToneOsc) return;
            try {
                const now = spaceAudioCtx.currentTime;
                spaceToneGain.gain.linearRampToValueAtTime(0, now + 0.005);
                spaceToneOsc.stop(now + 0.01);
            } catch (e) {}
            spaceToneOsc = null;
        }

        window.addEventListener('keydown', (e) => {
            if (!state.isRunning) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                spaceDownTime = performance.now();
                startKeyAudio();
                clearTimeout(charAssembleTimer);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!state.isRunning) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                stopKeyAudio();
                if (spaceDownTime > 0) {
                    const pressDuration = performance.now() - spaceDownTime;
                    spaceDownTime = 0;
                    const ditT = 1200 / state.currentWpm;

                    if (pressDuration < ditT * 1.8) {
                        onDit();
                        currentMorseSeq += '.';
                    } else {
                        onDah();
                        currentMorseSeq += '-';
                    }

                    clearTimeout(charAssembleTimer);
                    charAssembleTimer = setTimeout(() => {
                        if (currentMorseSeq.length > 0) {
                            const recognized = MORSE_TABLE[currentMorseSeq] || '?';
                            currentMorseSeq = '';
                            onChar(recognized);
                        }
                    }, ditT * 2.8);
                }
            }
        });
    }

    // Экспорт в глобальную область
    window.TimingLab = {
        init: function() {
            initDOMElements();
            setTargetText(PRESETS.paris);
            setupEvents();
            updateGauges();
        },
        setWpm: function(wpm) {
            state.currentWpm = parseInt(wpm, 10) || 20;
            updateGauges();
        },
        onDit: onDit,
        onDah: onDah,
        onChar: onChar,
        onSpace: onSpace
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.TimingLab.init);
    } else {
        window.TimingLab.init();
    }
})();

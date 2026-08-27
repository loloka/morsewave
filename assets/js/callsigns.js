(function () {
    const setupPanel = document.getElementById('setup-panel');
    const sessionPanel = document.getElementById('session-panel');
    const resultPanel = document.getElementById('result-panel');
    const csIndexEl = document.getElementById('cs-index');
    const csTotalEl = document.getElementById('cs-total');
    const answerInput = document.getElementById('cs-answer');
    const feedbackEl = document.getElementById('cs-feedback');
    const setupError = document.getElementById('setup-error');
    const signalLine = new SignalLine(document.getElementById('cs-signal'));
    wireSignalVisibilityToggle(document.getElementById('cs-signal-toggle'), document.getElementById('cs-signal'));
    const lamp = new MorseLamp(document.getElementById('cs-lamp'));

    const wpmSlider = document.getElementById('cs-wpm');
    const wpmValue = document.getElementById('cs-wpm-value');
    const wpmCpm = document.getElementById('cs-wpm-cpm');
    wpmSlider.addEventListener('input', () => { wpmValue.textContent = wpmSlider.value; wpmCpm.textContent = cpmHintText(wpmSlider.value); });

    let session = null;
    let isPlaying = false;
    const replayBtn = document.getElementById('replay-btn');

    async function fetchCallsigns(count) {
        const res = await fetch(`api/callsigns.php?count=${count}`);
        if (!res.ok) throw new Error('network');
        return res.json();
    }

    async function playCurrent() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        replayBtn.disabled = true;
        signalLine.clear();
        answerInput.focus();
        try {
            const audio = new MorseAudio({ wpm: session.wpm });
            await audio.play(session.items[session.index].callsign, {
                onSymbol: ({ symbol, durationMs }) => {
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                },
            });
        } catch (e) {
            console.error('Ошибка воспроизведения позывного:', e);
        } finally {
            isPlaying = false;
            replayBtn.disabled = false;
            answerInput.focus();
        }
    }

    async function startSession() {
        const wpm = parseInt(wpmSlider.value, 10);
        const count = parseInt(document.getElementById('cs-count').value, 10);
        setupError.className = 'feedback';

        let items;
        try {
            items = await fetchCallsigns(count);
            if (!items.length) throw new Error('empty');
        } catch {
            setupError.textContent = t('js.cs.fetch_error');
            setupError.className = 'feedback show bad';
            return;
        }

        session = { items, index: 0, wpm, correct: 0 };
        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        csTotalEl.textContent = items.length;
        csIndexEl.textContent = 1;
        feedbackEl.className = 'feedback';
        answerInput.value = '';
        answerInput.focus();
        playCurrent();
    }

    function submitAnswer() {
        if (!session) return;
        const expected = session.items[session.index].callsign.toUpperCase();
        const typed = answerInput.value.trim().toUpperCase();
        const isCorrect = typed === expected;

        if (isCorrect) {
            session.correct++;
            feedbackEl.textContent = t('js.cs.correct', { '{expected}': expected });
            feedbackEl.className = 'feedback show ok';
            // Начисляем сразу — не нужно дожидаться конца сессии,
            // чтобы засчитанный позывной действительно засчитался.
            Progress.addXp(20);
            Progress.incrementStat('callsignsCompleted', 1);
            postStat('total_callsigns', 1);
        } else {
            feedbackEl.textContent = t('js.cs.wrong', { '{expected}': expected, '{typed}': typed || t('js.cs.empty_placeholder') });
            feedbackEl.className = 'feedback show bad';
        }

        session.index++;
        answerInput.value = '';
        if (session.index >= session.items.length) {
            setTimeout(finishSession, 700);
        } else {
            csIndexEl.textContent = session.index + 1;
            answerInput.focus();
            setTimeout(playCurrent, 900);
        }
    }

    async function finishSession() {
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const total = session.items.length;
        const accuracy = total ? session.correct / total : 0;
        const xpEarned = session.correct * 20;

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correct}/${total}`;
        document.getElementById('result-xp').textContent = xpEarned;

        let dailyBonusMsg = '';
        let dailyBonusFail = false;
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('daily') === '1') {
            const req = DailyChallenge.forToday();
            if (req.type === 'callsigns') {
                const matches = (total === req.count) && (session.wpm === req.wpm);
                if (!matches) {
                    dailyBonusFail = true;
                    dailyBonusMsg = t('js.groups.daily_mismatch', {
                        '{count}': req.count,
                        '{len}': 0, // Not applicable for callsigns
                        '{wpm}': req.wpm
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
                        Progress.completeDailyChallenge();
                        dailyBonusMsg = t('js.groups.daily_bonus');
                    }
                }
            }
        }

        // Clean up previous daily note if any
        const oldNote = document.getElementById('cs-daily-note');
        if (oldNote) oldNote.remove();

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.id = 'cs-daily-note';
            note.className = (dailyBonusFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2') + ' js-result-note';
            note.textContent = (dailyBonusFail ? t('js.groups.daily_note_fail_prefix') : t('js.groups.daily_note_ok_prefix')) + dailyBonusMsg;
            
            // Insert note after the grid
            const grid = resultPanel.querySelector('.grid');
            grid.insertAdjacentElement('afterend', note);
        }

        Progress.incrementStat('sessionsCompleted', 1);
        Progress.markDailyActivity();
        postStat('total_sessions', 1);
    }

    async function postStat(field, amount) {
        if (amount <= 0) return;
        try {
            await fetch('api/stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, amount }),
            });
        } catch { /* игнорируем офлайн */ }
    }

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    replayBtn.addEventListener('click', playCurrent);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
    });
    answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });

    /* ---------- Добавить свой позывной ---------- */
    const newCallsignInput = document.getElementById('new-callsign-input');
    const newCallsignCountry = document.getElementById('new-callsign-country');
    const addCallsignBtn = document.getElementById('add-callsign-btn');
    const addCallsignFeedback = document.getElementById('add-callsign-feedback');

    async function addCallsign() {
        const callsign = newCallsignInput.value.trim().toUpperCase();
        const country = newCallsignCountry.value.trim();
        if (!callsign) return;

        addCallsignBtn.disabled = true;
        try {
            const res = await fetch('api/add_callsign.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callsign, country: country || null }),
            });
            const data = await res.json();
            if (res.ok) {
                addCallsignFeedback.textContent = t('js.cs.add_success', { '{callsign}': data.callsign });
                addCallsignFeedback.className = 'feedback show ok';
                newCallsignInput.value = '';
                newCallsignCountry.value = '';
            } else {
                addCallsignFeedback.textContent = data.error || t('js.cs.add_failed');
                addCallsignFeedback.className = 'feedback show bad';
            }
        } catch {
            addCallsignFeedback.textContent = t('js.cs.add_network_error');
            addCallsignFeedback.className = 'feedback show bad';
        } finally {
            addCallsignBtn.disabled = false;
        }
    }

    addCallsignBtn.addEventListener('click', addCallsign);
    newCallsignInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCallsign(); });

    // Обработка параметров из URL (для заданий дня)
    const initParams = new URLSearchParams(window.location.search);
    if (initParams.get('daily') === '1') {
        const pCount = parseInt(initParams.get('count'), 10);
        const pWpm = parseInt(initParams.get('wpm'), 10);
        if (pCount) {
            const select = document.getElementById('cs-count');
            // Убедимся, что опция существует, прежде чем выставлять
            if (Array.from(select.options).some(o => o.value === pCount.toString())) {
                select.value = pCount.toString();
            }
        }
        if (pWpm) {
            wpmSlider.value = pWpm;
            wpmValue.textContent = pWpm;
            wpmCpm.textContent = cpmHintText(pWpm);
        }
        
        // Создадим баннер, что задание активно
        if (!DailyChallenge.isDoneToday()) {
            const req = DailyChallenge.forToday();
            if (req.type === 'callsigns') {
                const banner = document.createElement('div');
                banner.className = 'feedback show mt-2';
                banner.textContent = t('js.groups.daily_banner');
                document.getElementById('setup-panel').appendChild(banner);
            }
        }
    }
})();

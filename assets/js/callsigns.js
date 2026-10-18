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
    if (wpmCpm) wpmCpm.dataset.cpmType = 'callsigns';
    const savedWpm = localStorage.getItem('morse_cs_wpm');
    if (savedWpm) {
        wpmSlider.value = savedWpm;
        wpmValue.textContent = savedWpm;
        if (typeof cpmHintText === 'function') wpmCpm.textContent = cpmHintText(savedWpm, 'callsigns');
    }
    wpmSlider.addEventListener('input', () => { 
        wpmValue.textContent = wpmSlider.value; 
        if (typeof cpmHintText === 'function') wpmCpm.textContent = cpmHintText(wpmSlider.value, 'callsigns'); 
        localStorage.setItem('morse_cs_wpm', wpmSlider.value);
    });

    // Farnsworth controls
    const fwEnabled = document.getElementById('cs-farnsworth-enabled');
    const fwSlider = document.getElementById('cs-farnsworth');
    const fwValue = document.getElementById('cs-farnsworth-value');
    const fwCpm = document.getElementById('cs-farnsworth-cpm');
    if (fwCpm) fwCpm.dataset.cpmType = 'callsigns';
    const fwPanel = document.getElementById('cs-farnsworth-panel');

    function updateCsFarnsworthVisibility() {
        const on = fwEnabled && fwEnabled.checked;
        if (fwPanel) fwPanel.style.display = on ? 'block' : 'none';
    }

    const savedFwEnabled = localStorage.getItem('morse_cs_fw_enabled');
    if (savedFwEnabled === 'true' && fwEnabled) {
        fwEnabled.checked = true;
    }
    updateCsFarnsworthVisibility();

    const savedFwWpm = localStorage.getItem('morse_cs_fw_wpm');
    if (savedFwWpm && fwSlider) {
        fwSlider.value = savedFwWpm;
        if (fwValue) fwValue.textContent = savedFwWpm;
        if (fwCpm && typeof cpmHintText === 'function') fwCpm.textContent = cpmHintText(savedFwWpm, 'callsigns');
    }
    if (fwSlider) {
        fwSlider.addEventListener('input', () => {
            if (fwValue) fwValue.textContent = fwSlider.value;
            if (fwCpm && typeof cpmHintText === 'function') fwCpm.textContent = cpmHintText(fwSlider.value, 'callsigns');
            localStorage.setItem('morse_cs_fw_wpm', fwSlider.value);
        });
    }
    if (fwEnabled) {
        fwEnabled.addEventListener('change', () => {
            updateCsFarnsworthVisibility();
            localStorage.setItem('morse_cs_fw_enabled', fwEnabled.checked);
        });
    }

    // Buffer input controls
    const bufferCheckbox = document.getElementById('cs-buffer-enabled');
    const bufferPanel = document.getElementById('cs-buffer-panel');
    const bufferLabel = document.getElementById('cs-buffer-label');
    let selectedBufferDepth = localStorage.getItem('morse_cs_buffer_depth') || 'all';

    function updateCsBufferTip(depth) {
        const tipEl = document.getElementById('cs-buffer-tip-text');
        if (!tipEl) return;
        if (depth === 'all') {
            tipEl.textContent = '💡 ' + t('groups.buffer_tip_all');
        } else {
            tipEl.textContent = '💡 ' + t('groups.buffer_tip_lag', { '{n}': depth });
        }
    }

    function updateCsBufferPanelVisibility() {
        if (bufferPanel) {
            bufferPanel.style.display = (bufferCheckbox && bufferCheckbox.checked && (!paperCheckbox || !paperCheckbox.checked)) ? 'block' : 'none';
        }
    }

    if (bufferCheckbox) {
        const savedBufferEnabled = localStorage.getItem('morse_cs_buffer_enabled');
        if (savedBufferEnabled !== null) {
            bufferCheckbox.checked = (savedBufferEnabled === 'true');
        }
        updateCsBufferPanelVisibility();
        bufferCheckbox.addEventListener('change', () => {
            localStorage.setItem('morse_cs_buffer_enabled', bufferCheckbox.checked);
            updateCsBufferPanelVisibility();
        });
    }

    document.querySelectorAll('#cs-buffer-depth-chips .chip').forEach(chip => {
        if (chip.dataset.depth === selectedBufferDepth) {
            document.querySelectorAll('#cs-buffer-depth-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        }
        chip.addEventListener('click', () => {
            document.querySelectorAll('#cs-buffer-depth-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedBufferDepth = chip.dataset.depth;
            localStorage.setItem('morse_cs_buffer_depth', selectedBufferDepth);
            updateCsBufferTip(selectedBufferDepth);
        });
    });
    updateCsBufferTip(selectedBufferDepth);

    // Paper copy mode controls
    const paperCheckbox = document.getElementById('cs-paper-enabled');
    const paperPanel = document.getElementById('cs-paper-panel');
    const paperGapSlider = document.getElementById('cs-paper-gap');
    const paperGapValue = document.getElementById('cs-paper-gap-value');
    const paperSessionDisplay = document.getElementById('cs-paper-session-display');
    const paperStatusMsg = document.getElementById('cs-paper-status-msg');
    const paperSubMsg = document.getElementById('cs-paper-sub-msg');
    const paperProgressWrap = document.getElementById('cs-paper-progress-wrap');
    const paperProgressBar = document.getElementById('cs-paper-progress-bar');
    const paperControlsRow = document.getElementById('cs-paper-controls-row');
    const paperStopBtn = document.getElementById('cs-paper-stop-btn');
    const paperResultBlock = document.getElementById('cs-paper-result-block');
    const paperRadiogramText = document.getElementById('cs-paper-radiogram-text');
    const paperCopyBtn = document.getElementById('cs-paper-copy-btn');
    const csSubmitRow = document.getElementById('cs-submit-row');

    let csPaperSleepResolve = null;
    let csPaperSleepTimer = null;

    function cancelCsPaperSleep() {
        if (csPaperSleepTimer) {
            clearInterval(csPaperSleepTimer);
            csPaperSleepTimer = null;
        }
        if (csPaperSleepResolve) {
            const r = csPaperSleepResolve;
            csPaperSleepResolve = null;
            r();
        }
        if (paperProgressWrap) {
            paperProgressWrap.style.display = 'none';
        }
    }

    function updateCsPaperPanelVisibility() {
        const isPaper = paperCheckbox && paperCheckbox.checked;
        if (paperPanel) {
            paperPanel.style.display = isPaper ? 'block' : 'none';
        }
        if (bufferCheckbox) {
            bufferCheckbox.disabled = isPaper;
            if (bufferLabel) bufferLabel.style.opacity = isPaper ? '0.5' : '1';
        }
        if (isPaper && bufferPanel) {
            bufferPanel.style.display = 'none';
        } else if (!isPaper) {
            updateCsBufferPanelVisibility();
        }
    }

    if (paperCheckbox) {
        const savedPaperEnabled = localStorage.getItem('morse_cs_paper_enabled');
        if (savedPaperEnabled !== null) {
            paperCheckbox.checked = (savedPaperEnabled === 'true');
        }
        updateCsPaperPanelVisibility();
        paperCheckbox.addEventListener('change', () => {
            localStorage.setItem('morse_cs_paper_enabled', paperCheckbox.checked);
            updateCsPaperPanelVisibility();
            updateCsExtraActiveDot();
        });
    }

    if (paperGapSlider) {
        const savedPaperGap = localStorage.getItem('morse_cs_paper_gap');
        if (savedPaperGap) {
            paperGapSlider.value = savedPaperGap;
            if (paperGapValue) paperGapValue.textContent = parseFloat(savedPaperGap).toFixed(1);
        }
        paperGapSlider.addEventListener('input', () => {
            if (paperGapValue) paperGapValue.textContent = parseFloat(paperGapSlider.value).toFixed(1);
        });
        paperGapSlider.addEventListener('change', () => {
            localStorage.setItem('morse_cs_paper_gap', paperGapSlider.value);
        });
    }

    // Extra parameters accordion and active dot indicator
    const csExtraToggleBtn = document.getElementById('cs-extra-toggle-btn');
    const csExtraContent = document.getElementById('cs-extra-content');
    const csExtraChevron = document.getElementById('cs-extra-chevron');
    const csExtraActiveDot = document.getElementById('cs-extra-active-dot');

    function updateCsExtraActiveDot() {
        const fw = document.getElementById('cs-farnsworth-enabled');
        const buf = document.getElementById('cs-buffer-enabled');
        const paper = document.getElementById('cs-paper-enabled');
        const readyEl = document.getElementById('cs-ready-signal-enabled');
        const audioSettings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : null;
        const isNoise = !!(audioSettings && audioSettings.noiseLevel > 0);
        const isReady = !!(readyEl && readyEl.checked);
        const isActive = !!((fw && fw.checked) || (buf && buf.checked) || (paper && paper.checked) || isNoise || isReady);
        if (csExtraActiveDot) csExtraActiveDot.style.display = isActive ? 'inline-block' : 'none';
        return isActive;
    }

    if (csExtraToggleBtn && csExtraContent) {
        csExtraToggleBtn.addEventListener('click', () => {
            const isOpen = (csExtraContent.style.display !== 'none');
            csExtraContent.style.display = isOpen ? 'none' : 'block';
            if (csExtraChevron) csExtraChevron.textContent = isOpen ? '▾' : '▴';
            csExtraToggleBtn.classList.toggle('is-open', !isOpen);
        });
    }

    // Tone & Noise & Ready signal controls
    const readySignalEl = document.getElementById('cs-ready-signal-enabled');
    const csToneFreq = document.getElementById('cs-tone-freq');
    const csToneFreqVal = document.getElementById('cs-tone-freq-value');
    const csCwNoiseChips = document.querySelectorAll('#cs-cw-noise-chips .chip');

    if (typeof AudioSettings !== 'undefined') {
        const audioSettings = AudioSettings.load();
        if (readySignalEl) {
            readySignalEl.checked = !!audioSettings.readySignal;
            readySignalEl.addEventListener('change', () => {
                const s = AudioSettings.load();
                s.readySignal = readySignalEl.checked;
                AudioSettings.save(s);
                localStorage.setItem('morsewave_ready_signal_user_set', '1');
                updateCsExtraActiveDot();
            });
        }
        if (csToneFreq && csToneFreqVal) {
            csToneFreq.value = audioSettings.freq || 600;
            csToneFreqVal.textContent = audioSettings.freq || 600;
            csToneFreq.addEventListener('input', () => {
                const s = AudioSettings.load();
                s.freq = parseInt(csToneFreq.value, 10);
                csToneFreqVal.textContent = s.freq;
                AudioSettings.save(s);
            });
        }
        if (csCwNoiseChips.length) {
            const currentNoise = audioSettings.noiseLevel || 0;
            csCwNoiseChips.forEach(c => c.classList.toggle('active', parseFloat(c.dataset.noise) === currentNoise));
            csCwNoiseChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    csCwNoiseChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const s = AudioSettings.load();
                    s.noiseLevel = parseFloat(chip.dataset.noise) || 0;
                    AudioSettings.save(s);
                    if (window.__morseSharedAudioCtx && typeof getSharedMorseAudioBus === 'function') {
                        const bus = getSharedMorseAudioBus(window.__morseSharedAudioCtx);
                        bus.configure({ noiseLevel: s.noiseLevel });
                        if (bus.isSessionNoiseActive()) {
                            bus.setNoiseLevel(s.noiseLevel);
                        }
                    }
                    updateCsExtraActiveDot();
                });
            });
        }
        updateCsExtraActiveDot();
    }

    [document.getElementById('cs-farnsworth-enabled'),
     document.getElementById('cs-buffer-enabled'),
     document.getElementById('cs-paper-enabled'),
     document.getElementById('cs-ready-signal-enabled')].forEach(el => {
        if (el) el.addEventListener('change', updateCsExtraActiveDot);
    });

    const csCountEl = document.getElementById('cs-count');
    const savedCount = localStorage.getItem('morse_cs_count');
    if (savedCount && csCountEl) {
        csCountEl.value = savedCount;
    }
    if (csCountEl) {
        csCountEl.addEventListener('change', () => {
            localStorage.setItem('morse_cs_count', csCountEl.value);
        });
    }

    let session = null;
    let isPlaying = false;
    let currentAudio = null;
    const replayBtn = document.getElementById('replay-btn');
    
    const vkbEl = document.getElementById('cs-vkb');
    let vkb = null;
    function renderVkb() {
        if (!vkb && typeof VirtualKeyboard !== 'undefined' && vkbEl) {
            vkb = new VirtualKeyboard(vkbEl, answerInput, { showSpace: false, showSlash: true });
        }
    }

    const FALLBACK_CALLSIGNS = [
        { callsign: 'R1ABC', country: 'Россия' },
        { callsign: 'UA3XYZ', country: 'Россия' },
        { callsign: 'RA9F', country: 'Россия' },
        { callsign: 'RZ6D', country: 'Россия' },
        { callsign: 'RK4W', country: 'Россия' },
        { callsign: 'R7ABC', country: 'Россия' },
        { callsign: 'R2XY', country: 'Россия' },
        { callsign: 'RA1XYZ', country: 'Россия' },
        { callsign: 'RN6AB', country: 'Россия' },
        { callsign: 'RU9CD', country: 'Россия' },
        { callsign: 'RV3EF', country: 'Россия' },
        { callsign: 'RW4GH', country: 'Россия' },
        { callsign: 'RX2IJ', country: 'Россия' },
        { callsign: 'RZ8KL', country: 'Россия' },
        { callsign: 'RC5MN', country: 'Россия' },
        { callsign: 'RD7OP', country: 'Россия' },
        { callsign: 'RO1QR', country: 'Россия' },
        { callsign: 'UA9XYZ', country: 'Россия' },
        { callsign: 'UB4ABC', country: 'Россия' },
        { callsign: 'UI8AB', country: 'Россия' },
        { callsign: 'R9OGL', country: 'Россия' },
        { callsign: 'RK3DJW', country: 'Россия' },
        { callsign: 'W1AW', country: 'США' },
        { callsign: 'K5ZZ', country: 'США' },
        { callsign: 'N4XYZ', country: 'США' },
        { callsign: 'AA7BC', country: 'США' },
        { callsign: 'G0ABC', country: 'Великобритания' },
        { callsign: 'M0XYZ', country: 'Великобритания' },
        { callsign: 'DL1ABC', country: 'Германия' },
        { callsign: 'DK5XYZ', country: 'Германия' },
        { callsign: 'DJ9ZB', country: 'Германия' },
        { callsign: 'JA1ABC', country: 'Япония' },
        { callsign: 'JH3XYZ', country: 'Япония' },
        { callsign: 'F5ABC', country: 'Франция' },
        { callsign: 'F4XYZ', country: 'Франция' },
        { callsign: 'EA1XYZ', country: 'Испания' },
        { callsign: 'SP5ABC', country: 'Польша' },
        { callsign: 'SM0XYZ', country: 'Швеция' },
        { callsign: 'VE3ABC', country: 'Канада' },
        { callsign: 'VK2ABC', country: 'Австралия' },
        { callsign: 'ZL1ABC', country: 'Новая Зеландия' },
        { callsign: 'HB9ABC', country: 'Швейцария' },
        { callsign: 'PY2ABC', country: 'Бразилия' },
        { callsign: 'LU1ABC', country: 'Аргентина' },
        { callsign: 'OK1ABC', country: 'Чехия' },
        { callsign: 'OE3XYZ', country: 'Австрия' },
        { callsign: 'I2ABC', country: 'Италия' }
    ];

    function getLocalCachedCallsigns(count) {
        try {
            const raw = localStorage.getItem('morse_cached_callsigns');
            const list = raw ? JSON.parse(raw) : [];
            if (Array.isArray(list) && list.length >= 5) {
                const shuffled = [...list].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count);
            }
        } catch {}
        const shuffled = [...FALLBACK_CALLSIGNS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    function saveCallsignsToCache(items) {
        if (!Array.isArray(items) || !items.length) return;
        try {
            const raw = localStorage.getItem('morse_cached_callsigns');
            const existing = (raw ? JSON.parse(raw) : []) || [];
            const map = new Map();
            for (const item of existing) {
                if (item && item.callsign) map.set(item.callsign, item);
            }
            for (const item of items) {
                if (item && item.callsign) map.set(item.callsign, item);
            }
            const merged = Array.from(map.values()).slice(-200);
            localStorage.setItem('morse_cached_callsigns', JSON.stringify(merged));
        } catch {}
    }

    async function fetchCallsigns(count) {
        try {
            const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
            const res = await fetch(`api/callsigns.php?count=${count}`, controller ? { signal: controller.signal } : {});
            if (timer) clearTimeout(timer);
            if (!res.ok) throw new Error('status_' + res.status);
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
                saveCallsignsToCache(data);
                return data;
            }
            throw new Error('empty');
        } catch (e) {
            console.warn('Network fetch callsigns failed, using offline cache/fallback:', e);
            const cached = getLocalCachedCallsigns(count);
            if (cached && cached.length) return cached;
            throw e;
        }
    }

    const EXAM_ATTENTION_TEXT = 'ЖЖЖ=';
    const EXAM_ATTENTION_COUNTDOWN = { 0: '3', 1: '2', 2: '1' };
    const delay = ms => new Promise(r => setTimeout(r, ms));

    async function runReadyAttentionSequence(onStart) {
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
        if (!mySession.isPaperMode && answerInput) {
            answerInput.disabled = false;
            answerInput.focus();
        }

        await delay(1400);
        if (session !== mySession || mySession.finished || mySession.paperStopped) return;
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';

        if (typeof onStart === 'function') onStart();
    }

    async function playCurrent() {
        if (isPlaying) return; // защита от спама кнопкой "Повторить"
        isPlaying = true;
        if (replayBtn) replayBtn.disabled = true;
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
                    answerInput.placeholder = t('cs.buffer_listening_all');
                } else {
                    answerInput.placeholder = t('groups.buffer_listening_lag', { '{n}': targetDepth });
                }
                answerInput.bufferMaxAllowed = 0;
                answerInput.maxLength = 0;
                if (vkbEl) { vkbEl.style.opacity = '0.5'; vkbEl.style.pointerEvents = 'none'; }
            } else {
                answerInput.disabled = false;
                answerInput.placeholder = t('cs.answer_placeholder');
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
                answerInput.placeholder = t('cs.answer_placeholder');
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
            await currentAudio.play(session.items[session.index].callsign, {
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
            console.error('Ошибка воспроизведения позывного:', e);
        } finally {
            currentAudio = null;
            isPlaying = false;
            if (replayBtn) replayBtn.disabled = false;
            if (isBuffer && answerInput) {
                answerInput.disabled = false;
                answerInput.placeholder = t('cs.answer_placeholder');
                answerInput.bufferMaxAllowed = null;
                answerInput.removeAttribute('maxlength');
                if (vkbEl) { vkbEl.style.opacity = '1'; vkbEl.style.pointerEvents = 'auto'; }
                answerInput.focus();
            } else if (answerInput) {
                answerInput.focus();
            }
        }
    }

    async function runPaperPlayback() {
        if (!session || !session.isPaperMode) return;
        const total = session.items.length;

        for (let i = 0; i < total; i++) {
            if (session.paperStopped || session.finished) break;

            session.index = i;
            if (csIndexEl) csIndexEl.textContent = i + 1;

            if (paperStatusMsg) {
                paperStatusMsg.innerHTML = (typeof mw_icon === 'function' ? mw_icon('headphones', 22) + ' ' : '🎧 ') + t('groups.paper_listening');
            }
            const item = session.items[i];
            const countryPart = item && item.country ? ` · ${item.country}` : '';
            if (paperSubMsg) {
                paperSubMsg.textContent = t('js.groups.paper_status_playing', {
                    '{current}': i + 1,
                    '{total}': total
                }) + countryPart;
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
                await currentAudio.play(item.callsign, {
                    onSymbol: ({ symbol, durationMs }) => {
                        if (session.paperStopped || session.finished) {
                            if (currentAudio) currentAudio.stop();
                            return;
                        }
                        signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                        lamp.flash(durationMs);
                    }
                });
            } catch (err) {
                console.error('Ошибка воспроизведения позывного в режиме бумаги:', err);
            } finally {
                currentAudio = null;
            }

            if (session.paperStopped || session.finished) break;

            session.playedCount = i + 1;

            // Пауза перед следующим позывным
            if (i < total - 1) {
                const gapMs = Math.round(session.paperGap * 1000);
                if (paperProgressWrap) paperProgressWrap.style.display = 'block';
                if (paperProgressBar) paperProgressBar.style.width = '100%';

                const startTime = Date.now();
                const intervalMs = 50;

                await new Promise(resolve => {
                    csPaperSleepResolve = resolve;
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
                        }
                    };

                    const timerId = setInterval(updateCountdown, intervalMs);
                    csPaperSleepTimer = timerId;

                    function cleanup() {
                        if (csPaperSleepTimer === timerId) {
                            clearInterval(timerId);
                            csPaperSleepTimer = null;
                        }
                        if (csPaperSleepResolve === resolve) {
                            csPaperSleepResolve = null;
                        }
                        if (paperProgressWrap) paperProgressWrap.style.display = 'none';
                    }
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
        cancelCsPaperSleep();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        isPlaying = false;
        signalLine.clear();
        lamp.off();
        if (typeof stopSessionAudioNoise === 'function') {
            stopSessionAudioNoise();
        }

        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        resultPanel.querySelectorAll('.js-result-note').forEach(n => n.remove());

        const playedItems = session.items.slice(0, session.playedCount || 0);
        const totalCount = session.items.length;
        const fullyCompleted = ((session.playedCount || 0) >= totalCount);

        // Форматируем лог принятых позывных
        const lines = playedItems.map((item, idx) => {
            const num = idx + 1;
            const cs = (item.callsign || '').toUpperCase();
            const country = item.country ? ` (${item.country})` : '';
            return `${num}. ${cs}${country}`;
        });
        const radiogramText = lines.join('\n');

        if (paperRadiogramText) paperRadiogramText.textContent = radiogramText;
        if (paperResultBlock) paperResultBlock.style.display = 'block';

        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';

        let earnedXp = 0;
        if (fullyCompleted) {
            earnedXp = (session.playedCount || totalCount) * session.xpPerCallsign;
            session.correct = totalCount;
            session.dbXpEarned = earnedXp;
            Progress.addXp(earnedXp);
            Progress.incrementStat('callsignsCompleted', totalCount);
            postStat('total_callsigns', totalCount);
            Progress.markDailyActivity();
            flushStats();
        }

        document.getElementById('result-accuracy').textContent = fullyCompleted ? '100%' : '—';
        document.getElementById('result-correct').textContent = `${session.playedCount || 0}/${totalCount}`;
        document.getElementById('result-xp').textContent = earnedXp;

        if (!fullyCompleted) {
            const stopNote = document.createElement('div');
            stopNote.className = 'feedback show bad mt-2 js-result-note';
            stopNote.textContent = t('js.groups.paper_stopped_early', {
                '{played}': session.playedCount || 0,
                '{total}': totalCount
            });
            if (stdGrid) stdGrid.insertAdjacentElement('beforebegin', stopNote);
        }

        // Clean up old breakdown / daily notes
        const oldBr = document.getElementById('cs-xp-breakdown');
        if (oldBr) oldBr.remove();
        const oldNote = document.getElementById('cs-daily-note');
        if (oldNote) oldNote.remove();

        if (typeof Progress.addTrainingTime === 'function' && session.startTime && !session.timeLogged) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            if (dur > 0) {
                Progress.addTrainingTime(dur);
                session.timeLogged = true;
                const todaySecs = Progress.getTodayTrainingSeconds();
                const todayMins = Math.floor(todaySecs / 60);
                const goalMins = typeof Progress.getDailyGoalMinutes === 'function' ? Progress.getDailyGoalMinutes() : 30;
                const dailyBlock = document.getElementById('cs-daily-time-block');
                const dailyText = document.getElementById('cs-daily-time-text');
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
        }
    }

    function abortCurrentSession() {
        cancelCsPaperSleep();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
            isPlaying = false;
        }
        if (typeof stopSessionAudioNoise === 'function') {
            stopSessionAudioNoise();
        }
        if (session && !session.finished && session.dbXpEarned > 0) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            const total = session.index || 1; // estimate
            const acc = total ? Math.round((session.correct / total) * 100) : 0;
            Progress.logXp(session.dbXpEarned, 'callsigns', {
                wpm: session.wpm,
                dur,
                err: total - session.correct,
                acc,
                history: session.history || []
            });
            session.dbXpEarned = 0;
            session.finished = true;
        }
    }

    window.addEventListener('beforeunload', abortCurrentSession);
    window.addEventListener('pagehide', abortCurrentSession);

    async function startSession() {
        abortCurrentSession();
        if (typeof startSessionAudioNoise === 'function') {
            startSessionAudioNoise();
        }
        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled && fwEnabled.checked ? parseInt(fwSlider.value, 10) : null;
        const isPaperMode = paperCheckbox ? paperCheckbox.checked : false;
        const isBufferMode = !isPaperMode && bufferCheckbox ? bufferCheckbox.checked : false;
        const paperGap = paperGapSlider ? parseFloat(paperGapSlider.value) : 3.0;
        const count = parseInt(document.getElementById('cs-count').value, 10);
        const audioSettings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : null;
        const readySignalEnabled = !!(readySignalEl ? readySignalEl.checked : (audioSettings && audioSettings.readySignal));
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

        let isDaily = new URLSearchParams(window.location.search).get('daily') === '1';
        let speedMult = isDaily ? speedXpFactor(wpm) : 1;
        let xpPerCallsign = Math.round(20 * speedMult);

        session = {
            items, index: 0, wpm, farnsworth,
            isBufferMode, bufferDepth: selectedBufferDepth,
            isPaperMode, paperGap, playedCount: 0,
            paperStopped: false, finished: false,
            correct: 0, dbXpEarned: 0,
            startTime: Date.now(), history: [], xpPerCallsign, isDaily
        };
        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        csTotalEl.textContent = items.length;
        csIndexEl.textContent = 1;
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';
        if (paperResultBlock) paperResultBlock.style.display = 'none';

        if (isPaperMode) {
            if (replayBtn) replayBtn.style.display = 'none';
            if (paperSessionDisplay) paperSessionDisplay.style.display = 'block';
            if (paperControlsRow) paperControlsRow.style.display = 'flex';
            if (answerInput) answerInput.style.display = 'none';
            if (csSubmitRow) csSubmitRow.style.display = 'none';
            if (vkbEl) vkbEl.style.display = 'none';
            if (readySignalEnabled) {
                runReadyAttentionSequence(() => runPaperPlayback());
            } else {
                runPaperPlayback();
            }
        } else {
            if (replayBtn) replayBtn.style.display = 'inline-flex';
            if (paperSessionDisplay) paperSessionDisplay.style.display = 'none';
            if (paperControlsRow) paperControlsRow.style.display = 'none';
            if (answerInput) {
                answerInput.style.display = 'block';
                answerInput.value = '';
            }
            if (csSubmitRow) csSubmitRow.style.display = 'flex';
            if (typeof renderVkb !== 'undefined') renderVkb();
            if (answerInput) answerInput.focus();
            if (readySignalEnabled) {
                runReadyAttentionSequence(() => playCurrent());
            } else {
                playCurrent();
            }
        }
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
            session.dbXpEarned += session.xpPerCallsign;
            Progress.addXp(session.xpPerCallsign);
            Progress.incrementStat('callsignsCompleted', 1);
            postStat('total_callsigns', 1);
        } else {
            feedbackEl.textContent = t('js.cs.wrong', { '{expected}': expected, '{typed}': typed || t('js.cs.empty_placeholder') });
            feedbackEl.className = 'feedback show bad';
        }
        
        session.history.push({ e: expected, t: typed, xp: isCorrect ? session.xpPerCallsign : 0 });

        session.index++;
        answerInput.value = '';
        answerInput.bufferMaxAllowed = null;
        answerInput.removeAttribute('maxlength');
        if (session.index >= session.items.length) {
            setTimeout(finishSession, 700);
        } else {
            csIndexEl.textContent = session.index + 1;
            answerInput.focus();
            setTimeout(playCurrent, 900);
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
        if (paperResultBlock) paperResultBlock.style.display = 'none';
        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';

        // Clean up previous result notes
        resultPanel.querySelectorAll('.js-result-note').forEach(n => n.remove());

        const total = session.items.length;
        const accuracy = total ? session.correct / total : 0;
        let xpEarned = session.correct * session.xpPerCallsign;
        let baseXP = session.correct * 20;
        let hasDailyBonus = false;
        
        abortCurrentSession();

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
                        if (Progress.completeDailyChallenge()) {
                            xpEarned += 50;
                            hasDailyBonus = true;
                            dailyBonusMsg = t('js.groups.daily_bonus');
                        }
                    }
                }
            }
        }

        document.getElementById('result-accuracy').textContent = `${Math.round(accuracy * 100)}%`;
        document.getElementById('result-correct').textContent = `${session.correct}/${total}`;
        document.getElementById('result-xp').textContent = xpEarned;

        const grid = document.getElementById('cs-standard-stat-grid');

        if (session.index < total) {
            const stopNote = document.createElement('div');
            stopNote.className = 'feedback show ok mt-2 js-result-note';
            stopNote.textContent = t('js.groups.stopped_early', {
                '{played}': session.index,
                '{total}': total
            });
            if (grid) grid.insertAdjacentElement('beforebegin', stopNote);
        }

        let oldBr = document.getElementById('cs-xp-breakdown');
        if (oldBr) oldBr.remove();
        let brBox = document.createElement('div');
        brBox.id = 'cs-xp-breakdown';
        brBox.className = 'mt-2 muted mono text-center';
        brBox.style.fontSize = '14px';
        
        let parts = [];
        let speedMult = session.isDaily ? speedXpFactor(session.wpm) : 1;
        if (speedMult > 1) {
            parts.push(`${baseXP} &times; ${speedMult.toFixed(1)} (скорость)`);
        } else {
            parts.push(`${baseXP} (база)`);
        }
        if (hasDailyBonus) parts.push(`50 (бонус)`);
        brBox.innerHTML = parts.join(' + ') + ` = <b>${Math.round(xpEarned)} XP</b>`;
        if (grid) grid.insertAdjacentElement('afterend', brBox);

        // Clean up previous daily note if any
        const oldNote = document.getElementById('cs-daily-note');
        if (oldNote) oldNote.remove();

        if (dailyBonusMsg) {
            const note = document.createElement('div');
            note.id = 'cs-daily-note';
            note.className = (dailyBonusFail ? 'feedback show bad mt-2' : 'feedback show ok mt-2') + ' js-result-note';
            note.textContent = (dailyBonusFail ? t('js.groups.daily_note_fail_prefix') : t('js.groups.daily_note_ok_prefix')) + dailyBonusMsg;
            brBox.insertAdjacentElement('afterend', note);
        }

        if (session.index >= total) {
            Progress.incrementStat('sessionsCompleted', 1);
        }
        Progress.markDailyActivity();
        postStat('total_sessions', 1);
        flushStats();

        if (typeof Progress.addTrainingTime === 'function' && session.startTime) {
            const dur = Math.round((Date.now() - session.startTime) / 1000);
            Progress.addTrainingTime(dur);
            const todaySecs = Progress.getTodayTrainingSeconds();
            const todayMins = Math.floor(todaySecs / 60);
            const goalMins = typeof Progress.getDailyGoalMinutes === 'function' ? Progress.getDailyGoalMinutes() : 30;
            const dailyBlock = document.getElementById('cs-daily-time-block');
            const dailyText = document.getElementById('cs-daily-time-text');
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
    }

    function stopCallsignsSession() {
        if (session) {
            session.paperStopped = true;
        }
        cancelCsPaperSleep();
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
            abortCurrentSession();
            sessionPanel.style.display = 'none';
            setupPanel.style.display = 'block';
            return;
        }
        if (session.isPaperMode) {
            if (session.playedCount > 0) {
                finishPaperSession();
            } else {
                abortCurrentSession();
                sessionPanel.style.display = 'none';
                setupPanel.style.display = 'block';
            }
            return;
        }
        if (session.index > 0) {
            finishSession();
        } else {
            abortCurrentSession();
            sessionPanel.style.display = 'none';
            setupPanel.style.display = 'block';
        }
    }

    const csStopBtn = document.getElementById('cs-stop-btn');
    if (csStopBtn) csStopBtn.addEventListener('click', stopCallsignsSession);
    if (paperStopBtn) paperStopBtn.addEventListener('click', stopCallsignsSession);
    if (paperCopyBtn) {
        paperCopyBtn.addEventListener('click', async () => {
            if (!paperRadiogramText) return;
            try {
                await navigator.clipboard.writeText(paperRadiogramText.textContent);
                const originalHtml = paperCopyBtn.innerHTML;
                paperCopyBtn.innerHTML = '✓ ' + t('groups.paper_copied');
                setTimeout(() => {
                    paperCopyBtn.innerHTML = originalHtml;
                }, 2000);
            } catch (err) {
                console.error('Clipboard copy error:', err);
            }
        });
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
        } catch { /* игнорируем офлайн */ }
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

    document.getElementById('start-session').addEventListener('click', startSession);
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    if (replayBtn) replayBtn.addEventListener('click', playCurrent);
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
        if (paperResultBlock) paperResultBlock.style.display = 'none';
        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';
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

    // Запуск и перезапуск сессии клавишей Enter с экрана настроек/результатов,
    // а также завершение активной сессии по Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sessionPanel && sessionPanel.style.display !== 'none') {
                e.preventDefault();
                stopCallsignsSession();
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
            if (Array.from(select.options).some(o => o.value === pCount.toString())) {
                select.value = pCount.toString();
            }
        }
        if (pWpm) {
            wpmSlider.value = pWpm;
            wpmValue.textContent = pWpm;
            wpmCpm.textContent = cpmHintText(pWpm, 'callsigns');
        }
        
        // Создадим баннер, что задание активно
        const req = DailyChallenge.forToday();
        if (!DailyChallenge.isDoneToday() && req.type === 'callsigns') {
            const banner = document.createElement('div');
            banner.id = 'cs-daily-banner';
            banner.className = 'feedback show ok mt-2';
            banner.textContent = t('js.groups.daily_banner');
            document.getElementById('setup-panel').appendChild(banner);
            
            function updateCsDailyBanner() {
                const count = parseInt(document.getElementById('cs-count').value, 10);
                const wpm = parseInt(wpmSlider.value, 10);
                const matches = (count === req.count) && (wpm === req.wpm);
                if (matches) {
                    banner.className = 'feedback show ok mt-2';
                    banner.textContent = t('js.groups.daily_banner');
                } else {
                    banner.className = 'feedback show bad mt-2';
                    banner.textContent = t('js.groups.daily_mismatch', {
                        '{count}': req.count,
                        '{len}': 0,
                        '{wpm}': req.wpm
                    });
                }
            }
            document.getElementById('cs-count').addEventListener('change', updateCsDailyBanner);
            wpmSlider.addEventListener('input', updateCsDailyBanner);
        }
    }
})();

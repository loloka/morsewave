(function () {
    const safeStorage = {
        getItem(key, fallback = null) {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? val : fallback;
            } catch (e) {
                return fallback;
            }
        },
        setItem(key, val) {
            try {
                localStorage.setItem(key, val);
            } catch (e) {
                /* ignore storage errors */
            }
        }
    };

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

    // Farnsworth controls
    const fwEnabled = document.getElementById('cs-farnsworth-enabled');
    const fwSlider = document.getElementById('cs-farnsworth');
    const fwValue = document.getElementById('cs-farnsworth-value');
    const fwCpm = document.getElementById('cs-farnsworth-cpm');
    if (fwCpm) fwCpm.dataset.cpmType = 'callsigns';
    const fwPanel = document.getElementById('cs-farnsworth-panel');

    // Buffer input controls
    const bufferCheckbox = document.getElementById('cs-buffer-enabled');
    const bufferPanel = document.getElementById('cs-buffer-panel');
    const bufferLabel = document.getElementById('cs-buffer-label');

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

    function updateCsCpmHint() {
        const isFw = fwEnabled && fwEnabled.checked && fwSlider;
        const effectiveWpm = isFw ? fwSlider.value : (wpmSlider ? wpmSlider.value : 12);
        if (typeof cpmHintText === 'function' && wpmCpm) {
            wpmCpm.textContent = cpmHintText(effectiveWpm, 'callsigns');
            wpmCpm.dataset.cpmType = 'callsigns';
        }
        if (fwCpm && fwSlider && typeof cpmHintText === 'function') {
            fwCpm.textContent = cpmHintText(fwSlider.value, 'callsigns');
            fwCpm.dataset.cpmType = 'callsigns';
        }
    }

    const savedWpm = safeStorage.getItem('morse_cs_wpm');
    if (savedWpm && wpmSlider) {
        wpmSlider.value = savedWpm;
        if (wpmValue) wpmValue.textContent = savedWpm;
    }
    if (wpmSlider) {
        wpmSlider.addEventListener('input', () => { 
            if (wpmValue) wpmValue.textContent = wpmSlider.value; 
            updateCsCpmHint();
            safeStorage.setItem('morse_cs_wpm', wpmSlider.value);
        });
    }

    function updateCsFarnsworthVisibility() {
        const on = fwEnabled && fwEnabled.checked;
        if (fwPanel) fwPanel.style.display = on ? 'block' : 'none';
    }

    const savedFwEnabled = safeStorage.getItem('morse_cs_fw_enabled');
    if (savedFwEnabled === 'true' && fwEnabled) {
        fwEnabled.checked = true;
    }
    updateCsFarnsworthVisibility();

    const savedFwWpm = safeStorage.getItem('morse_cs_fw_wpm');
    if (savedFwWpm && fwSlider) {
        fwSlider.value = savedFwWpm;
        if (fwValue) fwValue.textContent = savedFwWpm;
    }
    updateCsCpmHint();

    if (fwSlider) {
        fwSlider.addEventListener('input', () => {
            if (fwValue) fwValue.textContent = fwSlider.value;
            updateCsCpmHint();
            safeStorage.setItem('morse_cs_fw_wpm', fwSlider.value);
        });
    }
    if (fwEnabled) {
        fwEnabled.addEventListener('change', () => {
            updateCsFarnsworthVisibility();
            updateCsCpmHint();
            safeStorage.setItem('morse_cs_fw_enabled', fwEnabled.checked);
        });
    }

    let selectedBufferDepth = safeStorage.getItem('morse_cs_buffer_depth', 'all');

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
        const savedBufferEnabled = safeStorage.getItem('morse_cs_buffer_enabled');
        if (savedBufferEnabled !== null) {
            bufferCheckbox.checked = (savedBufferEnabled === 'true');
        }
        updateCsBufferPanelVisibility();
        bufferCheckbox.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_buffer_enabled', bufferCheckbox.checked);
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
            safeStorage.setItem('morse_cs_buffer_depth', selectedBufferDepth);
            updateCsBufferTip(selectedBufferDepth);
        });
    });
    updateCsBufferTip(selectedBufferDepth);

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
        const savedPaperEnabled = safeStorage.getItem('morse_cs_paper_enabled');
        if (savedPaperEnabled !== null) {
            paperCheckbox.checked = (savedPaperEnabled === 'true');
        }
        updateCsPaperPanelVisibility();
        paperCheckbox.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_paper_enabled', paperCheckbox.checked);
            updateCsPaperPanelVisibility();
            updateCsExtraActiveDot();
        });
    }

    if (paperGapSlider) {
        const savedPaperGap = safeStorage.getItem('morse_cs_paper_gap');
        if (savedPaperGap) {
            paperGapSlider.value = savedPaperGap;
            if (paperGapValue) paperGapValue.textContent = parseFloat(savedPaperGap).toFixed(1);
        }
        paperGapSlider.addEventListener('input', () => {
            if (paperGapValue) paperGapValue.textContent = parseFloat(paperGapSlider.value).toFixed(1);
        });
        paperGapSlider.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_paper_gap', paperGapSlider.value);
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
    const csVolume = document.getElementById('cs-volume');
    const csVolumeVal = document.getElementById('cs-volume-value');
    const csCwNoiseChips = document.querySelectorAll('#cs-cw-noise-chips .chip');

    if (typeof AudioSettings !== 'undefined') {
        const audioSettings = AudioSettings.load();
        if (readySignalEl) {
            readySignalEl.checked = !!audioSettings.readySignal;
            readySignalEl.addEventListener('change', () => {
                const s = AudioSettings.load();
                s.readySignal = readySignalEl.checked;
                AudioSettings.save(s);
                safeStorage.setItem('morsewave_ready_signal_user_set', '1');
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
        if (csVolume && csVolumeVal) {
            csVolume.value = audioSettings.volume ?? 80;
            csVolumeVal.textContent = csVolume.value;
            csVolume.addEventListener('input', () => {
                const val = parseInt(csVolume.value, 10);
                csVolumeVal.textContent = val;
                if (typeof setGlobalVolume === 'function') {
                    setGlobalVolume(val);
                } else {
                    const s = AudioSettings.load();
                    s.volume = val;
                    AudioSettings.save(s);
                }
            });
            window.addEventListener('morse:volume-change', (e) => {
                if (e.detail && typeof e.detail.volume === 'number') {
                    csVolume.value = e.detail.volume;
                    csVolumeVal.textContent = e.detail.volume;
                }
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
    const savedCount = safeStorage.getItem('morse_cs_count');
    if (savedCount && csCountEl) {
        csCountEl.value = savedCount;
    }
    if (csCountEl) {
        csCountEl.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_count', csCountEl.value);
        });
    }

    // -------------------------------------------------------------
    // Выбор режима тренировки: Тренировка позывных / Симулятор соревнований (contest mode)
    // -------------------------------------------------------------
    let selectedMode = safeStorage.getItem('morse_cs_mode') || 'standard';
    if (selectedMode === 'rufz') {
        selectedMode = 'standard';
        safeStorage.setItem('morse_cs_sprint_enabled', 'true');
    }
    const csModeChips = document.querySelectorAll('#cs-mode-chips .chip');
    const contestSetupWrap = document.getElementById('cs-contest-setup-wrap');
    const csSprintToggleWrap = document.getElementById('cs-sprint-toggle-wrap');
    const csSprintEnabledEl = document.getElementById('cs-sprint-enabled');
    const csCountWrapper = document.getElementById('cs-count-wrapper') || (csCountEl ? csCountEl.closest('label') : null);

    let isSprint = safeStorage.getItem('morse_cs_sprint_enabled') === 'true';
    if (csSprintEnabledEl) {
        csSprintEnabledEl.checked = isSprint;
        csSprintEnabledEl.addEventListener('change', () => {
            isSprint = csSprintEnabledEl.checked;
            safeStorage.setItem('morse_cs_sprint_enabled', isSprint ? 'true' : 'false');
            if (isSprint && csCountEl && (!csCountEl.value || csCountEl.value === '5')) {
                csCountEl.value = '50';
                safeStorage.setItem('morse_cs_count', '50');
            }
        });
    }

    function applySelectedMode(mode) {
        selectedMode = mode;
        safeStorage.setItem('morse_cs_mode', mode);
        csModeChips.forEach(c => c.classList.toggle('active', c.dataset.mode === mode));

        const isContest = (mode === 'contest');
        if (contestSetupWrap) contestSetupWrap.style.display = isContest ? 'block' : 'none';
        if (csSprintToggleWrap) csSprintToggleWrap.style.display = isContest ? 'none' : 'block';
        if (csCountWrapper) csCountWrapper.style.display = isContest ? 'none' : 'inline-flex';

        const extraWrapper = document.querySelector('.groups-extra-wrapper');
        if (extraWrapper) {
            extraWrapper.style.display = isContest ? 'none' : 'block';
        }
    }

    csModeChips.forEach(chip => {
        chip.addEventListener('click', () => applySelectedMode(chip.dataset.mode));
    });
    applySelectedMode(selectedMode);

    // -------------------------------------------------------------
    // Выбор базы / пресетов регионов
    // -------------------------------------------------------------
    let selectedPreset = safeStorage.getItem('morse_cs_preset') || 'ru';
    const csPresetChips = document.querySelectorAll('#cs-preset-chips .chip');
    const csCustomRegionsToggle = document.getElementById('cs-custom-regions-toggle');
    const csCustomRegionsPanel = document.getElementById('cs-custom-regions-panel');
    const csRegCheckboxes = document.querySelectorAll('.cs-reg-check');
    const csShortOnlyCheckbox = document.getElementById('cs-short-only');

    if (csCustomRegionsToggle && csCustomRegionsPanel) {
        csCustomRegionsToggle.addEventListener('click', () => {
            const isHidden = csCustomRegionsPanel.style.display === 'none';
            csCustomRegionsPanel.style.display = isHidden ? 'block' : 'none';
            csCustomRegionsToggle.textContent = isHidden ? 'Скрыть регионы ▴' : (typeof t === 'function' ? t('cs.filter_custom_btn') : 'Настроить регионы ▾');
        });
    }

    function applyRegionPreset(preset) {
        selectedPreset = preset;
        safeStorage.setItem('morse_cs_preset', preset);
        csPresetChips.forEach(c => c.classList.toggle('active', c.dataset.preset === preset));

        if (preset === 'ru') {
            csRegCheckboxes.forEach(cb => { cb.checked = (cb.value === 'russia'); });
        } else if (preset === 'ru_asia') {
            csRegCheckboxes.forEach(cb => { cb.checked = (cb.value === 'russia' || cb.value === 'central_asia'); });
        } else if (preset === 'world') {
            csRegCheckboxes.forEach(cb => { cb.checked = true; });
        }
    }

    csPresetChips.forEach(chip => {
        chip.addEventListener('click', () => applyRegionPreset(chip.dataset.preset));
    });

    csRegCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            csPresetChips.forEach(c => c.classList.remove('active'));
            selectedPreset = 'custom';
            safeStorage.setItem('morse_cs_preset', 'custom');
        });
    });

    if (csShortOnlyCheckbox) {
        const savedShort = safeStorage.getItem('morse_cs_short_only') === '1';
        csShortOnlyCheckbox.checked = savedShort;
        csShortOnlyCheckbox.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_short_only', csShortOnlyCheckbox.checked ? '1' : '0');
        });
    }

    applyRegionPreset(selectedPreset);

    function isValidAmateurCallsign(str) {
        if (!str || typeof str !== 'string') return false;
        const s = str.trim().toUpperCase();
        if (/[\s\u0400-\u04FF]/.test(s)) return false;
        return /^([A-Z]{1,2}\d[A-Z]{1,4}|[0-9][A-Z]\d[A-Z]{1,4})(\/[A-Z0-9]{1,4})?$/i.test(s);
    }

    // Мой позывной для контеста: автоподстановка из ника (если валидный позывной) либо R9O
    const csContestMyCallEl = document.getElementById('cs-contest-mycall');
    if (csContestMyCallEl) {
        const serverDefault = (csContestMyCallEl.dataset.defaultCall || 'R9O').trim().toUpperCase();
        let savedMyCall = (safeStorage.getItem('morse_cs_contest_mycall') || '').trim().toUpperCase();
        if (savedMyCall === 'R9OLD') {
            savedMyCall = '';
            safeStorage.removeItem('morse_cs_contest_mycall');
        }
        if (savedMyCall && isValidAmateurCallsign(savedMyCall)) {
            csContestMyCallEl.value = savedMyCall;
        } else {
            csContestMyCallEl.value = isValidAmateurCallsign(serverDefault) ? serverDefault : 'R9O';
        }
        csContestMyCallEl.addEventListener('input', () => {
            const val = csContestMyCallEl.value.trim().toUpperCase();
            if (isValidAmateurCallsign(val)) {
                safeStorage.setItem('morse_cs_contest_mycall', val);
            }
        });
    }

    // Настройка расстройки корреспондентов (QRM / Detune)
    const csContestDetuneEl = document.getElementById('cs-contest-detune');
    if (csContestDetuneEl) {
        const savedDetune = safeStorage.getItem('morse_cs_contest_detune');
        if (savedDetune !== null) {
            csContestDetuneEl.checked = (savedDetune === 'true');
        }
        csContestDetuneEl.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_contest_detune', csContestDetuneEl.checked ? 'true' : 'false');
        });
    }

    // Настройка сокращённых цифр (Cut Numbers)
    const csContestCutNumbersEl = document.getElementById('cs-contest-cut-numbers');
    if (csContestCutNumbersEl) {
        const savedCut = safeStorage.getItem('morse_cs_contest_cut_numbers');
        if (savedCut !== null) {
            csContestCutNumbersEl.checked = (savedCut === 'true');
        }
        csContestCutNumbersEl.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_contest_cut_numbers', csContestCutNumbersEl.checked ? 'true' : 'false');
        });
    }

    // Настройка режима Пайлап (Pileup: 2-3 станции одновременно)
    const csContestPileupEl = document.getElementById('cs-contest-pileup');
    if (csContestPileupEl) {
        const savedPileup = safeStorage.getItem('morse_cs_contest_pileup');
        if (savedPileup !== null) {
            csContestPileupEl.checked = (savedPileup === 'true');
        }
        csContestPileupEl.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_contest_pileup', csContestPileupEl.checked ? 'true' : 'false');
        });
    }

    // Настройка замираний сигнала (QSB)
    const csContestQsbEl = document.getElementById('cs-contest-qsb');
    if (csContestQsbEl) {
        const savedQsb = safeStorage.getItem('morse_cs_contest_qsb');
        if (savedQsb !== null) {
            csContestQsbEl.checked = (savedQsb === 'true');
        }
        csContestQsbEl.addEventListener('change', () => {
            safeStorage.setItem('morse_cs_contest_qsb', csContestQsbEl.checked ? 'true' : 'false');
        });
    }

    let session = null;
    let isPlaying = false;
    let currentAudio = null;
    const replayBtn = document.getElementById('replay-btn');
    
    const vkbEl = document.getElementById('cs-vkb');
    let vkb = null;
    function renderVkb() {
        if (!vkbEl || typeof VirtualKeyboard === 'undefined') return;
        if (!vkb) {
            vkb = new VirtualKeyboard(vkbEl, answerInput, { showSpace: false, showSlash: true });
        } else if (window.matchMedia('(pointer: coarse)').matches) {
            vkbEl.style.display = 'flex';
        }
    }

    // Фоновая подгрузка позывных в кэш при загрузке страницы для мгновенного старта без задержек
    setTimeout(() => {
        fetch('api/callsigns.php?count=30')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data) && data.length) saveCallsignsToCache(data); })
            .catch(() => {});
    }, 600);

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
            const raw = safeStorage.getItem('morse_cached_callsigns');
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
            const raw = safeStorage.getItem('morse_cached_callsigns');
            const existing = (raw ? JSON.parse(raw) : []) || [];
            const map = new Map();
            for (const item of existing) {
                if (item && item.callsign) map.set(item.callsign, item);
            }
            for (const item of items) {
                if (item && item.callsign) map.set(item.callsign, item);
            }
            const merged = Array.from(map.values()).slice(-200);
            safeStorage.setItem('morse_cached_callsigns', JSON.stringify(merged));
        } catch {}
    }

    async function fetchCallsigns(count) {
        try {
            const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;
            
            const q = new URLSearchParams();
            q.set('count', count);
            if (selectedPreset && selectedPreset !== 'custom') {
                q.set('preset', selectedPreset);
            } else {
                const regs = Array.from(csRegCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
                if (regs.length) q.set('regions', regs.join(','));
            }
            if (csShortOnlyCheckbox && csShortOnlyCheckbox.checked) {
                q.set('short_only', '1');
            }

            const res = await fetch(`api/callsigns.php?${q.toString()}`, controller ? { signal: controller.signal } : {});
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
            const fallback = [...FALLBACK_CALLSIGNS].sort(() => Math.random() - 0.5);
            return fallback.slice(0, count);
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

        const paperDur = session.durationSec || (session.startTime ? Math.round((Date.now() - session.startTime) / 1000) : 0);
        if (paperDur >= 3 && typeof Progress.addTrainingTime === 'function' && !session.timeLogged) {
            Progress.addTrainingTime(paperDur);
            session.timeLogged = true;
            session.durationSec = paperDur;
        }
        if (typeof Progress.renderTrainingSummary === 'function') {
            Progress.renderTrainingSummary('cs-daily-time-block', session.durationSec || paperDur);
        }
    }

    function abortCurrentSession() {
        cancelCsPaperSleep();
        if (currentAudio) {
            currentAudio.stop();
            currentAudio = null;
        }
        isPlaying = false;
        if (typeof stopSessionAudioNoise === 'function') {
            stopSessionAudioNoise();
        }
        if (session) {
            const dur = session.startTime ? Math.round((Date.now() - session.startTime) / 1000) : 0;
            if (dur > 0 && !session.durationSec) session.durationSec = dur;
        }
        if (session && !session.finished && session.dbXpEarned > 0) {
            const dur = session.durationSec || (session.startTime ? Math.round((Date.now() - session.startTime) / 1000) : 0);
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

    // -------------------------------------------------------------
    // Чистый символьный Diff для позывных (зелёный/красный, без точек/тире)
    // -------------------------------------------------------------
    function renderCallsignDiff(expected, typed) {
        let diff = '';
        const maxLen = Math.max(expected.length, typed.length);
        for (let i = 0; i < maxLen; i++) {
            const expCh = expected[i] || '';
            const typCh = typed[i] || '';
            if (expCh && typCh && expCh === typCh) {
                diff += `<span style="color:#22c55e; font-weight:700;">${expCh}</span>`;
            } else if (expCh) {
                diff += `<span style="color:#ef4444; font-weight:700; text-decoration:underline;">${expCh}</span>`;
            }
        }
        const typedNote = typed ? ` <span class="muted" style="font-size:12px;">(вы ввели: ${typed})</span>` : ` <span class="muted" style="font-size:12px;">(пусто)</span>`;
        return `<div class="mono" style="font-size:18px; letter-spacing:1.5px;">${diff}${typedNote}</div>`;
    }

    // -------------------------------------------------------------
    // Отрисовка графика скорости RufzXP (SVG)
    // -------------------------------------------------------------
    function renderRufzSpeedChart(wpmHistory) {
        const svg = document.getElementById('cs-rufz-svg');
        if (!svg || !wpmHistory || wpmHistory.length < 2) return;
        const w = 500, h = 140, padX = 25, padY = 20;
        const minWpm = Math.max(5, Math.min(...wpmHistory) - 2);
        const maxWpm = Math.max(...wpmHistory) + 2;
        const rangeWpm = maxWpm - minWpm || 1;
        const points = wpmHistory.map((val, idx) => {
            const x = padX + (idx / (wpmHistory.length - 1)) * (w - 2 * padX);
            const y = h - padY - ((val - minWpm) / rangeWpm) * (h - 2 * padY);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        const lineD = 'M ' + points.join(' L ');
        const fillD = `M ${padX},${h - padY} L ` + points.join(' L ') + ` L ${w - padX},${h - padY} Z`;
        svg.innerHTML = `
            <defs>
                <linearGradient id="rufzGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <path d="${fillD}" fill="url(#rufzGrad)"/>
            <path d="${lineD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    }

    // -------------------------------------------------------------
    // Контест-симулятор (Morse Runner / MorseWalker)
    // -------------------------------------------------------------
    let contestSession = null;
    const contestDisplay = document.getElementById('cs-contest-session-display');
    const contestLiveMyCall = document.getElementById('cs-contest-live-mycall');
    const contestLiveQsos = document.getElementById('cs-contest-live-qsos');
    const contestLiveRate = document.getElementById('cs-contest-live-rate');
    const contestLiveTimer = document.getElementById('cs-contest-live-timer');
    const contestCallInput = document.getElementById('cs-contest-call');
    const contestRstInput = document.getElementById('cs-contest-rst');
    const contestSentNrInput = document.getElementById('cs-contest-sent-nr');
    const contestRecvNrInput = document.getElementById('cs-contest-recv-nr');
    const contestDupeBadge = document.getElementById('cs-contest-dupe-badge');
    const hudTxLed = document.getElementById('cs-hud-tx-led');
    const hudRxLed = document.getElementById('cs-hud-rx-led');
    const liveRitEl = document.getElementById('cs-contest-live-rit');

    function formatCutNumber(nrStr) {
        // Сокращённые цифры (Cut Numbers): замена ведущих 0 на T (001 -> TT1, 014 -> T14, 042 -> T42)
        return nrStr.replace(/^00/, 'TT').replace(/^0/, 'T');
    }

    function normalizeContestNumber(inputStr) {
        if (!inputStr) return NaN;
        // Приводим сокращённые цифры к обычным (T->0, N->9, A->1)
        const clean = inputStr.trim().toUpperCase()
            .replace(/T/g, '0')
            .replace(/N/g, '9')
            .replace(/A/g, '1');
        return parseInt(clean, 10);
    }

    function updateDupeBadge() {
        if (!contestDupeBadge || !contestSession) return;
        const typed = (contestCallInput?.value || '').trim().toUpperCase();
        if (typed && contestSession.workedCalls?.has(typed)) {
            const prev = contestSession.workedCalls.get(typed);
            contestDupeBadge.style.display = 'inline-flex';
            contestDupeBadge.textContent = `⚠️ DUPE (#${prev.qsoIndex})`;
            contestCallInput?.classList.add('is-dupe');
        } else {
            contestDupeBadge.style.display = 'none';
            contestCallInput?.classList.remove('is-dupe');
        }
    }

    function triggerEsmPulse(inputEl) {
        if (!inputEl) return;
        inputEl.classList.remove('esm-flash');
        void inputEl.offsetWidth;
        inputEl.classList.add('esm-flash');
    }

    function setActiveKeyLight(keyId, active) {
        const el = document.getElementById(keyId);
        if (!el) return;
        if (active) el.classList.add('is-tx-active');
        else el.classList.remove('is-tx-active');
    }

    function clearAllKeyLights() {
        ['cs-key-f1', 'cs-key-f2', 'cs-key-f3', 'cs-key-f4', 'cs-key-f5', 'cs-key-f6', 'cs-key-f7'].forEach(id => {
            document.getElementById(id)?.classList.remove('is-tx-active');
        });
    }

    function updateEsmHint() {
        const hintEl = document.getElementById('cs-esm-action-hint');
        if (!hintEl || !contestSession || !contestSession.active) return;
        const callVal = (contestCallInput?.value || '').trim();
        const nrVal = (contestRecvNrInput?.value || '').trim();

        if (!contestSession.currentCaller && contestSession.state === 'IDLE') {
            hintEl.textContent = '1. Вызов CQ (Enter)';
        } else if (contestSession.state === 'WAITING_EXCHANGE' || (!nrVal && callVal)) {
            hintEl.textContent = '2. Передать номер (Enter)';
        } else if (contestSession.state === 'WAITING_TU' || (callVal && nrVal)) {
            hintEl.textContent = '3. Зачесть QSO (Enter)';
        } else if (!callVal) {
            hintEl.textContent = '1. Вызов CQ (Enter)';
        } else {
            hintEl.textContent = '2. Передать номер (Enter)';
        }
    }

    function executeContestEsm() {
        if (!contestSession || !contestSession.active) return;
        contestSession.lastUserActivity = Date.now();
        const callVal = (contestCallInput?.value || '').trim();
        const nrVal = (contestRecvNrInput?.value || '').trim();

        if (document.activeElement === contestCallInput) {
            if (!callVal) {
                contestSendCQ();
            } else {
                contestSendExchange();
            }
        } else if (document.activeElement === contestRecvNrInput) {
            contestSendTU();
        } else {
            if (!callVal) {
                contestSendCQ();
            } else if (!nrVal) {
                contestSendExchange();
            } else {
                contestSendTU();
            }
        }
    }

    function focusContestInput(inputEl) {
        if (!inputEl) return;
        if (document.activeElement !== inputEl) {
            inputEl.focus();
        }
        // Не вызываем select(), чтобы не сбрасывать введённые на слух буквы!
        // Ставим курсор в конец строки
        const len = inputEl.value ? inputEl.value.length : 0;
        if (len > 0) {
            try { inputEl.setSelectionRange(len, len); } catch (_) {}
        }
    }

    const activeContestAudioList = new Set();

    function stopAllContestAudio() {
        for (const a of activeContestAudioList) {
            try { a.stop(); } catch (_) {}
        }
        activeContestAudioList.clear();
        if (currentAudio) {
            try { currentAudio.stop(); } catch (_) {}
            currentAudio = null;
        }
        isPlaying = false;
        hudRxLed?.classList.remove('is-active');
        hudTxLed?.classList.remove('is-active');
    }

    async function playContestMorse(text, { freq, wpm, isCaller = false, gain = 0.35, qsb } = {}) {
        if (!contestSession || !contestSession.active) return;
        stopAllContestAudio();
        const useFreq = freq || contestSession.baseFreq;
        const useWpm = wpm || contestSession.wpm;
        const useQsb = (qsb !== undefined) ? qsb : (isCaller && !!csContestQsbEl?.checked);
        const audio = new MorseAudio({ wpm: useWpm, freq: useFreq, gain, qsb: useQsb });
        currentAudio = audio;
        activeContestAudioList.add(audio);
        isPlaying = true;
        if (isCaller) {
            hudRxLed?.classList.add('is-active');
            hudTxLed?.classList.remove('is-active');
        } else {
            hudTxLed?.classList.add('is-active');
            hudRxLed?.classList.remove('is-active');
        }
        try {
            await audio.play(text, {
                onSymbol: ({ symbol, durationMs }) => {
                    if (!contestSession || !contestSession.active) {
                        audio.stop();
                        return;
                    }
                    signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                    lamp.flash(durationMs);
                }
            });
        } catch (e) {
            // ignore aborted
        } finally {
            activeContestAudioList.delete(audio);
            if (activeContestAudioList.size === 0) {
                if (currentAudio === audio) currentAudio = null;
                isPlaying = false;
                hudRxLed?.classList.remove('is-active');
                hudTxLed?.classList.remove('is-active');
            }
        }
    }

    async function playContestPileup(callers) {
        if (!contestSession || !contestSession.active || !callers || !callers.length) return;
        stopAllContestAudio();
        isPlaying = true;
        hudRxLed?.classList.add('is-active');
        hudTxLed?.classList.remove('is-active');

        const useQsb = !!csContestQsbEl?.checked;
        const dominantCaller = callers[0];

        const promises = callers.map(async (caller) => {
            if (caller.delayMs > 0) {
                await new Promise(r => setTimeout(r, caller.delayMs));
                if (!contestSession || !contestSession.active) return;
            }

            const audio = new MorseAudio({
                wpm: caller.wpm,
                freq: caller.freq,
                gain: caller.gain || 0.28,
                qsb: useQsb
            });
            activeContestAudioList.add(audio);

            try {
                await audio.play(caller.callsign, {
                    onSymbol: ({ symbol, durationMs }) => {
                        if (!contestSession || !contestSession.active) {
                            audio.stop();
                            return;
                        }
                        if (caller === dominantCaller) {
                            signalLine.pulse(symbol === '.' ? 'dot' : 'dash', durationMs);
                            lamp.flash(durationMs);
                        }
                    }
                });
            } catch (_) {
                // ignore aborted
            } finally {
                activeContestAudioList.delete(audio);
            }
        });

        try {
            await Promise.all(promises);
        } finally {
            if (activeContestAudioList.size === 0) {
                currentAudio = null;
                isPlaying = false;
                hudRxLed?.classList.remove('is-active');
                hudTxLed?.classList.remove('is-active');
            }
        }
    }

    function formatTimeMMSS(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function appendContestLogRow(data) {
        const logBody = document.getElementById('cs-contest-log-body');
        if (!logBody) return;
        const emptyRow = document.getElementById('cs-contest-log-empty');
        if (emptyRow) emptyRow.remove();

        const tr = document.createElement('tr');
        tr.className = 'cs-log-row-new';

        const recvCellHtml = data.isNrCorrect
            ? `<span class="cs-log-tag tag-ok">599 ${data.enteredNr} ✓</span>`
            : `<span class="cs-log-tag tag-err">599 ${data.enteredNr} ❌ <span style="font-size:11px; font-weight:400; opacity:0.8;">(${data.expectedNr})</span></span>`;

        const noteHtml = data.note
            ? `<span class="cs-log-tag tag-warn">${data.note}</span>`
            : '';

        const xpHtml = data.qsoXp > 0
            ? `<span class="cs-log-xp-badge">+${data.qsoXp} XP</span>`
            : `<span class="cs-log-xp-zero">0 XP</span>`;

        tr.innerHTML = `
            <td style="color:var(--text-muted);">${String(data.qsoIndex).padStart(3, '0')}</td>
            <td style="color:var(--text-muted);">${data.timeStr}</td>
            <td style="font-weight:700;">
                ${data.isCallCorrect ? `<span style="color:var(--text);">${data.callsign}</span>` : `<span style="color:var(--danger,#e2584f); text-decoration:line-through;">${data.enteredCall}</span> <span style="font-size:11px; color:var(--text-muted);">(${data.callsign})</span>`}
            </td>
            <td style="color:var(--text-muted);">${data.sentExchange}</td>
            <td>
                ${recvCellHtml}${noteHtml}
            </td>
            <td style="text-align:right;">
                ${xpHtml}
            </td>
        `;
        if (logBody.firstChild) {
            logBody.insertBefore(tr, logBody.firstChild);
        } else {
            logBody.appendChild(tr);
        }
        const logCountEl = document.getElementById('cs-contest-log-count');
        if (logCountEl) logCountEl.textContent = `${data.qsoIndex} связей`;
    }

    function startContestSession(pool, wpm) {
        abortCurrentSession();
        if (typeof startSessionAudioNoise === 'function') startSessionAudioNoise();

        const myCall = (csContestMyCallEl?.value.trim().toUpperCase()) || 'R9O';
        const baseFreq = parseInt(document.getElementById('cs-tone-freq')?.value, 10) || 600;

        contestSession = {
            active: true,
            myCall: myCall,
            wpm: wpm,
            baseFreq: baseFreq,
            qsos: 0,
            sentNr: 1,
            startTime: Date.now(),
            contestSeconds: 0,
            activeAirSeconds: 0,
            lastUserActivity: Date.now(),
            timerInterval: null,
            state: 'IDLE',
            actionToken: 0,
            currentCaller: null,
            activePileup: [],
            pool: pool && pool.length ? pool : [...FALLBACK_CALLSIGNS],
            poolIndex: 0,
            xpEarned: 0,
            workedCalls: new Map()
        };

        if (contestDupeBadge) contestDupeBadge.style.display = 'none';

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';

        const sessionCounter = document.getElementById('cs-session-counter');
        if (sessionCounter) sessionCounter.style.display = 'none';

        if (paperSessionDisplay) paperSessionDisplay.style.display = 'none';
        if (paperControlsRow) paperControlsRow.style.display = 'none';
        if (answerInput) answerInput.style.display = 'none';
        if (csSubmitRow) csSubmitRow.style.display = 'none';
        if (replayBtn) replayBtn.style.display = 'none';
        if (contestDisplay) contestDisplay.style.display = 'block';

        if (contestLiveMyCall) contestLiveMyCall.textContent = myCall;
        if (contestLiveQsos) contestLiveQsos.textContent = '0';
        if (contestLiveRate) contestLiveRate.textContent = '0';
        if (contestLiveTimer) contestLiveTimer.textContent = '00:00';
        const liveXpEl = document.getElementById('cs-contest-live-xp');
        if (liveXpEl) liveXpEl.textContent = '0';
        if (liveRitEl) {
            liveRitEl.className = 'cs-hud-rit rit-zero';
            liveRitEl.textContent = 'RIT 0 Hz';
        }
        hudRxLed?.classList.remove('is-active');
        hudTxLed?.classList.remove('is-active');
        clearAllKeyLights();

        const logBody = document.getElementById('cs-contest-log-body');
        if (logBody) {
            logBody.innerHTML = `
                <tr id="cs-contest-log-empty">
                    <td colspan="6" class="muted text-center" style="padding:14px; font-style:italic;">
                        ${(typeof t === 'function' ? t('cs.contest_log_empty') : 'Журнал пуст. Нажмите F1 или Enter для первого вызова CQ.')}
                    </td>
                </tr>
            `;
        }
        const logCountEl = document.getElementById('cs-contest-log-count');
        if (logCountEl) logCountEl.textContent = '0 связей';

        if (contestSentNrInput) contestSentNrInput.value = '001';
        if (contestRstInput) contestRstInput.value = '599';
        if (contestCallInput) {
            contestCallInput.value = '';
            contestCallInput.classList.remove('is-dupe');
            contestCallInput.focus();
        }
        if (contestRecvNrInput) contestRecvNrInput.value = '';

        clearAllKeyLights();
        updateEsmHint();

        feedbackEl.className = 'feedback show ok';
        feedbackEl.textContent = 'Нажмите Enter или F1 чтобы дать общий вызов (CQ)';

        contestSession.timerInterval = setInterval(() => {
            if (!contestSession || !contestSession.active) return;
            contestSession.contestSeconds++;
            if (contestLiveTimer) contestLiveTimer.textContent = formatTimeMMSS(contestSession.contestSeconds);
            if (contestSession.qsos > 0) {
                const rate = Math.round(contestSession.qsos / (contestSession.contestSeconds / 3600));
                if (contestLiveRate) contestLiveRate.textContent = rate;
            }
            // Anti-AFK: активность считается только если играет звук или юзер вводил данные < 35 сек назад
            const isRecentlyActive = isPlaying || (Date.now() - contestSession.lastUserActivity < 35000);
            if (isRecentlyActive) {
                contestSession.activeAirSeconds++;
                if (contestSession.activeAirSeconds % 10 === 0) {
                    Progress.incrementStat('contestTimeSeconds', 10);
                    Progress.checkAchievements();
                }
            }
        }, 1000);
    }

    function stopContestSession() {
        if (!contestSession || !contestSession.active) return;
        contestSession.active = false;
        contestSession.actionToken++;
        if (contestSession.timerInterval) {
            clearInterval(contestSession.timerInterval);
            contestSession.timerInterval = null;
        }
        stopAllContestAudio();
        clearAllKeyLights();

        abortCurrentSession();

        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';

        const sessionCounter = document.getElementById('cs-session-counter');
        if (sessionCounter) sessionCounter.style.display = 'block';

        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'none';
        const rufzRes = document.getElementById('cs-rufz-result-block');
        if (rufzRes) rufzRes.style.display = 'none';
        const mistakesBlock = document.getElementById('cs-mistakes-block');
        if (mistakesBlock) mistakesBlock.style.display = 'none';

        const contestRes = document.getElementById('cs-contest-result-block');
        if (contestRes) {
            contestRes.style.display = 'block';
            document.getElementById('cs-contest-res-qsos').textContent = contestSession.qsos;
            const rate = contestSession.contestSeconds > 0
                ? Math.round(contestSession.qsos / (contestSession.contestSeconds / 3600))
                : 0;
            document.getElementById('cs-contest-res-rate').textContent = rate;
            document.getElementById('cs-contest-res-time').textContent = formatTimeMMSS(contestSession.contestSeconds);
            const resXp = document.getElementById('cs-contest-res-xp');
            if (resXp) resXp.textContent = contestSession.xpEarned;
        }

        document.getElementById('result-accuracy').textContent = '100%';
        document.getElementById('result-correct').textContent = `${contestSession.qsos} QSO`;
        document.getElementById('result-xp').textContent = contestSession.xpEarned;

        Progress.markDailyActivity();
        postStat('total_sessions', 1);
        flushStats();

        if (contestSession.contestSeconds >= 3 && typeof Progress.addTrainingTime === 'function') {
            Progress.addTrainingTime(contestSession.contestSeconds);
        }
        if (typeof Progress.renderTrainingSummary === 'function') {
            Progress.renderTrainingSummary('cs-daily-time-block', contestSession.contestSeconds);
        }
    }

    function generateContestCaller({ pool, index, baseFreq, baseWpm, allowDetune, detuneOffset = null, gain = 0.32, delayMs = 0 }) {
        const callerItem = pool[index % pool.length];
        const callsign = (callerItem && callerItem.callsign) ? callerItem.callsign : 'UA3XYZ';

        let callerFreq = baseFreq;
        let callerWpm = baseWpm;
        let detuneHz = 0;
        if (allowDetune) {
            detuneHz = (detuneOffset !== null) ? detuneOffset : (Math.floor(Math.random() * 81) - 40);
            callerFreq = Math.max(300, Math.min(1200, baseFreq + detuneHz));
            const wpmDelta = Math.floor(Math.random() * 5) - 2; // ±2 WPM
            callerWpm = Math.max(12, Math.min(45, baseWpm + wpmDelta));
        }

        let rawNr;
        if (Math.random() < 0.12) {
            rawNr = Math.floor(Math.random() * 4) + 1;
        } else {
            const currentSent = contestSession?.sentNr || 1;
            const elapsedMinutes = Math.max(0.5, (contestSession?.contestSeconds || 0) / 60);
            const expectedBase = Math.max(currentSent, Math.round(elapsedMinutes * 1.5));
            const activityFactor = 0.25 + Math.random() * 1.45;
            const jitter = Math.floor(Math.random() * 5) - 2;
            rawNr = Math.max(1, Math.round(expectedBase * activityFactor) + jitter);
        }
        const nr = String(rawNr).padStart(3, '0');

        return {
            callsign,
            nr,
            freq: callerFreq,
            wpm: callerWpm,
            detuneHz,
            gain,
            delayMs,
            askedRepeat: false
        };
    }

    async function contestSendCQ() {
        if (!contestSession || !contestSession.active) return;
        if (contestSession.state === 'SENDING_CQ' || contestSession.state === 'CALLER_CALLING') {
            return; // Spam prevention
        }
        contestSession.lastUserActivity = Date.now();
        const token = ++contestSession.actionToken;
        contestSession.state = 'SENDING_CQ';
        feedbackEl.className = 'feedback show ok';
        feedbackEl.textContent = `CQ TEST ${contestSession.myCall}`;
        setActiveKeyLight('cs-key-f1', true);
        await playContestMorse(`CQ TEST ${contestSession.myCall}`);
        setActiveKeyLight('cs-key-f1', false);
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        await new Promise(r => setTimeout(r, 450));
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        const isPileupEnabled = !!(csContestPileupEl && csContestPileupEl.checked);
        const allowDetune = !csContestDetuneEl || csContestDetuneEl.checked;

        let callersList = [];

        // Если с прошлого пайлапа остались неотвеченные станции, они зовут снова!
        if (isPileupEnabled && contestSession.activePileup && contestSession.activePileup.length > 0) {
            callersList = contestSession.activePileup;
            callersList.forEach((c, idx) => {
                c.delayMs = idx === 0 ? 0 : (Math.floor(Math.random() * 100) + 60);
            });
            if (callersList.length === 1 && Math.random() < 0.6) {
                const newCaller = generateContestCaller({
                    pool: contestSession.pool,
                    index: contestSession.poolIndex++,
                    baseFreq: contestSession.baseFreq,
                    baseWpm: contestSession.wpm,
                    allowDetune,
                    detuneOffset: (Math.floor(Math.random() * 40) + 20) * (Math.random() < 0.5 ? 1 : -1),
                    gain: 0.20,
                    delayMs: Math.floor(Math.random() * 100) + 80
                });
                callersList.push(newCaller);
            }
        } else if (isPileupEnabled) {
            const count = (Math.random() < 0.35) ? 3 : 2;
            const offsets = [
                Math.floor(Math.random() * 21) - 10,
                Math.floor(Math.random() * 30) + 25,
                -(Math.floor(Math.random() * 30) + 25)
            ];
            const gains = [0.32, 0.22, 0.14];
            const delays = [0, Math.floor(Math.random() * 80) + 60, Math.floor(Math.random() * 100) + 160];

            for (let i = 0; i < count; i++) {
                const c = generateContestCaller({
                    pool: contestSession.pool,
                    index: contestSession.poolIndex++,
                    baseFreq: contestSession.baseFreq,
                    baseWpm: contestSession.wpm,
                    allowDetune,
                    detuneOffset: offsets[i],
                    gain: gains[i],
                    delayMs: delays[i]
                });
                callersList.push(c);
            }
        } else {
            const single = generateContestCaller({
                pool: contestSession.pool,
                index: contestSession.poolIndex++,
                baseFreq: contestSession.baseFreq,
                baseWpm: contestSession.wpm,
                allowDetune,
                gain: 0.35,
                delayMs: 0
            });
            callersList.push(single);
        }

        contestSession.activePileup = callersList;
        contestSession.currentCaller = (callersList.length === 1) ? callersList[0] : null;

        const dominant = callersList[0];
        if (liveRitEl) {
            if (allowDetune && dominant.detuneHz !== 0) {
                liveRitEl.className = 'cs-hud-rit rit-detuned';
                liveRitEl.textContent = `RIT ${dominant.detuneHz >= 0 ? '+' : ''}${dominant.detuneHz} Hz`;
            } else {
                liveRitEl.className = 'cs-hud-rit rit-zero';
                liveRitEl.textContent = 'RIT 0 Hz';
            }
        }

        contestSession.state = 'CALLER_CALLING';
        feedbackEl.className = 'feedback show';
        feedbackEl.textContent = callersList.length > 1
            ? `Пайлап! Зовут ${callersList.length} станции одновременно...`
            : 'Вам отвечает станция...';

        await playContestPileup(callersList);
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        contestSession.state = 'WAITING_EXCHANGE';
        updateEsmHint();
        feedbackEl.textContent = callersList.length > 1
            ? 'Выделите позывной из пайлапа и нажмите Enter (F2)'
            : 'Примите позывной и нажмите Enter (F2)';
        focusContestInput(contestCallInput);
    }

    async function contestSendExchange() {
        if (!contestSession || !contestSession.active) return;
        contestSession.lastUserActivity = Date.now();
        if ((!contestSession.activePileup || !contestSession.activePileup.length) && !contestSession.currentCaller) {
            contestSendCQ();
            return;
        }
        if (contestSession.state === 'SENDING_EXCH' || contestSession.state === 'CALLER_ACK') return;

        const enteredCall = (contestCallInput?.value || '').trim().toUpperCase();
        if (!enteredCall) {
            contestSendCQ();
            return;
        }

        const token = ++contestSession.actionToken;
        contestSession.state = 'SENDING_EXCH';
        triggerEsmPulse(contestCallInput);
        const nrStr = String(contestSession.sentNr).padStart(3, '0');
        feedbackEl.className = 'feedback show ok';
        feedbackEl.textContent = `${enteredCall} 5NN ${nrStr}`;
        setActiveKeyLight('cs-key-f2', true);
        await playContestMorse(`${enteredCall} 5NN ${nrStr}`);
        setActiveKeyLight('cs-key-f2', false);
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        await new Promise(r => setTimeout(r, 350));
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        // Поиск совпадения в пайлапе (полное совпадение или префикс от 2 символов)
        let matchedCaller = null;
        if (contestSession.activePileup && contestSession.activePileup.length > 0) {
            matchedCaller = contestSession.activePileup.find(c => c.callsign.toUpperCase() === enteredCall);
            if (!matchedCaller && enteredCall.length >= 2) {
                matchedCaller = contestSession.activePileup.find(c =>
                    c.callsign.toUpperCase().startsWith(enteredCall) ||
                    c.callsign.toUpperCase().includes(enteredCall)
                );
            }
        } else if (contestSession.currentCaller) {
            if (contestSession.currentCaller.callsign.toUpperCase() === enteredCall ||
                (enteredCall.length >= 2 && contestSession.currentCaller.callsign.toUpperCase().startsWith(enteredCall))) {
                matchedCaller = contestSession.currentCaller;
            }
        }

        if (matchedCaller) {
            contestSession.currentCaller = matchedCaller;
            if (contestSession.activePileup) {
                contestSession.activePileup = contestSession.activePileup.filter(c => c !== matchedCaller);
            }

            if (contestCallInput && contestCallInput.value.toUpperCase() !== matchedCaller.callsign) {
                contestCallInput.value = matchedCaller.callsign;
                updateDupeBadge();
            }

            contestSession.state = 'CALLER_ACK';
            feedbackEl.textContent = `${matchedCaller.callsign} передаёт контрольный номер...`;
            const useCut = !csContestCutNumbersEl || csContestCutNumbersEl.checked;
            const txNr = (useCut && Math.random() < 0.75) ? formatCutNumber(matchedCaller.nr) : matchedCaller.nr;
            await playContestMorse(`R 5NN ${txNr}`, {
                freq: matchedCaller.freq,
                wpm: matchedCaller.wpm,
                isCaller: true,
                gain: matchedCaller.gain || 0.35
            });
            if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

            contestSession.state = 'WAITING_TU';
            updateEsmHint();
            feedbackEl.textContent = 'Введите номер корреспондента и нажмите Enter (F3)';
            focusContestInput(contestRecvNrInput);
        } else {
            feedbackEl.className = 'feedback show bad';
            feedbackEl.textContent = 'Станции не расслышали свой позывной (?)';
            await playContestMorse('?', { freq: contestSession.baseFreq, wpm: contestSession.wpm, isCaller: true });
            if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;
            contestSession.state = 'WAITING_EXCHANGE';
            updateEsmHint();
            focusContestInput(contestCallInput);
        }
    }

    async function contestSendTU() {
        if (!contestSession || !contestSession.active || !contestSession.currentCaller) return;
        if (contestSession.state === 'SENDING_TU') return;
        contestSession.lastUserActivity = Date.now();

        const caller = contestSession.currentCaller;
        const enteredCall = (contestCallInput?.value || '').trim().toUpperCase();
        const enteredNr = (contestRecvNrInput?.value || '').trim();

        const token = ++contestSession.actionToken;
        contestSession.state = 'SENDING_TU';
        triggerEsmPulse(contestRecvNrInput);
        feedbackEl.className = 'feedback show ok';
        feedbackEl.textContent = `TU ${contestSession.myCall} CQ`;
        setActiveKeyLight('cs-key-f3', true);
        await playContestMorse(`TU ${contestSession.myCall} CQ`);
        setActiveKeyLight('cs-key-f3', false);
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        const isCallCorrect = (enteredCall === caller.callsign.toUpperCase());
        const expectedNrInt = parseInt(caller.nr, 10);
        const enteredNrInt = normalizeContestNumber(enteredNr);
        const isNrCorrect = !isNaN(enteredNrInt) && (enteredNrInt === expectedNrInt);

        const speedMult = speedXpFactor(contestSession.wpm);
        let qsoXp = 0;
        let note = '';

        const callUpper = caller.callsign.toUpperCase();
        const isDupe = contestSession.workedCalls?.has(callUpper);

        if (isDupe) {
            qsoXp = 0;
            note = 'DUPE (повтор, 0 XP)';
        } else if (isCallCorrect && isNrCorrect) {
            let base = Math.round(25 * speedMult);
            if (caller.askedRepeat) {
                qsoXp = Math.max(1, Math.round(base * 0.5));
                note = 'повтор (-50%)';
            } else {
                qsoXp = base;
            }
            contestSession.workedCalls?.set(callUpper, {
                qsoIndex,
                timeStr: formatTimeMMSS(contestSession.contestSeconds)
            });
        } else if (isCallCorrect && !isNrCorrect) {
            // За верный позывной даем по 1 XP за символ, если номер не принят
            qsoXp = caller.callsign.length;
            note = 'ошибка в номере';
            contestSession.workedCalls?.set(callUpper, {
                qsoIndex,
                timeStr: formatTimeMMSS(contestSession.contestSeconds)
            });
        } else {
            qsoXp = 0;
            note = 'ошибка в позывном';
        }

        contestSession.qsos++;
        const qsoIndex = contestSession.qsos;
        const sentNrStr = String(contestSession.sentNr).padStart(3, '0');
        contestSession.sentNr++;
        contestSession.xpEarned += qsoXp;
        if (qsoXp > 0) {
            Progress.addXp(qsoXp);
        }
        Progress.incrementStat('contestQsos', 1);
        Progress.checkAchievements();

        appendContestLogRow({
            qsoIndex,
            timeStr: formatTimeMMSS(contestSession.contestSeconds),
            callsign: caller.callsign,
            enteredCall: enteredCall || '—',
            sentExchange: `599 ${sentNrStr}`,
            expectedNr: caller.nr,
            enteredNr: enteredNr || '—',
            isCallCorrect,
            isNrCorrect,
            qsoXp,
            note
        });

        if (contestLiveQsos) contestLiveQsos.textContent = contestSession.qsos;
        const rate = contestSession.contestSeconds > 0
            ? Math.round(contestSession.qsos / (contestSession.contestSeconds / 3600))
            : 0;
        if (contestLiveRate) contestLiveRate.textContent = rate;
        const liveXpEl = document.getElementById('cs-contest-live-xp');
        if (liveXpEl) liveXpEl.textContent = contestSession.xpEarned;
        if (contestSentNrInput) contestSentNrInput.value = String(contestSession.sentNr).padStart(3, '0');

        if (contestCallInput) {
            contestCallInput.value = '';
            contestCallInput.classList.remove('is-dupe');
        }
        if (contestRecvNrInput) contestRecvNrInput.value = '';
        if (contestDupeBadge) contestDupeBadge.style.display = 'none';

        // Фокус СРАЗУ переносим в поле позывного для следующей связи
        focusContestInput(contestCallInput);

        const feedbackColor = (isCallCorrect && isNrCorrect) ? 'ok' : (qsoXp > 0 ? 'ok' : 'bad');
        feedbackEl.className = `feedback show ${feedbackColor}`;
        feedbackEl.textContent = isCallCorrect && isNrCorrect
            ? `✓ Связь с ${caller.callsign} зачтена (+${qsoXp} XP)!`
            : `⚠ Связь с ${caller.callsign}: ${note} (+${qsoXp} XP)`;

        contestSession.currentCaller = null;
        contestSession.state = 'IDLE';
        updateEsmHint();

        setTimeout(() => {
            if (contestSession && contestSession.active && contestSession.state === 'IDLE' && contestSession.actionToken === token) {
                contestSendCQ();
            }
        }, 900);
    }

    async function contestSendMyCall() {
        if (!contestSession || !contestSession.active) return;
        contestSession.lastUserActivity = Date.now();
        setActiveKeyLight('cs-key-f4', true);
        await playContestMorse(contestSession.myCall);
        setActiveKeyLight('cs-key-f4', false);
    }

    async function contestSendHisCall() {
        if (!contestSession || !contestSession.active) return;
        contestSession.lastUserActivity = Date.now();
        const c = contestCallInput?.value.trim().toUpperCase() || (contestSession.currentCaller?.callsign);
        if (c) {
            setActiveKeyLight('cs-key-f5', true);
            await playContestMorse(c);
            setActiveKeyLight('cs-key-f5', false);
        }
    }

    async function contestSendRepeat() {
        if (!contestSession || !contestSession.active) return;
        const callers = (contestSession.activePileup && contestSession.activePileup.length)
            ? contestSession.activePileup
            : (contestSession.currentCaller ? [contestSession.currentCaller] : []);
        if (!callers.length) return;

        contestSession.lastUserActivity = Date.now();
        const token = ++contestSession.actionToken;
        feedbackEl.className = 'feedback show';
        feedbackEl.textContent = 'Запрос повтора (?)';
        setActiveKeyLight('cs-key-f6', true);
        await playContestMorse('?');
        setActiveKeyLight('cs-key-f6', false);
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        await new Promise(r => setTimeout(r, 400));
        if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;

        if (contestSession.state !== 'WAITING_TU') {
            callers.forEach(c => { c.askedRepeat = true; });
            feedbackEl.textContent = callers.length > 1
                ? 'Станции повторяют свои позывные...'
                : 'Корреспондент повторяет свой позывной...';
            await playContestPileup(callers);
            if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;
            contestSession.state = 'WAITING_EXCHANGE';
            updateEsmHint();
            focusContestInput(contestCallInput);
        } else {
            const caller = contestSession.currentCaller;
            if (!caller) return;
            caller.askedRepeat = true;
            const enteredCall = (contestCallInput?.value || '').trim().toUpperCase();
            feedbackEl.textContent = `${enteredCall || 'Корреспондент'} повторяет контрольный номер...`;
            const useCut = !csContestCutNumbersEl || csContestCutNumbersEl.checked;
            const txNr = (useCut && Math.random() < 0.75) ? formatCutNumber(caller.nr) : caller.nr;
            await playContestMorse(`${caller.callsign} 5NN ${txNr}`, {
                freq: caller.freq,
                wpm: caller.wpm,
                isCaller: true,
                gain: caller.gain || 0.35
            });
            if (!contestSession || !contestSession.active || contestSession.actionToken !== token) return;
            updateEsmHint();
            focusContestInput(contestRecvNrInput);
        }
    }

    async function contestSendMyExchange() {
        if (!contestSession || !contestSession.active) return;
        contestSession.lastUserActivity = Date.now();
        const nrStr = String(contestSession.sentNr).padStart(3, '0');
        setActiveKeyLight('cs-key-f7', true);
        await playContestMorse(`5NN ${nrStr}`);
        setActiveKeyLight('cs-key-f7', false);
    }

    document.getElementById('cs-key-f1')?.addEventListener('click', () => contestSendCQ());
    document.getElementById('cs-key-f2')?.addEventListener('click', () => contestSendExchange());
    document.getElementById('cs-key-f3')?.addEventListener('click', () => contestSendTU());
    document.getElementById('cs-key-f4')?.addEventListener('click', () => contestSendMyCall());
    document.getElementById('cs-key-f5')?.addEventListener('click', () => contestSendHisCall());
    document.getElementById('cs-key-f6')?.addEventListener('click', () => contestSendRepeat());
    document.getElementById('cs-key-f7')?.addEventListener('click', () => contestSendMyExchange());
    document.getElementById('cs-key-enter')?.addEventListener('click', () => executeContestEsm());
    document.getElementById('cs-key-esc')?.addEventListener('click', () => {
        if (contestSession && contestSession.active) {
            contestSession.actionToken++;
            contestSession.state = 'IDLE';
            feedbackEl.className = 'feedback show';
            feedbackEl.textContent = 'Приём/передача прерваны (Esc). Нажмите F1 или Enter для вызова CQ.';
            clearAllKeyLights();
            updateEsmHint();
        }
        stopAllContestAudio();
    });
    document.getElementById('cs-contest-finish-btn')?.addEventListener('click', () => {
        stopContestSession();
    });

    contestCallInput?.addEventListener('input', () => {
        if (contestSession) contestSession.lastUserActivity = Date.now();
        updateDupeBadge();
        updateEsmHint();
    });
    contestRecvNrInput?.addEventListener('input', () => {
        if (contestSession) contestSession.lastUserActivity = Date.now();
        updateEsmHint();
    });

    async function startSessionWithItems(retryItems) {
        if (!retryItems || !retryItems.length) return;
        abortCurrentSession();
        if (typeof startSessionAudioNoise === 'function') startSessionAudioNoise();
        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled && fwEnabled.checked ? parseInt(fwSlider.value, 10) : null;
        let speedMult = speedXpFactor(wpm);
        let xpPerCallsign = Math.round(20 * speedMult);

        session = {
            items: retryItems, index: 0, wpm, farnsworth,
            isBufferMode: false, bufferDepth: selectedBufferDepth,
            isPaperMode: false, paperGap: 3.0, playedCount: 0,
            paperStopped: false, finished: false,
            correct: 0, dbXpEarned: 0,
            startTime: Date.now(), history: [], xpPerCallsign, isDaily: false,
            isRufz: false,
            wrongCallsigns: [],
            replayedCurrent: false,
            rufz: null
        };

        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        const sessionCounter = document.getElementById('cs-session-counter');
        if (sessionCounter) sessionCounter.style.display = 'block';
        if (contestDisplay) contestDisplay.style.display = 'none';
        csTotalEl.textContent = retryItems.length;
        csIndexEl.textContent = 1;
        feedbackEl.className = 'feedback';
        feedbackEl.textContent = '';
        if (paperSessionDisplay) paperSessionDisplay.style.display = 'none';
        if (paperControlsRow) paperControlsRow.style.display = 'none';
        if (answerInput) {
            answerInput.style.display = 'block';
            answerInput.value = '';
            answerInput.focus();
        }
        if (csSubmitRow) csSubmitRow.style.display = 'flex';
        playCurrent();
    }

    async function startSession() {
        const dailyBlock = document.getElementById('cs-daily-time-block');
        if (dailyBlock) dailyBlock.style.display = 'none';
        const ctx = getSharedAudioContext();
        if (typeof unlockAudioContext === 'function') {
            unlockAudioContext(ctx);
        } else if (ctx && ctx.state === 'suspended') {
            try { ctx.resume(); } catch (_) {}
        }

        abortCurrentSession();
        if (typeof startSessionAudioNoise === 'function') {
            startSessionAudioNoise();
        }

        const startBtn = document.getElementById('start-session');
        const origBtnText = startBtn ? startBtn.innerHTML : null;
        if (startBtn) {
            startBtn.disabled = true;
        }

        const wpm = parseInt(wpmSlider.value, 10);
        const farnsworth = fwEnabled && fwEnabled.checked ? parseInt(fwSlider.value, 10) : null;
        const isPaperMode = paperCheckbox ? paperCheckbox.checked : false;
        const isBufferMode = !isPaperMode && bufferCheckbox ? bufferCheckbox.checked : false;
        const paperGap = paperGapSlider ? parseFloat(paperGapSlider.value) : 3.0;
        
        const isSprint = (selectedMode === 'rufz') || (selectedMode === 'standard' && !!csSprintEnabledEl?.checked);
        const isRufz = isSprint;
        const isContest = (selectedMode === 'contest');
        const count = isContest ? 30 : parseInt(document.getElementById('cs-count')?.value || '50', 10);

        const audioSettings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : null;
        const readySignalEnabled = !!(readySignalEl ? readySignalEl.checked : (audioSettings && audioSettings.readySignal));
        setupError.className = 'feedback';

        let items;
        try {
            items = await fetchCallsigns(count);
            if (!items || !items.length) {
                const fallback = [...FALLBACK_CALLSIGNS].sort(() => Math.random() - 0.5);
                items = fallback.slice(0, count);
            }
        } catch {
            const fallback = [...FALLBACK_CALLSIGNS].sort(() => Math.random() - 0.5);
            items = fallback.slice(0, count);
        } finally {
            if (startBtn) {
                startBtn.disabled = false;
                if (origBtnText) startBtn.innerHTML = origBtnText;
            }
        }

        if (isContest) {
            startContestSession(items, wpm);
            return;
        }

        let isDaily = new URLSearchParams(window.location.search).get('daily') === '1';
        let speedMult = isDaily ? speedXpFactor(wpm) : 1;
        let xpPerCallsign = Math.round(20 * speedMult);

        session = {
            items, index: 0, wpm, farnsworth,
            isBufferMode: !isRufz && isBufferMode,
            bufferDepth: selectedBufferDepth,
            isPaperMode: !isRufz && isPaperMode,
            paperGap, playedCount: 0,
            paperStopped: false, finished: false,
            correct: 0, dbXpEarned: 0,
            startTime: Date.now(), history: [], xpPerCallsign, isDaily,
            isRufz,
            wrongCallsigns: [],
            replayedCurrent: false,
            rufz: isRufz ? { score: 0, peakWpm: wpm, wpmHistory: [wpm] } : null
        };
        setupPanel.style.display = 'none';
        resultPanel.style.display = 'none';
        sessionPanel.style.display = 'block';
        const sessionCounter = document.getElementById('cs-session-counter');
        if (sessionCounter) sessionCounter.style.display = 'block';
        if (contestDisplay) contestDisplay.style.display = 'none';
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
            if (replayBtn) replayBtn.style.display = isRufz ? 'none' : 'inline-flex';
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

        if (!session.wrongCallsigns) session.wrongCallsigns = [];

        if (isCorrect) {
            session.correct++;
            feedbackEl.textContent = t('js.cs.correct', { '{expected}': expected });
            feedbackEl.className = 'feedback show ok';

            if (session.isRufz) {
                const isRepeat = !!session.replayedCurrent;
                const scoreAdd = Math.round(session.wpm * expected.length * (isRepeat ? 0.5 : 1.0));
                session.rufz.score += scoreAdd;
                session.xpPerCallsign = Math.round(scoreAdd * 0.1);
                session.wpm = Math.min(60, session.wpm + 1);
                session.rufz.peakWpm = Math.max(session.rufz.peakWpm, session.wpm);
                session.rufz.wpmHistory.push(session.wpm);
                if (wpmSlider) wpmSlider.value = session.wpm;
                if (wpmValue) wpmValue.textContent = session.wpm;
            }

            session.dbXpEarned += session.xpPerCallsign;
            Progress.addXp(session.xpPerCallsign);
            Progress.incrementStat('callsignsCompleted', 1);
            postStat('total_callsigns', 1);
        } else {
            session.wrongCallsigns.push(session.items[session.index]);

            if (session.isRufz) {
                session.wpm = Math.max(8, session.wpm - 1);
                session.rufz.wpmHistory.push(session.wpm);
                if (wpmSlider) wpmSlider.value = session.wpm;
                if (wpmValue) wpmValue.textContent = session.wpm;
            }

            feedbackEl.innerHTML = renderCallsignDiff(expected, typed);
            feedbackEl.className = 'feedback show bad';
        }

        session.replayedCurrent = false;
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
        stopAllContestAudio();
        clearAllKeyLights();
        sessionPanel.style.display = 'none';
        resultPanel.style.display = 'block';
        if (paperResultBlock) paperResultBlock.style.display = 'none';
        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';

        const contestRes = document.getElementById('cs-contest-result-block');
        if (contestRes) contestRes.style.display = 'none';

        // Clean up previous result notes
        resultPanel.querySelectorAll('.js-result-note').forEach(n => n.remove());

        const total = session.items.length;
        const accuracy = total ? session.correct / total : 0;
        let xpEarned = session.isRufz ? (session.rufz ? Math.round(session.rufz.score * 0.1) : session.dbXpEarned) : (session.correct * session.xpPerCallsign);
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
                        '{len}': 0,
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
        if (session.isRufz) {
            parts.push(`RufzXP Score: ${session.rufz ? session.rufz.score : 0}`);
        } else if (speedMult > 1) {
            parts.push(`${baseXP} &times; ${speedMult.toFixed(1)} (скорость)`);
        } else {
            parts.push(`${baseXP} (база)`);
        }
        if (hasDailyBonus) parts.push(`50 (бонус)`);
        brBox.innerHTML = parts.join(' + ') + ` = <b>${Math.round(xpEarned)} XP</b>`;
        if (grid) grid.insertAdjacentElement('afterend', brBox);

        // RufzXP блок
        const rufzBlock = document.getElementById('cs-rufz-result-block');
        if (rufzBlock) {
            if (session.isRufz && session.rufz) {
                rufzBlock.style.display = 'block';
                document.getElementById('cs-rufz-score').textContent = session.rufz.score;
                document.getElementById('cs-rufz-peak').textContent = session.rufz.peakWpm + ' wpm';
                const avg = Math.round(session.rufz.wpmHistory.reduce((a, b) => a + b, 0) / session.rufz.wpmHistory.length);
                document.getElementById('cs-rufz-avg').textContent = avg + ' wpm';
                renderRufzSpeedChart(session.rufz.wpmHistory);
            } else {
                rufzBlock.style.display = 'none';
            }
        }

        // Блок работы над ошибками
        const mistakesBlock = document.getElementById('cs-mistakes-block');
        const mistakeCountEl = document.getElementById('cs-mistake-count');
        if (mistakesBlock) {
            if (!session.isPaperMode && session.wrongCallsigns && session.wrongCallsigns.length > 0) {
                if (mistakeCountEl) mistakeCountEl.textContent = session.wrongCallsigns.length;
                mistakesBlock.style.display = 'block';
            } else {
                mistakesBlock.style.display = 'none';
            }
        }

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

        const sessionDur = session.durationSec || (session.startTime ? Math.round((Date.now() - session.startTime) / 1000) : 0);
        if (sessionDur >= 3 && typeof Progress.addTrainingTime === 'function' && !session.timeLogged) {
            Progress.addTrainingTime(sessionDur);
            session.timeLogged = true;
            session.durationSec = sessionDur;
        }
        if (typeof Progress.renderTrainingSummary === 'function') {
            Progress.renderTrainingSummary('cs-daily-time-block', session.durationSec || sessionDur);
        }
    }

    function stopCallsignsSession() {
        if (contestSession && contestSession.active) {
            stopContestSession();
            return;
        }
        if (session) {
            session.paperStopped = true;
        }
        cancelCsPaperSleep();
        stopAllContestAudio();
        clearAllKeyLights();
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
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            if (session) session.replayedCurrent = true;
            playCurrent();
        });
    }

    const retrainMistakesBtn = document.getElementById('cs-retrain-mistakes-btn');
    if (retrainMistakesBtn) {
        retrainMistakesBtn.addEventListener('click', () => {
            if (!session || !session.wrongCallsigns || !session.wrongCallsigns.length) return;
            const retryCalls = [...session.wrongCallsigns];
            startSessionWithItems(retryCalls);
        });
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
        resultPanel.style.display = 'none';
        setupPanel.style.display = 'block';
        if (paperResultBlock) paperResultBlock.style.display = 'none';
        const stdGrid = document.getElementById('cs-standard-stat-grid');
        if (stdGrid) stdGrid.style.display = 'grid';
        const rufzRes = document.getElementById('cs-rufz-result-block');
        if (rufzRes) rufzRes.style.display = 'none';
        const contestRes = document.getElementById('cs-contest-result-block');
        if (contestRes) contestRes.style.display = 'none';
        const mistakesBlock = document.getElementById('cs-mistakes-block');
        if (mistakesBlock) mistakesBlock.style.display = 'none';
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
    // а также завершение активной сессии по Escape и горячие клавиши контеста F1..F7
    window.addEventListener('keydown', (e) => {
        if (contestSession && contestSession.active) {
            contestSession.lastUserActivity = Date.now();
            if (e.key === 'F1') { e.preventDefault(); contestSendCQ(); return; }
            if (e.key === 'F2') { e.preventDefault(); contestSendExchange(); return; }
            if (e.key === 'F3') { e.preventDefault(); contestSendTU(); return; }
            if (e.key === 'F4') { e.preventDefault(); contestSendMyCall(); return; }
            if (e.key === 'F5') { e.preventDefault(); contestSendHisCall(); return; }
            if (e.key === 'F6') { e.preventDefault(); contestSendRepeat(); return; }
            if (e.key === 'F7') { e.preventDefault(); contestSendMyExchange(); return; }
            if (e.key === 'Escape') {
                e.preventDefault();
                contestSession.actionToken++;
                contestSession.state = 'IDLE';
                feedbackEl.className = 'feedback show';
                feedbackEl.textContent = 'Приём/передача прерваны (Esc). Нажмите F1 или Enter для вызова CQ.';
                clearAllKeyLights();
                updateEsmHint();
                stopAllContestAudio();
                if (contestCallInput) contestCallInput.focus();
                return;
            }
            if (e.key === 'Tab' || e.key === ' ') {
                e.preventDefault();
                if (document.activeElement === contestCallInput) {
                    if (contestRecvNrInput) contestRecvNrInput.focus();
                } else {
                    if (contestCallInput) contestCallInput.focus();
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                executeContestEsm();
                return;
            }
            return;
        }

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

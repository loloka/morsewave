/**
 * =========================================================
 * MorseWave Pro Keyer (R9OGL Edition) — WebSerial & Telemetry
 * Подключение к физическому кейеру через USB COM-порт (115200 бод)
 * =========================================================
 */

(() => {
    'use strict';

    // Элементы интерфейса
    const btnConnect = document.getElementById('btn-connect-serial');
    const badgeStatus = document.getElementById('serial-status-badge');
    const ledKey = document.getElementById('key-led-indicator');
    const sidetoneToggle = document.getElementById('sidetone-toggle');
    const terminalBox = document.getElementById('terminal-log-stream');
    const btnClearTerminal = document.getElementById('btn-clear-terminal');

    // Элементы виртуального OLED
    const oledWpm = document.getElementById('oled-wpm-text');
    const oledPitch = document.getElementById('oled-pitch-text');
    const oledMorse = document.getElementById('oled-morse-display');
    const oledTicker = document.getElementById('oled-ticker-text');

    // Телеметрия
    const gaugeWpmVal = document.getElementById('gauge-wpm-value');
    const gaugeWpmBar = document.getElementById('gauge-wpm-bar');
    const gaugePitchVal = document.getElementById('gauge-pitch-value');
    const gaugePitchBar = document.getElementById('gauge-pitch-bar');

    // Состояние соединения
    let port = null;
    let reader = null;
    let keepReading = false;
    let currentDecodedText = '';

    // Синтезатор звука браузера (Web Audio API)
    let audioCtx = null;
    let osc = null;
    let gainNode = null;
    let currentToneFreq = 700;
    let currentWpm = 20;

    // --- Web Audio Sidetone ---
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function startSidetone() {
        if (!sidetoneToggle || !sidetoneToggle.checked) return;
        initAudio();
        if (osc) return;

        const now = audioCtx.currentTime;
        osc = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(currentToneFreq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.005);

        osc.connect(gainNode).connect(audioCtx.destination);
        osc.start(now);
    }

    function stopSidetone() {
        if (!osc) return;
        const now = audioCtx.currentTime;
        gainNode.gain.linearRampToValueAtTime(0, now + 0.01);
        osc.stop(now + 0.015);
        osc = null;
    }

    // --- Индикация физического нажатия (LED и звук) ---
    let ledOffTimer = null;
    function pulseKeyIndicator(isDah) {
        if (ledKey) {
            ledKey.classList.add('active');
            clearTimeout(ledOffTimer);
            const duration = isDah ? (1200 / currentWpm) * 3 : (1200 / currentWpm);
            
            startSidetone();

            ledOffTimer = setTimeout(() => {
                ledKey.classList.remove('active');
                stopSidetone();
            }, duration * 0.85);
        }
    }

    // --- Обновление виртуального OLED 0.96" ---
    function updateOledHeader(wpm, pitch) {
        if (wpm && oledWpm) {
            currentWpm = parseInt(wpm, 10);
            oledWpm.textContent = `WPM: ${currentWpm}`;
            if (gaugeWpmVal) gaugeWpmVal.textContent = currentWpm;
            if (gaugeWpmBar) {
                const pct = Math.max(0, Math.min(100, ((currentWpm - 10) / (60 - 10)) * 100));
                gaugeWpmBar.style.width = `${pct}%`;
            }
        }
        if (pitch && oledPitch) {
            currentToneFreq = parseInt(pitch, 10);
            oledPitch.textContent = `${currentToneFreq}Hz`;
            if (gaugePitchVal) gaugePitchVal.textContent = currentToneFreq;
            if (gaugePitchBar) {
                const pct = Math.max(0, Math.min(100, ((currentToneFreq - 400) / (1200 - 400)) * 100));
                gaugePitchBar.style.width = `${pct}%`;
            }
        }
    }

    function updateOledMorse(char) {
        if (!oledMorse) return;
        oledMorse.textContent = char;
        oledMorse.classList.add('pulse');
        setTimeout(() => oledMorse.classList.remove('pulse'), 80);
    }

    function appendDecodedChar(char) {
        currentDecodedText += char;
        if (currentDecodedText.length > 24) {
            currentDecodedText = currentDecodedText.substring(currentDecodedText.length - 24);
        }
        if (oledTicker) {
            oledTicker.textContent = `TXT: ${currentDecodedText}`;
        }

        // Проверка в эхо-тестере
        checkEchoProgress(char);
    }

    // --- Лог терминала ---
    function appendTerminal(text, type = 'text') {
        if (!terminalBox) return;
        const span = document.createElement('span');
        span.className = `log-${type}`;
        span.textContent = text;
        terminalBox.appendChild(span);
        terminalBox.scrollTop = terminalBox.scrollHeight;
    }

    if (btnClearTerminal) {
        btnClearTerminal.addEventListener('click', () => {
            if (terminalBox) terminalBox.innerHTML = '';
        });
    }

    // --- Парсер входящего потока данных Arduino ---
    let incomingBuffer = '';

    function parseIncomingStream(chunk) {
        incomingBuffer += chunk;

        // Посимвольный разбор точек и тире
        for (let i = 0; i < chunk.length; i++) {
            const ch = chunk[i];
            if (ch === '.') {
                pulseKeyIndicator(false);
                updateOledMorse('.');
                appendTerminal('.', 'ditdah');
            } else if (ch === '-') {
                pulseKeyIndicator(true);
                updateOledMorse('-');
                appendTerminal('-', 'ditdah');
            }
        }

        // Выделение декодированных букв вида [A] или [=] или [<SK>]
        const bracketRegex = /\[(.*?)\]/g;
        let match;
        while ((match = bracketRegex.exec(incomingBuffer)) !== null) {
            const decoded = match[1];
            appendDecodedChar(decoded);
            appendTerminal(` [${decoded}] `, 'char');
            setTimeout(() => {
                if (oledMorse && (oledMorse.textContent === '.' || oledMorse.textContent === '-')) {
                    oledMorse.textContent = '- READY -';
                }
            }, 300);
        }

        // Выделение обновлений скорости [SPEED] 24 WPM
        const speedMatch = incomingBuffer.match(/\[SPEED\]\s*(\d+)\s*WPM/i);
        if (speedMatch) {
            updateOledHeader(speedMatch[1], null);
        }

        // Выделение обновлений тона [TONE] 750 Hz
        const toneMatch = incomingBuffer.match(/\[TONE\]\s*(\d+)\s*Hz/i);
        if (toneMatch) {
            updateOledHeader(null, toneMatch[1]);
        }

        // Выделение пробела
        if (chunk.includes('\n') || chunk.includes('  ')) {
            appendDecodedChar(' ');
            appendTerminal('\n', 'sys');
        }

        // Ограничение размера входного буфера
        if (incomingBuffer.length > 256) {
            incomingBuffer = incomingBuffer.substring(incomingBuffer.length - 128);
        }
    }

    // --- WebSerial API подключение ---
    async function connectSerial() {
        if (!('serial' in navigator)) {
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                alert('⚠️ WebSerial API требует безопасного протокола HTTPS!\n\nПожалуйста, откройте страницу через https:// (с замочком в строке адреса).');
                appendTerminal('\n[ОШИБКА] WebSerial заблокирован браузером из-за небезопасного соединения HTTP. Откройте сайт по HTTPS!\n', 'sys');
            } else {
                alert('⚠️ Ваш браузер не поддерживает WebSerial API.\n\nПожалуйста, используйте Google Chrome, Яндекс.Браузер, Microsoft Edge или Opera на компьютере.');
                appendTerminal('\n[ОШИБКА] Браузер не поддерживает WebSerial API. Нужен Chrome, Edge или Яндекс.Браузер.\n', 'sys');
            }
            return;
        }

        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });

            keepReading = true;
            btnConnect.textContent = 'Отключить ключ';
            btnConnect.classList.add('connected');
            if (badgeStatus) {
                badgeStatus.textContent = '● НА СВЯЗИ (115200)';
                badgeStatus.style.color = '#4fd8c4';
                badgeStatus.style.borderColor = '#4fd8c4';
            }

            appendTerminal('\n[СИСТЕМА] Порт 115200 бод открыт! Ожидание сигналов с ключа...\n', 'sys');

            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();

            while (keepReading) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                if (value) {
                    parseIncomingStream(value);
                }
            }
        } catch (err) {
            console.warn('WebSerial error / cancelled:', err);
            if (err.name === 'NotFoundError') {
                appendTerminal('\n[СИСТЕМА] Выбор COM-порта отменён.\n', 'sys');
            } else {
                const msg = err.message || String(err);
                appendTerminal(`\n[ОШИБКА] Не удалось открыть порт: ${msg}\n`, 'sys');
                if (msg.toLowerCase().includes('failed to open') || msg.toLowerCase().includes('access denied') || err.name === 'NetworkError') {
                    alert('⚠️ Не удалось открыть COM-порт!\n\nВероятная причина: этот COM-порт сейчас занят другой программой (например, в Arduino IDE открыт «Монитор порта»).\n\nПожалуйста, закройте окно Монитора порта в Arduino IDE и нажмите «Подключить» ещё раз!');
                }
            }
            disconnectSerial();
        }
    }

    async function disconnectSerial() {
        keepReading = false;
        if (reader) {
            try {
                await reader.cancel();
                reader.releaseLock();
            } catch (e) {}
            reader = null;
        }
        if (port) {
            try {
                await port.close();
            } catch (e) {}
            port = null;
        }

        if (btnConnect) {
            btnConnect.textContent = 'Подключить ключ по USB';
            btnConnect.classList.remove('connected');
        }
        if (badgeStatus) {
            badgeStatus.textContent = '● ОТКЛЮЧЕН';
            badgeStatus.style.color = 'var(--text-muted)';
            badgeStatus.style.borderColor = 'var(--border)';
        }
        appendTerminal('\n[СИСТЕМА] Устройство отключено.\n', 'sys');
    }

    if (btnConnect) {
        btnConnect.addEventListener('click', () => {
            if (port) {
                disconnectSerial();
            } else {
                connectSerial();
            }
        });
    }

    if (navigator.serial) {
        navigator.serial.addEventListener('disconnect', () => {
            disconnectSerial();
        });
    }

    // --- Интерактивный эхо-тренажёр (Morserino & CW Pro) ---
    const echoCategories = {
        callsigns: ['R9OGL', 'R8OA', 'RA9O', 'UA9O', 'UA0A', 'RA3A', 'DL1ABC', 'K1ZZ', 'W1AW', 'OH2ZZ', 'RK9O', 'UA9OC'],
        qcodes: ['CQ CQ', '73 DE R9OGL', 'QRZ?', 'QTH', 'RST 599', 'GM OM', 'TU 73', 'FB OM', 'HW?', 'SK'],
        contest: ['5NN 001', '5NN 599', 'TEST R9OGL', 'TU 5NN TU', '599 16', 'CQ TEST'],
        groups: ['VVV =', 'PARIS', 'SOS', 'K M R', 'C W', 'CQ']
    };

    let activeCategory = 'callsigns';
    let activeMode = 'echo'; // 'echo' (Morserino style audio) or 'visual'
    let currentEchoIndex = 0;
    let userEchoBuffer = '';
    let echoStreak = 0;
    let echoScore = 0;
    let isPlayingAudio = false;
    let currentMorsePlayer = null;

    const echoTargetEl = document.getElementById('echo-target-text');
    const echoResultEl = document.getElementById('echo-result-text');
    const btnNextEcho = document.getElementById('btn-next-echo');
    const btnPlayEcho = document.getElementById('btn-play-echo');
    const btnResetEcho = document.getElementById('btn-reset-echo');
    const echoCategorySelect = document.getElementById('echo-category-select');
    const btnModeEcho = document.getElementById('btn-mode-echo');
    const btnModeVisual = document.getElementById('btn-mode-visual');
    const echoStreakVal = document.getElementById('echo-streak-val');
    const echoScoreVal = document.getElementById('echo-score-val');
    const echoInstructions = document.getElementById('echo-instructions-text');

    function playSuccessChirp() {
        try {
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const oscNode = audioCtx.createOscillator();
            const gNode = audioCtx.createGain();
            oscNode.type = 'triangle';
            oscNode.frequency.setValueAtTime(659.25, now); // E5
            oscNode.frequency.setValueAtTime(880, now + 0.08); // A5
            gNode.gain.setValueAtTime(0.18, now);
            gNode.gain.linearRampToValueAtTime(0, now + 0.28);
            oscNode.connect(gNode).connect(audioCtx.destination);
            oscNode.start(now);
            oscNode.stop(now + 0.28);
        } catch (e) {}
    }

    async function playCurrentEchoAudio() {
        const list = echoCategories[activeCategory] || echoCategories.callsigns;
        const phrase = list[currentEchoIndex];
        if (!phrase || isPlayingAudio) return;

        if (typeof MorseAudio === 'undefined') {
            console.warn('MorseAudio class not loaded');
            return;
        }

        try {
            isPlayingAudio = true;
            if (btnPlayEcho) {
                btnPlayEcho.style.opacity = '0.7';
                btnPlayEcho.innerHTML = '<span>🔊</span> <span>Звучит...</span>';
            }

            if (currentMorsePlayer && currentMorsePlayer.stop) {
                currentMorsePlayer.stop();
            }

            currentMorsePlayer = new MorseAudio({
                freq: currentToneFreq || 700,
                wpm: Math.min(30, Math.max(12, currentWpm || 20))
            });

            await currentMorsePlayer.play(phrase);
        } catch (e) {
            console.warn('Echo audio play error:', e);
        } finally {
            isPlayingAudio = false;
            if (btnPlayEcho) {
                btnPlayEcho.style.opacity = '1';
                btnPlayEcho.innerHTML = '<span>▶</span> <span>Прослушать</span>';
            }
        }
    }

    function setEchoPhrase(index) {
        const list = echoCategories[activeCategory] || echoCategories.callsigns;
        currentEchoIndex = index % list.length;
        userEchoBuffer = '';

        const target = list[currentEchoIndex];
        if (echoTargetEl) {
            echoTargetEl.textContent = target;
        }
        if (echoResultEl) {
            echoResultEl.innerHTML = '<span style="color:var(--text-muted);">Ожидание передачи веслом...</span>';
        }

        if (activeMode === 'echo') {
            setTimeout(() => {
                playCurrentEchoAudio();
            }, 350);
        }
    }

    function checkEchoProgress(char) {
        if (!echoTargetEl || !echoResultEl) return;
        const list = echoCategories[activeCategory] || echoCategories.callsigns;
        const target = list[currentEchoIndex];

        if (char === ' ' && userEchoBuffer.length === 0) return;
        if (char === ' ' && userEchoBuffer.endsWith(' ')) return;

        userEchoBuffer += (char === ' ') ? ' ' : char.trim();

        let html = '';
        let hasError = false;

        for (let i = 0; i < userEchoBuffer.length; i++) {
            const uChar = userEchoBuffer[i];
            const tChar = target[i];

            if (uChar === tChar) {
                html += `<span style="color:#4fd8c4; font-weight:700;">${uChar}</span>`;
            } else {
                html += `<span style="color:#ff5a52; text-decoration:line-through; font-weight:700;">${uChar}</span>`;
                hasError = true;
            }
        }

        echoResultEl.innerHTML = html;

        if (userEchoBuffer.trim() === target.trim()) {
            echoStreak++;
            echoScore++;
            if (echoStreakVal) echoStreakVal.textContent = echoStreak;
            if (echoScoreVal) echoScoreVal.textContent = echoScore;

            echoResultEl.innerHTML += ' <b style="color:#e8a33d; margin-left:8px;">✓ 100% В ЭФИРЕ!</b>';
            playSuccessChirp();

            setTimeout(() => {
                setEchoPhrase(currentEchoIndex + 1);
            }, 1400);
        } else if (hasError && userEchoBuffer.length >= target.length) {
            echoStreak = 0;
            if (echoStreakVal) echoStreakVal.textContent = echoStreak;
            echoResultEl.innerHTML += ' <span style="color:#ff5a52; font-size:12px; margin-left:8px;">[Ошибка передачи, нажмите ⌫ Сброс]</span>';
        }
    }

    if (btnNextEcho) {
        btnNextEcho.addEventListener('click', () => {
            setEchoPhrase(currentEchoIndex + 1);
        });
    }

    if (btnResetEcho) {
        btnResetEcho.addEventListener('click', () => {
            userEchoBuffer = '';
            if (echoResultEl) {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">Ожидание передачи веслом...</span>';
            }
        });
    }

    if (btnPlayEcho) {
        btnPlayEcho.addEventListener('click', () => {
            playCurrentEchoAudio();
        });
    }

    if (echoCategorySelect) {
        echoCategorySelect.addEventListener('change', (e) => {
            activeCategory = e.target.value;
            setEchoPhrase(0);
        });
    }

    function updateModeUI() {
        if (activeMode === 'echo') {
            if (btnModeEcho) {
                btnModeEcho.classList.add('active');
                btnModeEcho.style.background = 'var(--surface-3, #222c33)';
                btnModeEcho.style.color = '#fff';
            }
            if (btnModeVisual) {
                btnModeVisual.classList.remove('active');
                btnModeVisual.style.background = 'transparent';
                btnModeVisual.style.color = 'var(--text-muted)';
            }
            if (echoInstructions) {
                echoInstructions.textContent = 'Сайт воспроизводит позывной в эфире. Внимательно прослушайте его и повторите веслом на ключе!';
            }
        } else {
            if (btnModeVisual) {
                btnModeVisual.classList.add('active');
                btnModeVisual.style.background = 'var(--surface-3, #222c33)';
                btnModeVisual.style.color = '#fff';
            }
            if (btnModeEcho) {
                btnModeEcho.classList.remove('active');
                btnModeEcho.style.background = 'transparent';
                btnModeEcho.style.color = 'var(--text-muted)';
            }
            if (echoInstructions) {
                echoInstructions.textContent = 'Читайте текст с экрана и передавайте его вашим манипулятором, отрабатывая ритм и чистоту.';
            }
        }
    }

    if (btnModeEcho) {
        btnModeEcho.addEventListener('click', () => {
            activeMode = 'echo';
            updateModeUI();
            setEchoPhrase(currentEchoIndex);
        });
    }

    if (btnModeVisual) {
        btnModeVisual.addEventListener('click', () => {
            activeMode = 'visual';
            updateModeUI();
        });
    }

    // Инициализация первой фразы
    setEchoPhrase(0);

    // --- Обработка формы предзаказа ключа ---
    const orderForm = document.getElementById('keyer-order-form');
    const modalOverlay = document.getElementById('order-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOrderId = document.getElementById('modal-order-id');

    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const callsign = (document.getElementById('order-callsign')?.value || 'RADIO').trim().toUpperCase();
            const contact = document.getElementById('order-contact')?.value || '';
            const kit = document.getElementById('order-kit')?.value || 'assembled';
            const city = document.getElementById('order-city')?.value || '';
            const notes = document.getElementById('order-notes')?.value || '';

            const orderId = `R9OGL-${Math.floor(100 + Math.random() * 900)}`;

            const orderData = {
                id: orderId,
                callsign,
                contact,
                kit,
                city,
                notes,
                date: new Date().toISOString()
            };

            // Локальное сохранение заявки
            try {
                const existing = JSON.parse(localStorage.getItem('r9ogl_key_orders') || '[]');
                existing.push(orderData);
                localStorage.setItem('r9ogl_key_orders', JSON.stringify(existing));
            } catch (err) {}

            if (modalOrderId) modalOrderId.textContent = orderId;
            if (modalOverlay) modalOverlay.classList.add('active');
            orderForm.reset();
        });
    }

    if (modalCloseBtn && modalOverlay) {
        modalCloseBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }
})();

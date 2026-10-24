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
    const oledLastChar = document.getElementById('oled-last-char');
    const oledTicker = document.getElementById('oled-ticker-text');
    const btnClearOled = document.getElementById('btn-clear-oled');

    // Накопитель текущего кода морзе (точки и тире текущего знака)
    let currentMorseBuffer = '';

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

            // Динамический расчёт длительностей по стандарту PARIS (T_dit = 1200 / WPM мс)
            const dMs = Math.round(1200 / currentWpm);
            const elDit = document.getElementById('val-dit-ms');
            const elDah = document.getElementById('val-dah-ms');
            const elChar = document.getElementById('val-char-pause-ms');
            const elWord = document.getElementById('val-word-pause-ms');
            const msUnit = t('js.paris.dot_unit') || 'ms';
            if (elDit) elDit.textContent = `${dMs} ${msUnit}`;
            if (elDah) elDah.textContent = `${dMs * 3} ${msUnit}`;
            if (elChar) elChar.textContent = `${dMs * 3} ${msUnit}`;
            if (elWord) elWord.textContent = `${dMs * 7} ${msUnit}`;

            if (window.TimingLab && window.TimingLab.setWpm) {
                window.TimingLab.setWpm(currentWpm);
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

    function appendOledMorseElement(el) {
        if (!oledMorse) return;
        currentMorseBuffer += el;
        if (currentMorseBuffer.length > 8) {
            currentMorseBuffer = currentMorseBuffer.substring(currentMorseBuffer.length - 8);
        }
        oledMorse.textContent = currentMorseBuffer;
        oledMorse.classList.add('pulse');
        setTimeout(() => oledMorse.classList.remove('pulse'), 80);
    }

    function setOledDecodedChar(char) {
        if (oledLastChar) {
            oledLastChar.textContent = char;
            oledLastChar.classList.add('pop');
            setTimeout(() => oledLastChar.classList.remove('pop'), 200);
        }
        // Сбрасываем накопитель точек/тире после распознавания знака
        currentMorseBuffer = '';
        setTimeout(() => {
            if (oledMorse && currentMorseBuffer === '') {
                oledMorse.textContent = '- READY -';
            }
        }, 350);
    }

    function appendDecodedChar(char) {
        setOledDecodedChar(char);

        currentDecodedText += char;
        if (currentDecodedText.length > 28) {
            currentDecodedText = currentDecodedText.substring(currentDecodedText.length - 28);
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

    if (btnClearOled) {
        btnClearOled.addEventListener('click', () => {
            currentDecodedText = '';
            currentMorseBuffer = '';
            if (oledTicker) oledTicker.textContent = 'TXT: ';
            if (oledMorse) oledMorse.textContent = '- READY -';
            if (oledLastChar) oledLastChar.textContent = '_';
        });
    }

    // --- Парсер входящего потока данных Arduino ---
    let incomingBuffer = '';

    function parseIncomingStream(chunk) {
        // 1. Посимвольный разбор точек и тире для живой индикации
        for (let i = 0; i < chunk.length; i++) {
            const ch = chunk[i];
            if (ch === '.') {
                pulseKeyIndicator(false);
                appendOledMorseElement('.');
                appendTerminal('.', 'ditdah');
                if (window.TimingLab && window.TimingLab.onDit) window.TimingLab.onDit();
            } else if (ch === '-') {
                pulseKeyIndicator(true);
                appendOledMorseElement('-');
                appendTerminal('-', 'ditdah');
                if (window.TimingLab && window.TimingLab.onDah) window.TimingLab.onDah();
            }
        }

        incomingBuffer += chunk;

        // 2. Обработка сервисных сообщений скорости и тона
        let speedMatch;
        while ((speedMatch = incomingBuffer.match(/\[SPEED\]\s*(\d+)\s*WPM/i)) !== null) {
            updateOledHeader(speedMatch[1], null);
            const idx = incomingBuffer.indexOf(speedMatch[0]);
            incomingBuffer = incomingBuffer.substring(idx + speedMatch[0].length);
        }

        let toneMatch;
        while ((toneMatch = incomingBuffer.match(/\[TONE\]\s*(\d+)\s*Hz/i)) !== null) {
            updateOledHeader(null, toneMatch[1]);
            const idx = incomingBuffer.indexOf(toneMatch[0]);
            incomingBuffer = incomingBuffer.substring(idx + toneMatch[0].length);
        }

        // 3. Выделение декодированных букв вида [A], [9], [=], [<SK>] и т.д.
        // Ищем скобки и обязательно СРЕЗАЕМ их из буфера, чтобы они НИКОГДА не парсились повторно!
        let openIdx = incomingBuffer.indexOf('[');
        let closeIdx = incomingBuffer.indexOf(']', openIdx);

        while (openIdx !== -1 && closeIdx !== -1) {
            const token = incomingBuffer.substring(openIdx + 1, closeIdx).trim();
            // Срезаем всё до позиции после закрывающей скобки
            incomingBuffer = incomingBuffer.substring(closeIdx + 1);

            // Игнорируем псевдографические шкалы прогресс-бара [======>  ] и сервисные теги
            if (!token.includes('>') && !token.startsWith('SPEED') && !token.startsWith('TONE') && !token.startsWith('CW')) {
                if (token.length > 0) {
                    appendDecodedChar(token);
                    appendTerminal(` [${token}] `, 'char');
                    if (window.TimingLab && window.TimingLab.onChar) window.TimingLab.onChar(token);
                }
            }

            openIdx = incomingBuffer.indexOf('[');
            closeIdx = incomingBuffer.indexOf(']', openIdx);
        }

        // 4. Межсловный пробел при переходе на новую строку
        if (incomingBuffer.includes('\n')) {
            const lines = incomingBuffer.split('\n');
            if (lines.length > 1) {
                appendDecodedChar(' ');
                appendTerminal('\n', 'sys');
                if (window.TimingLab && window.TimingLab.onSpace) window.TimingLab.onSpace();
                incomingBuffer = lines[lines.length - 1];
            }
        }

        // Защита от переполнения остаточного мусора
        if (incomingBuffer.length > 256) {
            incomingBuffer = incomingBuffer.substring(incomingBuffer.length - 64);
        }
    }

    // --- WebSerial API подключение ---
    async function connectSerial() {
        if (!('serial' in navigator)) {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (window.location.protocol !== 'https:' && !isLocal) {
                alert(t('keyhardware.err_https') || '⚠️ WebSerial API requires HTTPS or localhost!');
                appendTerminal(t('keyhardware.err_https_term') || '\n[ERROR] WebSerial blocked on insecure HTTP.\n', 'sys');
            } else {
                alert(t('keyhardware.err_browser') || '⚠️ Your browser does not support WebSerial API.');
                appendTerminal(t('keyhardware.err_browser_term') || '\n[ERROR] Browser does not support WebSerial API.\n', 'sys');
            }
            return;
        }

        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });

            keepReading = true;
            btnConnect.textContent = t('keyhardware.btn_disconnect') || 'Отключить ключ';
            btnConnect.classList.add('connected');
            if (badgeStatus) {
                badgeStatus.textContent = t('keyhardware.status_online') || '● НА СВЯЗИ (115200)';
                badgeStatus.style.color = '#4fd8c4';
                badgeStatus.style.borderColor = '#4fd8c4';
            }

            if (oledTicker) {
                oledTicker.textContent = 'TXT: CQ DE R9OGL';
            }
            currentDecodedText = '';

            appendTerminal(t('keyhardware.sys_port_open') || '\n[СИСТЕМА] Порт 115200 бод открыт! Ожидание сигналов с ключа...\n', 'sys');

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
                appendTerminal(t('keyhardware.sys_port_cancelled') || '\n[СИСТЕМА] Выбор COM-порта отменён.\n', 'sys');
            } else {
                const msg = err.message || String(err);
                const errMsg = (t('keyhardware.err_open_port') || '\n[ОШИБКА] Не удалось открыть порт: {msg}\n').replace('{msg}', msg);
                appendTerminal(errMsg, 'sys');
                if (msg.toLowerCase().includes('failed to open') || msg.toLowerCase().includes('access denied') || err.name === 'NetworkError') {
                    alert(t('keyhardware.err_port_busy') || '⚠️ Не удалось открыть COM-порт!');
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
            btnConnect.textContent = t('keyhardware.btn_connect') || 'Подключить ключ по USB';
            btnConnect.classList.remove('connected');
        }
        if (badgeStatus) {
            badgeStatus.textContent = t('keyhardware.status_offline') || '● ОТКЛЮЧЕН';
            badgeStatus.style.color = 'var(--text-muted)';
            badgeStatus.style.borderColor = 'var(--border)';
        }
        if (oledTicker) {
            oledTicker.textContent = 'TXT: 73';
        }
        currentDecodedText = '';
        appendTerminal(t('keyhardware.sys_port_disconnected') || '\n[СИСТЕМА] Устройство отключено.\n', 'sys');
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
    } else {
        if (badgeStatus) {
            badgeStatus.textContent = t('keyhardware.status_no_serial') || '● НЕТ WEBSERIAL';
            badgeStatus.style.color = '#f87171';
            badgeStatus.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }
        if (btnConnect) {
            btnConnect.title = t('keyer.browsers_unsupported') || 'WebSerial недоступен в этом браузере.';
        }
    }

    // --- Интерактивный эхо-тренажёр CW Pro ---
    const echoCategories = {
        callsigns: [
            'R9OGL', 'R8OA', 'RA9O', 'UA9O', 'UA9OC', 'RK9O', 'RN9O', 'RU9CD', 'RA9F',
            'UA3XYZ', 'R1ABC', 'R7ABC', 'R2XY', 'RA1XYZ', 'RN6AB', 'RV3EF', 'RW4GH',
            'RX2IJ', 'RZ8KL', 'RC5MN', 'RD7OP', 'RO1QR', 'UA9XYZ', 'UB4ABC', 'UI8AB',
            'RK4W', 'RZ6D', 'W1AW', 'K5ZZ', 'N4XYZ', 'AA7BC', 'G0ABC', 'M0XYZ',
            'DL1ABC', 'DK5XYZ', 'DJ9ZB', 'JA1ABC', 'JH3XYZ', 'F5ABC', 'EA1XYZ',
            'SP5ABC', 'SM0XYZ', 'VE3ABC', 'VK2ABC', 'ZL1ABC', 'HB9ABC', 'PY2ABC',
            'LU1ABC', 'OK1ABC', 'OE3XYZ', 'I2ABC'
        ],
        qcodes: [
            'CQ CQ', '73 DE R9OGL', 'QRZ?', 'QTH', 'RST 599', 'GM OM', 'GE OM', 'GA OM',
            'PSE K', 'TNX 73', 'TU 73', 'FB OM', 'QSL PSE', 'QSO', 'QRP', 'QRO',
            'QRS', 'QRQ', 'QRM', 'QRN', 'HW?', 'SK', 'CL', 'UR 599', 'MY QTH',
            'RIG 100W', 'ANT DIPOLE', 'CFM', 'RPRT 599', 'OP OM', 'CUAGN 73'
        ],
        contest: [
            '5NN 001', '5NN 599', 'TEST R9OGL', 'TU 5NN TU', '599 16', 'CQ TEST',
            'UR 5NN 01', '73 EE', '5NN BK', 'NR 001', 'CFM 5NN'
        ],
        groups: [
            'VVV =', 'PARIS', 'SOS', 'CQ', 'DE', 'BK', 'K', 'KN', 'AS', 'AR',
            'SK', 'BT', 'UR', 'MY', 'TNX', 'TKS', 'PSE', 'FB', 'WX', 'RST',
            'CFM', '73', '88'
        ]
    };

    let activeCategory = 'callsigns';
    let activeMode = 'echo'; // 'echo' (Morserino style audio) or 'visual'
    let currentEchoIndex = 0;
    let userEchoBuffer = '';
    let echoStreak = 0;
    let echoScore = 0;
    let isPlayingAudio = false;
    let currentMorsePlayer = null;
    let isEchoRunning = false;

    const echoTargetEl = document.getElementById('echo-target-text');
    const echoResultEl = document.getElementById('echo-result-text');
    const btnToggleEcho = document.getElementById('btn-toggle-echo');
    const echoToggleLabel = document.getElementById('echo-toggle-label');
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
                btnPlayEcho.innerHTML = '<span>🔊</span> <span>' + (t('keyhardware.echo_playing') || 'Звучит...') + '</span>';
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
                btnPlayEcho.innerHTML = '<span>🔊</span> <span>' + (t('keyhardware.echo_repeat') || 'Повторить') + '</span>';
            }
        }
    }

    function toggleEchoSession() {
        isEchoRunning = !isEchoRunning;
        if (isEchoRunning) {
            if (btnToggleEcho) {
                btnToggleEcho.style.background = '#f59e0b';
                btnToggleEcho.style.color = '#000';
            }
            if (echoToggleLabel) echoToggleLabel.textContent = t('keyhardware.echo_pause') || 'Пауза';
            if (echoResultEl) {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">' + (t('keyhardware.echo_listen_prompt') || 'Слушайте позывной и повторяйте на ключе...') + '</span>';
            }
            playCurrentEchoAudio();
        } else {
            if (btnToggleEcho) {
                btnToggleEcho.style.background = '#10b981';
                btnToggleEcho.style.color = '#fff';
            }
            if (echoToggleLabel) echoToggleLabel.textContent = t('keyhardware.echo_start') || 'Начать тренировку';
            if (currentMorsePlayer && currentMorsePlayer.stop) {
                currentMorsePlayer.stop();
            }
            if (echoResultEl) {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">' + (t('keyhardware.echo_paused_prompt') || 'Тренировка на паузе. Нажмите [▶ Начать тренировку]') + '</span>';
            }
        }
    }

    function setEchoPhrase(index, autoPlay = false) {
        const list = echoCategories[activeCategory] || echoCategories.callsigns;
        currentEchoIndex = index % list.length;
        userEchoBuffer = '';

        const target = list[currentEchoIndex];
        if (echoTargetEl) {
            echoTargetEl.textContent = target;
        }
        if (echoResultEl) {
            if (isEchoRunning) {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">' + (t('keyhardware.echo_waiting_paddle') || 'Ожидание передачи веслом...') + '</span>';
            } else {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">' + (t('keyhardware.echo_click_start_prompt') || 'Нажмите [▶ Начать тренировку], чтобы услышать позывной в эфире') + '</span>';
            }
        }

        if (activeMode === 'echo' && autoPlay && isEchoRunning) {
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
        if (char === ' ' && !target.includes(' ')) return;

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

            echoResultEl.innerHTML += ' <b style="color:#e8a33d; margin-left:8px;">' + (t('keyhardware.echo_perfect') || '✓ 100% В ЭФИРЕ!') + '</b>';
            playSuccessChirp();

            setTimeout(() => {
                setEchoPhrase(currentEchoIndex + 1, isEchoRunning);
            }, 1400);
        } else if (hasError && userEchoBuffer.length >= target.length) {
            echoStreak = 0;
            if (echoStreakVal) echoStreakVal.textContent = echoStreak;
            echoResultEl.innerHTML += ' <span style="color:#ff5a52; font-size:12px; margin-left:8px;">' + (t('keyhardware.echo_error_reset') || '[Ошибка передачи, нажмите ⌫ Сброс]') + '</span>';
        }
    }

    if (btnToggleEcho) {
        btnToggleEcho.addEventListener('click', toggleEchoSession);
    }

    if (btnNextEcho) {
        btnNextEcho.addEventListener('click', () => {
            setEchoPhrase(currentEchoIndex + 1, isEchoRunning);
        });
    }

    if (btnResetEcho) {
        btnResetEcho.addEventListener('click', () => {
            userEchoBuffer = '';
            if (echoResultEl) {
                echoResultEl.innerHTML = '<span style="color:var(--text-muted);">' + (t('keyhardware.echo_waiting_paddle') || 'Ожидание передачи веслом...') + '</span>';
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
            setEchoPhrase(0, isEchoRunning);
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
                echoInstructions.textContent = t('keyhardware.echo_instr_echo') || 'Сайт воспроизводит позывной в эфире. Внимательно прослушайте его и повторите веслом на ключе!';
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
                echoInstructions.textContent = t('keyhardware.echo_instr_visual') || 'Читайте текст с экрана и передавайте его вашим манипулятором, отрабатывая ритм и чистоту.';
            }
        }
    }

    if (btnModeEcho) {
        btnModeEcho.addEventListener('click', () => {
            activeMode = 'echo';
            updateModeUI();
            setEchoPhrase(currentEchoIndex, isEchoRunning);
        });
    }

    if (btnModeVisual) {
        btnModeVisual.addEventListener('click', () => {
            activeMode = 'visual';
            updateModeUI();
        });
    }

    // Инициализация первой фразы (БЕЗ автозапуска звука при загрузке страницы!)
    setEchoPhrase(0, false);

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

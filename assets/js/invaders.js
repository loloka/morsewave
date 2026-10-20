/**
 * =====================================================================
 * MorseWave Invaders II: Radio Intercept (Вторжение-2: Радиоперехват)
 * 60 FPS HTML5 Canvas CRT Radar Engine & Real-Time Telegraph Key Decoder
 * =====================================================================
 */

(() => {
    'use strict';

    /* =========================================================
     * 1. АУДИО-ДВИЖОК ЭФФЕКТОВ И САЙДТОНА (Web Audio API)
     * ========================================================= */
    class InvadersAudio {
        constructor() {
            this.ctx = null;
            this.osc = null;
            this.gain = null;
            this.keyFreq = 700;
        }

        _ensureCtx() {
            if (!this.ctx) {
                this.ctx = (typeof getSharedAudioContext === 'function') 
                    ? getSharedAudioContext() 
                    : new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                try { this.ctx.resume(); } catch (_) {}
            }
            return this.ctx;
        }

        _getBus(ctx) {
            return (typeof getSharedMorseAudioBus === 'function') ? getSharedMorseAudioBus(ctx) : null;
        }

        startKeyTone(freq = null) {
            const ctx = this._ensureCtx();
            if (this.osc) return;

            const now = ctx.currentTime;
            const targetFreq = freq || this.keyFreq;
            const bus = this._getBus(ctx);

            this.osc = ctx.createOscillator();
            this.gain = ctx.createGain();

            this.osc.type = 'sine';
            this.osc.frequency.setValueAtTime(targetFreq, now);

            // Мягкая атака без щелчков (5 мс)
            this.gain.gain.setValueAtTime(0, now);
            this.gain.gain.linearRampToValueAtTime(0.25, now + 0.005);

            if (bus) {
                this.osc.connect(this.gain).connect(bus.input);
            } else {
                this.osc.connect(this.gain).connect(ctx.destination);
            }
            this.osc.start(now);
        }

        stopKeyTone() {
            if (!this.osc || !this.ctx) return;
            const now = this.ctx.currentTime;
            // Мягкий спад (10 мс)
            this.gain.gain.setValueAtTime(this.gain.gain.value, now);
            this.gain.gain.linearRampToValueAtTime(0, now + 0.01);
            this.osc.stop(now + 0.015);
            this.osc = null;
            this.gain = null;
        }

        playBeamShot(isCritical) {
            try {
                const ctx = this._ensureCtx();
                const now = ctx.currentTime;
                const bus = this._getBus(ctx);
                const out = bus ? bus.input : ctx.destination;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = isCritical ? 'triangle' : 'sine';
                const startFreq = isCritical ? 1400 : 950;
                const endFreq = isCritical ? 350 : 250;
                const duration = isCritical ? 0.14 : 0.09;

                osc.frequency.setValueAtTime(startFreq, now);
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

                gain.gain.setValueAtTime(isCritical ? 0.4 : 0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                osc.connect(gain).connect(out);
                osc.start(now);
                osc.stop(now + duration + 0.01);
            } catch (_) {}
        }

        playExplosion(isCritical) {
            try {
                const ctx = this._ensureCtx();
                const now = ctx.currentTime;
                const bus = this._getBus(ctx);
                const out = bus ? bus.input : ctx.destination;

                // Синтез шумового взрыва через короткий буфер
                const dur = isCritical ? 0.35 : 0.22;
                const bufferSize = Math.floor(ctx.sampleRate * dur);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(isCritical ? 1200 : 800, now);
                filter.frequency.exponentialRampToValueAtTime(80, now + dur);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(isCritical ? 0.5 : 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

                noise.connect(filter).connect(gain).connect(out);
                noise.start(now);
            } catch (_) {}
        }

        playErrorGlitch() {
            try {
                const ctx = this._ensureCtx();
                const now = ctx.currentTime;
                const bus = this._getBus(ctx);
                const out = bus ? bus.input : ctx.destination;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(95, now);
                osc.frequency.setValueAtTime(65, now + 0.04);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                osc.connect(gain).connect(out);
                osc.start(now);
                osc.stop(now + 0.13);
            } catch (_) {}
        }

        playWaveClear() {
            try {
                const ctx = this._ensureCtx();
                const bus = this._getBus(ctx);
                const out = bus ? bus.input : ctx.destination;
                const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = ctx.currentTime + idx * 0.08;
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.25, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                    osc.connect(gain).connect(out);
                    osc.start(t);
                    osc.stop(t + 0.19);
                });
            } catch (_) {}
        }
    }


    /* =========================================================
     * 2. ШИНА ВВОДА КЛЮЧА И ДЕКОДЕР РИТМА (1:3:1 CRIT CHECK)
     * ========================================================= */
    class MorseInputBus {
        constructor({ wpm = 18, audio, onDitDah, onLetter, onBufferChange }) {
            this.wpm = wpm;
            this.unit = 1200 / wpm;
            this.audio = audio;
            this.onDitDah = onDitDah;
            this.onLetter = onLetter;
            this.onBufferChange = onBufferChange;

            this.isDown = false;
            this.downTime = 0;
            this.lastUpTime = 0;
            this.currentBuffer = '';
            this.durations = [];
            this.pauseDurations = [];
            this.letterTimer = null;

            // Web Serial
            this.port = null;
            this.reader = null;
            this.keepReading = false;
            this.incomingSerialBuffer = '';

            this._bindKeyboard();
        }

        setWpm(wpm) {
            this.wpm = Math.max(8, Math.min(45, wpm));
            this.unit = 1200 / this.wpm;
        }

        keyPressDown() {
            if (this.isDown) return;
            this.isDown = true;
            clearTimeout(this.letterTimer);
            this.downTime = performance.now();

            if (this.lastUpTime > 0) {
                const pause = this.downTime - this.lastUpTime;
                this.pauseDurations.push(pause);
            }

            // Тактильный виброотклик (Mobile Haptics)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(16); } catch (_) {}
            }

            this.audio.startKeyTone();
        }

        keyPressUp() {
            if (!this.isDown) return;
            this.isDown = false;
            this.lastUpTime = performance.now();
            const duration = this.lastUpTime - this.downTime;

            this.audio.stopKeyTone();

            // Порог точка/тире: 2.0 T_dit
            const symbol = duration < this.unit * 2 ? '.' : '-';
            this.currentBuffer += symbol;
            this.durations.push({ symbol, duration });

            this.onDitDah?.(symbol, duration);
            this.onBufferChange?.(this.currentBuffer);

            // Таймаут завершения знака (2.5 T_dit)
            clearTimeout(this.letterTimer);
            this.letterTimer = setTimeout(() => {
                this._finalizeLetter();
            }, this.unit * 2.5);
        }

        _finalizeLetter() {
            if (!this.currentBuffer) return;
            const code = this.currentBuffer;
            const char = (typeof MORSE_TO_CHAR !== 'undefined') ? MORSE_TO_CHAR[code] : null;

            // Расчёт идеального ритма (1:3:1)
            const isCritical = this._evaluateRhythm();

            this.onLetter?.(char || '?', code, isCritical);
            this.currentBuffer = '';
            this.durations = [];
            this.pauseDurations = [];
            this.onBufferChange?.('');
        }

        _evaluateRhythm() {
            if (this.durations.length === 0) return false;

            // Проверка длительности точек и тире
            const elementsOk = this.durations.every(({ symbol, duration }) => {
                const ratio = duration / this.unit;
                return symbol === '.' 
                    ? (ratio >= 0.72 && ratio <= 1.38) 
                    : (ratio >= 2.25 && ratio <= 3.75);
            });

            // Проверка межэлементных пауз
            const pausesOk = this.pauseDurations.every(pause => {
                const ratio = pause / this.unit;
                return ratio >= 0.55 && ratio <= 1.65;
            });

            return elementsOk && pausesOk;
        }

        _bindKeyboard() {
            this._onKeyDown = (e) => {
                if (e.code !== 'Space' || e.repeat) return;
                const tag = document.activeElement?.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                this.keyPressDown();
                const pad = document.getElementById('touch-key-paddle');
                if (pad) pad.classList.add('pressed');
            };

            this._onKeyUp = (e) => {
                if (e.code !== 'Space') return;
                const tag = document.activeElement?.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA') return;
                e.preventDefault();
                this.keyPressUp();
                const pad = document.getElementById('touch-key-paddle');
                if (pad) pad.classList.remove('pressed');
            };

            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
        }

        /* --- WebSerial интеграция с MorseWave Pro (115200 бод) --- */
        async connectSerial(onStatusChange) {
            if (!('serial' in navigator)) {
                throw new Error(
                    (window.MW_LANG === 'en')
                        ? 'WebSerial is not supported in this browser. Please use Chrome, Edge, or Opera.'
                        : 'WebSerial не поддерживается данным браузером. Используйте Chrome, Яндекс.Браузер или Edge.'
                );
            }

            try {
                this.port = await navigator.serial.requestPort();
                await this.port.open({ baudRate: 115200 });
                this.keepReading = true;

                onStatusChange?.(true);

                const textDecoder = new TextDecoderStream();
                this.port.readable.pipeTo(textDecoder.writable);
                this.reader = textDecoder.readable.getReader();

                this._readSerialStream();
                return true;
            } catch (err) {
                console.warn('WebSerial error:', err);
                this.disconnectSerial(onStatusChange);
                throw err;
            }
        }

        async _readSerialStream() {
            try {
                while (this.keepReading) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    if (value) this._parseSerialChunk(value);
                }
            } catch (e) {
                console.warn('Serial read loop ended:', e);
            }
        }

        _parseSerialChunk(chunk) {
            this.incomingSerialBuffer += chunk;

            // 1. Посимвольный разбор точек и тире для звукового отклика
            for (let i = 0; i < chunk.length; i++) {
                const ch = chunk[i];
                if (ch === '.') {
                    this.audio.playBeamShot(false);
                } else if (ch === '-') {
                    this.audio.playBeamShot(false);
                }
            }

            // 2. Обработка сервисных меток [SPEED] WPM
            const speedMatch = this.incomingSerialBuffer.match(/\[SPEED\]\s*(\d+)\s*WPM/i);
            if (speedMatch) {
                const hwWpm = parseInt(speedMatch[1], 10);
                if (hwWpm >= 8 && hwWpm <= 45) {
                    this.setWpm(hwWpm);
                    const slider = document.getElementById('invaders-wpm-slider');
                    const valEl = document.getElementById('invaders-wpm-val');
                    if (slider) slider.value = hwWpm;
                    if (valEl) valEl.textContent = hwWpm;
                }
            }

            // 3. Выделение декодированных букв [A], [9], [=], [<SK>] и т.д.
            let openIdx = this.incomingSerialBuffer.indexOf('[');
            let closeIdx = this.incomingSerialBuffer.indexOf(']', openIdx);

            while (openIdx !== -1 && closeIdx !== -1) {
                const token = this.incomingSerialBuffer.substring(openIdx + 1, closeIdx).trim();
                this.incomingSerialBuffer = this.incomingSerialBuffer.substring(closeIdx + 1);

                if (!token.includes('>') && !token.startsWith('SPEED') && !token.startsWith('TONE') && token.length > 0) {
                    // Аппаратный электронный кейер выдаёт эталонный Iambic ритм
                    this.onLetter?.(token, '', true);
                }

                openIdx = this.incomingSerialBuffer.indexOf('[');
                closeIdx = this.incomingSerialBuffer.indexOf(']', openIdx);
            }

            if (this.incomingSerialBuffer.length > 128) {
                this.incomingSerialBuffer = this.incomingSerialBuffer.substring(this.incomingSerialBuffer.length - 32);
            }
        }

        disconnectSerial(onStatusChange) {
            this.keepReading = false;
            try { this.reader?.cancel(); } catch (_) {}
            try { this.port?.close(); } catch (_) {}
            this.port = null;
            this.reader = null;
            onStatusChange?.(false);
        }

        destroy() {
            window.removeEventListener('keydown', this._onKeyDown);
            window.removeEventListener('keyup', this._onKeyUp);
            clearTimeout(this.letterTimer);
            this.disconnectSerial();
        }
    }


    /* =========================================================
     * 3. 60 FPS HTML5 CANVAS CRT ДВИЖОК
     * ========================================================= */
    class InvadersEngine {
        constructor(canvas, { audio, onScoreChange, onWaveChange, onGameOver, onDamage }) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.audio = audio;
            this.onScoreChange = onScoreChange;
            this.onWaveChange = onWaveChange;
            this.onGameOver = onGameOver;
            this.onDamage = onDamage;

            this.targets = [];
            this.beams = [];
            this.particles = [];
            this.shockwaves = [];
            this.floatingTexts = [];

            this.radarAngle = 0;
            this.baseHp = 100;
            this.score = 0;
            this.combo = 0;
            this.bestCombo = 0;
            this.critCount = 0;
            this.wave = 1;
            this.totalKills = 0;
            this.waveTransitioning = false;

            this.isRunning = false;
            this.lastTime = performance.now();
            this.glitchTimer = 0;
            this.waveTransitioning = false;

            this._resize();
            window.addEventListener('resize', () => this._resize());
        }

        _resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.resetTransform?.();
            this.ctx.scale(dpr, dpr);
            this.width = rect.width;
            this.height = rect.height;
        }

        start() {
            this.isRunning = true;
            this.lastTime = performance.now();
            this._loop(this.lastTime);
        }

        stop() {
            this.isRunning = false;
        }

        resetGame() {
            this.baseHp = 100;
            this.score = 0;
            this.combo = 0;
            this.bestCombo = 0;
            this.critCount = 0;
            this.wave = 1;
            this.totalKills = 0;
            this.targets = [];
            this.beams = [];
            this.particles = [];
            this.shockwaves = [];
            this.floatingTexts = [];
            this.spawnWave(1);
            this.onScoreChange?.({
                score: this.score,
                combo: this.combo,
                hp: this.baseHp,
                critCount: this.critCount
            });
            this.onWaveChange?.(this.wave, false);
        }

        spawnWave(waveNum) {
            this.targets = [];
            this.wave = waveNum;
            this.waveTransitioning = false;

            // Наборы символов по прогрессии
            const POOL_EASY = ['E', 'T', 'A', 'N', 'M', 'I', 'S', 'O', 'R', 'D'];
            const POOL_FULL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const POOL_NUMS = '0123456789'.split('');
            const BOSS_CALLSIGNS = ['R9OGL', 'UA9O', 'W1AW', 'SOS', 'QRM', 'QTH', '73', 'SK'];

            const isBossWave = (waveNum % 3 === 0);

            if (isBossWave) {
                // Босс: Тяжёлый разведывательный корабль со связкой символов
                const callsign = BOSS_CALLSIGNS[Math.floor(Math.random() * BOSS_CALLSIGNS.length)];
                this.targets.push({
                    id: 'boss_' + Date.now(),
                    type: 'boss',
                    chain: callsign.split(''),
                    currentIndex: 0,
                    x: this.width / 2,
                    y: -40,
                    speed: 12 + waveNum * 2,
                    alive: true,
                    size: 34
                });
            } else {
                // Обычная волна дронов и помех
                let pool = POOL_EASY;
                if (waveNum >= 2) pool = POOL_FULL;
                if (waveNum >= 4) pool = POOL_FULL.concat(POOL_NUMS);

                const count = 4 + Math.min(10, waveNum * 2);
                for (let i = 0; i < count; i++) {
                    const char = pool[Math.floor(Math.random() * pool.length)];
                    const isJammer = (waveNum >= 3 && i % 3 === 0);

                    this.targets.push({
                        id: 'tgt_' + i + '_' + Date.now(),
                        type: isJammer ? 'jammer' : 'drone',
                        char,
                        x: 50 + Math.random() * (this.width - 100),
                        y: -30 - (i * 65),
                        initialX: 50 + Math.random() * (this.width - 100),
                        freq: 1.5 + Math.random() * 2,
                        speed: 18 + waveNum * 3.5,
                        alive: true,
                        size: 20
                    });
                }
            }
        }

        handleInputChar(char, isCritical) {
            if (!this.isRunning || this.baseHp <= 0) return;

            const baseOrigin = { x: this.width / 2, y: this.height - 30 };
            let hitTarget = null;

            // 1. Проверяем, есть ли босс со связкой
            const boss = this.targets.find(t => t.alive && t.type === 'boss');
            if (boss) {
                const targetChar = boss.chain[boss.currentIndex];
                if (targetChar === char) {
                    hitTarget = boss;
                    boss.currentIndex++;
                    const isDestroyed = (boss.currentIndex >= boss.chain.length);
                    if (isDestroyed) boss.alive = false;

                    this._onTargetHit(boss, char, isCritical, isDestroyed);
                    return;
                }
            }

            // 2. Ищем обычную цель, ближайшую к земле с данным символом
            if (!hitTarget) {
                let lowestY = -Infinity;
                for (const t of this.targets) {
                    if (t.alive && t.type !== 'boss' && t.char === char && t.y > lowestY) {
                        lowestY = t.y;
                        hitTarget = t;
                    }
                }
            }

            if (hitTarget) {
                hitTarget.alive = false;
                this._onTargetHit(hitTarget, char, isCritical, true);
            } else {
                // Ошибка в знаке — срыв комбо и помеха
                this.combo = 0;
                this.glitchTimer = 0.22;
                this.audio.playErrorGlitch();
                this._showFloatingText(baseOrigin.x, baseOrigin.y - 40, 'MISS!', '#ef4444');
                this.onScoreChange?.({
                    score: this.score,
                    combo: this.combo,
                    hp: this.baseHp,
                    critCount: this.critCount
                });
            }
        }

        _onTargetHit(target, char, isCritical, isFullKill) {
            const baseOrigin = { x: this.width / 2, y: this.height - 30 };
            this.combo++;
            if (this.combo > this.bestCombo) this.bestCombo = this.combo;
            if (isCritical) this.critCount++;

            const multiplier = isCritical ? 2 : 1;
            const points = (15 + this.combo * 5) * multiplier;
            this.score += points;

            // Виброотклик при крите
            if (isCritical && typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate([25, 20, 25]); } catch (_) {}
            }

            // Трассер выстрела из антенны
            this.beams.push({
                x1: baseOrigin.x,
                y1: baseOrigin.y,
                x2: target.x,
                y2: target.y,
                alpha: 1.0,
                isCritical
            });

            this.audio.playBeamShot(isCritical);

            if (isFullKill) {
                this.totalKills++;
                this.audio.playExplosion(isCritical);
                this._spawnExplosion(target.x, target.y, isCritical);
                this._triggerShockwave(target.x, target.y, isCritical);
            }

            const label = isCritical ? `CRIT +${points}` : `+${points}`;
            this._showFloatingText(target.x, target.y - 15, label, isCritical ? '#38bdf8' : '#00ff66');

            // Вспышка на экране
            if (isCritical) {
                const flash = document.getElementById('invaders-crit-flash');
                if (flash) {
                    flash.classList.add('active');
                    setTimeout(() => flash.classList.remove('active'), 120);
                }
            }

            this.onScoreChange?.({
                score: this.score,
                combo: this.combo,
                hp: this.baseHp,
                critCount: this.critCount
            });

            // Проверка завершения волны
            this._checkWaveCompletion();
        }

        _checkWaveCompletion() {
            if (this.waveTransitioning || this.baseHp <= 0) return;
            if (this.targets.length > 0 && this.targets.every(t => !t.alive)) {
                this.waveTransitioning = true;
                this.audio.playWaveClear();
                this._showFloatingText(this.width / 2, this.height / 2 - 30, 'SECTOR CLEARED!', '#38bdf8');
                setTimeout(() => {
                    if (this.baseHp <= 0) {
                        this.waveTransitioning = false;
                        return;
                    }
                    this.wave++;
                    const isBoss = (this.wave % 3 === 0);
                    this.onWaveChange?.(this.wave, isBoss);
                    this.spawnWave(this.wave);
                    this.waveTransitioning = false;
                }, 1600);
            }
        }

        _spawnExplosion(x, y, isCritical) {
            const count = isCritical ? 28 : 16;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 40 + Math.random() * 110;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    life: 1.0,
                    decay: 1.8 + Math.random() * 1.5,
                    color: isCritical ? '#38bdf8' : '#00ff66',
                    size: 1.5 + Math.random() * 2.5
                });
            }
        }

        _triggerShockwave(x, y, isCritical) {
            this.shockwaves.push({
                x, y,
                r: 10,
                maxR: isCritical ? 70 : 45,
                alpha: 1.0,
                color: isCritical ? 'rgba(56, 189, 248, ' : 'rgba(0, 255, 102, '
            });
        }

        _showFloatingText(x, y, text, color) {
            this.floatingTexts.push({
                x, y, text, color,
                alpha: 1.0,
                vy: -35
            });
        }

        _loop(now) {
            if (!this.isRunning) return;
            const dt = Math.min((now - this.lastTime) / 1000, 0.1);
            this.lastTime = now;

            this._update(dt);
            this._render();

            requestAnimationFrame(t => this._loop(t));
        }

        _update(dt) {
            // Помеха
            if (this.glitchTimer > 0) {
                this.glitchTimer -= dt;
                const overlay = document.getElementById('invaders-glitch-overlay');
                if (overlay) overlay.classList.toggle('active', this.glitchTimer > 0);
            }

            // Движение целей
            for (const t of this.targets) {
                if (!t.alive) continue;

                t.y += t.speed * dt;
                if (t.type === 'jammer') {
                    t.x = t.initialX + Math.sin(t.y * 0.05 * t.freq) * 35;
                }

                // Достижение базы (прорыв обороны)
                if (t.y >= this.height - 35) {
                    t.alive = false;
                    const dmg = (t.type === 'boss') ? 35 : 15;
                    this.baseHp = Math.max(0, this.baseHp - dmg);
                    this.combo = 0;
                    this.audio.playExplosion(false);
                    this._spawnExplosion(t.x, this.height - 35, false);

                    this.onDamage?.(dmg);
                    this.onScoreChange?.({
                        score: this.score,
                        combo: this.combo,
                        hp: this.baseHp,
                        critCount: this.critCount
                    });

                    if (this.baseHp <= 0) {
                        this.stop();
                        this.onGameOver?.({
                            score: this.score,
                            wave: this.wave,
                            crits: this.critCount,
                            kills: this.totalKills
                        });
                        return;
                    }
                }
            }

            // Если все цели волны сбиты или упали на базу (но база ещё жива) — переходим к новой волне
            this._checkWaveCompletion();

            // Затухание лучей
            for (let i = this.beams.length - 1; i >= 0; i--) {
                this.beams[i].alpha -= dt * 4.0;
                if (this.beams[i].alpha <= 0) this.beams.splice(i, 1);
            }

            // Частицы
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= p.decay * dt;
                if (p.life <= 0) this.particles.splice(i, 1);
            }

            // Ударные кольца
            for (let i = this.shockwaves.length - 1; i >= 0; i--) {
                const sw = this.shockwaves[i];
                sw.r += dt * 90;
                sw.alpha = 1 - (sw.r / sw.maxR);
                if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
            }

            // Всплывающие надписи
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy * dt;
                ft.alpha -= dt * 1.5;
                if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
            }

            // Вращение радара
            this.radarAngle = (this.radarAngle + dt * 1.2) % (Math.PI * 2);
        }

        _render() {
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;

            // 1. Фосфорное послесвечение (CRT Persistence)
            ctx.fillStyle = 'rgba(7, 11, 9, 0.22)';
            ctx.fillRect(0, 0, w, h);

            // 2. Радарная координатная сетка ПВО
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
            ctx.lineWidth = 1;
            const cx = w / 2;
            const cy = h - 30;

            // Дальномерные дуги
            [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
                const r = (h - 60) * ratio;
                ctx.beginPath();
                ctx.arc(cx, cy, r, Math.PI, 0);
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 255, 102, 0.25)';
                ctx.font = '9px "JetBrains Mono", monospace';
                ctx.fillText(`${(idx + 1) * 25}KM`, cx + r - 28, cy - 4);
            });

            // Азимутальные лучи
            for (let angle = Math.PI; angle <= Math.PI * 2; angle += Math.PI / 4) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * (h - 60), cy + Math.sin(angle) * (h - 60));
                ctx.stroke();
            }

            // Вращающийся луч развертки радара
            const sweepR = h - 60;
            const sweepX = cx + Math.cos(this.radarAngle) * sweepR;
            const sweepY = cy + Math.sin(this.radarAngle) * sweepR;
            if (sweepY <= cy) {
                const grad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
                grad.addColorStop(0, 'rgba(0, 255, 102, 0.35)');
                grad.addColorStop(1, 'rgba(0, 255, 102, 0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(sweepX, sweepY);
                ctx.stroke();
            }

            // 3. Вражеские цели (Векторные дроны, мины, боссы)
            for (const t of this.targets) {
                if (!t.alive) continue;

                if (t.type === 'boss') {
                    // Босс — тяжелый корабль-носитель позывного
                    ctx.strokeStyle = '#38bdf8';
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 10;
                    ctx.lineWidth = 2;

                    // Корпус босса
                    ctx.beginPath();
                    ctx.moveTo(t.x - 30, t.y - 12);
                    ctx.lineTo(t.x + 30, t.y - 12);
                    ctx.lineTo(t.x, t.y + 16);
                    ctx.closePath();
                    ctx.stroke();

                    // Цепочка букв босса
                    ctx.font = 'bold 13px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    const doneStr = t.chain.slice(0, t.currentIndex).join('');
                    const remainStr = t.chain.slice(t.currentIndex).join('');

                    ctx.fillStyle = '#00ff66';
                    ctx.fillText(doneStr, t.x - 12, t.y - 20);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillText(remainStr, t.x + 12, t.y - 20);
                    ctx.shadowBlur = 0;
                } else if (t.type === 'jammer') {
                    // Радиопомеха / ЭМИ-мина (пульсирующая синусоида)
                    ctx.strokeStyle = '#ffb000';
                    ctx.shadowColor = '#ffb000';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = 1.5;

                    ctx.beginPath();
                    for (let xOff = -15; xOff <= 15; xOff += 3) {
                        const yOff = Math.sin((performance.now() * 0.01) + xOff * 0.4) * 6;
                        if (xOff === -15) ctx.moveTo(t.x + xOff, t.y + yOff);
                        else ctx.lineTo(t.x + xOff, t.y + yOff);
                    }
                    ctx.stroke();

                    ctx.fillStyle = '#ffb000';
                    ctx.font = 'bold 15px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(t.char, t.x, t.y - 14);
                    ctx.shadowBlur = 0;
                } else {
                    // Обычный дрон-разведчик (векторный ромб)
                    ctx.strokeStyle = '#00ff66';
                    ctx.shadowColor = '#00ff66';
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = 1.5;

                    ctx.beginPath();
                    ctx.moveTo(t.x, t.y - 14);
                    ctx.lineTo(t.x + 14, t.y);
                    ctx.lineTo(t.x, t.y + 14);
                    ctx.lineTo(t.x - 14, t.y);
                    ctx.closePath();
                    ctx.stroke();

                    // Символ внутри
                    ctx.fillStyle = '#d0ffe0';
                    ctx.font = 'bold 14px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(t.char, t.x, t.y);
                    ctx.shadowBlur = 0;
                }
            }

            // 4. Трассеры ПВО
            for (const b of this.beams) {
                ctx.strokeStyle = b.isCritical 
                    ? `rgba(56, 189, 248, ${b.alpha})` 
                    : `rgba(0, 255, 102, ${b.alpha})`;
                ctx.lineWidth = b.isCritical ? 3.5 : 2;
                ctx.shadowColor = b.isCritical ? '#38bdf8' : '#00ff66';
                ctx.shadowBlur = b.isCritical ? 14 : 8;

                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1);
                ctx.lineTo(b.x2, b.y2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // 5. Ударные кольца
            for (const sw of this.shockwaves) {
                ctx.strokeStyle = `${sw.color}${sw.alpha})`;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 6. Частицы взрывов
            for (const p of this.particles) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }

            // 7. Всплывающие надписи очков
            ctx.textAlign = 'center';
            for (const ft of this.floatingTexts) {
                ctx.fillStyle = ft.color;
                ctx.font = 'bold 13px "JetBrains Mono", monospace';
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.fillText(ft.text, ft.x, ft.y);
            }
            ctx.globalAlpha = 1.0;

            // 8. Базовый антенный комплекс на земле
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 16, cy + 10);
            ctx.lineTo(cx + 16, cy + 10);
            ctx.moveTo(cx, cy + 10);
            ctx.lineTo(cx, cy);
            ctx.stroke();

            ctx.fillStyle = '#00ff66';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }


    /* =========================================================
     * 4. ИНИЦИАЛИЗАЦИЯ И СВЯЗЫВАНИЕ UI
     * ========================================================= */
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('invaders-radar-canvas');
        if (!canvas) return;

        const screenBezel = document.getElementById('invaders-screen-bezel');
        const touchPad = document.getElementById('touch-key-paddle');
        const btnSerial = document.getElementById('btn-serial-connect');
        const proBadge = document.getElementById('invaders-pro-badge');
        const tacticalBanner = document.getElementById('invaders-tactical-banner');
        const tacticalTitle = document.getElementById('tactical-banner-title');
        const tacticalSub = document.getElementById('tactical-banner-sub');

        const btnStart = document.getElementById('btn-start-game');
        const btnRestart = document.getElementById('btn-debrief-restart');
        const overlayStart = document.getElementById('invaders-start-overlay');
        const overlayDebrief = document.getElementById('invaders-debrief-overlay');

        const hudHp = document.getElementById('hud-hp-val');
        const hudHpTile = document.getElementById('hud-hp-tile');
        const hudWave = document.getElementById('hud-wave-val');
        const hudWaveTile = document.getElementById('hud-wave-tile');
        const hudScore = document.getElementById('hud-score-val');
        const hudScoreTile = document.getElementById('hud-score-tile');
        const hudCombo = document.getElementById('hud-combo-val');
        const hudComboTile = document.getElementById('hud-combo-tile');
        const hudCrit = document.getElementById('hud-crit-val');
        const hudCritTile = document.getElementById('hud-crit-tile');

        const debriefScore = document.getElementById('debrief-score-val');
        const debriefWave = document.getElementById('debrief-wave-val');
        const debriefCrits = document.getElementById('debrief-crits-val');
        const debriefXp = document.getElementById('debrief-xp-val');

        const wpmSlider = document.getElementById('invaders-wpm-slider');
        const wpmVal = document.getElementById('invaders-wpm-val');
        const bufferDisplay = document.getElementById('invaders-buffer-display');

        const audio = new InvadersAudio();

        // Функция всплывающего тактического баннера
        let bannerTimer = null;
        function showTacticalBanner(title, sub, duration = 3200) {
            if (!tacticalBanner || !tacticalTitle || !tacticalSub) return;
            tacticalTitle.textContent = title;
            tacticalSub.textContent = sub;
            tacticalBanner.classList.remove('hidden');

            clearTimeout(bannerTimer);
            bannerTimer = setTimeout(() => {
                tacticalBanner.classList.add('hidden');
            }, duration);
        }

        // Анимация числа (Number pop)
        function triggerNumberPop(tile) {
            if (!tile) return;
            tile.classList.remove('hud-pop');
            void tile.offsetWidth; // reflow
            tile.classList.add('hud-pop');
        }

        // Плавный счётчик для окна результатов
        function animateCounter(el, start, end, duration, prefix = '', suffix = '') {
            if (!el) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                el.textContent = `${prefix}${Math.floor(start + (end - start) * ease)}${suffix}`;
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }

        const engine = new InvadersEngine(canvas, {
            audio,
            onDamage: (dmg) => {
                if (screenBezel) {
                    screenBezel.classList.remove('screen-shake');
                    void screenBezel.offsetWidth;
                    screenBezel.classList.add('screen-shake');
                    setTimeout(() => screenBezel.classList.remove('screen-shake'), 320);
                }
            },
            onScoreChange: ({ score, combo, hp, critCount }) => {
                if (hudScore) hudScore.textContent = score;
                if (hudCombo) hudCombo.textContent = `${combo}x`;
                if (hudCrit) hudCrit.textContent = critCount;
                if (hudHp) hudHp.textContent = `${hp}%`;

                if (hudScoreTile) triggerNumberPop(hudScoreTile);
                if (combo > 0 && hudComboTile) {
                    triggerNumberPop(hudComboTile);
                    hudComboTile.classList.toggle('active-combo', combo >= 3);
                }
                if (critCount > 0 && hudCritTile) triggerNumberPop(hudCritTile);
                if (hudHpTile) hudHpTile.classList.toggle('danger', hp <= 30);
            },
            onWaveChange: (wave, isBoss) => {
                if (hudWave) hudWave.textContent = wave;
                if (hudWaveTile) triggerNumberPop(hudWaveTile);

                if (isBoss) {
                    showTacticalBanner(
                        '⚠️ ТРЕВОГА // ТЯЖЁЛЫЙ КОРАБЛЬ-ПЕРЕХВАТЧИК',
                        'ВНИМАНИЕ: СВЯЗКА ПОЗЫВНОГО В ЭФИРЕ! ОТБЕЙТЕ ЗНАКИ СЛИТНО'
                    );
                } else if (wave === 1) {
                    showTacticalBanner(
                        'WAVE 1 // СЕКТОР АКТИВИРОВАН',
                        'ОТБИВАЙТЕ ЗНАКИ НА КЛЮЧЕ ИЛИ ПРОБЕЛЕ'
                    );
                } else if (wave === 2) {
                    showTacticalBanner(
                        'WAVE 2 // ПОЛНЫЙ АЛФАВИТ',
                        'СКОРОСТЬ ПАДЕНИЯ ЦЕЛЕЙ УВЕЛИЧЕНА'
                    );
                } else if (wave === 3) {
                    showTacticalBanner(
                        'WAVE 3 // ВНИМАНИЕ: ЭМИ-ПОМЕХИ',
                        'ОТБИВАЙТЕ РАДИОЛОКАЦИОННЫЕ ЦЕЛИ'
                    );
                } else {
                    showTacticalBanner(
                        `WAVE ${wave} // ПРЕДЕЛ СКОРОСТИ ЭФИРА`,
                        'ДЛЯ МАКСИМАЛЬНОЙ СКОРОСТИ ПОДКЛЮЧИТЕ КЛЮЧ MORSEWAVE PRO'
                    );
                }
            },
            onGameOver: ({ score, wave, crits, kills }) => {
                // Расчёт XP по строгому правилу CLAUDE.md (целое число Math.round, анти-фарм)
                const earnedXp = Math.max(1, Math.round(score / 12));
                if (typeof Progress !== 'undefined') {
                    Progress.addXp(earnedXp);
                    Progress.logXp(earnedXp, 'invaders2', { wave, score, crits, kills });
                }

                if (overlayDebrief) {
                    overlayDebrief.classList.remove('hidden');
                    // Анимированное заполнение итогов
                    animateCounter(debriefScore, 0, score, 800);
                    animateCounter(debriefWave, 0, wave, 600);
                    animateCounter(debriefCrits, 0, crits, 600);
                    animateCounter(debriefXp, 0, earnedXp, 900, '+', ' XP');
                }
            }
        });

        const inputBus = new MorseInputBus({
            wpm: parseInt(wpmSlider ? wpmSlider.value : 18, 10),
            audio,
            onDitDah: (sym, dur) => {
                // Живой отклик при передаче
            },
            onBufferChange: (buf) => {
                if (bufferDisplay) {
                    bufferDisplay.textContent = buf ? `KEY: ${buf}` : 'READY';
                }
            },
            onLetter: (char, code, isCritical) => {
                engine.handleInputChar(char, isCritical);
            }
        });

        // WPM ползунок
        if (wpmSlider && wpmVal) {
            wpmSlider.addEventListener('input', () => {
                const w = parseInt(wpmSlider.value, 10);
                wpmVal.textContent = w;
                inputBus.setWpm(w);
            });
        }

        // Экранный манипулятор (Touch Paddle с 3D-механикой)
        if (touchPad) {
            const onDown = (e) => {
                e.preventDefault();
                inputBus.keyPressDown();
                touchPad.classList.add('pressed');
            };
            const onUp = (e) => {
                e.preventDefault();
                inputBus.keyPressUp();
                touchPad.classList.remove('pressed');
            };

            touchPad.addEventListener('pointerdown', onDown);
            touchPad.addEventListener('pointerup', onUp);
            touchPad.addEventListener('pointercancel', onUp);
            touchPad.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        // Кнопка подключения аппаратного ключа по USB (115200 бод)
        if (btnSerial) {
            btnSerial.addEventListener('click', async () => {
                if (inputBus.port) {
                    inputBus.disconnectSerial((active) => {
                        btnSerial.textContent = (window.MW_LANG === 'en') ? '⚡ Connect MorseWave Pro' : '⚡ Подключить MorseWave Pro';
                        btnSerial.classList.remove('connected');
                        if (proBadge) proBadge.classList.add('hidden');
                    });
                } else {
                    try {
                        await inputBus.connectSerial((active) => {
                            btnSerial.textContent = (window.MW_LANG === 'en') ? '● CONNECTED (115200)' : '● НА СВЯЗИ (115200)';
                            btnSerial.classList.add('connected');
                            if (proBadge) proBadge.classList.remove('hidden');

                            showTacticalBanner(
                                '⚡ MORSEWAVE PRO НА СВЯЗИ (115200)',
                                'АППАРАТНЫЙ IAMBIC B ЛАТЧ АКТИВИРОВАН // СКОРОСТЬ СИНХРОНИЗИРОВАНА'
                            );
                        });
                    } catch (err) {
                        alert(err.message || String(err));
                    }
                }
            });
        }

        // Старт игры (с эффектом включения CRT)
        function triggerStart() {
            if (screenBezel) {
                screenBezel.classList.remove('crt-turn-on');
                void screenBezel.offsetWidth;
                screenBezel.classList.add('crt-turn-on');
            }
            engine.resetGame();
            engine.start();
        }

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                if (overlayStart) overlayStart.classList.add('hidden');
                triggerStart();
            });
        }

        // Рестарт из окна дебрифинга
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                if (overlayDebrief) overlayDebrief.classList.add('hidden');
                triggerStart();
            });
        }

        // Остановка при уходе со вкладки (CLAUDE.md)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                engine.stop();
                audio.stopKeyTone();
            } else if (engine.baseHp > 0 && overlayStart.classList.contains('hidden') && overlayDebrief.classList.contains('hidden')) {
                engine.start();
            }
        });
    });
})();

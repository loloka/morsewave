/**
 * Единый на весь сайт AudioContext. Раньше каждый new MorseAudio() /
 * TelegraphKey создавал СВОЙ AudioContext — при долгой тренировке (сотни
 * проигрываний, например в "Приёме на слух") браузер упирался в лимит на
 * число одновременно живых контекстов и начинал молча ронять создание
 * нового с ошибкой. Эта ошибка происходила внутри await, ловилась некому,
 * и флаг "занято" (recBusy/isPlaying) навсегда оставался true — тренировка
 * зависала на случайной букве без звука и без реакции на нажатия.
 */
function getSharedAudioContext() {
    if (!window.__morseSharedAudioCtx) {
        window.__morseSharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.__morseSharedAudioCtx.state === 'suspended') {
        window.__morseSharedAudioCtx.resume();
    }
    return window.__morseSharedAudioCtx;
}

/**
 * MorseAudioBus — мастер-шина вывода звука с поддержкой псевдостерео.
 * Если псевдостерео включено, добавляет микрозадержку Хааса (~9 мс) в правый канал,
 * создавая комфортный объёмный звук в наушниках и снимая утомление слуха.
 */
class MorseAudioBus {
    constructor(ctx) {
        this.ctx = ctx;

        this.input = ctx.createGain();
        this.input.gain.value = 1.0;

        // Блок псевдостерео (бинауральная микрозадержка Хааса ~9 мс)
        this.splitter = ctx.createChannelSplitter(2);
        this.merger = ctx.createChannelMerger(2);

        this.leftGain = ctx.createGain();
        this.leftGain.gain.value = 1.0;

        this.delayRight = ctx.createDelay();
        this.delayRight.delayTime.value = 0.009; // 9 мс задержка Хааса для правого уха
        this.rightGain = ctx.createGain();
        this.rightGain.gain.value = 1.0;

        // Переключатели режимов Стерео / Моно
        this.stereoBus = ctx.createGain();
        this.monoBus = ctx.createGain();

        // Мастер-выход
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 1.0;

        this._connect();
        this._initKeepAlive();
        this._initNoise();
        this.configure();
    }

    _connect() {
        // Моно тракт: напрямую в masterGain
        this.input.connect(this.monoBus);
        this.monoBus.connect(this.masterGain);

        // Стерео тракт (псевдостерео):
        this.input.connect(this.splitter);
        // Левый канал: напрямую
        this.splitter.connect(this.leftGain, 0);
        this.leftGain.connect(this.merger, 0, 0);

        // Правый канал: задержка 9 мс
        this.splitter.connect(this.delayRight, 0);
        this.delayRight.connect(this.rightGain);
        this.rightGain.connect(this.merger, 0, 1);

        this.merger.connect(this.stereoBus);
        this.stereoBus.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * Постоянный неслышимый keep-alive поток (микробуфер тишины).
     * Предотвращает засыпание питания ЦАП/усилителя звуковой карты (sleep/wake DAC pop)
     * на мобильных устройствах и ПК (Realtek) между знаками и паузами.
     */
    _initKeepAlive() {
        try {
            const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            const keepGain = this.ctx.createGain();
            keepGain.gain.value = 0.00001; // -100 дБ, физически неслышимо
            source.connect(keepGain).connect(this.masterGain);
            source.start();
            this._keepAliveSource = source;
        } catch (_) {}
    }

    /**
     * Генератор реалистичного атмосферного КВ-эфира (CW Noise).
     * Мягкий розово-полосовой шум связного приёмника (полоса 300–2600 Гц).
     */
    _initNoise() {
        try {
            const sampleRate = this.ctx.sampleRate;
            const bufferSize = sampleRate * 4;
            const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99 * b0 + white * 0.05;
                b1 = 0.96 * b1 + white * 0.10;
                b2 = 0.86 * b2 + white * 0.25;
                data[i] = (b0 + b1 + b2) * 0.25;
            }

            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = buffer;
            noiseSource.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 750;
            filter.Q.value = 0.85;

            this.noiseGain = this.ctx.createGain();
            this.noiseGain.gain.value = 0;

            noiseSource.connect(filter).connect(this.noiseGain).connect(this.masterGain);
            noiseSource.start();
            this._noiseSource = noiseSource;
        } catch (_) {}
    }

    setNoiseLevel(level) {
        if (!this.noiseGain) return;
        const now = this.ctx.currentTime;
        const target = Math.max(0, Math.min(0.2, Number(level) || 0));
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setTargetAtTime(target, now, 0.05);
    }

    startNoise() {
        if (!this.noiseGain) return;
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { noiseLevel: 0 };
        const level = this.configuredNoiseLevel ?? settings.noiseLevel ?? 0;
        this.setNoiseLevel(level);
    }

    stopNoise(force = false) {
        if (!this.noiseGain) return;
        if (this._sessionNoiseActive && !force) return;
        this.setNoiseLevel(0);
    }

    startSessionNoise() {
        this._sessionNoiseActive = true;
        if (this.ctx && this.ctx.state === 'suspended') {
            try { this.ctx.resume(); } catch (_) {}
        }
        this.configure();
        this.startNoise();
    }

    stopSessionNoise() {
        this._sessionNoiseActive = false;
        this.stopNoise(true);
    }

    isSessionNoiseActive() {
        return !!this._sessionNoiseActive;
    }

    configure(overrides = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { pseudoStereo: true, noiseLevel: 0 };
        const pseudoStereo = overrides.pseudoStereo ?? settings.pseudoStereo ?? true;
        this.configuredNoiseLevel = overrides.noiseLevel ?? settings.noiseLevel ?? 0;
        const now = this.ctx.currentTime;

        if (pseudoStereo) {
            this.monoBus.gain.setTargetAtTime(0, now, 0.01);
            this.stereoBus.gain.setTargetAtTime(1.0, now, 0.01);
        } else {
            this.monoBus.gain.setTargetAtTime(1.0, now, 0.01);
            this.stereoBus.gain.setTargetAtTime(0, now, 0.01);
        }

        if (this._sessionNoiseActive) {
            this.setNoiseLevel(this.configuredNoiseLevel);
        }
    }
}

function getSharedMorseAudioBus(ctx) {
    if (!window.__morseSharedAudioBus || window.__morseSharedAudioBus.ctx !== ctx) {
        window.__morseSharedAudioBus = new MorseAudioBus(ctx);
    }
    return window.__morseSharedAudioBus;
}

function startSessionAudioNoise() {
    try {
        const ctx = getSharedAudioContext();
        if (ctx) {
            const bus = getSharedMorseAudioBus(ctx);
            bus.startSessionNoise();
        }
    } catch (_) {}
}

function stopSessionAudioNoise() {
    try {
        if (window.__morseSharedAudioCtx) {
            const bus = getSharedMorseAudioBus(window.__morseSharedAudioCtx);
            bus.stopSessionNoise();
        }
    } catch (_) {}
}

window.addEventListener('pagehide', () => stopSessionAudioNoise());
window.addEventListener('beforeunload', () => stopSessionAudioNoise());


/**
 * MorseAudio — проигрывает текст азбукой Морзе через Web Audio API.
 * Поддерживает интервалы Фарнсворта (Farnsworth spacing): символы звучат
 * на "скорости символа" (wpm), а паузы между буквами/словами растянуты
 * до "эффективной скорости" (farnsworthWpm) — это упрощённая, но рабочая
 * аппроксимация стандартного расчёта ARRL.
 */
class MorseAudio {
    constructor({ freq, wpm = 12, farnsworthWpm = null, waveform, letterGapUnits = 3 } = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { freq: 600, waveform: 'sine' };
        this.freq = freq ?? settings.freq;
        this.waveform = waveform ?? settings.waveform;
        this.wpm = wpm;
        this.farnsworthWpm = farnsworthWpm;
        // Межбуквенный интервал в единицах — стандартно 3 (не трогать нигде,
        // кроме экзамена, ss. groups.js: там по замеру эталонной записи
        // реального экзамена он оказался 4, не 3).
        this.letterGapUnits = letterGapUnits;
        this.ctx = null;
        this._timer = null;
        this._stopped = false;
        this._activeNodes = null; // осциллятор, звучащий прямо сейчас — чтобы stop() мог его оборвать
    }

    _ensureCtx() {
        this.ctx = getSharedAudioContext();
    }

    unitMs() {
        return 1200 / this.wpm; // длительность точки на скорости символа
    }

    gapScale() {
        if (!this.farnsworthWpm || this.farnsworthWpm >= this.wpm) return 1;
        return this.wpm / this.farnsworthWpm;
    }

    _tone(durationMs) {
        return new Promise((resolve) => {
            const bus = getSharedMorseAudioBus(this.ctx);

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = this.freq;
            osc.type = this.waveform || 'sine';

            const now = this.ctx.currentTime;
            const dur = durationMs / 1000;

            // Задаём 0 сразу, исключая просачивание дефолтного 1.0 в Web Audio
            gain.gain.value = 0;

            // Мягкая атака и затухание 4-5 мс (адаптивно к коротким точкам на высоких WPM)
            const attack = Math.min(0.005, dur * 0.25);
            const decay = attack;

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + attack);
            gain.gain.setValueAtTime(0.35, Math.max(now + attack, now + dur - decay));
            gain.gain.linearRampToValueAtTime(0, now + dur);

            osc.connect(gain).connect(bus.input);
            osc.start(now);
            // Останавливаем генератор через 5 мс после спада в 0, чтобы исключить обрыв ненулевой фазы
            osc.stop(now + dur + 0.005);
            this._activeNodes = { osc, gain };
            osc.onended = () => {
                if (this._activeNodes && this._activeNodes.osc === osc) this._activeNodes = null;
                resolve();
            };
        });
    }

    _silence(durationMs) {
        if (this._stopped) return Promise.resolve();
        return new Promise((resolve) => {
            this._silenceResolve = resolve;
            this._timer = setTimeout(() => {
                this._silenceResolve = null;
                resolve();
            }, durationMs);
        });
    }

    /**
     * Проигрывает строку (буквы, цифры, пробелы между словами).
     * callbacks: onSymbol({char, symbol, index}) — вызывается в момент начала каждого элемента
     *            onCharStart({char, index}), onDone()
     */
    async play(text, callbacks = {}) {
        this._ensureCtx();
        const bus = getSharedMorseAudioBus(this.ctx);
        bus.configure();
        bus.startNoise();
        this._stopped = false;
        const unit = this.unitMs();
        const scale = this.gapScale();
        const interCharGap = unit * this.letterGapUnits * scale;
        const wordGap = unit * 7 * scale;

        const chars = text.toUpperCase().split('');

        try {
            for (let i = 0; i < chars.length; i++) {
                if (this._stopped) return;
                const ch = chars[i];

                if (ch === ' ') {
                    await this._silence(wordGap);
                    continue;
                }

                const code = MORSE_CODE[ch] || (typeof CYRILLIC_CODE !== 'undefined' ? CYRILLIC_CODE[ch] : undefined);
                if (!code) continue;

                callbacks.onCharStart?.({ char: ch, index: i });

                for (let s = 0; s < code.length; s++) {
                    if (this._stopped) return;
                    const symbol = code[s];
                    const dur = symbol === '.' ? unit : unit * 3;
                    callbacks.onSymbol?.({ char: ch, symbol, index: i, durationMs: dur });
                    await this._tone(dur);
                    if (s < code.length - 1) await this._silence(unit);
                }

                const isLast = i === chars.length - 1;
                if (!isLast && chars[i + 1] !== ' ') {
                    await this._silence(interCharGap);
                }
            }
        } finally {
            bus.stopNoise();
            callbacks.onDone?.();
        }
    }

    /**
     * Проигрывает уже готовый паттерн (например ".- -... -.-.") напрямую,
     * без перевода из букв через MORSE_CODE — нужно там, где сами буквы
     * клиенту намеренно неизвестны (капча: сервер знает слово, клиент
     * видит только код).
     */
    async playPattern(pattern, callbacks = {}) {
        this._ensureCtx();
        const bus = getSharedMorseAudioBus(this.ctx);
        bus.configure();
        bus.startNoise();
        this._stopped = false;
        const unit = this.unitMs();
        const groups = pattern.trim().split(/\s+/).filter(Boolean);

        try {
            for (let g = 0; g < groups.length; g++) {
                if (this._stopped) return;
                const code = groups[g];
                for (let s = 0; s < code.length; s++) {
                    if (this._stopped) return;
                    const symbol = code[s];
                    const dur = symbol === '.' ? unit : unit * 3;
                    callbacks.onSymbol?.({ symbol, durationMs: dur, groupIndex: g });
                    await this._tone(dur);
                    if (s < code.length - 1) await this._silence(unit);
                }
                if (g < groups.length - 1) await this._silence(unit * 3);
            }
        } finally {
            bus.stopNoise();
            callbacks.onDone?.();
        }
    }

    /**
     * Обрывает воспроизведение немедленно: снимает отложенные паузы и гасит
     * тон, который звучит прямо сейчас (иначе после «Остановить» ещё до
     * 3 единиц продолжало пищать тире). Осциллятор глушится коротким
     * рампом, чтобы не было щелчка; его onended отпустит await в play().
     */
    stop() {
        this._stopped = true;
        clearTimeout(this._timer);
        if (this.ctx && typeof getSharedMorseAudioBus === 'function') {
            getSharedMorseAudioBus(this.ctx).stopNoise();
        }
        if (this._silenceResolve) {
            const res = this._silenceResolve;
            this._silenceResolve = null;
            res();
        }
        if (this._activeNodes && this.ctx) {
            const osc = this._activeNodes.osc;
            const gain = this._activeNodes.gain;
            this._activeNodes = null;
            try {
                const now = this.ctx.currentTime;
                gain.gain.cancelScheduledValues(now);
                const cur = gain.gain.value || 0.35;
                gain.gain.setValueAtTime(cur, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.01);
                osc.stop(now + 0.02);
            } catch (e) {
                try { gain.disconnect(); } catch (_) {}
                try { osc.stop(); } catch (_) {}
            }
        }
    }
}

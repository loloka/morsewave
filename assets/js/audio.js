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

    configure(overrides = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { pseudoStereo: true };
        const pseudoStereo = overrides.pseudoStereo ?? settings.pseudoStereo ?? true;
        const now = this.ctx.currentTime;

        if (pseudoStereo) {
            this.monoBus.gain.setTargetAtTime(0, now, 0.01);
            this.stereoBus.gain.setTargetAtTime(1.0, now, 0.01);
        } else {
            this.monoBus.gain.setTargetAtTime(1.0, now, 0.01);
            this.stereoBus.gain.setTargetAtTime(0, now, 0.01);
        }
    }
}

function getSharedMorseAudioBus(ctx) {
    if (!window.__morseSharedAudioBus || window.__morseSharedAudioBus.ctx !== ctx) {
        window.__morseSharedAudioBus = new MorseAudioBus(ctx);
    }
    return window.__morseSharedAudioBus;
}

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
            bus.configure();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = this.freq;
            osc.type = this.waveform || 'sine';

            const now = this.ctx.currentTime;
            const dur = durationMs / 1000;
            // Мягкая атака/затухание, чтобы не было щелчков
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
            gain.gain.setValueAtTime(0.35, now + dur - 0.005 > now ? now + dur - 0.005 : now);
            gain.gain.linearRampToValueAtTime(0, now + dur);

            osc.connect(gain).connect(bus.input);
            osc.start(now);
            osc.stop(now + dur);
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
        this._stopped = false;
        const unit = this.unitMs();
        const scale = this.gapScale();
        const interCharGap = unit * this.letterGapUnits * scale;
        const wordGap = unit * 7 * scale;

        const chars = text.toUpperCase().split('');

        for (let i = 0; i < chars.length; i++) {
            if (this._stopped) return;
            const ch = chars[i];

            if (ch === ' ') {
                await this._silence(wordGap);
                continue;
            }

            // Кириллица не подмешана в MORSE_CODE (см. morse-data.js) — при
            // отсутствии буквы в латинской таблице пробуем отдельную
            // кириллическую. Это только доигрывание звука, декодирование
            // ключом остаётся полностью раздельным (input.js).
            const code = MORSE_CODE[ch] || (typeof CYRILLIC_CODE !== 'undefined' ? CYRILLIC_CODE[ch] : undefined);
            if (!code) continue;

            callbacks.onCharStart?.({ char: ch, index: i });

            for (let s = 0; s < code.length; s++) {
                if (this._stopped) return;
                const symbol = code[s];
                const dur = symbol === '.' ? unit : unit * 3;
                callbacks.onSymbol?.({ char: ch, symbol, index: i, durationMs: dur });
                await this._tone(dur);
                if (s < code.length - 1) await this._silence(unit); // пауза между элементами буквы
            }

            const isLast = i === chars.length - 1;
            if (!isLast && chars[i + 1] !== ' ') {
                await this._silence(interCharGap);
            }
        }

        callbacks.onDone?.();
    }

    /**
     * Проигрывает уже готовый паттерн (например ".- -... -.-.") напрямую,
     * без перевода из букв через MORSE_CODE — нужно там, где сами буквы
     * клиенту намеренно неизвестны (капча: сервер знает слово, клиент
     * видит только код).
     */
    async playPattern(pattern, callbacks = {}) {
        this._ensureCtx();
        this._stopped = false;
        const unit = this.unitMs();
        const groups = pattern.trim().split(/\s+/).filter(Boolean);

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

        callbacks.onDone?.();
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

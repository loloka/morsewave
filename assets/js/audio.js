/**
 * MorseAudio — проигрывает текст азбукой Морзе через Web Audio API.
 * Поддерживает интервалы Фарнсворта (Farnsworth spacing): символы звучат
 * на "скорости символа" (wpm), а паузы между буквами/словами растянуты
 * до "эффективной скорости" (farnsworthWpm) — это упрощённая, но рабочая
 * аппроксимация стандартного расчёта ARRL.
 */
class MorseAudio {
    constructor({ freq, wpm = 12, farnsworthWpm = null, waveform } = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { freq: 600, waveform: 'sine' };
        this.freq = freq ?? settings.freq;
        this.waveform = waveform ?? settings.waveform;
        this.wpm = wpm;
        this.farnsworthWpm = farnsworthWpm;
        this.ctx = null;
        this._timer = null;
        this._stopped = false;
    }

    _ensureCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
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
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = this.freq;
            osc.type = this.waveform || 'sine';

            const now = this.ctx.currentTime;
            const dur = durationMs / 1000;
            // мягкая атака/затухание, чтобы не было щелчков
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
            gain.gain.setValueAtTime(0.35, now + dur - 0.005 > now ? now + dur - 0.005 : now);
            gain.gain.linearRampToValueAtTime(0, now + dur);

            osc.connect(gain).connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur);
            osc.onended = resolve;
        });
    }

    _silence(durationMs) {
        return new Promise((resolve) => {
            this._timer = setTimeout(resolve, durationMs);
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
        const interCharGap = unit * 3 * scale;
        const wordGap = unit * 7 * scale;

        const chars = text.toUpperCase().split('');

        for (let i = 0; i < chars.length; i++) {
            if (this._stopped) return;
            const ch = chars[i];

            if (ch === ' ') {
                await this._silence(wordGap);
                continue;
            }

            const code = MORSE_CODE[ch];
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

    stop() {
        this._stopped = true;
        clearTimeout(this._timer);
    }
}

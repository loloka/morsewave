/**
 * TelegraphKey — превращает удержание клавиши (пробел) или тап по экранной
 * кнопке в последовательность точек/тире и декодирует их в буквы по
 * длительности нажатия и пауз (как настоящий телеграфный ключ).
 */
class TelegraphKey {
    constructor(el, { wpm = 15, onSymbol, onLetter, onWord, onPress, sidetone = true, freq, waveform } = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { freq: 600, waveform: 'sine' };
        this.el = el;
        this.wpm = wpm;
        this.onSymbol = onSymbol;
        this.onLetter = onLetter;
        this.onWord = onWord;
        this.onPress = onPress;
        this.sidetone = sidetone;
        this.freq = freq ?? settings.freq;
        this.waveform = waveform ?? settings.waveform;

        this.buffer = '';
        this.downTime = 0;
        this.letterTimer = null;
        this.wordTimer = null;
        this.audioCtx = null;
        this.osc = null;
        this.gain = null;

        this._bind();
    }

    /** Живой звук ("сайдтон") — звучит ровно столько, сколько удержана клавиша */
    _ensureAudio() {
        if (!this.sidetone) return;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }

    _startTone() {
        if (!this.sidetone) return;
        this._ensureAudio();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        this.osc = ctx.createOscillator();
        this.gain = ctx.createGain();
        this.osc.frequency.value = this.freq;
        this.osc.type = this.waveform || 'sine';
        this.gain.gain.setValueAtTime(0, now);
        this.gain.gain.linearRampToValueAtTime(0.3, now + 0.006);
        this.osc.connect(this.gain).connect(ctx.destination);
        this.osc.start(now);
    }

    _stopTone() {
        if (!this.sidetone || !this.osc) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        this.gain.gain.linearRampToValueAtTime(0, now + 0.015);
        this.osc.stop(now + 0.02);
        this.osc = null;
    }

    unit() {
        return 1200 / this.wpm;
    }

    setWpm(wpm) {
        this.wpm = wpm;
    }

    _bind() {
        const start = (e) => { e.preventDefault(); this._down(); };
        const end = (e) => { e.preventDefault(); this._up(); };

        this.el.addEventListener('mousedown', start);
        this.el.addEventListener('mouseup', end);
        this.el.addEventListener('mouseleave', () => { if (this.downTime) this._up(); });
        this.el.addEventListener('touchstart', start, { passive: false });
        this.el.addEventListener('touchend', end, { passive: false });

        // Пробел работает как ключ, только если фокус не в текстовом поле
        this._keydownHandler = (e) => {
            if (e.code !== 'Space') return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            if (!this.downTime) this._down();
        };
        this._keyupHandler = (e) => {
            if (e.code !== 'Space') return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            this._up();
        };
        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
    }

    destroy() {
        window.removeEventListener('keydown', this._keydownHandler);
        window.removeEventListener('keyup', this._keyupHandler);
        clearTimeout(this.letterTimer);
        clearTimeout(this.wordTimer);
        this._stopTone();
    }

    _down() {
        clearTimeout(this.letterTimer);
        clearTimeout(this.wordTimer);
        this.downTime = performance.now();
        this.el.classList.add('pressed');
        this._startTone();
        this.onPress?.(true);
    }

    _up() {
        if (!this.downTime) return;
        const duration = performance.now() - this.downTime;
        this.downTime = 0;
        this.el.classList.remove('pressed');
        this._stopTone();
        this.onPress?.(false);

        const symbol = duration < this.unit() * 2 ? '.' : '-';
        this.buffer += symbol;
        this.onSymbol?.(symbol);
        this._scheduleFinalize();
    }

    _scheduleFinalize() {
        clearTimeout(this.letterTimer);
        clearTimeout(this.wordTimer);
        this.letterTimer = setTimeout(() => {
            this._finalizeLetter();
            this.wordTimer = setTimeout(() => {
                this.onWord?.();
            }, this.unit() * 4);
        }, this.unit() * 2.5);
    }

    _finalizeLetter() {
        if (!this.buffer) return;
        const ch = MORSE_TO_CHAR[this.buffer] || '?';
        this.onLetter?.(ch, this.buffer);
        this.buffer = '';
    }

    reset() {
        this.buffer = '';
        clearTimeout(this.letterTimer);
        clearTimeout(this.wordTimer);
    }
}

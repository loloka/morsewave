/**
 * TelegraphKey — превращает удержание клавиши (пробел) или тап по экранной
 * кнопке в последовательность точек/тире и декодирует их в буквы по
 * длительности нажатия и пауз (как настоящий телеграфный ключ).
 */
class TelegraphKey {
    constructor(el, { wpm = 12, onSymbol, onLetter, onWord, onPress, sidetone = true, freq, waveform, table } = {}) {
        const settings = (typeof AudioSettings !== 'undefined') ? AudioSettings.load() : { freq: 600, waveform: 'sine' };
        this.el = el;
        this.wpm = wpm;
        this.onSymbol = onSymbol;
        this.onLetter = onLetter;
        this.onWord = onWord;
        this.onPress = onPress;
        this.sidetone = sidetone;
        // Таблица код→буква для декодирования. По умолчанию — латинская
        // MORSE_TO_CHAR (существующее поведение везде не меняется). Режимы,
        // которым нужна кириллица (learn.js), передают свою таблицу или
        // переключают её на лету через setTable() — отдельно от общей,
        // чтобы не трогать реверс-декодирование латиницы (см. morse-data.js).
        this.table = table || MORSE_TO_CHAR;
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
        this.audioCtx = getSharedAudioContext();
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

    setTable(table) {
        this.table = table || MORSE_TO_CHAR;
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
        // Второй параметр (реальная длительность нажатия, мс) добавлен для
        // режима "Оценка ритма ключа" (learn.js) — старые подписчики,
        // принимающие только symbol, его просто игнорируют.
        this.onSymbol?.(symbol, duration);
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
        const ch = this.table[this.buffer] || '?';
        this.onLetter?.(ch, this.buffer);
        this.buffer = '';
    }

    reset() {
        this.buffer = '';
        clearTimeout(this.letterTimer);
        clearTimeout(this.wordTimer);
    }
}


class VirtualKeyboard {
    constructor(containerEl, inputEl, options = {}) {
        this.container = containerEl;
        this.input = inputEl;
        this.options = options;
        
        if (window.matchMedia('(pointer: coarse)').matches) {
            this.input.setAttribute('inputmode', 'none');
            this.container.style.display = 'flex';
        } else {
            this.container.style.display = 'none';
            return;
        }

        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('vkb');
        
        const QWERTY_ROWS = [
            ['1','2','3','4','5','6','7','8','9','0'],
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['Z','X','C','V','B','N','M'],
        ];

        if (this.options.showSlash) {
            QWERTY_ROWS[3].push('/');
        }

        QWERTY_ROWS.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'vkb-row';
            row.forEach((ch) => {
                const key = document.createElement('div');
                key.className = 'vkb-key';
                key.textContent = ch;
                key.addEventListener('click', (e) => { e.preventDefault(); this.insertText(ch); });
                rowEl.appendChild(key);
            });
            this.container.appendChild(rowEl);
        });

        const bottomRow = document.createElement('div');
        bottomRow.className = 'vkb-row';

        if (this.options.showSpace) {
            const space = document.createElement('div');
            space.className = 'vkb-key vkb-space';
            space.textContent = 'Space';
            space.style.flex = '2';
            space.addEventListener('click', (e) => { e.preventDefault(); this.insertText(' '); });
            bottomRow.appendChild(space);
        }

        const back = document.createElement('div');
        back.className = 'vkb-key vkb-backspace';
        back.style.flex = '1';
        back.innerHTML = typeof t !== 'undefined' ? t('js.koch.erase') : '⌫';
        back.addEventListener('click', (e) => { e.preventDefault(); this.backspace(); });
        bottomRow.appendChild(back);
        
        this.container.appendChild(bottomRow);
    }

    insertText(ch) {
        const start = this.input.selectionStart ?? this.input.value.length;
        const end = this.input.selectionEnd ?? this.input.value.length;
        const val = this.input.value;
        this.input.value = val.slice(0, start) + ch + val.slice(end);
        
        this.input.focus();
        const pos = start + ch.length;
        this.input.setSelectionRange(pos, pos);
        
        // Dispatch input event to trigger any listeners
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    backspace() {
        const start = this.input.selectionStart ?? this.input.value.length;
        const end = this.input.selectionEnd ?? this.input.value.length;
        const val = this.input.value;
        if (start !== end) {
            this.input.value = val.slice(0, start) + val.slice(end);
            this.input.focus();
            this.input.setSelectionRange(start, start);
        } else if (start > 0) {
            this.input.value = val.slice(0, start - 1) + val.slice(start);
            this.input.focus();
            this.input.setSelectionRange(start - 1, start - 1);
        } else {
            this.input.focus();
        }
        
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

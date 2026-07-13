/**
 * SignalLine — визуализирует поток точек/тире в виде "осциллографа".
 * Используется и при воспроизведении звука, и при вводе через ключ —
 * это сквозной элемент дизайна на всех страницах тренировки.
 */
class SignalLine {
    constructor(el, maxBars = 48) {
        this.el = el;
        this.maxBars = maxBars;
    }

    clear() {
        this.el.innerHTML = '';
    }

    pulse(type, durationMs) {
        const bar = document.createElement('div');
        bar.className = `signal-bar ${type} on`;
        this.el.appendChild(bar);
        while (this.el.children.length > this.maxBars) {
            this.el.removeChild(this.el.firstChild);
        }
        const dur = durationMs ?? (type === 'dash' ? 260 : 120);
        setTimeout(() => bar.classList.remove('on'), dur);
        return bar;
    }
}

/**
 * MorseLamp — визуальная "сигнальная лампа" (как на корабле), дублирует
 * звук светом. Позволяет тренироваться без звука — полезно для тех, кто
 * учится в тишине, или для тренировки восприятия сигнальных ламп.
 */
class MorseLamp {
    constructor(el) {
        this.el = el;
        this._offTimer = null;
    }

    on() {
        clearTimeout(this._offTimer);
        this.el.classList.add('lit');
    }

    off() {
        this.el.classList.remove('lit');
    }

    flash(durationMs = 150) {
        this.on();
        clearTimeout(this._offTimer);
        this._offTimer = setTimeout(() => this.off(), durationMs);
    }
}

/**
 * Кнопка "показать/скрыть сигнальную линию" — общая для всех режимов
 * приёма на слух (Кох, Группы, Сокращения, Позывные, Приём на слух).
 * Точки-тире на экране — по сути подсказка-читерство при тренировке слуха,
 * поэтому многим хочется её спрятать. Выбор сохраняется и применяется
 * сразу на всех страницах — переключил один раз и забыл.
 */
function wireSignalVisibilityToggle(buttonEl, containerEl) {
    function apply(visible) {
        containerEl.style.display = visible ? 'flex' : 'none';
        buttonEl.textContent = visible ? '🙈 Скрыть' : '👁 Показать';
        buttonEl.title = 'Показать/скрыть точки-тире на экране во время приёма';
        buttonEl.setAttribute('aria-pressed', String(!visible));
    }
    const initialVisible = DisplaySettings.load().showSignalLine !== false;
    apply(initialVisible);

    buttonEl.addEventListener('click', () => {
        const settings = DisplaySettings.load();
        const nextVisible = !(settings.showSignalLine !== false);
        settings.showSignalLine = nextVisible;
        DisplaySettings.save(settings);
        apply(nextVisible);
    });
}

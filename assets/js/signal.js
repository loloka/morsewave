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
        bar.className = (type === 'gap') ? 'signal-bar gap' : `signal-bar ${type} on`;
        this.el.appendChild(bar);
        while (this.el.children.length > this.maxBars) {
            this.el.removeChild(this.el.firstChild);
        }
        if (type !== 'gap') {
            const dur = durationMs ?? (type === 'dash' ? 260 : 120);
            setTimeout(() => bar.classList.remove('on'), Math.max(dur, 180));
        }
        return bar;
    }

    gap(subClass = 'char-gap') {
        const bar = document.createElement('div');
        bar.className = `signal-bar gap ${subClass}`;
        this.el.appendChild(bar);
        while (this.el.children.length > this.maxBars) {
            this.el.removeChild(this.el.firstChild);
        }
        return bar;
    }
}

/**
 * RhythmSignalLine — специализированная сигнальная линия для "Буквы" →
 * "Ритм ключа". Обычная SignalLine.pulse() умеет только мигнуть цветом —
 * этого достаточно, когда важно лишь "верно/неверно" (приём на слух и
 * т.п.), но в ритме нужно понять НАПРАВЛЕНИЕ ошибки: нажатие/пауза длиннее
 * идеала ("затянул", надо быстрее) или короче ("поспешил", надо медленнее).
 *
 * Первая версия кодировала это высотой столбика от центральной линии — на
 * практике оказалось нечитаемо: типичная ошибка новичка (15-20% от идеала)
 * даёт разницу высоты в пару пикселей, глазом не различить (см. скриншот
 * владельца при разборе фичи). Поэтому столбик снова растёт СНИЗУ и
 * высотой кодирует только тип символа (точка/тире/пауза), как в обычной
 * SignalLine — это узнаваемо и не нужно всматриваться. Направление ошибки
 * показывает отдельная стрелка над столбиком (▲/▼), которая рисуется,
 * только если отклонение заметное (см. NOTABLE_RATIO_DEVIATION) — иначе
 * она мельтешила бы на каждом почти идеальном нажатии.
 *
 * Используется только в learn.js для rhythm-режима, остальные страницы
 * (Кох/Группы/Слова/Сокращения/Позывные/Приём) продолжают работать через
 * обычный SignalLine — это сознательно два разных компонента, а не два
 * режима одного, чтобы не тащить в общий SignalLine логику отклонений,
 * которая больше нигде не нужна.
 */
class RhythmSignalLine {
    static NOTABLE_RATIO_DEVIATION = 0.15; // тот же порог, что и у текстовой подсказки в learn.js

    constructor(el, maxBars = 16) {
        this.el = el;
        this.maxBars = maxBars;
    }

    clear() {
        this.el.innerHTML = '';
    }

    /**
     * type — 'dot'|'dash'|'pause' (тип столбика, задаёт высоту/ширину через CSS).
     * ratio — actualMs / idealMs (>1 = длиннее идеала, <1 = короче).
     * accClass — 'rhythm-good'|'rhythm-warn'|'rhythm-bad', та же метрика
     * точности, что уже считает learn.js (timingAccuracy/accuracyClass).
     */
    pulse(type, ratio, accClass) {
        const bar = document.createElement('div');
        const deviation = ratio - 1;
        let dirClass = '';
        if (deviation > RhythmSignalLine.NOTABLE_RATIO_DEVIATION) dirClass = 'dir-over';
        else if (deviation < -RhythmSignalLine.NOTABLE_RATIO_DEVIATION) dirClass = 'dir-under';
        bar.className = `rhythm-bar ${type} ${accClass} ${dirClass}`.trim();
        this.el.appendChild(bar);
        while (this.el.children.length > this.maxBars) {
            this.el.removeChild(this.el.firstChild);
        }
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
        buttonEl.textContent = visible ? t('js.signal.hide') : t('js.signal.show');
        buttonEl.title = t('js.signal.toggle_title');
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

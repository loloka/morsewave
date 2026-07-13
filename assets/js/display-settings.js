/**
 * DisplaySettings — настройки отображения, общие для всех тренажёров.
 * Пока одна опция: показывать ли сигнальную линию (точки-тире) во время
 * приёма на слух. Многие сознательно хотят её скрыть, чтобы не подглядывать
 * глазами вместо того чтобы слушать — особенно с телефона, где взгляд
 * невольно всё время падает на экран.
 */
const DisplaySettings = (() => {
    const KEY = 'morsewave_display_settings_v1';

    const defaults = () => ({ showSignalLine: true });

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaults();
            return { ...defaults(), ...JSON.parse(raw) };
        } catch {
            return defaults();
        }
    }

    function save(settings) {
        localStorage.setItem(KEY, JSON.stringify(settings));
    }

    return { load, save, defaults };
})();

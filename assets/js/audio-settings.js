/**
 * AudioSettings — глобальные настройки тона (частота и форма волны),
 * общие для всех тренажёров сайта. Хранятся в localStorage и применяются
 * по умолчанию во всех местах, где создаётся MorseAudio / TelegraphKey.
 */
const AudioSettings = (() => {
    const KEY = 'morsewave_audio_settings_v1';

    const defaults = () => ({ freq: 600, waveform: 'sine' });

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

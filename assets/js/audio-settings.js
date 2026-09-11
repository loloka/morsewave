/**
 * AudioSettings — глобальные настройки тона (частота и форма волны),
 * общие для всех тренажёров сайта. Хранятся в localStorage и применяются
 * по умолчанию во всех местах, где создаётся MorseAudio / TelegraphKey.
 */
const AudioSettings = (() => {
    const KEY = 'morsewave_audio_settings_v1';

    const defaults = () => ({ freq: 600, waveform: 'sine', pseudoStereo: true });

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaults();
            const parsed = JSON.parse(raw);
            // Если остался временный bell или transceiver — возвращаем на sine
            if (parsed.waveform === 'bell' || parsed.waveform === 'transceiver') {
                parsed.waveform = 'sine';
            }
            return { ...defaults(), ...parsed };
        } catch {
            return defaults();
        }
    }

    function save(settings) {
        localStorage.setItem(KEY, JSON.stringify(settings));
    }

    return { load, save, defaults };
})();

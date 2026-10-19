/**
 * AudioSettings — глобальные настройки тона (частота и форма волны),
 * общие для всех тренажёров сайта. Хранятся в localStorage и применяются
 * по умолчанию во всех местах, где создаётся MorseAudio / TelegraphKey.
 */
const AudioSettings = (() => {
    const KEY = 'morsewave_audio_settings_v1';

    const defaults = () => ({
        freq: 600,
        waveform: 'sine',
        pseudoStereo: true,
        noiseLevel: 0, // 0 = выкл, 0.035 = тихий, 0.07 = реалистичный
        readySignal: false, // позывной VVV = и 3 сек отсчёта перед стартом сессии (по умолчанию выкл)
        volume: 80 // громкость 0..100%
    });

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaults();
            const parsed = JSON.parse(raw);
            // Если остался временный bell или transceiver — возвращаем на sine
            if (parsed.waveform === 'bell' || parsed.waveform === 'transceiver') {
                parsed.waveform = 'sine';
            }
            // По умолчанию VVV = выключен у всех, пока пользователь явно не включил
            if (!localStorage.getItem('morsewave_ready_signal_user_set')) {
                parsed.readySignal = false;
            }
            const res = { ...defaults(), ...parsed };
            if (typeof res.volume !== 'number' || isNaN(res.volume)) {
                res.volume = 80;
            } else {
                res.volume = Math.max(0, Math.min(100, Math.round(res.volume)));
            }
            return res;
        } catch {
            return defaults();
        }
    }

    function save(settings) {
        localStorage.setItem(KEY, JSON.stringify(settings));
    }

    function getVolume() {
        return load().volume ?? 80;
    }

    function setVolume(vol) {
        const s = load();
        s.volume = Math.max(0, Math.min(100, Math.round(Number(vol) || 0)));
        save(s);
        return s.volume;
    }

    return { load, save, defaults, getVolume, setVolume };
})();

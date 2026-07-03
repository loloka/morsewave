(function () {
    const freqSlider = document.getElementById('tone-freq');
    const freqValue = document.getElementById('tone-freq-value');
    const waveChips = document.querySelectorAll('#waveform-chips .chip');

    let current = AudioSettings.load();
    freqSlider.value = current.freq;
    freqValue.textContent = current.freq;
    waveChips.forEach(c => c.classList.toggle('active', c.dataset.wave === current.waveform));

    function save() {
        AudioSettings.save(current);
    }

    freqSlider.addEventListener('input', () => {
        current.freq = parseInt(freqSlider.value, 10);
        freqValue.textContent = current.freq;
        save();
    });

    waveChips.forEach(chip => {
        chip.addEventListener('click', () => {
            waveChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            current.waveform = chip.dataset.wave;
            save();
        });
    });

    document.getElementById('test-tone-btn').addEventListener('click', () => {
        const audio = new MorseAudio({ wpm: 15 });
        audio.play('MORSE', {});
    });

    document.getElementById('reset-tone-btn').addEventListener('click', () => {
        current = AudioSettings.defaults();
        save();
        freqSlider.value = current.freq;
        freqValue.textContent = current.freq;
        waveChips.forEach(c => c.classList.toggle('active', c.dataset.wave === current.waveform));
    });
})();

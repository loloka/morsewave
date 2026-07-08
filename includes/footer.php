    </div>
</main>
<footer class="site-footer">
    <div class="container site-footer-inner">
        <span>© <?= date('Y') ?> MorseWave</span>
        <span class="dot">·</span>
        <span>MIT License</span>
        <span class="dot">·</span>
        <span>Автор R9OGL</span>
        <span class="dot">·</span>
        <a href="https://github.com/loloka/morsewave" target="_blank" rel="noopener">Исходный код и история изменений</a>
    </div>
</footer>
<script src="<?= asset_v('assets/js/morse-data.js') ?>"></script>
<script src="<?= asset_v('assets/js/abbreviations.js') ?>"></script>
<script src="<?= asset_v('assets/js/audio-settings.js') ?>"></script>
<script src="<?= asset_v('assets/js/audio.js') ?>"></script>
<script src="<?= asset_v('assets/js/input.js') ?>"></script>
<script src="<?= asset_v('assets/js/signal.js') ?>"></script>
<script src="<?= asset_v('assets/js/progress.js') ?>"></script>
<script src="<?= asset_v('assets/js/app.js') ?>"></script>
<?php if (!empty($pageScript)): ?>
<script src="<?= asset_v('assets/js/' . $pageScript) ?>"></script>
<?php endif; ?>
</body>
</html>

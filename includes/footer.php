    </div>
</main>
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

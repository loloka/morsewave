    </div>
</main>
<footer class="site-footer">
    <div class="container site-footer-inner">
        <span>© <?= date('Y') ?> MorseWave</span>
        <span class="dot">·</span>
        <span><?= t('footer.license') ?></span>
        <span class="dot">·</span>
        <span><?= t('footer.author') ?></span>
        <span class="dot">·</span>
        <!-- Ссылка на основной сайт владельца. В подвале, а не в навигации,
             намеренно: это внешний ресурс, а не раздел тренажёра — в таббаре
             на телефоне и так 7 пунктов, восьмой пришлось бы ужимать. -->
        <a href="https://r9o.ru" target="_blank" rel="noopener"><?= t('footer.main_site') ?></a>
        <span class="dot">·</span>
        <a href="https://github.com/loloka/morsewave" target="_blank" rel="noopener"><?= t('footer.source') ?></a>
        <span class="dot">·</span>
        <a href="terms.php"><?= t('footer.terms') ?></a>
        <span class="dot">·</span>
        <a href="privacy.php"><?= t('footer.privacy') ?></a>
    </div>
</footer>
<script src="<?= asset_v('assets/js/i18n.js') ?>"></script>
<script src="<?= asset_v('assets/js/icons.js') ?>"></script>
<script src="<?= asset_v('assets/js/morse-data.js') ?>"></script>
<script src="<?= asset_v('assets/js/abbreviations.js') ?>"></script>
<script src="<?= asset_v('assets/js/words.js') ?>"></script>
<script src="<?= asset_v('assets/js/audio-settings.js') ?>"></script>
<script src="<?= asset_v('assets/js/display-settings.js') ?>"></script>
<script src="<?= asset_v('assets/js/audio.js') ?>"></script>
<script src="<?= asset_v('assets/js/input.js') ?>"></script>
<script src="<?= asset_v('assets/js/signal.js') ?>"></script>
<script src="<?= asset_v('assets/js/progress.js') ?>"></script>
<script src="<?= asset_v('assets/js/daily.js') ?>"></script>
<script src="<?= asset_v('assets/js/app.js') ?>"></script>
<?php if (!empty($pageScript)): ?>
<script src="<?= asset_v('assets/js/' . $pageScript) ?>"></script>
<?php endif; ?>
</body>
</html>

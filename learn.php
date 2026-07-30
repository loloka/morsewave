<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('learn.title');
$activePage = 'learn';
$pageScript = 'learn.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('learn.eyebrow') ?></div>
<h1><?= t('learn.h1') ?></h1>
<p><?= t('learn.intro') ?></p>

<div class="mode-switch">
    <div class="chip active" data-mode="send"><?= t('learn.mode_send') ?></div>
    <div class="chip" data-mode="recognize"><?= t('learn.mode_recognize') ?></div>
    <div class="chip" data-mode="rhythm"><?= t('learn.mode_rhythm') ?></div>
</div>

<!-- ======================= РЕЖИМ: ОТПРАВКА ======================= -->
<div id="send-mode">
    <div class="chip-row mt-2" id="order-chips">
        <div class="chip active" data-order="alphabet"><?= t('learn.order_alphabet') ?></div>
        <div class="chip" data-order="koch"><?= t('learn.order_koch') ?></div>
        <div class="chip" data-order="cyrillic"><?= t('learn.order_cyrillic') ?></div>
    </div>
    <div class="tile-grid mt-2" id="letter-grid"></div>

    <section class="section card" id="practice-panel" style="display:none;">
        <div class="flex-between flex-wrap gap-1">
            <div>
                <div class="card-eyebrow"><?= t('learn.practicing_symbol') ?></div>
                <h2 id="practice-letter" style="font-family:var(--font-mono)">A</h2>
            </div>
            <div class="speed-control">
                <?= t('learn.speed') ?>
                <input type="range" id="wpm-select" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="wpm-value">12</span> wpm
            </div>
        </div>

        <div class="morse-pattern mt-2" id="practice-pattern"></div>
        <div class="morse-tita" id="practice-tita"></div>
        <div class="morse-napev" id="practice-napev"></div>

        <div class="flex-between mt-2 gap-2 flex-wrap">
            <div class="muted" style="font-size:13px;"><?= t('learn.streak_label') ?> <b class="mono" id="streak-count">0</b> / 5</div>
            <div class="progress-bar" style="width:120px;"><span id="streak-bar" style="width:0%"></span></div>
        </div>
        <div class="feedback mt-1" id="practice-feedback"></div>

        <div class="flex-between flex-wrap gap-2 mt-2">
            <div class="key-wrap" style="flex:1;">
                <div class="telegraph-key" id="telegraph-key" tabindex="0"><?= t('learn.tap_or_space') ?></div>
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="practice-lamp"></div>
                <button class="btn btn-sm" id="play-btn"><?= t('learn.listen_btn') ?></button>
            </div>
        </div>

        <div class="signal-line mt-2" id="practice-signal"></div>
    </section>
</div>

<!-- ======================= РЕЖИМ: ПРИЁМ НА СЛУХ ======================= -->
<div id="recognize-mode" style="display:none;">
    <div class="card mt-2">
        <p class="mt-0"><?= t('learn.rec_intro') ?></p>

        <div class="chip-row mt-1" id="rec-charset-chips">
            <div class="chip active" data-set="all"><?= t('learn.rec_set_all') ?></div>
            <div class="chip" data-set="letters"><?= t('learn.rec_set_letters') ?></div>
            <div class="chip" data-set="digits"><?= t('learn.rec_set_digits') ?></div>
            <div class="chip" data-set="learned"><?= t('learn.rec_set_learned') ?></div>
            <div class="chip" data-set="cyrillic"><?= t('learn.rec_set_cyrillic') ?></div>
            <div class="chip" data-set="custom"><?= t('learn.rec_set_custom') ?></div>
        </div>
        <input type="text" id="rec-custom-input" class="answer-input mt-1"
               placeholder="<?= htmlspecialchars(t('learn.rec_custom_placeholder')) ?>"
               style="display:none; text-transform:uppercase;" autocomplete="off">
        <div class="muted" id="rec-custom-hint" style="display:none; font-size:11px; margin-top:4px;"><?= t('learn.rec_custom_hint') ?></div>

        <div class="flex-between flex-wrap gap-2 mt-2">
            <div class="speed-control">
                <?= t('learn.speed') ?>
                <input type="range" id="rec-wpm" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="rec-wpm-value">12</span> wpm
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="rec-lamp"></div>
                <button class="btn btn-sm" id="rec-signal-toggle"></button>
                <button class="btn btn-primary btn-sm" id="rec-start-btn"><?= t('learn.rec_start') ?></button>
                <button class="btn btn-sm" id="rec-stop-btn" style="display:none;"><?= t('learn.rec_stop') ?></button>
            </div>
        </div>

        <div class="signal-line mt-2" id="rec-signal"></div>

        <div class="grid grid-4 mt-2">
            <div class="stat"><span class="value" id="rec-streak">0</span><span class="label"><?= mw_icon('flame', 12) ?> <?= t('learn.stat_streak') ?></span></div>
            <div class="stat"><span class="value" id="rec-best">0</span><span class="label"><?= mw_icon('trophy', 12) ?> <?= t('learn.stat_best') ?></span></div>
            <div class="stat"><span class="value" id="rec-accuracy">—</span><span class="label"><?= mw_icon('target', 12) ?> <?= t('learn.stat_accuracy') ?></span></div>
            <div class="stat"><span class="value" id="rec-total">0</span><span class="label"><?= mw_icon('check', 12) ?> <?= t('learn.stat_total') ?></span></div>
        </div>

        <div class="tile-grid mt-2" id="recognize-grid"></div>

        <!-- Системные сообщения (например, "Остановлено") — короткие и
             разовые, для них старого поведения (появилось/исчезло) хватает. -->
        <div class="feedback mt-2" id="rec-feedback"></div>

        <!-- История ответов — раньше разбор "верно/неверно" был одной
             строкой, которую следующий символ гасил меньше чем через
             секунду: на слух не успевали прочитать, что сделали не так.
             Как и в "Сокращениях" (см. abbrev-history), ответы копятся
             списком (последний сверху) и остаются на экране, пока их не
             вытеснят более новые. -->
        <div class="mt-2" id="rec-history"></div>
    </div>
</div>

<!-- ======================= РЕЖИМ: РИТМ КЛЮЧА ======================= -->
<div id="rhythm-mode" style="display:none;">
    <p class="mt-0"><?= t('learn.rhythm_intro') ?></p>

    <div class="chip-row mt-1" id="rhythm-order-chips">
        <div class="chip active" data-order="alphabet"><?= t('learn.order_alphabet') ?></div>
        <div class="chip" data-order="cyrillic"><?= t('learn.order_cyrillic') ?></div>
    </div>
    <div class="tile-grid mt-2" id="rhythm-grid"></div>

    <section class="section card" id="rhythm-panel" style="display:none;">
        <div class="flex-between flex-wrap gap-1">
            <div>
                <div class="card-eyebrow"><?= t('learn.practicing_symbol') ?></div>
                <h2 id="rhythm-letter" style="font-family:var(--font-mono)">A</h2>
            </div>
            <div class="speed-control">
                <?= t('learn.speed') ?>
                <input type="range" id="rhythm-wpm" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="rhythm-wpm-value">12</span> wpm
            </div>
        </div>

        <div class="morse-pattern mt-2" id="rhythm-pattern"></div>

        <div class="flex-between mt-2 gap-2 flex-wrap">
            <div class="muted" style="font-size:13px;"><?= t('learn.rhythm_streak_label') ?> <b class="mono" id="rhythm-streak">0</b> / 5</div>
            <div class="progress-bar" style="width:120px;"><span id="rhythm-streak-bar" style="width:0%"></span></div>
        </div>

        <div class="grid grid-3 mt-2">
            <div class="stat"><span class="value" id="rhythm-best">0%</span><span class="label"><?= mw_icon('trophy', 12) ?> <?= t('learn.rhythm_stat_best') ?></span></div>
            <div class="stat"><span class="value" id="rhythm-accuracy">—</span><span class="label"><?= mw_icon('target', 12) ?> <?= t('learn.rhythm_stat_accuracy') ?></span></div>
            <div class="stat"><span class="value" id="rhythm-total">0</span><span class="label"><?= mw_icon('check', 12) ?> <?= t('learn.rhythm_stat_total') ?></span></div>
        </div>

        <div class="feedback mt-2" id="rhythm-feedback"></div>

        <div class="flex-between flex-wrap gap-2 mt-2">
            <div class="key-wrap" style="flex:1;">
                <div class="telegraph-key" id="rhythm-key" tabindex="0"><?= t('learn.tap_or_space') ?></div>
            </div>
            <div class="lamp-row">
                <div class="morse-lamp" id="rhythm-lamp"></div>
            </div>
        </div>

        <div class="rhythm-signal-line-labels mt-2">
            <span><?= t('learn.rhythm_signal_up_hint') ?></span>
        </div>
        <div class="rhythm-signal-line" id="rhythm-signal"></div>
        <div class="rhythm-signal-line-labels">
            <span><?= t('learn.rhythm_signal_down_hint') ?></span>
        </div>
        <div class="rhythm-tempo-hint" id="rhythm-tempo-hint"></div>
    </section>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
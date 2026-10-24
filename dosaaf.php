<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('dosaaf.title');
$activePage = 'dosaaf';
$extraScripts = ['dosaaf-data.js', 'dosaaf.js'];
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('dosaaf.eyebrow') ?></div>
<h1><?= t('dosaaf.h1') ?></h1>
<div id="live-daily-timer-mount"></div>
<p class="dosaaf-header-intro"><?= t('dosaaf.intro') ?></p>

<div class="card p-3 mb-2 dosaaf-header-advice" style="background:var(--surface-2); border-left:3px solid var(--accent); font-size:13px; line-height:1.5;">
    <?= t('dosaaf.speed_advice') ?>
</div>

<div id="dosaaf-mode">
    <div class="card mt-2">
        <div class="flex-between flex-wrap gap-2 mb-2" style="align-items:center;">
            <div class="muted small" style="font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
                <span><?= t('dosaaf.nav_label') ?></span>
                <button type="button" class="btn btn-outline" id="dosaaf-reset-progress-btn" style="padding:2px 7px; font-size:11px; line-height:1.2; border-color:var(--border); color:var(--text-muted);" title="<?= htmlspecialchars(t('dosaaf.reset_progress_title')) ?>">↺ <?= t('dosaaf.reset_progress') ?></button>
            </div>
            <div class="speed-control dosaaf-speed-box" style="margin:0;">
                <?= t('learn.speed') ?>
                <input type="range" id="dosaaf-wpm" min="5" max="35" step="1" value="12">
                <span class="speed-value" id="dosaaf-wpm-val">12</span> wpm
                <span class="muted cpm-hint" id="dosaaf-wpm-cpm"><?= t('js.common.cpm_hint', ['{cpm}' => 51]) ?></span>
            </div>
        </div>
        <div class="chip-row mt-1 dosaaf-stage-scroll" id="dosaaf-stage-chips"></div>

        <div class="mt-2" style="border-top:1px solid var(--border); padding-top:14px;">
            <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                <div>
                    <h2 class="mt-0" id="dosaaf-stage-title" style="margin-bottom:2px; font-size:18px;"></h2>
                    <p class="muted mt-0" id="dosaaf-stage-subtitle" style="font-size:13px;"></p>
                </div>
                <div class="morse-lamp" id="dosaaf-lamp"></div>
            </div>

            <div class="dosaaf-quote-box">
                <p class="dosaaf-quote-text" id="dosaaf-quote-text"></p>
                <div class="dosaaf-quote-author" id="dosaaf-quote-author"></div>
            </div>
        </div>

        <div class="chip-row mt-2 dosaaf-subtabs-scroll" id="dosaaf-subtabs">
            <div class="chip active" data-tab="napevs"><?= mw_icon('music', 13) ?> <span class="dosaaf-subtab-full"><?= t('dosaaf.tab_napevs') ?></span><span class="dosaaf-subtab-short"><?= t('dosaaf.tab_napevs_short') ?></span></div>
            <div class="chip" data-tab="words"><?= mw_icon('radio', 13) ?> <span class="dosaaf-subtab-full"><?= t('dosaaf.tab_words') ?></span><span class="dosaaf-subtab-short"><?= t('dosaaf.tab_words_short') ?></span></div>
            <div class="chip" data-tab="exam"><?= mw_icon('check-circle', 13) ?> <span class="dosaaf-subtab-full"><?= t('dosaaf.tab_exam') ?></span><span class="dosaaf-subtab-short"><?= t('dosaaf.tab_exam_short') ?></span></div>
            <div class="chip" data-tab="ranks"><?= mw_icon('award', 13) ?> <span class="dosaaf-subtab-full"><?= t('dosaaf.tab_ranks') ?></span><span class="dosaaf-subtab-short"><?= t('dosaaf.tab_ranks_short') ?></span></div>
        </div>

        <!-- 1. Карточки напевов текущей ступени -->
        <div id="dosaaf-view-napevs" class="mt-2">
            <div class="flex-between flex-wrap gap-2 mb-2" style="align-items:center;">
                <span class="muted" style="font-size:13px;" id="dosaaf-napevs-progress-text"></span>
                <div class="progress-bar" style="width:140px;"><span id="dosaaf-napevs-progress-bar" style="width:0%"></span></div>
            </div>
            <div id="dosaaf-napevs-done-msg" class="card subcard-success p-2 mb-2" style="display:none; font-size:13px;"></div>
            <p class="muted mt-0 mb-2" style="font-size:13px;"><?= t('dosaaf.napevs_desc') ?></p>
            <div class="dosaaf-napevs-grid" id="dosaaf-napevs-grid"></div>

            <!-- Кнопка прямого перехода к приёму слов после изучения напевов -->
            <div id="dosaaf-napevs-next-action" class="card subcard-success p-3 text-center mt-3" style="display:none;">
                <div class="bold" style="font-size:16px;"><?= t('dosaaf.napevs_all_done') ?></div>
                <div class="muted mt-1 mb-2" style="font-size:13px;"><?= t('dosaaf.napevs_all_done_sub') ?></div>
                <button type="button" class="btn btn-primary" id="dosaaf-goto-words-next-btn" style="font-size:14px; padding:10px 18px;">
                    <?= mw_icon('radio', 14) ?> <?= t('dosaaf.goto_words_next') ?>
                </button>
            </div>
        </div>

        <!-- 2. Тренажёр приёма смысловых слов -->
        <div id="dosaaf-view-words" class="mt-2" style="display:none;">
            <!-- Блокировка, если не все напевы изучены -->
            <div id="dosaaf-words-locked" class="card subcard-warn p-3" style="display:none;">
                <div class="bold" style="font-size:15px;"><?= mw_icon('lock', 14) ?> <?= t('dosaaf.tab_words') ?></div>
                <p class="muted mt-1 mb-2" style="font-size:13px;" id="dosaaf-words-locked-text"></p>
                <button type="button" class="btn btn-sm btn-outline" id="dosaaf-goto-napevs-btn"><?= t('dosaaf.go_to_napevs') ?></button>
            </div>

            <!-- Активная тренировка слов -->
            <div id="dosaaf-words-active">
                <div id="dosaaf-words-start-box" class="text-center p-3 mb-2" style="background:var(--surface-2); border-radius:var(--radius); border:1px dashed var(--border);">
                    <p class="muted mt-0 mb-2" style="font-size:14px;"><?= t('dosaaf.words_start_desc') ?></p>
                    <button type="button" class="btn btn-primary" id="dosaaf-start-words-btn"><?= mw_icon('play', 14) ?> <?= t('dosaaf.start_words_btn') ?></button>
                </div>

                <div id="dosaaf-words-play-box" style="display:none;">
                    <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                        <span class="muted" id="dosaaf-word-length-hint" style="font-size:13px;"></span>
                        <div class="flex-between gap-1">
                            <button type="button" class="btn btn-sm btn-outline" id="dosaaf-play-word-btn" title="<?= t('dosaaf.play_again') ?> (F7)"><?= mw_icon('volume-2', 13) ?> <?= t('dosaaf.play_again') ?> <kbd class="btn-kbd">F7</kbd></button>
                            <button type="button" class="btn btn-sm btn-outline" id="dosaaf-next-word-btn" title="<?= htmlspecialchars(t('dosaaf.next_word_title')) ?>"><?= mw_icon('skip-forward', 13) ?> <?= t('dosaaf.next_word') ?></button>
                        </div>
                    </div>

                    <div class="mt-2 flex-between gap-2 flex-wrap" style="align-items:center;">
                        <input type="text" id="dosaaf-word-input" class="answer-input"
                               placeholder="<?= htmlspecialchars(t('dosaaf.word_ph')) ?>"
                               style="text-transform:uppercase; font-size:18px; letter-spacing:1px; flex:1;" autocomplete="off">
                        <button type="button" class="btn btn-primary" id="dosaaf-check-word-btn"><?= t('dosaaf.check_btn') ?> <kbd class="btn-kbd">Enter</kbd></button>
                    </div>
                    <div class="dosaaf-layout-warning muted" id="dosaaf-words-layout-warn" style="display:none; font-size:12px; margin-top:6px; color:var(--accent);"></div>

                    <!-- Экранная клавиатура для удобного ввода с телефона -->
                    <div class="dosaaf-kbd mt-2" id="dosaaf-words-kbd"></div>

                    <div class="feedback mt-2" id="dosaaf-word-feedback"></div>

                    <div class="grid grid-3 mt-2 dosaaf-compact-stats">
                        <div class="stat"><span class="value" id="dosaaf-word-streak">0</span><span class="label"><?= mw_icon('flame', 12) ?> <?= t('dosaaf.stat_streak') ?></span></div>
                        <div class="stat"><span class="value" id="dosaaf-word-accuracy">—</span><span class="label"><?= mw_icon('target', 12) ?> <?= t('dosaaf.stat_accuracy') ?></span></div>
                        <div class="stat"><span class="value" id="dosaaf-word-total">0</span><span class="label"><?= mw_icon('check', 12) ?> <?= t('dosaaf.stat_total') ?></span></div>
                    </div>

                    <div class="card subcard p-2 mt-2 flex-between flex-wrap gap-2" style="align-items:center; background:var(--surface-2);">
                        <span class="muted small" id="dosaaf-words-goal-text"></span>
                        <div class="progress-bar" style="width:130px;"><span id="dosaaf-words-goal-bar" style="width:0%"></span></div>
                    </div>

                    <!-- Кнопка прямого перехода к зачёту ступени после набора нормы слов -->
                    <div id="dosaaf-words-next-action" class="card subcard-success p-3 text-center mt-3" style="display:none;">
                        <div class="bold" style="font-size:16px;" id="dosaaf-words-done-title"><?= t('dosaaf.words_goal_reached_title', ['{target}' => 5]) ?></div>
                        <div class="muted mt-1 mb-2" style="font-size:13px;"><?= t('dosaaf.words_goal_reached_desc') ?></div>
                        <button type="button" class="btn btn-primary" id="dosaaf-goto-exam-next-btn" style="font-size:14px; padding:10px 18px;">
                            <?= mw_icon('check-circle', 14) ?> <?= t('dosaaf.words_goal_goto_exam') ?>
                        </button>
                    </div>

                    <div id="dosaaf-words-daily-time-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:10px 14px; text-align:center; font-size:13px; color:var(--text-muted);"></div>

                    <div class="mt-2" id="dosaaf-word-history"></div>
                </div>
            </div>
        </div>

        <!-- 3. Зачёт ступени -->
        <div id="dosaaf-view-exam" class="mt-2" style="display:none;">
            <!-- Блокировка зачёта, если тренировка слов не пройдена -->
            <div id="dosaaf-exam-locked" class="card subcard-warn p-3" style="display:none;">
                <div class="bold" style="font-size:15px;"><?= mw_icon('lock', 14) ?> <?= t('dosaaf.tab_exam') ?></div>
                <p class="muted mt-1 mb-2" style="font-size:13px;" id="dosaaf-exam-locked-text"></p>
                <button type="button" class="btn btn-sm btn-outline" id="dosaaf-goto-words-btn"><?= t('dosaaf.go_to_words') ?></button>
            </div>

            <!-- Допуск к зачёту -->
            <div id="dosaaf-exam-unlocked">
                <div class="card subcard p-3">
                    <h3 class="mt-0" style="font-size:16px;"><?= t('dosaaf.exam_title') ?></h3>
                    <p class="muted" id="dosaaf-exam-desc" style="font-size:13px; line-height:1.5;"><?= t('dosaaf.exam_desc') ?></p>
                    <div class="muted small mb-2" id="dosaaf-exam-min-speed" style="color:var(--accent);"></div>

                    <!-- Выбор объёма зачёта (10 / 30 / 50 групп) -->
                    <div class="mb-3" id="dosaaf-exam-length-wrapper">
                        <span class="muted small bold d-block mb-1"><?= t('dosaaf.exam_length_label') ?></span>
                        <div class="chips-group" id="dosaaf-exam-length-chips" style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button type="button" class="chip active" data-length="10" title="<?= htmlspecialchars(t('dosaaf.exam_len_10_title')) ?>"><?= t('dosaaf.exam_len_10_chip') ?></button>
                            <button type="button" class="chip" data-length="30" title="<?= htmlspecialchars(t('dosaaf.exam_len_30_title')) ?>"><?= t('dosaaf.exam_len_30_chip') ?></button>
                            <button type="button" class="chip" data-length="50" title="<?= htmlspecialchars(t('dosaaf.exam_len_50_title')) ?>"><?= t('dosaaf.exam_len_50_chip') ?></button>
                        </div>
                    </div>

                    <div class="mt-2">
                        <button type="button" class="btn btn-primary" id="dosaaf-start-exam-btn"><?= mw_icon('play', 13) ?> <?= t('dosaaf.start_exam') ?></button>
                    </div>

                    <div id="dosaaf-exam-panel" class="mt-2" style="display:none;">
                        <div class="flex-between" style="align-items:center;">
                            <span class="muted small"><?= t('dosaaf.exam_word_counter') ?>: <b id="dosaaf-exam-progress">1 / 10</b></span>
                            <div style="display:flex; gap:8px;">
                                <button type="button" class="btn btn-sm btn-outline" id="dosaaf-exam-play-btn" title="<?= t('dosaaf.play_again') ?> (F7)"><?= mw_icon('volume-2', 13) ?> <?= t('dosaaf.play_again') ?> <kbd class="btn-kbd">F7</kbd></button>
                                <button type="button" class="btn btn-sm btn-outline" id="dosaaf-exam-stop-btn" style="color:var(--danger); border-color:rgba(239, 68, 68, 0.4);" title="<?= t('dosaaf.exam_stop_btn') ?>"><?= mw_icon('square', 13) ?> <?= t('dosaaf.exam_stop_btn') ?></button>
                            </div>
                        </div>

                        <div class="mt-2">
                            <textarea id="dosaaf-exam-input" rows="3" class="answer-input"
                                      placeholder="<?= htmlspecialchars(t('dosaaf.exam_radiogram_ph')) ?>"
                                      style="text-transform:uppercase; font-size:15px; width:100%; min-height:84px; resize:vertical; font-family:monospace; line-height:1.5; padding:10px; box-sizing:border-box;" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"></textarea>
                        </div>
                        <div class="flex-between mt-2 gap-2 flex-wrap" style="align-items:center;">
                            <div class="muted small" style="font-size:12px;" id="dosaaf-exam-audio-status">
                                🎧 Приём радиограммы...
                            </div>
                            <button type="button" class="btn btn-primary" id="dosaaf-exam-check-btn"><?= t('dosaaf.check_exam_btn') ?> <kbd class="btn-kbd">Ctrl+Enter</kbd></button>
                        </div>
                        <div class="dosaaf-layout-warning muted" id="dosaaf-exam-layout-warn" style="display:none; font-size:12px; margin-top:6px; color:var(--accent);"></div>

                        <!-- Экранная клавиатура для зачёта -->
                        <div class="dosaaf-kbd mt-2" id="dosaaf-exam-kbd"></div>
                    </div>

                    <div id="dosaaf-exam-result" style="display:none;"></div>
                    <div id="dosaaf-exam-daily-time-block" class="card mt-2" style="display:none; background:var(--surface-2); padding:10px 14px; text-align:center; font-size:13px; color:var(--text-muted);"></div>
                </div>
            </div>
        </div>

        <!-- 4. Классность ДОСААФ -->
        <div id="dosaaf-view-ranks" class="mt-2" style="display:none;">
            <p class="muted mt-0 mb-2" style="font-size:13px;"><?= t('dosaaf.ranks_desc') ?></p>
            <div id="dosaaf-current-rank-card" class="card subcard p-3 mb-2" style="border:1px solid var(--accent); background:rgba(230, 168, 34, 0.08);"></div>
            <div id="dosaaf-ranks-list"></div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

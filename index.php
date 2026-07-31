<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('nav.home');
$activePage = 'index';
$pageScript = 'home.js';
include __DIR__ . '/includes/header.php';
?>

<section class="hero">
    <div class="card-eyebrow">· − · · · − &nbsp;· · − &nbsp;· −</div>
    <h1><?= t('index.hero_title') ?></h1>
    <p class="lead"><?= t('index.hero_lead') ?></p>

    <div id="hero-signal" class="signal-line" style="margin: 20px 0;"></div>

    <div class="btn-row" style="align-items:center;">
        <a href="learn.php" class="btn btn-primary"><?= t('index.start_letters') ?></a>
        <a href="koch.php" class="btn-quiet"><?= t('index.koch_method') ?></a>
    </div>
</section>

<!-- Промо мини-игры. Стоит сразу под hero намеренно: сам режим живёт
     ЧЕТВЁРТЫМ подрежимом внутри «Букв», а те, кто буквы давно прошёл, на
     эту вкладку уже не заходят и про новинку просто не узнают (прямая
     просьба владельца, v2.55). Обычная секция в потоке страницы, а не
     что-то абсолютно спозиционированное — поэтому на телефоне карточка
     честно попадает на первый экран, без отдельных медиазапросов.
     Ссылка ведёт СРАЗУ в режим (learn.php?mode=invasion — см.
     applyModeFromUrl в learn.js), а не просто на страницу букв. -->
<section class="section">
    <div class="card promo-card">
        <div class="promo-card-emoji" aria-hidden="true">👾</div>
        <div class="promo-card-body">
            <div class="card-eyebrow"><?= t('index.invasion_eyebrow') ?> <span class="badge-beta">BETA</span></div>
            <h3 class="mt-0"><?= t('index.invasion_title') ?></h3>
            <p class="muted"><?= t('index.invasion_text') ?></p>
            <a href="learn.php?mode=invasion" class="btn btn-primary btn-sm"><?= t('index.invasion_btn') ?></a>
        </div>
    </div>
</section>

<section class="section">
    <!-- Пробовали "тихую" строку без карточек — стало сложнее считывать
         на глаз, что вообще происходит на странице (владелец: "хоть и
         шумно, но раньше было понятно"). Вернули крупные карточки. -->
    <div class="grid grid-4">
        <div class="card stat">
            <span class="label"><?= t('index.stat_xp') ?></span>
            <span class="value" data-nav-xp>0</span>
        </div>
        <div class="card stat">
            <span class="label"><?= t('index.stat_level') ?></span>
            <span class="value" data-nav-level>1</span>
        </div>
        <div class="card stat">
            <span class="label"><?= t('index.stat_streak') ?></span>
            <span class="value">🔥 <span data-nav-streak>0</span></span>
        </div>
        <div class="card stat">
            <span class="label"><?= t('index.stat_learned') ?></span>
            <span class="value" id="home-learned-count">0</span>
        </div>
    </div>
</section>

<section class="section" id="leaderboard-section">
    <div class="flex-between flex-wrap gap-2">
        <h2 class="mt-0 flex gap-1" style="align-items:center;"><?= mw_icon('trophy', 20) ?> <?= t('index.leaderboard_title') ?></h2>
        <a href="account.php" class="btn btn-sm"><?= t('index.leaderboard_join') ?></a>
    </div>
    <p class="muted mt-0" style="font-size:13px;"><?= t('index.leaderboard_intro') ?></p>

    <div class="card mt-2">
        <div class="chip-row">
            <div class="chip active" data-board="xp"><?= t('index.board_by_xp') ?></div>
            <div class="chip" data-board="streak"><?= t('index.board_by_streak') ?></div>
        </div>
        <div class="mt-2" id="leaderboard-xp"><p class="muted"><?= t('index.loading') ?></p></div>
        <div class="mt-2" id="leaderboard-streak" style="display:none;"><p class="muted"><?= t('index.loading') ?></p></div>
        <div class="mt-2" style="text-align:right;">
            <a href="leaderboard.php" class="link" style="font-size:13px;"><?= t('index.leaderboard_view_all') ?></a>
        </div>
    </div>
</section>

<section class="section">
    <div class="card-eyebrow"><?= t('index.start_eyebrow') ?></div>
    <h2><?= t('index.start_h2') ?></h2>
    <p class="muted"><?= t('index.start_intro') ?></p>

    <div class="onboarding-steps mt-3">
        <div class="onboarding-step">
            <div class="step-num">1</div>
            <div class="step-content">
                <div class="step-icon"><?= mw_icon('book', 22) ?></div>
                <h3><?= t('index.step1_title') ?></h3>
                <p><?= t('index.step1_text') ?></p>
                <a href="learn.php" class="btn btn-primary btn-sm"><?= t('index.step1_btn') ?></a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">2</div>
            <div class="step-content">
                <div class="step-icon"><?= mw_icon('target', 22) ?></div>
                <h3><?= t('index.step2_title') ?></h3>
                <p><?= t('index.step2_text') ?></p>
                <a href="koch.php" class="btn btn-sm"><?= t('index.step2_btn') ?></a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">3</div>
            <div class="step-content">
                <div class="step-icon">🔢</div>
                <h3><?= t('index.step3_title') ?></h3>
                <p><?= t('index.step3_text') ?></p>
                <a href="groups.php" class="btn btn-sm"><?= t('index.step3_btn') ?></a>
            </div>
        </div>

        <div class="onboarding-step">
            <div class="step-num">4</div>
            <div class="step-content">
                <div class="step-icon">📡</div>
                <h3><?= t('index.step4_title') ?></h3>
                <p><?= t('index.step4_text') ?></p>
                <div class="btn-row">
                    <a href="callsigns.php" class="btn btn-sm"><?= t('index.step4_btn_callsigns') ?></a>
                    <a href="groups.php" class="btn btn-sm"><?= t('index.step4_btn_abbrev') ?></a>
                </div>
            </div>
        </div>

        <!-- Пятым шагом — связка с родственным проектом Morse Walker (r9o.ru).
             Сознательно внутри «пути новичка», а не отдельной секцией ниже:
             это логичное продолжение маршрута (приём отдельных знаков → работа
             в эфире), и так «Задание дня» не уезжает вниз страницы. -->
        <div class="onboarding-step">
            <div class="step-num">5</div>
            <div class="step-content">
                <div class="step-icon">📻</div>
                <h3><?= t('index.step5_title') ?></h3>
                <p><?= t('index.step5_text') ?></p>
                <p class="muted" style="font-size:12px;"><?= strtr(t('index.step5_credit'), [
                    '{author}' => '<a href="https://github.com/sc0tfree/morsewalker" target="_blank" rel="noopener">W6NYC</a>',
                    '{adapter}' => '<a href="https://github.com/loloka/morsewalker" target="_blank" rel="noopener">R9OGL</a>',
                ]) ?></p>
                <a href="https://morse.r9o.ru" class="btn btn-primary btn-sm" target="_blank" rel="noopener"><?= t('index.step5_btn') ?></a>
            </div>
        </div>
    </div>
</section>

<section class="section card daily-card" id="daily-card">
    <div class="card-eyebrow flex gap-1" style="align-items:center;"><?= mw_icon('target', 14) ?> <?= t('index.daily_eyebrow') ?></div>
    <h3 id="daily-title"><?= t('index.loading') ?></h3>
    <p id="daily-desc" class="mt-0"></p>
    <a href="#" id="daily-link" class="btn btn-primary"><?= t('index.daily_btn') ?></a>
</section>

<section class="section card" id="community-stats">
    <div class="card-eyebrow"><?= t('index.community_eyebrow') ?></div>
    <p class="mt-0"><?= strtr(t('index.community_text'), [
        '{groups}' => '<b class="mono" id="stat-groups">…</b>',
        '{callsigns}' => '<b class="mono" id="stat-callsigns">…</b>',
    ]) ?></p>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>

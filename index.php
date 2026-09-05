<?php
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('nav.home');
$activePage = 'index';
$pageScript = 'home.js';
include __DIR__ . '/includes/header.php';
?>

<!-- Герой — раньше h1/lead были жёстко ограничены по ширине (max-width,
     см. .hero h1/.hero p.lead в style.css) просто для читаемости строки, и
     на широких экранах это оставляло пустой прямоугольник справа от текста
     (реальный фидбек владельца, 2026-08-01: "смотри какой там пустующий
     квадрат"). Промо мини-игры раньше стояло отдельной секцией НИЖЕ hero —
     теперь это вторая колонка .hero-grid, занимает именно то пустое место.
     На мобильном/узком экране .hero-grid схлопывается в одну колонку (см.
     media query в style.css) — получается ровно то же поведение, что было
     раньше у отдельной секции: промо идёт в потоке сразу за текстом и
     честно попадает на первый экран, без отдельных мобильных правил под
     эту карточку. Ссылка по-прежнему ведёт СРАЗУ в режим
     (learn.php?mode=invasion — см. applyModeFromUrl в learn.js). -->
<section class="hero">
    <div class="hero-grid">
        <div class="hero-main">
            <div class="card-eyebrow">· − · · · − &nbsp;· · − &nbsp;· −</div>
            <h1><?= t('index.hero_title') ?></h1>
            <p class="lead"><?= t('index.hero_lead') ?></p>

            <div id="hero-signal" class="signal-line" style="margin: 20px 0;"></div>

            <div class="btn-row" style="align-items:center;">
                <a href="learn.php" class="btn btn-primary"><?= t('index.start_letters') ?></a>
                <a href="koch.php" class="btn-quiet"><?= t('index.koch_method') ?></a>
            </div>
        </div>

        <div class="hero-promo">
            <div class="card promo-card">
                <!-- Интерактивная дуэль-шапка: монстр против боевой лопаты -->
                <div class="promo-card-arena">
                    <div class="promo-fighter monster">
                        <div class="promo-fighter-sprite" aria-hidden="true">👾</div>
                        <div class="promo-fighter-info">
                            <span class="promo-fighter-name"><?= t('index.invasion_enemy_role') ?></span>
                            <span class="promo-fighter-title"><?= t('index.invasion_enemy_name') ?></span>
                        </div>
                    </div>
                    <div class="promo-arena-vs">
                        <span class="promo-arena-code" aria-hidden="true">· · − ·</span>
                        <span class="promo-arena-badge">VS</span>
                    </div>
                    <div class="promo-fighter shovel">
                        <div class="promo-fighter-sprite" aria-hidden="true">
                            <svg viewBox="0 0 32 32" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3 C13 1.5, 19 1.5, 19 3 L19 8 C19 9.5, 13 9.5, 13 8 Z" stroke="#e0473b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                                <line x1="16" y1="8" x2="16" y2="19" stroke="#c98a3e" stroke-width="2.5" stroke-linecap="round"/>
                                <rect x="14" y="18" width="4" height="2.5" rx="0.5" fill="#9aa0a6"/>
                                <path d="M11 20.5 L21 20.5 L19.5 26.5 L16 30 L12.5 26.5 Z" fill="#d8dee3" stroke="#6b7075" stroke-width="1.2"/>
                                <path d="M14 22 L15.5 28" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
                            </svg>
                        </div>
                        <div class="promo-fighter-info">
                            <span class="promo-fighter-name"><?= t('index.invasion_weapon_role') ?></span>
                            <span class="promo-fighter-title"><?= t('index.invasion_weapon_name') ?></span>
                        </div>
                    </div>
                </div>

                <div class="promo-card-body">
                    <div class="promo-card-top">
                        <div class="card-eyebrow"><?= t('index.invasion_eyebrow') ?> <span class="badge-beta">BETA</span> <span class="badge-v">v2.86</span></div>
                        <span class="promo-card-stages-badge"><?= t('index.invasion_badge_stages') ?></span>
                    </div>
                    <h3 class="promo-card-title"><?= t('index.invasion_title') ?></h3>
                    <p class="promo-card-desc"><?= t('index.invasion_text') ?></p>

                    <!-- Отдельный абзац с подсветкой исправлений -->
                    <div class="promo-card-highlight">
                        <span class="highlight-icon" aria-hidden="true">⚡</span>
                        <span><?= t('index.invasion_highlight') ?></span>
                    </div>

                    <div class="promo-card-footer">
                        <a href="learn.php?mode=invasion" class="btn btn-primary btn-sm"><?= t('index.invasion_btn') ?></a>
                        <span class="promo-weapon-tag"><?= t('index.invasion_weapon_footer') ?></span>
                    </div>
                </div>
            </div>
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

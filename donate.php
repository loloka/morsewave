<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/donation_service.php';
ensure_donation_tables($pdo);

$pageTitle = t('donate.h1');
$activePage = 'donate';
$pageScript = 'donate.js';
$currentUser = current_user($pdo);

include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('donate.eyebrow') ?></div>
<h1><?= t('donate.h1') ?></h1>

<div class="card mt-2">
    <p style="font-size:15px; line-height:1.6; margin:0;">
        <?= t('donate.intro') ?>
    </p>
</div>

<!-- Appreciation Tiers -->
<div class="mt-4">
    <div class="card-eyebrow">CW SUPPORT TIERS</div>
    <h2><?= t('donate.cards_title') ?></h2>

    <div class="donate-tiers-grid">
        <div class="donate-tier-card" data-amount="150" data-tier="<?= htmlspecialchars(t('donate.tier1_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount">150 ₽</span>
                <span style="font-size:20px;">☕</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier1_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier1_desc') ?></div>
        </div>

        <div class="donate-tier-card" data-amount="350" data-tier="<?= htmlspecialchars(t('donate.tier2_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount">350 ₽</span>
                <span style="font-size:20px;">⚡</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier2_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier2_desc') ?></div>
        </div>

        <div class="donate-tier-card" data-amount="750" data-tier="<?= htmlspecialchars(t('donate.tier3_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount">750 ₽</span>
                <span style="font-size:20px;">📻</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier3_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier3_desc') ?></div>
        </div>

        <div class="donate-tier-card active" data-amount="1500" data-tier="<?= htmlspecialchars(t('donate.tier4_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount">1 500 ₽</span>
                <span style="font-size:20px;">📡</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier4_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier4_desc') ?></div>
        </div>

        <div class="donate-tier-card" data-amount="3000" data-tier="<?= htmlspecialchars(t('donate.tier5_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount">3 000 ₽</span>
                <span style="font-size:20px;">💡</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier5_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier5_desc') ?></div>
        </div>

        <div class="donate-tier-card" data-amount="0" data-tier="<?= htmlspecialchars(t('donate.tier0_title')) ?>">
            <div class="donate-tier-header">
                <span class="donate-tier-amount" style="color:var(--signal);">0 ₽</span>
                <span style="font-size:20px;">💌</span>
            </div>
            <div class="donate-tier-title"><?= t('donate.tier0_title') ?></div>
            <div class="donate-tier-desc"><?= t('donate.tier0_desc') ?></div>
        </div>
    </div>

    <p class="muted" style="font-size:13px; font-style:italic; text-align:center; margin-top:8px;">
        <?= t('donate.critique_humor') ?>
    </p>
</div>

<!-- SBP Payment Box -->
<div class="sbp-card mt-4" id="sbp-block">
    <div class="card-eyebrow" style="color:var(--accent);">СБП · БЫСТРЫЙ ПЛАТЁЖ</div>
    <h2 class="mt-1 mb-2"><?= t('donate.sbp_title') ?></h2>
    <p class="muted" style="max-width:550px; margin:0 auto 16px;">
        <?= t('donate.sbp_desc') ?>
    </p>

    <div class="sbp-qr-wrap">
        <img src="assets/img/ozon_sbp_qr.png" alt="СБП QR Ozon Банк" class="sbp-qr-img" />
    </div>

    <div style="margin:10px 0 16px; font-size:14.5px;">
        <span class="muted"><?= t('donate.sbp_recipient') ?>:</span> <strong>Александр А.</strong>
        <span class="dot">·</span>
        <span class="muted"><?= t('donate.sbp_bank') ?>:</span> <strong>Ozon Банк</strong>
    </div>

    <div class="btn-row" style="justify-content:center; gap:10px; margin-bottom:14px;">
        <a href="https://finance.ozon.ru/apps/sbp/ozonbankpay/01a0c427-d792-7435-8819-ce9c84f7b78e" target="_blank" rel="noopener" class="btn" style="background:var(--accent); color:#111; font-weight:700;">
            <?= t('donate.sbp_open_app') ?>
        </a>
        <button type="button" id="copy-sbp-link-btn" class="btn" data-link="https://finance.ozon.ru/apps/sbp/ozonbankpay/01a0c427-d792-7435-8819-ce9c84f7b78e">
            <?= t('donate.sbp_copy_link') ?>
        </button>
    </div>

    <p class="muted" style="font-size:12.5px; max-width:520px; margin:0 auto;">
        ℹ️ <?= t('donate.sbp_note') ?>
    </p>
</div>

<!-- Report / Send Thanks Form -->
<div class="card mt-4" id="donate-report-form-card">
    <h3 class="mt-0 mb-2">💬 <?= t('donate.form_title') ?></h3>
    <p class="muted" style="font-size:13px; margin-bottom:16px;">
        Если вы сделали перевод или просто хотите отправить автору добрые пожелания (0 ₽) — заполните форму ниже. Сообщение появится на Стене признания, а вам откроется памятное достижение «Друг MorseWave» 💖!
    </p>

    <form id="donate-report-form">
        <div class="grid grid-2">
            <div>
                <label for="donate-callsign" style="display:block; font-size:13px; font-weight:700; margin-bottom:6px;">
                    <?= t('donate.form_callsign') ?>
                </label>
                <input type="text" id="donate-callsign" name="callsign" value="<?= htmlspecialchars($currentUser['name'] ?? '') ?>" placeholder="R9OGL / Иван" style="width:100%; box-sizing:border-box;" required />
            </div>
            <div>
                <label for="donate-amount" style="display:block; font-size:13px; font-weight:700; margin-bottom:6px;">
                    <?= t('donate.form_amount') ?>
                </label>
                <input type="number" id="donate-amount" name="amount" value="1500" min="0" step="50" style="width:100%; box-sizing:border-box;" />
            </div>
        </div>

        <div style="margin-top:14px;">
            <label for="donate-message" style="display:block; font-size:13px; font-weight:700; margin-bottom:6px;">
                <?= t('donate.form_message') ?>
            </label>
            <textarea id="donate-message" name="message" rows="3" placeholder="Спасибо за отличный тренажёр! 73 & DX..." style="width:100%; box-sizing:border-box; resize:vertical;"></textarea>
        </div>

        <div style="margin-top:14px; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="donate-anonymous" name="is_anonymous" style="width:18px; height:18px; cursor:pointer;" />
            <label for="donate-anonymous" style="font-size:13.5px; cursor:pointer; user-select:none;">
                <?= t('donate.form_anonymous') ?>
            </label>
        </div>

        <input type="hidden" id="donate-tier-title" name="tier_title" value="<?= htmlspecialchars(t('donate.tier4_title')) ?>" />

        <div style="margin-top:18px;" class="flex-between flex-wrap gap-2">
            <button type="submit" class="btn" style="background:var(--accent); color:#111; font-weight:700; font-size:15px; padding:10px 22px;">
                <?= t('donate.form_submit') ?>
            </button>
            <span id="donate-form-status" style="font-size:14px; font-weight:600;"></span>
        </div>
    </form>
</div>

<!-- Wall of Fame -->
<div class="mt-5" id="wall-section">
    <div class="card-eyebrow">WALL OF APPRECIATION</div>
    <h2><?= t('donate.wall_title') ?></h2>
    <p class="muted" style="margin-bottom:14px;">
        <?= t('donate.wall_intro') ?>
    </p>

    <div class="wall-grid" id="wall-grid">
        <p class="muted"><?= t('index.loading') ?></p>
    </div>
</div>

<!-- Other Payment Methods -->
<div class="card mt-4" style="border-style:dashed;">
    <h4 class="mt-0 mb-1">🌍 <?= t('donate.other_methods_title') ?></h4>
    <p class="muted" style="font-size:13px; margin:0; line-height:1.5;">
        <?= t('donate.other_methods_desc') ?>
    </p>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

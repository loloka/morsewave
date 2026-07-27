<?php
require __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('acc.title');
$activePage = 'account';
$pageScript = 'account.js';
$loggedInUser = current_user($pdo);
// Дальше — только рендер статичной разметки, $_SESSION не трогаем.
// Закрываем блокировку сессии пораньше: эта страница на телефоне
// параллельно грузит ещё api/me.php, api/captcha.php, api/achievements.php
// с тем же cookie — без этого они выстраиваются в очередь друг за другом.
session_write_close();
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow"><?= t('acc.eyebrow') ?></div>
<h1><?= t('acc.h1') ?></h1>

<!-- Вкладки: звук/отображение/бэкап доступны и без аккаунта, поэтому панель
     "Профиль" внутри сама переключает вид гость/залогинен (account.js). -->
<div class="account-tabs" id="account-tabs" role="tablist">
    <button class="chip active" data-tab="profile"><?= t('acc.tab_profile') ?></button>
    <button class="chip" data-tab="sound"><?= t('acc.tab_sound') ?></button>
    <button class="chip" data-tab="display"><?= t('acc.tab_display') ?></button>
    <button class="chip" data-tab="backup"><?= t('acc.tab_backup') ?></button>
</div>

<!-- ======================= ВКЛАДКА: ПРОФИЛЬ ======================= -->
<div class="account-tab-panel" data-tab-panel="profile">
    <p class="muted mt-2" style="font-size:13px;"><?= t('acc.profile_intro') ?></p>

    <div id="guest-block" style="display:none;">
        <div class="mode-switch">
            <div class="chip active" data-mode="login"><?= t('acc.mode_login') ?></div>
            <div class="chip" data-mode="register"><?= t('acc.mode_register') ?></div>
        </div>

        <div class="card mt-2" id="login-form">
            <h3><?= t('acc.login_h3') ?></h3>
            <input type="email" id="login-email" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.email_ph')) ?>" autocomplete="email" style="text-transform:none;">
            <input type="password" id="login-password" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('acc.password_ph')) ?>" autocomplete="current-password" style="text-transform:none;">
            <button class="btn btn-primary mt-2" id="login-btn"><?= t('acc.login_btn') ?></button>
            <div class="feedback mt-2" id="login-feedback"></div>
            <p class="muted mt-2" style="font-size:13px;">
                <a href="#" id="forgot-link"><?= t('acc.forgot_link') ?></a>
            </p>
        </div>

        <div class="card mt-2" id="reset-request-form" style="display:none;">
            <h3><?= t('acc.reset_request_h3') ?></h3>
            <p class="mt-0 muted" style="font-size:13px;"><?= t('acc.reset_request_intro') ?></p>
            <input type="email" id="reset-email" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.reset_email_ph')) ?>" autocomplete="email" style="text-transform:none;">

            <div class="mt-2">
                <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.captcha_hint') ?></div>
                <div class="morse-pattern" id="reset-captcha-pattern" style="font-size:22px;"></div>
                <div class="btn-row mt-1">
                    <button type="button" class="btn btn-sm" id="reset-captcha-play-btn"><?= t('acc.listen_btn') ?></button>
                    <button type="button" class="btn btn-sm" id="reset-captcha-refresh-btn"><?= t('acc.other_code_btn') ?></button>
                </div>
                <input type="text" id="reset-captcha-answer" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.captcha_answer_ph')) ?>" autocomplete="off">
            </div>

            <button class="btn btn-primary mt-2" id="reset-request-btn"><?= t('acc.send_link_btn') ?></button>
            <div class="feedback mt-2" id="reset-request-feedback"></div>
        </div>

        <div class="card mt-2" id="reset-password-form" style="display:none;">
            <h3><?= t('acc.new_password_h3') ?></h3>
            <p class="mt-0 muted" style="font-size:13px;"><?= t('acc.new_password_intro') ?></p>
            <input type="password" id="reset-new-password" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.new_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">
            <input type="password" id="reset-new-password-confirm" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('acc.repeat_new_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">
            <button class="btn btn-primary mt-2" id="reset-password-btn"><?= t('acc.save_password_btn') ?></button>
            <div class="feedback mt-2" id="reset-password-feedback"></div>
        </div>

        <div class="card mt-2" id="register-form" style="display:none;">
            <h3><?= t('acc.register_h3') ?></h3>
            <p class="mt-0 muted" style="font-size:13px;"><?= t('acc.register_intro') ?></p>
            <input type="text" id="register-name" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.register_name_ph')) ?>" autocomplete="nickname" style="text-transform:none;">
            <input type="email" id="register-email" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('acc.register_email_ph')) ?>" autocomplete="email" style="text-transform:none;">
            <input type="password" id="register-password" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('acc.register_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">
            <input type="password" id="register-password-confirm" class="answer-input mt-2" placeholder="<?= htmlspecialchars(t('acc.repeat_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">

            <div class="mt-2">
                <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.captcha_hint') ?></div>
                <div class="morse-pattern" id="captcha-pattern" style="font-size:22px;"></div>
                <div class="btn-row mt-1">
                    <button type="button" class="btn btn-sm" id="captcha-play-btn"><?= t('acc.listen_btn') ?></button>
                    <button type="button" class="btn btn-sm" id="captcha-refresh-btn"><?= t('acc.other_code_btn') ?></button>
                </div>
                <input type="text" id="captcha-answer" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.captcha_answer_ph')) ?>" autocomplete="off">
            </div>

            <label for="register-agree" class="mt-2" style="display:flex;gap:8px;align-items:flex-start;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="register-agree" style="margin-top:3px;flex:0 0 auto;">
                <span><?= t('acc.agree_prefix') ?> <a href="terms.php" target="_blank" rel="noopener" class="link"><?= t('acc.agree_terms') ?></a>
                    <?= t('acc.agree_and') ?> <a href="privacy.php" target="_blank" rel="noopener" class="link"><?= t('acc.agree_privacy') ?></a><?= t('acc.agree_suffix') ?></span>
            </label>

            <button class="btn btn-primary mt-2" id="register-btn"><?= t('acc.create_account_btn') ?></button>
            <div class="feedback mt-2" id="register-feedback"></div>
        </div>
    </div>

    <div id="profile-block" style="display:none;">
        <div class="card mt-2">
            <div class="flex-between flex-wrap gap-2">
                <div>
                    <div class="card-eyebrow"><?= t('acc.logged_in_as') ?></div>
                    <h2 class="mt-0" id="profile-name" style="margin-bottom:0;"></h2>
                    <p class="muted mt-0" id="profile-email" style="font-size:13px;"></p>
                </div>
                <div class="btn-row" id="profile-actions">
                    <?php if (is_admin_user($loggedInUser)): ?>
                    <a href="admin.php" id="admin-link" class="btn btn-sm"><?= t('acc.admin_link') ?></a>
                    <?php endif; ?>
                    <button class="btn" id="logout-btn" title="<?= htmlspecialchars(t('acc.logout_title')) ?>"><?= t('acc.logout_btn') ?></button>
                </div>
            </div>
            <p class="muted mt-1" style="font-size:12px;"><?= t('acc.logout_note') ?></p>
            <div class="flex-between flex-wrap gap-2 mt-1" style="align-items:center;">
                <div class="muted" id="sync-indicator" style="font-size:12px;"></div>
                <button class="btn btn-sm" id="manual-sync-btn" title="<?= htmlspecialchars(t('acc.manual_sync_title')) ?>"><?= t('acc.manual_sync_btn') ?></button>
            </div>
            <div class="feedback mt-1" id="manual-sync-feedback"></div>
            <div class="mt-2" id="verify-status"></div>
        </div>

        <div class="card mt-2">
            <h3><?= t('acc.publish_h3') ?></h3>
            <p class="mt-0 muted" style="font-size:13px;"><?= t('acc.publish_intro') ?></p>
            <div class="grid grid-2 mt-2">
                <div class="stat"><span class="value" id="local-xp">0</span><span class="label"><?= t('acc.local_xp') ?></span></div>
                <div class="stat"><span class="value" id="local-streak">0</span><span class="label"><?= t('acc.local_streak') ?></span></div>
            </div>
            <button class="btn btn-primary mt-2" id="sync-btn"><?= t('acc.publish_btn') ?></button>
            <div class="feedback mt-2" id="sync-feedback"></div>
        </div>

        <!-- Редкие действия со аккаунтом — под раскрывашкой, чтобы не растягивать
             вкладку. Открывается по клику, IDs внутри не менялись. -->
        <details class="card mt-2" id="account-settings-details">
            <summary style="cursor:pointer;font-weight:600;"><?= t('acc.settings_summary') ?></summary>

            <div class="mt-2">
                <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.name_hint') ?></div>
                <input type="text" id="change-name-input" class="answer-input" placeholder="<?= htmlspecialchars(t('acc.register_name_ph')) ?>" autocomplete="nickname" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-name-btn"><?= t('acc.change_name_btn') ?></button>
                <div class="feedback mt-1" id="change-name-feedback"></div>
            </div>

            <div class="mt-3">
                <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.change_password_hint') ?></div>
                <input type="password" id="change-pass-current" class="answer-input" placeholder="<?= htmlspecialchars(t('acc.current_password_ph')) ?>" autocomplete="current-password" style="text-transform:none;">
                <input type="password" id="change-pass-new" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.new_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">
                <input type="password" id="change-pass-confirm" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.repeat_new_password_ph')) ?>" autocomplete="new-password" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-pass-btn"><?= t('acc.change_password_btn') ?></button>
                <div class="feedback mt-1" id="change-pass-feedback"></div>
            </div>

            <div class="mt-3">
                <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.change_email_hint') ?></div>
                <input type="password" id="change-email-pass" class="answer-input" placeholder="<?= htmlspecialchars(t('acc.current_password_ph')) ?>" autocomplete="current-password" style="text-transform:none;">
                <input type="email" id="change-email-new" class="answer-input mt-1" placeholder="<?= htmlspecialchars(t('acc.new_email_ph')) ?>" autocomplete="email" style="text-transform:none;">
                <button class="btn btn-sm mt-1" id="change-email-btn"><?= t('acc.change_email_btn') ?></button>
                <div class="feedback mt-1" id="change-email-feedback"></div>
            </div>
        </details>

        <!-- Опасная зона: удаление аккаунта. -->
        <div class="card mt-2" style="border-color:var(--danger);">
            <h3 class="mt-0" style="color:var(--danger);"><?= t('acc.delete_account_h3') ?></h3>
            <p class="mt-0 muted" style="font-size:13px;"><?= t('acc.delete_account_intro') ?> <a href="mailto:morse@r9o.ru">morse@r9o.ru</a>.</p>
            <button class="btn btn-sm" id="delete-account-reveal-btn" style="border-color:var(--danger);color:var(--danger);"><?= t('acc.delete_account_reveal_btn') ?></button>
            <div id="delete-account-confirm" style="display:none;" class="mt-2">
                <input type="password" id="delete-account-pass" class="answer-input" placeholder="<?= htmlspecialchars(t('acc.delete_confirm_ph')) ?>" autocomplete="current-password" style="text-transform:none;">
                <div class="btn-row mt-1">
                    <button class="btn btn-sm" id="delete-account-cancel-btn"><?= t('acc.cancel_btn') ?></button>
                    <button class="btn btn-sm" id="delete-account-confirm-btn" style="border-color:var(--danger);color:var(--danger);"><?= t('acc.delete_confirm_btn') ?></button>
                </div>
                <div class="feedback mt-1" id="delete-account-feedback"></div>
            </div>
        </div>
    </div>
</div>

<!-- ======================= ВКЛАДКА: ЗВУК ======================= -->
<div class="account-tab-panel" data-tab-panel="sound" style="display:none;">
    <h2 class="mt-2"><?= t('acc.sound_h2') ?></h2>
    <p class="muted" style="font-size:13px;"><?= t('acc.sound_intro') ?></p>

    <div class="card mt-2">
        <div class="mt-1">
            <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.tone_freq_hint') ?></div>
            <div class="speed-control">
                <input type="range" id="tone-freq" min="300" max="1000" step="10" value="600">
                <span class="speed-value mono" id="tone-freq-value">600</span> Hz
            </div>
        </div>

        <div class="mt-3">
            <div class="muted" style="font-size:13px;margin-bottom:6px;"><?= t('acc.waveform_hint') ?></div>
            <div class="chip-row" id="waveform-chips">
                <div class="chip active" data-wave="sine"><?= t('acc.wave_sine') ?></div>
                <div class="chip" data-wave="triangle"><?= t('acc.wave_triangle') ?></div>
                <div class="chip" data-wave="square"><?= t('acc.wave_square') ?></div>
                <div class="chip" data-wave="sawtooth"><?= t('acc.wave_sawtooth') ?></div>
            </div>
        </div>

        <div class="btn-row mt-3">
            <button class="btn btn-primary" id="test-tone-btn"><?= t('acc.test_tone_btn') ?></button>
            <button class="btn" id="reset-tone-btn"><?= t('acc.reset_tone_btn') ?></button>
        </div>

        <p class="muted mt-2" style="font-size:12px;">
            <?= t('acc.tone_note') ?>
        </p>
    </div>
</div>

<!-- ======================= ВКЛАДКА: ОТОБРАЖЕНИЕ ======================= -->
<div class="account-tab-panel" data-tab-panel="display" style="display:none;">
    <h2 class="mt-2"><?= t('acc.display_h2') ?></h2>
    <div class="card mt-2">
        <label class="flex gap-2" style="align-items:center; cursor:pointer;">
            <input type="checkbox" id="show-signal-line-toggle" checked>
            <span><?= t('acc.signal_line_label') ?></span>
        </label>
        <p class="muted mt-2" style="font-size:12px;">
            <?= t('acc.signal_line_note') ?>
        </p>
    </div>
</div>

<!-- ======================= ВКЛАДКА: БЭКАП ======================= -->
<div class="account-tab-panel" data-tab-panel="backup" style="display:none;">
    <h2 class="mt-2"><?= t('acc.backup_h2') ?></h2>
    <p class="muted" style="font-size:13px;"><?= t('acc.backup_intro') ?></p>

    <div class="card mt-2">
        <div class="btn-row">
            <button class="btn btn-primary" id="backup-export-btn"><?= t('acc.backup_export_btn') ?></button>
            <button class="btn" id="backup-import-btn"><?= t('acc.backup_import_btn') ?></button>
        </div>
        <input type="file" id="backup-file-input" accept="application/json,.json" style="display:none;">
        <div class="feedback mt-2" id="backup-feedback"></div>
        <p class="muted mt-2" style="font-size:12px;">
            <?= t('acc.backup_note') ?>
        </p>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

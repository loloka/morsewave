<?php
require __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/i18n.php';
$pageTitle = t('admin.title');
$activePage = 'admin';
$pageScript = 'admin.js';
$loggedInUser = current_user($pdo);
include __DIR__ . '/includes/header.php';

if (!is_admin_user($loggedInUser)) {
    echo '<div class="card"><p>' . htmlspecialchars(t('admin.forbidden')) . '</p></div>';
    include __DIR__ . '/includes/footer.php';
    exit;
}
?>

<div class="card-eyebrow"><?= t('admin.eyebrow') ?></div>
<h1><?= t('admin.h1') ?></h1>

<!-- Segmented Navigation for Admin Sections -->
<div class="segmented-nav mb-3" id="admin-tabs" style="display:grid; grid-template-columns: repeat(3, 1fr); max-width: 600px; margin-bottom: 20px;">
    <button type="button" class="segmented-tab active" data-tab="users"><?= t('admin.tab_users') ?></button>
    <button type="button" class="segmented-tab" data-tab="donations"><?= t('admin.tab_donations') ?></button>
    <button type="button" class="segmented-tab" data-tab="chat"><?= t('admin.tab_chat') ?></button>
</div>

<!-- TAB 1: USERS -->
<div id="tab-content-users">
    <p class="muted"><?= t('admin.total_accounts') ?> <b class="mono" id="admin-user-count">…</b></p>

    <div style="margin-bottom: 20px;">
        <label for="admin-sort-select" style="margin-right: 10px;">Сортировка:</label>
        <select id="admin-sort-select" style="padding: 5px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--text);">
            <option value="date_desc">По дате регистрации</option>
            <option value="active_desc">По последней активности</option>
            <option value="xp_desc">По макс опыту</option>
        </select>
    </div>

    <div id="admin-users-list"><p class="muted"><?= t('admin.loading') ?></p></div>
</div>

<!-- TAB 2: DONATIONS & WALL OF FAME -->
<div id="tab-content-donations" style="display:none;">
    <h3 class="mt-0"><?= t('admin.donations.title') ?></h3>
    <div id="admin-donations-list"><p class="muted"><?= t('admin.loading') ?></p></div>
</div>

<!-- TAB 3: SUPPORT CHAT -->
<div id="tab-content-chat" style="display:none;">
    <h3 class="mt-0"><?= t('admin.chat.threads_title') ?></h3>
    <div class="admin-chat-layout mt-3">
        <div class="admin-threads-list" id="admin-threads-list">
            <p class="muted p-2" style="padding:12px;"><?= t('admin.loading') ?></p>
        </div>
        <div class="chat-window" id="admin-chat-window" style="display:none;">
            <div style="padding:10px 14px; background:var(--surface-2); border-bottom:1px solid var(--border); font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                <span id="admin-chat-target-user">—</span>
                <span id="admin-chat-user-status" style="font-size:12px;" class="muted"></span>
            </div>
            <div class="chat-messages" id="admin-chat-messages"></div>
            <form id="admin-chat-form" class="chat-input-bar">
                <input type="text" id="admin-chat-input" placeholder="<?= htmlspecialchars(t('admin.chat.type_reply')) ?>" autocomplete="off" />
                <button type="submit" class="btn" style="background:var(--accent); color:#111; font-weight:700;"><?= t('admin.chat.send_reply') ?></button>
            </form>
        </div>
    </div>
</div>

<!-- Modal for XP Stats -->
<div id="xp-modal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; overflow-y:auto;">
    <div style="background:var(--bg); margin: 5% auto; padding: 20px; width: 90%; max-width: 800px; border-radius: 8px; position:relative;">
        <button id="xp-modal-close" style="position:absolute; right:15px; top:15px; background:transparent; border:none; color:var(--text); font-size:24px; cursor:pointer;">&times;</button>
        <h2>Статистика XP (<span id="xp-modal-username"></span>)</h2>
        
        <div style="margin-top:20px;">
            <div style="max-height:500px; overflow-y:auto; border:1px solid var(--border);">
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                    <thead style="background: var(--bg-alt); position: sticky; top: 0;">
                        <tr style="border-bottom:1px solid var(--border);">
                            <th style="padding:10px;">Время</th>
                            <th style="padding:10px;">Режим</th>
                            <th style="padding:10px;">XP</th>
                            <th style="padding:10px;">WPM</th>
                            <th style="padding:10px;">Длительность</th>
                            <th style="padding:10px;">Ошибки</th>
                            <th style="padding:10px;">Точность</th>
                        </tr>
                    </thead>
                    <tbody id="xp-modal-log">
                        <!-- log populated by JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

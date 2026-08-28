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
<p class="muted"><?= t('admin.total_accounts') ?> <b class="mono" id="admin-user-count">…</b></p>

<div id="admin-users-list"><p class="muted"><?= t('admin.loading') ?></p></div>

<!-- Modal for XP Stats -->
<div id="xp-modal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; overflow-y:auto;">
    <div style="background:var(--bg); margin: 5% auto; padding: 20px; width: 90%; max-width: 800px; border-radius: 8px; position:relative;">
        <button id="xp-modal-close" style="position:absolute; right:15px; top:15px; background:transparent; border:none; color:var(--text); font-size:24px; cursor:pointer;">&times;</button>
        <h2>Статистика XP (<span id="xp-modal-username"></span>)</h2>
        
        <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top:20px;">
            <div style="flex:1; min-width:300px;">
                <canvas id="xp-pie-chart" width="300" height="300"></canvas>
            </div>
            <div style="flex:2; min-width:300px; max-height:400px; overflow-y:auto; border:1px solid var(--border); padding:10px;">
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border);">
                            <th style="padding:8px;">Время</th>
                            <th style="padding:8px;">Режим</th>
                            <th style="padding:8px;">XP</th>
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

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<?php include __DIR__ . '/includes/footer.php'; ?>

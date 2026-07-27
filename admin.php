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

<?php include __DIR__ . '/includes/footer.php'; ?>

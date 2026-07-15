<?php
require __DIR__ . '/includes/auth.php';
$pageTitle = 'Админка';
$activePage = 'admin';
$pageScript = 'admin.js';
$loggedInUser = current_user($pdo);
include __DIR__ . '/includes/header.php';

if (!is_admin_user($loggedInUser)) {
    echo '<div class="card"><p>Эта страница только для администратора.</p></div>';
    include __DIR__ . '/includes/footer.php';
    exit;
}
?>

<div class="card-eyebrow">Админка</div>
<h1>Пользователи</h1>
<p class="muted">Всего аккаунтов: <b class="mono" id="admin-user-count">…</b></p>

<div id="admin-users-list"><p class="muted">Загрузка…</p></div>

<?php include __DIR__ . '/includes/footer.php'; ?>

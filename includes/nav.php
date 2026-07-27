<?php
require_once __DIR__ . '/icons.php';
// Владелец посмотрел живьём: эмодзи в навигации и на ачивках выглядят
// живее наших line-иконок — вернули эмодзи в таббаре и огоньке серии,
// mw_icon() тут больше не используется, но файл оставлен — им ещё
// пользуются "Буквы" (галочка) и часть главной (книга/мишень).
$navItems = [
    'index'       => ['label' => t('nav.home'),         'icon' => '🏠', 'href' => 'index.php'],
    'learn'       => ['label' => t('nav.learn'),        'icon' => '📖', 'href' => 'learn.php'],
    'koch'        => ['label' => t('nav.koch'),         'icon' => '🎯', 'href' => 'koch.php'],
    'groups'      => ['label' => t('nav.groups'),       'icon' => '🔢', 'href' => 'groups.php'],
    'callsigns'   => ['label' => t('nav.callsigns'),    'icon' => '📡', 'href' => 'callsigns.php'],
    'achievements'=> ['label' => t('nav.achievements'), 'icon' => '🏆', 'href' => 'achievements.php'],
    'account'     => ['label' => t('nav.account'),      'icon' => '👤', 'href' => 'account.php'],
];
?>
<nav class="topnav">
    <a href="index.php" class="brand">
        <span class="brand-code">·−· −−−−· −−−</span>
        <span class="brand-text">R9O<small>MorseWave</small></span>
    </a>
    <div class="nav-links">
        <?php foreach ($navItems as $key => $item): ?>
            <a href="<?= $item['href'] ?>" class="<?= $activePage === $key ? 'active' : '' ?>"><?= $item['label'] ?></a>
        <?php endforeach; ?>
    </div>
    <a href="<?= htmlspecialchars(mw_lang_switch_url()) ?>" class="nav-lang" title="<?= htmlspecialchars(t('lang.switch_title')) ?>"><?= htmlspecialchars(t('lang.switch_to')) ?></a>
    <a href="account.php" class="nav-stats" title="<?= htmlspecialchars(t('nav.open_profile')) ?>">
        <span><?= t('nav.xp') ?> <b data-nav-xp>0</b></span>
        <span><?= t('nav.level') ?> <b data-nav-level>1</b></span>
        <span>🔥 <b data-nav-streak>0</b></span>
    </a>
</nav>

<div class="tabbar">
    <?php foreach ($navItems as $key => $item): ?>
        <a href="<?= $item['href'] ?>" class="<?= $activePage === $key ? 'active' : '' ?>">
            <span class="tab-icon"><?= $item['icon'] ?></span>
            <span><?= $item['label'] ?></span>
        </a>
    <?php endforeach; ?>
</div>
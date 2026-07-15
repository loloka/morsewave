<?php
// Ожидается, что переменная $activePage задана в вызывающей странице
$navItems = [
    'index'       => ['label' => 'Главная',     'icon' => '🏠', 'href' => 'index.php'],
    'learn'       => ['label' => 'Буквы',       'icon' => '📖', 'href' => 'learn.php'],
    'koch'        => ['label' => 'Кох',         'icon' => '🎯', 'href' => 'koch.php'],
    'groups'      => ['label' => 'Группы',      'icon' => '🔢', 'href' => 'groups.php'],
    'callsigns'   => ['label' => 'Позывные',    'icon' => '📡', 'href' => 'callsigns.php'],
    'achievements'=> ['label' => 'Ачивки',      'icon' => '🏆', 'href' => 'achievements.php'],
    'account'     => ['label' => 'Профиль',     'icon' => '👤', 'href' => 'account.php'],
    'settings'    => ['label' => 'Звук',        'icon' => '⚙️', 'href' => 'settings.php'],
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
    <a href="account.php" class="nav-stats" title="Открыть профиль">
        <span>XP <b data-nav-xp>0</b></span>
        <span>Ур. <b data-nav-level>1</b></span>
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

<?php
require_once __DIR__ . '/icons.php';
// Навигация MorseWave: строгие контурные SVG-иконки вместо цветных эмодзи
$navItems = [
    'index'       => ['label' => t('nav.home'),         'icon' => 'home',    'href' => 'index.php'],
    'learn'       => ['label' => t('nav.learn'),        'icon' => 'book',    'href' => 'learn.php'],
    'dosaaf'      => ['label' => t('nav.dosaaf'),       'icon' => 'book-open', 'href' => 'dosaaf.php'],
    'koch'        => ['label' => t('nav.koch'),         'icon' => 'headphones', 'href' => 'koch.php'],
    'groups'      => ['label' => t('nav.groups'),       'icon' => 'levels',     'href' => 'groups.php'],
    'callsigns'   => ['label' => t('nav.callsigns'),    'icon' => 'tower',      'href' => 'callsigns.php'],
    'achievements'=> ['label' => t('nav.achievements'), 'icon' => 'trophy',  'href' => 'achievements.php'],
    'account'     => ['label' => t('nav.account'),      'icon' => 'user',    'href' => 'account.php'],
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
        <span class="nav-stat-streak" title="<?= htmlspecialchars(t('acc.streak_days')) ?>"><?= mw_icon('flame', 15) ?> <b data-nav-streak>0</b></span>
    </a>
</nav>

<div class="tabbar">
    <?php foreach ($navItems as $key => $item): ?>
        <a href="<?= $item['href'] ?>" class="<?= $activePage === $key ? 'active' : '' ?>">
            <span class="tab-icon"><?= mw_icon($item['icon'], 20) ?></span>
            <span><?= $item['label'] ?></span>
        </a>
    <?php endforeach; ?>
</div>
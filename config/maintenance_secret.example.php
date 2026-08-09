<?php
/**
 * Секретный токен для maintenance-switch.php — "рубильника" техобслуживания,
 * который НЕ трогает БД и НЕ требует логина через users/сессии (см.
 * includes/maintenance.php, CHANGELOG v2.74/v2.75). Работает даже когда
 * MySQL лежит целиком — именно для этого случая и затевался.
 *
 * Скопируй в config/maintenance_secret.php (файл в .gitignore, как
 * database.php — на проде создаётся руками, НЕ через git pull) и впиши
 * свой случайный токен, например:
 *   php -r "echo bin2hex(random_bytes(24));"
 *
 * Ссылка на панель — по сути пароль: https://morse.r9old.ru/maintenance-switch.php?token=...
 * Храни как обычный пароль (менеджер паролей), не пересылай в открытом чате.
 */

define('MW_MAINTENANCE_TOKEN', 'ЗАМЕНИ_НА_СВОЙ_СЛУЧАЙНЫЙ_ТОКЕН');

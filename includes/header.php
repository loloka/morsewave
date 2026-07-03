<?php
/**
 * Добавляет ?v=<время изменения файла> к пути ассета, чтобы браузер
 * не отдавал закэшированную старую версию после обновления файлов.
 */
function asset_v($relPath) {
    $full = __DIR__ . '/../' . $relPath;
    $v = @filemtime($full);
    return $relPath . '?v=' . ($v ?: time());
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title><?= isset($pageTitle) ? htmlspecialchars($pageTitle) . ' — MorseWave' : 'MorseWave — учи азбуку Морзе' ?></title>
    <meta name="description" content="MorseWave — современный тренажёр азбуки Морзе: метод Коха, группы символов, позывные, ачивки и ежедневные упражнения.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= asset_v('assets/css/style.css') ?>">
</head>
<body>
<?php include __DIR__ . '/nav.php'; ?>
<main class="page">
    <div class="container">

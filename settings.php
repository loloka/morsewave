<?php
$pageTitle = 'Настройки звука';
$activePage = 'settings';
$pageScript = 'settings.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Настройки</div>
<h1>Тон сигнала</h1>
<p>Настройки применяются сразу и действуют на всех страницах тренажёра —
    во время прослушивания, отправки ключом и сайдтона.</p>

<div class="card mt-3">
    <div class="mt-1">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Частота тона</div>
        <div class="speed-control">
            <input type="range" id="tone-freq" min="300" max="1000" step="10" value="600">
            <span class="speed-value mono" id="tone-freq-value">600</span> Гц
        </div>
    </div>

    <div class="mt-3">
        <div class="muted" style="font-size:13px;margin-bottom:6px;">Форма волны</div>
        <div class="chip-row" id="waveform-chips">
            <div class="chip active" data-wave="sine">Синусоида (мягкая)</div>
            <div class="chip" data-wave="triangle">Треугольная (тёплая)</div>
            <div class="chip" data-wave="square">Прямоугольная (резкая)</div>
            <div class="chip" data-wave="sawtooth">Пилообразная (жужжащая)</div>
        </div>
    </div>

    <div class="btn-row mt-3">
        <button class="btn btn-primary" id="test-tone-btn">▶ Проверить звук</button>
        <button class="btn" id="reset-tone-btn">Сбросить по умолчанию</button>
    </div>

    <p class="muted mt-2" style="font-size:12px;">
        600 Гц синусоида — классический тон CW-радиостанций, ближе всего к
        реальному эфиру. Прямоугольная/пилообразная звучат резче и жужжащее —
        кому-то удобнее различать точки/тире на слух именно с ними.
    </p>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

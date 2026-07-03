<?php
$pageTitle = 'Достижения';
$activePage = 'achievements';
$pageScript = 'achievements.js';
include __DIR__ . '/includes/header.php';
?>

<div class="card-eyebrow">Прогресс</div>
<h1>Достижения</h1>
<p>Список ачивок хранится в базе MySQL (таблица <code class="mono">achievements</code>) —
    можно добавлять новые прямо через SQL, без изменения кода.</p>

<div class="grid grid-2 mt-3" id="achievements-grid"></div>

<div class="card mt-3">
    <div class="flex-between flex-wrap gap-2">
        <div>
            <h3 class="mt-0">Сбросить прогресс</h3>
            <p class="mt-0 mb-2">Обнулит XP, уровень, серию дней, выученные символы, уровень
                метода Коха и все достижения. Полезно, если хочешь начать с чистого листа,
                или новичок случайно открыл слишком много (например, все 38 символов Коха разом).
                Действие необратимо.</p>
        </div>
        <button class="btn" id="reset-progress-btn" style="border-color:var(--danger);color:var(--danger);">
            ⚠ Сбросить весь прогресс
        </button>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>

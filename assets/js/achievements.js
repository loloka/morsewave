(async function () {
    // Пробовали заменить эмодзи ачивок на line-иконки — владелец посмотрел
    // живьём и решил, что эмодзи (в т.ч. дребезжащее ухо 🦻) выглядят
    // живее и лучше держат характер страницы. Вернули как было — иконка
    // берётся прямо из БД (a.icon), без маппинга по коду.
    const grid = document.getElementById('achievements-grid');
    const state = Progress.load();

    let defs = [];
    try {
        defs = await Progress.fetchAchievementDefs();
    } catch { /* пусто */ }

    if (!defs.length) {
        grid.innerHTML = '<p>' + t('js.ach.load_failed') + '</p>';
        return;
    }

    grid.innerHTML = defs.map(a => `
        <div class="badge ${state.unlockedAchievements.includes(a.code) ? 'unlocked' : ''}">
            <div class="icon">${a.icon}</div>
            <div class="badge-text">
                <div class="title">${a.title}</div>
                <div class="desc">${a.description}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('reset-progress-btn').addEventListener('click', async () => {
        const sure = confirm(t('js.ach.reset_confirm'));
        if (!sure) return;
        try { await fetch('api/unpublish_stats.php', { method: 'POST' }); } catch { /* не критично */ }
        // Серверную копию полного прогресса тоже удаляем — иначе следующий
        // логин слил бы (merge по максимуму) старые данные обратно и сброс
        // "не сработал" бы.
        try { await fetch('api/delete_progress.php', { method: 'POST' }); } catch { /* не критично */ }
        Progress.resetAll();
        location.reload();
    });
})();

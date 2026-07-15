(async function () {
    const grid = document.getElementById('achievements-grid');
    const state = Progress.load();

    let defs = [];
    try {
        defs = await Progress.fetchAchievementDefs();
    } catch { /* пусто */ }

    if (!defs.length) {
        grid.innerHTML = '<p>Не получилось загрузить достижения. Попробуй обновить страницу чуть позже.</p>';
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
        const sure = confirm(
            'Точно сбросить весь прогресс?\n\n' +
            'XP, уровень, серия дней, выученные символы, уровень метода Коха ' +
            'и все достижения будут обнулены. Если ты публиковал результаты в ' +
            'таблице лидеров — они тоже уберутся оттуда. Это действие нельзя отменить.'
        );
        if (!sure) return;
        try { await fetch('api/unpublish_stats.php', { method: 'POST' }); } catch { /* не критично */ }
        Progress.resetAll();
        location.reload();
    });
})();

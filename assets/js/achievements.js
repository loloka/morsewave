(async function () {
    const grid = document.getElementById('achievements-grid');
    const state = Progress.load();

    let defs = [];
    try {
        defs = await Progress.fetchAchievementDefs();
    } catch { /* пусто */ }

    if (!defs.length) {
        grid.innerHTML = '<p>Не удалось загрузить достижения из базы данных. Проверь подключение к MySQL (config/database.php) и что таблица achievements заполнена.</p>';
        return;
    }

    grid.innerHTML = defs.map(a => `
        <div class="badge ${state.unlockedAchievements.includes(a.code) ? 'unlocked' : ''}">
            <div class="icon">${a.icon}</div>
            <div>
                <div class="title">${a.title}</div>
                <div class="desc">${a.description}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('reset-progress-btn').addEventListener('click', () => {
        const sure = confirm(
            'Точно сбросить весь прогресс?\n\n' +
            'XP, уровень, серия дней, выученные символы, уровень метода Коха ' +
            'и все достижения будут обнулены. Это действие нельзя отменить.'
        );
        if (!sure) return;
        Progress.resetAll();
        location.reload();
    });
})();

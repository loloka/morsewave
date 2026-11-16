(async function () {
    // Пробовали заменить эмодзи ачивок на line-иконки — владелец посмотрел
    // живьём и решил, что эмодзи (в т.ч. дребезжащее ухо 🦻) выглядят
    // живее и лучше держат характер страницы. Вернули как было — иконка
    // берётся прямо из БД (a.icon), без маппинга по коду.
    const grid = document.getElementById('achievements-grid');

    let defs = [];
    try {
        defs = await Progress.fetchAchievementDefs();
        await Progress.checkAchievements();
    } catch { /* пусто */ }

    function renderGrid() {
        const state = Progress.load();
        const unlocked = Array.isArray(state?.unlockedAchievements) ? state.unlockedAchievements : [];
        if (!defs.length) {
            grid.innerHTML = '<p class="muted">' + t('js.ach.load_failed') + '</p>';
            return;
        }

        grid.innerHTML = defs.map(a => {
            const isUnlocked = unlocked.includes(a.code);
            let extraBadge = '';
            let extraDesc = '';
            if (a.code === 'contest_marathon') {
                const mCount = (state.stats && state.stats.contestMarathonCount) || 0;
                const activeSec = (state.stats && state.stats.contestTimeSeconds) || 0;
                const activeMin = Math.floor(activeSec / 60);
                if (mCount > 0) {
                    extraBadge = ` <span style="background:var(--accent); color:#000; font-size:11px; padding:1px 6px; border-radius:10px; font-weight:700;">x${mCount}</span>`;
                }
                extraDesc = `<div class="muted mt-1" style="font-size:11px;">⏱ В активном эфире: ${activeMin} мин. (${activeMin % 60}/60 мин. до следующей награды +500 XP)</div>`;
            }
            return `
            <div class="badge ${isUnlocked ? 'unlocked' : ''}">
                <div class="icon">${a.icon}</div>
                <div class="badge-text">
                    <div class="title">${a.title}${extraBadge}</div>
                    <div class="desc">${a.description}${extraDesc}</div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderGrid();

    window.addEventListener('progress:updated', renderGrid);
    window.addEventListener('achievements:unlocked', renderGrid);

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

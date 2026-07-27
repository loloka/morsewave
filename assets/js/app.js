/**
 * Общая логика для всех страниц: статистика в шапке + всплывающие
 * уведомления о новых достижениях.
 */
function renderNavStats() {
    const state = Progress.load();
    const level = Progress.levelFromXp(state.xp);
    document.querySelectorAll('[data-nav-xp]').forEach(el => { el.textContent = state.xp; });
    document.querySelectorAll('[data-nav-level]').forEach(el => { el.textContent = level; });
    document.querySelectorAll('[data-nav-streak]').forEach(el => { el.textContent = state.streak.count; });
}

function showAchievementToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'card';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; max-width: 320px;
        display: flex; gap: 12px; align-items: center; z-index: 999;
        border-color: var(--accent); animation: slideIn .25s ease;
    `;
    toast.innerHTML = `
        <div style="font-size:28px">${achievement.icon}</div>
        <div>
            <div style="font-weight:700;font-size:13px;color:var(--accent)">${t('js.app.achievement_unlocked')}</div>
            <div style="font-weight:600">${achievement.title}</div>
            <div class="muted" style="font-size:12px">${achievement.description}</div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

window.addEventListener('DOMContentLoaded', () => {
    renderNavStats();
    Progress.checkAchievements();
    // Самовосстановление после сбоя push'а — было заведено как простой
    // Progress.pushNow() на каждой странице, и это оказалось БАГОМ: push
    // ничего не мержит, он слепо перезаписывает сервер тем, что лежит
    // локально. На устройстве, которое давно не тренировались (localStorage
    // отстал), это на каждой открытой странице затирало на сервере более
    // свежий прогресс с ДРУГОГО устройства меньшим числом — ровно то, на что
    // пожаловались (реальный инцидент, см. CHANGELOG v2.46). Правильный
    // самовосстанавливающийся вызов — syncWithServer(): тянет с сервера,
    // мержит с локальным ПО МАКСИМУМУ (см. Progress.mergeFromServer) и
    // только потом пушит результат — грузит чуть больше, но никогда не
    // может откатить прогресс назад. Без логина эндпоинты внутри тихо
    // отвечают not_logged_in/401, ничего не ломается.
    Progress.syncWithServer();
});
window.addEventListener('progress:updated', renderNavStats);
window.addEventListener('achievements:unlocked', (e) => {
    e.detail.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 400));
});

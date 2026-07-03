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
            <div style="font-weight:700;font-size:13px;color:var(--accent)">Достижение открыто!</div>
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
});
window.addEventListener('progress:updated', renderNavStats);
window.addEventListener('achievements:unlocked', (e) => {
    e.detail.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 400));
});

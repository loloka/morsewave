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

// Перехват физической клавиатуры для ввода ответов на русской раскладке
// Позволяет печатать ответы, не переключая ОС на английский.
document.addEventListener('keydown', (e) => {
    // Только для текстовых полей, где вбиваются ответы
    const targetIds = ['groups-answer', 'exam-answer', 'koch-answer', 'words-answer', 'cs-answer'];
    if (!e.target || !e.target.id || !targetIds.includes(e.target.id)) return;
    
    // Игнорируем шорткаты (Ctrl+C, Ctrl+V и т.д.)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const RU_TO_EN = {
        'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
        'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
        'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.', 'ё': '`',
        'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}',
        'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ж': ':', 'Э': '"',
        'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>', 'Ё': '~'
    };

    if (RU_TO_EN[e.key]) {
        e.preventDefault();
        const enChar = RU_TO_EN[e.key];
        
        const target = e.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;
        
        // Вставляем английскую букву
        target.value = val.slice(0, start) + enChar + val.slice(end);
        target.setSelectionRange(start + 1, start + 1);
        
        // Дергаем событие input, чтобы сработали внутренние обработчики (подсветка ошибок в Кохе и т.д.)
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }
});

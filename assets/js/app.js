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

window.showLayoutHint = function() {
    if (!window.__layoutHintEl) {
        const hint = document.createElement('div');
        hint.innerHTML = 'Включена русская раскладка!<br><span style="font-size:12px;opacity:0.8;">Переключите язык в системе (возле часов ↘), чтобы избежать проблем с горячими клавишами.</span>';
        hint.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; background: var(--primary); color: #fff; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: var(--font-ui); font-weight: 700; font-size: 15px; z-index: 9999; opacity: 0; transform: translateY(20px); transition: opacity 0.4s, transform 0.4s; pointer-events: none;
        `;
        document.body.appendChild(hint);
        window.__layoutHintEl = hint;
    }
    clearTimeout(window.__layoutHintTimer);
    window.__layoutHintEl.style.display = 'block';
    requestAnimationFrame(() => {
        window.__layoutHintEl.style.opacity = '1';
        window.__layoutHintEl.style.transform = 'translateY(0)';
    });
};

window.hideLayoutHint = function() {
    if (window.__layoutHintEl && window.__layoutHintEl.style.opacity === '1') {
        window.__layoutHintEl.style.opacity = '0';
        window.__layoutHintEl.style.transform = 'translateY(20px)';
        window.__layoutHintTimer = setTimeout(() => {
            window.__layoutHintEl.style.display = 'none';
        }, 400);
    }
};

// Перехват физической клавиатуры для ввода ответов на русской раскладке
// Позволяет печатать ответы, не переключая ОС на английский.
document.addEventListener('keydown', (e) => {
    // Если введена латиница, скрываем подсказку
    if (/^[a-zA-Z]$/.test(e.key)) {
        if (window.hideLayoutHint) window.hideLayoutHint();
    }

    // Горячая клавиша F7 — Повторить (общепринятый стандарт в Morse-софте)
    if (e.key === 'F7') {
        e.preventDefault();
        const replayBtns = document.querySelectorAll('#replay-btn, #words-replay-btn');
        for (const btn of replayBtns) {
            if (btn.offsetParent !== null && !btn.disabled) {
                btn.click();
                break;
            }
        }
        return;
    }

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

        // Показываем подсказку (висит, пока не переключатся на латиницу)
        if (window.showLayoutHint) window.showLayoutHint();
    }
});

// Интерактивное управление всплывающим тултипом спонсора (особенно для мобильных экранов)
document.addEventListener('click', (e) => {
    const wrap = e.target.closest('.sponsor-badge-wrap');
    if (wrap) {
        const wasActive = wrap.classList.contains('active');
        document.querySelectorAll('.sponsor-badge-wrap.active').forEach(el => {
            clearTimeout(el._hideTimer);
            el.classList.remove('active');
        });
        if (!wasActive) {
            wrap.classList.add('active');
            // Автоматически скрываем через 3 секунды, если пользователь больше не тапает
            wrap._hideTimer = setTimeout(() => {
                wrap.classList.remove('active');
            }, 3000);
        }
    } else {
        // Клик в любое другое место страницы сразу закрывает плашку
        document.querySelectorAll('.sponsor-badge-wrap.active').forEach(el => {
            clearTimeout(el._hideTimer);
            el.classList.remove('active');
        });
    }
});

// =========================================================================
// Шпаргалка и калькулятор соответствия скоростей WPM vs Знаки/мин (система PARIS)
// со стандартами радиоспорта и СРТ
// =========================================================================
let parisModalEl = null;
let parisModalTargetSlider = null;

function syncModalSpeedToPage(w) {
    const updateSlider = (s) => {
        if (!s || s.id === 'paris-modal-wpm-slider') return;
        const min = parseInt(s.min, 10) || 5;
        const max = parseInt(s.max, 10) || 60;
        const clamped = Math.max(min, Math.min(max, w));
        if (parseInt(s.value, 10) !== clamped) {
            s.value = clamped;
            s.dispatchEvent(new Event('input', { bubbles: true }));
            s.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    if (parisModalTargetSlider && document.body.contains(parisModalTargetSlider)) {
        updateSlider(parisModalTargetSlider);
    }
    // Синхронизируем также остальные основные слайдеры скорости WPM на странице
    document.querySelectorAll('.speed-control input[type="range"]').forEach(s => {
        const id = (s.id || '').toLowerCase();
        if (id.includes('farnsworth') || id.includes('vol') || id.includes('freq') || id.includes('pitch') || id.includes('gap') || id.includes('jump')) {
            return;
        }
        updateSlider(s);
    });
}

function openParisSpeedModal(initialWpm = 12, initialType = 'nominal', triggerSlider = null) {
    parisModalTargetSlider = triggerSlider || null;
    const wpmVal = Math.max(5, Math.min(60, parseInt(initialWpm, 10) || 12));
    if (!parisModalEl) {
        parisModalEl = document.createElement('div');
        parisModalEl.className = 'paris-modal-overlay';
        parisModalEl.id = 'paris-speed-modal';
        parisModalEl.innerHTML = `
            <div class="paris-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="paris-modal-title">
                <div class="paris-modal-header">
                    <h3 id="paris-modal-title">${t('js.paris.modal_title')}</h3>
                    <button type="button" class="paris-modal-close" id="paris-modal-close-btn" aria-label="Закрыть">&times;</button>
                </div>
                <div class="paris-modal-body">
                    <p style="font-weight:700; font-size:15px; color:var(--accent); margin-bottom:8px;">${t('js.paris.modal_intro')}</p>
                    <p class="muted" style="font-size:13px; line-height:1.5;">${t('js.paris.modal_desc')}</p>
                    <p class="muted" style="font-size:13px; line-height:1.5;">${t('js.paris.modal_diff_desc')}</p>

                    <div class="paris-calc-card">
                        <div class="flex-between flex-wrap gap-2" style="align-items:center;">
                            <div style="font-weight:700; font-size:13px;">${t('js.paris.calc_title')}</div>
                            <div class="speed-control" style="margin:0;">
                                <span class="speed-label">${t('js.paris.speed_label')}</span>
                                <input type="range" id="paris-modal-wpm-slider" min="5" max="60" step="1" value="${wpmVal}">
                                <span class="speed-value" id="paris-modal-wpm-val" style="font-size:16px;">${wpmVal}</span> <span class="speed-unit">wpm</span>
                            </div>
                        </div>

                        <table class="paris-table">
                            <tbody>
                                <tr id="paris-row-letters">
                                    <td>${t('js.paris.type_letters')}</td>
                                    <td class="coef">${t('js.paris.type_letters_coef')}</td>
                                    <td class="val" id="paris-val-letters">0 зн/мин</td>
                                </tr>
                                <tr id="paris-row-mixed">
                                    <td>${t('js.paris.type_mixed')}</td>
                                    <td class="coef">${t('js.paris.type_mixed_coef')}</td>
                                    <td class="val" id="paris-val-mixed">0 зн/мин</td>
                                </tr>
                                <tr id="paris-row-digits-long">
                                    <td>${t('js.paris.type_digits_long')}</td>
                                    <td class="coef">${t('js.paris.type_digits_long_coef')}</td>
                                    <td class="val" id="paris-val-digits-long">0 зн/мин</td>
                                </tr>
                                <tr id="paris-row-digits-short">
                                    <td>${t('js.paris.type_digits_short')}</td>
                                    <td class="coef">${t('js.paris.type_digits_short_coef')}</td>
                                    <td class="val" id="paris-val-digits-short">0 зн/мин</td>
                                </tr>
                                <tr id="paris-row-nominal" style="background:rgba(255,255,255,0.02);">
                                    <td>${t('js.paris.type_nominal')}</td>
                                    <td class="coef">${t('js.paris.type_nominal_coef')}</td>
                                    <td class="val" id="paris-val-nominal">0 зн/мин</td>
                                </tr>
                                <tr>
                                    <td>${t('js.paris.dot_duration')}</td>
                                    <td class="coef">1200 / WPM</td>
                                    <td class="val" id="paris-val-dot">0 ${t('js.paris.dot_unit')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="muted mt-2" style="font-size:12px; line-height:1.5; border-left:3px solid var(--accent); padding-left:12px;">
                        ${t('js.paris.sport_note')}
                    </div>
                </div>
                <div class="paris-modal-footer">
                    <button type="button" class="btn btn-primary btn-sm" id="paris-modal-ok-btn">${t('js.paris.close')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(parisModalEl);

        const closeBtn = document.getElementById('paris-modal-close-btn');
        const okBtn = document.getElementById('paris-modal-ok-btn');
        const close = () => {
            parisModalEl.classList.remove('active');
            setTimeout(() => { if (!parisModalEl.classList.contains('active')) parisModalEl.style.display = 'none'; }, 200);
        };
        closeBtn?.addEventListener('click', close);
        okBtn?.addEventListener('click', close);
        parisModalEl.addEventListener('click', (e) => {
            if (e.target === parisModalEl) close();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && parisModalEl.classList.contains('active')) {
                close();
            }
        });

        const slider = document.getElementById('paris-modal-wpm-slider');
        const valEl = document.getElementById('paris-modal-wpm-val');
        const unit = t('js.common.cpm_unit') || 'зн/мин';
        const updateCalc = (syncToPage = true) => {
            const w = parseInt(slider.value, 10) || 12;
            valEl.textContent = w;
            document.getElementById('paris-val-letters').textContent = `${Math.round(w * 4.22)} ${unit}`;
            document.getElementById('paris-val-mixed').textContent = `${Math.round(w * 3.65)} ${unit}`;
            document.getElementById('paris-val-digits-long').textContent = `${Math.round(w * 2.90)} ${unit}`;
            document.getElementById('paris-val-digits-short').textContent = `${Math.round(w * 3.17)} ${unit}`;
            document.getElementById('paris-val-nominal').textContent = `${Math.round(w * 5.00)} ${unit}`;
            document.getElementById('paris-val-dot').textContent = `${Math.round(1200 / w)} ${t('js.paris.dot_unit')}`;

            if (syncToPage) {
                syncModalSpeedToPage(w);
            }
        };
        slider?.addEventListener('input', () => updateCalc(true));
        parisModalEl._updateCalc = updateCalc;
    }

    const slider = document.getElementById('paris-modal-wpm-slider');
    if (slider) {
        slider.value = wpmVal;
        if (parisModalEl._updateCalc) parisModalEl._updateCalc(false);
    }

    ['letters', 'mixed', 'digits-long', 'digits-short', 'nominal'].forEach(k => {
        const row = document.getElementById('paris-row-' + k);
        if (row) row.style.backgroundColor = '';
    });
    let activeRowId = 'paris-row-nominal';
    if (initialType === 'letters') activeRowId = 'paris-row-letters';
    else if (initialType === 'mixed' || initialType === 'callsigns') activeRowId = 'paris-row-mixed';
    else if (initialType === 'digits') activeRowId = 'paris-row-digits-long';
    else if (initialType === 'digits_short') activeRowId = 'paris-row-digits-short';
    const activeRow = document.getElementById(activeRowId);
    if (activeRow) activeRow.style.backgroundColor = 'rgba(74, 222, 128, 0.12)';

    parisModalEl.style.display = 'flex';
    requestAnimationFrame(() => parisModalEl.classList.add('active'));
}
window.openParisSpeedModal = openParisSpeedModal;

// Глобальное делегирование клика по плашке скорости cpm-hint
document.addEventListener('click', (e) => {
    const hint = e.target.closest('.cpm-hint, [data-open-paris-modal]');
    if (hint) {
        e.preventDefault();
        const wrap = hint.closest('.speed-control') || hint.parentElement;
        const slider = wrap ? wrap.querySelector('input[type="range"]') : null;
        const wpm = slider ? parseInt(slider.value, 10) : 12;
        const type = hint.dataset.cpmType || 'nominal';
        openParisSpeedModal(wpm, type, slider);
    }
});

function initCpmHintTitles() {
    document.querySelectorAll('.cpm-hint').forEach(el => {
        if (!el.getAttribute('title')) {
            el.setAttribute('title', t('js.common.cpm_title'));
        }
    });
}
window.addEventListener('DOMContentLoaded', initCpmHintTitles);


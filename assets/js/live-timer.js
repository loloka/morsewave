/**
 * LiveDailyTimer — компактный индикатор цели дня на экранах тренировок.
 * ПО УМОЛЧАНИЮ ОТКЛЮЧЕН у всех пользователей.
 * Включается в настройках профиля (вкладка «Отображение»).
 */
const LiveDailyTimer = (() => {
    let mountEl = null;
    let timerInterval = null;
    let lastActivityTime = Date.now();
    let accumulatedSecs = 0;
    const PRESETS = [10, 15, 20, 30, 45, 60];

    function isEnabled() {
        if (typeof DisplaySettings === 'undefined') return false;
        return DisplaySettings.load().showDailyTimer === true;
    }

    function recordActivity() {
        lastActivityTime = Date.now();
    }

    function init() {
        if (!isEnabled()) {
            destroy();
            return;
        }

        mountEl = document.getElementById('live-daily-timer-mount');
        if (!mountEl) {
            // Если явного контейнера нет, проверяем, тренировочная ли это страница
            const mainCont = document.querySelector('main.page .container');
            const modeSwitch = document.querySelector('.mode-switch') || document.querySelector('.segmented-nav') || document.querySelector('.card');
            if (mainCont && modeSwitch && modeSwitch.parentNode) {
                mountEl = document.createElement('div');
                mountEl.id = 'live-daily-timer-mount';
                modeSwitch.parentNode.insertBefore(mountEl, modeSwitch);
            } else {
                return;
            }
        }

        render();

        // Слушаем действия пользователя
        ['keydown', 'pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, recordActivity, { passive: true });
        });

        // Слушаем обновления прогресса из упражнений
        window.addEventListener('progress:updated', () => {
            render();
        });

        // Каждые 10 секунд проверяем активность
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isEnabled()) {
                destroy();
                return;
            }
            const now = Date.now();
            const isIdle = (now - lastActivityTime) > 60000 || document.hidden;
            if (!isIdle) {
                accumulatedSecs += 10;
                if (accumulatedSecs >= 60) {
                    if (typeof Progress !== 'undefined' && typeof Progress.addTrainingTime === 'function') {
                        Progress.addTrainingTime(60);
                    }
                    accumulatedSecs = 0;
                    render();
                }
            }
        }, 10000);

        // Сохраняем неполные секунды при уходе со страницы
        window.addEventListener('beforeunload', () => {
            if (accumulatedSecs >= 5 && typeof Progress !== 'undefined' && typeof Progress.addTrainingTime === 'function') {
                Progress.addTrainingTime(accumulatedSecs);
                accumulatedSecs = 0;
            }
        });
    }

    function render() {
        if (!mountEl || !isEnabled()) return;
        if (typeof Progress === 'undefined') return;

        const goalMins = typeof Progress.getDailyGoalMinutes === 'function' ? Progress.getDailyGoalMinutes() : 30;
        const todaySecs = typeof Progress.getTodayTrainingSeconds === 'function' ? Progress.getTodayTrainingSeconds() : 0;
        const todayMins = Math.floor(todaySecs / 60);
        const leftMins = Math.max(0, goalMins - todayMins);
        const pct = Math.min(100, Math.round((todaySecs / (goalMins * 60)) * 100));
        const isDone = todayMins >= goalMins;

        const leftText = (typeof t === 'function' && t('live_timer.goal_left'))
            ? t('live_timer.goal_left', { '{left}': leftMins })
            : `🎯 До цели дня: ещё ${leftMins} мин`;

        const doneText = (typeof t === 'function' && t('live_timer.goal_done'))
            ? t('live_timer.goal_done', { '{today}': todayMins, '{goal}': goalMins })
            : `🎉 Цель дня выполнена: ${todayMins} из ${goalMins} мин!`;

        const statusText = isDone ? doneText : leftText;
        const goalTitle = (typeof t === 'function' && t('live_timer.goal_change_title'))
            ? t('live_timer.goal_change_title', { '{goal}': goalMins })
            : `Норма: ${goalMins} мин (кликните для смены)`;
        const closeTitle = (typeof t === 'function' && t('live_timer.close_btn'))
            ? t('live_timer.close_btn')
            : 'Скрыть таймер';

        mountEl.innerHTML = `
            <div class="live-daily-timer-pill ${isDone ? 'goal-reached' : ''}">
                <div class="live-daily-timer-info" style="display:flex; align-items:center; gap:8px; font-weight:600; color:${isDone ? '#4ade80' : 'var(--text)'};">
                    <span>${statusText}</span>
                </div>
                <div class="live-daily-timer-progress-wrap">
                    <div class="live-daily-timer-progress-bar" style="width:${pct}%;"></div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" class="live-daily-timer-btn-goal" id="live-timer-goal-btn" title="${goalTitle}">
                        <span>⚙️</span> <span>${goalMins} м</span>
                    </button>
                    <button type="button" class="live-daily-timer-btn-close" id="live-timer-close-btn" title="${closeTitle}">
                        ✕
                    </button>
                </div>
            </div>
        `;

        const goalBtn = document.getElementById('live-timer-goal-btn');
        if (goalBtn) {
            goalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cycleGoal(goalMins);
            });
        }

        const closeBtn = document.getElementById('live-timer-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                disable();
            });
        }
    }

    function cycleGoal(currentMins) {
        let nextIdx = PRESETS.indexOf(currentMins) + 1;
        if (nextIdx <= 0 || nextIdx >= PRESETS.length) nextIdx = 0;
        const newGoal = PRESETS[nextIdx];
        if (typeof Progress !== 'undefined' && typeof Progress.setDailyGoalMinutes === 'function') {
            Progress.setDailyGoalMinutes(newGoal);
        }
        render();
    }

    function disable() {
        if (typeof DisplaySettings !== 'undefined') {
            const ds = DisplaySettings.load();
            ds.showDailyTimer = false;
            DisplaySettings.save(ds);
        }
        destroy();
        const toastMsg = (typeof t === 'function' && t('live_timer.toast_hidden'))
            ? t('live_timer.toast_hidden')
            : 'Таймер скрыт. Вы всегда можете включить его обратно в профиле (вкладка «Отображение»).';
        if (typeof window.showLayoutHint === 'function') {
            window.showLayoutHint(toastMsg);
            setTimeout(() => {
                if (typeof window.hideLayoutHint === 'function') window.hideLayoutHint();
            }, 4000);
        }
    }

    function destroy() {
        clearInterval(timerInterval);
        if (mountEl) mountEl.innerHTML = '';
    }

    return { init, render, disable, isEnabled };
})();

window.addEventListener('DOMContentLoaded', () => {
    LiveDailyTimer.init();
});

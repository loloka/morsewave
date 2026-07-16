/**
 * Progress — весь прогресс пользователя хранится локально в браузере
 * (localStorage), без аккаунтов и сервера. Список ачивок подтягивается
 * с сервера (api/achievements.php), а разблокировка проверяется здесь.
 */
const Progress = (() => {
    const KEY = 'morsewave_progress_v1';

    const defaults = () => ({
        xp: 0,
        learnedLetters: [],
        kochLevel: 2, // сколько символов Koch-порядка уже открыто
        streak: { count: 0, lastDate: null },
        stats: {
            groupsCompleted: 0,
            callsignsCompleted: 0,
            sessionsCompleted: 0,
            recognizedCount: 0,
            recognizeBestStreak: 0,
            examsPassed: 0,
            abbrCompleted: 0,
            abbrBestStreak: 0,
        },
        unlockedAchievements: [],
        dailyChallengeDate: null,
    });

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaults();
            const state = { ...defaults(), ...JSON.parse(raw) };
            // Лечим уже испорченные значения от старого бага с плавающей точкой
            // (592.5000000000002 и т.п.) — округляем до целого при каждой загрузке.
            state.xp = Math.round(state.xp) || 0;
            return state;
        } catch {
            return defaults();
        }
    }

    function save(state) {
        localStorage.setItem(KEY, JSON.stringify(state));
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function touchStreak(state) {
        const t = today();
        if (state.streak.lastDate === t) return; // уже отмечено сегодня
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (state.streak.lastDate === yesterday) {
            state.streak.count += 1;
        } else {
            state.streak.count = 1;
        }
        state.streak.lastDate = t;
    }

    function levelFromXp(xp) {
        return Math.floor(1 + Math.sqrt(xp / 80));
    }

    function xpForNextLevel(level) {
        return Math.pow(level, 2) * 80;
    }

    // Публикация в лидерборд ВПЕРВЫЕ — только по явному клику
    // "Опубликовать" на странице профиля (account.js), сознательно НЕ
    // автоматически: кто не хочет светиться в таблице лидеров, тот просто
    // никогда не жмёт кнопку и никогда там не появится.
    // А вот ОБНОВЛЕНИЕ уже опубликованных цифр — наоборот, идёт тихо в
    // фоне (иначе после первой публикации пришлось бы жать кнопку заново
    // на каждое изменение прогресса, что неудобно). Ключевая гарантия —
    // api/refresh_published_stats.php умеет только UPDATE, никогда INSERT:
    // если строки в лидерборде ещё нет, вызов тихо ничего не делает.
    let refreshTimer = null;
    function refreshPublishedStats(state) {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            fetch('api/refresh_published_stats.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xp: state.xp,
                    streakCount: state.streak.count,
                    streakLastDate: state.streak.lastDate,
                }),
            }).catch(() => {});
        }, 800);
    }

    // Полная синхронизация (в отличие от лидерборда выше — приватная и
    // автоматическая): весь Progress-объект тихо пушится на сервер при
    // каждом значимом изменении, пока пользователь залогинен. Без логина
    // эндпоинт тихо отвечает not_logged_in — не ошибка. Debounce, чтобы
    // серия быстрых начислений XP не породила очередь запросов.
    let pushTimer = null;
    function pushFullProgress() {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(pushNow, 1500);
    }

    function pushNow() {
        return fetch('api/push_progress.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(load()),
        }).catch(() => {});
    }

    /**
     * Слияние серверного прогресса с локальным — вызывается сразу после
     * логина/регистрации. Стратегия: по каждому полю отдельно, НИКОГДА не
     * выбирая меньшее — поэтому прогресс гарантированно не теряется ни с
     * одной стороны и подтверждения у пользователя спрашивать не нужно.
     */
    function mergeFromServer(serverState) {
        const local = load();
        if (!serverState || typeof serverState !== 'object') return local;
        const server = { ...defaults(), ...serverState };
        const merged = { ...local };

        merged.xp = Math.max(Math.round(local.xp) || 0, Math.round(server.xp) || 0);
        merged.kochLevel = Math.max(local.kochLevel || 2, server.kochLevel || 2);

        // Множества — объединение
        merged.learnedLetters = [...new Set([
            ...(Array.isArray(local.learnedLetters) ? local.learnedLetters : []),
            ...(Array.isArray(server.learnedLetters) ? server.learnedLetters : []),
        ])];
        merged.unlockedAchievements = [...new Set([
            ...(Array.isArray(local.unlockedAchievements) ? local.unlockedAchievements : []),
            ...(Array.isArray(server.unlockedAchievements) ? server.unlockedAchievements : []),
        ])];

        // Числовые счётчики stats — max по каждому полю (включая поля,
        // которых нет в defaults — на случай, если одна из сторон новее)
        const localStats = local.stats || {};
        const serverStats = server.stats || {};
        merged.stats = { ...defaults().stats };
        new Set([
            ...Object.keys(merged.stats),
            ...Object.keys(localStats),
            ...Object.keys(serverStats),
        ]).forEach((k) => {
            merged.stats[k] = Math.max(Number(localStats[k]) || 0, Number(serverStats[k]) || 0);
        });

        // Даты — более поздняя
        const laterDate = (a, b) => {
            if (!a) return b || null;
            if (!b) return a;
            return a > b ? a : b; // строки YYYY-MM-DD сравниваются лексикографически
        };
        merged.streak = {
            count: Math.max(local.streak?.count || 0, server.streak?.count || 0),
            lastDate: laterDate(local.streak?.lastDate, server.streak?.lastDate),
        };
        // Более поздняя дата и тут — чтобы бонус задания дня нельзя было
        // получить второй раз, залогинившись с другого устройства.
        merged.dailyChallengeDate = laterDate(local.dailyChallengeDate, server.dailyChallengeDate);

        return merged;
    }

    /**
     * Полный цикл синхронизации после логина: pull → merge → save →
     * сразу push результата слияния (иначе следующий логин на первом
     * устройстве откатил бы мерж — на сервере остались бы старые данные).
     */
    async function syncWithServer() {
        try {
            const res = await fetch('api/pull_progress.php');
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.ok) return null;
            const merged = mergeFromServer(data.progress);
            save(merged);
            window.dispatchEvent(new CustomEvent('progress:updated', { detail: merged }));
            checkAchievements();
            refreshPublishedStats(merged);
            await pushNow();
            return merged;
        } catch {
            return null;
        }
    }

    function addXp(amount) {
        const state = load();
        state.xp = Math.round(state.xp + amount);
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        refreshPublishedStats(state);
        pushFullProgress();
        return state;
    }

    function markLetterLearned(ch) {
        const state = load();
        if (!state.learnedLetters.includes(ch)) {
            state.learnedLetters.push(ch);
            save(state);
            pushFullProgress();
        }
        return state;
    }

    function setKochLevel(level) {
        const state = load();
        state.kochLevel = level;
        save(state);
        checkAchievements();
        pushFullProgress();
        return state;
    }

    function incrementStat(field, by = 1) {
        const state = load();
        state.stats[field] = (state.stats[field] || 0) + by;
        save(state);
        checkAchievements();
        pushFullProgress();
        return state;
    }

    // Вызывать явно только за реальную тренировку (завершённая сессия
    // Коха/групп/позывных или задание дня) — просто зайти на сайт
    // или потыкать буквы недостаточно, чтобы засчитать день в серию.
    function markDailyActivity() {
        const state = load();
        touchStreak(state);
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        refreshPublishedStats(state);
        pushFullProgress();
        return state;
    }

    let cachedAchievements = null;

    async function fetchAchievementDefs() {
        if (cachedAchievements) return cachedAchievements;
        try {
            const res = await fetch('api/achievements.php');
            cachedAchievements = await res.json();
        } catch {
            cachedAchievements = [];
        }
        return cachedAchievements;
    }

    async function checkAchievements() {
        const defs = await fetchAchievementDefs();
        if (!defs.length) return [];
        const state = load();
        const newly = [];

        const statValue = (type) => {
            switch (type) {
                case 'letters_learned_count': return state.learnedLetters.length;
                case 'xp_total': return state.xp;
                case 'streak_days': return state.streak.count;
                case 'koch_level': return state.kochLevel;
                case 'groups_completed': return state.stats.groupsCompleted;
                case 'callsigns_completed': return state.stats.callsignsCompleted;
                case 'recognized_count': return state.stats.recognizedCount;
                case 'recognize_best_streak': return state.stats.recognizeBestStreak;
                case 'exam_passed_count': return state.stats.examsPassed;
                default: return 0;
            }
        };

        for (const a of defs) {
            if (state.unlockedAchievements.includes(a.code)) continue;
            if (statValue(a.condition_type) >= a.condition_value) {
                state.unlockedAchievements.push(a.code);
                newly.push(a);
            }
        }

        if (newly.length) {
            save(state);
            window.dispatchEvent(new CustomEvent('achievements:unlocked', { detail: newly }));
            pushFullProgress();
        }
        return newly;
    }

    function resetAll() {
        localStorage.removeItem(KEY);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: defaults() }));
    }

    return {
        load, save, addXp, markLetterLearned, setKochLevel, incrementStat,
        levelFromXp, xpForNextLevel, fetchAchievementDefs, checkAchievements,
        resetAll, markDailyActivity, mergeFromServer, syncWithServer,
    };
})();

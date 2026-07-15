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

    // Best-effort фоновая синхронизация публичного слепка XP/серии для
    // лидерборда. Если пользователь не залогинен — сервер тихо игнорирует,
    // ошибки сети тоже проглатываются: это не должно мешать офлайн-работе.
    let syncTimer = null;
    function syncToServer(state) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            fetch('api/sync_progress.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xp: state.xp,
                    streakCount: state.streak.count,
                    streakLastDate: state.streak.lastDate,
                }),
            }).catch(() => {});
        }, 800); // небольшая задержка, чтобы не долбить сервер на каждый чих
    }

    function addXp(amount) {
        const state = load();
        state.xp = Math.round(state.xp + amount);
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        syncToServer(state);
        return state;
    }

    function markLetterLearned(ch) {
        const state = load();
        if (!state.learnedLetters.includes(ch)) {
            state.learnedLetters.push(ch);
            save(state);
        }
        return state;
    }

    function setKochLevel(level) {
        const state = load();
        state.kochLevel = level;
        save(state);
        checkAchievements();
        return state;
    }

    function incrementStat(field, by = 1) {
        const state = load();
        state.stats[field] = (state.stats[field] || 0) + by;
        save(state);
        checkAchievements();
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
        syncToServer(state);
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
        resetAll, markDailyActivity,
    };
})();

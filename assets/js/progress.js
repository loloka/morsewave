/**
 * Progress — весь прогресс пользователя хранится локально в браузере
 * (localStorage), без аккаунтов и сервера. Список ачивок подтягивается
 * с сервера (api/achievements.php), а разблокировка проверяется здесь.
 */
const Progress = (() => {
    const KEY = 'morsewave_progress_v1';
    // Момент последнего УСПЕШНОГО push'а на сервер. Нужен только для
    // индикатора в профиле — сам по себе на прогресс не влияет, поэтому
    // лежит отдельным ключом и не попадает в бэкап.
    const SYNC_KEY = 'morsewave_last_sync';

    const defaults = () => ({
        xp: 0,
        learnedLetters: [],
        // Уникальные символы, хоть раз ПРАВИЛЬНО опознанные на слух (режим
        // "Приём на слух", любой набор чипов) — отдельно от learnedLetters,
        // который про отправку ключом. Кириллические ключи с тем же
        // префиксом RU_ (см. morse-data.js), латинская A и кириллическая А —
        // разные записи и здесь тоже.
        recognizedUniqueLetters: [],
        // Символы (с тем же префиксом RU_ у кириллицы), для которых ритм
        // отправки ключом отточен — 5 точных повторов подряд в режиме
        // "Ритм ключа". Отдельно от learnedLetters (см. markRhythmMastered).
        rhythmMasteredLetters: [],
        // Личный рекорд точности (%) для КАЖДОЙ буквы отдельно в режиме
        // "Ритм ключа" — раньше было одно общее число на все буквы
        // (stats.rhythmBestAccuracy до v2.53.1), но с одним общим рекордом
        // достаточно было один раз набрать 100% на простом символе (одна
        // точка или тире — попасть в идеал такому проще всего), и дальше эта
        // цифра переставала расти для ЛЮБЫХ других букв — тренировать другие
        // символы становилось неинтересно, рекорд как будто "уже взят".
        // Ключи — как и у learnedLetters/rhythmMasteredLetters (с префиксом
        // RU_ у кириллицы).
        rhythmBestByLetter: {},
        kochLevel: 2, // сколько символов Koch-порядка уже открыто (можно двигать бегунком)
        // Сколько символов Коха РЕАЛЬНО заработано пройденной сессией (≥90%).
        // Отдельно от kochLevel: бегунок «Перейти к уровню» меняет только
        // kochLevel (набор для тренировки), но НЕ этот счётчик. Ачивки за
        // метод Коха считаются по нему — иначе «открыть все символы» можно
        // было получить, просто дотащив бегунок до конца (было багом).
        kochLevelEarned: 2,
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
            wordsCompleted: 0,
            invasionWavesCompleted: 0,
        },
        unlockedAchievements: [],
        dailyChallengeDate: null,
    });

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaults();
            const parsed = JSON.parse(raw);
            const state = { ...defaults(), ...parsed };
            // Лечим уже испорченные значения от старого бага с плавающей точкой
            // (592.5000000000002 и т.п.) — округляем до целого при каждой загрузке.
            state.xp = Math.round(state.xp) || 0;
            // Бэкфилл для старых профилей без kochLevelEarned: считаем весь
            // уже открытый уровень честно заработанным (не наказываем тех, кто
            // прогрессировал до появления счётчика). Новые начисления пойдут
            // только через пройденные сессии.
            if (parsed.kochLevelEarned === undefined) {
                state.kochLevelEarned = state.kochLevel;
            }
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
        const todayStr = today();
        if (state.streak.lastDate === todayStr) return; // уже отмечено сегодня
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (state.streak.lastDate === yesterday) {
            state.streak.count += 1;
        } else {
            state.streak.count = 1;
        }
        state.streak.lastDate = todayStr;
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

    /**
     * Отметка «синхронизировано только что». Ставится ТОЛЬКО когда сервер
     * реально ответил ok — без логина push отвечает not_logged_in, и это
     * не синхронизация, метку ставить нельзя (иначе гость видел бы бодрое
     * «синхронизировано», хотя на сервере ничего нет).
     */
    function markSynced() {
        const at = new Date().toISOString();
        localStorage.setItem(SYNC_KEY, at);
        window.dispatchEvent(new CustomEvent('progress:synced', { detail: { at } }));
    }

    function lastSyncAt() {
        const raw = localStorage.getItem(SYNC_KEY);
        if (!raw) return null;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }

    /**
     * Один POST-запрос push'а. Вынесен отдельно, чтобы pushNow() мог
     * повторить попытку без дублирования кода.
     */
    async function pushOnce() {
        const res = await fetch('api/push_progress.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(load()),
        });
        return res.json();
    }

    /**
     * Реальный инцидент: во время временных 504 на сервере push тихо
     * проваливался (catch ниже) и просто не повторялся — следующая попытка
     * была только при СЛЕДУЮЩЕМ начислении XP. Если человек как раз в этот
     * момент активно тренировался на телефоне, а потом ушёл в другую
     * вкладку/закрыл её, сервер так и оставался со старыми цифрами, и
     * последующий логин-мёрж с другого устройства подтягивал именно их
     * (mergeFromServer сам по себе всегда берёт максимум и не откатывает —
     * проблема была именно в том, что новые локальные цифры на сервер
     * вообще не доехали). Одна быстрая повторная попытка через 4 секунды
     * заметно снижает шанс, что временный сбой сети/сервера так и останется
     * неотправленным.
     */
    async function pushNow() {
        try {
            const data = await pushOnce();
            if (data && data.ok) markSynced();
            return data;
        } catch {
            try {
                await new Promise((r) => setTimeout(r, 4000));
                const data = await pushOnce();
                if (data && data.ok) markSynced();
                return data;
            } catch {
                return null; // сеть/сервер всё ещё недоступны — метку не двигаем
            }
        }
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
        // Заработанный уровень Коха — тоже «только вверх». Fallback на kochLevel
        // на случай серверного/локального состояния, ещё не знающего о поле.
        merged.kochLevelEarned = Math.max(
            local.kochLevelEarned || local.kochLevel || 2,
            server.kochLevelEarned || server.kochLevel || 2,
        );

        // Множества — объединение
        merged.learnedLetters = [...new Set([
            ...(Array.isArray(local.learnedLetters) ? local.learnedLetters : []),
            ...(Array.isArray(server.learnedLetters) ? server.learnedLetters : []),
        ])];
        merged.unlockedAchievements = [...new Set([
            ...(Array.isArray(local.unlockedAchievements) ? local.unlockedAchievements : []),
            ...(Array.isArray(server.unlockedAchievements) ? server.unlockedAchievements : []),
        ])];
        merged.recognizedUniqueLetters = [...new Set([
            ...(Array.isArray(local.recognizedUniqueLetters) ? local.recognizedUniqueLetters : []),
            ...(Array.isArray(server.recognizedUniqueLetters) ? server.recognizedUniqueLetters : []),
        ])];
        merged.rhythmMasteredLetters = [...new Set([
            ...(Array.isArray(local.rhythmMasteredLetters) ? local.rhythmMasteredLetters : []),
            ...(Array.isArray(server.rhythmMasteredLetters) ? server.rhythmMasteredLetters : []),
        ])];

        // Рекорд точности ритма — отдельное число НА КАЖДУЮ букву, поэтому
        // обычный Math.max по stats тут не подходит (это не один счётчик, а
        // словарь); сливаем по каждому ключу отдельно, тем же принципом
        // "только вверх".
        {
            const localBest = (local.rhythmBestByLetter && typeof local.rhythmBestByLetter === 'object') ? local.rhythmBestByLetter : {};
            const serverBest = (server.rhythmBestByLetter && typeof server.rhythmBestByLetter === 'object') ? server.rhythmBestByLetter : {};
            merged.rhythmBestByLetter = {};
            new Set([...Object.keys(localBest), ...Object.keys(serverBest)]).forEach((k) => {
                merged.rhythmBestByLetter[k] = Math.max(Number(localBest[k]) || 0, Number(serverBest[k]) || 0);
            });
        }

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

    /**
     * Отмечает символ как "ритм отточен" в режиме "Ритм ключа" (learn.js) —
     * отдельный список от learnedLetters (та про отправку ключом вообще, эта
     * конкретно про ровность точка/тире/пауза). Вызывается ОДИН раз, когда
     * человек впервые набирает REQUIRED_RHYTHM_STREAK точных повторов подряд
     * — так же, как markLetterLearned() вызывается один раз на 5-й верный
     * повтор в "Отправке", а не на каждую попытку (иначе XP фармился бы
     * бесконечно повторением одного и того же простого символа).
     */
    function markRhythmMastered(ch) {
        const state = load();
        if (!Array.isArray(state.rhythmMasteredLetters)) state.rhythmMasteredLetters = [];
        if (!state.rhythmMasteredLetters.includes(ch)) {
            state.rhythmMasteredLetters.push(ch);
            save(state);
            pushFullProgress();
        }
        return state;
    }

    /**
     * Обновляет личный рекорд точности ритма ДЛЯ КОНКРЕТНОЙ буквы (см.
     * комментарий у rhythmBestByLetter в defaults() — почему не один общий
     * счётчик на все буквы). Возвращает актуальный рекорд (новый, если он
     * обновился, иначе прежний) — удобно сразу присвоить в переменную UI.
     */
    function updateRhythmBest(ch, pct) {
        const state = load();
        if (!state.rhythmBestByLetter || typeof state.rhythmBestByLetter !== 'object') {
            state.rhythmBestByLetter = {};
        }
        const prev = state.rhythmBestByLetter[ch] || 0;
        if (pct > prev) {
            state.rhythmBestByLetter[ch] = pct;
            save(state);
            pushFullProgress();
            return pct;
        }
        return prev;
    }

    /**
     * Отмечает символ как хоть раз правильно опознанный на слух — отдельный
     * счётчик от markLetterLearned() (тот про отправку ключом). Нужен для
     * ачивок вида "опознайте на слух каждую букву набора хотя бы раз"
     * (например, кириллический алфавит целиком).
     */
    function markRecognizedUnique(ch) {
        const state = load();
        if (!Array.isArray(state.recognizedUniqueLetters)) state.recognizedUniqueLetters = [];
        if (!state.recognizedUniqueLetters.includes(ch)) {
            state.recognizedUniqueLetters.push(ch);
            save(state);
            checkAchievements();
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

    /**
     * Зафиксировать честно заработанный уровень Коха. Вызывается ТОЛЬКО из
     * пройденной сессии (точность ≥ порога) с размером набора, который
     * человек реально принял на слух. Двигаем «водяной знак» вверх и
     * проверяем ачивки. Бегунок «Перейти к уровню» сюда не ходит — поэтому
     * протащить бегунок до конца и получить ачивку больше нельзя.
     */
    function markKochLevelEarned(level) {
        const state = load();
        const base = state.kochLevelEarned || state.kochLevel || 2;
        const v = Math.max(base, level || 0);
        if (v !== state.kochLevelEarned) {
            state.kochLevelEarned = v;
            save(state);
            pushFullProgress();
        }
        checkAchievements();
        return state;
    }

    /**
     * Атомарно засчитать бонус задания дня: +50 XP и пометка сегодняшней
     * даты в одном load→save. Раньше это делалось «руками» в groups.js через
     * Progress.addXp(50) + Progress.save(старый_state) — и второй save,
     * загруженный ДО addXp, откатывал те самые +50 (баг: показывало 74,
     * начисляло 24). Возвращает true, если бонус реально начислен сейчас.
     */
    function completeDailyChallenge() {
        const state = load();
        if (state.dailyChallengeDate === today()) return false; // уже сегодня
        state.xp = Math.round(state.xp + 50);
        state.dailyChallengeDate = today();
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        refreshPublishedStats(state);
        pushFullProgress();
        return true;
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
                // ВАЖНО: считаем только латиницу+цифры (ALL_LEARNABLE), а не
                // всё learnedLetters целиком. С появлением кириллицы (хранится
                // с префиксом 'RU_', см. morse-data.js) в learnedLetters могут
                // лежать и кириллические буквы — без этого фильтра ачивка
                // "Полный алфавит" (36) могла бы сработать раньше времени от
                // суммы латиницы+кириллицы, не пройдя реально весь латинский
                // алфавит и цифры (см. CLAUDE.md, бэклог п.1, "КРИТИЧНО").
                case 'letters_learned_count':
                    return state.learnedLetters.filter((ch) => ALL_LEARNABLE.includes(ch)).length;
                case 'cyrillic_learned_count':
                    return state.learnedLetters.filter((ch) => ch.startsWith(CYRILLIC_PREFIX)).length;
                case 'cyrillic_recognized_count':
                    return (state.recognizedUniqueLetters || []).filter((ch) => ch.startsWith(CYRILLIC_PREFIX)).length;
                case 'xp_total': return state.xp;
                case 'streak_days': return state.streak.count;
                case 'koch_level': return state.kochLevelEarned;
                case 'groups_completed': return state.stats.groupsCompleted;
                case 'callsigns_completed': return state.stats.callsignsCompleted;
                case 'recognized_count': return state.stats.recognizedCount;
                case 'recognize_best_streak': return state.stats.recognizeBestStreak;
                case 'exam_passed_count': return state.stats.examsPassed;
                // Волны мини-игры засчитываются только за полностью пройденную
                // волну (100 попаданий) — см. finishInvasion() в learn.js, так
                // что фармить ачивку короткими заходами нельзя.
                case 'invasion_waves_count': return state.stats.invasionWavesCompleted || 0;
                // Буквы с отточенным ритмом (5 точных повторов подряд, см.
                // markRhythmMastered). Считаем ТОЛЬКО латиницу+цифры — по той
                // же причине, что и letters_learned_count выше: иначе сумма
                // латиницы и кириллицы выдала бы ачивку раньше времени.
                case 'rhythm_mastered_count':
                    return (state.rhythmMasteredLetters || []).filter((ch) => ALL_LEARNABLE.includes(ch)).length;
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
        localStorage.removeItem(SYNC_KEY);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: defaults() }));
        window.dispatchEvent(new CustomEvent('progress:synced', { detail: { at: null } }));
    }

    /**
     * Бэкап файлом — страховка для тех, кто тренируется без аккаунта.
     * Служебные поля с подчёркиванием нужны только человеку/проверке при
     * импорте: mergeFromServer их игнорирует (он копирует не все ключи
     * подряд, а перечисленные поля прогресса).
     */
    function exportBackup() {
        return {
            _app: 'MorseWave',
            _backupVersion: 1,
            _exportedAt: new Date().toISOString(),
            ...load(),
        };
    }

    /**
     * Импорт бэкапа — намеренно через тот же mergeFromServer, что и
     * слияние при логине: «только вверх» (max/union). Поэтому загрузка
     * старого файла НЕ может ничего испортить или откатить, и спрашивать
     * подтверждение не нужно. Бросает Error, если файл не похож на бэкап.
     */
    function importBackup(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error(t('js.progress.not_a_backup'));
        }
        const looksLikeProgress = typeof obj.xp === 'number'
            || Array.isArray(obj.learnedLetters)
            || (obj.stats && typeof obj.stats === 'object');
        if (!looksLikeProgress) {
            throw new Error(t('js.progress.no_progress_data'));
        }
        const merged = mergeFromServer(obj);
        save(merged);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: merged }));
        checkAchievements();
        refreshPublishedStats(merged);
        pushFullProgress();
        return merged;
    }

    return {
        load, save, addXp, markLetterLearned, markRecognizedUnique, markRhythmMastered, updateRhythmBest, setKochLevel, incrementStat,
        levelFromXp, xpForNextLevel, fetchAchievementDefs, checkAchievements,
        resetAll, markDailyActivity, markKochLevelEarned, completeDailyChallenge,
        mergeFromServer, syncWithServer, pushNow,
        lastSyncAt, exportBackup, importBackup,
    };
})();

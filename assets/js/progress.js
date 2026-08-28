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

    // --- api/dashboard.php: один batch-запрос вместо кучи отдельных ---
    // Раньше achievements.php, stats.php, leaderboard.php, pull_progress.php
    // дёргались отдельными fetch'ами почти одновременно на каждой загрузке
    // страницы (через app.js) — 4-6 отдельных подключений к MySQL разом.
    // Под нагрузкой это ловило "Host is blocked because of many connection
    // errors" (инцидент 2026-08-09, см. CHANGELOG). Теперь всё через один
    // эндпоинт с ?parts=, одно подключение на запрос.
    //
    // achievements/stats/leaderboard почти не меняются между страницами
    // одной вкладки — кэшируем их в sessionStorage на DASH_CACHE_TTL_MS,
    // чтобы переходы по сайту не дёргали БД заново. progress — ВСЕГДА
    // свежий (нужен для merge при каждой загрузке) и в кэш не попадает.
    const DASH_CACHE_TTL_MS = 60 * 1000;
    const DASH_CACHE_KEY = 'morsewave_dash_cache_v1';
    let dashInFlight = null; // {key, promise} — дедуп одновременных вызовов с одинаковым набором частей

    function readDashCache() {
        try { return JSON.parse(sessionStorage.getItem(DASH_CACHE_KEY)) || {}; }
        catch { return {}; }
    }
    function readDashCacheEntry(part) {
        const entry = readDashCache()[part];
        if (!entry || (Date.now() - entry.at) > DASH_CACHE_TTL_MS) return undefined;
        return entry.value;
    }
    function writeDashCacheEntry(part, value) {
        try {
            const cache = readDashCache();
            cache[part] = { at: Date.now(), value };
            sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify(cache));
        } catch { /* приватный режим/переполнение квоты — не критично, просто не кэшируем */ }
    }

    async function fetchDashboard(parts) {
        const result = {};
        const need = [];
        for (const part of parts) {
            if (part === 'progress') { need.push(part); continue; }
            const cached = readDashCacheEntry(part);
            if (cached !== undefined) result[part] = cached;
            else need.push(part);
        }
        if (!need.length) return result;

        const key = need.slice().sort().join(',');
        if (!dashInFlight || dashInFlight.key !== key) {
            dashInFlight = {
                key,
                promise: fetch('api/dashboard.php?parts=' + need.join(','))
                    .then((res) => res.json())
                    .finally(() => { dashInFlight = null; }),
            };
        }
        const data = await dashInFlight.promise;
        for (const part of need) {
            if (part !== 'progress' && data[part] !== undefined) writeDashCacheEntry(part, data[part]);
        }
        return { ...result, ...data };
    }

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
        // Личная "успеваемость" по каждой букве в режиме "Вторжение" (0..1,
        // выше = увереннее опознаёшь) — см. recordInvasionAttempt/
        // invasionLetterScore. Используется только для того, КАКИЕ буквы
        // чаще вылетают волной (адаптивная сложность, 2026-08-01), не влияет
        // на XP/ачивки, поэтому упрощённый merge (max) в mergeFromServer —
        // см. комментарий там.
        invasionLetterScores: {},
        // Личная "успеваемость" по каждой букве/цифре в НЕ-экзаменационных
        // сессиях "Групп" (0..1, тот же принцип EMA, что и у
        // invasionLetterScores, но отдельный скоуп — см.
        // groupsLetterScore/recordGroupsAttempt). Экзамен НИКОГДА не читает и
        // не пишет это поле — его набор групп обязан быть честно случайным.
        // Используется только для лёгкого смещения вероятности буквы при
        // генерации следующей группы (по просьбе владельца — "чтобы сильно не
        // влияло, чтобы было незаметно", 2026-08-02), не влияет на XP/ачивки.
        groupsLetterScores: {},
        // Тот же принцип для "Метода Коха" (weightedRandomGroup в koch.js),
        // отдельный скоуп от groupsLetterScores — набор символов там задан
        // уровнем, а не выбором человека, ключи и смысл те же, но мешать в
        // одну статистику режимы с разной механикой не стоит (та же логика,
        // что развела invasionLetterScores и groupsLetterScores).
        kochLetterScores: {},
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

        // Успеваемость по буквам во "Вторжении" — тем же принципом (max по
        // каждому ключу), что и rhythmBestByLetter выше. Строго говоря, это
        // не "рекорд" (число может и падать при неудачах на одном
        // устройстве), но раз оно используется только для частоты спавна, а
        // не для XP/ачивок, берём более ВЫСОКОЕ (= "тебе тут увереннее")
        // число с любого устройства — тот же дух "никогда не откатывать
        // назад", просто применённый к менее строгому полю.
        {
            const localScores = (local.invasionLetterScores && typeof local.invasionLetterScores === 'object') ? local.invasionLetterScores : {};
            const serverScores = (server.invasionLetterScores && typeof server.invasionLetterScores === 'object') ? server.invasionLetterScores : {};
            merged.invasionLetterScores = {};
            new Set([...Object.keys(localScores), ...Object.keys(serverScores)]).forEach((k) => {
                merged.invasionLetterScores[k] = Math.max(Number(localScores[k]) || 0, Number(serverScores[k]) || 0);
            });
        }

        // groupsLetterScores — тот же max-по-ключу принцип и по той же
        // причине (не рекорд, просто "не откатываем назад").
        {
            const localScores = (local.groupsLetterScores && typeof local.groupsLetterScores === 'object') ? local.groupsLetterScores : {};
            const serverScores = (server.groupsLetterScores && typeof server.groupsLetterScores === 'object') ? server.groupsLetterScores : {};
            merged.groupsLetterScores = {};
            new Set([...Object.keys(localScores), ...Object.keys(serverScores)]).forEach((k) => {
                merged.groupsLetterScores[k] = Math.max(Number(localScores[k]) || 0, Number(serverScores[k]) || 0);
            });
        }

        // kochLetterScores — тот же max-по-ключу принцип.
        {
            const localScores = (local.kochLetterScores && typeof local.kochLetterScores === 'object') ? local.kochLetterScores : {};
            const serverScores = (server.kochLetterScores && typeof server.kochLetterScores === 'object') ? server.kochLetterScores : {};
            merged.kochLetterScores = {};
            new Set([...Object.keys(localScores), ...Object.keys(serverScores)]).forEach((k) => {
                merged.kochLetterScores[k] = Math.max(Number(localScores[k]) || 0, Number(serverScores[k]) || 0);
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
            // Раньше — отдельный fetch('api/pull_progress.php') с проверкой
            // res.ok/data.ok. Теперь тот же смысл несёт data.loggedIn из
            // batch-эндпоинта (см. fetchDashboard выше): гость выходит здесь
            // же, ничего не мержа и не пуша — как и раньше.
            const data = await fetchDashboard(['progress']);
            if (!data.loggedIn) return null;
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

    function addXp(amount, source = 'unknown') {
        const state = load();
        state.xp = Math.round(state.xp + amount);
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        refreshPublishedStats(state);
        pushFullProgress();

        // Логирование транзакции XP для аналитики и античита
        if (amount > 0) {
            fetch('api/log_xp.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amount, source: source })
            }).catch(() => {});
        }

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

    // Нейтральная стартовая "успеваемость" для буквы, которую ещё ни разу
    // не видели во "Вторжении" — не 1 (иначе новая буква спавнилась бы реже
    // всех, хотя её ещё не тренировали ни разу) и не 0 (иначе спавнилась бы
    // подозрительно часто с первой волны). 0.7 — то же самое число, что уже
    // используется как "хороший, но не идеальный" ориентир в других местах
    // прогресса.
    const INVASION_NEUTRAL_SCORE = 0.7;

    /**
     * Читает текущую "успеваемость" по букве во "Вторжении" — 0..1, выше =
     * увереннее опознаёшь. Только чтение, ничего не пишет и не пушит на
     * сервер (см. invasionSpawnWeight в learn.js, который вызывает это на
     * каждый спавн пришельца).
     */
    function invasionLetterScore(ch) {
        const state = load();
        const scores = state.invasionLetterScores;
        return (scores && typeof scores[ch] === 'number') ? scores[ch] : INVASION_NEUTRAL_SCORE;
    }

    /**
     * Обновляет "успеваемость" по букве во "Вторжении" после каждого исхода
     * (убил вовремя = correct true, пришелец прорвался = correct false) —
     * экспоненциальное скользящее среднее (вес 0.2 у нового исхода), а не
     * простое отношение побед/поражений, чтобы недавняя игра значила больше
     * старой (человек мог за неделю подтянуть букву, которую путал раньше).
     * Питает адаптивный спавн (см. invasionSpawnWeight в learn.js): буквы с
     * низким счётом появляются в волне чаще. НЕ участвует в XP/ачивках —
     * зовётся на КАЖДОЕ попадание/промах, не разово, поэтому фармить тут
     * нечего.
     */
    function recordInvasionAttempt(ch, correct) {
        const state = load();
        if (!state.invasionLetterScores || typeof state.invasionLetterScores !== 'object') {
            state.invasionLetterScores = {};
        }
        const prev = (typeof state.invasionLetterScores[ch] === 'number') ? state.invasionLetterScores[ch] : INVASION_NEUTRAL_SCORE;
        const target = correct ? 1 : 0;
        state.invasionLetterScores[ch] = prev * 0.8 + target * 0.2;
        save(state);
        pushFullProgress();
        return state;
    }

    // Тот же нейтральный старт 0.7, что и у "Вторжения" (см. комментарий у
    // INVASION_NEUTRAL_SCORE) — не 1 (иначе непройденная буква никогда не
    // получила бы небольшой прибавки в шансе выпасть) и не 0 (иначе новые
    // буквы сразу доминировали бы в группах).
    const GROUPS_NEUTRAL_SCORE = 0.7;

    /**
     * Читает "успеваемость" по букве/цифре в НЕ-экзаменационных "Группах" —
     * см. комментарий у groupsLetterScores в defaults(). Только чтение.
     */
    function groupsLetterScore(ch) {
        const state = load();
        const scores = state.groupsLetterScores;
        return (scores && typeof scores[ch] === 'number') ? scores[ch] : GROUPS_NEUTRAL_SCORE;
    }

    /**
     * Обновляет "успеваемость" по букве/цифре после каждой отвеченной группы
     * в "Группах" (не в экзамене — вызывающий код обязан не звать это на
     * isExam-сессиях). Та же EMA-схема (вес 0.2), что и у
     * recordInvasionAttempt — недавние ответы значат больше старых.
     */
    function recordGroupsAttempt(ch, correct) {
        const state = load();
        if (!state.groupsLetterScores || typeof state.groupsLetterScores !== 'object') {
            state.groupsLetterScores = {};
        }
        const prev = (typeof state.groupsLetterScores[ch] === 'number') ? state.groupsLetterScores[ch] : GROUPS_NEUTRAL_SCORE;
        const target = correct ? 1 : 0;
        state.groupsLetterScores[ch] = prev * 0.8 + target * 0.2;
        save(state);
        pushFullProgress();
        return state;
    }

    /** То же самое, но для "Метода Коха" — см. kochLetterScores в defaults(). */
    function kochLetterScore(ch) {
        const state = load();
        const scores = state.kochLetterScores;
        return (scores && typeof scores[ch] === 'number') ? scores[ch] : GROUPS_NEUTRAL_SCORE;
    }

    function recordKochAttempt(ch, correct) {
        const state = load();
        if (!state.kochLetterScores || typeof state.kochLetterScores !== 'object') {
            state.kochLetterScores = {};
        }
        const prev = (typeof state.kochLetterScores[ch] === 'number') ? state.kochLetterScores[ch] : GROUPS_NEUTRAL_SCORE;
        const target = correct ? 1 : 0;
        state.kochLetterScores[ch] = prev * 0.8 + target * 0.2;
        save(state);
        pushFullProgress();
        return state;
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

        fetch('api/log_xp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 50, source: 'daily_bonus' })
        }).catch(() => {});

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
    // Отдельный in-flight промис, а не только резолвленное значение выше:
    // renderNavStats()+checkAchievements() и следом syncWithServer() (оба
    // зовутся из app.js на DOMContentLoaded практически синхронно) раньше
    // ловили гонку — на момент второго вызова cachedAchievements ещё null,
    // потому что первый fetch ещё не успел ответить, и улетал ВТОРОЙ такой
    // же запрос. Кэш резолвленного значения не спасал именно от гонки.
    let achievementsPromise = null;

    async function fetchAchievementDefs() {
        if (cachedAchievements) return cachedAchievements;
        if (!achievementsPromise) {
            achievementsPromise = fetchDashboard(['achievements'])
                .then((data) => { cachedAchievements = data.achievements || []; return cachedAchievements; })
                .catch(() => { cachedAchievements = []; return cachedAchievements; })
                .finally(() => { achievementsPromise = null; });
        }
        return achievementsPromise;
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
                // С v2.61 этот фильтрованный тип использует ТОЛЬКО
                // full_alphabet — остальные ачивки на learnedLetters смотри
                // ниже, у letters_learned_count_any.
                case 'letters_learned_count':
                    return state.learnedLetters.filter((ch) => ALL_LEARNABLE.includes(ch)).length;
                // Тот же баг и то же лечение, что у rhythm_mastered_count_any
                // ниже (найдено при аудите после фикса "Ровной руки",
                // 2026-08-01): "Первый сигнал"(1) и "Радист-новичок"(10) —
                // произвольные ранние вехи, не "весь алфавит" — делили
                // letters_learned_count с "Полным алфавитом"(36) и потому
                // ТОЖЕ не засчитывались тем, кто учил кириллицу первой.
                // Без фильтра, считает оба скрипта вместе.
                case 'letters_learned_count_any':
                    return state.learnedLetters.length;
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
                // markRhythmMastered) — для "Метронома" (порог 36, буквально
                // "вся латиница и цифры") считаем ТОЛЬКО латиницу+цифры, той
                // же причине, что и letters_learned_count выше: иначе сумма
                // латиницы и кириллицы засчитала бы "весь набор" раньше
                // реального прохождения всей латиницы.
                case 'rhythm_mastered_count':
                    return (state.rhythmMasteredLetters || []).filter((ch) => ALL_LEARNABLE.includes(ch)).length;
                // Реальный баг (2026-08-01): "Ровная рука" (порог 10, НЕ "весь
                // набор" — это просто произвольная веха) была заведена на тот
                // же rhythm_mastered_count, поэтому пользователь, отточивший
                // ритм для 10+ КИРИЛЛИЧЕСКИХ букв, ачивку не получал — фильтр
                // по ALL_LEARNABLE, оправданный для "Метронома" выше, здесь
                // просто ничего не защищал (10 не равно размеру никакого
                // полного набора), а только резал кириллицу без причины.
                // Отдельный condition_type без фильтра — считаем оба скрипта
                // вместе.
                case 'rhythm_mastered_count_any':
                    return (state.rhythmMasteredLetters || []).length;
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
        invasionLetterScore, recordInvasionAttempt,
        groupsLetterScore, recordGroupsAttempt,
        kochLetterScore, recordKochAttempt,
        levelFromXp, xpForNextLevel, fetchAchievementDefs, checkAchievements,
        resetAll, markDailyActivity, markKochLevelEarned, completeDailyChallenge,
        mergeFromServer, syncWithServer, pushNow,
        lastSyncAt, exportBackup, importBackup,
        fetchDashboard,
    };
})();

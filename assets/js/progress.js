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
    const DASH_CACHE_KEY = 'morsewave_dash_cache_v4';
    let dashInFlight = null; // {key, promise} — дедуп одновременных вызовов с одинаковым набором частей

    function clearDashCache() {
        try {
            sessionStorage.removeItem(DASH_CACHE_KEY);
            sessionStorage.removeItem('morsewave_dash_cache_v1');
            sessionStorage.removeItem('morsewave_dash_cache_v2');
            sessionStorage.removeItem('morsewave_dash_cache_v3');
        } catch {}
    }

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
            projectSupporter: 0,
        },
        unlockedAchievements: [],
        dailyChallengeDate: null,
        invasionDailyWinDate: null,
        pairConfusion: {},
        pairTrainer: {},
        dailyTraining: { date: null, seconds: 0 },
        trainingHistory: {},
        dosaaf: {
            maxStage: 1,
            currentStage: 1,
            examVer: 2,
            listenedLetters: [],
            stageWordsDone: {},
            examPassed: {},
        },
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
            if (!Array.isArray(state.unlockedAchievements)) {
                state.unlockedAchievements = [];
            }
            if (!Array.isArray(state.learnedLetters)) {
                state.learnedLetters = [];
            }
            if (!state.stats || typeof state.stats !== 'object') {
                state.stats = defaults().stats;
            }
            if (!state.trainingHistory || typeof state.trainingHistory !== 'object') {
                state.trainingHistory = {};
            }
            if (state.dailyTraining && state.dailyTraining.date && state.dailyTraining.seconds) {
                state.trainingHistory[state.dailyTraining.date] = Math.max(
                    Number(state.trainingHistory[state.dailyTraining.date]) || 0,
                    Number(state.dailyTraining.seconds) || 0
                );
            }
            if (!state.dosaaf || typeof state.dosaaf !== 'object') {
                state.dosaaf = defaults().dosaaf;
            }
            // Подтягиваем данные из legacy localStorage ДОСААФ, если они новее
            try {
                const lsMax = parseInt(localStorage.getItem('morse_dosaaf_max_stage'), 10);
                if (lsMax && lsMax > (Number(state.dosaaf.maxStage) || 1)) {
                    state.dosaaf.maxStage = lsMax;
                }
                const lsCurr = parseInt(localStorage.getItem('morse_dosaaf_current_stage'), 10);
                if (lsCurr && (!state.dosaaf.currentStage || lsCurr > state.dosaaf.currentStage)) {
                    state.dosaaf.currentStage = lsCurr;
                }
                const lsListened = localStorage.getItem('morse_dosaaf_listened_letters');
                if (lsListened) {
                    const parsedL = JSON.parse(lsListened);
                    if (Array.isArray(parsedL) && parsedL.length) {
                        state.dosaaf.listenedLetters = [...new Set([
                            ...(Array.isArray(state.dosaaf.listenedLetters) ? state.dosaaf.listenedLetters : []),
                            ...parsedL
                        ])];
                    }
                }
                const lsWords = localStorage.getItem('morse_dosaaf_stage_words_done');
                if (lsWords) {
                    const parsedW = JSON.parse(lsWords);
                    if (parsedW && typeof parsedW === 'object') {
                        state.dosaaf.stageWordsDone = { ...(state.dosaaf.stageWordsDone || {}), ...parsedW };
                    }
                }
                const lsExams = localStorage.getItem('morse_dosaaf_exam_passed');
                if (lsExams) {
                    const parsedE = JSON.parse(lsExams);
                    if (parsedE && typeof parsedE === 'object') {
                        state.dosaaf.examPassed = { ...(state.dosaaf.examPassed || {}), ...parsedE };
                    }
                }
            } catch (_) {}
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

        // pairConfusion — статистика ошибок на парах (max по каждому ключу)
        {
            const localConfusion = (local.pairConfusion && typeof local.pairConfusion === 'object') ? local.pairConfusion : {};
            const serverConfusion = (server.pairConfusion && typeof server.pairConfusion === 'object') ? server.pairConfusion : {};
            merged.pairConfusion = {};
            new Set([...Object.keys(localConfusion), ...Object.keys(serverConfusion)]).forEach((k) => {
                merged.pairConfusion[k] = Math.max(Number(localConfusion[k]) || 0, Number(serverConfusion[k]) || 0);
            });
        }

        // pairTrainer — прогресс по этапам лечения пар
        {
            const localTrainer = (local.pairTrainer && typeof local.pairTrainer === 'object') ? local.pairTrainer : {};
            const serverTrainer = (server.pairTrainer && typeof server.pairTrainer === 'object') ? server.pairTrainer : {};
            merged.pairTrainer = {};
            new Set([...Object.keys(localTrainer), ...Object.keys(serverTrainer)]).forEach((k) => {
                const lt = localTrainer[k] || {};
                const st = serverTrainer[k] || {};
                const stage = Math.max(Number(lt.stage) || 1, Number(st.stage) || 1);
                const completed = { ...(lt.completed || {}), ...(st.completed || {}) };
                merged.pairTrainer[k] = { stage, completed };
            });
        }

        // dailyTraining — суммарное время тренировок за день
        {
            const lDt = (local.dailyTraining && typeof local.dailyTraining === 'object') ? local.dailyTraining : {};
            const sDt = (server.dailyTraining && typeof server.dailyTraining === 'object') ? server.dailyTraining : {};
            if (sDt.date && lDt.date) {
                if (sDt.date > lDt.date) {
                    merged.dailyTraining = { date: sDt.date, seconds: Number(sDt.seconds) || 0 };
                } else if (sDt.date === lDt.date) {
                    merged.dailyTraining = {
                        date: sDt.date,
                        seconds: Math.max(Number(lDt.seconds) || 0, Number(sDt.seconds) || 0)
                    };
                } else {
                    merged.dailyTraining = { date: lDt.date, seconds: Number(lDt.seconds) || 0 };
                }
            } else {
                merged.dailyTraining = sDt.date ? { date: sDt.date, seconds: Number(sDt.seconds) || 0 } : (lDt.date ? { date: lDt.date, seconds: Number(lDt.seconds) || 0 } : { date: null, seconds: 0 });
            }
        }

        // trainingHistory — история времени тренировок по дням
        {
            merged.trainingHistory = { ...((local.trainingHistory && typeof local.trainingHistory === 'object') ? local.trainingHistory : {}) };
            const sHist = (server.trainingHistory && typeof server.trainingHistory === 'object') ? server.trainingHistory : {};
            for (const [d, sec] of Object.entries(sHist)) {
                merged.trainingHistory[d] = Math.max(Number(merged.trainingHistory[d]) || 0, Number(sec) || 0);
            }
            if (merged.dailyTraining && merged.dailyTraining.date && merged.dailyTraining.seconds) {
                merged.trainingHistory[merged.dailyTraining.date] = Math.max(
                    Number(merged.trainingHistory[merged.dailyTraining.date]) || 0,
                    Number(merged.dailyTraining.seconds) || 0
                );
            }
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
        merged.invasionDailyWinDate = laterDate(local.invasionDailyWinDate, server.invasionDailyWinDate);

        // dosaaf — прогресс ДОСААФ (maxStage, currentStage, listenedLetters, stageWordsDone, examPassed)
        {
            const lD = (local.dosaaf && typeof local.dosaaf === 'object') ? local.dosaaf : defaults().dosaaf;
            const sD = (server.dosaaf && typeof server.dosaaf === 'object') ? server.dosaaf : defaults().dosaaf;

            // Миграция v2 (непрерывная зачётная радиограмма):
            // Если сохранённые данные (локальные или серверные) ещё со старой версии (examVer < 2),
            // сбрасываем открытые ступени до Ступени 1 и очищаем старые пословные зачёты.
            const lVer = Number(lD.examVer) || 0;
            const sVer = Number(sD.examVer) || 0;

            if (lVer < 2 && sVer < 2) {
                lD.maxStage = 1;
                lD.currentStage = 1;
                lD.examPassed = {};
                lD.stageWordsDone = {};
                lD.examVer = 2;

                sD.maxStage = 1;
                sD.currentStage = 1;
                sD.examPassed = {};
                sD.stageWordsDone = {};
                sD.examVer = 2;

                try {
                    localStorage.setItem('morse_dosaaf_max_stage', '1');
                    localStorage.setItem('morse_dosaaf_current_stage', '1');
                    localStorage.removeItem('morse_dosaaf_exam_passed');
                    localStorage.removeItem('morse_dosaaf_stage_words_done');
                } catch (_) {}
            } else if (lVer >= 2 && sVer < 2) {
                sD.maxStage = 1;
                sD.currentStage = 1;
                sD.examPassed = {};
                sD.stageWordsDone = {};
                sD.examVer = 2;
            } else if (sVer >= 2 && lVer < 2) {
                lD.maxStage = 1;
                lD.currentStage = 1;
                lD.examPassed = {};
                lD.stageWordsDone = {};
                lD.examVer = 2;
            }

            let lsMax = 1;
            let lsCurr = 1;
            let lsListened = [];
            let lsWords = {};
            let lsExams = {};
            try {
                lsMax = parseInt(localStorage.getItem('morse_dosaaf_max_stage'), 10) || 1;
                lsCurr = parseInt(localStorage.getItem('morse_dosaaf_current_stage'), 10) || 1;
                const rL = localStorage.getItem('morse_dosaaf_listened_letters');
                if (rL) lsListened = JSON.parse(rL) || [];
                const rW = localStorage.getItem('morse_dosaaf_stage_words_done');
                if (rW) lsWords = JSON.parse(rW) || {};
                const rE = localStorage.getItem('morse_dosaaf_exam_passed');
                if (rE) lsExams = JSON.parse(rE) || {};
            } catch (_) {}

            const mergedMax = Math.max(Number(lD.maxStage) || 1, Number(sD.maxStage) || 1, lsMax);
            const candidateCurr = Math.max(Number(lD.currentStage) || 1, Number(sD.currentStage) || 1, lsCurr);
            const mergedCurr = Math.min(candidateCurr, mergedMax);

            const mergedListened = [...new Set([
                ...(Array.isArray(lD.listenedLetters) ? lD.listenedLetters : []),
                ...(Array.isArray(sD.listenedLetters) ? sD.listenedLetters : []),
                ...(Array.isArray(lsListened) ? lsListened : []),
            ])];

            const wordsDone = {};
            const allWordsStages = new Set([
                ...Object.keys(lD.stageWordsDone || {}),
                ...Object.keys(sD.stageWordsDone || {}),
                ...Object.keys(lsWords || {})
            ]);
            allWordsStages.forEach(st => {
                wordsDone[st] = Math.max(
                    Number(lD.stageWordsDone?.[st]) || 0,
                    Number(sD.stageWordsDone?.[st]) || 0,
                    Number(lsWords[st]) || 0
                );
            });

            const mergedExams = {
                ...(lsExams || {}),
                ...(sD.examPassed || {}),
                ...(lD.examPassed || {}),
            };

            merged.dosaaf = {
                maxStage: mergedMax,
                currentStage: mergedCurr,
                examVer: 2,
                listenedLetters: mergedListened,
                stageWordsDone: wordsDone,
                examPassed: mergedExams,
            };

            // Зеркалируем в legacy localStorage для полной совместимости
            try {
                localStorage.setItem('morse_dosaaf_max_stage', String(mergedMax));
                localStorage.setItem('morse_dosaaf_current_stage', String(mergedCurr));
                localStorage.setItem('morse_dosaaf_listened_letters', JSON.stringify(mergedListened));
                localStorage.setItem('morse_dosaaf_stage_words_done', JSON.stringify(wordsDone));
                localStorage.setItem('morse_dosaaf_exam_passed', JSON.stringify(mergedExams));
            } catch (_) {}
        }

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

    /**
     * Явное логирование сессии в БД (XP Analytics).
     * Отвязано от локального начисления (addXp), чтобы не спамить БД
     * при каждой отгаданной группе/букве, а отправлять один лог за сессию.
     */
    function logXp(amount, source, details = null) {
        if (amount <= 0 || !source) return;
        const payload = { amount, source };
        if (details) payload.details = details;
        
        fetch('api/log_xp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
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

    const CLASSIC_PAIRS = [
        { a: 'S', b: 'H', key: 'SH' },
        { a: 'B', b: 'D', key: 'BD' },
        { a: 'U', b: 'V', key: 'UV' },
        { a: 'H', b: '5', key: 'H5' },
        { a: '7', b: '8', key: '78' },
        { a: 'B', b: '6', key: 'B6' },
        { a: 'F', b: 'L', key: 'FL' },
        { a: 'P', b: 'J', key: 'PJ' },
        { a: 'Ш', b: 'Щ', key: 'ШЩ' },
        { a: 'Ч', b: 'Ц', key: 'ЧЦ' },
        { a: 'Д', b: 'Б', key: 'ДБ' },
        { a: 'У', b: 'Ж', key: 'УЖ' },
        { a: 'Г', b: 'З', key: 'ГЗ' },
        { a: 'П', b: 'Л', key: 'ПЛ' },
    ];

    /**
     * Запоминает пару символов, на которой оператор ошибся (например, ожидался 'H', введен 'S').
     */
    function recordPairConfusion(ch1, ch2) {
        if (!ch1 || !ch2 || ch1 === ch2) return;
        const a = String(ch1).toUpperCase();
        const b = String(ch2).toUpperCase();
        if (!/^[A-Z0-9А-ЯЁ]$/.test(a) || !/^[A-Z0-9А-ЯЁ]$/.test(b)) return;
        const key = [a, b].sort().join('-');
        const state = load();
        if (!state.pairConfusion || typeof state.pairConfusion !== 'object') {
            state.pairConfusion = {};
        }
        state.pairConfusion[key] = (state.pairConfusion[key] || 0) + 1;
        save(state);
        pushFullProgress();
    }

    /**
     * Сбрасывает счетчик ошибок на паре при её успешном лечении (дуэль 3 этапа ≥ 90%).
     */
    function clearPairConfusion(ch1, ch2) {
        if (!ch1 || !ch2) return;
        const a = String(ch1).toUpperCase();
        const b = String(ch2).toUpperCase();
        const key = [a, b].sort().join('-');
        const state = load();
        if (state.pairConfusion && typeof state.pairConfusion === 'object' && state.pairConfusion[key] !== undefined) {
            delete state.pairConfusion[key];
            save(state);
            pushFullProgress();
        }
    }

    function getDailyGoalMinutes() {
        const saved = parseInt(localStorage.getItem('morsewave_daily_goal_mins'), 10);
        return (!isNaN(saved) && saved >= 1 && saved <= 720) ? saved : 30;
    }

    function setDailyGoalMinutes(mins) {
        const val = parseInt(mins, 10);
        if (!isNaN(val) && val >= 1 && val <= 720) {
            localStorage.setItem('morsewave_daily_goal_mins', val);
        }
    }

    function addTrainingTime(seconds) {
        if (!seconds || seconds <= 0) return getTodayTrainingSeconds();
        const capped = Math.min(seconds, 1800);
        const state = load();
        const todayStr = today();
        if (!state.dailyTraining || typeof state.dailyTraining !== 'object' || state.dailyTraining.date !== todayStr) {
            state.dailyTraining = { date: todayStr, seconds: 0 };
        }
        state.dailyTraining.seconds = (state.dailyTraining.seconds || 0) + capped;

        if (!state.trainingHistory || typeof state.trainingHistory !== 'object') {
            state.trainingHistory = {};
        }
        state.trainingHistory[todayStr] = Math.max(
            (Number(state.trainingHistory[todayStr]) || 0) + capped,
            state.dailyTraining.seconds
        );

        // Ограничиваем историю последними 30 днями
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        for (const k of Object.keys(state.trainingHistory)) {
            if (k < cutoffStr) delete state.trainingHistory[k];
        }

        save(state);
        pushFullProgress();
        return state.dailyTraining.seconds;
    }

    function getTodayTrainingSeconds() {
        const state = load();
        const todayStr = today();
        if (state.dailyTraining && state.dailyTraining.date === todayStr) {
            return Number(state.dailyTraining.seconds) || 0;
        }
        return 0;
    }

    function getWeekTrainingSeconds() {
        const state = load();
        const hist = (state.trainingHistory && typeof state.trainingHistory === 'object') ? state.trainingHistory : {};
        const todayStr = today();
        const todaySecs = getTodayTrainingSeconds();

        // Понедельник текущей недели (в UTC, синхронно с today())
        const now = new Date();
        const utcDay = (now.getUTCDay() + 6) % 7; // 0 = Пн, ..., 6 = Вс
        const mondayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - utcDay));
        const mondayStr = mondayUtc.toISOString().slice(0, 10);

        let total = 0;
        let todayFound = false;
        for (const [dStr, sec] of Object.entries(hist)) {
            if (dStr >= mondayStr && dStr <= todayStr) {
                if (dStr === todayStr) {
                    total += Math.max(Number(sec) || 0, todaySecs);
                    todayFound = true;
                } else {
                    total += Number(sec) || 0;
                }
            }
        }
        if (!todayFound && todaySecs > 0) {
            total += todaySecs;
        }
        return Math.max(total, todaySecs);
    }

    function formatDuration(seconds) {
        const sec = Math.max(0, Math.round(Number(seconds) || 0));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const isEn = (typeof currentLang === 'function' && currentLang() === 'en') || (document.documentElement.lang === 'en');
        if (m === 0) {
            return isEn ? `${s} sec` : `${s} сек`;
        }
        if (s === 0) {
            return isEn ? `${m} min` : `${m} мин`;
        }
        return isEn ? `${m} min ${s} sec` : `${m} мин ${s} сек`;
    }

    function renderTrainingSummary(containerOrId, sessionSeconds = 0) {
        const container = (typeof containerOrId === 'string') ? document.getElementById(containerOrId) : containerOrId;
        if (!container) return;

        const todaySecs = getTodayTrainingSeconds();
        const todayMins = Math.floor(todaySecs / 60);
        const goalMins = getDailyGoalMinutes();
        const weekSecs = getWeekTrainingSeconds();
        const weekMins = Math.floor(weekSecs / 60);
        const weeklyGoalMins = 135; // Норматив ДОСААФ / радиоспорта: 3 x 45 мин = 135 мин

        let sessionHtml = '';
        if (sessionSeconds && sessionSeconds >= 3) {
            const timeStr = formatDuration(sessionSeconds);
            const sessionLabel = (typeof t === 'function' && t('groups.session_duration'))
                ? t('groups.session_duration', { '{time}': `<b>${timeStr}</b>` })
                : `Время тренировки: <b>${timeStr}</b>`;
            sessionHtml = `<div style="font-weight:700; color:var(--text); font-size:14px; margin-bottom:4px;">⏱ ${sessionLabel}</div>`;
        }

        let dailyHtml = '';
        if (todayMins >= goalMins) {
            dailyHtml = (typeof t === 'function' && t('groups.daily_time_done'))
                ? t('groups.daily_time_done', { '{done}': todayMins, '{goal}': goalMins })
                : `🎉 Отличная работа! Сегодня вы тренировались ${todayMins} мин — норма дня (${goalMins} мин) выполнена!`;
        } else {
            const leftMins = Math.max(1, goalMins - todayMins);
            dailyHtml = (typeof t === 'function' && t('groups.daily_time_progress'))
                ? t('groups.daily_time_progress', { '{done}': todayMins, '{goal}': goalMins, '{left}': leftMins })
                : `⏱ Сегодня вы тренировались ${todayMins} мин. До нормы дня (${goalMins} мин) — ещё ${leftMins} мин.`;
        }

        let weeklyHtml = '';
        if (weekMins >= weeklyGoalMins) {
            weeklyHtml = (typeof t === 'function' && t('groups.weekly_time_done'))
                ? t('groups.weekly_time_done', { '{done}': weekMins, '{goal}': weeklyGoalMins })
                : `🎉 Недельная норма 3 по 45 мин (${weeklyGoalMins} мин) выполнена: ${weekMins} мин!`;
        } else {
            weeklyHtml = (typeof t === 'function' && t('groups.weekly_time_progress'))
                ? t('groups.weekly_time_progress', { '{done}': weekMins, '{goal}': weeklyGoalMins })
                : `📅 Недельная цель: 3 по 45 мин (на этой неделе ${weekMins} из ${weeklyGoalMins} мин)`;
        }

        const weeklyRec = (typeof t === 'function' && t('groups.weekly_time_rec'))
            ? t('groups.weekly_time_rec')
            : 'Рекомендуемый ритм: 3 тренировки по 45 мин (или 15–20 мин ежедневно)';

        const changeHint = (typeof t === 'function' && t('groups.daily_time_change_hint'))
            ? t('groups.daily_time_change_hint')
            : '(изменить норму можно в <a href="account.php?tab=display" class="link">профиле</a>)';

        container.innerHTML = `
            ${sessionHtml}
            <div style="font-size:13px; color:var(--text); line-height:1.45;">${dailyHtml}</div>
            <div class="muted mt-1" style="font-size:11px; line-height:1.4; opacity:0.88;">
                ${weeklyHtml} · <span>${weeklyRec}</span>
            </div>
            <div class="muted mt-1" style="font-size:11px;">
                ${changeHint}
            </div>
        `;
        container.style.display = 'block';
    }

    function getPairTrainer() {
        const state = load();
        return (state.pairTrainer && typeof state.pairTrainer === 'object') ? state.pairTrainer : {};
    }

    function savePairStage(pairKey, stage, accuracy) {
        const state = load();
        if (!state.pairTrainer || typeof state.pairTrainer !== 'object') {
            state.pairTrainer = {};
        }
        if (!state.pairTrainer[pairKey]) {
            state.pairTrainer[pairKey] = { stage: 1, completed: {} };
        }
        state.pairTrainer[pairKey].completed = state.pairTrainer[pairKey].completed || {};
        state.pairTrainer[pairKey].completed[stage] = { accuracy: Math.round(accuracy), at: Date.now() };
        if (stage < 3) {
            state.pairTrainer[pairKey].stage = Math.max(state.pairTrainer[pairKey].stage || 1, stage + 1);
        }
        save(state);
        pushFullProgress();
    }

    function getRecommendedPair() {
        const state = load();
        const conf = state.pairConfusion || {};
        const scores = state.groupsLetterScores || {};
        let best = null;
        let highestConfusion = 0;

        // 1. Поиск пары с наибольшим числом реальных ошибок (и среди классических, и среди кастомных)
        for (const [key, count] of Object.entries(conf)) {
            const numCount = Number(count) || 0;
            if (numCount > highestConfusion && numCount >= 2) {
                const parts = key.split('-');
                if (parts.length === 2 && parts[0] && parts[1]) {
                    const classic = CLASSIC_PAIRS.find(cp =>
                        (cp.a === parts[0] && cp.b === parts[1]) ||
                        (cp.a === parts[1] && cp.b === parts[0])
                    );
                    highestConfusion = numCount;
                    best = {
                        pair: classic ? classic.key : 'custom',
                        a: classic ? classic.a : parts[0],
                        b: classic ? classic.b : parts[1],
                        count: numCount,
                        reason: 'confusion'
                    };
                }
            }
        }

        // 2. Если явных частых путаниц в истории нет, рекомендуем классическую пару с наименьшим скором букв
        if (!best) {
            let lowestScore = 0.65;
            for (const p of CLASSIC_PAIRS) {
                const scoreA = (typeof scores[p.a] === 'number') ? scores[p.a] : 0.7;
                const scoreB = (typeof scores[p.b] === 'number') ? scores[p.b] : 0.7;
                const minScore = Math.min(scoreA, scoreB);
                if (minScore < lowestScore) {
                    lowestScore = minScore;
                    best = { pair: p.key, a: p.a, b: p.b, score: minScore, reason: 'score' };
                }
            }
        }

        return best;
    }

    function getMostConfusedPair(minMistakes = 10) {
        const rec = getRecommendedPair();
        if (rec && rec.reason === 'confusion' && rec.count >= minMistakes) {
            return rec;
        }
        return null;
    }

    function formatMistakes(n) {
        const count = Math.round(Number(n) || 0);
        const abs = Math.abs(count);
        const mod10 = abs % 10;
        const mod100 = abs % 100;
        const lang = (window.currentLang || document.documentElement.lang || 'ru');
        if (lang === 'en') {
            return `${count} ${count === 1 ? 'mistake' : 'mistakes'}`;
        }
        let word = 'ошибок';
        if (mod100 < 11 || mod100 > 19) {
            if (mod10 === 1) word = 'ошибка';
            else if (mod10 >= 2 && mod10 <= 4) word = 'ошибки';
        }
        return `${count} ${word}`;
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

    /**
     * Атомарно засчитать ежедневный бонус за первую победу во Вторжении: +50 XP
     * и отметка сегодняшней даты invasionDailyWinDate в одном load→save.
     * Возвращает true, если бонус реально начислен сейчас.
     */
    function completeInvasionDailyWin() {
        const state = load();
        if (state.invasionDailyWinDate === today()) return false;
        state.xp = Math.round(state.xp + 50);
        state.invasionDailyWinDate = today();
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        checkAchievements();
        refreshPublishedStats(state);
        pushFullProgress();

        fetch('api/log_xp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 50, source: 'invasion_first_win' })
        }).catch(() => {});

        return true;
    }

    function isInvasionDailyWinDone() {
        const state = load();
        return state.invasionDailyWinDate === today();
    }

    function incrementStat(field, by = 1) {
        const state = load();
        state.stats[field] = (state.stats[field] || 0) + by;
        save(state);
        checkAchievements();
        pushFullProgress();
        return state;
    }

    async function markProjectSupporter() {
        const state = load();
        state.stats = state.stats || {};
        state.stats.projectSupporter = 1;
        if (!state.unlockedAchievements.includes('project_supporter')) {
            state.unlockedAchievements.push('project_supporter');
        }
        save(state);
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: state }));
        await checkAchievements();
        await pushNow();
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
        if (cachedAchievements && cachedAchievements.length > 0) return cachedAchievements;
        if (!achievementsPromise) {
            achievementsPromise = (async () => {
                try {
                    const data = await fetchDashboard(['achievements']);
                    if (data && Array.isArray(data.achievements) && data.achievements.length > 0) {
                        cachedAchievements = data.achievements;
                        return cachedAchievements;
                    }
                } catch { /* пробуем fallback */ }

                // Запасной fallback на прямой эндпоинт, если batch-ответ не вернул ачивки
                try {
                    const res = await fetch('api/achievements.php');
                    if (res.ok) {
                        const direct = await res.json();
                        if (Array.isArray(direct) && direct.length > 0) {
                            cachedAchievements = direct;
                            return cachedAchievements;
                        }
                    }
                } catch { /* не удалось */ }

                return cachedAchievements || [];
            })().finally(() => { achievementsPromise = null; });
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
                case 'project_supporter':
                    return (
                        (state.stats && state.stats.projectSupporter) ||
                        (state.unlockedAchievements && state.unlockedAchievements.includes('project_supporter'))
                    ) ? 1 : 0;
                case 'dosaaf_cadet': {
                    try {
                        const dEx = JSON.parse(localStorage.getItem('morse_dosaaf_exam_passed') || '{}');
                        return Object.keys(dEx).length >= 1 ? 1 : 0;
                    } catch { return 0; }
                }
                case 'dosaaf_class3': {
                    try {
                        const dEx = JSON.parse(localStorage.getItem('morse_dosaaf_exam_passed') || '{}');
                        return (dEx[7] && (dEx[7].wpm || 0) >= 14) ? 1 : 0;
                    } catch { return 0; }
                }
                case 'dosaaf_class2': {
                    try {
                        const dEx = JSON.parse(localStorage.getItem('morse_dosaaf_exam_passed') || '{}');
                        return (dEx[7] && (dEx[7].wpm || 0) >= 19) ? 1 : 0;
                    } catch { return 0; }
                }
                case 'dosaaf_class1': {
                    try {
                        const dEx = JSON.parse(localStorage.getItem('morse_dosaaf_exam_passed') || '{}');
                        return (dEx[7] && (dEx[7].wpm || 0) >= 24) ? 1 : 0;
                    } catch { return 0; }
                }
                case 'dosaaf_master': {
                    try {
                        const dEx = JSON.parse(localStorage.getItem('morse_dosaaf_exam_passed') || '{}');
                        return (dEx[7] && (dEx[7].wpm || 0) >= 28) ? 1 : 0;
                    } catch { return 0; }
                }
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
        try {
            localStorage.removeItem('morse_dosaaf_max_stage');
            localStorage.removeItem('morse_dosaaf_current_stage');
            localStorage.removeItem('morse_dosaaf_listened_letters');
            localStorage.removeItem('morse_dosaaf_stage_words_done');
            localStorage.removeItem('morse_dosaaf_exam_passed');
        } catch (_) {}
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
        load, save, addXp, logXp, markLetterLearned, markRecognizedUnique, markRhythmMastered, updateRhythmBest, setKochLevel, incrementStat,
        invasionLetterScore, recordInvasionAttempt,
        groupsLetterScore, recordGroupsAttempt,
        kochLetterScore, recordKochAttempt,
        recordPairConfusion, clearPairConfusion, getPairTrainer, savePairStage, getRecommendedPair, getMostConfusedPair, formatMistakes, CLASSIC_PAIRS,
        addTrainingTime, getTodayTrainingSeconds, getWeekTrainingSeconds, getDailyGoalMinutes, setDailyGoalMinutes, formatDuration, renderTrainingSummary,
        levelFromXp, xpForNextLevel, fetchAchievementDefs, checkAchievements,
        resetAll, markDailyActivity, markKochLevelEarned, completeDailyChallenge,
        completeInvasionDailyWin, isInvasionDailyWinDone, markProjectSupporter,
        mergeFromServer, syncWithServer, pushNow, pushFullProgress,
        lastSyncAt, exportBackup, importBackup,
        fetchDashboard, clearDashCache,
    };
})();

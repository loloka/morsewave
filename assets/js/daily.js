/**
 * DailyChallenge — единый источник «задания дня». И главная (показать), и
 * каждый режим (проверить выполнение) считают задание из ОДНОГО места, чтобы
 * они не разошлись. Задание детерминировано от пары «дата + этап игрока»:
 * внутри одного дня и одного этапа оно всегда одинаковое.
 *
 * Этап определяется по прогрессу — новичку не выпадет приём групп на 24 wpm,
 * а тому, кто уже знает алфавит, не выпадет «изучи 3 буквы». Бонус +50 XP
 * начисляется через общий Progress.completeDailyChallenge() (одна отметка на
 * день, тип задания на неё не влияет — двойного бонуса быть не может).
 */
const DailyChallenge = (() => {
    function todayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function seedFrom(str) {
        let s = 0;
        for (const ch of str) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
        return s;
    }

    /**
     * Этап игрока по числу выученных символов. Пороги осознанные:
     * <8 — человек ещё только знакомится с ключом; 8..25 — алфавит в процессе,
     * пора тренировать приём на слух; ≥26 — алфавит закрыт, можно давать
     * полноценные группы. При желании легко подкрутить здесь одним числом.
     */
    function stage(state) {
        const learned = (state && Array.isArray(state.learnedLetters))
            ? state.learnedLetters.length : 0;
        if (learned < 8) return 'novice';
        if (learned < 26) return 'learning';
        return 'confident';
    }

    /**
     * Задание на сегодня для текущего прогресса. Возвращает объект с полями:
     *   type   — 'learn' | 'recognize' | 'groups'
     *   title  — короткий заголовок для карточки
     *   desc   — пояснение
     *   href   — куда вести кнопку (уже с ?daily=1 и нужными параметрами)
     *   target — сколько нужно сделать (для learn/recognize)
     *   len/count/wpm — параметры набора групп (для groups)
     */
    function forToday(state) {
        state = state || Progress.load();
        const date = todayStr();
        const st = stage(state);

        if (st === 'novice') {
            return {
                type: 'learn', stage: st, date, target: 3,
                title: 'Изучи 3 новые буквы ключом',
                desc: 'Открой 3 любых новых символа в режиме «Обучение → Отправка ключом». Бонус +50 XP один раз в день.',
                href: 'learn.php?daily=1',
            };
        }

        if (st === 'learning') {
            return {
                type: 'recognize', stage: st, date, target: 20,
                title: 'Прими 20 символов на слух',
                desc: 'Верно распознай 20 символов в режиме «Обучение → Приём на слух». Бонус +50 XP один раз в день.',
                href: 'learn.php?daily=1&mode=recognize',
            };
        }

        // confident — приём групп. wpm намеренно мягкий (12/15/18, без 20/24):
        // высокую скорость теперь и так вознаграждает скоростной множитель,
        // принуждать к ней в задании дня не нужно.
        let seed = seedFrom(date);
        const lens = [3, 4, 5];
        const counts = [10, 20, 30];
        const wpms = [12, 15, 18];
        const len = lens[seed % lens.length];
        seed = (seed * 7 + 3) >>> 0;
        const count = counts[seed % counts.length];
        seed = (seed * 7 + 3) >>> 0;
        const wpm = wpms[seed % wpms.length];

        return {
            type: 'groups', stage: st, date, len, count, wpm,
            title: `${count} групп по ${len} символа(ов) на ${wpm} wpm`,
            desc: 'Прими группы в режиме «Группы символов». Бонус +50 XP один раз в день.',
            href: `groups.php?daily=1&len=${len}&count=${count}&wpm=${wpm}`,
        };
    }

    function isDoneToday(state) {
        state = state || Progress.load();
        return state.dailyChallengeDate === todayStr();
    }

    return { forToday, stage, isDoneToday, todayStr };
})();

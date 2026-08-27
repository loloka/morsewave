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
        const groupsCompleted = (state && state.stats && state.stats.groupsCompleted) || 0;
        
        if (learned < 8) return 'novice';
        if (learned < 26) return 'learning';
        // Если выучили весь алфавит с цифрами и набили руку (прошли более 500 групп)
        if (learned >= 36 && groupsCompleted >= 500) return 'expert';
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
                title: t('js.daily.learn_title'),
                desc: t('js.daily.learn_desc'),
                href: 'learn.php?daily=1',
            };
        }

        if (st === 'learning') {
            return {
                type: 'recognize', stage: st, date, target: 20,
                title: t('js.daily.recognize_title'),
                desc: t('js.daily.recognize_desc'),
                href: 'learn.php?daily=1&mode=recognize',
            };
        }

        let seed = seedFrom(date);
        let taskType = 'groups';

        if (st === 'confident' || st === 'expert') {
            let availableTasks = ['groups', 'callsigns', 'invasion'];
            if ((state.kochLevel || 1) < 43) {
                availableTasks.push('koch');
            }
            taskType = availableTasks[seed % availableTasks.length];
            seed = (seed * 7 + 3) >>> 0;
        }

        if (taskType === 'callsigns') {
            let counts, wpms;
            if (st === 'expert') {
                counts = [20, 25, 30];
                wpms = [20, 22, 24];
            } else {
                counts = [15, 20];
                wpms = [15, 18, 20];
            }
            const count = counts[seed % counts.length];
            seed = (seed * 7 + 3) >>> 0;
            const wpm = wpms[seed % wpms.length];

            return {
                type: 'callsigns', stage: st, date, count, wpm,
                title: t('js.daily.callsigns_title', { '{count}': count, '{wpm}': wpm }),
                desc: t('js.daily.callsigns_desc'),
                href: `callsigns.php?daily=1&count=${count}&wpm=${wpm}`,
            };
        }

        if (taskType === 'koch') {
            return {
                type: 'koch', stage: st, date,
                title: t('js.daily.koch_title'),
                desc: t('js.daily.koch_desc'),
                href: `koch.php?daily=1`,
            };
        }

        if (taskType === 'invasion') {
            return {
                type: 'invasion', stage: st, date,
                title: t('js.daily.invasion_title'),
                desc: t('js.daily.invasion_desc'),
                href: `learn.php?daily=1&mode=invasion`,
            };
        }

        // groups
        let lens, counts, wpms;
        if (st === 'expert') {
            lens = [4, 5];
            counts = [20, 30, 40, 50];
            wpms = [20, 22, 24];
        } else {
            lens = [3, 4, 5];
            counts = [10, 20, 30];
            wpms = [12, 15, 18];
        }

        const len = lens[seed % lens.length];
        seed = (seed * 7 + 3) >>> 0;
        const count = counts[seed % counts.length];
        seed = (seed * 7 + 3) >>> 0;
        const wpm = wpms[seed % wpms.length];

        return {
            type: 'groups', stage: st, date, len, count, wpm,
            title: t('js.daily.groups_title', { '{count}': count, '{len}': len, '{wpm}': wpm }),
            desc: t('js.daily.groups_desc'),
            href: `groups.php?daily=1&len=${len}&count=${count}&wpm=${wpm}`,
        };
    }

    function isDoneToday(state) {
        state = state || Progress.load();
        return state.dailyChallengeDate === todayStr();
    }

    return { forToday, stage, isDoneToday, todayStr };
})();

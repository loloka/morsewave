/**
 * Банк текстов для режима «Реальные слова» (groups.php, третий таб).
 *
 * Зачем отдельный режим: приём случайных групп тренирует распознавание
 * каждого знака по отдельности, но в реальном эфире летят слова. Опытный
 * оператор узнаёт частое слово одним звуковым образом, не складывая его из
 * букв, — этот навык случайными группами не тренируется в принципе.
 *
 * Только латиница и цифры: кириллическая морзянка — отдельная задача,
 * которой в проекте пока нет. Всё, что здесь лежит, обязано состоять из
 * символов, известных MORSE_CODE (см. morse-data.js), иначе символ молча
 * пропустится при воспроизведении.
 */

/* Частые английские слова. Порядок примерно по убыванию частотности, а
   внутри — от коротких к длинным: короткое слово на слух даётся заметно
   легче, и начинать разумно с них. */
const COMMON_WORDS = [
    // 2–3 буквы
    'THE', 'AND', 'YOU', 'ARE', 'FOR', 'NOT', 'BUT', 'ALL', 'CAN', 'HAD',
    'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS',
    'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY',
    'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'BIG', 'END',
    'FAR', 'GOT', 'RUN', 'SET', 'TRY', 'ASK', 'MEN', 'OWN', 'TOP', 'YES',
    'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT',
    'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE',
    // 4 буквы
    'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW',
    'WANT', 'BEEN', 'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME',
    'HERE', 'JUST', 'LIKE', 'LONG', 'MAKE', 'MANY', 'MORE', 'ONLY', 'OVER',
    'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'WHAT', 'WORK', 'YEAR',
    'BACK', 'CALL', 'EACH', 'FIND', 'GIVE', 'HAND', 'HIGH', 'KEEP', 'LAST',
    'LEFT', 'LIFE', 'LIVE', 'NEED', 'NEXT', 'OPEN', 'PART', 'SAME', 'SHOW',
    'SIDE', 'TELL', 'TURN', 'USED', 'WEEK', 'WORD', 'BEST', 'DOWN', 'FEEL',
    // 5+ букв
    'ABOUT', 'AFTER', 'AGAIN', 'COULD', 'EVERY', 'FIRST', 'GREAT', 'OTHER',
    'PLACE', 'RIGHT', 'SMALL', 'SOUND', 'STILL', 'THEIR', 'THERE', 'THESE',
    'THINK', 'THREE', 'UNDER', 'WATER', 'WHERE', 'WHICH', 'WHILE', 'WORLD',
    'WOULD', 'YEARS', 'HOUSE', 'NIGHT', 'POINT', 'STAND', 'START', 'STORY',
    'ALWAYS', 'BEFORE', 'BETTER', 'FRIEND', 'LITTLE', 'PEOPLE', 'SHOULD',
    'AROUND', 'ANOTHER', 'BECAUSE', 'THROUGH', 'WITHOUT',
];

/**
 * Радиообменные фразы — то, что реально звучит в эфире. Здесь намеренно
 * есть и пробелы, и цифры, и позывные: это заметно сложнее ровных слов,
 * поэтому в groups.js за фразы ставка XP выше.
 *
 * Позывные взяты разные и вымышленные по формату — чтобы человек привыкал
 * разбирать незнакомый позывной, а не запоминал один и тот же.
 */
const RADIO_PHRASES = [
    // Вызов и ответ
    'CQ CQ DE R9OGL K',
    'CQ CQ CQ DE W6NYC K',
    'CQ DX DE UA3ABC K',
    'R9OGL DE DL5XYZ K',
    'W1AW DE JA1QRP KN',
    'QRZ DE R9OGL K',
    'DE EA5TT PSE K',
    // Рапорт и обмен
    'UR RST 599 599',
    'RST 579 579 QSB',
    'UR 5NN 5NN BK',
    'TNX FER RPRT 599',
    'QTH IS MOSCOW MOSCOW',
    'QTH BERLIN BERLIN OP HANS',
    'NAME IS ALEX ALEX',
    'OP JOHN JOHN HW CPY',
    'RIG IS FT991 PWR 100W',
    'ANT IS DIPOLE UP 12M',
    'WX HERE SUNNY 25C',
    'WX RAIN ES COLD 5C',
    // Служебное
    'PSE AGN AGN',
    'QRZ QRZ PSE',
    'QSL VIA BURO TNX',
    'QSY 7025 PSE',
    'QRM QRM PSE AGN',
    'QSB QSB UR SIG',
    'QRS PSE QRS',
    'SRI QRM NW QRT',
    'HR CPY OM TNX',
    'FB OM TNX FER QSO',
    'TNX FER QSO 73 SK',
    'GL ES 73 DE R9OGL',
    'BEST 73 ES DX SK',
    '73 ES GB OM SK',
];

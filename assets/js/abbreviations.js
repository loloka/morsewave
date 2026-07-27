/**
 * Радиолюбительские сокращения, служебные коды и Q-коды для тренировки
 * распознавания на слух (страница "Группы" → режим "Сокращения").
 *
 * var (а не const) — намеренно: если файл случайно подключится на странице
 * дважды (например, из-за кэша браузера после обновления), повторное
 * объявление просто перезапишет значение вместо падения с SyntaxError.
 */
var ABBREVIATIONS = [
    { code: 'DE', meaning: t('abbrev.de') },
    { code: 'TNX', meaning: t('abbrev.tnx') },
    { code: 'TKS', meaning: t('abbrev.tks') },
    { code: 'PSE', meaning: t('abbrev.pse') },
    { code: 'GM', meaning: t('abbrev.gm') },
    { code: 'GA', meaning: t('abbrev.ga') },
    { code: 'GE', meaning: t('abbrev.ge') },
    { code: 'GN', meaning: t('abbrev.gn') },
    { code: 'GB', meaning: t('abbrev.gb') },
    { code: '73', meaning: t('abbrev.73') },
    { code: '88', meaning: t('abbrev.88') },
    { code: 'CQ', meaning: t('abbrev.cq') },
    { code: 'K', meaning: t('abbrev.k') },
    { code: 'KN', meaning: t('abbrev.kn') },
    { code: 'R', meaning: t('abbrev.r') },
    { code: 'AS', meaning: t('abbrev.as') },
    { code: 'SK', meaning: t('abbrev.sk') },
    { code: 'CL', meaning: t('abbrev.cl') },
    { code: 'QSL', meaning: t('abbrev.qsl') },
    { code: 'QSO', meaning: t('abbrev.qso') },
    { code: 'QRP', meaning: t('abbrev.qrp') },
    { code: 'QRO', meaning: t('abbrev.qro') },
    { code: 'QRZ?', meaning: t('abbrev.qrz') },
    { code: 'QRS', meaning: t('abbrev.qrs') },
    { code: 'QRQ', meaning: t('abbrev.qrq') },
    { code: 'QRM', meaning: t('abbrev.qrm') },
    { code: 'QRN', meaning: t('abbrev.qrn') },
    { code: 'QTH', meaning: t('abbrev.qth') },
    { code: 'UR', meaning: t('abbrev.ur') },
    { code: 'MY', meaning: t('abbrev.my') },
    { code: 'RIG', meaning: t('abbrev.rig') },
    { code: 'ANT', meaning: t('abbrev.ant') },
    { code: 'RST', meaning: t('abbrev.rst') },
    { code: 'FB', meaning: t('abbrev.fb') },
    { code: 'WX', meaning: t('abbrev.wx') },
];

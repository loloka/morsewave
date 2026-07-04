-- =========================================================
-- MorseWave — схема базы данных
-- Прогресс/XP/ачивки пользователя хранятся в localStorage браузера.
-- MySQL используется для справочных данных (ачивки, позывные)
-- и анонимной общей статистики сообщества.
-- =========================================================

CREATE DATABASE IF NOT EXISTS morse_trainer
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE morse_trainer;

-- ---------------------------------------------------------
-- Справочник достижений. condition_type сверяется на клиенте
-- со статистикой из localStorage (см. assets/js/progress.js)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(50) UNIQUE NOT NULL,
    title           VARCHAR(120) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    icon            VARCHAR(10)  NOT NULL DEFAULT '🏆',
    condition_type  ENUM(
        'letters_learned_count',
        'xp_total',
        'streak_days',
        'koch_level',
        'groups_completed',
        'callsigns_completed',
        'recognized_count',
        'recognize_best_streak',
        'exam_passed_count'
    ) NOT NULL,
    condition_value INT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Банк позывных для тренажёра "Позывные"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS callsigns (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    callsign  VARCHAR(20) NOT NULL,
    country   VARCHAR(60) DEFAULT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Анонимная общая статистика (одна строка-счётчик)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_stats (
    id                    INT PRIMARY KEY,
    total_sessions        BIGINT UNSIGNED NOT NULL DEFAULT 0,
    total_groups          BIGINT UNSIGNED NOT NULL DEFAULT 0,
    total_letters_events  BIGINT UNSIGNED NOT NULL DEFAULT 0,
    total_callsigns       BIGINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO global_stats (id) VALUES (1);

-- ---------------------------------------------------------
-- Сид: достижения
-- ---------------------------------------------------------
INSERT IGNORE INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order) VALUES
('first_signal',  'Первый сигнал',        'Изучите свой первый символ',                    '📡', 'letters_learned_count', 1,  1),
('ten_signals',   'Радист-новичок',       'Изучите 10 символов',                           '📻', 'letters_learned_count', 10, 2),
('full_alphabet', 'Полный алфавит',       'Изучите все буквы и цифры',                     '🎓', 'letters_learned_count', 36, 3),
('xp_100',        'Первая сотня',         'Наберите 100 очков опыта',                      '⭐', 'xp_total', 100, 4),
('xp_1000',       'Опытный связист',      'Наберите 1000 очков опыта',                     '🌟', 'xp_total', 1000, 5),
('xp_5000',       'Мастер эфира',         'Наберите 5000 очков опыта',                     '🏵️', 'xp_total', 5000, 6),
('streak_3',      'Три дня подряд',       'Занимайтесь 3 дня подряд',                      '🔥', 'streak_days', 3, 7),
('streak_7',      'Неделя дисциплины',    'Занимайтесь 7 дней подряд',                     '🔥', 'streak_days', 7, 8),
('streak_30',     'Железная воля',        'Занимайтесь 30 дней подряд',                    '🏆', 'streak_days', 30, 9),
('koch_10',       'Метод Коха: старт',    'Откройте 10 символов в методе Коха',            '🧩', 'koch_level', 10, 10),
('koch_full',     'Мастер Коха',          'Откройте все символы метода Коха',              '👑', 'koch_level', 38, 11),
('groups_50',     'Групповая тренировка', 'Расшифруйте 50 групп символов',                 '🔢', 'groups_completed', 50, 12),
('groups_500',    'Марафонец',            'Расшифруйте 500 групп символов',                '🏃', 'groups_completed', 500, 13),
('callsign_10',   'Охотник за позывными', 'Расшифруйте 10 позывных',                       '📞', 'callsigns_completed', 10, 14),
('callsign_100',  'DX-чемпион',           'Расшифруйте 100 позывных',                      '🌍', 'callsigns_completed', 100, 15),
('recognize_10',  'Приём на слух: старт', 'Правильно опознайте 10 символов на слух',       '👂', 'recognized_count', 10, 16),
('recognize_100', 'Чуткий эфир',          'Правильно опознайте 100 символов на слух',      '🦻', 'recognized_count', 100, 17),
('streak50',      'Начинающий телеграфист', 'Наберите серию из 50 верных подряд в приёме на слух', '📗', 'recognize_best_streak', 50, 18),
('streak500',     'Телеграфист со стажем',  'Наберите серию из 500 верных подряд в приёме на слух', '📘', 'recognize_best_streak', 500, 19),
('exam_category1','Первая категория радиолюбителя', 'Пройдите экзамен (250 знаков) целиком не более чем с 3 ошибочными группами', '🎖️', 'exam_passed_count', 1, 20);

-- ---------------------------------------------------------
-- Сид: примеры позывных (можно и нужно расширять)
-- ---------------------------------------------------------
INSERT IGNORE INTO callsigns (callsign, country) VALUES
('R1ABC','Россия'), ('UA3XYZ','Россия'), ('RA9F','Россия'), ('RZ6D','Россия'), ('RK4W','Россия'),
('R7ABC','Россия'), ('R2XY','Россия'), ('RA1XYZ','Россия'), ('RN6AB','Россия'), ('RU9CD','Россия'),
('RV3EF','Россия'), ('RW4GH','Россия'), ('RX2IJ','Россия'), ('RZ8KL','Россия'), ('RC5MN','Россия'),
('RD7OP','Россия'), ('RO1QR','Россия'), ('UA9XYZ','Россия'), ('UB4ABC','Россия'), ('UI8AB','Россия'),
('W1AW','США'), ('K5ZZ','США'), ('N4XYZ','США'), ('AA7BC','США'),
('G0ABC','Великобритания'), ('M0XYZ','Великобритания'),
('DL1ABC','Германия'), ('DK5XYZ','Германия'), ('DJ9ZB','Германия'),
('JA1ABC','Япония'), ('JH3XYZ','Япония'),
('F5ABC','Франция'), ('F4XYZ','Франция'),
('EA1XYZ','Испания'), ('SP5ABC','Польша'), ('SM0XYZ','Швеция'),
('VE3ABC','Канада'), ('VK2ABC','Австралия'), ('ZL1ABC','Новая Зеландия'),
('HB9ABC','Швейцария'), ('PY2ABC','Бразилия'), ('LU1ABC','Аргентина'),
('OK1ABC','Чехия'), ('OE3XYZ','Австрия'), ('I2ABC','Италия');

-- Для более крупного банка позывных (сотни штук) запусти один раз
-- database/seed_callsigns.php?count=200 в браузере — он сгенерирует
-- реалистичные российские позывные и добавит их без дублей.

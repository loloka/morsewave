-- =========================================================
-- Миграция №2 — если база уже создана из старой schema.sql,
-- выполни этот файл (он ничего не сломает и не задублирует данные).
-- =========================================================

USE morse_trainer;

ALTER TABLE achievements MODIFY condition_type ENUM(
    'letters_learned_count',
    'xp_total',
    'streak_days',
    'koch_level',
    'groups_completed',
    'callsigns_completed',
    'recognized_count'
) NOT NULL;

INSERT IGNORE INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order) VALUES
('recognize_10',  'Приём на слух: старт', 'Правильно опознайте 10 символов на слух',  '👂', 'recognized_count', 10, 16),
('recognize_100', 'Чуткий эфир',          'Правильно опознайте 100 символов на слух', '🦻', 'recognized_count', 100, 17);

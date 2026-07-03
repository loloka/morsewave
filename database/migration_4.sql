-- =========================================================
-- Миграция №4 — ачивки за серию верных ответов в "Приёме на слух"
-- =========================================================

USE morse_trainer;

ALTER TABLE achievements MODIFY condition_type ENUM(
    'letters_learned_count',
    'xp_total',
    'streak_days',
    'koch_level',
    'groups_completed',
    'callsigns_completed',
    'recognized_count',
    'recognize_best_streak'
) NOT NULL;

INSERT IGNORE INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order) VALUES
('streak50',  'Начинающий телеграфист', 'Наберите серию из 50 верных подряд в приёме на слух',  '📗', 'recognize_best_streak', 50, 18),
('streak500', 'Телеграфист со стажем',  'Наберите серию из 500 верных подряд в приёме на слух', '📘', 'recognize_best_streak', 500, 19);

-- =========================================================
-- Миграция №6 — новая ачивка за сдачу экзамена (250 знаков,
-- не более 3 ошибочных групп) + фикс бага с преждевременной
-- выдачей ачивки "groups_50" при остановке экзамена.
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
    'recognize_best_streak',
    'exam_passed_count'
) NOT NULL;

INSERT IGNORE INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order) VALUES
('exam_category1', 'Первая категория радиолюбителя',
 'Пройдите экзамен (250 знаков) целиком не более чем с 3 ошибочными группами',
 '🎖️', 'exam_passed_count', 1, 20);

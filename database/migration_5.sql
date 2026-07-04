-- =========================================================
-- Миграция №5 — фикс: у streak50/streak500 оказалось пустое
-- condition_type (ENUM молча принял '', т.к. ALTER TABLE из
-- migration_4.sql не успел применить новое значение до INSERT).
-- Безопасно выполнять повторно.
-- =========================================================

USE morse_trainer;

-- На всякий случай ещё раз убеждаемся, что ENUM содержит нужное значение
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

-- Чиним конкретные строки, где condition_type оказался пустым
UPDATE achievements
SET condition_type = 'recognize_best_streak'
WHERE code IN ('streak50', 'streak500');

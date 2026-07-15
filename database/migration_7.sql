-- =========================================================
-- Миграция №7 — простые аккаунты + витрина лидеров.
-- Основной прогресс по-прежнему в localStorage браузера; эти таблицы —
-- только публичный "слепок" XP/серии для лидерборда на главной.
-- =========================================================

USE morse_trainer;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(40) NOT NULL,
    email         VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_stats (
    user_id         INT PRIMARY KEY,
    xp              INT UNSIGNED NOT NULL DEFAULT 0,
    streak_count    INT UNSIGNED NOT NULL DEFAULT 0,
    streak_last_date DATE DEFAULT NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

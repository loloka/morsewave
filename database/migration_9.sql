-- =========================================================
-- Миграция №9 — простая защита от подбора пароля: после нескольких
-- неудачных попыток входа аккаунт временно блокируется.
-- =========================================================

USE morse_trainer;
SET NAMES utf8mb4;

ALTER TABLE users
    ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER verification_token,
    ADD COLUMN locked_until DATETIME DEFAULT NULL AFTER failed_login_attempts;

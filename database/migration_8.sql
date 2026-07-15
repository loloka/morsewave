-- =========================================================
-- Миграция №8 — подтверждение e-mail при регистрации.
-- Пока почта не подтверждена, прогресс аккаунта не публикуется
-- в лидерборде (см. api/sync_progress.php) — это не "защита от
-- читерства" (прогресс всё равно настоящий), а просто барьер против
-- моментального создания кучи аккаунтов ради дублей в таблице лидеров.
-- =========================================================

USE morse_trainer;
SET NAMES utf8mb4;

ALTER TABLE users
    ADD COLUMN email_verified_at DATETIME DEFAULT NULL AFTER password_hash,
    ADD COLUMN verification_token VARCHAR(64) DEFAULT NULL AFTER email_verified_at;

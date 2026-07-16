-- Миграция 11: восстановление забытого пароля по e-mail.
-- reset_token — одноразовый токен из письма (по образцу verification_token),
-- reset_token_expires — срок жизни (1 час),
-- last_reset_request_at — троттлинг: не чаще одного письма в 5 минут,
--   чтобы формой нельзя было спамить чужую почту.
ALTER TABLE users
    ADD COLUMN reset_token VARCHAR(64) DEFAULT NULL,
    ADD COLUMN reset_token_expires DATETIME DEFAULT NULL,
    ADD COLUMN last_reset_request_at DATETIME DEFAULT NULL;

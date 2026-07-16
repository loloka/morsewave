-- Миграция 10: полная синхронизация прогресса между устройствами.
-- Весь Progress-объект из localStorage хранится как JSON-блоб — приватное
-- личное хранилище (в отличие от user_stats — публичной витрины лидерборда).
-- Сознательно не раскладываем по колонкам: структура состояния сложная
-- (вложенные объекты/массивы) и продолжит меняться.

CREATE TABLE IF NOT EXISTS user_progress (
    user_id       INT PRIMARY KEY,
    progress_json LONGTEXT NOT NULL,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

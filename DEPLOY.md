# Развёртывание и обслуживание MorseWave

Всё про запуск локально, деплой на боевой сервер, миграции базы и
администрирование — в одном месте. Обзор проекта и возможности — в
[README.md](README.md), обязательные правила для разработки — в
[CLAUDE.md](CLAUDE.md).

---

## Локальный запуск (Docker)

Нужен только [Docker Desktop](https://www.docker.com/products/docker-desktop/) —
никакого Laragon/OpenServer и ручной настройки MySQL.

```bash
git clone <URL_РЕПО> morse-trainer
cd morse-trainer
docker compose up -d --build
```

Готово:

- Сайт — **http://localhost:8080**
- phpMyAdmin — **http://localhost:8081** (сервер `db`, логин `root`, пароль `morsewave_root`)

При первом запуске (на пустой БД) MySQL-контейнер сам накатывает
`database/schema.sql` — полную актуальную схему со всеми сид-данными. Это
происходит **один раз**, на пустом volume; при повторных `docker compose up`
существующие данные не трогаются.

`config/database.php` для Docker создавать не нужно — `docker-compose.yml`
прокидывает креды через переменные окружения (`DB_HOST=db` и т.д.), которые
`config/database.php` подхватывает автоматически (см. `config/database.example.php`).

### Запуск без Docker (любой локальный PHP 8+ / MySQL стенд)

1. Скопируй `config/database.example.php` → `config/database.php` (сам файл в
   `.gitignore` — там могут быть боевые креды). По умолчанию подходит
   `host=localhost`, `user=root`, пустой пароль — поправь под свой стенд.
2. В phpMyAdmin/HeidiSQL выполни `database/schema.sql` — полная схема, одного
   файла достаточно.
3. Document root — корень репозитория (где `index.php`).
4. Позывные: `php database/seed_callsigns.php 200`.

---

## Шпаргалка по Docker-командам

**Запуск / остановка**

```bash
docker compose up -d --build   # собрать и запустить (после изменений в Dockerfile/зависимостях)
docker compose up -d           # запустить без пересборки (обычный случай)
docker compose down            # остановить (данные в volume остаются)
docker compose down -v         # остановить И стереть БД — начать с чистого листа
docker compose restart app     # перезапустить только контейнер сайта (после правки конфигов Apache)
```

**Статус и логи**

```bash
docker compose ps                    # какие контейнеры подняты
docker compose logs -f app           # логи PHP/Apache в реальном времени (Ctrl+C — выйти)
docker compose logs -f db            # логи MySQL
docker compose logs --tail=50 app    # последние 50 строк
```

**Заглянуть внутрь / выполнить команду в контейнере**

```bash
docker compose exec app bash                                       # зайти в контейнер сайта
docker compose exec app php -l learn.php                           # проверить синтаксис PHP-файла
docker compose exec app php database/seed_callsigns.php 200        # сгенерировать позывные
docker compose exec db mysql -uroot -pmorsewave_root morse_trainer # зайти в MySQL консольно
```

**Выполнить SQL на живой базе** (например, `ALTER` из записи CHANGELOG.md при
обновлении — `schema.sql` целиком подхватывается автоматически только на
ПУСТОЙ базе):

```bash
# через phpMyAdmin (проще): http://localhost:8081 → вкладка SQL → вставить команды
# либо через консоль:
docker compose exec -T db mysql -uroot -pmorsewave_root morse_trainer -e "ALTER TABLE ..."
```

**Полный сброс, если что-то сломалось**

```bash
docker compose down -v
docker compose up -d --build
```

(пересоздаст контейнеры и базу с нуля; код из примонтированной папки проекта
никуда не денется, сотрутся только данные MySQL)

---

## Почта (Resend)

Письма подтверждения и восстановления пароля шлются через **Resend API**
(`config/mail.php`, `includes/resend_mailer.php`), не через SMTP хостинга —
на shared-хостинге SMTP ненадёжен (был кейс: у `mail.r9old.ru` не настроен
DKIM, PTR общего IP не указывал на домен, Gmail тихо резал письма).

```bash
cp config/mail.example.php config/mail.php
```

и впиши реальный API-ключ [Resend](https://resend.com/api-keys) (бесплатного
тарифа — сотни писем в месяц — хватает). Без верификации домена письма уходят
с sandbox-адреса `onboarding@resend.dev` — работает сразу, без настройки DNS.
Для `noreply@r9old.ru` нужно верифицировать домен в Resend (Domains → Add
Domain, добавить DNS-записи).

Без этого шага аккаунты по-прежнему создаются, письма просто не отправляются —
ссылка на подтверждение падает в `error_log` (`docker compose logs -f app`),
при локальной разработке можно подтвердить вручную.

---

## Деплой на VPS

Владелец разворачивает на VPS (FastPanel, PHP 8.4) через `git pull`.

```bash
cd /var/www
git clone <URL_РЕПО> morse-trainer
cd morse-trainer
cp config/database.example.php config/database.php   # впиши прод-креды MySQL
cp config/mail.example.php config/mail.php           # впиши API-ключ Resend
mysql -u ПОЛЬЗОВАТЕЛЬ -p БАЗА < database/schema.sql   # первичная заливка схемы
```

Дальше:

1. Виртуальный хост Apache/Nginx на папку проекта (document root — корень
   репозитория, где `index.php`).
2. Убедиться, что установлены `php`, `pdo_mysql`.
3. **Папка сессий должна быть доступна на запись PHP-FPM.** После первого
   деплоя проверь, что `storage/sessions` существует и пишется тем же
   пользователем, под которым крутится PHP-FPM (обычно системный пользователь
   сайта): `chmod 700 storage/sessions`. Если папка не пишется — код не падает,
   а тихо откатывается на системный каталог сессий, и тогда пользователей
   начнёт разлогинивать по общему `gc_maxlifetime` (см. v2.36 в CHANGELOG).
4. **Защита служебных папок.** Каталоги `config/`, `database/`, `includes/`,
   `storage/` закрыты `.htaccess`. На **Apache** нужен `AllowOverride All`
   (или хотя бы `AuthConfig Limit`) для директорий проекта — большинство
   панелей (FastPanel, ISPmanager, cPanel) включают это по умолчанию.
   **Nginx** `.htaccess` не читает — продублируй запрет в конфиге сайта:

   ```nginx
   location ~ ^/(config|database|includes|storage)/ { deny all; return 404; }
   ```

### Обновление боевого сервера

```bash
cd /var/www/morse-trainer
git pull
```

Если обновление меняет схему БД — готовые `ALTER`/`UPDATE`-команды написаны
прямо в записи [CHANGELOG.md](CHANGELOG.md) соответствующей версии. Выполни их
вручную (phpMyAdmin или консоль), потому что автоматический накат `schema.sql`
работает **только на пустой базе**. Делай миграцию **сразу после `git pull`,
до захода на сайт** — иначе код может обратиться к ещё не добавленной колонке.

---

## Администрирование

### Как устроены права админа

Админ определяется флагом `is_admin` в таблице `users` (раньше был жёстко
зашит один e-mail — так нельзя было передать права). Проверка — `is_admin_user()`
в `includes/auth.php`. Админка (`admin.php`) даёт список аккаунтов,
переименование, удаление и выдачу/снятие прав.

### Кто становится админом

- **На свежей установке (пустая база):** первый зарегистрированный аккаунт
  автоматически получает `is_admin = 1` (`api/register.php`). То есть просто
  зарегистрируйся первым — и ты админ, ручная возня в БД не нужна.
- **На уже работавшей базе** (обновление со старой схемы, где админ был по
  e-mail) выполни разово:

  ```sql
  ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_token;
  UPDATE users SET is_admin = 1 WHERE email = 'e-mail-твоего-админ-аккаунта';
  ```

  Первая команда добавляет колонку (на свежих установках она уже в
  `schema.sql`), вторая — назначает админом твой текущий аккаунт.

### Передача и снятие прав

В админке (`admin.php`) у каждого пользователя есть кнопка **«Сделать
админом»** / **«Снять админа»** (`api/admin_set_admin.php`):

- Назначение админом **не снимает** права ни с кого — админов может быть
  несколько одновременно.
- **Нельзя снять последнего админа** (защита от полной потери доступа):
  сначала назначь нового, потом снимай старого.

Типичная передача прав другому аккаунту: под текущим админом → «Сделать
админом» у нового аккаунта → выйти, зайти под новым → «Снять админа» у
старого (можно снять и с самого себя, раз есть второй админ).

<?php
/**
 * Сервис управления донатами, благодарностями и чатом поддержки MorseWave.
 */

function ensure_donation_tables(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;

    // 1. Проверяем поле is_sponsor и sponsor_badge в таблице users
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_sponsor'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN is_sponsor TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin, ADD COLUMN sponsor_at DATETIME NULL AFTER is_sponsor");
        }
    } catch (Throwable $e) {
        // Ошибку логировать или игнорировать при отсутствии прав/таблицы
    }

    try {
        $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'sponsor_badge'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN sponsor_badge VARCHAR(32) NOT NULL DEFAULT 'crown' AFTER sponsor_at");
        } else {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN sponsor_badge VARCHAR(32) NOT NULL DEFAULT 'crown'");
        }
        // Нормализуем существующие значения в ASCII-слаги, исключая сбои кодировок
        $pdo->exec("UPDATE users SET sponsor_badge = 'crown' WHERE sponsor_badge = '👑' OR sponsor_badge IS NULL OR sponsor_badge = '' OR sponsor_badge = '?'");
        $pdo->exec("UPDATE users SET sponsor_badge = 'heart' WHERE sponsor_badge = '💖'");
        $pdo->exec("UPDATE users SET sponsor_badge = 'lightning' WHERE sponsor_badge = '⚡'");
        $pdo->exec("UPDATE users SET sponsor_badge = 'radio' WHERE sponsor_badge = '📻'");
        $pdo->exec("UPDATE users SET sponsor_badge = 'star' WHERE sponsor_badge = '⭐'");
        $pdo->exec("UPDATE users SET sponsor_badge = 'sparkles' WHERE sponsor_badge = '✨'");
    } catch (Throwable $e) {}

    // 2. Создаём таблицу пожертвований и тёплых слов (donations)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS donations (
                id             INT PRIMARY KEY AUTO_INCREMENT,
                user_id        INT DEFAULT NULL,
                callsign       VARCHAR(64) NOT NULL,
                amount         INT NOT NULL DEFAULT 0,
                tier_title     VARCHAR(128) DEFAULT NULL,
                message        TEXT DEFAULT NULL,
                is_anonymous   TINYINT(1) NOT NULL DEFAULT 0,
                status         ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Throwable $e) {}

    // 3. Создаём таблицу сообщений чата поддержки (support_messages)
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS support_messages (
                id           INT PRIMARY KEY AUTO_INCREMENT,
                user_id      INT NOT NULL,
                sender_type  ENUM('user', 'admin') NOT NULL,
                message      TEXT NOT NULL,
                is_read      TINYINT(1) NOT NULL DEFAULT 0,
                created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_is_read (is_read),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Throwable $e) {}

    // 4. Добавляем ачивку project_supporter в справочник
    try {
        $pdo->exec("
            ALTER TABLE achievements MODIFY COLUMN condition_type ENUM(
                'letters_learned_count',
                'letters_learned_count_any',
                'xp_total',
                'streak_days',
                'koch_level',
                'groups_completed',
                'callsigns_completed',
                'recognized_count',
                'recognize_best_streak',
                'exam_passed_count',
                'cyrillic_learned_count',
                'cyrillic_recognized_count',
                'invasion_waves_count',
                'rhythm_mastered_count',
                'rhythm_mastered_count_any',
                'project_supporter'
            ) NOT NULL
        ");
    } catch (Throwable $e) {}

    try {
        $stmt = $pdo->prepare("SELECT id FROM achievements WHERE code = 'project_supporter'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            $ins = $pdo->prepare("
                INSERT INTO achievements (code, title, description, icon, condition_type, condition_value, sort_order)
                VALUES ('project_supporter', 'Друг MorseWave', 'Поддержал развитие проекта словом или делом! 73!', '💖', 'project_supporter', 1, 27)
            ");
            $ins->execute();
        }
    } catch (Throwable $e) {}

    $checked = true;
}

function get_approved_donations(PDO $pdo, int $limit = 50): array {
    ensure_donation_tables($pdo);
    $stmt = $pdo->prepare("
        SELECT d.id, d.callsign, d.amount, d.tier_title, d.message, d.is_anonymous, d.created_at,
               u.is_sponsor, u.sponsor_badge, u.name AS user_name
        FROM donations d
        LEFT JOIN users u ON u.id = d.user_id
        WHERE d.status = 'approved'
        ORDER BY d.id DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function get_admin_donations(PDO $pdo): array {
    ensure_donation_tables($pdo);
    $stmt = $pdo->query("
        SELECT d.*, u.name AS user_name, u.email AS user_email, u.is_sponsor, u.sponsor_badge, u.is_admin
        FROM donations d
        LEFT JOIN users u ON u.id = d.user_id
        ORDER BY d.id DESC
    ");
    return $stmt->fetchAll();
}

function create_donation(PDO $pdo, ?int $userId, string $callsign, int $amount, ?string $tierTitle, ?string $message, bool $isAnonymous): int {
    ensure_donation_tables($pdo);
    $stmt = $pdo->prepare("
        INSERT INTO donations (user_id, callsign, amount, tier_title, message, is_anonymous, status, created_at)
        VALUES (:user_id, :callsign, :amount, :tier_title, :message, :is_anonymous, 'pending', NOW())
    ");
    $stmt->execute([
        'user_id'      => $userId,
        'callsign'     => mb_substr(trim($callsign), 0, 64),
        'amount'       => max(0, $amount),
        'tier_title'   => $tierTitle ? mb_substr(trim($tierTitle), 0, 128) : null,
        'message'      => $message ? mb_substr(trim($message), 0, 1000) : null,
        'is_anonymous' => $isAnonymous ? 1 : 0,
    ]);
    return (int) $pdo->lastInsertId();
}

function update_donation_status(PDO $pdo, int $id, string $status): bool {
    ensure_donation_tables($pdo);
    if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
        return false;
    }
    $stmt = $pdo->prepare("UPDATE donations SET status = :status WHERE id = :id");
    return $stmt->execute(['status' => $status, 'id' => $id]);
}

function sponsor_badge_slug(?string $badge): string {
    $map = [
        'crown'     => 'crown',
        '👑'        => 'crown',
        'heart'     => 'heart',
        '💖'        => 'heart',
        'lightning' => 'lightning',
        '⚡'        => 'lightning',
        'radio'     => 'radio',
        '📻'        => 'radio',
        'star'      => 'star',
        '⭐'        => 'star',
        'sparkles'  => 'sparkles',
        '✨'        => 'sparkles',
        'none'      => 'none',
        ''          => 'none',
    ];
    return $map[$badge] ?? 'crown';
}

function sponsor_badge_icon(?string $badge): string {
    $slug = sponsor_badge_slug($badge);
    $map = [
        'crown'     => '👑',
        'heart'     => '💖',
        'lightning' => '⚡',
        'radio'     => '📻',
        'star'      => '⭐',
        'sparkles'  => '✨',
        'none'      => '',
    ];
    return $map[$slug] ?? '👑';
}

function set_user_sponsor(PDO $pdo, int $userId, bool $isSponsor): bool {
    ensure_donation_tables($pdo);
    $stmt = $pdo->prepare("
        UPDATE users
        SET is_sponsor = :is_sponsor,
            sponsor_at = CASE WHEN :is_sponsor = 1 THEN NOW() ELSE NULL END,
            sponsor_badge = CASE 
                WHEN :is_sponsor = 1 AND (sponsor_badge IS NULL OR sponsor_badge = '' OR sponsor_badge = 'none' OR sponsor_badge = '?') THEN 'crown'
                ELSE sponsor_badge 
            END
        WHERE id = :id
    ");
    return $stmt->execute([
        'is_sponsor' => $isSponsor ? 1 : 0,
        'id'         => $userId,
    ]);
}

function get_user_support_messages(PDO $pdo, int $userId): array {
    ensure_donation_tables($pdo);
    $stmt = $pdo->prepare("
        SELECT id, sender_type, message, is_read, created_at
        FROM support_messages
        WHERE user_id = :user_id
        ORDER BY id ASC
    ");
    $stmt->execute(['user_id' => $userId]);
    return $stmt->fetchAll();
}

function send_support_message(PDO $pdo, int $userId, string $senderType, string $message): int {
    ensure_donation_tables($pdo);
    if (!in_array($senderType, ['user', 'admin'], true)) {
        throw new InvalidArgumentException('Invalid sender type');
    }
    $cleanMessage = trim($message);
    if ($cleanMessage === '') {
        throw new InvalidArgumentException('Message cannot be empty');
    }
    $stmt = $pdo->prepare("
        INSERT INTO support_messages (user_id, sender_type, message, is_read, created_at)
        VALUES (:user_id, :sender_type, :message, 0, NOW())
    ");
    $stmt->execute([
        'user_id'     => $userId,
        'sender_type' => $senderType,
        'message'     => mb_substr($cleanMessage, 0, 3000),
    ]);
    return (int) $pdo->lastInsertId();
}

function mark_messages_read(PDO $pdo, int $userId, string $readerType): void {
    ensure_donation_tables($pdo);
    // Если читает админ — помечаем прочитанными сообщения от пользователя
    // Если читает юзер — помечаем прочитанными сообщения от админа
    $senderToMark = ($readerType === 'admin') ? 'user' : 'admin';
    $stmt = $pdo->prepare("
        UPDATE support_messages
        SET is_read = 1
        WHERE user_id = :user_id AND sender_type = :sender_type AND is_read = 0
    ");
    $stmt->execute([
        'user_id'     => $userId,
        'sender_type' => $senderToMark,
    ]);
}

function update_user_sponsor_badge(PDO $pdo, int $userId, string $badge): bool {
    ensure_donation_tables($pdo);
    $slug = sponsor_badge_slug($badge);
    $stmt = $pdo->prepare("UPDATE users SET sponsor_badge = :badge WHERE id = :id AND is_sponsor = 1");
    return $stmt->execute(['badge' => $slug, 'id' => $userId]);
}

function get_admin_support_threads(PDO $pdo): array {
    ensure_donation_tables($pdo);
    $stmt = $pdo->query("
        SELECT u.id AS user_id, u.name, u.email, u.is_sponsor, u.sponsor_badge,
               COUNT(CASE WHEN sm.is_read = 0 AND sm.sender_type = 'user' THEN 1 END) AS unread_count,
               MAX(sm.created_at) AS last_message_at,
               (
                   SELECT sm2.message
                   FROM support_messages sm2
                   WHERE sm2.user_id = u.id
                   ORDER BY sm2.id DESC
                   LIMIT 1
               ) AS last_message_text,
               (
                   SELECT sm3.sender_type
                   FROM support_messages sm3
                   WHERE sm3.user_id = u.id
                   ORDER BY sm3.id DESC
                   LIMIT 1
               ) AS last_sender_type
        FROM users u
        INNER JOIN support_messages sm ON sm.user_id = u.id
        GROUP BY u.id, u.name, u.email, u.is_sponsor, u.sponsor_badge
        ORDER BY last_message_at DESC
    ");
    return $stmt->fetchAll();
}

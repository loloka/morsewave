<?php
/**
 * Интернационализация (см. CLAUDE.md, задача #6 бэклога).
 *
 * Выбор языка: ?lang=ru|en (сохраняется в cookie mw_lang на 1 год) →
 * cookie mw_lang → Accept-Language браузера → по умолчанию ru.
 * Языковые словари лежат в lang/ru.php и lang/en.php (PHP-массивы
 * key => строка). t('key') отдаёт строку текущего языка с фолбэком на
 * русский и на сам ключ, если перевода нет вовсе.
 */

function mw_current_lang() {
    static $lang = null;
    if ($lang !== null) {
        return $lang;
    }

    $supported = ['ru', 'en'];

    if (isset($_GET['lang']) && in_array($_GET['lang'], $supported, true)) {
        $lang = $_GET['lang'];
        if (!headers_sent()) {
            setcookie('mw_lang', $lang, time() + 60 * 60 * 24 * 365, '/');
        }
        return $lang;
    }

    if (isset($_COOKIE['mw_lang']) && in_array($_COOKIE['mw_lang'], $supported, true)) {
        $lang = $_COOKIE['mw_lang'];
        return $lang;
    }

    // Автоопределение по Accept-Language только для новых посетителей
    // (нет cookie вообще) — дальше пользователь управляет языком сам.
    // Поддерживаются только ru и en, поэтому логика простая: браузер прямо
    // просит русский (ru есть в списке, включая ru-RU и т.п.) — остаёмся на
    // ru; любой другой язык системы/браузера (en, de, fr, что угодно ещё) —
    // считаем, что человек не обязательно понимает русский, и включаем en.
    // Раньше тут стояло более узкое условие (только явный "en" без "ru"),
    // и, например, чисто немецкий Accept-Language молча оставался на ru —
    // не то, что ожидалось от автоопределения.
    $accept = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    if ($accept && stripos($accept, 'ru') === false) {
        $lang = 'en';
        return $lang;
    }

    $lang = 'ru';
    return $lang;
}

function mw_load_dict($lang) {
    static $cache = [];
    if (isset($cache[$lang])) {
        return $cache[$lang];
    }
    $file = __DIR__ . '/../lang/' . $lang . '.php';
    $cache[$lang] = is_file($file) ? require $file : [];
    return $cache[$lang];
}

/**
 * t('some.key') — строка на текущем языке.
 * Фолбэк: текущий язык → ru → сам ключ (чтобы забытый перевод было видно
 * в интерфейсе, а не выбрасывал ошибку).
 */
function t($key, $vars = []) {
    $lang = mw_current_lang();
    $dict = mw_load_dict($lang);
    $value = $dict[$key] ?? mw_load_dict('ru')[$key] ?? $key;
    if ($vars) {
        $value = strtr($value, $vars);
    }
    return $value;
}

/**
 * Словарь текущего языка целиком — для передачи в JS (window.MW_I18N).
 * Отдаём только ru+en merge с приоритетом текущего языка, чтобы в JS
 * тоже был фолбэк на ru при отсутствующем ключе.
 */
/**
 * Ссылка «переключить язык» на текущую страницу: меняет/добавляет ?lang=
 * и сохраняет остальные параметры запроса.
 */
function mw_lang_switch_url() {
    $target = mw_current_lang() === 'ru' ? 'en' : 'ru';
    $query = $_GET;
    $query['lang'] = $target;
    $path = strtok($_SERVER['REQUEST_URI'] ?? '', '?');
    return $path . '?' . http_build_query($query);
}

function mw_i18n_json_for_js() {
    $lang = mw_current_lang();
    $merged = array_merge(mw_load_dict('ru'), mw_load_dict($lang));
    return json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

<?php
/**
 * Легковесный и безопасный парсер Markdown для документации MorseWave.
 * Поддерживает: заголовки, таблицы, блоки кода (```), цитаты, списки,
 * инлайн-форматирование и автоматическую подмену локальных ссылок (.md, .ino).
 */

function mw_render_markdown(string $md): string {
    // 1. Нормализация переводов строк
    $text = str_replace(["\r\n", "\r"], "\n", $md);

    // 2. Извлечение блоков кода с сохранением плейсхолдеров
    $codeBlocks = [];
    $text = preg_replace_callback('/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)\n```/', function ($m) use (&$codeBlocks) {
        $idx = count($codeBlocks);
        $lang = htmlspecialchars(trim($m[1]) ?: 'text');
        $code = htmlspecialchars($m[2]);
        $copyTitle = 'Скопировать блок';
        $placeholder = "%%CODE_BLOCK_{$idx}%%";
        $codeBlocks[$placeholder] = "<div class=\"doc-code-card\"><div class=\"doc-code-header\"><span class=\"doc-code-lang\">{$lang}</span><button type=\"button\" class=\"btn-copy-code\" onclick=\"mwCopySnippet(this)\" data-code=\"" . htmlspecialchars($m[2], ENT_QUOTES) . "\"><span>📋</span> Копировать</button></div><pre><code class=\"language-{$lang}\">{$code}</code></pre></div>";
        return "\n\n" . $placeholder . "\n\n";
    }, $text);

    // 3. Обработка таблиц
    $lines = explode("\n", $text);
    $output = [];
    $inTable = false;
    $tableRows = [];

    $flushTable = function () use (&$output, &$inTable, &$tableRows) {
        if (!$inTable || empty($tableRows)) {
            $inTable = false;
            $tableRows = [];
            return;
        }
        $html = "<div class=\"doc-table-wrap\"><table class=\"doc-table\">";
        $headerDone = false;
        foreach ($tableRows as $i => $row) {
            // Пропуск разделителя |---|---|
            if (preg_match('/^\|?\s*[-:]+[-| :]*$/', $row)) {
                $headerDone = true;
                continue;
            }
            $cells = array_map('trim', explode('|', trim($row, "|\n\r")));
            if (!$headerDone && $i === 0) {
                $html .= "<thead><tr>";
                foreach ($cells as $c) {
                    $html .= "<th>" . mw_render_inline_md($c) . "</th>";
                }
                $html .= "</tr></thead><tbody>";
            } else {
                if (!$headerDone) {
                    $html .= "<tbody>";
                    $headerDone = true;
                }
                $html .= "<tr>";
                foreach ($cells as $c) {
                    $html .= "<td>" . mw_render_inline_md($c) . "</td>";
                }
                $html .= "</tr>";
            }
        }
        if (!$headerDone) $html .= "<tbody>";
        $html .= "</tbody></table></div>";
        $output[] = $html;
        $inTable = false;
        $tableRows = [];
    };

    $inList = false;
    $listType = null; // 'ul' or 'ol'
    $flushList = function () use (&$output, &$inList, &$listType) {
        if ($inList) {
            $output[] = "</{$listType}>";
            $inList = false;
            $listType = null;
        }
    };

    foreach ($lines as $line) {
        $trimmed = trim($line);

        // Проверка на строку таблицы
        if (preg_match('/^\|.+/i', $trimmed)) {
            $flushList();
            $inTable = true;
            $tableRows[] = $trimmed;
            continue;
        } elseif ($inTable) {
            $flushTable();
        }

        // Проверка на блок плейсхолдера кода
        if (preg_match('/^%%CODE_BLOCK_\d+%%$/', $trimmed)) {
            $flushList();
            $output[] = $trimmed;
            continue;
        }

        // Разделитель --- или ***
        if (preg_match('/^(\-{3,}|\*{3,})$/', $trimmed)) {
            $flushList();
            $output[] = '<hr class="doc-divider">';
            continue;
        }

        // Заголовки #..####
        if (preg_match('/^(#{1,4})\s+(.+)$/', $trimmed, $m)) {
            $flushList();
            $lvl = strlen($m[1]);
            $title = mw_render_inline_md($m[2]);
            $output[] = "<h{$lvl} class=\"doc-h{$lvl}\">{$title}</h{$lvl}>";
            continue;
        }

        // Цитаты > ...
        if (preg_match('/^>\s*(.*)$/', $trimmed, $m)) {
            $flushList();
            $quote = mw_render_inline_md($m[1]);
            $output[] = "<blockquote class=\"doc-quote\"><p>{$quote}</p></blockquote>";
            continue;
        }

        // Ненумерованные списки (* или -)
        if (preg_match('/^[\*\-]\s+(.+)$/', $trimmed, $m)) {
            if (!$inList || $listType !== 'ul') {
                $flushList();
                $output[] = '<ul class="doc-list">';
                $inList = true;
                $listType = 'ul';
            }
            $output[] = '<li>' . mw_render_inline_md($m[1]) . '</li>';
            continue;
        }

        // Нумерованные списки (1. 2.)
        if (preg_match('/^\d+\.\s+(.+)$/', $trimmed, $m)) {
            if (!$inList || $listType !== 'ol') {
                $flushList();
                $output[] = '<ol class="doc-list-ol">';
                $inList = true;
                $listType = 'ol';
            }
            $output[] = '<li>' . mw_render_inline_md($m[1]) . '</li>';
            continue;
        }

        // Если не список, закрываем открытый список
        if ($trimmed === '') {
            $flushList();
            continue;
        }

        $flushList();
        // Обычный параграф текста
        $output[] = '<p class="doc-p">' . mw_render_inline_md($trimmed) . '</p>';
    }

    $flushTable();
    $flushList();

    $html = implode("\n", $output);

    // 4. Восстановление блоков кода
    foreach ($codeBlocks as $placeholder => $codeHtml) {
        $html = str_replace($placeholder, $codeHtml, $html);
    }

    return $html;
}

/**
 * Инлайн-форматирование Markdown (жирный, курсив, инлайн-код, ссылки)
 */
function mw_render_inline_md(string $text): string {
    // Инлайн-код `code`
    $text = preg_replace_callback('/`([^`]+)`/', function ($m) {
        return '<code class="doc-inline-code">' . htmlspecialchars($m[1]) . '</code>';
    }, $text);

    // Жирный текст **text** или __text__
    $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text);
    $text = preg_replace('/__(.+?)__/s', '<strong>$1</strong>', $text);

    // Курсив *text* или _text_
    $text = preg_replace('/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $text);

    // Ссылки [text](url) с подменой относительных файлов на внутренний вьюер
    $text = preg_replace_callback('/\[([^\]]+)\]\(([^)]+)\)/', function ($m) {
        $title = $m[1];
        $url = $m[2];

        // Маппинг локальных файлов аппаратного ключа на просмотрщик keydocs.php
        if (str_contains($url, 'cw-keyer-guide-full.md')) {
            $url = 'keydocs.php?doc=guide';
        } elseif (str_contains($url, 'breadboard-wiring.md')) {
            $url = 'keydocs.php?doc=wiring';
        } elseif (str_contains($url, 'cw-keyer-schematic.md')) {
            $url = 'keydocs.php?doc=schematic';
        } elseif (str_contains($url, 'keyer_breadboard.ino')) {
            $url = 'keydocs.php?doc=sketch';
        }

        $isExternal = preg_match('#^https?://#i', $url);
        $target = $isExternal ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' . htmlspecialchars($url) . '" class="doc-link"' . $target . '>' . $title . '</a>';
    }, $text);

    return $text;
}

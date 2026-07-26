<?php
/**
 * Единый набор line-иконок взамен эмодзи (аудит дизайна, см. CHANGELOG).
 * Тонкий обводной стиль (stroke-width 1.7, currentColor) — тот же язык,
 * что и в assets/js/icons.js (там дублируется для клиентского рендера
 * ачивок, т.к. проект без сборки и общих ES-модулей между PHP и JS нет).
 * Если добавляешь иконку — добавь её в оба места.
 */

function mw_icon(string $name, int $size = 18): string
{
    $paths = [
        'home'       => '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h5v-5h2v5h5v-9"/>',
        'book'       => '<path d="M12 6v15"/><path d="M4 6.5c2.2-1.3 5.3-1.3 8 .5 2.7-1.8 5.8-1.8 8-.5v13c-2.2-1.3-5.3-1.3-8 .5-2.7-1.8-5.8-1.8-8-.5v-13z"/>',
        'target'     => '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/>',
        'grid'       => '<path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
        'antenna'    => '<path d="M12 3v9"/><path d="M7.5 8a7 7 0 019 0"/><path d="M4.2 12a11 11 0 0115.6 0"/><path d="M9 22h6"/><path d="M12 12v10"/>',
        'trophy'     => '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 5H4a1 1 0 00-1 1 5 5 0 004 5"/><path d="M17 5h3a1 1 0 011 1 5 5 0 01-4 5"/>',
        'user'       => '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.2 3.6-6 8-6s8 1.8 8 6"/>',
        'flame'      => '<path d="M12 3c1 3-2 4-2 7a3 3 0 006 0c0-1-1-2-1-2 2 1 3 3 3 5a6 6 0 01-12 0c0-4.2 3-5.4 6-10z"/>',
        'star'       => '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3z"/>',
        'crown'      => '<path d="M4 17h16l1-9-5 3-4-6-4 6-5-3 1 9z"/><path d="M4 20h16"/>',
        'flag'       => '<path d="M5 3v18"/><path d="M5 4h13l-3 4 3 4H5"/>',
        'globe'      => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18"/><path d="M12 3a14 14 0 000 18"/>',
        'headphones' => '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="2.3" y="14" width="4" height="6" rx="1.2"/><rect x="17.7" y="14" width="4" height="6" rx="1.2"/>',
        'notebook'   => '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18"/><path d="M12.5 8h4"/><path d="M12.5 12h4"/><path d="M12.5 16h4"/>',
        'medal'      => '<path d="M9 3l3 7 3-7"/><circle cx="12" cy="15" r="5"/><path d="M12 12.5v5"/>',
        'graduate'   => '<path d="M12 4L2 9l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
        'check'      => '<path d="M4 12.5l5 5L20 6"/>',
        'lock'       => '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    ];

    $inner = $paths[$name] ?? $paths['star'];

    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" '
        . 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
        . 'aria-hidden="true" focusable="false">' . $inner . '</svg>';
}

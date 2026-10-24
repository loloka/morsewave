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
        'info'       => '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8.01"/><line x1="12" y1="11" x2="12" y2="16"/>',
        'radio'      => '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 18h.01M10 18h.01"/><circle cx="14" cy="12" r="3"/><line x1="19" y1="3" x2="6" y2="7"/>',
        'zap'        => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        'heart'      => '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
        'levels'     => '<rect x="4" y="14" width="4" height="6" rx="1"/><rect x="10" y="9" width="4" height="11" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
        'tower'      => '<path d="M12 2v5"/><circle cx="12" cy="7" r="1.5"/><path d="M7 21l3.5-11.5M17 21l-3.5-11.5"/><path d="M8.5 16h7M10 12h4"/><path d="M7.5 4a5 5 0 0 0 0 4M16.5 4a5 5 0 0 1 0 4"/>',
        'sparkles'   => '<path d="M12 3l1.9 4.8 4.8 1.9-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3z"/><path d="M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
        'sliders'    => '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
        'award'      => '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
        'book-open'  => '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        'check-circle' => '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        'copy'       => '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        'layers'     => '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        'music'      => '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        'play'       => '<polygon points="5 3 19 12 5 21 5 3"/>',
        'skip-forward' => '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
        'square'     => '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>',
        'volume-2'   => '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    ];

    $inner = $paths[$name] ?? $paths['star'];

    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" '
        . 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
        . 'aria-hidden="true" focusable="false">' . $inner . '</svg>';
}

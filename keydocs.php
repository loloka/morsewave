<?php
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/markdown.php';

// Конфигурация доступных файлов для скачивания (без доступа к произвольным файлам)
$hardwareDir = __DIR__ . '/hardware';
$downloads = [
    'sketch' => [
        'path' => $hardwareDir . '/cw-keyer/keyer_breadboard.ino',
        'filename' => 'keyer_breadboard.ino',
        'mime' => 'text/plain; charset=utf-8',
    ],
    'guide' => [
        'path' => $hardwareDir . '/cw-keyer/cw-keyer-guide-full.md',
        'filename' => 'cw-keyer-guide-full.md',
        'mime' => 'text/markdown; charset=utf-8',
    ],
    'wiring' => [
        'path' => $hardwareDir . '/cw-keyer/breadboard-wiring.md',
        'filename' => 'breadboard-wiring.md',
        'mime' => 'text/markdown; charset=utf-8',
    ],
    'schematic' => [
        'path' => $hardwareDir . '/cw-keyer/cw-keyer-schematic.md',
        'filename' => 'cw-keyer-schematic.md',
        'mime' => 'text/markdown; charset=utf-8',
    ],
    'schematic_pdf' => [
        'path' => $hardwareDir . '/MorseWave_Pro/MorseWave_Pro_Schematic.pdf',
        'filename' => 'MorseWave_Pro_Schematic.pdf',
        'mime' => 'application/pdf',
    ],
];

// Отдача файлов на скачивание
if (isset($_GET['download'])) {
    $dlKey = (string)$_GET['download'];
    if (isset($downloads[$dlKey]) && file_exists($downloads[$dlKey]['path'])) {
        $item = $downloads[$dlKey];
        header('Content-Type: ' . $item['mime']);
        header('Content-Disposition: attachment; filename="' . $item['filename'] . '"');
        header('Content-Length: ' . filesize($item['path']));
        header('Cache-Control: public, max-age=3600');
        readfile($item['path']);
        exit;
    }
    http_response_code(404);
    echo "Файл не найден";
    exit;
}

// Отдача графических ассетов (3D рендеры платы)
$images = [
    'isometric' => $hardwareDir . '/MorseWave_Pro/MorseWave_Pro_3D_Isometric.png',
    'top' => $hardwareDir . '/MorseWave_Pro/MorseWave_Pro_3D.png',
    'rear' => $hardwareDir . '/MorseWave_Pro/MorseWave_Pro_3D_Rear.png',
];

if (isset($_GET['img'])) {
    $imgKey = (string)$_GET['img'];
    if (isset($images[$imgKey]) && file_exists($images[$imgKey])) {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=86400');
        readfile($images[$imgKey]);
        exit;
    }
    http_response_code(404);
    exit;
}

// Определение активной вкладки
$docKey = $_GET['doc'] ?? 'guide';
$validDocs = ['guide', 'wiring', 'schematic', 'sketch', 'pcb'];
if (!in_array($docKey, $validDocs, true)) {
    $docKey = 'guide';
}

$pageTitles = [
    'guide' => 'Руководство по сборке ключа · MorseWave Pro',
    'wiring' => 'Карта соединений на макетке (Breadboard) · MorseWave Pro',
    'schematic' => 'Принципиальная схема ключа · MorseWave Pro',
    'sketch' => 'Прошивка скетча keyer_breadboard.ino · MorseWave Pro',
    'pcb' => 'Заводская плата MorseWave Pro v2.0 (KiCad) · MorseWave Pro',
];

$pageTitle = $pageTitles[$docKey] ?? 'Документация боевого ключа';
$activePage = 'keyer';

include __DIR__ . '/includes/header.php';
?>

<link rel="stylesheet" href="<?= asset_v('assets/css/keyhardware.css') ?>">

<style>
/* Стили центра документации и просмотрщика схем */
.doc-hub-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
}
.doc-hub-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
}
.doc-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s ease;
}
.doc-tab-btn:hover {
    color: var(--text);
    border-color: rgba(255, 255, 255, 0.2);
    background: var(--surface);
}
.doc-tab-btn.active {
    background: rgba(79, 216, 196, 0.12);
    border-color: #4fd8c4;
    color: #4fd8c4;
}

.doc-article-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px 32px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
@media (max-width: 640px) {
    .doc-article-card {
        padding: 18px 16px;
    }
}

.doc-top-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 1px dashed var(--border);
}

/* Элементы форматирования документа */
.doc-h1 { font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 14px; color: var(--text); }
.doc-h2 { font-size: 20px; font-weight: 700; margin-top: 28px; margin-bottom: 12px; color: #4fd8c4; border-bottom: 1px solid rgba(79, 216, 196, 0.2); padding-bottom: 6px; }
.doc-h3 { font-size: 16px; font-weight: 700; margin-top: 22px; margin-bottom: 10px; color: var(--text); }
.doc-p { font-size: 15px; line-height: 1.65; color: var(--text); margin-bottom: 14px; }
.doc-quote {
    background: rgba(79, 216, 196, 0.05);
    border-left: 4px solid #4fd8c4;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
    color: var(--text-muted);
    font-size: 14px;
}
.doc-quote p { margin: 0; }
.doc-divider { border: 0; border-top: 1px solid var(--border); margin: 28px 0; }

.doc-list, .doc-list-ol {
    margin: 12px 0 16px 20px;
    padding-left: 10px;
    font-size: 15px;
    line-height: 1.65;
    color: var(--text);
}
.doc-list li, .doc-list-ol li { margin-bottom: 6px; }

.doc-inline-code {
    font-family: var(--font-mono);
    font-size: 13px;
    background: rgba(255, 255, 255, 0.08);
    color: #ffd166;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.doc-link {
    color: #4fd8c4;
    text-decoration: underline;
    font-weight: 600;
}
.doc-link:hover {
    color: #7ef5e3;
}

/* Блоки кода и псевдографические схемы */
.doc-code-card {
    background: #06090c;
    border: 1px solid #1c2633;
    border-radius: 10px;
    margin: 18px 0;
    overflow: hidden;
}
.doc-code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0c1218;
    border-bottom: 1px solid #1c2633;
    padding: 8px 14px;
}
.doc-code-lang {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
}
.btn-copy-code {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--text);
    padding: 4px 10px;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: background 0.15s ease;
}
.btn-copy-code:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
}
.doc-code-card pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.5;
    color: #c9d1d9;
    tab-size: 4;
}

/* Таблицы Markdown */
.doc-table-wrap {
    overflow-x: auto;
    margin: 20px 0;
    border: 1px solid var(--border);
    border-radius: 10px;
}
.doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    line-height: 1.5;
}
.doc-table th {
    background: var(--surface-2);
    padding: 10px 14px;
    font-weight: 700;
    color: #4fd8c4;
    text-align: left;
    border-bottom: 2px solid var(--border);
    white-space: nowrap;
}
.doc-table td {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text);
}
.doc-table tr:last-child td {
    border-bottom: none;
}
.doc-table tr:hover td {
    background: rgba(255, 255, 255, 0.02);
}

/* Стили вкладки скетча */
.sketch-meta-box {
    background: rgba(79, 216, 196, 0.06);
    border: 1px solid rgba(79, 216, 196, 0.25);
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
}
.sketch-line-counter {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
}

/* Стили вкладки KiCad PCB */
.pcb-gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin: 20px 0;
}
.pcb-gallery-card {
    background: #090d12;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.pcb-gallery-card img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    background: #040608;
    cursor: zoom-in;
    transition: transform 0.2s ease;
}
.pcb-gallery-card img:hover {
    transform: scale(1.02);
}
.pcb-gallery-info {
    padding: 12px 14px;
    border-top: 1px solid var(--border);
}
.pcb-gallery-title {
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
    margin-bottom: 2px;
}
.pcb-gallery-desc {
    font-size: 12px;
    color: var(--text-muted);
}
</style>

<div class="container mt-3 mb-5">
    
    <!-- Шапка хаба документации -->
    <div class="doc-hub-header">
        <div>
            <div class="hardware-callsign-badge" style="margin-bottom: 6px;">
                <span>⚡</span> R9OGL HARDWARE DOCS · v1.7.1
            </div>
            <h1 style="margin: 0 0 6px; font-size: 26px;">Центр документации и схемотехники</h1>
            <p class="muted mt-0 mb-0" style="font-size: 15px;">
                Инструкции по сборке, монтажные карты, принципиальные схемы и исходный код прошивки для телеграфного ключа MorseWave Pro.
            </p>
        </div>
        <a href="keyer.php" class="btn btn-secondary" style="white-space: nowrap; font-size: 13px; padding: 8px 16px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
            <span>←</span> Вернуться к хабу ключа
        </a>
    </div>

    <!-- Навигационные вкладки документов -->
    <div class="doc-hub-tabs">
        <a href="keydocs.php?doc=guide" class="doc-tab-btn <?= $docKey === 'guide' ? 'active' : '' ?>">
            <span>📘</span> Пошаговый гайд (BOM)
        </a>
        <a href="keydocs.php?doc=wiring" class="doc-tab-btn <?= $docKey === 'wiring' ? 'active' : '' ?>">
            <span>🔌</span> Карта макетки (Wiring)
        </a>
        <a href="keydocs.php?doc=schematic" class="doc-tab-btn <?= $docKey === 'schematic' ? 'active' : '' ?>">
            <span>📐</span> Принципиальная схема
        </a>
        <a href="keydocs.php?doc=sketch" class="doc-tab-btn <?= $docKey === 'sketch' ? 'active' : '' ?>">
            <span>💻</span> Прошивка (.ino)
        </a>
        <a href="keydocs.php?doc=pcb" class="doc-tab-btn <?= $docKey === 'pcb' ? 'active' : '' ?>">
            <span>🏭</span> Заводская плата v2.0 (KiCad)
        </a>
    </div>

    <!-- Основная карточка просмотра документа -->
    <div class="doc-article-card">
        
        <?php if ($docKey === 'sketch'): ?>
            <!-- ================= ВКЛАДКА ПРОШИВКИ СКЕТЧА ================= -->
            <?php
            $sketchFile = $hardwareDir . '/cw-keyer/keyer_breadboard.ino';
            $sketchCode = file_exists($sketchFile) ? file_get_contents($sketchFile) : '// Файл скетча не найден';
            $linesCount = count(explode("\n", $sketchCode));
            ?>
            <div class="doc-top-actions">
                <div>
                    <h2 style="margin: 0; font-size: 20px; color: var(--text);">Исходный код скетча: <code>keyer_breadboard.ino</code></h2>
                    <span class="sketch-line-counter">Версия 1.7.1 · ATmega328P (Arduino Uno / Nano) · <?= $linesCount ?> строк кода</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-secondary" onclick="mwCopyFullSketch()" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;">
                        <span>📋</span> Скопировать весь скетч
                    </button>
                    <a href="keydocs.php?download=sketch" class="btn btn-primary" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; text-decoration: none; font-weight: 700;">
                        <span>📥</span> Скачать .ino файл
                    </a>
                </div>
            </div>

            <div class="sketch-meta-box">
                <div>
                    <strong style="color: #4fd8c4; font-size: 14px;">⚡ Быстрая прошивка за 1 минуту:</strong>
                    <div style="font-size: 13px; color: var(--text); margin-top: 4px; line-height: 1.5;">
                        1. Откройте бесплатную программу <b>Arduino IDE</b>.<br>
                        2. Создайте новый скетч, вставьте скопированный код или откройте скачанный <code>keyer_breadboard.ino</code>.<br>
                        3. В меню <b>Инструменты → Плата</b> выберите <i>Arduino Nano</i> (или Uno), выберите ваш COM-порт и нажмите <b>Загрузить (Upload)</b>.
                    </div>
                </div>
            </div>

            <div class="doc-code-card">
                <div class="doc-code-header">
                    <span class="doc-code-lang">Arduino C++ (.ino)</span>
                    <button type="button" class="btn-copy-code" onclick="mwCopyFullSketch()">
                        <span>📋</span> Скопировать код
                    </button>
                </div>
                <pre><code class="language-cpp" id="sketch-full-code"><?= htmlspecialchars($sketchCode) ?></code></pre>
            </div>

        <?php elseif ($docKey === 'pcb'): ?>
            <!-- ================= ВКЛАДКА ЗАВОДСКОЙ ПЛАТЫ KICAD ================= -->
            <div class="doc-top-actions">
                <div>
                    <h2 style="margin: 0; font-size: 20px; color: #4fd8c4;">Заводская печатная плата MorseWave Pro v2.0</h2>
                    <span class="sketch-line-counter">KiCad 8.0 · 100% THT (выводной монтаж) · Встроенный аналоговый фильтр и опторазвязка</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="keydocs.php?download=schematic_pdf" class="btn btn-primary" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; text-decoration: none; font-weight: 700;">
                        <span>📄</span> Скачать схему платы (PDF)
                    </a>
                </div>
            </div>

            <p class="doc-p">
                Для тех, кто хочет получить аккуратное фабричное устройство в красивом корпусе вместо проводов на макетке, мы разработали полноценную заводскую двухстороннюю печатную плату <b>MorseWave Pro v2.0</b>.
            </p>

            <div class="alert alert-info" style="background: rgba(79, 216, 196, 0.06); border: 1px solid rgba(79, 216, 196, 0.3); border-radius: 10px; padding: 14px 18px; margin: 16px 0;">
                <div style="font-weight: 700; color: #4fd8c4; margin-bottom: 4px;">🛠️ Особенность схемотехники: 100% классический выводной монтаж (THT)</div>
                <div style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
                    На плате нет ни одного сложного SMD-компонента или мелких микросхем — используются стандартные резисторы 0.25 Вт, выводные конденсаторы и разъёмы с шагом 2.54 мм. Плату может спаять даже начинающий радиолюбитель за 30–40 минут обычным бытовым паяльником.
                </div>
            </div>

            <h3 class="doc-h3">3D-визуализация готовой платы MorseWave Pro:</h3>
            <div class="pcb-gallery-grid">
                <div class="pcb-gallery-card">
                    <a href="keydocs.php?img=isometric" target="_blank" title="Открыть в полном размере">
                        <img src="keydocs.php?img=isometric" alt="MorseWave Pro 3D Isometric View" loading="lazy">
                    </a>
                    <div class="pcb-gallery-info">
                        <div class="pcb-gallery-title">Изометрический вид</div>
                        <div class="pcb-gallery-desc">Расположение OLED 0.96", Arduino Nano, 3 ручек настройки и индикаторных LED</div>
                    </div>
                </div>

                <div class="pcb-gallery-card">
                    <a href="keydocs.php?img=top" target="_blank" title="Открыть в полном размере">
                        <img src="keydocs.php?img=top" alt="MorseWave Pro 3D Top View" loading="lazy">
                    </a>
                    <div class="pcb-gallery-info">
                        <div class="pcb-gallery-title">Вид сверху (Монтажная сторона)</div>
                        <div class="pcb-gallery-desc">Чёткая шелкография со всеми позиционными обозначениями и номиналами деталей</div>
                    </div>
                </div>

                <div class="pcb-gallery-card">
                    <a href="keydocs.php?img=rear" target="_blank" title="Открыть в полном размере">
                        <img src="keydocs.php?img=rear" alt="MorseWave Pro 3D Rear View" loading="lazy">
                    </a>
                    <div class="pcb-gallery-info">
                        <div class="pcb-gallery-title">Задняя панель интерфейсов</div>
                        <div class="pcb-gallery-desc">Гнезда 3.5 мм для весла и кабеля трансивера, выход звука и разъём USB</div>
                    </div>
                </div>
            </div>

            <h3 class="doc-h3">Технические характеристики платы MorseWave Pro v2.0:</h3>
            <div class="doc-table-wrap">
                <table class="doc-table">
                    <thead>
                        <tr>
                            <th>Параметр</th>
                            <th>Значение</th>
                            <th>Примечание</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b>Габариты платы</b></td>
                            <td>85 × 55 мм</td>
                            <td>Идеально помещается в компактные стандартные корпуса</td>
                        </tr>
                        <tr>
                            <td><b>Тип монтажа</b></td>
                            <td>100% Through-Hole (THT)</td>
                            <td>Сборка без фена и паяльной пасты, обычный припой ПОС-61</td>
                        </tr>
                        <tr>
                            <td><b>Микроконтроллер</b></td>
                            <td>Arduino Nano v3.0 (ATmega328P)</td>
                            <td>Устанавливается на цанговые панельки для лёгкой замены</td>
                        </tr>
                        <tr>
                            <td><b>Гальваническая развязка</b></td>
                            <td>Оптопары PC817 (PTT и KEY)</td>
                            <td>Полная защита трансивера и компьютера от земляных петель и наводок</td>
                        </tr>
                        <tr>
                            <td><b>Аналоговый звуковой тракт</b></td>
                            <td>Транзисторный каскад + RC-фильтр</td>
                            <td>Срезает резкие цифровые гармоники ШИМ, формируя бархатный мягкий тон</td>
                        </tr>
                        <tr>
                            <td><b>Органы управления</b></td>
                            <td>3 потенциометра (WPM, Tone, Vol)</td>
                            <td>Универсальные контактные площадки: можно монтировать любые стандартные потенциометры (от компактных 9 мм типа RK09 до 16 мм WH148 или СП3-4). Все 3 ручки выстроены в одну удобную линию сверху платы для лёгкого монтажа и выноса ручек на лицевую панель корпуса</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                <a href="keydocs.php?download=schematic_pdf" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                    <span>📄</span> Скачать принципиальную электрическую схему (PDF)
                </a>
                <span style="font-size: 13px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.05); padding: 8px 14px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <span>📦</span> Файлы производства (Gerber) — проект находится в подготовке к заказу первой партии
                </span>
            </div>

        <?php else: ?>
            <!-- ================= ВКЛАДКА MARKDOWN ДОКУМЕНТОВ ================= -->
            <?php
            $docFiles = [
                'guide' => $hardwareDir . '/cw-keyer/cw-keyer-guide-full.md',
                'wiring' => $hardwareDir . '/cw-keyer/breadboard-wiring.md',
                'schematic' => $hardwareDir . '/cw-keyer/cw-keyer-schematic.md',
            ];
            $targetPath = $docFiles[$docKey] ?? $docFiles['guide'];
            $mdRaw = file_exists($targetPath) ? file_get_contents($targetPath) : '# Документ не найден';
            $renderedHtml = mw_render_markdown($mdRaw);
            ?>

            <div class="doc-top-actions">
                <div>
                    <span style="font-size: 12px; font-weight: 700; color: #4fd8c4; text-transform: uppercase; letter-spacing: 0.05em;">Документация оборудования</span>
                    <div style="font-size: 13px; color: var(--text-muted);">Исходный файл: <code><?= basename($targetPath) ?></code></div>
                </div>
                <div>
                    <a href="keydocs.php?download=<?= $docKey ?>" class="btn btn-primary" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; text-decoration: none; font-weight: 700;">
                        <span>📥</span> Скачать этот документ (.md)
                    </a>
                </div>
            </div>

            <div class="doc-markdown-body">
                <?= $renderedHtml ?>
            </div>

        <?php endif; ?>

    </div>
</div>

<script>
// Быстрое копирование фрагментов кода
function mwCopySnippet(btn) {
    const code = btn.getAttribute('data-code') || '';
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✓</span> Скопировано!';
        btn.style.borderColor = '#4fd8c4';
        btn.style.color = '#4fd8c4';
        setTimeout(() => {
            btn.innerHTML = orig;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        alert('Не удалось скопировать в буфер. Выделите текст вручную.');
    });
}

// Быстрое копирование всего скетча целиком
function mwCopyFullSketch() {
    const codeEl = document.getElementById('sketch-full-code');
    if (!codeEl) return;
    const text = codeEl.innerText || codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('✓ Полный код скетча keyer_breadboard.ino скопирован в буфер обмена!\n\nТеперь откройте Arduino IDE и нажмите Ctrl+V.');
    }).catch(() => {
        alert('Пожалуйста, выделите текст скетча и нажмите Ctrl+C');
    });
}
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>

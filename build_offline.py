# build_offline.py - Generates standalone offline MorseWave keyer package
import os
import shutil
import re
import json

BASE_DIR = r'e:\dev\morse-trainer'
OUT_DIR = os.path.join(BASE_DIR, 'offline-keyer')

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'css'), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'js'), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'img'), exist_ok=True)

# 1. Copy CSS
for css in ['style.css', 'keyhardware.css']:
    src = os.path.join(BASE_DIR, 'assets', 'css', css)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(OUT_DIR, 'assets', 'css', css))

# 2. Copy JS
js_files = [
    'i18n.js', 'icons.js', 'morse-data.js', 'abbreviations.js', 'words.js',
    'audio-settings.js', 'display-settings.js', 'audio.js', 'input.js',
    'signal.js', 'progress.js', 'daily.js', 'app.js', 'timinglab.js', 'keyhardware.js'
]
for js in js_files:
    src = os.path.join(BASE_DIR, 'assets', 'js', js)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(OUT_DIR, 'assets', 'js', js))

# 3. Copy Images
for img in ['morsewave_pro_3d_top.png', 'morsewave_pro_3d_iso.png']:
    src = os.path.join(BASE_DIR, 'assets', 'img', img)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(OUT_DIR, 'assets', 'img', img))

# 4. Extract ru.php translations
with open(os.path.join(BASE_DIR, 'lang', 'ru.php'), 'r', encoding='utf-8') as f:
    ru_php = f.read()

i18n_dict = {}
for line in ru_php.splitlines():
    m = re.match(r"^\s*['\"]([a-zA-Z0-9_\.\-]+)['\"]\s*=>\s*['\"](.*)['\"]\s*[,;]?\s*$", line)
    if m:
        key, val = m.group(1), m.group(2)
        val = val.replace(r"\'", "'")
        i18n_dict[key] = val

i18n_json_str = json.dumps(i18n_dict, ensure_ascii=False)

# 5. Extract keyer.php content
with open(os.path.join(BASE_DIR, 'keyer.php'), 'r', encoding='utf-8') as f:
    keyer_content = f.read()

# Strip initial PHP block and footer
body = re.sub(r'^<\?php.*?\?>\s*', '', keyer_content, flags=re.DOTALL)
body = re.sub(r'<\?php\s+include\s+__DIR__\s*\.\s*\'/includes/footer\.php\';\s*\?>', '', body)

# Replace asset_v calls in body
body = body.replace("<?= asset_v('assets/css/keyhardware.css') ?>", "assets/css/keyhardware.css")
body = body.replace("<?= asset_v('assets/img/morsewave_pro_3d_top.png') ?>", "assets/img/morsewave_pro_3d_top.png")
body = body.replace("<?= asset_v('assets/img/morsewave_pro_3d_iso.png') ?>", "assets/img/morsewave_pro_3d_iso.png")

# Assemble standalone index.html
html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Боевой ключ MorseWave Pro · Оффлайн Режим (R9OGL Edition)</title>
    <meta name="description" content="Автономная версия телеграфного хаба MorseWave Pro для радиоклуба">
    <style>
        /* Fallback fonts if offline without Google Fonts */
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }}
        code, pre, .mono, font-mono, #terminal-log-stream, .oled-bezel, .timing-value {{
            font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace !important;
        }}
    </style>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/keyhardware.css">
    <script>
        window.MW_LANG = "ru";
        window.MW_I18N = {i18n_json_str};
    </script>
</head>
<body>
    <header class="site-header" style="background:#080b0e; border-bottom:1px solid #1a222c; padding:12px 20px;">
        <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:22px;">⚡</span>
                <div>
                    <strong style="color:#4fd8c4; font-size:16px; letter-spacing:0.04em;">MorseWave Pro · ОФФЛАЙН ВЕРСИЯ</strong>
                    <div style="font-size:12px; color:var(--text-muted);">USB Телеграфный манипулятор (R9OGL Edition) · Для работы в радиоклубе</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge" style="background:rgba(79, 216, 196, 0.15); color:#4fd8c4; border:1px solid rgba(79, 216, 196, 0.4); font-size:12px; font-weight:700; padding:4px 10px; border-radius:6px;">
                    🟢 100% АВТОНОМНЫЙ РЕЖИМ (БЕЗ СЕТИ)
                </span>
            </div>
        </div>
    </header>

    <main class="page">
        <div class="container">
            {body}
        </div>
    </main>

    <footer class="site-footer" style="margin-top:40px; padding:20px 0; border-top:1px solid var(--border); text-align:center; font-size:13px; color:var(--text-muted);">
        <div class="container">
            <span>© MorseWave · Автор R9OGL · Автономный комплект для радиоклуба</span>
        </div>
    </footer>

    <!-- Скрипты MorseWave -->
    <script src="assets/js/i18n.js"></script>
    <script src="assets/js/icons.js"></script>
    <script src="assets/js/morse-data.js"></script>
    <script src="assets/js/abbreviations.js"></script>
    <script src="assets/js/words.js"></script>
    <script src="assets/js/audio-settings.js"></script>
    <script src="assets/js/display-settings.js"></script>
    <script src="assets/js/audio.js"></script>
    <script src="assets/js/input.js"></script>
    <script src="assets/js/signal.js"></script>
    <script src="assets/js/progress.js"></script>
    <script src="assets/js/daily.js"></script>
    <script src="assets/js/app.js"></script>
    <script src="assets/js/timinglab.js"></script>
    <script src="assets/js/keyhardware.js"></script>
</body>
</html>
"""

with open(os.path.join(OUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)

print("Offline package generated successfully in:", OUT_DIR)

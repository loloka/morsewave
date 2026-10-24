# build_offline.py - Generates standalone offline MorseWave keyer and Invaders package
import os
import shutil
import re
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, 'offline-keyer')

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'css'), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'js'), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'assets', 'img'), exist_ok=True)

# 1. Copy CSS
css_files = ['style.css', 'keyhardware.css', 'invaders.css']
for css in css_files:
    src = os.path.join(BASE_DIR, 'assets', 'css', css)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(OUT_DIR, 'assets', 'css', css))

# 2. Copy JS
js_files = [
    'i18n.js', 'icons.js', 'morse-data.js', 'abbreviations.js', 'words.js',
    'audio-settings.js', 'display-settings.js', 'audio.js', 'input.js',
    'signal.js', 'progress.js', 'daily.js', 'live-timer.js', 'app.js', 'timinglab.js', 'keyhardware.js',
    'invaders.js'
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

def replace_php_t(content):
    def _sub(match):
        key = match.group(1)
        return i18n_dict.get(key, key)
    # Replace <?= t('key') ?> and <?= t("key") ?>
    return re.sub(r"<\?=\s*t\(['\"]([a-zA-Z0-9_\.\-]+)['\"]\)\s*\?>", _sub, content)

def replace_mw_icon(content):
    # Map simple icons to SVG
    icons = {
        'zap': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        'notebook': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M16 2v20"></path></svg>',
    }
    def _sub(match):
        name = match.group(1)
        return icons.get(name, '')
    return re.sub(r"<\?=\s*mw_icon\(['\"]([a-zA-Z0-9_\-]+)['\"].*?\)\s*\?>", _sub, content)

# 5. Build keyer.html (and index.html)
with open(os.path.join(BASE_DIR, 'keyer.php'), 'r', encoding='utf-8') as f:
    keyer_content = f.read()

# Strip initial PHP block and footer
keyer_body = re.sub(r'^<\?php.*?\?>\s*', '', keyer_content, flags=re.DOTALL)
keyer_body = re.sub(r'<\?php\s+include\s+__DIR__\s*\.\s*\'/includes/footer\.php\';\s*\?>', '', keyer_body)

# Replace asset_v calls in body
keyer_body = keyer_body.replace("<?= asset_v('assets/css/keyhardware.css') ?>", "assets/css/keyhardware.css")
keyer_body = keyer_body.replace("<?= asset_v('assets/img/morsewave_pro_3d_top.png') ?>", "assets/img/morsewave_pro_3d_top.png")
keyer_body = keyer_body.replace("<?= asset_v('assets/img/morsewave_pro_3d_iso.png') ?>", "assets/img/morsewave_pro_3d_iso.png")

# Replace translations and icons
keyer_body = replace_php_t(keyer_body)
keyer_body = replace_mw_icon(keyer_body)

# In offline mode, link to invaders.html instead of invaders.php
keyer_body = keyer_body.replace('href="invaders.php"', 'href="invaders.html"')

html_keyer = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Боевой ключ MorseWave Pro · Оффлайн Режим (R9OGL Edition)</title>
    <meta name="description" content="Автономная версия телеграфного хаба MorseWave Pro для радиоклуба">
    <style>
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
                    <div style="font-size:12px; color:var(--text-muted);">USB Телеграфный манипулятор (R9OGL Edition) · Автономный режим</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <a href="invaders.html" class="btn btn-sm" style="background:#00ff66; color:#030604; font-weight:700; text-decoration:none; padding:6px 14px; border-radius:6px; box-shadow:0 0 10px rgba(0,255,102,0.3);">
                    🎯 Вторжение-2 (Игра с ключом) →
                </a>
                <span class="badge" style="background:rgba(79, 216, 196, 0.15); color:#4fd8c4; border:1px solid rgba(79, 216, 196, 0.4); font-size:12px; font-weight:700; padding:5px 10px; border-radius:6px;">
                    🟢 100% ОФФЛАЙН
                </span>
            </div>
        </div>
    </header>

    <main class="page">
        <div class="container">
            {keyer_body}
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

# Save as both index.html and keyer.html
with open(os.path.join(OUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html_keyer)
with open(os.path.join(OUT_DIR, 'keyer.html'), 'w', encoding='utf-8') as f:
    f.write(html_keyer)

# 6. Build invaders.html
with open(os.path.join(BASE_DIR, 'invaders.php'), 'r', encoding='utf-8') as f:
    invaders_content = f.read()

invaders_body = re.sub(r'^<\?php.*?\?>\s*', '', invaders_content, flags=re.DOTALL)
invaders_body = re.sub(r'<\?php\s+include\s+__DIR__\s*\.\s*\'/includes/footer\.php\';\s*\?>', '', invaders_body)

invaders_body = invaders_body.replace("<?= asset_v('assets/css/invaders.css') ?>", "assets/css/invaders.css")
invaders_body = replace_php_t(invaders_body)
invaders_body = replace_mw_icon(invaders_body)

# In offline mode, link to keyer.html / index.html
invaders_body = invaders_body.replace('href="keyer.php"', 'href="index.html"')

html_invaders = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Вторжение-2: Радиоперехват · MorseWave Pro Оффлайн</title>
    <meta name="description" content="Аркадный тренажер перехвата радиосигналов с телеграфным ключом MorseWave Pro">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }}
        code, pre, .mono, font-mono {{
            font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace !important;
        }}
    </style>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/invaders.css">
    <script>
        window.MW_LANG = "ru";
        window.MW_I18N = {i18n_json_str};
    </script>
</head>
<body>
    <header class="site-header" style="background:#080b0e; border-bottom:1px solid #1a222c; padding:12px 20px;">
        <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:22px;">🎯</span>
                <div>
                    <strong style="color:#00ff66; font-size:16px; letter-spacing:0.04em;">Вторжение-2: Радиоперехват (ОФФЛАЙН)</strong>
                    <div style="font-size:12px; color:var(--text-muted);">Боевой тренажёр телеграфа с аппаратным ключом MorseWave Pro</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <a href="index.html" class="btn btn-sm btn-secondary" style="font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                    ⚡ <span>Хаб ключа MorseWave Pro →</span>
                </a>
                <span class="badge" style="background:rgba(0, 255, 102, 0.15); color:#00ff66; border:1px solid rgba(0, 255, 102, 0.4); font-size:12px; font-weight:700; padding:5px 10px; border-radius:6px;">
                    🟢 100% ОФФЛАЙН
                </span>
            </div>
        </div>
    </header>

    <main class="page">
        <div class="container">
            {invaders_body}
        </div>
    </main>

    <footer class="site-footer" style="margin-top:40px; padding:20px 0; border-top:1px solid var(--border); text-align:center; font-size:13px; color:var(--text-muted);">
        <div class="container">
            <span>© MorseWave · Автор R9OGL · Боевой аркадный перехват для радиоклуба</span>
        </div>
    </footer>

    <!-- Скрипты MorseWave & Invaders -->
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
    <script src="assets/js/invaders.js"></script>
</body>
</html>
"""

with open(os.path.join(OUT_DIR, 'invaders.html'), 'w', encoding='utf-8') as f:
    f.write(html_invaders)

print("Offline package with Keyer & Invaders II generated successfully in:", OUT_DIR)

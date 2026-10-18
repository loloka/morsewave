"""
Compiles 3D render views into a high-resolution, multi-page presentation PDF:
hardware/MorseWave_Pro/MorseWave_Pro_3D_Views.pdf
"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"e:\dev\morse-trainer\hardware\MorseWave_Pro"
PDF_PATH = os.path.join(BASE_DIR, "MorseWave_Pro_3D_Views.pdf")

# Page dimensions (A4 Landscape at 150 DPI: 1754 x 1240 px)
PAGE_W = 1754
PAGE_H = 1240

def get_font(size, bold=False):
    font_file = "arialbd.ttf" if bold else "arial.ttf"
    font_path = os.path.join(r"C:\Windows\Fonts", font_file)
    try:
        return ImageFont.truetype(font_path, size)
    except:
        return ImageFont.load_default()

def create_page(img_filename, title, subtitle, caption):
    page = Image.new("RGB", (PAGE_W, PAGE_H), color=(20, 24, 28))
    draw = ImageDraw.Draw(page)

    # Top Header Banner
    draw.rectangle([(0, 0), (PAGE_W, 110)], fill=(14, 17, 22))
    draw.line([(0, 110), (PAGE_W, 110)], fill=(45, 55, 70), width=2)

    # Title & Subtitle
    font_title = get_font(32, bold=True)
    font_sub = get_font(18, bold=False)
    draw.text((45, 22), title, fill=(240, 245, 255), font=font_title)
    draw.text((45, 68), subtitle, fill=(130, 165, 215), font=font_sub)

    # Load and scale render image
    img_path = os.path.join(BASE_DIR, img_filename)
    if os.path.exists(img_path):
        render_img = Image.open(img_path)
        target_w = 1664
        target_h = 936
        render_img = render_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = (PAGE_W - target_w) // 2
        py = 135
        page.paste(render_img, (px, py))
        draw.rectangle([(px, py), (px + target_w, py + target_h)], outline=(45, 55, 70), width=1)

    # Bottom Footer Banner with Caption
    draw.rectangle([(0, 1150), (PAGE_W, PAGE_H)], fill=(14, 17, 22))
    draw.line([(0, 1150), (PAGE_W, 1150)], fill=(45, 55, 70), width=2)
    font_cap = get_font(17, bold=False)
    draw.text((45, 1175), caption, fill=(195, 205, 220), font=font_cap)

    return page

pages = []

# Page 1: Top View
p1 = create_page(
    "MorseWave_Pro_3D.png",
    "MorseWave Pro v2.0 (100% THT Classic) — Top View",
    "By R9OGL  •  morse.r9old.ru  •  Board: 100.0 x 75.0 mm (0 SMD, Rezonit Class 3/4 Verified)",
    "Top View: Emerald green soldermask, callsign 'DE R9OGL' in Morse code, 3-pin headers for pots, dual Red (D1) / Green (D3) LEDs, 2-pin SPK header."
)
pages.append(p1)

# Page 2: Front-Isometric View
p2 = create_page(
    "MorseWave_Pro_3D_Isometric.png",
    "MorseWave Pro v2.0 — Isometric 3D View",
    "Studio Raytraced Lighting  •  OLED 0.96\" I2C  •  Zero DRC Violations  •  Zero Unconnected Nets",
    "Isometric View: Professional layout with generous component spacing, robust 2.54mm THT pads, optoisolated Key & PTT, and 2-pin speaker header."
)
pages.append(p2)

# Page 3: Rear Ground Plane View
p3 = create_page(
    "MorseWave_Pro_3D_Rear.png",
    "MorseWave Pro v2.0 — Ground Plane (B.Cu) 3D View",
    "Solid Continuous Copper Ground Pour  •  Thermal Reliefs  •  Superior RF Shielding",
    "Rear View: Over 95% continuous B.Cu ground plane shielding the sensitive analog audio filter from digital clock noise."
)
pages.append(p3)

pages[0].save(PDF_PATH, save_all=True, append_images=pages[1:], resolution=150.0)
print(f"Generated multi-page 3D views PDF: {PDF_PATH}")

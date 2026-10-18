"""
Compiles 3D render views into a high-resolution, multi-page presentation PDF:
hardware/MorseWave_Pro/MorseWave_Pro/MorseWave_Pro_3D_Views.pdf
"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro"
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
    # Create dark-mode sleek background page
    page = Image.new("RGB", (PAGE_W, PAGE_H), color=(24, 27, 32))
    draw = ImageDraw.Draw(page)
    
    # Top Header Banner
    draw.rectangle([(0, 0), (PAGE_W, 110)], fill=(16, 18, 22))
    draw.line([(0, 110), (PAGE_W, 110)], fill=(50, 60, 75), width=2)
    
    # Title & Subtitle
    font_title = get_font(34, bold=True)
    font_sub = get_font(19, bold=False)
    draw.text((45, 22), title, fill=(240, 245, 255), font=font_title)
    draw.text((45, 68), subtitle, fill=(130, 165, 215), font=font_sub)
    
    # Load and scale render image
    img_path = os.path.join(BASE_DIR, img_filename)
    if os.path.exists(img_path):
        render_img = Image.open(img_path)
        # Target image box: W=1664, H=936
        target_w = 1664
        target_h = 936
        render_img = render_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        # Paste centered
        px = (PAGE_W - target_w) // 2
        py = 135
        page.paste(render_img, (px, py))
        
        # Border around render
        draw.rectangle([(px, py), (px + target_w, py + target_h)], outline=(50, 60, 75), width=1)
    
    # Bottom Footer Banner with Caption
    draw.rectangle([(0, 1150), (PAGE_W, PAGE_H)], fill=(16, 18, 22))
    draw.line([(0, 1150), (PAGE_W, 1150)], fill=(50, 60, 75), width=2)
    font_cap = get_font(18, bold=False)
    draw.text((45, 1175), caption, fill=(200, 210, 225), font=font_cap)
    
    return page

pages = []

# Page 1: Top View
p1 = create_page(
    "MorseWave_Pro_3D.png",
    "MorseWave Pro v2.0 (THT Classic Edition) — Top View",
    "By R9OGL  •  morse.r9old.ru  •  Board: 100.0 x 75.0 mm (100% Through-Hole)",
    "Top View: Clear spacious layout, Dual-Paddle CW logo with 'DE R9OGL', Nano pinout silkscreen, SPEED / TONE / VOLUME controls, Phones output."
)
pages.append(p1)

# Page 2: Front-Isometric View
p2 = create_page(
    "MorseWave_Pro_3D_Isometric.png",
    "MorseWave Pro v2.0 — Front Isometric 3D View",
    "Aluminum Machined Knobs  •  OLED 0.96\" I2C  •  Rezonit & PS Electro Standard Compliance",
    "Front-Isometric View: Alps RK09L potentiometers with knurled knobs, illuminated OLED display, robust THT soldering pads."
)
pages.append(p2)

# Page 3: Rear-Isometric View
p3 = create_page(
    "MorseWave_Pro_3D_Rear.png",
    "MorseWave Pro v2.0 — Rear Connectors 3D View",
    "Rear Panel Connections: USB / Serial, Headphones 3.5mm, PTT RCA, Paddle Key, PS/2 Keyboard",
    "Rear-Isometric View: Arduino Nano USB flush at bottom edge, PHONES 3.5mm with 150R attenuation, isolated PTT/Key out, PS/2 keyboard header."
)
pages.append(p3)

# Save multi-page PDF
pages[0].save(PDF_PATH, save_all=True, append_images=pages[1:], resolution=150.0)
print(f"Generated multi-page 3D views PDF: {PDF_PATH}")

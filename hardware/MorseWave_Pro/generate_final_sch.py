import os
import re
import uuid
import subprocess

def new_uuid():
    return str(uuid.uuid4())

SYM_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\symbols"

def extract_sym(lib_name, sym_name):
    path = os.path.join(SYM_DIR, f"{lib_name}.kicad_sym")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    start = text.find(f'(symbol "{sym_name}"')
    if start == -1:
        raise ValueError(f"Symbol {sym_name} not found in {lib_name}")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == '(': depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                block = text[start:i+1]
                # extract pins
                pins = re.findall(r'\(number\s+"([^"]+)"', block)
                pins = list(dict.fromkeys(pins))
                return block, pins
    return "", []

# Extract all required symbols
nano2_block, nano_pins = extract_sym("MCU_Module", "Arduino_Nano_v2.x")
nano3_block, _ = extract_sym("MCU_Module", "Arduino_Nano_v3.x")
bc546_block, bc_pins = extract_sym("Transistor_BJT", "BC546")
bc547_block, _ = extract_sym("Transistor_BJT", "BC547")
pc817_block, pc817_pins = extract_sym("Isolator", "PC817")
conn2_block, conn2_pins = extract_sym("Connector", "Conn_01x02_Pin")
conn3_block, conn3_pins = extract_sym("Connector", "Conn_01x03_Pin")
conn4_block, conn4_pins = extract_sym("Connector", "Conn_01x04_Pin")
r_block, r_pins = extract_sym("Device", "R")
c_block, c_pins = extract_sym("Device", "C")
cp_block, cp_pins = extract_sym("Device", "C_Polarized")
pot_block, pot_pins = extract_sym("Device", "R_Potentiometer")
led_block, led_pins = extract_sym("Device", "LED")
d_block, d_pins = extract_sym("Device", "D")
gnd_block, gnd_pins = extract_sym("power", "GND")
vcc_block, vcc_pins = extract_sym("power", "+5V")

lib_symbols_list = [
    nano2_block, nano3_block,
    bc546_block, bc547_block,
    pc817_block,
    conn2_block, conn3_block, conn4_block,
    r_block, c_block, cp_block, pot_block, led_block, d_block,
    gnd_block, vcc_block
]

pins_map = {
    "Arduino_Nano_v3.x": nano_pins,
    "BC547": bc_pins,
    "PC817": pc817_pins,
    "Conn_01x02_Pin": conn2_pins,
    "Conn_01x03_Pin": conn3_pins,
    "Conn_01x04_Pin": conn4_pins,
    "R": r_pins,
    "C": c_pins,
    "C_Polarized": cp_pins,
    "R_Potentiometer": pot_pins,
    "LED": led_pins,
    "D": d_pins,
    "GND": gnd_pins,
    "+5V": vcc_pins,
}

SHEET_UUID = "2e45d1d2-c73f-46e5-98d6-3a9dc360bff5"

def sym(ref, val, footprint, lib_id, x, y, rot=0):
    u = new_uuid()
    pins = pins_map.get(lib_id, [])
    pin_str = "\n".join([f'\t\t(pin "{p}" (uuid "{new_uuid()}"))' for p in pins])
    hide_ref = ' (hide yes)' if ref.startswith('#PWR') else ''
    
    return f"""\t(symbol
\t\t(lib_id "{lib_id}")
\t\t(at {x} {y} {rot})
\t\t(unit 1)
\t\t(exclude_from_sim no)
\t\t(in_bom yes)
\t\t(on_board yes)
\t\t(dnp no)
\t\t(uuid "{u}")
\t\t(property "Reference" "{ref}"
\t\t\t(at {x} {y - 4} 0){hide_ref}
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Value" "{val}"
\t\t\t(at {x} {y + 4} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Footprint" "{footprint}"
\t\t\t(at {x} {y} 0)
\t\t\t(hide yes)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
{pin_str}
\t\t(instances
\t\t\t(project "MorseWave_Pro"
\t\t\t\t(path "/{SHEET_UUID}"
\t\t\t\t\t(reference "{ref}")
\t\t\t\t\t(unit 1)
\t\t\t\t)
\t\t\t)
\t\t)
\t)"""

def pwr_sym(val, x, y, rot=0):
    ref = "#PWR" + new_uuid()[:6].upper()
    return sym(ref, val, "", val, x, y, rot)

def lbl(name, x, y, rot=0, justify="left bottom"):
    u = new_uuid()
    return f"""\t(label "{name}"
\t\t(at {x} {y} {rot})
\t\t(effects
\t\t\t(font (size 1.27 1.27))
\t\t\t(justify {justify})
\t\t)
\t\t(uuid "{u}")
\t)"""

def wr(x1, y1, x2, y2):
    u = new_uuid()
    return f"""\t(wire
\t\t(pts
\t\t\t(xy {x1} {y1}) (xy {x2} {y2})
\t\t)
\t\t(stroke (width 0) (type default))
\t\t(uuid "{u}")
\t)"""

def txt(text, x, y, size=2.5):
    u = new_uuid()
    clean_text = text.replace('"', '\\"')
    return f"""\t(text "{clean_text}"
\t\t(at {x} {y} 0)
\t\t(effects
\t\t\t(font (size {size} {size}) (bold yes))
\t\t\t(justify left bottom)
\t\t)
\t\t(uuid "{u}")
\t)"""

items = []

# 1. Arduino Nano v3 (Center)
N_X = 170.0
N_Y = 130.0
items.append(txt("1. МИКРОКОНТРОЛЛЕР ARDUINO NANO (ATmega328P)", N_X - 40, N_Y - 32))
items.append(sym("A1", "Arduino_Nano_v3.x", "Module:Arduino_Nano", "Arduino_Nano_v3.x", N_X, N_Y))

# Left pins:
items.append(wr(N_X - 10.16, 119.84, N_X - 15.24, 119.84))
items.append(pwr_sym("GND", N_X - 15.24, 119.84, 90))

items.append(wr(N_X - 10.16, 122.38, N_X - 15.24, 122.38))
items.append(lbl("DIT", N_X - 15.24, 122.38, 0, "right bottom"))

items.append(wr(N_X - 10.16, 124.92, N_X - 15.24, 124.92))
items.append(lbl("DAH", N_X - 15.24, 124.92, 0, "right bottom"))

items.append(wr(N_X - 10.16, 127.46, N_X - 15.24, 127.46))
items.append(lbl("PS2_DATA", N_X - 15.24, 127.46, 0, "right bottom"))

items.append(wr(N_X - 10.16, 130.00, N_X - 15.24, 130.00))
items.append(lbl("PS2_CLK", N_X - 15.24, 130.00, 0, "right bottom"))

items.append(wr(N_X - 10.16, 132.54, N_X - 15.24, 132.54))
items.append(lbl("AUDIO_PWM", N_X - 15.24, 132.54, 0, "right bottom"))

items.append(wr(N_X - 10.16, 135.08, N_X - 15.24, 135.08))
items.append(lbl("KEY_OUT_CTRL", N_X - 15.24, 135.08, 0, "right bottom"))

items.append(wr(N_X - 10.16, 137.62, N_X - 15.24, 137.62))
items.append(lbl("LED_KEY", N_X - 15.24, 137.62, 0, "right bottom"))

items.append(wr(N_X - 10.16, 140.16, N_X - 15.24, 140.16))
items.append(lbl("PTT_OUT_CTRL", N_X - 15.24, 140.16, 0, "right bottom"))

# Right pins:
items.append(wr(N_X + 10.16, 114.76, N_X + 15.24, 114.76))
items.append(pwr_sym("GND", N_X + 15.24, 114.76, 270))

items.append(wr(N_X + 10.16, 119.84, N_X + 15.24, 119.84))
items.append(pwr_sym("+5V", N_X + 15.24, 119.84, 270))

items.append(wr(N_X + 10.16, 127.46, N_X + 15.24, 127.46))
items.append(lbl("OLED_SCL", N_X + 15.24, 127.46, 0, "left bottom"))

items.append(wr(N_X + 10.16, 130.00, N_X + 15.24, 130.00))
items.append(lbl("OLED_SDA", N_X + 15.24, 130.00, 0, "left bottom"))

items.append(wr(N_X + 10.16, 137.62, N_X + 15.24, 137.62))
items.append(lbl("POT_TONE", N_X + 15.24, 137.62, 0, "left bottom"))

items.append(wr(N_X + 10.16, 140.16, N_X + 15.24, 140.16))
items.append(lbl("POT_SPEED", N_X + 15.24, 140.16, 0, "left bottom"))


# 2. Paddle Input Module (Top-Left)
items.append(txt("2. ВХОД МАНИПУЛЯТОРА (3.5mm JACK) С ФИЛЬТРАЦИЕЙ", 30, 40))
items.append(sym("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical", "Conn_01x03_Pin", 45, 55))
items.append(lbl("DIT", 52, 52.46, 0, "left bottom"))
items.append(lbl("DAH", 52, 55.00, 0, "left bottom"))
items.append(pwr_sym("GND", 52, 57.54, 270))

items.append(sym("C1", "10nF", "Capacitor_SMD:C_0805_2012Metric", "C", 70, 52.46, 90))
items.append(wr(52, 52.46, 66.19, 52.46))
items.append(wr(73.81, 52.46, 78, 52.46))
items.append(pwr_sym("GND", 78, 52.46, 270))

items.append(sym("C2", "10nF", "Capacitor_SMD:C_0805_2012Metric", "C", 70, 57.54, 90))
items.append(wr(52, 55.00, 66.19, 57.54))
items.append(wr(73.81, 57.54, 78, 57.54))
items.append(pwr_sym("GND", 78, 57.54, 270))


# 3. Transceiver Isolated Key Out & PTT (Top-Right)
items.append(txt("3. ГАЛЬВАНИЧЕСКАЯ РАЗВЯЗКА К ТРАНСИВЕРУ (KEY & PTT OUT)", 240, 40))

# Key Out U2 (PC817)
items.append(sym("U2", "PC817", "Package_DIP:DIP-4_W7.62mm", "PC817", 265, 55))
items.append(sym("R4", "330R", "Resistor_SMD:R_0805_2012Metric", "R", 248, 52.46, 90))
items.append(lbl("KEY_OUT_CTRL", 238, 52.46, 0, "right bottom"))
items.append(wr(238, 52.46, 244.19, 52.46))
items.append(wr(251.81, 52.46, 259.92, 52.46))
items.append(wr(259.92, 57.54, 255, 57.54))
items.append(pwr_sym("GND", 255, 57.54, 90))

items.append(sym("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical", "Conn_01x02_Pin", 295, 55))
items.append(wr(270.08, 52.46, 291.19, 52.46))
items.append(wr(270.08, 57.54, 291.19, 55.00))
items.append(sym("D2", "1N4148", "Diode_SMD:D_SOD-123", "D", 280, 55, 270))

# PTT Out U3 (PC817)
items.append(sym("U3", "PC817", "Package_DIP:DIP-4_W7.62mm", "PC817", 265, 80))
items.append(sym("R5", "330R", "Resistor_SMD:R_0805_2012Metric", "R", 248, 77.46, 90))
items.append(lbl("PTT_OUT_CTRL", 238, 77.46, 0, "right bottom"))
items.append(wr(238, 77.46, 244.19, 77.46))
items.append(wr(251.81, 77.46, 259.92, 77.46))
items.append(wr(259.92, 82.54, 255, 82.54))
items.append(pwr_sym("GND", 255, 82.54, 90))

items.append(sym("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical", "Conn_01x02_Pin", 295, 80))
items.append(wr(270.08, 77.46, 291.19, 77.46))
items.append(wr(270.08, 82.54, 291.19, 80.00))


# 4. Analog Audio Stage (Two-Stage Butterworth Low-Pass Filter & Soft Tone Driver)
items.append(txt("4. АНАЛОГОВЫЙ ЗВУКОВОЙ ТРАКТ: 2-ЗВЕННЫЙ ФНЧ + BC547", 30, 175))
items.append(lbl("AUDIO_PWM", 35, 190, 0, "right bottom"))
items.append(wr(35, 190, 42, 190))

# 1-е звено RC: R1 (1k) + C3 (100nF)
items.append(sym("R1", "1k", "Resistor_SMD:R_0805_2012Metric", "R", 46, 190, 90))
items.append(wr(49.81, 190, 58, 190))
items.append(sym("C3", "100nF", "Capacitor_SMD:C_0805_2012Metric", "C", 58, 198, 0))
items.append(wr(58, 190, 58, 194.19))
items.append(wr(58, 201.81, 58, 206))
items.append(pwr_sym("GND", 58, 206))

# 2-е звено RC: R2 (1k) + C4 (47nF)
items.append(wr(58, 190, 66, 190))
items.append(sym("R2", "1k", "Resistor_SMD:R_0805_2012Metric", "R", 70, 190, 90))
items.append(wr(73.81, 190, 82, 190))
items.append(sym("C4", "47nF", "Capacitor_SMD:C_0805_2012Metric", "C", 82, 198, 0))
items.append(wr(82, 190, 82, 194.19))
items.append(wr(82, 201.81, 82, 206))
items.append(pwr_sym("GND", 82, 206))

# Volume Potentiometer RV3 (10k)
items.append(sym("RV3", "10k (Volume)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "R_Potentiometer", 96, 190, 0))
items.append(wr(82, 190, 96, 184.92))
items.append(wr(96, 195.08, 96, 202))
items.append(pwr_sym("GND", 96, 202))

# R6 (470R)
items.append(wr(99.81, 190, 106, 190))
items.append(sym("R6", "470R", "Resistor_SMD:R_0805_2012Metric", "R", 110, 190, 90))

# Q1 (BC547)
items.append(wr(113.81, 190, 120, 190))
items.append(sym("Q1", "BC547", "Package_TO_SOT_THT:TO-92_Inline", "BC547", 125, 190))
items.append(wr(127.54, 192.54, 127.54, 202))
items.append(pwr_sym("GND", 127.54, 202))

# Speaker J4 + Damping C5 + R7 (33R 1W)
items.append(sym("J4", "SPEAKER_8R", "Connector_JST:JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", "Conn_01x02_Pin", 148, 185))
items.append(wr(127.54, 187.46, 144.19, 187.46))

items.append(sym("C5", "100nF", "Capacitor_SMD:C_0805_2012Metric", "C", 137, 197, 0))
items.append(wr(127.54, 187.46, 137, 193.19))
items.append(wr(137, 200.81, 137, 206))
items.append(pwr_sym("GND", 137, 206))

items.append(wr(144.19, 182.54, 144.19, 175))
items.append(sym("R7", "33R (1W)", "Resistor_SMD:R_1206_3216Metric", "R", 152, 175, 90))
items.append(wr(155.81, 175, 162, 175))
items.append(pwr_sym("+5V", 162, 175, 270))


# 5. Front Panel Controls (Speed, Tone, LED Key)
items.append(txt("5. ОРГАНЫ УПРАВЛЕНИЯ ЛИЦЕВОЙ ПАНЕЛИ", 210, 175))

# Speed Pot RV1 (10k)
items.append(sym("RV1", "10k (Speed)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "R_Potentiometer", 220, 190))
items.append(pwr_sym("+5V", 220, 183, 0))
items.append(pwr_sym("GND", 220, 197, 0))
items.append(wr(223.81, 190, 230, 190))
items.append(lbl("POT_SPEED", 230, 190, 0, "left bottom"))

# Tone Pot RV2 (10k)
items.append(sym("RV2", "10k (Tone)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "R_Potentiometer", 245, 190))
items.append(pwr_sym("+5V", 245, 183, 0))
items.append(pwr_sym("GND", 245, 197, 0))
items.append(wr(248.81, 190, 255, 190))
items.append(lbl("POT_TONE", 255, 190, 0, "left bottom"))

# LED Key D1 + R3
items.append(lbl("LED_KEY", 270, 185, 0, "right bottom"))
items.append(wr(270, 185, 274, 185))
items.append(sym("R3", "330R", "Resistor_SMD:R_0805_2012Metric", "R", 278, 185, 90))
items.append(wr(281.81, 185, 286, 185))
items.append(sym("D1", "LED_KEY", "LED_THT:LED_D3.0mm", "LED", 290, 185, 90))
items.append(wr(293.81, 185, 298, 185))
items.append(pwr_sym("GND", 298, 185, 270))


# 6. OLED 0.96" I2C Header
items.append(txt("6. ЭКРАН OLED 0.96 ДЮЙМА I2C FAST", 30, 95))
items.append(sym("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical", "Conn_01x04_Pin", 45, 115))
items.append(wr(41.19, 111.18, 35, 111.18))
items.append(pwr_sym("GND", 35, 111.18, 90))
items.append(wr(41.19, 113.72, 35, 113.72))
items.append(pwr_sym("+5V", 35, 113.72, 90))
items.append(wr(41.19, 116.26, 35, 116.26))
items.append(lbl("OLED_SCL", 35, 116.26, 0, "right bottom"))
items.append(wr(41.19, 118.80, 35, 118.80))
items.append(lbl("OLED_SDA", 35, 118.80, 0, "right bottom"))


# 7. PS/2 Keyboard Expansion Header
items.append(txt("7. РАЗЪЁМ PS/2 КЛАВИАТУРЫ (ОПЦИЯ)", 240, 105))
items.append(sym("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical", "Conn_01x04_Pin", 255, 125))
items.append(wr(251.19, 121.18, 245, 121.18))
items.append(pwr_sym("+5V", 245, 121.18, 90))
items.append(wr(251.19, 123.72, 245, 123.72))
items.append(power_sym_2 := pwr_sym("GND", 245, 123.72, 90))
items.append(wr(251.19, 126.26, 245, 126.26))
items.append(lbl("PS2_DATA", 245, 126.26, 0, "right bottom"))
items.append(wr(251.19, 128.80, 245, 128.80))
items.append(lbl("PS2_CLK", 245, 128.80, 0, "right bottom"))


# 8. Power Decoupling Block
items.append(txt("8. ФИЛЬТРАЦИЯ ШИНЫ ПИТАНИЯ +5V", 220, 225))
items.append(pwr_sym("+5V", 230, 235))
items.append(wr(230, 235, 240, 235))
items.append(sym("C6", "100uF", "Capacitor_SMD:CP_Elec_6.3x5.4", "C_Polarized", 240, 245, 0))
items.append(wr(240, 235, 240, 241.19))
items.append(wr(240, 248.81, 240, 255))
items.append(pwr_sym("GND", 240, 255))

items.append(wr(240, 235, 255, 235))
items.append(sym("C7", "100nF", "Capacitor_SMD:C_0805_2012Metric", "C", 255, 245, 0))
items.append(wr(255, 235, 255, 241.19))
items.append(wr(255, 248.81, 255, 255))
items.append(pwr_sym("GND", 255, 255))

lib_str = "\n".join(lib_symbols_list)
items_str = "\n".join(items)

final_sch = f"""(kicad_sch
\t(version 20260101)
\t(generator "eeschema")
\t(generator_version "10.0")
\t(uuid "{SHEET_UUID}")
\t(paper "A3")
\t(title_block
\t\t(title "MorseWave Pro Keyer (R9OGL Edition)")
\t\t(date "2026-10-18")
\t\t(rev "v2.0 PCB")
\t\t(company "R9OGL Hardware Workshop")
\t\t(comment 1 "CW Keyer with Curtis Lookahead, 2-Stage Filter & Transceiver Isolation")
\t)
\t(lib_symbols
{lib_str}
\t)
{items_str}
\t(sheet_instances
\t\t(path "/"
\t\t\t(page "1")
\t\t)
\t)
\t(embedded_fonts no)
)"""

out_file = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_sch"
with open(out_file, "w", encoding="utf-8") as f:
    f.write(final_sch)

print(f"Final schematic written: {out_file} ({len(final_sch)} bytes)")

# Test with kicad-cli
cmd = [r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe", "sch", "export", "svg", out_file]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Export exit code:", res.returncode)
print("Output:", res.stdout + res.stderr)

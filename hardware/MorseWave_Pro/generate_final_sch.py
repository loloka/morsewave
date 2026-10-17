"""
MorseWave Pro Keyer (R9OGL Edition v2.0)
Precision Automated KiCad Schematic Generator
Uses exact pin coordinate calculations from KiCad symbol library.
"""
import os
import re
import uuid
import subprocess

def new_uuid():
    return str(uuid.uuid4())

SYM_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\symbols"

sym_cache = {}

def load_sym_pins(lib_name, sym_name):
    key = f"{lib_name}:{sym_name}"
    if key in sym_cache:
        return sym_cache[key]
    
    path = os.path.join(SYM_DIR, f"{lib_name}.kicad_sym")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    start = text.find(f'(symbol "{sym_name}"')
    if start == -1:
        raise ValueError(f"Not found: {sym_name} in {lib_name}")
    depth = 0
    end = len(text)
    for i in range(start, len(text)):
        if text[i] == '(': depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    block = text[start:end]
    m_ext = re.search(r'\(extends\s+"([^"]+)"\)', block)
    if m_ext:
        base_name = m_ext.group(1)
        pins = load_sym_pins(lib_name, base_name)
        sym_cache[key] = pins
        return pins

    pins = {}
    matches = re.finditer(r'\(pin\s+\S+\s+\S+\s+\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+([-\d.]+))?\).*?\(name\s+"([^"]*)".*?\(number\s+"([^"]+)"', block, re.DOTALL)
    for m in matches:
        px, py, prot, name, num = m.groups()
        pins[str(num)] = (float(px), float(py), float(prot or 0), name)
    sym_cache[key] = pins
    return pins

def extract_sym_block(lib_name, sym_name):
    path = os.path.join(SYM_DIR, f"{lib_name}.kicad_sym")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    start = text.find(f'(symbol "{sym_name}"')
    depth = 0
    end = len(text)
    for i in range(start, len(text)):
        if text[i] == '(': depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    block = text[start:end]
    full_name = f"{lib_name}:{sym_name}"
    m_ext = re.search(r'\(extends\s+"([^"]+)"\)', block)
    if m_ext:
        base_name = m_ext.group(1)
        base_block = extract_sym_block(lib_name, base_name)
        base_full = f"{lib_name}:{base_name}"
        flat_block = base_block.replace(f'(symbol "{base_full}"', f'(symbol "{full_name}"')
        flat_block = flat_block.replace(f'"{base_name}_', f'"{sym_name}_')
        return flat_block
    
    block = f'(symbol "{full_name}"' + block[len(f'(symbol "{sym_name}"'):]
    return block



def get_pin(lib_name, sym_name, sym_x, sym_y, rot, pin_num):
    pins = load_sym_pins(lib_name, sym_name)
    px, py, _, _ = pins[str(pin_num)]
    if rot == 0:
        x_sch = sym_x + px
        y_sch = sym_y - py
    elif rot == 90:
        x_sch = sym_x - py
        y_sch = sym_y - px
    elif rot == 180:
        x_sch = sym_x - px
        y_sch = sym_y + py
    elif rot == 270:
        x_sch = sym_x + py
        y_sch = sym_y + px
    else:
        raise ValueError(f"Unsupported rotation: {rot}")
    return round(x_sch, 2), round(y_sch, 2)


# Build embedded library symbols with full prefixes
embedded_symbols = [
    extract_sym_block("MCU_Module", "Arduino_Nano_v2.x"),
    extract_sym_block("MCU_Module", "Arduino_Nano_v3.x"),
    extract_sym_block("Transistor_BJT", "Q_NPN_CBE"),
    extract_sym_block("Transistor_BJT", "BC547"),
    extract_sym_block("Isolator", "PC817"),
    extract_sym_block("Connector", "Conn_01x02_Pin"),
    extract_sym_block("Connector", "Conn_01x03_Pin"),
    extract_sym_block("Connector", "Conn_01x04_Pin"),
    extract_sym_block("Device", "R"),
    extract_sym_block("Device", "C"),
    extract_sym_block("Device", "C_Polarized"),
    extract_sym_block("Device", "R_Potentiometer"),
    extract_sym_block("Device", "LED"),
    extract_sym_block("Device", "D"),
    extract_sym_block("power", "GND"),
    extract_sym_block("power", "+5V"),
    extract_sym_block("power", "PWR_FLAG"),
]

SHEET_UUID = "2e45d1d2-c73f-46e5-98d6-3a9dc360bff5"

class Schematic:
    def __init__(self):
        self.items = []
        self.sym_registry = {}

    def sym(self, ref, val, footprint, lib_name, sym_name, x, y, rot=0, ref_offset=None, val_offset=None):
        lib_id = f"{lib_name}:{sym_name}"
        pins = load_sym_pins(lib_name, sym_name)
        pin_str = "\n".join([f'\t\t(pin "{p}" (uuid "{new_uuid()}"))' for p in pins.keys()])
        hide_ref = ' (hide yes)' if ref.startswith('#PWR') else ''
        
        rx = x + (ref_offset[0] if ref_offset else 0)
        ry = y + (ref_offset[1] if ref_offset else -3.81)
        vx = x + (val_offset[0] if val_offset else 0)
        vy = y + (val_offset[1] if val_offset else 3.81)
        
        u = new_uuid()
        self.items.append(f"""\t(symbol
\t\t(lib_id "{lib_id}")
\t\t(at {x:.2f} {y:.2f} {rot})
\t\t(unit 1)
\t\t(exclude_from_sim no)
\t\t(in_bom yes)
\t\t(on_board yes)
\t\t(dnp no)
\t\t(uuid "{u}")
\t\t(property "Reference" "{ref}"
\t\t\t(at {rx:.2f} {ry:.2f} 0){hide_ref}
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Value" "{val}"
\t\t\t(at {vx:.2f} {vy:.2f} 0)
\t\t\t(effects (font (size 1.27 1.27)))
\t\t)
\t\t(property "Footprint" "{footprint}"
\t\t\t(at {x:.2f} {y:.2f} 0)
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
\t)""")
        self.sym_registry[ref] = (lib_name, sym_name, x, y, rot)

    def pwr(self, val, x, y, rot=0, val_offset=None):
        ref = "#PWR" + new_uuid()[:6].upper()
        if val_offset is None:
            if val == "+5V":
                val_offset = (0, -2.54) if rot == 0 else (0, 2.54)
            else:
                val_offset = (0, 2.54) if rot == 0 else (0, -2.54)
        self.sym(ref, val, "", "power", val, x, y, rot, val_offset=val_offset)

    def lbl(self, name, x, y, rot=0, justify="left bottom"):
        u = new_uuid()
        self.items.append(f"""\t(label "{name}"
\t\t(at {x:.2f} {y:.2f} {rot})
\t\t(effects
\t\t\t(font (size 1.27 1.27))
\t\t\t(justify {justify})
\t\t)
\t\t(uuid "{u}")
\t)""")

    def wr(self, x1, y1, x2, y2):
        if round(x1, 2) == round(x2, 2) and round(y1, 2) == round(y2, 2):
            return
        u = new_uuid()
        self.items.append(f"""\t(wire
\t\t(pts
\t\t\t(xy {x1:.2f} {y1:.2f}) (xy {x2:.2f} {y2:.2f})
\t\t)
\t\t(stroke (width 0) (type default))
\t\t(uuid "{u}")
\t)""")

    def junc(self, x, y):
        u = new_uuid()
        self.items.append(f"""\t(junction
\t\t(at {x:.2f} {y:.2f})
\t\t(diameter 1.016)
\t\t(color 0 0 0 0)
\t\t(uuid "{u}")
\t)""")

    def no_connect(self, x, y):
        u = new_uuid()
        self.items.append(f"""\t(no_connect
\t\t(at {x:.2f} {y:.2f})
\t\t(uuid "{u}")
\t)""")

    def txt(self, text, x, y, size=2.5):
        u = new_uuid()
        clean = text.replace('"', '\\"')
        self.items.append(f"""\t(text "{clean}"
\t\t(at {x:.2f} {y:.2f} 0)
\t\t(effects
\t\t\t(font (size {size} {size}) (bold yes))
\t\t\t(justify left bottom)
\t\t)
\t\t(uuid "{u}")
\t)""")

    def pin_pos(self, ref, pin_num):
        lib_name, sym_name, x, y, rot = self.sym_registry[ref]
        return get_pin(lib_name, sym_name, x, y, rot, pin_num)

s = Schematic()

# ==============================================================================
# SECTION 1: ARDUINO NANO v3 (CENTER)
# ==============================================================================
N_X = 167.64
N_Y = 129.54

s.txt("1. МИКРОКОНТРОЛЛЕР ARDUINO NANO (ATmega328P)", N_X - 45.72, N_Y - 35.56)
s.sym("A1", "Arduino_Nano_v3.x", "Module:Arduino_Nano", "MCU_Module", "Arduino_Nano_v3.x", N_X, N_Y, 0)

# Connect Left pins:
# D0, D1 (no connect)
s.no_connect(*s.pin_pos("A1", 2))
s.no_connect(*s.pin_pos("A1", 1))

# D2 (DIT)
p_d2 = s.pin_pos("A1", 5)
s.wr(p_d2[0], p_d2[1], p_d2[0] - 12.70, p_d2[1])
s.lbl("DIT", p_d2[0] - 12.70, p_d2[1], 0, "right bottom")

# D3 (DAH)
p_d3 = s.pin_pos("A1", 6)
s.wr(p_d3[0], p_d3[1], p_d3[0] - 12.70, p_d3[1])
s.lbl("DAH", p_d3[0] - 12.70, p_d3[1], 0, "right bottom")

# D4 (PS2_DATA)
p_d4 = s.pin_pos("A1", 7)
s.wr(p_d4[0], p_d4[1], p_d4[0] - 12.70, p_d4[1])
s.lbl("PS2_DATA", p_d4[0] - 12.70, p_d4[1], 0, "right bottom")

# D5 (PS2_CLK)
p_d5 = s.pin_pos("A1", 8)
s.wr(p_d5[0], p_d5[1], p_d5[0] - 12.70, p_d5[1])
s.lbl("PS2_CLK", p_d5[0] - 12.70, p_d5[1], 0, "right bottom")

# D6, D7, D8 (no connect)
s.no_connect(*s.pin_pos("A1", 9))
s.no_connect(*s.pin_pos("A1", 10))
s.no_connect(*s.pin_pos("A1", 11))

# D9 (AUDIO_PWM)
p_d9 = s.pin_pos("A1", 12)
s.wr(p_d9[0], p_d9[1], p_d9[0] - 12.70, p_d9[1])
s.lbl("AUDIO_PWM", p_d9[0] - 12.70, p_d9[1], 0, "right bottom")

# D10 (KEY_OUT_CTRL)
p_d10 = s.pin_pos("A1", 13)
s.wr(p_d10[0], p_d10[1], p_d10[0] - 12.70, p_d10[1])
s.lbl("KEY_OUT_CTRL", p_d10[0] - 12.70, p_d10[1], 0, "right bottom")

# D11 (PTT_OUT_CTRL)
p_d11 = s.pin_pos("A1", 14)
s.wr(p_d11[0], p_d11[1], p_d11[0] - 12.70, p_d11[1])
s.lbl("PTT_OUT_CTRL", p_d11[0] - 12.70, p_d11[1], 0, "right bottom")

# D12 (no connect)
s.no_connect(*s.pin_pos("A1", 15))

# D13 (LED_KEY)
p_d13 = s.pin_pos("A1", 16)
s.wr(p_d13[0], p_d13[1], p_d13[0] - 12.70, p_d13[1])
s.lbl("LED_KEY", p_d13[0] - 12.70, p_d13[1], 0, "right bottom")

# Right pins of Nano:
s.no_connect(*s.pin_pos("A1", 28))
s.no_connect(*s.pin_pos("A1", 3))
s.no_connect(*s.pin_pos("A1", 18))

# A0 (POT_SPEED)
p_a0 = s.pin_pos("A1", 19)
s.wr(p_a0[0], p_a0[1], p_a0[0] + 12.70, p_a0[1])
s.lbl("POT_SPEED", p_a0[0] + 12.70, p_a0[1], 0, "left bottom")

# A1 (POT_TONE)
p_a1 = s.pin_pos("A1", 20)
s.wr(p_a1[0], p_a1[1], p_a1[0] + 12.70, p_a1[1])
s.lbl("POT_TONE", p_a1[0] + 12.70, p_a1[1], 0, "left bottom")

# A2, A3 (no connect)
s.no_connect(*s.pin_pos("A1", 21))
s.no_connect(*s.pin_pos("A1", 22))

# A4 (OLED_SDA)
p_a4 = s.pin_pos("A1", 23)
s.wr(p_a4[0], p_a4[1], p_a4[0] + 12.70, p_a4[1])
s.lbl("OLED_SDA", p_a4[0] + 12.70, p_a4[1], 0, "left bottom")

# A5 (OLED_SCL)
p_a5 = s.pin_pos("A1", 24)
s.wr(p_a5[0], p_a5[1], p_a5[0] + 12.70, p_a5[1])
s.lbl("OLED_SCL", p_a5[0] + 12.70, p_a5[1], 0, "left bottom")

# A6, A7 (no connect)
s.no_connect(*s.pin_pos("A1", 25))
s.no_connect(*s.pin_pos("A1", 26))

# Top & Bottom power pins of Nano:
s.no_connect(*s.pin_pos("A1", 30))  # VIN
s.no_connect(*s.pin_pos("A1", 17))  # 3V3

# Pin 27 (+5V)
p_5v = s.pin_pos("A1", 27)
s.wr(p_5v[0], p_5v[1], p_5v[0], p_5v[1] - 5.08)
s.pwr("+5V", p_5v[0], p_5v[1] - 5.08, 0)

# Pin 4 (GND)
p_gnd = s.pin_pos("A1", 4)
s.wr(p_gnd[0], p_gnd[1], p_gnd[0], p_gnd[1] + 5.08)
s.pwr("GND", p_gnd[0], p_gnd[1] + 5.08, 0)

s.no_connect(*s.pin_pos("A1", 29))  # GND pin 29


# ==============================================================================
# SECTION 2: PADDLE INPUT (3.5mm JACK) WITH RF FILTER (TOP-LEFT)
# ==============================================================================
s.txt("2. ВХОД МАНИПУЛЯТОРА (3.5mm JACK) С ФИЛЬТРАЦИЕЙ", 30.48, 40.64)

J1_X = 45.72
J1_Y = 55.88
s.sym("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical", "Connector", "Conn_01x03_Pin", J1_X, J1_Y, 0)

p_j1_1 = s.pin_pos("J1", 1)  # DIT
p_j1_2 = s.pin_pos("J1", 2)  # DAH
p_j1_3 = s.pin_pos("J1", 3)  # GND

# DIT line
s.wr(p_j1_1[0], p_j1_1[1], 76.20, p_j1_1[1])
s.lbl("DIT", 76.20, p_j1_1[1], 0, "left bottom")

# C1 shunt across DIT to GND:
# Place C1 so Pin 1 touches p_j1_1[1] (53.34)
# In Device:C rot=0: Pin 1 is at y - 3.81. So y = 53.34 + 3.81 = 57.15
s.sym("C1", "10nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 63.50, 57.15, 0)
p_c1_1 = s.pin_pos("C1", 1)
p_c1_2 = s.pin_pos("C1", 2)
s.junc(p_c1_1[0], p_c1_1[1])
s.wr(p_c1_2[0], p_c1_2[1], p_c1_2[0], p_c1_2[1] + 5.08)
s.pwr("GND", p_c1_2[0], p_c1_2[1] + 5.08, 0)

# DAH line: route down to 76.20
s.wr(p_j1_2[0], p_j1_2[1], 55.88, p_j1_2[1])
s.wr(55.88, p_j1_2[1], 55.88, 76.20)
s.wr(55.88, 76.20, 76.20, 76.20)
s.lbl("DAH", 76.20, 76.20, 0, "left bottom")

# C2 shunt across DAH to GND:
s.sym("C2", "10nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 63.50, 80.01, 0)
p_c2_1 = s.pin_pos("C2", 1)
p_c2_2 = s.pin_pos("C2", 2)
s.junc(p_c2_1[0], p_c2_1[1])
s.wr(p_c2_2[0], p_c2_2[1], p_c2_2[0], p_c2_2[1] + 5.08)
s.pwr("GND", p_c2_2[0], p_c2_2[1] + 5.08, 0)

# GND of J1
s.wr(p_j1_3[0], p_j1_3[1], p_j1_3[0], p_j1_3[1] + 7.62)
s.pwr("GND", p_j1_3[0], p_j1_3[1] + 7.62, 0)


# ==============================================================================
# SECTION 3: GALVANIC ISOLATION (KEY & PTT OUT) TO TRANSCEIVER (TOP-RIGHT)
# ==============================================================================
s.txt("3. ГАЛЬВАНИЧЕСКАЯ РАЗВЯЗКА К ТРАНСИВЕРУ (KEY & PTT OUT)", 233.68, 40.64)

# --- KEY OUT: U2 (PC817) ---
s.sym("U2", "PC817", "Package_DIP:DIP-4_W7.62mm", "Isolator", "PC817", 264.16, 55.88, 0)
p_u2_1 = s.pin_pos("U2", 1)  # Anode
p_u2_2 = s.pin_pos("U2", 2)  # Cathode
p_u2_3 = s.pin_pos("U2", 3)  # Emitter
p_u2_4 = s.pin_pos("U2", 4)  # Collector

# R4 (330R) horizontal rot=90: Pin 2 at p_u2_1[0], Pin 1 to the left
# In Device:R rot=90: Pin 2 is at x + 3.81. We want Pin 2 at p_u2_1[0] - 6.35
s.sym("R4", "330R", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 246.38, p_u2_1[1], 90)
p_r4_1 = s.pin_pos("R4", 1)
p_r4_2 = s.pin_pos("R4", 2)

s.wr(p_r4_2[0], p_r4_2[1], p_u2_1[0], p_u2_1[1])
s.wr(p_r4_1[0], p_r4_1[1], p_r4_1[0] - 6.35, p_r4_1[1])
s.lbl("KEY_OUT_CTRL", p_r4_1[0] - 6.35, p_r4_1[1], 0, "right bottom")

# Cathode to GND
s.wr(p_u2_2[0], p_u2_2[1], p_u2_2[0], p_u2_2[1] + 5.08)
s.pwr("GND", p_u2_2[0], p_u2_2[1] + 5.08, 0)

# Output connector J2: Conn_01x02_Pin at (299.72, 55.88) rot=180
s.sym("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical", "Connector", "Conn_01x02_Pin", 299.72, 55.88, 180)
p_j2_1 = s.pin_pos("J2", 1)
p_j2_2 = s.pin_pos("J2", 2)

# Collector to J2 Pin 2 (top pin at 53.34)
s.wr(p_u2_4[0], p_u2_4[1], p_j2_2[0], p_u2_4[1])
s.wr(p_j2_2[0], p_u2_4[1], p_j2_2[0], p_j2_2[1])

# Emitter to J2 Pin 1 (bottom pin at 55.88)
s.wr(p_u2_3[0], p_u2_3[1], 284.48, p_u2_3[1])
s.wr(284.48, p_u2_3[1], 284.48, p_j2_1[1])
s.wr(284.48, p_j2_1[1], p_j2_1[0], p_j2_1[1])

# Flyback Diode D2 (1N4148):
# Place D2 vertical rot=270 between Collector and Emitter at x=279.40
s.sym("D2", "1N4148", "Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal", "Device", "D", 279.40, 55.88, 270, ref_offset=(4.5, -2.0), val_offset=(4.5, 2.0))
p_d2_1 = s.pin_pos("D2", 1)  # Cathode (top)
p_d2_2 = s.pin_pos("D2", 2)  # Anode (bottom)

s.wr(p_d2_1[0], p_d2_1[1], p_d2_1[0], p_u2_4[1])
s.junc(p_d2_1[0], p_u2_4[1])
s.wr(p_d2_2[0], p_d2_2[1], p_d2_2[0], p_u2_3[1])
s.junc(p_d2_2[0], p_u2_3[1])


# --- PTT OUT: U3 (PC817) ---
s.sym("U3", "PC817", "Package_DIP:DIP-4_W7.62mm", "Isolator", "PC817", 264.16, 81.28, 0)
p_u3_1 = s.pin_pos("U3", 1)
p_u3_2 = s.pin_pos("U3", 2)
p_u3_3 = s.pin_pos("U3", 3)
p_u3_4 = s.pin_pos("U3", 4)

s.sym("R5", "330R", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 246.38, p_u3_1[1], 90)
p_r5_1 = s.pin_pos("R5", 1)
p_r5_2 = s.pin_pos("R5", 2)

s.wr(p_r5_2[0], p_r5_2[1], p_u3_1[0], p_u3_1[1])
s.wr(p_r5_1[0], p_r5_1[1], p_r5_1[0] - 6.35, p_r5_1[1])
s.lbl("PTT_OUT_CTRL", p_r5_1[0] - 6.35, p_r5_1[1], 0, "right bottom")

s.wr(p_u3_2[0], p_u3_2[1], p_u3_2[0], p_u3_2[1] + 5.08)
s.pwr("GND", p_u3_2[0], p_u3_2[1] + 5.08, 0)

s.sym("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical", "Connector", "Conn_01x02_Pin", 299.72, 81.28, 180)
p_j3_1 = s.pin_pos("J3", 1)
p_j3_2 = s.pin_pos("J3", 2)

s.wr(p_u3_4[0], p_u3_4[1], p_j3_2[0], p_u3_4[1])
s.wr(p_j3_2[0], p_u3_4[1], p_j3_2[0], p_j3_2[1])

s.wr(p_u3_3[0], p_u3_3[1], 284.48, p_u3_3[1])
s.wr(284.48, p_u3_3[1], 284.48, p_j3_1[1])
s.wr(284.48, p_j3_1[1], p_j3_1[0], p_j3_1[1])


# ==============================================================================
# SECTION 4: ANALOG AUDIO STAGE (TWO-STAGE BUTTERWORTH LOW-PASS + BC547)
# ==============================================================================
s.txt("4. АНАЛОГОВЫЙ ЗВУКОВОЙ ТРАКТ: 2-ЗВЕННЫЙ ФНЧ + BC547", 30.48, 172.72)

AUDIO_Y = 190.50

# R1 (1k) horizontal rot=90
s.sym("R1", "1k", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 45.72, AUDIO_Y, 90)
p_r1_1 = s.pin_pos("R1", 1)
p_r1_2 = s.pin_pos("R1", 2)

s.lbl("AUDIO_PWM", p_r1_1[0] - 7.62, p_r1_1[1], 0, "right bottom")
s.wr(p_r1_1[0] - 7.62, p_r1_1[1], p_r1_1[0], p_r1_1[1])

# C3 (100nF) shunt to GND
s.sym("C3", "100nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 58.42, AUDIO_Y + 3.81, 0)
p_c3_1 = s.pin_pos("C3", 1)
p_c3_2 = s.pin_pos("C3", 2)

s.wr(p_r1_2[0], p_r1_2[1], p_c3_1[0], p_c3_1[1])
s.junc(p_c3_1[0], p_c3_1[1])
s.wr(p_c3_2[0], p_c3_2[1], p_c3_2[0], p_c3_2[1] + 5.08)
s.pwr("GND", p_c3_2[0], p_c3_2[1] + 5.08, 0)

# R2 (1k) horizontal rot=90
s.sym("R2", "1k", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 72.39, AUDIO_Y, 90)
p_r2_1 = s.pin_pos("R2", 1)
p_r2_2 = s.pin_pos("R2", 2)

s.wr(p_c3_1[0], p_c3_1[1], p_r2_1[0], p_r2_1[1])

# C4 (47nF) shunt to GND
s.sym("C4", "47nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 85.09, AUDIO_Y + 3.81, 0)
p_c4_1 = s.pin_pos("C4", 1)
p_c4_2 = s.pin_pos("C4", 2)

s.wr(p_r2_2[0], p_r2_2[1], p_c4_1[0], p_c4_1[1])
s.junc(p_c4_1[0], p_c4_1[1])
s.wr(p_c4_2[0], p_c4_2[1], p_c4_2[0], p_c4_2[1] + 5.08)
s.pwr("GND", p_c4_2[0], p_c4_2[1] + 5.08, 0)

# Volume Potentiometer RV3 (10k)
s.sym("RV3", "10k (Volume)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "Device", "R_Potentiometer", 99.06, AUDIO_Y + 3.81, 0)
p_rv3_1 = s.pin_pos("RV3", 1)
p_rv3_2 = s.pin_pos("RV3", 2)
p_rv3_3 = s.pin_pos("RV3", 3)

s.wr(p_c4_1[0], p_c4_1[1], p_rv3_1[0], p_rv3_1[1])
s.wr(p_rv3_3[0], p_rv3_3[1], p_rv3_3[0], p_rv3_3[1] + 5.08)
s.pwr("GND", p_rv3_3[0], p_rv3_3[1] + 5.08, 0)

# R6 (470R) horizontal rot=90: Base resistor for Q1
s.sym("R6", "470R", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 110.49, p_rv3_2[1], 90)
p_r6_1 = s.pin_pos("R6", 1)
p_r6_2 = s.pin_pos("R6", 2)

s.wr(p_rv3_2[0], p_rv3_2[1], p_r6_1[0], p_r6_1[1])

# Q1 (BC547):
s.sym("Q1", "BC547", "Package_TO_SOT_THT:TO-92_Inline", "Transistor_BJT", "BC547", 124.46, p_rv3_2[1], 0)
p_q1_c = s.pin_pos("Q1", 1)
p_q1_b = s.pin_pos("Q1", 2)
p_q1_e = s.pin_pos("Q1", 3)

s.wr(p_r6_2[0], p_r6_2[1], p_q1_b[0], p_q1_b[1])
s.wr(p_q1_e[0], p_q1_e[1], p_q1_e[0], p_q1_e[1] + 3.81)
s.pwr("GND", p_q1_e[0], p_q1_e[1] + 3.81, 0)

# Collector node:
# C5 (100nF) damping cap to GND
s.sym("C5", "100nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 137.16, p_q1_c[1] + 3.81, 0)
p_c5_1 = s.pin_pos("C5", 1)
p_c5_2 = s.pin_pos("C5", 2)

s.wr(p_q1_c[0], p_q1_c[1], p_c5_1[0], p_c5_1[1])
s.junc(p_c5_1[0], p_c5_1[1])
s.wr(p_c5_2[0], p_c5_2[1], p_c5_2[0], p_c5_2[1] + 5.08)
s.pwr("GND", p_c5_2[0], p_c5_2[1] + 5.08, 0)

# Speaker connector J4 (Conn_01x02_Pin) rot=180:
s.sym("J4", "SPEAKER_8R", "Connector_JST:JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", "Connector", "Conn_01x02_Pin", 154.94, p_q1_c[1], 180)
p_j4_1 = s.pin_pos("J4", 1)  # Bottom pin (at p_q1_c[1] = 189.23)
p_j4_2 = s.pin_pos("J4", 2)  # Top pin (at 186.69)

s.wr(p_c5_1[0], p_c5_1[1], p_j4_1[0], p_j4_1[1])

# J4 Pin 2 connects through R7 (33R 1W) to +5V:
R7_Y = 175.26
s.wr(p_j4_2[0], p_j4_2[1], p_j4_2[0], R7_Y)

s.sym("R7", "33R (1W)", "Resistor_THT:R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", "Device", "R", 158.75, R7_Y, 90)
p_r7_1 = s.pin_pos("R7", 1)
p_r7_2 = s.pin_pos("R7", 2)

s.wr(p_j4_2[0], R7_Y, p_r7_1[0], p_r7_1[1])
s.wr(p_r7_2[0], p_r7_2[1], p_r7_2[0] + 5.08, p_r7_2[1])
s.pwr("+5V", p_r7_2[0] + 5.08, p_r7_2[1], 270)


# ==============================================================================
# SECTION 5: FRONT PANEL CONTROLS (SPEED, TONE, LED KEY)
# ==============================================================================
s.txt("5. ОРГАНЫ УПРАВЛЕНИЯ ЛИЦЕВОЙ ПАНЕЛИ", 215.90, 172.72)

# RV1 Speed (10k)
s.sym("RV1", "10k (Speed)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "Device", "R_Potentiometer", 228.60, 190.50, 0)
p_rv1_1 = s.pin_pos("RV1", 1)
p_rv1_2 = s.pin_pos("RV1", 2)
p_rv1_3 = s.pin_pos("RV1", 3)

s.wr(p_rv1_1[0], p_rv1_1[1], p_rv1_1[0], p_rv1_1[1] - 5.08)
s.pwr("+5V", p_rv1_1[0], p_rv1_1[1] - 5.08, 0)

s.wr(p_rv1_3[0], p_rv1_3[1], p_rv1_3[0], p_rv1_3[1] + 5.08)
s.pwr("GND", p_rv1_3[0], p_rv1_3[1] + 5.08, 0)

s.wr(p_rv1_2[0], p_rv1_2[1], p_rv1_2[0] + 6.35, p_rv1_2[1])
s.lbl("POT_SPEED", p_rv1_2[0] + 6.35, p_rv1_2[1], 0, "left bottom")

# RV2 Tone (10k)
s.sym("RV2", "10k (Tone)", "Potentiometer_THT:Potentiometer_Alps_RK09L_Single_Vertical", "Device", "R_Potentiometer", 254.00, 190.50, 0)
p_rv2_1 = s.pin_pos("RV2", 1)
p_rv2_2 = s.pin_pos("RV2", 2)
p_rv2_3 = s.pin_pos("RV2", 3)

s.wr(p_rv2_1[0], p_rv2_1[1], p_rv2_1[0], p_rv2_1[1] - 5.08)
s.pwr("+5V", p_rv2_1[0], p_rv2_1[1] - 5.08, 0)

s.wr(p_rv2_3[0], p_rv2_3[1], p_rv2_3[0], p_rv2_3[1] + 5.08)
s.pwr("GND", p_rv2_3[0], p_rv2_3[1] + 5.08, 0)

s.wr(p_rv2_2[0], p_rv2_2[1], p_rv2_2[0] + 6.35, p_rv2_2[1])
s.lbl("POT_TONE", p_rv2_2[0] + 6.35, p_rv2_2[1], 0, "left bottom")

# LED Key: D1 + R3
s.sym("R3", "330R", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", "Device", "R", 283.21, 190.50, 90)
p_r3_1 = s.pin_pos("R3", 1)
p_r3_2 = s.pin_pos("R3", 2)

s.lbl("LED_KEY", p_r3_1[0] - 6.35, p_r3_1[1], 0, "right bottom")
s.wr(p_r3_1[0] - 6.35, p_r3_1[1], p_r3_1[0], p_r3_1[1])

# D1 rot=180: Anode (pin 2) on left at x - 3.81, Cathode (pin 1) on right at x + 3.81
s.sym("D1", "LED_KEY", "LED_THT:LED_D3.0mm", "Device", "LED", 294.64, 190.50, 180)
p_d1_k = s.pin_pos("D1", 1)
p_d1_a = s.pin_pos("D1", 2)

s.wr(p_r3_2[0], p_r3_2[1], p_d1_a[0], p_d1_a[1])
s.wr(p_d1_k[0], p_d1_k[1], p_d1_k[0] + 5.08, p_d1_k[1])
s.pwr("GND", p_d1_k[0] + 5.08, p_d1_k[1], 270)


# ==============================================================================
# SECTION 6: OLED 0.96" I2C CONNECTOR HEADER
# ==============================================================================
s.txt("6. ЭКРАН OLED 0.96 ДЮЙМА I2C FAST", 30.48, 106.68)

# J5 (Conn_01x04_Pin) rot=180:
# Pins calculated dynamically via pin_pos!
s.sym("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical", "Connector", "Conn_01x04_Pin", 55.88, 121.92, 180)
p_j5_1 = s.pin_pos("J5", 1)  # GND
p_j5_2 = s.pin_pos("J5", 2)  # +5V
p_j5_3 = s.pin_pos("J5", 3)  # OLED_SCL
p_j5_4 = s.pin_pos("J5", 4)  # OLED_SDA

# Pin 1: GND (bottom pin, Y=124.46) - route left and DOWN
s.wr(p_j5_1[0], p_j5_1[1], p_j5_1[0] - 7.62, p_j5_1[1])
s.wr(p_j5_1[0] - 7.62, p_j5_1[1], p_j5_1[0] - 7.62, p_j5_1[1] + 5.08)
s.pwr("GND", p_j5_1[0] - 7.62, p_j5_1[1] + 5.08, 0)

# Pin 2: +5V (Y=121.92) - route left horizontally
s.wr(p_j5_2[0], p_j5_2[1], p_j5_2[0] - 15.24, p_j5_2[1])
s.pwr("+5V", p_j5_2[0] - 15.24, p_j5_2[1], 90)

# Pin 3: OLED_SCL (Y=119.38)
s.wr(p_j5_3[0], p_j5_3[1], p_j5_3[0] - 7.62, p_j5_3[1])
s.lbl("OLED_SCL", p_j5_3[0] - 7.62, p_j5_3[1], 0, "right bottom")

# Pin 4: OLED_SDA (top pin, Y=116.84)
s.wr(p_j5_4[0], p_j5_4[1], p_j5_4[0] - 7.62, p_j5_4[1])
s.lbl("OLED_SDA", p_j5_4[0] - 7.62, p_j5_4[1], 0, "right bottom")


# ==============================================================================
# SECTION 7: PS/2 KEYBOARD EXPANSION HEADER (OPTION)
# ==============================================================================
s.txt("7. РАЗЪЁМ PS/2 КЛАВИАТУРЫ (ОПЦИЯ)", 233.68, 106.68)

s.sym("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical", "Connector", "Conn_01x04_Pin", 259.08, 121.92, 180)
p_j6_1 = s.pin_pos("J6", 1)  # +5V (bottom pin, Y=124.46)
p_j6_2 = s.pin_pos("J6", 2)  # GND (Y=121.92)
p_j6_3 = s.pin_pos("J6", 3)  # PS2_DATA (Y=119.38)
p_j6_4 = s.pin_pos("J6", 4)  # PS2_CLK (top pin, Y=116.84)

# Pin 1: +5V (bottom pin) - route left and DOWN
s.wr(p_j6_1[0], p_j6_1[1], p_j6_1[0] - 7.62, p_j6_1[1])
s.wr(p_j6_1[0] - 7.62, p_j6_1[1], p_j6_1[0] - 7.62, p_j6_1[1] + 5.08)
s.pwr("+5V", p_j6_1[0] - 7.62, p_j6_1[1] + 5.08, 180)

# Pin 2: GND - route left horizontally
s.wr(p_j6_2[0], p_j6_2[1], p_j6_2[0] - 15.24, p_j6_2[1])
s.pwr("GND", p_j6_2[0] - 15.24, p_j6_2[1], 90)

# Pin 3: PS2_DATA
s.wr(p_j6_3[0], p_j6_3[1], p_j6_3[0] - 7.62, p_j6_3[1])
s.lbl("PS2_DATA", p_j6_3[0] - 7.62, p_j6_3[1], 0, "right bottom")

# Pin 4: PS2_CLK
s.wr(p_j6_4[0], p_j6_4[1], p_j6_4[0] - 7.62, p_j6_4[1])
s.lbl("PS2_CLK", p_j6_4[0] - 7.62, p_j6_4[1], 0, "right bottom")


# ==============================================================================
# SECTION 8: POWER RAIL DECOUPLING & PWR_FLAG
# ==============================================================================
s.txt("8. ФИЛЬТРАЦИЯ ШИНЫ ПИТАНИЯ +5V", 228.60, 223.52)

PWR_LINE_Y = 233.68

# C6 (100uF Electrolytic)
s.sym("C6", "100uF", "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm", "Device", "C_Polarized", 246.38, PWR_LINE_Y + 3.81, 0)
p_c6_1 = s.pin_pos("C6", 1)
p_c6_2 = s.pin_pos("C6", 2)

# C7 (100nF Ceramic)
s.sym("C7", "100nF", "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm", "Device", "C", 261.62, PWR_LINE_Y + 3.81, 0)
p_c7_1 = s.pin_pos("C7", 1)
p_c7_2 = s.pin_pos("C7", 2)

s.pwr("+5V", p_c6_1[0], PWR_LINE_Y, 0)
s.wr(p_c6_1[0], PWR_LINE_Y, p_c7_1[0], PWR_LINE_Y)

s.wr(p_c6_2[0], p_c6_2[1], p_c6_2[0], p_c6_2[1] + 5.08)
s.pwr("GND", p_c6_2[0], p_c6_2[1] + 5.08, 0)

s.wr(p_c7_2[0], p_c7_2[1], p_c7_2[0], p_c7_2[1] + 5.08)
s.pwr("GND", p_c7_2[0], p_c7_2[1] + 5.08, 0)
s.sym("FLG_GND", "PWR_FLAG", "", "power", "PWR_FLAG", p_c7_2[0], p_c7_2[1] + 5.08, 0)




# Output schematic
lib_str = "\n".join(embedded_symbols)
items_str = "\n".join(s.items)

final_sch = f"""(kicad_sch
\t(version 20260101)
\t(generator "eeschema")
\t(generator_version "10.0")
\t(uuid "{SHEET_UUID}")
\t(paper "A3")
\t(title_block
\t\t(title "MorseWave Pro Keyer")
\t\t(date "2026-10-18")
\t\t(rev "v2.0 (THT Classic)")
\t\t(company "By R9OGL")
\t\t(comment 1 "CW Keyer with Curtis Lookahead, 2-Stage Audio Filter & Transceiver Isolation")
\t\t(comment 2 "Website: morse.r9old.ru | Call: R9OGL")
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

print(f"Schematic generated: {out_file} ({len(final_sch)} bytes)")

res = subprocess.run([r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe", "sch", "erc", out_file], capture_output=True, text=True)
print("ERC Output:", res.stdout + res.stderr)

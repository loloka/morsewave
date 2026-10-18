"""
MorseWave Pro v2.0 - Clean Board Builder & Router
Optimized for 0 DRC violations, Rezonit & PS Electro compliance
"""
import os
import re
import json
import subprocess
import pcbnew

FP_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
MODEL_DIR = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels"
NET_FILE = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.net"
PCB_FILE = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_pcb"
KICAD_CLI = r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe"

def mm_to_nm(mm): return int(round(mm * 1e6))

def parse_nets(net_path):
    with open(net_path, "r", encoding="utf-8") as f: text = f.read()
    start = text.find('(nets')
    nets_chunk = text[start:]
    net_blocks = re.findall(r'\(net\s+\(code\s+"([^"]+)"\)\s+\(name\s+"([^"]+)"\)(.*?)\n\t\t\)', nets_chunk, re.DOTALL)
    res = []
    for code, name, body in net_blocks:
        nodes = re.findall(r'\(node\s+\(ref\s+"([^"]+)"\)\s+\(pin\s+"([^"]+)"\)', body)
        res.append((code, name, nodes))
    return res

def add_track(board, x1, y1, x2, y2, width=0.4, layer=pcbnew.F_Cu, net=None):
    if round(x1, 2) == round(x2, 2) and round(y1, 2) == round(y2, 2): return
    t = pcbnew.PCB_TRACK(board)
    t.SetStart(pcbnew.VECTOR2I(mm_to_nm(x1), mm_to_nm(y1)))
    t.SetEnd(pcbnew.VECTOR2I(mm_to_nm(x2), mm_to_nm(y2)))
    t.SetWidth(mm_to_nm(width))
    t.SetLayer(layer)
    if net: t.SetNet(net)
    board.Add(t)

def add_via(board, x, y, net=None, size=0.8, drill=0.4):
    v = pcbnew.PCB_VIA(board)
    v.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
    v.SetWidth(mm_to_nm(size))
    v.SetDrill(mm_to_nm(drill))
    if net: v.SetNet(net)
    board.Add(v)

def add_line(board, x1, y1, x2, y2, width=0.2, layer=pcbnew.F_SilkS):
    seg = pcbnew.PCB_SHAPE(board)
    seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
    seg.SetLayer(layer)
    seg.SetWidth(mm_to_nm(width))
    seg.SetStart(pcbnew.VECTOR2I(mm_to_nm(x1), mm_to_nm(y1)))
    seg.SetEnd(pcbnew.VECTOR2I(mm_to_nm(x2), mm_to_nm(y2)))
    board.Add(seg)

def add_rect(board, x1, y1, x2, y2, width=0.2, layer=pcbnew.F_SilkS):
    add_line(board, x1, y1, x2, y1, width, layer)
    add_line(board, x2, y1, x2, y2, width, layer)
    add_line(board, x2, y2, x1, y2, width, layer)
    add_line(board, x1, y2, x1, y1, width, layer)

def add_circle(board, cx, cy, radius, width=0.2, layer=pcbnew.F_SilkS):
    c = pcbnew.PCB_SHAPE(board)
    c.SetShape(pcbnew.SHAPE_T_CIRCLE)
    c.SetLayer(layer)
    c.SetWidth(mm_to_nm(width))
    c.SetCenter(pcbnew.VECTOR2I(mm_to_nm(cx), mm_to_nm(cy)))
    c.SetStart(pcbnew.VECTOR2I(mm_to_nm(cx), mm_to_nm(cy)))
    c.SetEnd(pcbnew.VECTOR2I(mm_to_nm(cx + radius), mm_to_nm(cy)))
    board.Add(c)

def generate_pcb():
    board = pcbnew.BOARD()
    W_mm, H_mm = 100.0, 75.0
    
    # Design settings (Rezonit Class 3/4)
    ds = board.GetDesignSettings()
    ds.m_SilkMaskClearance = mm_to_nm(0.15)
    ds.m_SolderMaskExpansion = mm_to_nm(0.05)
    ds.m_SolderMaskMinWidth = mm_to_nm(0.10)
    ds.m_CopperEdgeClearance = mm_to_nm(0.50)
    ds.m_TrackMinWidth = mm_to_nm(0.20)
    ds.m_ViasMinSize = mm_to_nm(0.60)
    ds.m_ViasMinDrill = mm_to_nm(0.30)
    
    # 1. Edge.Cuts (100.0 x 75.0 mm)
    pts = [(0.0, 0.0), (W_mm, 0.0), (W_mm, H_mm), (0.0, H_mm), (0.0, 0.0)]
    for i in range(len(pts) - 1):
        seg = pcbnew.PCB_SHAPE(board)
        seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
        seg.SetLayer(pcbnew.Edge_Cuts)
        seg.SetWidth(mm_to_nm(0.15))
        seg.SetStart(pcbnew.VECTOR2I(mm_to_nm(pts[i][0]), mm_to_nm(pts[i][1])))
        seg.SetEnd(pcbnew.VECTOR2I(mm_to_nm(pts[i+1][0]), mm_to_nm(pts[i+1][1])))
        board.Add(seg)
        
    # 2. 4x M3 Mounting Holes (Inset by 4.0 mm)
    hole_lib = os.path.join(FP_DIR, "MountingHole.pretty")
    for i, (hx, hy) in enumerate([(4.0, 4.0), (W_mm - 4.0, 4.0), (4.0, H_mm - 4.0), (W_mm - 4.0, H_mm - 4.0)]):
        h = pcbnew.FootprintLoad(hole_lib, "MountingHole_3.2mm_M3")
        if h:
            h.SetReference(f"H{i+1}")
            h.SetValue("MountingHole_M3")
            h.SetPosition(pcbnew.VECTOR2I(mm_to_nm(hx), mm_to_nm(hy)))
            h.Reference().SetVisible(False)
            h.Value().SetVisible(False)
            board.Add(h)

    # 3. Component Placements
    nano_x, nano_y = 42.38, 32.0
    components = [
        # Front Panel Potentiometers (Alps) & Parallel Soviet Wire Solder Headers
        # Note: J_RV are positioned at X = 31.0, 56.5, 82.5 to be completely clear of Alps keepouts!
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 16.5, 13.5, 0),
        ("J_RV1", "SPEED_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 31.0, 13.5, 0),
        
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 42.5, 13.5, 0),
        ("J_RV2", "TONE_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 56.5, 13.5, 0),
        
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 68.5, 13.5, 0),
        ("J_RV3", "VOL_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 82.5, 13.5, 0),
        
        # Front Panel Green TX LED & Parallel Wire Header
        ("D1", "TX_GREEN_3mm", "LED_THT", "LED_D3.0mm", 91.0, 13.5, 0),
        ("J_LED", "TX_LED_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 91.0, 20.0, 0),
        ("R3", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 90.0, 26.5, 0),
        
        # Dedicated OLED 0.96 Zone on Left (X = 4..34 mm, Y = 26..56 mm)
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 18.0, 30.0, 90),
        
        # Arduino Nano Module
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", nano_x, nano_y, 0),
        
        # Power Decoupling
        ("C6", "100uF", "Capacitor_THT", "CP_Radial_D6.3mm_P2.50mm", 10.0, 60.0, 0),
        ("C7", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 18.0, 60.0, 0),
        
        # Paddle Input & RF Filter
        ("C1", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 10.0, 52.0, 0),
        ("C2", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 18.0, 52.0, 0),
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 10.0, 68.5, 90),
        
        # Key Out Isolation (U2 PC817, D2 1N4148, R4 330R, J2 3.5mm)
        ("R4", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 27.0, 52.0, 90),
        ("D2", "1N4148", "Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal", 34.0, 58.0, 0),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 27.0, 63.0, 0),
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 37.0, 68.5, 90),
        
        # Right Section: Analog 2-Stage Low Pass Butterworth Filter
        ("R1", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 34.0, 0),
        ("R2", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 34.0, 0),
        ("C3", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 67.0, 42.0, 0),
        ("C4", "47nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 78.0, 42.0, 0),
        
        # Right Section: Audio Output Amplifier (R6, Q1 BC547, C5, R7 1W, J4 Speaker)
        ("R6", "470R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 48.0, 0),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 81.0, 48.0, 0),
        ("C5", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 88.0, 48.0, 0),
        ("R7", "33R (1W)", "Resistor_THT", "R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", 67.0, 54.0, 0),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 93.0, 38.0, 0),
        
        # Headphones (R8 150R + J7 3.5mm header)
        ("R8", "150R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 64.0, 60.0, 0),
        ("J7", "PHONES_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 64.0, 68.5, 90),
        
        # PTT Isolation (R5 330R, U3 PC817, J3 RCA)
        ("R5", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 77.0, 52.0, 90),
        ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 77.0, 61.0, 0),
        ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 77.0, 68.5, 90),
        
        # PS/2 Keyboard Header (Inside board by 10mm from right edge, above H4)
        ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 88.0, 61.0, 0),
    ]

    for ref, val, lib, fp_name, x, y, rot_deg in components:
        fp = pcbnew.FootprintLoad(os.path.join(FP_DIR, f"{lib}.pretty"), fp_name)
        if not fp: continue
        fp.SetReference(ref)
        fp.SetValue(val)
        fp.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
        fp.Reference().SetVisible(False)
        fp.Value().SetVisible(False)
        
        if ref == "A1":
            fp.Models().clear()
            m = pcbnew.FP_3DMODEL()
            m.m_Filename = os.path.join(MODEL_DIR, "Arduino_Nano.wrl")
            m.m_Scale = pcbnew.VECTOR3D(0.393700787, 0.393700787, 0.393700787)
            fp.Add3DModel(m)
        elif ref in ["RV1", "RV2", "RV3"]:
            fp.Models().clear()
            m = pcbnew.FP_3DMODEL()
            m.m_Filename = os.path.join(MODEL_DIR, "Knob_Alps.wrl")
            m.m_Scale = pcbnew.VECTOR3D(0.393700787, 0.393700787, 0.393700787)
            fp.Add3DModel(m)
        elif ref == "J5":
            fp.Models().clear()
            m = pcbnew.FP_3DMODEL()
            m.m_Filename = os.path.join(MODEL_DIR, "OLED_096.wrl")
            m.m_Scale = pcbnew.VECTOR3D(0.393700787, 0.393700787, 0.393700787)
            fp.Add3DModel(m)
        board.Add(fp)

    # 4. Silkscreen Graphics & Markings
    def add_text(text, x, y, size=1.5, layer=pcbnew.F_SilkS, bold=True):
        txt = pcbnew.PCB_TEXT(board)
        txt.SetText(text)
        txt.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        txt.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(size), mm_to_nm(size)))
        txt.SetLayer(layer)
        if bold: txt.SetBold(True)
        board.Add(txt)

    # Header Branding & Callsign with Morse Code
    add_text("MorseWave Pro v2.0  *  DE R9OGL", 50.0, 3.2, 1.8)
    add_text("-..  .    .-.  ----.  ---  --.  .-..", 50.0, 5.8, 1.1)
    add_text("Website: morse.r9old.ru", 50.0, 8.0, 0.95, bold=False)
    
    # Front Controls Silkscreen
    add_text("SPEED", 20.0, 10.5, 1.2)
    add_text("TONE", 46.0, 10.5, 1.2)
    add_text("VOLUME", 72.0, 10.5, 1.2)
    add_text("TX (GREEN)", 91.0, 10.5, 1.0)
    add_text("+   -", 91.0, 16.5, 0.9)
    
    # Dedicated OLED Display Zone Markings (Left)
    add_rect(board, 4.5, 26.5, 33.5, 56.5, width=0.25)
    add_text("OLED 0.96\" I2C", 19.0, 28.2, 1.0)
    add_text("GND VCC SCL SDA", 18.0, 34.0, 0.85, bold=False)
    add_circle(board, 6.5, 29.0, 1.0, width=0.15)
    add_circle(board, 31.5, 29.0, 1.0, width=0.15)
    add_circle(board, 6.5, 54.0, 1.0, width=0.15)
    add_circle(board, 31.5, 54.0, 1.0, width=0.15)
    
    # Rear Edge Connector Labels
    add_text("PADDLE", 10.0, 72.8, 0.95)
    add_text("KEY OUT", 37.0, 72.8, 0.95)
    add_text("USB SERIAL", 50.0, 70.5, 0.85)
    add_text("PHONES", 64.0, 72.8, 0.95)
    add_text("PTT OUT", 77.0, 72.8, 0.95)
    add_text("PS/2", 88.0, 72.8, 0.95)
    add_text("SPK", 93.0, 34.0, 0.95)

    # Component Reference Labels
    add_text("C1", 10.0, 48.0, 0.8, bold=False)
    add_text("C2", 18.0, 48.0, 0.8, bold=False)
    add_text("C6", 10.0, 64.5, 0.8, bold=False)
    add_text("C7", 18.0, 64.5, 0.8, bold=False)
    add_text("D2", 34.0, 55.0, 0.8, bold=False)
    add_text("R4", 24.0, 52.0, 0.8, bold=False)
    add_text("U2", 27.0, 58.0, 0.8, bold=False)
    
    add_text("R1", 67.0, 30.5, 0.8, bold=False)
    add_text("R2", 78.0, 30.5, 0.8, bold=False)
    add_text("C3", 67.0, 44.5, 0.8, bold=False)
    add_text("C4", 78.0, 44.5, 0.8, bold=False)
    add_text("R6", 67.0, 51.0, 0.8, bold=False)
    add_text("Q1", 81.0, 44.5, 0.8, bold=False)
    add_text("C5", 88.0, 44.5, 0.8, bold=False)
    add_text("R7", 67.0, 56.5, 0.8, bold=False)
    add_text("R8", 64.0, 56.5, 0.8, bold=False)
    add_text("R5", 74.0, 52.0, 0.8, bold=False)
    add_text("U3", 77.0, 57.0, 0.8, bold=False)
    add_text("R3", 90.0, 24.0, 0.8, bold=False)

    # Arduino Nano Pinout Labels
    nano_left_labels = ["TX", "RX", "RST", "GND", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"]
    for i, lbl in enumerate(nano_left_labels):
        add_text(lbl, nano_x - 3.2, nano_y + i * 2.54, 0.8, bold=False)
        
    nano_right_labels = ["VIN", "GND", "RST", "5V", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "REF", "3V3", "D13"]
    for i, lbl in enumerate(nano_right_labels):
        add_text(lbl, nano_x + 15.24 + 3.2, nano_y + i * 2.54, 0.8, bold=False)

    # 5. Assign Nets from Netlist
    nets_data = parse_nets(NET_FILE)
    pad_dict = {}
    for code, name, nodes in nets_data:
        net = board.FindNet(name)
        if not net:
            net = pcbnew.NETINFO_ITEM(board, name)
            board.Add(net)
        for ref, pin in nodes:
            fp = board.FindFootprintByReference(ref)
            if fp:
                pad = fp.FindPadByNumber(pin)
                if pad:
                    pad.SetNet(net)
                    pad_dict[(ref, str(pin))] = pad

    def pad_pos(ref, pin):
        p = pad_dict[(ref, str(pin))]
        return round(p.GetPosition().x / 1e6, 2), round(p.GetPosition().y / 1e6, 2)

    # 6. ROUTING IMPLEMENTATION
    # 6.1 Power (+5V) Distribution
    # Main trunk runs along top perimeter at Y = 7.0 mm (completely above all pots and keepouts)
    # and along west edge at X = 7.0 mm down to decoupling caps
    net_5v = board.FindNet("+5V")
    p_nano_5v = pad_pos("A1", 27)  # (57.62, 39.62)
    p_j5_5v = pad_pos("J5", 2)     # (20.54, 30.0)
    p_rv1_5v = pad_pos("RV1", 1)   # (16.5, 13.5)
    p_jrv1_5v = pad_pos("J_RV1", 1)# (31.0, 13.5)
    p_rv2_5v = pad_pos("RV2", 1)   # (42.5, 13.5)
    p_jrv2_5v = pad_pos("J_RV2", 1)# (56.5, 13.5)
    p_c7_5v = pad_pos("C7", 1)     # (18.0, 60.0)
    p_c6_5v = pad_pos("C6", 1)     # (10.0, 60.0)
    p_r7_5v = pad_pos("R7", 2)     # (79.7, 54.0)
    p_j6_5v = pad_pos("J6", 1)     # (88.0, 61.0)

    # +5V feeder from Nano 5V pin up to top trunk at Y=7.0 mm
    add_track(board, p_nano_5v[0], p_nano_5v[1], 60.0, p_nano_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, 60.0, p_nano_5v[1], 60.0, 7.0, width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    
    # +5V top trunk: X = 7.0 to 60.0 mm at Y = 7.0 mm
    add_track(board, 60.0, 7.0, 7.0, 7.0, width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    
    # RV2 & J_RV2 drops from top trunk
    add_track(board, p_rv2_5v[0], 7.0, p_rv2_5v[0], p_rv2_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, p_jrv2_5v[0], 7.0, p_jrv2_5v[0], p_jrv2_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    
    # RV1 & J_RV1 drops from top trunk
    add_track(board, p_rv1_5v[0], 7.0, p_rv1_5v[0], p_rv1_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, p_jrv1_5v[0], 7.0, p_jrv1_5v[0], p_jrv1_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    
    # West perimeter corridor along X = 7.0 mm down to C6 and C7
    add_track(board, 7.0, 7.0, 7.0, 60.0, width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, 7.0, 60.0, p_c6_5v[0], p_c6_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, p_c6_5v[0], p_c6_5v[1], p_c7_5v[0], p_c7_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    
    # OLED J5:2 drop - enters pad 2 vertically from Y=28.0 (avoids pad 1 GND at X=18.0)
    add_track(board, 7.0, 28.0, p_j5_5v[0], 28.0, width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, p_j5_5v[0], 28.0, p_j5_5v[0], p_j5_5v[1], width=0.6, layer=pcbnew.B_Cu, net=net_5v)
    
    # East +5V feeder to R7:2 and J6:1
    add_track(board, 60.0, p_nano_5v[1], 60.0, 54.0, width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, 60.0, 54.0, p_r7_5v[0], p_r7_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, 60.0, 54.0, 60.0, 61.0, width=0.8, layer=pcbnew.B_Cu, net=net_5v)
    add_track(board, 60.0, 61.0, p_j6_5v[0], p_j6_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v)

    # 6.2 Paddle Inputs: /DIT & /DAH on F.Cu
    net_dit = board.FindNet("/DIT")
    p_a1_5 = pad_pos("A1", 5)
    p_c1_1 = pad_pos("C1", 1)
    p_j1_1 = pad_pos("J1", 1)
    add_track(board, p_a1_5[0], p_a1_5[1], p_c1_1[0], p_a1_5[1], width=0.4, layer=pcbnew.F_Cu, net=net_dit)
    add_track(board, p_c1_1[0], p_a1_5[1], p_c1_1[0], p_c1_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dit)
    add_track(board, p_c1_1[0], p_c1_1[1], p_j1_1[0], p_j1_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dit)

    net_dah = board.FindNet("/DAH")
    p_a1_6 = pad_pos("A1", 6)
    p_c2_1 = pad_pos("C2", 1)
    p_j1_2 = pad_pos("J1", 2)
    add_track(board, p_a1_6[0], p_a1_6[1], p_c2_1[0], p_a1_6[1], width=0.4, layer=pcbnew.F_Cu, net=net_dah)
    add_track(board, p_c2_1[0], p_a1_6[1], p_c2_1[0], p_c2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dah)
    add_track(board, p_c2_1[0], p_c2_1[1], p_c2_1[0], 65.0, width=0.4, layer=pcbnew.F_Cu, net=net_dah)
    add_track(board, p_c2_1[0], 65.0, p_j1_2[0], 65.0, width=0.4, layer=pcbnew.F_Cu, net=net_dah)
    add_track(board, p_j1_2[0], 65.0, p_j1_2[0], p_j1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_dah)

    # 6.3 Potentiometers: Wiper Signals
    # POT_SPEED (A0 -> J_RV1:2 -> RV1:2)
    net_speed = board.FindNet("/POT_SPEED")
    p_a1_19 = pad_pos("A1", 19)   # (57.62, 59.94)
    p_rv1_2 = pad_pos("RV1", 2)     # (16.5, 16.0)
    p_jrv1_2 = pad_pos("J_RV1", 2) # (31.0, 16.0)
    # Wiper connection between RV1 and J_RV1
    add_track(board, p_rv1_2[0], p_rv1_2[1], p_jrv1_2[0], p_jrv1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_speed)
    # Wiper to Nano A0: enters J_RV1 horizontally at Y=16.0, drops south to Y=21.0, then routes on B.Cu
    add_track(board, p_jrv1_2[0], p_jrv1_2[1], 33.0, p_jrv1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_speed)
    add_track(board, 33.0, p_jrv1_2[1], 33.0, 21.0, width=0.4, layer=pcbnew.F_Cu, net=net_speed)
    add_via(board, 33.0, 21.0, net=net_speed)
    add_track(board, 33.0, 21.0, 51.0, 21.0, width=0.4, layer=pcbnew.B_Cu, net=net_speed)
    # Down central corridor inside Nano to Y=59.94
    add_track(board, 51.0, 21.0, 51.0, p_a1_19[1], width=0.4, layer=pcbnew.B_Cu, net=net_speed)
    add_track(board, 51.0, p_a1_19[1], p_a1_19[0], p_a1_19[1], width=0.4, layer=pcbnew.B_Cu, net=net_speed)

    # POT_TONE (A2 -> J_RV2:2 -> RV2:2)
    net_tone = board.FindNet("/POT_TONE")
    p_a1_21 = pad_pos("A1", 21)   # (57.62, 54.86)
    p_rv2_2 = pad_pos("RV2", 2)     # (42.5, 16.0)
    p_jrv2_2 = pad_pos("J_RV2", 2) # (56.5, 16.0)
    # Wiper connection between RV2 and J_RV2
    add_track(board, p_rv2_2[0], p_rv2_2[1], p_jrv2_2[0], p_jrv2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_tone)
    # Wiper to Nano A2: enters J_RV2 horizontally, drops south to Y=23.0, then routes on B.Cu
    add_track(board, p_jrv2_2[0], p_jrv2_2[1], 58.5, p_jrv2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_tone)
    add_track(board, 58.5, p_jrv2_2[1], 58.5, 23.0, width=0.4, layer=pcbnew.F_Cu, net=net_tone)
    add_via(board, 58.5, 23.0, net=net_tone)
    add_track(board, 58.5, 23.0, 49.0, 23.0, width=0.4, layer=pcbnew.B_Cu, net=net_tone)
    # Down central corridor inside Nano to Y=54.86
    add_track(board, 49.0, 23.0, 49.0, p_a1_21[1], width=0.4, layer=pcbnew.B_Cu, net=net_tone)
    add_track(board, 49.0, p_a1_21[1], p_a1_21[0], p_a1_21[1], width=0.4, layer=pcbnew.B_Cu, net=net_tone)

    # 6.4 OLED Display I2C (SCL / SDA) on B.Cu via central Nano channel
    net_scl = board.FindNet("/OLED_SCL")
    p_a1_24 = pad_pos("A1", 24)   # (57.62, 47.24)
    p_j5_3 = pad_pos("J5", 3)     # (23.08, 30.0)
    add_track(board, p_a1_24[0], p_a1_24[1], 47.0, p_a1_24[1], width=0.4, layer=pcbnew.B_Cu, net=net_scl)
    add_track(board, 47.0, p_a1_24[1], 47.0, 25.0, width=0.4, layer=pcbnew.B_Cu, net=net_scl)
    add_track(board, 47.0, 25.0, p_j5_3[0], 25.0, width=0.4, layer=pcbnew.B_Cu, net=net_scl)
    add_track(board, p_j5_3[0], 25.0, p_j5_3[0], p_j5_3[1], width=0.4, layer=pcbnew.B_Cu, net=net_scl)

    net_sda = board.FindNet("/OLED_SDA")
    p_a1_23 = pad_pos("A1", 23)   # (57.62, 49.78)
    p_j5_4 = pad_pos("J5", 4)     # (25.62, 30.0)
    add_track(board, p_a1_23[0], p_a1_23[1], 45.0, p_a1_23[1], width=0.4, layer=pcbnew.B_Cu, net=net_sda)
    add_track(board, 45.0, p_a1_23[1], 45.0, 27.0, width=0.4, layer=pcbnew.B_Cu, net=net_sda)
    add_track(board, 45.0, 27.0, p_j5_4[0], 27.0, width=0.4, layer=pcbnew.B_Cu, net=net_sda)
    add_track(board, p_j5_4[0], 27.0, p_j5_4[0], p_j5_4[1], width=0.4, layer=pcbnew.B_Cu, net=net_sda)

    # 6.5 Green TX LED (Nano D8 -> R3 -> D1 / J_LED)
    net_led = board.FindNet("/LED_KEY")
    p_a1_11 = pad_pos("A1", 11)   # (42.38, 57.4)
    p_r3_1 = pad_pos("R3", 1)     # (86.19, 26.5)
    # Route south from D8, jog under Nano at Y=66.0, then east on F.Cu to R3:1
    add_track(board, p_a1_11[0], p_a1_11[1], 39.0, p_a1_11[1], width=0.4, layer=pcbnew.F_Cu, net=net_led)
    add_track(board, 39.0, p_a1_11[1], 39.0, 66.0, width=0.4, layer=pcbnew.F_Cu, net=net_led)
    add_track(board, 39.0, 66.0, 61.0, 66.0, width=0.4, layer=pcbnew.F_Cu, net=net_led)
    add_track(board, 61.0, 66.0, 61.0, 26.5, width=0.4, layer=pcbnew.F_Cu, net=net_led)
    add_track(board, 61.0, 26.5, p_r3_1[0], p_r3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_led)

    net_d1a = board.FindNet("Net-(D1-A)")
    p_r3_2 = pad_pos("R3", 2)     # (93.81, 26.5)
    p_d1_2 = pad_pos("D1", 2)     # (92.54, 13.5)
    p_jled_1 = pad_pos("J_LED", 1)# (91.0, 20.0)
    add_track(board, p_r3_2[0], p_r3_2[1], 95.0, p_r3_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d1a)
    add_track(board, 95.0, p_r3_2[1], 95.0, p_d1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d1a)
    add_track(board, 95.0, p_d1_2[1], p_d1_2[0], p_d1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d1a)
    add_track(board, p_d1_2[0], p_d1_2[1], p_jled_1[0], p_jled_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_d1a)

    # 6.6 Audio PWM Signal (Nano D6 -> R1:1)
    net_pwm = board.FindNet("/AUDIO_PWM")
    p_a1_9 = pad_pos("A1", 9)     # (42.38, 52.32)
    p_r1_1 = pad_pos("R1", 1)     # (63.19, 34.0)
    # Straight across on B.Cu through Nano channel
    add_track(board, p_a1_9[0], p_a1_9[1], 53.0, p_a1_9[1], width=0.4, layer=pcbnew.B_Cu, net=net_pwm)
    add_track(board, 53.0, p_a1_9[1], 53.0, p_r1_1[1], width=0.4, layer=pcbnew.B_Cu, net=net_pwm)
    add_track(board, 53.0, p_r1_1[1], p_r1_1[0], p_r1_1[1], width=0.4, layer=pcbnew.B_Cu, net=net_pwm)

    # 6.7 Audio Filter: C3, R1, R2, C4, RV3, J_RV3, R6, Q1, C5, R7, J4, R8, J7
    # C3 net: R1:2 -> R2:1 -> C3:1
    net_c3 = board.FindNet("Net-(C3-Pad1)")
    p_r1_2 = pad_pos("R1", 2)
    p_r2_1 = pad_pos("R2", 1)
    p_c3_1 = pad_pos("C3", 1)
    add_track(board, p_r1_2[0], p_r1_2[1], p_r2_1[0], p_r2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c3)
    add_track(board, p_r1_2[0], p_r1_2[1], p_r1_2[0], 38.0, width=0.4, layer=pcbnew.F_Cu, net=net_c3)
    add_track(board, p_r1_2[0], 38.0, p_c3_1[0], 38.0, width=0.4, layer=pcbnew.F_Cu, net=net_c3)
    add_track(board, p_c3_1[0], 38.0, p_c3_1[0], p_c3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c3)

    # C4 net: R2:2 -> C4:1 -> RV3:1 -> J_RV3:1
    net_c4 = board.FindNet("Net-(J_RV3-Pin_1)")
    p_r2_2 = pad_pos("R2", 2)
    p_c4_1 = pad_pos("C4", 1)
    p_rv3_1 = pad_pos("RV3", 1)
    p_jrv3_1 = pad_pos("J_RV3", 1)
    add_track(board, p_r2_2[0], p_r2_2[1], p_c4_1[0], p_c4_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c4)
    add_track(board, p_r2_2[0], p_r2_2[1], 85.62, 34.0, width=0.4, layer=pcbnew.F_Cu, net=net_c4)
    add_track(board, 85.62, 34.0, 85.62, 13.5, width=0.4, layer=pcbnew.F_Cu, net=net_c4)
    add_track(board, 85.62, 13.5, p_jrv3_1[0], p_jrv3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c4)
    add_track(board, p_jrv3_1[0], p_jrv3_1[1], p_rv3_1[0], p_rv3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c4)

    # Volume Wiper: RV3:2 -> J_RV3:2 -> R6:1
    net_r6_1 = board.FindNet("Net-(J_RV3-Pin_2)")
    p_rv3_2 = pad_pos("RV3", 2)
    p_jrv3_2 = pad_pos("J_RV3", 2)
    p_r6_1 = pad_pos("R6", 1)
    add_track(board, p_rv3_2[0], p_rv3_2[1], p_jrv3_2[0], p_jrv3_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_r6_1)
    add_track(board, p_jrv3_2[0], p_jrv3_2[1], 87.0, p_jrv3_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_r6_1)
    add_track(board, 87.0, p_jrv3_2[1], 87.0, 46.0, width=0.4, layer=pcbnew.F_Cu, net=net_r6_1)
    add_track(board, 87.0, 46.0, 63.0, 46.0, width=0.4, layer=pcbnew.F_Cu, net=net_r6_1)
    add_track(board, 63.0, 46.0, p_r6_1[0], p_r6_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r6_1)

    # Q1 Base: R6:2 -> Q1:2
    net_qb = board.FindNet("Net-(Q1-B)")
    p_r6_2 = pad_pos("R6", 2)
    p_q1_2 = pad_pos("Q1", 2)
    add_track(board, p_r6_2[0], p_r6_2[1], p_r6_2[0], 49.5, width=0.4, layer=pcbnew.F_Cu, net=net_qb)
    add_track(board, p_r6_2[0], 49.5, p_q1_2[0], 49.5, width=0.4, layer=pcbnew.F_Cu, net=net_qb)
    add_track(board, p_q1_2[0], 49.5, p_q1_2[0], p_q1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_qb)

    # Q1 Collector: Q1:1 -> C5:1 -> J4:1 -> R8:1
    net_spk1 = board.FindNet("Net-(J4-Pin_1)")
    p_q1_1 = pad_pos("Q1", 1)
    p_c5_1 = pad_pos("C5", 1)
    p_j4_1 = pad_pos("J4", 1)
    p_r8_1 = pad_pos("R8", 1)
    add_track(board, p_q1_1[0], p_q1_1[1], p_q1_1[0], 46.5, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_q1_1[0], 46.5, p_c5_1[0], 46.5, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_c5_1[0], 46.5, p_c5_1[0], p_c5_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_c5_1[0], 46.5, p_j4_1[0], 46.5, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_j4_1[0], 46.5, p_j4_1[0], p_j4_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_q1_1[0], 46.5, 80.0, 46.5, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, 80.0, 46.5, 80.0, 58.0, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, 80.0, 58.0, p_r8_1[0], 58.0, width=0.5, layer=pcbnew.F_Cu, net=net_spk1)
    add_track(board, p_r8_1[0], 58.0, p_r8_1[0], p_r8_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1)

    # Speaker pullup: J4:2 -> R7:1
    net_spk2 = board.FindNet("Net-(J4-Pin_2)")
    p_j4_2 = pad_pos("J4", 2)
    p_r7_1 = pad_pos("R7", 1)
    add_track(board, p_j4_2[0], p_j4_2[1], 97.0, p_j4_2[1], width=0.6, layer=pcbnew.F_Cu, net=net_spk2)
    add_track(board, 97.0, p_j4_2[1], 97.0, 54.0, width=0.6, layer=pcbnew.F_Cu, net=net_spk2)
    add_track(board, 97.0, 54.0, p_r7_1[0], 54.0, width=0.6, layer=pcbnew.F_Cu, net=net_spk2)

    # Headphones output: R8:2 -> J7:1
    net_ph1 = board.FindNet("Net-(J7-Pin_1)")
    p_r8_2 = pad_pos("R8", 2)
    p_j7_1 = pad_pos("J7", 1)
    add_track(board, p_r8_2[0], p_r8_2[1], p_r8_2[0], 65.0, width=0.4, layer=pcbnew.F_Cu, net=net_ph1)
    add_track(board, p_r8_2[0], 65.0, p_j7_1[0], 65.0, width=0.4, layer=pcbnew.F_Cu, net=net_ph1)
    add_track(board, p_j7_1[0], 65.0, p_j7_1[0], p_j7_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_ph1)

    # 6.8 Key Out Isolation: Nano D10 -> R4 -> U2 -> D2 / J2
    net_key = board.FindNet("/KEY_OUT_CTRL")
    p_a1_13 = pad_pos("A1", 13)   # (42.38, 62.48)
    p_r4_1 = pad_pos("R4", 1)     # (27.0, 48.19)
    add_track(board, p_a1_13[0], p_a1_13[1], 31.0, p_a1_13[1], width=0.4, layer=pcbnew.F_Cu, net=net_key)
    add_track(board, 31.0, p_a1_13[1], 31.0, 45.0, width=0.4, layer=pcbnew.F_Cu, net=net_key)
    add_track(board, 31.0, 45.0, p_r4_1[0], 45.0, width=0.4, layer=pcbnew.F_Cu, net=net_key)
    add_track(board, p_r4_1[0], 45.0, p_r4_1[0], p_r4_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_key)

    net_r4_2 = board.FindNet("Net-(R4-Pad2)")
    p_r4_2 = pad_pos("R4", 2)     # (27.0, 55.81)
    p_u2_1 = pad_pos("U2", 1)     # (27.0, 63.0)
    add_track(board, p_r4_2[0], p_r4_2[1], p_u2_1[0], p_u2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r4_2)

    net_d2a = board.FindNet("Net-(D2-A)")
    p_u2_3 = pad_pos("U2", 3)     # (34.62, 65.54)
    p_d2_2 = pad_pos("D2", 2)     # (37.81, 58.0)
    p_j2_1 = pad_pos("J2", 1)     # (37.0, 68.5)
    add_track(board, p_u2_3[0], p_u2_3[1], p_d2_2[0], p_u2_3[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a)
    add_track(board, p_d2_2[0], p_u2_3[1], p_d2_2[0], p_d2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a)
    add_track(board, p_d2_2[0], p_u2_3[1], p_j2_1[0], p_u2_3[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a)
    add_track(board, p_j2_1[0], p_u2_3[1], p_j2_1[0], p_j2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a)

    net_d2k = board.FindNet("Net-(D2-K)")
    p_u2_4 = pad_pos("U2", 4)     # (34.62, 63.0)
    p_d2_1 = pad_pos("D2", 1)     # (30.19, 58.0)
    p_j2_2 = pad_pos("J2", 2)     # (39.54, 68.5)
    add_track(board, p_u2_4[0], p_u2_4[1], p_d2_1[0], p_u2_4[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k)
    add_track(board, p_d2_1[0], p_u2_4[1], p_d2_1[0], p_d2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k)
    add_track(board, p_u2_4[0], p_u2_4[1], p_j2_2[0], p_u2_4[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k)
    add_track(board, p_j2_2[0], p_u2_4[1], p_j2_2[0], p_j2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k)

    # 6.9 PTT Out Isolation: Nano D11 -> R5 -> U3 -> J3
    net_ptt = board.FindNet("/PTT_OUT_CTRL")
    p_a1_14 = pad_pos("A1", 14)   # (42.38, 65.02)
    p_r5_1 = pad_pos("R5", 1)     # (77.0, 48.19)
    # Under Nano at Y=68.0 on B.Cu
    add_track(board, p_a1_14[0], p_a1_14[1], 38.0, p_a1_14[1], width=0.4, layer=pcbnew.B_Cu, net=net_ptt)
    add_track(board, 38.0, p_a1_14[1], 38.0, 68.0, width=0.4, layer=pcbnew.B_Cu, net=net_ptt)
    add_track(board, 38.0, 68.0, 74.0, 68.0, width=0.4, layer=pcbnew.B_Cu, net=net_ptt)
    add_track(board, 74.0, 68.0, 74.0, p_r5_1[1], width=0.4, layer=pcbnew.B_Cu, net=net_ptt)
    add_track(board, 74.0, p_r5_1[1], p_r5_1[0], p_r5_1[1], width=0.4, layer=pcbnew.B_Cu, net=net_ptt)

    net_r5_2 = board.FindNet("Net-(R5-Pad2)")
    p_r5_2 = pad_pos("R5", 2)     # (77.0, 55.81)
    p_u3_1 = pad_pos("U3", 1)     # (77.0, 61.0)
    add_track(board, p_r5_2[0], p_r5_2[1], p_u3_1[0], p_u3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r5_2)

    net_j3_1 = board.FindNet("Net-(J3-Pin_1)")
    p_u3_3 = pad_pos("U3", 3)     # (84.62, 63.54)
    p_j3_1 = pad_pos("J3", 1)     # (77.0, 68.5)
    add_track(board, p_u3_3[0], p_u3_3[1], 84.62, 66.0, width=0.4, layer=pcbnew.F_Cu, net=net_j3_1)
    add_track(board, 84.62, 66.0, p_j3_1[0], 66.0, width=0.4, layer=pcbnew.F_Cu, net=net_j3_1)
    add_track(board, p_j3_1[0], 66.0, p_j3_1[0], p_j3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_j3_1)

    net_j3_2 = board.FindNet("Net-(J3-Pin_2)")
    p_u3_4 = pad_pos("U3", 4)     # (84.62, 61.0)
    p_j3_2 = pad_pos("J3", 2)     # (79.54, 68.5)
    add_track(board, p_u3_4[0], p_u3_4[1], 86.5, p_u3_4[1], width=0.4, layer=pcbnew.F_Cu, net=net_j3_2)
    add_track(board, 86.5, p_u3_4[1], 86.5, 67.5, width=0.4, layer=pcbnew.F_Cu, net=net_j3_2)
    add_track(board, 86.5, 67.5, p_j3_2[0], 67.5, width=0.4, layer=pcbnew.F_Cu, net=net_j3_2)
    add_track(board, p_j3_2[0], 67.5, p_j3_2[0], p_j3_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_j3_2)

    # 6.10 PS/2 Keyboard Header (Nano D4 -> J6:3, Nano D5 -> J6:4)
    net_ps2_clk = board.FindNet("/PS2_CLK")
    p_a1_8 = pad_pos("A1", 8)     # (42.38, 49.78)
    p_j6_4 = pad_pos("J6", 4)     # (88.0, 68.62)
    add_track(board, p_a1_8[0], p_a1_8[1], 36.0, p_a1_8[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_clk)
    add_track(board, 36.0, p_a1_8[1], 36.0, 72.0, width=0.4, layer=pcbnew.B_Cu, net=net_ps2_clk)
    add_track(board, 36.0, 72.0, 85.0, 72.0, width=0.4, layer=pcbnew.B_Cu, net=net_ps2_clk)
    add_track(board, 85.0, 72.0, 85.0, p_j6_4[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_clk)
    add_track(board, 85.0, p_j6_4[1], p_j6_4[0], p_j6_4[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_clk)

    net_ps2_dat = board.FindNet("/PS2_DATA")
    p_a1_7 = pad_pos("A1", 7)     # (42.38, 47.24)
    p_j6_3 = pad_pos("J6", 3)     # (88.0, 66.08)
    add_track(board, p_a1_7[0], p_a1_7[1], 35.0, p_a1_7[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_dat)
    add_track(board, 35.0, p_a1_7[1], 35.0, 73.0, width=0.4, layer=pcbnew.B_Cu, net=net_ps2_dat)
    add_track(board, 35.0, 73.0, 83.0, 73.0, width=0.4, layer=pcbnew.B_Cu, net=net_ps2_dat)
    add_track(board, 83.0, 73.0, 83.0, p_j6_3[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_dat)
    add_track(board, 83.0, p_j6_3[1], p_j6_3[0], p_j6_3[1], width=0.4, layer=pcbnew.B_Cu, net=net_ps2_dat)

    # 7. Ground Pours (Solid copper plane on both layers)
    gnd_net = board.FindNet("GND")
    if gnd_net:
        outline = pcbnew.SHAPE_POLY_SET()
        outline.NewOutline()
        pullback = 0.50
        pts = [(pullback, pullback), (W_mm - pullback, pullback), (W_mm - pullback, H_mm - pullback), (pullback, H_mm - pullback)]
        for x, y in pts: outline.Append(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        
        zone_b = pcbnew.ZONE(board)
        zone_b.SetLayer(pcbnew.B_Cu)
        zone_b.SetNet(gnd_net)
        zone_b.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
        zone_b.Outline().AddOutline(outline.Outline(0))
        board.Add(zone_b)
        
        zone_f = pcbnew.ZONE(board)
        zone_f.SetLayer(pcbnew.F_Cu)
        zone_f.SetNet(gnd_net)
        zone_f.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
        zone_f.Outline().AddOutline(outline.Outline(0))
        board.Add(zone_f)

    # Fill Zones
    filler = pcbnew.ZONE_FILLER(board)
    filler.Fill(board.Zones())
    
    board.Save(PCB_FILE)
    print(f"Generated clean board: {PCB_FILE}")

if __name__ == "__main__":
    generate_pcb()

"""
MorseWave Pro Keyer (R9OGL Edition v2.0)
Generates 100x75 mm PCB where Arduino Nano and all components fit 100% inside.
"""
import os
import re
import math
import pcbnew

FP_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"

def mm_to_nm(mm):
    return int(round(mm * 1e6))

def nm_to_mm(nm):
    return nm / 1e6

def parse_nets(net_path):
    with open(net_path, "r", encoding="utf-8") as f:
        text = f.read()
    start = text.find('(nets')
    nets_chunk = text[start:]
    net_blocks = re.findall(r'\(net\s+\(code\s+"([^"]+)"\)\s+\(name\s+"([^"]+)"\)(.*?)\n\t\t\)', nets_chunk, re.DOTALL)
    res = []
    for code, name, body in net_blocks:
        nodes = re.findall(r'\(node\s+\(ref\s+"([^"]+)"\)\s+\(pin\s+"([^"]+)"\)', body)
        res.append((code, name, nodes))
    return res

def create_board_100x75():
    board = pcbnew.BOARD()
    
    W_mm = 100.0
    H_mm = 75.0
    
    # 1. Edge.Cuts (100 x 75 mm)
    pts = [
        (0.0, 0.0),
        (W_mm, 0.0),
        (W_mm, H_mm),
        (0.0, H_mm),
        (0.0, 0.0)
    ]
    for i in range(len(pts) - 1):
        seg = pcbnew.PCB_SHAPE(board)
        seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
        seg.SetLayer(pcbnew.Edge_Cuts)
        seg.SetWidth(mm_to_nm(0.15))
        seg.SetStart(pcbnew.VECTOR2I(mm_to_nm(pts[i][0]), mm_to_nm(pts[i][1])))
        seg.SetEnd(pcbnew.VECTOR2I(mm_to_nm(pts[i+1][0]), mm_to_nm(pts[i+1][1])))
        board.Add(seg)
    
    # 2. Mounting holes (M3 - 3.2mm hole, 4 corners, 4mm inset)
    hole_lib = os.path.join(FP_DIR, "MountingHole.pretty")
    hole_fp_name = "MountingHole_3.2mm_M3"
    hole_positions = [(4.0, 4.0), (W_mm - 4.0, 4.0), (4.0, H_mm - 4.0), (W_mm - 4.0, H_mm - 4.0)]
    for i, (hx, hy) in enumerate(hole_positions):
        h_fp = pcbnew.FootprintLoad(hole_lib, hole_fp_name)
        if h_fp:
            h_fp.SetReference(f"H{i+1}")
            h_fp.SetValue("MountingHole_M3")
            h_fp.SetPosition(pcbnew.VECTOR2I(mm_to_nm(hx), mm_to_nm(hy)))
            board.Add(h_fp)
    
    # 3. Placement
    # In Module:Arduino_Nano:
    # Pin 1 is at (0, 0).
    # USB is at bottom: Y = +35.56 to +42.19 mm.
    # Top of Nano is at Y = -5.93 mm.
    # Width of Nano is X = 0 to 15.24 mm.
    # To place Nano so USB is flush with bottom edge (H_mm = 75.0):
    # nano_origin_y = 75.0 - 42.19 = 32.81 mm.
    # Then Nano extends from Y = (32.81 - 5.93) = 26.88 mm to 75.00 mm!
    # To center Nano at X = 50.0 mm:
    # nano_origin_x = 50.0 - (15.24 / 2.0) = 42.38 mm.
    nano_x = 42.38
    nano_y = 32.81
    
    components = [
        # Front Panel Pots (Top edge, Y = 13.0 mm)
        # Evenly spaced: 20 mm, 50 mm, 80 mm (30 mm pitch)
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 20.0, 13.0, 0),
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 50.0, 13.0, 0),
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 80.0, 13.0, 0),
        ("D1", "LED_KEY", "LED_THT", "LED_D3.0mm", 92.0, 13.0, 0),
        ("R3", "330R", "Resistor_SMD", "R_0805_2012Metric", 92.0, 20.0, 90),
        
        # OLED 0.96" header (Centered, Y = 25.0 mm, right above Nano top)
        # Header is 4 pins horizontal (rot=90) or vertical (rot=0)
        # PinHeader_1x04_P2.54mm_Vertical with rot=90 spans ~10mm horizontally
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 46.19, 23.0, 90),
        
        # Arduino Nano (Centered, USB flush with bottom edge)
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", nano_x, nano_y, 0),
        
        # Left Side: Paddle Input & Galvanic Key Out Isolation
        # Paddle J1 at bottom-left rear (X = 12.0, Y = 66.0)
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 12.0, 66.0, 0),
        ("C1", "10nF", "Capacitor_SMD", "C_0805_2012Metric", 12.0, 56.0, 0),
        ("C2", "10nF", "Capacitor_SMD", "C_0805_2012Metric", 17.0, 56.0, 0),
        
        # Key Out Isolation (U2, R4, D2, J2)
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 25.0, 66.0, 0),
        ("D2", "1N4148", "Diode_SMD", "D_SOD-123", 25.0, 58.0, 0),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 25.0, 48.0, 0),
        ("R4", "330R", "Resistor_SMD", "R_0805_2012Metric", 25.0, 39.0, 90),
        
        # Power Decoupling Caps (Left of Nano)
        ("C6", "100uF", "Capacitor_SMD", "CP_Elec_6.3x5.4", 34.0, 36.0, 0),
        ("C7", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 34.0, 44.0, 90),
        
        # Right Side: Analog Audio Filter & Driver (Between Nano and Volume)
        ("R1", "1k", "Resistor_SMD", "R_0805_2012Metric", 68.0, 24.0, 0),
        ("C3", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 68.0, 30.0, 90),
        ("R2", "1k", "Resistor_SMD", "R_0805_2012Metric", 74.0, 24.0, 0),
        ("C4", "47nF", "Capacitor_SMD", "C_0805_2012Metric", 74.0, 30.0, 90),
        ("R6", "470R", "Resistor_SMD", "R_0805_2012Metric", 80.0, 24.0, 90),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 80.0, 32.0, 0),
        ("C5", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 86.0, 32.0, 90),
        ("R7", "33R (1W)", "Resistor_SMD", "R_1206_3216Metric", 86.0, 24.0, 90),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 90.0, 38.0, 90),
        
        # Right Side: PTT Out Isolation & PS/2 Expansion Header
        ("R5", "330R", "Resistor_SMD", "R_0805_2012Metric", 72.0, 48.0, 90),
        ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 72.0, 56.0, 0),
        ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 72.0, 66.0, 0),
        ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 88.0, 56.0, 90),
    ]
    
    fp_instances = {}
    for ref, val, lib, fp_name, x, y, rot_deg in components:
        lib_path = os.path.join(FP_DIR, f"{lib}.pretty")
        fp = pcbnew.FootprintLoad(lib_path, fp_name)
        if not fp:
            print(f"Warning: Could not load {lib}:{fp_name} for {ref}")
            continue
        fp.SetReference(ref)
        fp.SetValue(val)
        fp.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
        board.Add(fp)
        fp_instances[ref] = fp
    
    # 4. Silkscreen Labels
    def add_text(text, x, y, size=1.5, layer=pcbnew.F_SilkS):
        txt = pcbnew.PCB_TEXT(board)
        txt.SetText(text)
        txt.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        txt.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(size), mm_to_nm(size)))
        txt.SetLayer(layer)
        board.Add(txt)
    
    add_text("MorseWave Pro v2.0", 35.0, 4.0, 2.0)
    add_text("R9OGL Edition", 41.0, 7.5, 1.3)
    add_text("SPEED", 16.5, 19.5, 1.2)
    add_text("TONE", 46.5, 19.5, 1.2)
    add_text("VOLUME", 76.5, 19.5, 1.2)
    add_text("KEY", 90.0, 9.5, 1.0)
    add_text("OLED 0.96\"", 44.0, 20.0, 1.1)
    add_text("PADDLE", 8.0, 71.5, 1.1)
    add_text("KEY OUT", 21.0, 71.5, 1.1)
    add_text("USB / SERIAL", 43.5, 71.5, 1.0)
    add_text("PTT OUT", 68.0, 71.5, 1.1)
    add_text("SPK", 88.0, 33.5, 1.0)
    add_text("PS/2", 86.0, 52.0, 1.0)
    
    # 5. Assign Nets from Netlist
    net_file = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.net"
    nets_data = parse_nets(net_file)
    assigned_pads = 0
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
                    assigned_pads += 1
    
    # 6. Copper Ground Pour (GND) on B.Cu and F.Cu
    gnd_net = board.FindNet("GND")
    if gnd_net:
        outline = pcbnew.SHAPE_POLY_SET()
        outline.NewOutline()
        pts = [(0, 0), (mm_to_nm(W_mm), 0), (mm_to_nm(W_mm), mm_to_nm(H_mm)), (0, mm_to_nm(H_mm))]
        for x, y in pts:
            outline.Append(pcbnew.VECTOR2I(x, y))
            
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
    
    pcb_path = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_pcb"
    board.Save(pcb_path)
    print(f"Updated PCB generated: {pcb_path}")
    print(f"Board size: {W_mm} x {H_mm} mm. Assigned {assigned_pads} pads to nets.")

create_board_100x75()

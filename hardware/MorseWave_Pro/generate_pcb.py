"""
MorseWave Pro Keyer (R9OGL Edition v2.0)
100% Through-Hole (THT) Classic Edition PCB Generator
Board size: 100.0 x 75.0 mm
Zero SMD - all components are classic through-hole parts (resistors, ceramic caps, DIP-4, TO-92, etc.)
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

def create_board_tht():
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
    
    # 2. Mounting holes (M3, 4 corners, 4mm inset)
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
    
    # 3. Component placement
    # Arduino Nano placement: centered at X=50mm, USB flush with bottom edge
    nano_x = 42.38
    nano_y = 32.81
    
    components = [
        # Front Panel Pots (Top edge, Y = 13.0 mm)
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 20.0, 13.0, 0),
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 50.0, 13.0, 0),
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 80.0, 13.0, 0),
        ("D1", "LED_KEY", "LED_THT", "LED_D3.0mm", 93.0, 13.0, 0),
        ("R3", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 93.0, 22.0, 90),
        
        # OLED 0.96" header (Centered, Y = 23.0 mm)
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 46.19, 23.0, 90),
        
        # Arduino Nano (Centered, USB flush with bottom edge)
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", nano_x, nano_y, 0),
        
        # Left Side: Paddle Input & RF Filter (Classic Ceramic Discs)
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 12.0, 66.0, 0),
        ("C1", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 12.0, 56.0, 0),
        ("C2", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 18.0, 56.0, 0),
        
        # Key Out Isolation (PC817, 1N4148 DO-35 axial, 330R axial)
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 25.0, 66.0, 0),
        ("D2", "1N4148", "Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal", 25.0, 58.0, 90),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 25.0, 48.0, 0),
        ("R4", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 25.0, 38.0, 90),
        
        # Power Decoupling Caps (Classic Radial Elec 100uF + Ceramic Disc 100nF)
        ("C6", "100uF", "Capacitor_THT", "CP_Radial_D6.3mm_P2.50mm", 34.0, 36.0, 0),
        ("C7", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 34.0, 46.0, 90),
        
        # Right Side: Analog Audio 2-Stage Filter (Axial 0.25W Resistors + Ceramic Discs)
        ("R1", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 66.0, 24.0, 0),
        ("C3", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 66.0, 31.0, 90),
        ("R2", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 73.0, 24.0, 0),
        ("C4", "47nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 73.0, 31.0, 90),
        
        # Audio Output Driver (R6 470R, BC547 TO-92, C5 100nF, R7 33R 1W Axial, Speaker JST)
        ("R6", "470R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 80.0, 24.0, 90),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 80.0, 32.0, 0),
        ("C5", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 86.0, 32.0, 90),
        ("R7", "33R (1W)", "Resistor_THT", "R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", 81.0, 41.0, 0),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 92.0, 32.0, 90),
        
        # PTT Out Isolation & PS/2 Expansion Header
        ("R5", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 72.0, 47.0, 90),
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
    
    add_text("MorseWave Pro v2.0 (THT Classic)", 50.0, 4.0, 1.8)
    add_text("R9OGL Edition", 50.0, 7.5, 1.3)
    add_text("SPEED", 20.0, 19.5, 1.2)
    add_text("TONE", 50.0, 19.5, 1.2)
    add_text("VOLUME", 80.0, 19.5, 1.2)
    add_text("KEY", 93.0, 8.5, 1.0)
    add_text("OLED 0.96\"", 50.0, 26.5, 1.1)
    add_text("PADDLE", 12.0, 71.5, 1.1)
    add_text("KEY OUT", 25.0, 71.5, 1.1)
    add_text("USB / SERIAL", 50.0, 71.5, 1.0)
    add_text("PTT OUT", 72.0, 71.5, 1.1)
    add_text("SPK", 92.0, 26.5, 1.0)
    add_text("PS/2", 88.0, 50.5, 1.0)

    
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
    print(f"Updated 100% THT PCB generated: {pcb_path}")
    print(f"Board size: {W_mm} x {H_mm} mm. Assigned {assigned_pads} pads to nets.")

create_board_tht()

"""
MorseWave Pro Keyer (By R9OGL)
100% Through-Hole (THT) Classic Edition PCB Generator
Board size: 100.0 x 75.0 mm | Standard 1 dm² prototype tier
Complies with Rezonit and PS Electro manufacturing specifications
Includes Dual-Paddle (Iambic Key) Logo, Nano pinout silkscreen, and Headphones support
"""
import os
import re
import math
import pcbnew

FP_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
MODEL_DIR = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels"

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

def add_line(board, x1, y1, x2, y2, width=0.2, layer=pcbnew.F_SilkS):
    seg = pcbnew.PCB_SHAPE(board)
    seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
    seg.SetLayer(layer)
    seg.SetWidth(mm_to_nm(width))
    seg.SetStart(pcbnew.VECTOR2I(mm_to_nm(x1), mm_to_nm(y1)))
    seg.SetEnd(pcbnew.VECTOR2I(mm_to_nm(x2), mm_to_nm(y2)))
    board.Add(seg)

def add_circle(board, cx, cy, radius, width=0.2, layer=pcbnew.F_SilkS):
    c = pcbnew.PCB_SHAPE(board)
    c.SetShape(pcbnew.SHAPE_T_CIRCLE)
    c.SetLayer(layer)
    c.SetWidth(mm_to_nm(width))
    c.SetCenter(pcbnew.VECTOR2I(mm_to_nm(cx), mm_to_nm(cy)))
    c.SetStart(pcbnew.VECTOR2I(mm_to_nm(cx), mm_to_nm(cy)))
    c.SetEnd(pcbnew.VECTOR2I(mm_to_nm(cx + radius), mm_to_nm(cy)))
    board.Add(c)

def add_rect(board, x1, y1, x2, y2, width=0.25, layer=pcbnew.F_SilkS):
    add_line(board, x1, y1, x2, y1, width, layer)
    add_line(board, x2, y1, x2, y2, width, layer)
    add_line(board, x2, y2, x1, y2, width, layer)
    add_line(board, x1, y2, x1, y1, width, layer)

def draw_dual_paddle_logo(board, ox, oy):
    """
    Draws an authentic CW Dual-Paddle Iambic Key artwork on F_SilkS
    ox, oy is top-left anchor point (e.g. X=9.0, Y=27.5)
    """
    # 1. Heavy Rectangular Base Plinth (18.0 x 8.0 mm)
    add_rect(board, ox, oy + 2.0, ox + 18.0, oy + 9.5, width=0.35)
    # 4 Corner Brass Feet
    add_circle(board, ox + 1.5, oy + 3.2, 0.6, width=0.25)
    add_circle(board, ox + 16.5, oy + 3.2, 0.6, width=0.25)
    add_circle(board, ox + 1.5, oy + 8.3, 0.6, width=0.25)
    add_circle(board, ox + 16.5, oy + 8.3, 0.6, width=0.25)
    
    # 2. Central Bearing Post & Contacts (Center X = ox + 9.0)
    add_rect(board, ox + 7.8, oy + 2.8, ox + 10.2, oy + 8.5, width=0.3)
    add_circle(board, ox + 9.0, oy + 5.5, 0.7, width=0.25)
    
    # Left and Right Contact Screws with locknuts
    add_line(board, ox + 7.8, oy + 5.5, ox + 6.0, oy + 5.5, width=0.4)
    add_line(board, ox + 6.6, oy + 4.9, ox + 6.6, oy + 6.1, width=0.25)
    
    add_line(board, ox + 10.2, oy + 5.5, ox + 12.0, oy + 5.5, width=0.4)
    add_line(board, ox + 11.4, oy + 4.9, ox + 11.4, oy + 6.1, width=0.25)
    
    # 3. Two Dual Paddle Brass Arms (Lever 1 on Left, Lever 2 on Right)
    add_line(board, ox + 4.5, oy + 3.5, ox + 6.0, oy + 11.0, width=0.55)
    add_line(board, ox + 13.5, oy + 3.5, ox + 12.0, oy + 11.0, width=0.55)
    
    # Rear tension spring between arms
    add_line(board, ox + 5.0, oy + 4.0, ox + 13.0, oy + 4.0, width=0.25)
    
    # 4. Finger Pieces / Paddles (Весла / Лопатки)
    # Left Paddle Blade (Thumb)
    add_rect(board, ox + 5.0, oy + 11.0, ox + 7.0, oy + 15.5, width=0.35)
    # Right Paddle Blade (Index finger)
    add_rect(board, ox + 11.0, oy + 11.0, ox + 13.0, oy + 15.5, width=0.35)
    
    # 5. Callsign in Morse code underneath: DE R9OGL
    # D: -..  E: .    R: .-.  9: ----.  O: ---  G: --.  L: .-..
    morse_txt = "-.. .   .-. ----. --- --. .-.."
    txt = pcbnew.PCB_TEXT(board)
    txt.SetText(morse_txt)
    txt.SetPosition(pcbnew.VECTOR2I(mm_to_nm(ox + 9.0), mm_to_nm(oy + 17.5)))
    txt.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(0.85), mm_to_nm(0.85)))
    txt.SetLayer(pcbnew.F_SilkS)
    board.Add(txt)
    
    txt2 = pcbnew.PCB_TEXT(board)
    txt2.SetText("DE R9OGL")
    txt2.SetPosition(pcbnew.VECTOR2I(mm_to_nm(ox + 9.0), mm_to_nm(oy + 19.5)))
    txt2.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(1.1), mm_to_nm(1.1)))
    txt2.SetLayer(pcbnew.F_SilkS)
    board.Add(txt2)

def create_board_tht():
    board = pcbnew.BOARD()
    
    W_mm = 100.0
    H_mm = 75.0
    
    # Set Manufacturing Rules (Rezonit & PS Electro Standards)
    ds = board.GetDesignSettings()
    ds.m_SilkMaskClearance = mm_to_nm(0.15)
    ds.m_SolderMaskExpansion = mm_to_nm(0.05)
    ds.m_SolderMaskMinWidth = mm_to_nm(0.10)
    ds.m_CopperEdgeClearance = mm_to_nm(0.50)
    ds.m_TrackMinWidth = mm_to_nm(0.20)
    ds.m_ViasMinSize = mm_to_nm(0.60)
    ds.m_ViasMinDrill = mm_to_nm(0.30)
    
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
    
    # 3. Component placement (Generous clearances, 8-15mm spacing!)
    nano_x = 42.38
    nano_y = 36.50
    
    components = [
        # Front Panel Pots (Shaft Centers: X = 25.0, 53.75, 82.5 at Y = 20.5 mm)
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 17.5, 18.0, 0),
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 46.25, 18.0, 0),
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 75.0, 18.0, 0),
        ("D1", "LED_KEY", "LED_THT", "LED_D3.0mm", 94.0, 18.0, 0),
        ("R3", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 94.0, 28.0, 90),
        
        # OLED 0.96" header (Centered, Y = 30.5 mm right above Nano)
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 46.19, 30.5, 90),
        
        # Arduino Nano (Centered, USB flush with bottom edge at Y = 75.0 mm)
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", nano_x, nano_y, 0),
        
        # Left Section: Power Decoupling Caps (Separated by 12mm!)
        ("C6", "100uF", "Capacitor_THT", "CP_Radial_D6.3mm_P2.50mm", 10.0, 54.0, 0),
        ("C7", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 22.0, 54.0, 0),
        
        # Left Section: Paddle Input & RF Filter
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 10.0, 67.0, 0),
        ("C1", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 10.0, 60.5, 0),
        ("C2", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 18.0, 60.5, 0),
        
        # Left Section: Key Out Isolation (PC817, 1N4148, 330R)
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 22.0, 67.0, 0),
        ("D2", "1N4148", "Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal", 26.0, 60.5, 90),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 33.0, 67.0, 0),
        ("R4", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 33.0, 56.0, 90),
        
        # Right Section: Analog Audio 2-Stage Filter (Spacious 10mm pitch)
        ("R1", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 36.0, 0),
        ("C3", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 67.0, 46.0, 90),
        ("R2", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 36.0, 0),
        ("C4", "47nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 78.0, 46.0, 90),
        
        # Right Section: Audio Output Driver (BC547, R6, C5, R7, J4 Speaker)
        ("R6", "470R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 89.0, 36.0, 0),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 89.0, 46.0, 0),
        ("C5", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 95.0, 46.0, 90),
        ("R7", "33R (1W)", "Resistor_THT", "R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", 89.0, 56.0, 0),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 95.0, 56.0, 90),
        
        # Right Section: Headphones Output (J7 + R8 150R attenuation)
        ("R8", "150R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 56.0, 0),
        ("J7", "PHONES_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 67.0, 67.0, 0),
        
        # Right Section: PTT Out Isolation & PS/2 Expansion Header
        ("R5", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 56.0, 90),
        ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 78.0, 67.0, 0),
        ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 86.0, 67.0, 0),
        ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 94.0, 67.0, 90),
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
        
        # Hide default auto-generated footprint text so it never collides
        fp.Reference().SetVisible(False)
        fp.Value().SetVisible(False)
        
        # Attach 3D Models for realistic visualization
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
        fp_instances[ref] = fp
    
    # 4. Silkscreen Labels
    def add_text(text, x, y, size=1.5, layer=pcbnew.F_SilkS):
        txt = pcbnew.PCB_TEXT(board)
        txt.SetText(text)
        txt.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        txt.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(size), mm_to_nm(size)))
        txt.SetLayer(layer)
        board.Add(txt)
    
    # Top Branding Header
    add_text("MorseWave Pro v2.0", 50.0, 3.2, 1.8)
    add_text("By R9OGL  *  morse.r9old.ru", 50.0, 6.2, 1.1)
    
    # Front Controls (Directly above each potentiometer shaft)
    add_text("SPEED", 25.0, 10.5, 1.2)
    add_text("TONE", 53.75, 10.5, 1.2)
    add_text("VOLUME", 82.5, 10.5, 1.2)
    add_text("KEY", 94.0, 13.5, 1.0)
    add_text("OLED 0.96\"", 50.0, 33.5, 1.0)
    
    # Rear Cable Connectors (Bottom Edge)
    add_text("PADDLE", 10.0, 73.0, 1.0)
    add_text("KEY OUT", 22.0, 73.0, 1.0)
    add_text("U2", 33.0, 73.0, 0.9)
    add_text("USB / SERIAL", 50.0, 73.0, 1.0)
    add_text("PHONES", 67.0, 73.0, 1.0)
    add_text("PTT", 78.0, 73.0, 1.0)
    add_text("RCA", 86.0, 73.0, 1.0)
    add_text("PS/2", 94.0, 73.0, 1.0)
    add_text("SPK", 95.0, 62.0, 1.0)
    
    # Component Reference Silkscreen (Clear, uncollided labels)
    add_text("C6", 10.0, 48.5, 0.9)
    add_text("C7", 22.0, 48.5, 0.9)
    add_text("D2", 26.0, 54.5, 0.9)
    add_text("R4", 33.0, 50.0, 0.9)
    add_text("C1", 10.0, 56.5, 0.8)
    add_text("C2", 18.0, 56.5, 0.8)
    add_text("R3", 94.0, 34.0, 0.9)
    
    add_text("R1", 67.0, 31.0, 0.9)
    add_text("C3", 67.0, 51.5, 0.9)
    add_text("R2", 78.0, 31.0, 0.9)
    add_text("C4", 78.0, 51.5, 0.9)
    add_text("R6", 89.0, 31.0, 0.9)
    add_text("Q1", 89.0, 51.5, 0.9)
    add_text("C5", 95.0, 51.5, 0.9)
    add_text("R7", 89.0, 61.5, 0.9)
    add_text("R8", 67.0, 61.5, 0.9)
    add_text("R5", 78.0, 50.0, 0.9)
    
    # 5. Arduino Nano Pinout Labels (Clear 0.75mm text beside each socket pin)
    # Left side (Pins 1 - 15, Y = 36.5 to 72.06 mm)
    nano_left_labels = ["TX", "RX", "RST", "GND", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"]
    for i, lbl in enumerate(nano_left_labels):
        py = nano_y + i * 2.54
        add_text(lbl, nano_x - 3.2, py, 0.75)
        
    # Right side (Pins 30 - 16, Y = 36.5 to 72.06 mm)
    nano_right_labels = ["VIN", "GND", "RST", "5V", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "REF", "3V3", "D13"]
    for i, lbl in enumerate(nano_right_labels):
        py = nano_y + i * 2.54
        add_text(lbl, nano_x + 15.24 + 3.2, py, 0.75)
    
    # 6. Authentic CW Dual-Paddle (Iambic Key) Logo on Left Side
    draw_dual_paddle_logo(board, 8.0, 27.0)

    # 7. Assign Nets from Netlist
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
    
    # 8. Copper Ground Pour (GND) on B.Cu and F.Cu with 0.5mm edge pullback
    gnd_net = board.FindNet("GND")
    if gnd_net:
        outline = pcbnew.SHAPE_POLY_SET()
        outline.NewOutline()
        pullback = 0.50
        pts = [
            (pullback, pullback),
            (W_mm - pullback, pullback),
            (W_mm - pullback, H_mm - pullback),
            (pullback, H_mm - pullback)
        ]
        for x, y in pts:
            outline.Append(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
            
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

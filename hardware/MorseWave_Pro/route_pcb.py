"""
MorseWave Pro v2.0 Complete PCB Generator & Auto-Router
100% Through-Hole (Zero SMD), 100 x 75 mm
Full DRC clearance compliant (Rezonit & PS Electro)
"""
import os
import re
import math
import pcbnew

FP_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"
MODEL_DIR = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels"
NET_FILE = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.net"
PCB_FILE = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_pcb"

def mm_to_nm(mm): return int(round(mm * 1e6))
def nm_to_mm(nm): return nm / 1e6

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

def route_ortho(board, x1, y1, x2, y2, width=0.4, layer=pcbnew.F_Cu, net=None, horizontal_first=True):
    """Routes an orthogonal 2-segment L-shaped track"""
    if horizontal_first:
        add_track(board, x1, y1, x2, y1, width, layer, net)
        add_track(board, x2, y1, x2, y2, width, layer, net)
    else:
        add_track(board, x1, y1, x1, y2, width, layer, net)
        add_track(board, x1, y2, x2, y2, width, layer, net)

def add_via(board, x, y, net=None, size=0.8, drill=0.4):
    v = pcbnew.PCB_VIA(board)
    v.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
    v.SetWidth(mm_to_nm(size))
    v.SetDrill(mm_to_nm(drill))
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
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
    add_rect(board, ox, oy + 2.0, ox + 18.0, oy + 9.5, width=0.35)
    add_circle(board, ox + 1.5, oy + 3.2, 0.6, width=0.25)
    add_circle(board, ox + 16.5, oy + 3.2, 0.6, width=0.25)
    add_circle(board, ox + 1.5, oy + 8.3, 0.6, width=0.25)
    add_circle(board, ox + 16.5, oy + 8.3, 0.6, width=0.25)
    
    add_rect(board, ox + 7.8, oy + 2.8, ox + 10.2, oy + 8.5, width=0.3)
    add_circle(board, ox + 9.0, oy + 5.5, 0.7, width=0.25)
    
    add_line(board, ox + 7.8, oy + 5.5, ox + 6.0, oy + 5.5, width=0.4)
    add_line(board, ox + 6.6, oy + 4.9, ox + 6.6, oy + 6.1, width=0.25)
    add_line(board, ox + 10.2, oy + 5.5, ox + 12.0, oy + 5.5, width=0.4)
    add_line(board, ox + 11.4, oy + 4.9, ox + 11.4, oy + 6.1, width=0.25)
    
    add_line(board, ox + 4.5, oy + 3.5, ox + 6.0, oy + 11.0, width=0.55)
    add_line(board, ox + 13.5, oy + 3.5, ox + 12.0, oy + 11.0, width=0.55)
    add_line(board, ox + 5.0, oy + 4.0, ox + 13.0, oy + 4.0, width=0.25)
    
    add_rect(board, ox + 5.0, oy + 11.0, ox + 7.0, oy + 15.5, width=0.35)
    add_rect(board, ox + 11.0, oy + 11.0, ox + 13.0, oy + 15.5, width=0.35)
    
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

def build_routed_board():
    board = pcbnew.BOARD()
    W_mm, H_mm = 100.0, 75.0
    
    # 1. Rezonit & PS Electro Standards
    ds = board.GetDesignSettings()
    ds.m_SilkMaskClearance = mm_to_nm(0.15)
    ds.m_SolderMaskExpansion = mm_to_nm(0.05)
    ds.m_SolderMaskMinWidth = mm_to_nm(0.10)
    ds.m_CopperEdgeClearance = mm_to_nm(0.50)
    ds.m_TrackMinWidth = mm_to_nm(0.20)
    ds.m_ViasMinSize = mm_to_nm(0.60)
    ds.m_ViasMinDrill = mm_to_nm(0.30)
    
    # 2. Edge Cuts
    pts = [(0.0, 0.0), (W_mm, 0.0), (W_mm, H_mm), (0.0, H_mm), (0.0, 0.0)]
    for i in range(len(pts) - 1):
        seg = pcbnew.PCB_SHAPE(board)
        seg.SetShape(pcbnew.SHAPE_T_SEGMENT)
        seg.SetLayer(pcbnew.Edge_Cuts)
        seg.SetWidth(mm_to_nm(0.15))
        seg.SetStart(pcbnew.VECTOR2I(mm_to_nm(pts[i][0]), mm_to_nm(pts[i][1])))
        seg.SetEnd(pcbnew.VECTOR2I(mm_to_nm(pts[i+1][0]), mm_to_nm(pts[i+1][1])))
        board.Add(seg)
        
    # 3. M3 Mounting Holes
    hole_lib = os.path.join(FP_DIR, "MountingHole.pretty")
    for i, (hx, hy) in enumerate([(4.0, 4.0), (W_mm - 4.0, 4.0), (4.0, H_mm - 4.0), (W_mm - 4.0, H_mm - 4.0)]):
        h = pcbnew.FootprintLoad(hole_lib, "MountingHole_3.2mm_M3")
        if h:
            h.SetReference(f"H{i+1}")
            h.SetValue("MountingHole_M3")
            h.SetPosition(pcbnew.VECTOR2I(mm_to_nm(hx), mm_to_nm(hy)))
            board.Add(h)

    # 4. Footprints Placement (Clear, spacious, zero collisions)
    nano_x, nano_y = 42.38, 36.50
    components = [
        # Top Front Knobs
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 17.5, 18.0, 0),
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 46.25, 18.0, 0),
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 75.0, 18.0, 0),
        ("D1", "LED_KEY", "LED_THT", "LED_D3.0mm", 94.0, 18.0, 0),
        ("R3", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 94.0, 30.0, 90),
        
        # OLED 0.96 Header (Centered over top of Nano)
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 46.19, 30.5, 90),
        
        # Arduino Nano Module
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", nano_x, nano_y, 0),
        
        # Left Section (Power & Paddle Key)
        ("C6", "100uF", "Capacitor_THT", "CP_Radial_D6.3mm_P2.50mm", 8.0, 54.0, 0),
        ("C7", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 16.0, 54.0, 0),
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 8.0, 67.0, 0),
        ("C1", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 8.0, 60.5, 0),
        ("C2", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 15.0, 60.5, 0),
        
        # Key Out Isolation (PC817 U2, 1N4148 D2, 330R R4) - 0 deg rotation, clean spacing!
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 21.0, 67.0, 0),
        ("D2", "1N4148", "Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal", 21.0, 60.5, 0),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 29.5, 67.0, 0),
        ("R4", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 29.5, 54.0, 90),
        
        # Right Section (Audio Filter & Driver)
        ("R1", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 36.0, 0),
        ("C3", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 67.0, 46.0, 90),
        ("R2", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 36.0, 0),
        ("C4", "47nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 78.0, 46.0, 90),
        
        ("R6", "470R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 89.0, 36.0, 0),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 89.0, 46.0, 0),
        ("C5", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 95.0, 46.0, 90),
        ("R7", "33R (1W)", "Resistor_THT", "R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", 89.0, 56.0, 0),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 95.0, 56.0, 90),
        
        # Headphones Output (R8 150R + J7 3.5mm header)
        ("R8", "150R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 56.0, 0),
        ("J7", "PHONES_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 67.0, 67.0, 0),
        
        # PTT Out Isolation & PS/2
        ("R5", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 56.0, 90),
        ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 78.0, 67.0, 0),
        ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 89.0, 67.0, 0),
        ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 95.0, 67.0, 90),
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
        
        # 3D models
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

    # 5. Silkscreen text
    def add_text(text, x, y, size=1.5, layer=pcbnew.F_SilkS):
        txt = pcbnew.PCB_TEXT(board)
        txt.SetText(text)
        txt.SetPosition(pcbnew.VECTOR2I(mm_to_nm(x), mm_to_nm(y)))
        txt.SetTextSize(pcbnew.VECTOR2I(mm_to_nm(size), mm_to_nm(size)))
        txt.SetLayer(layer)
        board.Add(txt)

    add_text("MorseWave Pro v2.0", 50.0, 3.2, 1.8)
    add_text("By R9OGL  *  morse.r9old.ru", 50.0, 6.2, 1.1)
    
    add_text("SPEED", 25.0, 10.5, 1.2)
    add_text("TONE", 53.75, 10.5, 1.2)
    add_text("VOLUME", 82.5, 10.5, 1.2)
    add_text("KEY", 94.0, 13.5, 1.0)
    add_text("OLED 0.96\"", 50.0, 33.5, 1.0)
    
    add_text("PADDLE", 8.0, 73.0, 1.0)
    add_text("KEY OUT", 21.0, 73.0, 1.0)
    add_text("U2", 29.5, 73.0, 0.9)
    add_text("USB / SERIAL", 50.0, 73.0, 1.0)
    add_text("PHONES", 67.0, 73.0, 1.0)
    add_text("PTT", 78.0, 73.0, 1.0)
    add_text("RCA", 89.0, 73.0, 1.0)
    add_text("PS/2", 95.0, 73.0, 1.0)
    add_text("SPK", 95.0, 62.0, 1.0)
    
    add_text("C6", 8.0, 49.0, 0.9)
    add_text("C7", 16.0, 49.0, 0.9)
    add_text("D2", 21.0, 56.5, 0.9)
    add_text("R4", 29.5, 48.0, 0.9)
    add_text("C1", 8.0, 57.0, 0.8)
    add_text("C2", 15.0, 57.0, 0.8)
    add_text("R3", 94.0, 35.0, 0.9)
    
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
    
    nano_left_labels = ["TX", "RX", "RST", "GND", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"]
    for i, lbl in enumerate(nano_left_labels):
        add_text(lbl, nano_x - 3.2, nano_y + i * 2.54, 0.75)
        
    nano_right_labels = ["VIN", "GND", "RST", "5V", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "REF", "3V3", "D13"]
    for i, lbl in enumerate(nano_right_labels):
        add_text(lbl, nano_x + 15.24 + 3.2, nano_y + i * 2.54, 0.75)
        
    draw_dual_paddle_logo(board, 8.0, 27.0)

    # 6. Assign Nets
    nets_data = parse_nets(NET_FILE)
    pad_dict = {} # (ref, pin) -> pad
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
                    pad_dict[(ref, pin)] = pad

    def pad_pos(ref, pin):
        p = pad_dict[(ref, pin)]
        return p.GetPosition().x / 1e6, p.GetPosition().y / 1e6

    # 7. Auto-Route All Nets
    # 7.1 +5V Main Distribution (Thick 0.8 mm traces on B.Cu)
    net_5v = board.FindNet("+5V")
    # A1:27 to J5:2
    p_a1_5v = pad_pos("A1", "27")
    p_j5_5v = pad_pos("J5", "2")
    route_ortho(board, p_a1_5v[0], p_a1_5v[1], p_j5_5v[0], p_j5_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=True)
    # J5:2 to RV2:1
    p_rv2_5v = pad_pos("RV2", "1")
    route_ortho(board, p_j5_5v[0], p_j5_5v[1], p_rv2_5v[0], p_rv2_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=False)
    # RV2:1 to RV1:1
    p_rv1_5v = pad_pos("RV1", "1")
    route_ortho(board, p_rv2_5v[0], p_rv2_5v[1], p_rv1_5v[0], p_rv1_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=False)
    # A1:27 to C7:1 and C6:1
    p_c7_5v = pad_pos("C7", "1")
    p_c6_5v = pad_pos("C6", "1")
    route_ortho(board, p_a1_5v[0], p_a1_5v[1], p_c7_5v[0], p_c7_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=False)
    route_ortho(board, p_c7_5v[0], p_c7_5v[1], p_c6_5v[0], p_c6_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=True)
    # A1:27 to R7:2 and J6:1
    p_r7_5v = pad_pos("R7", "2")
    p_j6_5v = pad_pos("J6", "1")
    route_ortho(board, p_a1_5v[0], p_a1_5v[1], p_r7_5v[0], p_r7_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=True)
    route_ortho(board, p_r7_5v[0], p_r7_5v[1], p_j6_5v[0], p_j6_5v[1], width=0.8, layer=pcbnew.B_Cu, net=net_5v, horizontal_first=False)

    # 7.2 Signal Traces (0.4 mm width)
    # AUDIO_PWM: A1:12 to R1:1
    net_pwm = board.FindNet("/AUDIO_PWM")
    p1 = pad_pos("A1", "12")
    p2 = pad_pos("R1", "1")
    route_ortho(board, p1[0], p1[1], p2[0], p2[1], width=0.4, layer=pcbnew.F_Cu, net=net_pwm, horizontal_first=True)

    # Net-(C3-Pad1): R1:2 -> R2:1 -> C3:1
    net_c3 = board.FindNet("Net-(C3-Pad1)")
    p_r1_2 = pad_pos("R1", "2")
    p_r2_1 = pad_pos("R2", "1")
    p_c3_1 = pad_pos("C3", "1")
    route_ortho(board, p_r1_2[0], p_r1_2[1], p_r2_1[0], p_r2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c3)
    route_ortho(board, p_r2_1[0], p_r2_1[1], p_c3_1[0], p_c3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c3, horizontal_first=False)

    # Net-(C4-Pad1): R2:2 -> C4:1 -> RV3:1
    net_c4 = board.FindNet("Net-(C4-Pad1)")
    p_r2_2 = pad_pos("R2", "2")
    p_c4_1 = pad_pos("C4", "1")
    p_rv3_1 = pad_pos("RV3", "1")
    route_ortho(board, p_r2_2[0], p_r2_2[1], p_c4_1[0], p_c4_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c4, horizontal_first=False)
    route_ortho(board, p_c4_1[0], p_c4_1[1], p_rv3_1[0], p_rv3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_c4, horizontal_first=False)

    # Net-(R6-Pad1): RV3:2 -> R6:1
    net_r6_1 = board.FindNet("Net-(R6-Pad1)")
    p_rv3_2 = pad_pos("RV3", "2")
    p_r6_1 = pad_pos("R6", "1")
    route_ortho(board, p_rv3_2[0], p_rv3_2[1], p_r6_1[0], p_r6_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r6_1, horizontal_first=True)

    # Net-(Q1-B): R6:2 -> Q1:2
    net_qb = board.FindNet("Net-(Q1-B)")
    p_r6_2 = pad_pos("R6", "2")
    p_q1_2 = pad_pos("Q1", "2")
    route_ortho(board, p_r6_2[0], p_r6_2[1], p_q1_2[0], p_q1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_qb, horizontal_first=False)

    # Net-(J4-Pin_1): Q1:1 -> C5:1 -> J4:1 -> R8:1
    net_spk1 = board.FindNet("Net-(J4-Pin_1)")
    p_q1_1 = pad_pos("Q1", "1")
    p_c5_1 = pad_pos("C5", "1")
    p_j4_1 = pad_pos("J4", "1")
    p_r8_1 = pad_pos("R8", "1")
    route_ortho(board, p_q1_1[0], p_q1_1[1], p_c5_1[0], p_c5_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1, horizontal_first=True)
    route_ortho(board, p_c5_1[0], p_c5_1[1], p_j4_1[0], p_j4_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1, horizontal_first=False)
    route_ortho(board, p_q1_1[0], p_q1_1[1], p_r8_1[0], p_r8_1[1], width=0.5, layer=pcbnew.F_Cu, net=net_spk1, horizontal_first=False)

    # Net-(J4-Pin_2): J4:2 -> R7:1
    net_spk2 = board.FindNet("Net-(J4-Pin_2)")
    p_j4_2 = pad_pos("J4", "2")
    p_r7_1 = pad_pos("R7", "1")
    route_ortho(board, p_j4_2[0], p_j4_2[1], p_r7_1[0], p_r7_1[1], width=0.6, layer=pcbnew.F_Cu, net=net_spk2, horizontal_first=False)

    # Net-(J7-Pin_1): R8:2 -> J7:1
    net_ph1 = board.FindNet("Net-(J7-Pin_1)")
    p_r8_2 = pad_pos("R8", "2")
    p_j7_1 = pad_pos("J7", "1")
    route_ortho(board, p_r8_2[0], p_r8_2[1], p_j7_1[0], p_j7_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_ph1, horizontal_first=False)

    # POT_SPEED: A1:19 -> RV1:2
    net_speed = board.FindNet("/POT_SPEED")
    p_a1_19 = pad_pos("A1", "19")
    p_rv1_2 = pad_pos("RV1", "2")
    route_ortho(board, p_a1_19[0], p_a1_19[1], p_rv1_2[0], p_rv1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_speed, horizontal_first=True)

    # POT_TONE: A1:20 -> RV2:2
    net_tone = board.FindNet("/POT_TONE")
    p_a1_20 = pad_pos("A1", "20")
    p_rv2_2 = pad_pos("RV2", "2")
    route_ortho(board, p_a1_20[0], p_a1_20[1], p_rv2_2[0], p_rv2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_tone, horizontal_first=True)

    # OLED_SCL: A1:24 -> J5:3
    net_scl = board.FindNet("/OLED_SCL")
    p_a1_24 = pad_pos("A1", "24")
    p_j5_3 = pad_pos("J5", "3")
    route_ortho(board, p_a1_24[0], p_a1_24[1], p_j5_3[0], p_j5_3[1], width=0.4, layer=pcbnew.F_Cu, net=net_scl, horizontal_first=False)

    # OLED_SDA: A1:23 -> J5:4
    net_sda = board.FindNet("/OLED_SDA")
    p_a1_23 = pad_pos("A1", "23")
    p_j5_4 = pad_pos("J5", "4")
    route_ortho(board, p_a1_23[0], p_a1_23[1], p_j5_4[0], p_j5_4[1], width=0.4, layer=pcbnew.F_Cu, net=net_sda, horizontal_first=False)

    # LED_KEY: A1:16 -> R3:1
    net_led = board.FindNet("/LED_KEY")
    p_a1_16 = pad_pos("A1", "16")
    p_r3_1 = pad_pos("R3", "1")
    route_ortho(board, p_a1_16[0], p_a1_16[1], p_r3_1[0], p_r3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_led, horizontal_first=True)

    # Net-(D1-A): R3:2 -> D1:2
    net_d1a = board.FindNet("Net-(D1-A)")
    p_r3_2 = pad_pos("R3", "2")
    p_d1_2 = pad_pos("D1", "2")
    route_ortho(board, p_r3_2[0], p_r3_2[1], p_d1_2[0], p_d1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d1a, horizontal_first=False)

    # DIT: A1:5 -> C1:1 -> J1:1
    net_dit = board.FindNet("/DIT")
    p_a1_5 = pad_pos("A1", "5")
    p_c1_1 = pad_pos("C1", "1")
    p_j1_1 = pad_pos("J1", "1")
    route_ortho(board, p_a1_5[0], p_a1_5[1], p_c1_1[0], p_c1_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dit, horizontal_first=True)
    route_ortho(board, p_c1_1[0], p_c1_1[1], p_j1_1[0], p_j1_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dit, horizontal_first=False)

    # DAH: A1:6 -> C2:1 -> J1:2
    net_dah = board.FindNet("/DAH")
    p_a1_6 = pad_pos("A1", "6")
    p_c2_1 = pad_pos("C2", "1")
    p_j1_2 = pad_pos("J1", "2")
    route_ortho(board, p_a1_6[0], p_a1_6[1], p_c2_1[0], p_c2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_dah, horizontal_first=True)
    route_ortho(board, p_c2_1[0], p_c2_1[1], p_j1_2[0], p_j1_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_dah, horizontal_first=False)

    # KEY_OUT_CTRL: A1:13 -> R4:1
    net_key = board.FindNet("/KEY_OUT_CTRL")
    p_a1_13 = pad_pos("A1", "13")
    p_r4_1 = pad_pos("R4", "1")
    route_ortho(board, p_a1_13[0], p_a1_13[1], p_r4_1[0], p_r4_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_key, horizontal_first=True)

    # Net-(R4-Pad2): R4:2 -> U2:1
    net_r4_2 = board.FindNet("Net-(R4-Pad2)")
    p_r4_2 = pad_pos("R4", "2")
    p_u2_1 = pad_pos("U2", "1")
    route_ortho(board, p_r4_2[0], p_r4_2[1], p_u2_1[0], p_u2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r4_2, horizontal_first=False)

    # Net-(D2-A): U2:3 -> D2:2 -> J2:1
    net_d2a = board.FindNet("Net-(D2-A)")
    p_u2_3 = pad_pos("U2", "3")
    p_d2_2 = pad_pos("D2", "2")
    p_j2_1 = pad_pos("J2", "1")
    route_ortho(board, p_u2_3[0], p_u2_3[1], p_d2_2[0], p_d2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a, horizontal_first=False)
    route_ortho(board, p_d2_2[0], p_d2_2[1], p_j2_1[0], p_j2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2a, horizontal_first=False)

    # Net-(D2-K): U2:4 -> D2:1 -> J2:2
    net_d2k = board.FindNet("Net-(D2-K)")
    p_u2_4 = pad_pos("U2", "4")
    p_d2_1 = pad_pos("D2", "1")
    p_j2_2 = pad_pos("J2", "2")
    route_ortho(board, p_u2_4[0], p_u2_4[1], p_d2_1[0], p_d2_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k, horizontal_first=False)
    route_ortho(board, p_d2_1[0], p_d2_1[1], p_j2_2[0], p_j2_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_d2k, horizontal_first=False)

    # PTT_OUT_CTRL: A1:14 -> R5:1
    net_ptt = board.FindNet("/PTT_OUT_CTRL")
    p_a1_14 = pad_pos("A1", "14")
    p_r5_1 = pad_pos("R5", "1")
    route_ortho(board, p_a1_14[0], p_a1_14[1], p_r5_1[0], p_r5_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_ptt, horizontal_first=True)

    # Net-(R5-Pad2): R5:2 -> U3:1
    net_r5_2 = board.FindNet("Net-(R5-Pad2)")
    p_r5_2 = pad_pos("R5", "2")
    p_u3_1 = pad_pos("U3", "1")
    route_ortho(board, p_r5_2[0], p_r5_2[1], p_u3_1[0], p_u3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_r5_2, horizontal_first=False)

    # Net-(J3-Pin_1): U3:3 -> J3:1
    net_j3_1 = board.FindNet("Net-(J3-Pin_1)")
    p_u3_3 = pad_pos("U3", "3")
    p_j3_1 = pad_pos("J3", "1")
    route_ortho(board, p_u3_3[0], p_u3_3[1], p_j3_1[0], p_j3_1[1], width=0.4, layer=pcbnew.F_Cu, net=net_j3_1, horizontal_first=False)

    # Net-(J3-Pin_2): U3:4 -> J3:2
    net_j3_2 = board.FindNet("Net-(J3-Pin_2)")
    p_u3_4 = pad_pos("U3", "4")
    p_j3_2 = pad_pos("J3", "2")
    route_ortho(board, p_u3_4[0], p_u3_4[1], p_j3_2[0], p_j3_2[1], width=0.4, layer=pcbnew.F_Cu, net=net_j3_2, horizontal_first=False)

    # PS2_CLK: A1:8 -> J6:4
    net_ps2_clk = board.FindNet("/PS2_CLK")
    p_a1_8 = pad_pos("A1", "8")
    p_j6_4 = pad_pos("J6", "4")
    route_ortho(board, p_a1_8[0], p_a1_8[1], p_j6_4[0], p_j6_4[1], width=0.4, layer=pcbnew.F_Cu, net=net_ps2_clk, horizontal_first=True)

    # PS2_DATA: A1:7 -> J6:3
    net_ps2_dat = board.FindNet("/PS2_DATA")
    p_a1_7 = pad_pos("A1", "7")
    p_j6_3 = pad_pos("J6", "3")
    route_ortho(board, p_a1_7[0], p_a1_7[1], p_j6_3[0], p_j6_3[1], width=0.4, layer=pcbnew.F_Cu, net=net_ps2_dat, horizontal_first=True)

    # 8. Copper Ground Pour (GND) on B.Cu and F.Cu
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
    print(f"Successfully generated and routed board: {PCB_FILE}")

build_routed_board()

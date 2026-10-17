"""
MorseWave Pro Keyer (R9OGL Edition v2.0)
Automated PCB Generator using KiCad 10 pcbnew API
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

def create_board():
    board = pcbnew.BOARD()
    
    # Board dimensions: 85 x 65 mm
    W_mm = 85.0
    H_mm = 65.0
    
    # 1. Edge.Cuts (Board Outline)
    # Define rectangle with 2mm rounded corners or clean chamfers
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
    
    # 2. Mounting holes (M3 - 3.2mm hole, 6.0mm pad)
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
    
    # 3. Component placement dictionary
    # (ref, val, lib, footprint, x, y, rot_deg)
    components = [
        # Front Panel Pots & LED
        ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 18.0, 14.0, 0),
        ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 42.5, 14.0, 0),
        ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 67.0, 14.0, 0),
        ("D1", "LED_KEY", "LED_THT", "LED_D3.0mm", 79.0, 14.0, 0),
        ("R3", "330R", "Resistor_SMD", "R_0805_2012Metric", 79.0, 21.0, 90),
        
        # OLED 0.96" header (Centered above Nano)
        ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 42.5, 27.0, 0),
        
        # Arduino Nano (Centered, USB facing down)
        ("A1", "Arduino_Nano", "Module", "Arduino_Nano", 42.5, 46.0, 0),
        
        # Analog Audio Filter & Driver
        ("R1", "1k", "Resistor_SMD", "R_0805_2012Metric", 56.0, 32.0, 0),
        ("C3", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 56.0, 36.0, 90),
        ("R2", "1k", "Resistor_SMD", "R_0805_2012Metric", 61.0, 32.0, 0),
        ("C4", "47nF", "Capacitor_SMD", "C_0805_2012Metric", 61.0, 36.0, 90),
        ("R6", "470R", "Resistor_SMD", "R_0805_2012Metric", 67.0, 24.0, 90),
        ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 67.0, 32.0, 0),
        ("C5", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 72.0, 32.0, 90),
        ("R7", "33R (1W)", "Resistor_SMD", "R_1206_3216Metric", 72.0, 24.0, 90),
        ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 76.0, 38.0, 90),
        
        # Paddle Input & Shunt Caps
        ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 10.0, 56.0, 0),
        ("C1", "10nF", "Capacitor_SMD", "C_0805_2012Metric", 15.0, 53.0, 90),
        ("C2", "10nF", "Capacitor_SMD", "C_0805_2012Metric", 15.0, 58.0, 90),
        
        # Key Out Isolation
        ("R4", "330R", "Resistor_SMD", "R_0805_2012Metric", 21.0, 40.0, 90),
        ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 21.0, 48.0, 0),
        ("D2", "1N4148", "Diode_SMD", "D_SOD-123", 21.0, 56.0, 0),
        ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 26.0, 56.0, 0),
        
        # PTT Out Isolation
        ("R5", "330R", "Resistor_SMD", "R_0805_2012Metric", 63.0, 50.0, 90),
        ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 69.0, 50.0, 0),
        ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 77.0, 56.0, 0),
        
        # PS/2 Keyboard Header
        ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 77.0, 46.0, 90),
        
        # Power Decoupling Caps
        ("C6", "100uF", "Capacitor_SMD", "CP_Elec_6.3x5.4", 23.0, 24.0, 0),
        ("C7", "100nF", "Capacitor_SMD", "C_0805_2012Metric", 23.0, 31.0, 90),
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
    
    add_text("MorseWave Pro v2.0", 30.0, 5.0, 2.0)
    add_text("R9OGL Edition", 34.0, 8.0, 1.3)
    add_text("SPEED", 14.5, 20.0, 1.2)
    add_text("TONE", 39.5, 20.0, 1.2)
    add_text("VOLUME", 63.5, 20.0, 1.2)
    add_text("KEY", 77.0, 10.0, 1.0)
    add_text("OLED 0.96\"", 38.0, 24.0, 1.1)
    add_text("PADDLE", 6.5, 61.5, 1.1)
    add_text("KEY OUT", 22.5, 61.5, 1.1)
    add_text("PTT OUT", 73.5, 61.5, 1.1)
    add_text("SPK", 74.0, 34.0, 1.0)
    add_text("PS/2", 75.0, 42.0, 1.0)
    
    # Save board
    pcb_path = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_pcb"
    board.Save(pcb_path)
    print(f"PCB successfully generated and saved: {pcb_path}")
    print(f"Total footprints placed: {len(fp_instances)} + 4 mounting holes")

create_board()

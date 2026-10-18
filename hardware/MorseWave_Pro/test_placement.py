import os
import pcbnew

FP_DIR = r"C:\Program Files\KiCad\10.0\share\kicad\footprints"

def test_placement(components):
    board = pcbnew.BOARD()
    fps = []
    for ref, val, lib, fp_name, x, y, rot_deg in components:
        fp = pcbnew.FootprintLoad(os.path.join(FP_DIR, f"{lib}.pretty"), fp_name)
        if not fp:
            print("Missing FP:", fp_name)
            continue
        fp.SetReference(ref)
        fp.SetPosition(pcbnew.VECTOR2I(int(x * 1e6), int(y * 1e6)))
        fp.SetOrientation(pcbnew.EDA_ANGLE(rot_deg, pcbnew.DEGREES_T))
        board.Add(fp)
        fps.append(fp)
        
    print(f"Loaded {len(fps)} footprints.")
    # Check pad-to-pad distance between different footprints
    collisions = []
    pads = board.GetPads()
    for i in range(len(pads)):
        for j in range(i + 1, len(pads)):
            p1, p2 = pads[i], pads[j]
            fp1, fp2 = p1.GetParentFootprint(), p2.GetParentFootprint()
            if fp1 == fp2: continue
            
            x1, y1 = p1.GetPosition().x / 1e6, p1.GetPosition().y / 1e6
            x2, y2 = p2.GetPosition().x / 1e6, p2.GetPosition().y / 1e6
            
            dist = ((x1 - x2)**2 + (y1 - y2)**2)**0.5
            r1 = max(p1.GetSize().x, p1.GetSize().y) / 2e6
            r2 = max(p2.GetSize().x, p2.GetSize().y) / 2e6
            clearance = dist - (r1 + r2)
            if clearance < 0.30:  # Less than 0.30 mm clearance
                collisions.append((fp1.GetReference(), p1.GetNumber(), fp2.GetReference(), p2.GetNumber(), round(clearance, 2), round(dist, 2)))
                
    if collisions:
        print(f"Found {len(collisions)} pad clearances < 0.3mm:")
        for c in collisions:
            print(f"  {c[0]}:{c[1]} <-> {c[2]}:{c[3]}: clearance = {c[4]} mm (center dist = {c[5]} mm)")
    else:
        print("PERFECT! Zero pad clearance violations between any components!")

components = [
    # Potentiometers (Alps RK09)
    ("RV1", "10k (Speed)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 16.5, 13.5, 0),
    ("J_RV1", "SPEED_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 31.0, 13.5, 0),
    
    ("RV2", "10k (Tone)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 42.5, 13.5, 0),
    ("J_RV2", "TONE_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 56.5, 13.5, 0),
    
    ("RV3", "10k (Volume)", "Potentiometer_THT", "Potentiometer_Alps_RK09L_Single_Vertical", 68.5, 13.5, 0),
    ("J_RV3", "VOL_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 82.5, 13.5, 0),
    
    # Front Panel Green TX LED
    ("D1", "TX_GREEN_3mm", "LED_THT", "LED_D3.0mm", 91.0, 13.5, 0),
    ("J_LED", "TX_LED_WIRES", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 91.0, 20.0, 0),
    ("R3", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 91.0, 26.5, 0),
    
    # Dedicated OLED 0.96 Header (Left)
    ("J5", "OLED_0.96_I2C", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 18.0, 30.0, 90),
    
    # Arduino Nano Module
    ("A1", "Arduino_Nano", "Module", "Arduino_Nano", 42.38, 32.0, 0),
    
    # Left Zone (Paddle RF filter & Decoupling)
    ("C1", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 6.0, 48.0, 0),
    ("C2", "10nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 6.0, 55.0, 0),
    ("C6", "100uF", "Capacitor_THT", "CP_Radial_D6.3mm_P2.50mm", 12.0, 60.0, 0),
    ("C7", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 18.0, 60.0, 0),
    ("J1", "PADDLE_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x03_P2.54mm_Vertical", 10.0, 68.5, 90),
    
    # Key Out Isolation (X = 25..35 mm)
    ("R4", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 26.0, 48.0, 0),
    ("U2", "PC817", "Package_DIP", "DIP-4_W7.62mm", 26.0, 58.0, 0),
    ("D2", "1N4148", "Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal", 34.0, 52.0, 90),
    ("J2", "KEY_OUT_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 34.0, 68.5, 0),
    
    # Right Zone: Audio Butterworth Filter
    ("R1", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 34.0, 0),
    ("R2", "1k", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 78.0, 34.0, 0),
    ("C3", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 67.0, 42.0, 0),
    ("C4", "47nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 78.0, 42.0, 0),
    
    # Right Zone: Audio Amplifier
    ("R6", "470R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 67.0, 48.0, 0),
    ("Q1", "BC547", "Package_TO_SOT_THT", "TO-92_Inline", 80.0, 48.0, 0),
    ("C5", "100nF", "Capacitor_THT", "C_Disc_D5.0mm_W2.5mm_P5.00mm", 88.0, 48.0, 0),
    ("R7", "33R (1W)", "Resistor_THT", "R_Axial_DIN0411_L9.9mm_D3.6mm_P12.70mm_Horizontal", 68.0, 54.0, 0),
    ("J4", "SPEAKER_8R", "Connector_JST", "JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical", 93.0, 38.0, 0),
    
    # Headphones
    ("R8", "150R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 64.0, 62.0, 0),
    ("J7", "PHONES_3.5mm", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 64.0, 68.5, 90),
    
    # PTT Isolation
    ("R5", "330R", "Resistor_THT", "R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal", 74.0, 58.0, 0),
    ("U3", "PC817", "Package_DIP", "DIP-4_W7.62mm", 74.0, 65.0, 0),
    ("J3", "PTT_OUT_RCA", "Connector_PinHeader_2.54mm", "PinHeader_1x02_P2.54mm_Vertical", 86.0, 68.5, 0),
    
    # PS/2 Keyboard Header
    ("J6", "PS2_KEYBOARD", "Connector_PinHeader_2.54mm", "PinHeader_1x04_P2.54mm_Vertical", 93.0, 58.0, 0),
]

test_placement(components)

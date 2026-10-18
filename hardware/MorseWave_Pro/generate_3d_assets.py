"""
Generates 100% KiCad-compatible VRML 2.0 models with mm-scaled geometry:
1. Knob_Alps.wrl - 32-sided knurled aluminum instrument knob with pointer (centered at 0,0)
2. OLED_096.wrl - 0.96" I2C display extending from pin 1 (0,0)
3. Arduino_Nano.wrl - Arduino Nano module aligned to pin 1 (0,0)
4. LED_Green_3mm.wrl - 3mm Green LED with emerald glow aligned to pins (0,0) and (2.54,0)
"""
import math
import os

def generate_cylinder_faceset(radius, height, z_bottom, segments=32):
    """Generates VRML IndexedFaceSet for a smooth cylinder"""
    coords = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        coords.append(f"{x:.3f} {y:.3f} {z_bottom:.3f}")
    z_top = z_bottom + height
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        coords.append(f"{x:.3f} {y:.3f} {z_top:.3f}")
    
    coord_str = ",\n            ".join(coords)
    faces = []
    for i in range(segments):
        nxt = (i + 1) % segments
        faces.append(f"{i}, {nxt}, {nxt + segments}, {i + segments}, -1")
    top_indices = ", ".join(str(i + segments) for i in range(segments)) + ", -1"
    faces.append(top_indices)
    bot_indices = ", ".join(str(segments - 1 - i) for i in range(segments)) + ", -1"
    faces.append(bot_indices)
    face_str = ",\n            ".join(faces)
    
    return f"""IndexedFaceSet {{
          coord Coordinate {{
            point [
              {coord_str}
            ]
          }}
          coordIndex [
            {face_str}
          ]
          solid TRUE
        }}"""

def create_knob_wrl(path):
    # Centered at (0, 0) so KiCad can position it directly on Alps shaft at (7.5, 2.5)
    # Scaled in mm (KiCad scale = 0.3937)
    knob_body = generate_cylinder_faceset(7.0, 11.5, 7.5, segments=32)
    bezel = generate_cylinder_faceset(6.8, 0.4, 19.0, segments=32)
    top_cap = generate_cylinder_faceset(5.8, 0.3, 19.4, segments=32)
    bushing = generate_cylinder_faceset(3.5, 4.0, 3.5, segments=16)

    content = f"""#VRML V2.0 utf8
# Alps RK09L Machined Aluminum Instrument Knob (Centered at 0,0)
Group {{
  children [
    # 1. Threaded Bushing (Brass)
    Shape {{
      appearance Appearance {{
        material Material {{
          diffuseColor 0.78 0.68 0.28
          specularColor 0.8 0.7 0.3
          shininess 0.6
        }}
      }}
      geometry {bushing}
    }}

    # 2. Knurled Aluminum Knob Body (Dark Anodized Black)
    Shape {{
      appearance Appearance {{
        material Material {{
          diffuseColor 0.12 0.12 0.13
          specularColor 0.55 0.55 0.55
          shininess 0.7
        }}
      }}
      geometry {knob_body}
    }}

    # 3. Silver Aluminum Bezel Ring
    Shape {{
      appearance Appearance {{
        material Material {{
          diffuseColor 0.82 0.84 0.86
          specularColor 0.95 0.95 0.95
          shininess 0.9
        }}
      }}
      geometry {bezel}
    }}

    # 4. Top Cap
    Shape {{
      appearance Appearance {{
        material Material {{
          diffuseColor 0.08 0.08 0.09
          specularColor 0.3 0.3 0.3
          shininess 0.4
        }}
      }}
      geometry {top_cap}
    }}

    # 5. Crisp White Indicator Line (Pointer at Top)
    Transform {{
      translation 0.0 3.2 19.56
      children [
        Shape {{
          appearance Appearance {{
            material Material {{
              diffuseColor 0.95 0.95 0.95
              emissiveColor 0.2 0.2 0.2
            }}
          }}
          geometry Box {{
            size 1.0 4.8 0.15
          }}
        }}
      ]
    }}
  ]
}}
"""
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"Created {path}")

def create_oled_wrl(path):
    # Pin 1 at (0, 0, 0). 4 pins along Y: 0, 2.54, 5.08, 7.62 (center Y = 3.81)
    # Realistic 4-pin female socket header for OLED display / wire jumper ribbon
    content = """#VRML V2.0 utf8
# 4-Pin 2.54mm Socket Header for OLED Display (Origin at Pin 1)
Group {
  children [
    # 1. Black PBT Insulator Body
    Transform {
      translation 0.0 3.81 4.25
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.12 0.12 0.12
              specularColor 0.25 0.25 0.25
              shininess 0.3
            }
          }
          geometry Box {
            size 2.54 10.16 8.5
          }
        }
      ]
    }
    # 2. Gold Internal Spring Contact Insets (4x 2.54mm pitch)
    Transform {
      translation 0.0 0.0 8.45
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.85 0.72 0.22
              specularColor 0.95 0.85 0.35
              shininess 0.85
            }
          }
          geometry Box { size 1.1 1.1 0.12 }
        }
      ]
    }
    Transform {
      translation 0.0 2.54 8.45
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.85 0.72 0.22
              specularColor 0.95 0.85 0.35
              shininess 0.85
            }
          }
          geometry Box { size 1.1 1.1 0.12 }
        }
      ]
    }
    Transform {
      translation 0.0 5.08 8.45
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.85 0.72 0.22
              specularColor 0.95 0.85 0.35
              shininess 0.85
            }
          }
          geometry Box { size 1.1 1.1 0.12 }
        }
      ]
    }
    Transform {
      translation 0.0 7.62 8.45
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.85 0.72 0.22
              specularColor 0.95 0.85 0.35
              shininess 0.85
            }
          }
          geometry Box { size 1.1 1.1 0.12 }
        }
      ]
    }
  ]
}
"""
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"Created {path}")

def create_nano_wrl(path):
    # Origin at Pin 1 (0, 0, 0).
    # In KiCad board, Pin 1 is at top-left. Pins 1..15 extend downwards (KiCad -Y or +Y).
    # USB port is at bottom (rear edge).
    content = """#VRML V2.0 utf8
# Arduino Nano Module (Origin at Pin 1)
Group {
  children [
    # 1. Dual Socket Headers
    Transform {
      translation 0.0 -17.78 4.25
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.12 0.12 0.12
              specularColor 0.25 0.25 0.25
              shininess 0.3
            }
          }
          geometry Box {
            size 2.54 38.1 8.5
          }
        }
      ]
    }
    Transform {
      translation 15.24 -17.78 4.25
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.12 0.12 0.12
              specularColor 0.25 0.25 0.25
              shininess 0.3
            }
          }
          geometry Box {
            size 2.54 38.1 8.5
          }
        }
      ]
    }

    # 2. Arduino Nano PCB (Classic Dark Blue Substrate 17.8 x 43.5 x 1.6 mm)
    Transform {
      translation 7.62 -17.78 9.3
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.04 0.28 0.65
              specularColor 0.25 0.35 0.55
              shininess 0.5
            }
          }
          geometry Box {
            size 17.8 43.5 1.6
          }
        }
      ]
    }

    # 3. ATmega328P TQFP-32 Microcontroller
    Transform {
      translation 7.62 -14.0 10.6
      rotation 0 0 1 0.785398
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.15 0.15 0.16
              specularColor 0.3 0.3 0.3
              shininess 0.3
            }
          }
          geometry Box {
            size 7.0 7.0 1.0
          }
        }
      ]
    }

    # 4. Mini-USB Type B Metal Shell (at rear edge flush with PCB)
    Transform {
      translation 7.62 -38.0 11.6
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.85 0.87 0.90
              specularColor 0.95 0.95 0.95
              shininess 0.9
            }
          }
          geometry Box {
            size 7.5 9.0 4.0
          }
        }
      ]
    }

    # 5. LEDs (PWR Green, TX/RX Orange)
    Transform {
      translation 5.0 -22.0 10.3
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.1 0.8 0.2
              emissiveColor 0.05 0.5 0.1
            }
          }
          geometry Box {
            size 1.2 1.8 0.5
          }
        }
      ]
    }
  ]
}
"""
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"Created {path}")

def create_led_green_wrl(path):
    # 3mm Green LED, origin between pins
    # Pin 1 at (0, 0), Pin 2 at (2.54, 0)
    dome = generate_cylinder_faceset(1.5, 4.5, 0.0, segments=24)
    content = f"""#VRML V2.0 utf8
# 3mm Green LED (Emerald Translucent with Active Emission)
Group {{
  children [
    Transform {{
      translation 1.27 0.0 1.5
      children [
        Shape {{
          appearance Appearance {{
            material Material {{
              diffuseColor 0.10 0.85 0.25
              emissiveColor 0.05 0.50 0.15
              transparency 0.25
              specularColor 0.9 0.95 0.9
              shininess 0.9
            }}
          }}
          geometry {dome}
        }}
      ]
    }}
  ]
}}
"""
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"Created {path}")

def create_led_red_wrl(path):
    # 3mm Red LED (Ruby Translucent with Active Key Emission)
    dome = generate_cylinder_faceset(1.5, 4.5, 0.0, segments=24)
    content = f"""#VRML V2.0 utf8
# 3mm Red LED (Ruby Translucent with Active Key Emission)
Group {{
  children [
    Transform {{
      translation 1.27 0.0 1.5
      children [
        Shape {{
          appearance Appearance {{
            material Material {{
              diffuseColor 0.88 0.10 0.10
              emissiveColor 0.55 0.05 0.05
              transparency 0.25
              specularColor 0.95 0.9 0.9
              shininess 0.9
            }}
          }}
          geometry {dome}
        }}
      ]
    }}
  ]
}}
"""
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"Created {path}")

if __name__ == "__main__":
    out_dir = r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels"
    create_knob_wrl(os.path.join(out_dir, "Knob_Alps.wrl"))
    create_oled_wrl(os.path.join(out_dir, "OLED_096.wrl"))
    create_nano_wrl(os.path.join(out_dir, "Arduino_Nano.wrl"))
    create_led_green_wrl(os.path.join(out_dir, "LED_Green_3mm.wrl"))
    create_led_red_wrl(os.path.join(out_dir, "LED_Red_3mm.wrl"))


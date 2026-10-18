"""
Generates 100% KiCad-compatible VRML 2.0 models using IndexedFaceSet primitives:
1. Knob_Alps.wrl - 24-sided knurled aluminum instrument knob with pointer
2. OLED_096.wrl - 0.96" I2C display extending downwards over Arduino Nano
"""
import math

def generate_cylinder_faceset(radius, height, z_bottom, segments=24):
    """Generates VRML IndexedFaceSet for a smooth cylinder"""
    coords = []
    # Bottom circle vertices (0 to segments-1)
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        coords.append(f"{x:.3f} {y:.3f} {z_bottom:.3f}")
    # Top circle vertices (segments to 2*segments-1)
    z_top = z_bottom + height
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        coords.append(f"{x:.3f} {y:.3f} {z_top:.3f}")
    
    coord_str = ",\n            ".join(coords)
    
    # Side faces
    faces = []
    for i in range(segments):
        nxt = (i + 1) % segments
        b1 = i
        b2 = nxt
        t1 = i + segments
        t2 = nxt + segments
        faces.append(f"{b1}, {b2}, {t2}, {t1}, -1")
    
    # Top face
    top_indices = ", ".join(str(i + segments) for i in range(segments)) + ", -1"
    faces.append(top_indices)
    
    # Bottom face
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
    # Center is at X = 7.5 mm, Y = -2.5 mm in local Alps RK09L footprint
    cx = 7.5
    cy = -2.5
    
    # Knob body: radius 7.5 mm, height 11.5 mm, from z = 7.5 to 19.0 mm
    knob_body = generate_cylinder_faceset(7.5, 11.5, 7.5, segments=32)
    # Silver bezel: radius 7.2 mm, height 0.4 mm, from z = 19.0 to 19.4 mm
    bezel = generate_cylinder_faceset(7.2, 0.4, 19.0, segments=32)
    # Recessed top cap: radius 6.0 mm, height 0.3 mm, from z = 19.4 to 19.7 mm
    top_cap = generate_cylinder_faceset(6.0, 0.3, 19.4, segments=32)
    # Bushing: radius 3.5 mm, height 4.0 mm, from z = 3.5 to 7.5 mm
    bushing = generate_cylinder_faceset(3.5, 4.0, 3.5, segments=16)

    content = f"""#VRML V2.0 utf8
# Alps RK09L with Machined Aluminum Instrument Knob (IndexedFaceSet)
Group {{
  children [
    # 1. Alps Potentiometer Housing (Blue/metal body)
    Transform {{
      translation {cx} {cy} 3.25
      children [
        Shape {{
          appearance Appearance {{
            material Material {{
              diffuseColor 0.12 0.42 0.55
              specularColor 0.3 0.3 0.3
              shininess 0.3
            }}
          }}
          geometry Box {{
            size 9.8 11.0 6.5
          }}
        }}
      ]
    }}

    # 2. Threaded Bushing (Brass)
    Transform {{
      translation {cx} {cy} 0
      children [
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
      ]
    }}

    # 3. Knurled Aluminum Knob Body (Dark Anodized Black)
    Transform {{
      translation {cx} {cy} 0
      children [
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
      ]
    }}

    # 4. Silver Aluminum Bezel Ring
    Transform {{
      translation {cx} {cy} 0
      children [
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
      ]
    }}

    # 5. Top Cap
    Transform {{
      translation {cx} {cy} 0
      children [
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
      ]
    }}

    # 6. Crisp White Position Indicator Line (Notch)
    Transform {{
      translation {cx} {cy + 4.2} 19.8
      children [
        Shape {{
          appearance Appearance {{
            material Material {{
              diffuseColor 0.98 0.98 0.98
              emissiveColor 0.3 0.3 0.3
            }}
          }}
          geometry Box {{
            size 1.2 3.6 0.25
          }}
        }}
      ]
    }}
  ]
}}
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Created {path}")

def create_oled_wrl(path):
    # In local footprint rotated by 90 deg:
    # local +X maps to global +Y (downwards on PCB towards Nano)
    # In the previous render, +13.5 pointed UP, so -13.5 points DOWN!
    content = """#VRML V2.0 utf8
# OLED 0.96 inch I2C Display Module 3D Model
Group {
  children [
    # 1. 4-Pin Female Header Socket on PCB
    Transform {
      translation 0.0 -3.81 4.25
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

    # 2. OLED Module Substrate PCB (27.0 x 27.0 x 1.6 mm, Dark Blue)
    # Centered at local X = +10.5 mm (extends DOWN squarely inside dedicated OLED Zone on left: X = 4..34, Y = 26..56)
    Transform {
      translation 10.5 -3.81 14.5
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.05 0.25 0.65
              specularColor 0.2 0.3 0.5
              shininess 0.4
            }
          }
          geometry Box {
            size 27.0 27.0 1.6
          }
        }
      ]
    }

    # 3. Shiny Glass OLED Display Panel (24.0 x 14.5 x 1.2 mm)
    Transform {
      translation 9.5 -3.81 15.9
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.04 0.05 0.06
              specularColor 0.85 0.85 0.9
              shininess 0.95
            }
          }
          geometry Box {
            size 15.0 24.5 1.2
          }
        }
      ]
    }

    # 4. Active Lit OLED Matrix (Cyan glowing CW status display)
    Transform {
      translation 9.5 -3.81 16.55
      children [
        Shape {
          appearance Appearance {
            material Material {
              diffuseColor 0.02 0.25 0.45
              emissiveColor 0.08 0.55 0.75
              specularColor 0.9 0.95 1.0
              shininess 0.95
            }
          }
          geometry Box {
            size 12.5 22.0 0.1
          }
        }
      ]
    }
  ]
}
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Created {path}")

create_knob_wrl(r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels\Knob_Alps.wrl")
create_oled_wrl(r"e:\dev\morse-trainer\hardware\MorseWave_Pro\3dmodels\OLED_096.wrl")

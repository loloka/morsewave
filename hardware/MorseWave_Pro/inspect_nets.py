import pcbnew

b = pcbnew.LoadBoard(r"e:\dev\morse-trainer\hardware\MorseWave_Pro\MorseWave_Pro\MorseWave_Pro.kicad_pcb")
print("Total footprints:", len(b.Footprints()))
net_pads = {}
for p in b.GetPads():
    netname = p.GetNetname()
    if netname and netname != "GND":
        if netname not in net_pads:
            net_pads[netname] = []
        fp = p.GetParentFootprint()
        ref = fp.GetReference() if fp else "?"
        pos = p.GetPosition()
        net_pads[netname].append((f"{ref}:{p.GetNumber()}", round(pos.x/1e6, 2), round(pos.y/1e6, 2)))

print(f"Total non-GND nets: {len(net_pads)}")
for netname, pads in sorted(net_pads.items()):
    print(f"\nNet: {netname} ({len(pads)} pads)")
    for p in pads:
        print(f"  {p[0]} at ({p[1]}, {p[2]})")

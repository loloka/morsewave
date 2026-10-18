import json

d = json.load(open('drc_report.json', encoding='utf-8'))
for v in d.get('violations', []):
    if v.get('type') in ['tracks_crossing', 'shorting_items']:
        items = [i.get('description') for i in v.get('items', [])]
        print(f"\n{v.get('type')}: {v.get('description')}")
        for it in items:
            print(f"   {it}")

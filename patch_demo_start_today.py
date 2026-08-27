from pathlib import Path
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')
old="HISTORY=7,START='2026-07-01'"
new="HISTORY=7,START='2026-08-27'"
if old not in s:
    raise SystemExit('START target not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

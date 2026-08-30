from pathlib import Path
p=Path('online-kviz.html')
s=p.read_text(encoding='utf-8')
old='<script src="leaderboards.js"></script>'
new='<script src="leaderboards.js?v=20260830-1"></script>'
count=s.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly 1 match, found {count}')
p.write_text(s.replace(old,new),encoding='utf-8')

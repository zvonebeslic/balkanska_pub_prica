from pathlib import Path
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '<div class="stats-number" data-count="5000" data-suffix="+">0</div>'
new = '<div class="stats-number" data-count="6000" data-suffix="+">0</div>'
if old not in s:
    raise SystemExit('target not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

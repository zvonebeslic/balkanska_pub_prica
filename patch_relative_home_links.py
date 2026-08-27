from pathlib import Path

# online-kviz.html
p=Path('online-kviz.html')
s=p.read_text(encoding='utf-8')
s=s.replace('href="/index.html" class="nav-btn nav-btn--secondary"','href="index.html" class="nav-btn nav-btn--secondary"',1)
p.write_text(s,encoding='utf-8')

# profil.html
p=Path('profil.html')
s=p.read_text(encoding='utf-8')
s=s.replace('href="/index.html" class="brand-logo"','href="index.html" class="brand-logo"',1)
s=s.replace('window.location.replace("/index.html")','window.location.replace("index.html")')
p.write_text(s,encoding='utf-8')

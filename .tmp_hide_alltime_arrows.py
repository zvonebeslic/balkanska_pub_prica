from pathlib import Path
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')
old="tabs(root,v);ensurePreviewDateNav();const pr=document.getElementById('leaderboard-preview-period');if(pr)pr.textContent=period(v,a);"
new="tabs(root,v);ensurePreviewDateNav();const nav=document.getElementById('leaderboard-preview-date-nav');if(nav)nav.classList.toggle('is-all-time',v==='all');const pr=document.getElementById('leaderboard-preview-period');if(pr)pr.textContent=period(v,a);"
if s.count(old)!=1: raise SystemExit(f'preview match {s.count(old)}')
s=s.replace(old,new,1)
old="tabs(root,v);document.getElementById('leaderboard-full-period')?.classList.remove('is-all-time');const lab=document.getElementById('leaderboard-full-period-label');"
new="tabs(root,v);document.getElementById('leaderboard-full-period')?.classList.toggle('is-all-time',v==='all');const lab=document.getElementById('leaderboard-full-period-label');"
if s.count(old)!=1: raise SystemExit(f'full match {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

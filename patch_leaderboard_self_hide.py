from pathlib import Path
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')
old="input.addEventListener('change',()=>{void window.KvizDaily30?.setLeaderboardVisibility?.(input.checked)})"
new="input.addEventListener('change',()=>{try{localStorage.setItem('kviztogo_daily30_leaderboard_visible_v1',input.checked?'1':'0')}catch(_){}renderPreview();if(document.getElementById('leaderboard-page')?.classList.contains('open'))renderPage();void window.KvizDaily30?.setLeaderboardVisibility?.(input.checked)})"
if old not in s:
    raise SystemExit('target listener not found exactly once')
if s.count(old)!=1:
    raise SystemExit(f'target listener count {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('patched leaderboards.js only')

from pathlib import Path

p = Path('leaderboards.js')
s = p.read_text(encoding='utf-8')

old = "function shiftPreview(dir){const v=previewState.view;if(v==='all')return;const a=getAnchor(previewState,v);if(dir<0&&!hasPreviousCompletePeriod(v,a))return;const next=v==='week'?addDays(weekStart(a),dir*7):v==='month'?addMonths(monthStart(a),dir):addDays(a,dir);setAnchor(previewState,v,next);const root=document.getElementById('leaderboard-preview');if(root)root.dataset.expanded='0';renderPreview();if(document.getElementById('leaderboard-page')?.classList.contains('open'))renderPage()}"
new = "function shiftPreview(dir){const v=previewState.view;if(v==='all')return;const a=getAnchor(previewState,v);if(dir<0&&!hasPreviousCompletePeriod(v,a))return;const next=v==='week'?(dir<0?addDays(weekStart(a),-1):addDays(weekStart(a),7)):v==='month'?(dir<0?addDays(monthStart(a),-1):addMonths(monthStart(a),1)):addDays(a,dir);setAnchor(previewState,v,next);const root=document.getElementById('leaderboard-preview');if(root)root.dataset.expanded='0';renderPreview();if(document.getElementById('leaderboard-page')?.classList.contains('open'))renderPage()}"
if s.count(old) != 1:
    raise SystemExit(f'shiftPreview expected exactly 1 match, found {s.count(old)}')
s = s.replace(old, new)

old = "function shift(dir){const v=pageState.view;if(v==='all')return;const a=getAnchor(pageState,v);if(dir<0&&!hasPreviousCompletePeriod(v,a))return;const next=v==='week'?addDays(weekStart(a),dir*7):v==='month'?addMonths(monthStart(a),dir):addDays(a,dir);setAnchor(pageState,v,next);renderPage()}"
new = "function shift(dir){const v=pageState.view;if(v==='all')return;const a=getAnchor(pageState,v);if(dir<0&&!hasPreviousCompletePeriod(v,a))return;const next=v==='week'?(dir<0?addDays(weekStart(a),-1):addDays(weekStart(a),7)):v==='month'?(dir<0?addDays(monthStart(a),-1):addMonths(monthStart(a),1)):addDays(a,dir);setAnchor(pageState,v,next);renderPage()}"
if s.count(old) != 1:
    raise SystemExit(f'shift expected exactly 1 match, found {s.count(old)}')
s = s.replace(old, new)

old = "el.querySelectorAll('[data-leaderboard-view]').forEach(b=>b.addEventListener('click',()=>{pageState.view=b.dataset.leaderboardView;if(pageState.view!=='all'&&!pageState.anchors[pageState.view])pageState.anchors[pageState.view]=getAnchor(previewState,pageState.view);renderPage()}));"
new = "el.querySelectorAll('[data-leaderboard-view]').forEach(b=>b.addEventListener('click',()=>{pageState.view=b.dataset.leaderboardView;if(pageState.view!=='all')pageState.anchors[pageState.view]=today();renderPage()}));"
if s.count(old) != 1:
    raise SystemExit(f'page tab handler expected exactly 1 match, found {s.count(old)}')
s = s.replace(old, new)

old = "root.querySelectorAll('[data-leaderboard-view]').forEach(b=>b.addEventListener('click',()=>{previewState.view=b.dataset.leaderboardView;if(previewState.view!=='all'&&!previewState.anchors[previewState.view])previewState.anchors[previewState.view]=today();root.dataset.expanded='0';document.getElementById('leaderboard-page')?.classList.remove('open');renderPreview()}));"
new = "root.querySelectorAll('[data-leaderboard-view]').forEach(b=>b.addEventListener('click',()=>{previewState.view=b.dataset.leaderboardView;if(previewState.view!=='all')previewState.anchors[previewState.view]=today();root.dataset.expanded='0';document.getElementById('leaderboard-page')?.classList.remove('open');renderPreview()}));"
if s.count(old) != 1:
    raise SystemExit(f'preview tab handler expected exactly 1 match, found {s.count(old)}')
s = s.replace(old, new)

p.write_text(s, encoding='utf-8')

p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')
old = '<script src="leaderboards.js?v=20260831-1"></script>'
new = '<script src="leaderboards.js?v=20260831-2"></script>'
if s.count(old) != 1:
    raise SystemExit(f'online-kviz version expected exactly 1 match, found {s.count(old)}')
p.write_text(s.replace(old,new), encoding='utf-8')

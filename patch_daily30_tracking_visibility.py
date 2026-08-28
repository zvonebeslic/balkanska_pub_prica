from pathlib import Path

# GitHub's current online-kviz.html already tracks Daily30 like other modes.
# Refuse to touch it here; just verify the old blockers are absent.
html = Path('online-kviz.html').read_text(encoding='utf-8')
blocked = [
    'async function saveQuizAnswer(question, userAnswer, result, skipped) {\n    if (currentMode === "daily30") return;',
    'async function saveQuestionVote(question, vote) {\n    if (currentMode === "daily30") return false;',
    'async function updateQuizTracking() {\n    if (currentMode === "daily30") return;',
]
for marker in blocked:
    if marker in html:
        raise SystemExit('Old Daily30 tracking blocker still present in GitHub online-kviz.html')

# Remaining bug: authenticated owners are allowed by RLS to read their own hidden row,
# so the frontend must omit that row while the visibility switch is OFF.
lb_path = Path('leaderboards.js')
lb = lb_path.read_text(encoding='utf-8')
old = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);"
new = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);if(!ownVisible()&&ownKey)rows=rows.filter(x=>x.player_key!==ownKey);"
if new in lb:
    print('Visibility fix already present')
elif lb.count(old) == 1:
    lb = lb.replace(old, new, 1)
    lb_path.write_text(lb, encoding='utf-8')
    print('Patched only leaderboards.js')
else:
    raise SystemExit(f'Expected one remoteRows match, got {lb.count(old)}')

from pathlib import Path
import re

html_path = Path('online-kviz.html')
text = html_path.read_text(encoding='utf-8')

# Remove only Daily30 exclusions from the generic counters/tracking functions.
patterns = [
    (r'(function\s+markRareQuestionSeen\s*\([^)]*\)\s*\{\s*)if\s*\(currentMode\s*===\s*["\']daily30["\']\)\s*return;\s*', r'\1'),
    (r'(function\s+markLocalQuestionDiscovered\s*\([^)]*\)\s*\{\s*)if\s*\(currentMode\s*===\s*["\']daily30["\']\)\s*return;\s*', r'\1'),
    (r'(async\s+function\s+saveQuizAnswer\s*\([^)]*\)\s*\{\s*)if\s*\(currentMode\s*===\s*["\']daily30["\']\)\s*return;\s*', r'\1'),
    (r'(async\s+function\s+saveQuestionVote\s*\([^)]*\)\s*\{\s*)if\s*\(currentMode\s*===\s*["\']daily30["\']\)\s*return\s+false;\s*', r'\1'),
    (r'(async\s+function\s+updateQuizTracking\s*\([^)]*\)\s*\{\s*)if\s*\(currentMode\s*===\s*["\']daily30["\']\)\s*return;\s*', r'\1'),
]
for pattern, replacement in patterns:
    text, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Expected exactly one targeted match, got {count}: {pattern}')

# Daily30 should also count in the same local play counters as other modes.
old = '    if (currentLocalGameMode !== "daily30") updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n    if (currentLocalGameMode === "daily30") return;'
new = '    updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;'
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one finalizeLocalGame Daily30 exclusion, got {count}')
text = text.replace(old, new, 1)
html_path.write_text(text, encoding='utf-8')

# When a signed-in player hides themselves, Supabase still allows that owner to read
# their own hidden row. Filter that own row from rendered leaderboard while hidden.
lb_path = Path('leaderboards.js')
lb = lb_path.read_text(encoding='utf-8')
old = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);"
new = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);if(!ownVisible()&&ownKey)rows=rows.filter(x=>x.player_key!==ownKey);"
count = lb.count(old)
if count != 1:
    raise SystemExit(f'Expected one remoteRows match, got {count}')
lb = lb.replace(old, new, 1)
lb_path.write_text(lb, encoding='utf-8')

print('Patched only online-kviz.html and leaderboards.js')

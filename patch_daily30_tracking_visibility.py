from pathlib import Path

# Minimal, targeted production patch.
html_path = Path('online-kviz.html')
text = html_path.read_text(encoding='utf-8')

replacements = [
    ('    if (currentMode === "daily30") return;\n    const rarity = normalizeQuestionRarity(question);',
     '    const rarity = normalizeQuestionRarity(question);'),
    ('    if (currentMode === "daily30") return;\n    if (!question) return;',
     '    if (!question) return;'),
    ('    if (currentLocalGameMode !== "daily30") updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n    if (currentLocalGameMode === "daily30") return;',
     '    updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;'),
    ('  async function saveQuizAnswer(question, userAnswer, result, skipped) {\n    if (currentMode === "daily30") return;\n    if (!supabaseClient || !question || !activeQuizSessionId) return;',
     '  async function saveQuizAnswer(question, userAnswer, result, skipped) {\n    if (!supabaseClient || !question || !activeQuizSessionId) return;'),
    ('  async function saveQuestionVote(question, vote) {\n    if (currentMode === "daily30") return false;\n    if (!supabaseClient || !question || !activeQuizSessionId || !["like", "dislike"].includes(vote)) return false;',
     '  async function saveQuestionVote(question, vote) {\n    if (!supabaseClient || !question || !activeQuizSessionId || !["like", "dislike"].includes(vote)) return false;'),
    ('  async function updateQuizTracking() {\n    if (currentMode === "daily30") return;\n    if (!supabaseClient || !activeQuizPlayId || !activeQuizStartedAt) return;',
     '  async function updateQuizTracking() {\n    if (!supabaseClient || !activeQuizPlayId || !activeQuizStartedAt) return;'),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'online-kviz.html expected exactly 1 match, got {count}: {old[:80]!r}')
    text = text.replace(old, new, 1)

html_path.write_text(text, encoding='utf-8')

lb_path = Path('leaderboards.js')
lb = lb_path.read_text(encoding='utf-8')
old = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);"
new = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);if(!ownVisible()&&ownKey)rows=rows.filter(x=>x.player_key!==ownKey);"
count = lb.count(old)
if count != 1:
    raise SystemExit(f'leaderboards.js expected exactly 1 remoteRows match, got {count}')
lb = lb.replace(old, new, 1)
lb_path.write_text(lb, encoding='utf-8')

print('Patched only online-kviz.html and leaderboards.js')

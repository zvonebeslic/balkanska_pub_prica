from pathlib import Path

online_path = Path('online-kviz.html')
leader_path = Path('leaderboards.js')

online = online_path.read_text(encoding='utf-8')
leader = leader_path.read_text(encoding='utf-8')

replacements = [
    (
        '  async function saveQuizAnswer(question, userAnswer, result, skipped) {\n    if (currentMode === "daily30") return;\n    if (!supabaseClient || !question || !activeQuizSessionId) return;',
        '  async function saveQuizAnswer(question, userAnswer, result, skipped) {\n    if (!supabaseClient || !question || !activeQuizSessionId) return;'
    ),
    (
        '  async function saveQuestionVote(question, vote) {\n    if (currentMode === "daily30") return false;\n    if (!supabaseClient || !question || !activeQuizSessionId || !["like", "dislike"].includes(vote)) return false;',
        '  async function saveQuestionVote(question, vote) {\n    if (!supabaseClient || !question || !activeQuizSessionId || !["like", "dislike"].includes(vote)) return false;'
    ),
    (
        '  async function updateQuizTracking() {\n    if (currentMode === "daily30") return;\n    if (!supabaseClient || !activeQuizPlayId || !activeQuizStartedAt) return;',
        '  async function updateQuizTracking() {\n    if (!supabaseClient || !activeQuizPlayId || !activeQuizStartedAt) return;'
    ),
]

for old, new in replacements:
    count = online.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly 1 match in online-kviz.html, got {count}: {old[:80]}')
    online = online.replace(old, new, 1)

old_remote = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);"
new_remote = "function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.(),t=today();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=t);if(!ownVisible()&&ownKey)rows=rows.filter(x=>x.player_key!==ownKey);"
count = leader.count(old_remote)
if count != 1:
    raise SystemExit(f'Expected exactly 1 remoteRows match in leaderboards.js, got {count}')
leader = leader.replace(old_remote, new_remote, 1)

online_path.write_text(online, encoding='utf-8')
leader_path.write_text(leader, encoding='utf-8')
print('Patched only Daily30 tracking guards and own hidden leaderboard row filtering.')

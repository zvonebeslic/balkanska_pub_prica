from pathlib import Path

p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')

repls = [
('  let currentLocalGameTheme = null;\n  let playerIdentity = { isGuest: true, userId: null, name: "Gost" };',
 '  let currentLocalGameTheme = null;\n  let currentDaily30CountsForProfile = true;\n  let playerIdentity = { isGuest: true, userId: null, name: "Gost" };'),
('  function markLocalQuestionDiscovered(question) {\n    if (!question) return;',
 '  function markLocalQuestionDiscovered(question) {\n    if (currentMode === "daily30" && !currentDaily30CountsForProfile) return;\n    if (!question) return;'),
('    currentLocalGameMode = currentMode;\n    currentLocalGameTheme = currentThemeTopic;\n    localGameActive = true;\n    startLocalPlayClock();',
 '''    currentLocalGameMode = currentMode;\n    currentLocalGameTheme = currentThemeTopic;\n    currentDaily30CountsForProfile = true;\n    if (currentLocalGameMode === "daily30") {\n      const dailyDate = window.KvizDaily30?.getActiveDate?.() || window.KvizDaily30?.getSelectedDate?.() || null;\n      const dailyResults = window.KvizDaily30?.getResults?.() || {};\n      currentDaily30CountsForProfile = Boolean(dailyDate && !dailyResults[dailyDate]);\n    }\n    localGameActive = true;\n    if (currentLocalGameMode !== "daily30" || currentDaily30CountsForProfile) startLocalPlayClock();'''),
('    localStats.totalCorrect += ok ? 1 : 0;\n    localStats.totalWrong += ok ? 0 : 1;\n\n    const newlyCollectedRarity = !dailyOnly && ok ? collectRareAnswer(question) : null;',
 '''    const countsForProfile = !dailyOnly || currentDaily30CountsForProfile;\n    if (countsForProfile) {\n      localStats.totalCorrect += ok ? 1 : 0;\n      localStats.totalWrong += ok ? 0 : 1;\n    }\n\n    const newlyCollectedRarity = countsForProfile && ok ? collectRareAnswer(question) : null;'''),
('      currentGameLongestStreak = Math.max(currentGameLongestStreak, currentGameStreak);\n      localStats.longestStreak = Math.max(localStats.longestStreak, currentGameStreak);',
 '''      currentGameLongestStreak = Math.max(currentGameLongestStreak, currentGameStreak);\n      if (!dailyOnly || currentDaily30CountsForProfile) {\n        localStats.longestStreak = Math.max(localStats.longestStreak, currentGameStreak);\n      }'''),
('    saveLocalStats();\n    if (newlyCollectedRarity) {',
 '''    if (!dailyOnly || currentDaily30CountsForProfile) saveLocalStats();\n    if (newlyCollectedRarity) {'''),
('  function finalizeLocalGame(completed) {\n    if (!localGameActive) return;\n    updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n\n    if (currentGameHistory.length > 0) {',
 '''  function finalizeLocalGame(completed) {\n    if (!localGameActive) return;\n    if (currentLocalGameMode !== "daily30" || currentDaily30CountsForProfile) updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n\n    if (currentGameHistory.length > 0) {\n      if (currentLocalGameMode === "daily30" && !currentDaily30CountsForProfile) return;'''),
]

for old, new in repls:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, got {count}: {old[:100]!r}')
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

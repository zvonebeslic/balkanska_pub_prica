from pathlib import Path

p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')

repls = [
    ('  function markLocalQuestionDiscovered(question) {\n    if (currentMode === "daily30") return;\n    if (!question) return;',
     '  function markLocalQuestionDiscovered(question) {\n    if (!question) return;'),
    ('    localGameActive = true;\n    if (currentLocalGameMode !== "daily30") startLocalPlayClock();\n    updateHistoryDownloadButton();',
     '    localGameActive = true;\n    startLocalPlayClock();\n    updateHistoryDownloadButton();'),
    ('    const dailyOnly = currentLocalGameMode === "daily30";\n\n    if (!dailyOnly) {\n      localStats.totalCorrect += ok ? 1 : 0;\n      localStats.totalWrong += ok ? 0 : 1;\n    }',
     '    const dailyOnly = currentLocalGameMode === "daily30";\n\n    localStats.totalCorrect += ok ? 1 : 0;\n    localStats.totalWrong += ok ? 0 : 1;'),
    ('      currentGameLongestStreak = Math.max(currentGameLongestStreak, currentGameStreak);\n      if (!dailyOnly) localStats.longestStreak = Math.max(localStats.longestStreak, currentGameStreak);',
     '      currentGameLongestStreak = Math.max(currentGameLongestStreak, currentGameStreak);\n      localStats.longestStreak = Math.max(localStats.longestStreak, currentGameStreak);'),
    ('    if (!dailyOnly) saveLocalStats();',
     '    saveLocalStats();'),
    ('    if (!localGameActive) return;\n    if (currentLocalGameMode !== "daily30") updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n    if (currentLocalGameMode === "daily30") return;\n\n    if (currentGameHistory.length > 0) {',
     '    if (!localGameActive) return;\n    updateLocalPlayClock(true);\n    stopLocalPlayClock();\n    localGameActive = false;\n\n    if (currentGameHistory.length > 0) {'),
]

for old, new in repls:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, got {count}: {old[:90]!r}')
    s = s.replace(old, new, 1)

# Daily 30 contributes to overall game totals, but keeps its dedicated per-mode stats separate.
old = '''      localStats.longestStreak = Math.max(localStats.longestStreak, currentGameLongestStreak);\n\n      const modeKey = currentLocalGameMode === "themed"\n        ? "themed"\n        : currentLocalGameMode === "relax"\n          ? "relax"\n          : "blitz60";'''
new = '''      localStats.longestStreak = Math.max(localStats.longestStreak, currentGameLongestStreak);\n\n      if (currentLocalGameMode === "daily30") {\n        saveLocalStats();\n        return;\n      }\n\n      const modeKey = currentLocalGameMode === "themed"\n        ? "themed"\n        : currentLocalGameMode === "relax"\n          ? "relax"\n          : "blitz60";'''
if s.count(old) != 1:
    raise SystemExit(f'Expected one Daily30 finalize insertion point, got {s.count(old)}')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

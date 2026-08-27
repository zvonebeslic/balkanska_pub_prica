from pathlib import Path
import re
p=Path('online-kviz.html')
s=p.read_text(encoding='utf-8')

style_anchor='''.player-mode-section--themed {\n  border-color: rgba(148, 163, 184, 0.28);\n}\n'''
style_add='''.player-mode-section--themed {\n  border-color: rgba(148, 163, 184, 0.28);\n}\n\n.player-mode-section--daily30 {\n  border-color: rgba(250, 204, 21, 0.38);\n  background:\n    radial-gradient(circle at top right, rgba(250, 204, 21, 0.10), transparent 42%),\n    rgba(255, 255, 255, 0.045);\n}\n'''
if '.player-mode-section--daily30' not in s:
    if style_anchor not in s: raise SystemExit('style anchor not found')
    s=s.replace(style_anchor,style_add,1)

block='''        <section class="player-mode-section player-mode-section--daily30">\n          <div class="player-section-heading"><div><div class="player-section-title" id="profile-daily30-title">Dnevnih 30</div><div class="player-section-copy" id="profile-daily30-copy">Broje se samo dnevni kvizovi odigrani na dan kada su aktivni.</div></div><span class="player-section-chip">30</span></div>\n          <div class="player-mode-stats">\n            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-result-label">Ukupni rezultat</div><div class="player-mode-stat-value" id="daily30-total-result">0/0</div><div class="player-stat-sub" id="daily30-total-percent">0% uspješnosti</div></div>\n            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-best-label">Najbolja partija</div><div class="player-mode-stat-value" id="daily30-best-result">0/0</div><div class="player-stat-sub" id="daily30-best-percent">0% uspješnosti</div></div>\n            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-games-label">Odigrano dana</div><div class="player-mode-stat-value" id="daily30-games-played">0</div></div>\n            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-streak-label">Najduži niz točnih</div><div class="player-mode-stat-value" id="daily30-longest-streak">0</div></div>\n          </div>\n        </section>\n'''
if 'id="profile-daily30-title"' not in s:
    m=re.search(r'(?m)^\s*<section class="player-upcoming-card player-upcoming-card--collections"[^>]*>',s)
    if not m: raise SystemExit('html anchor not found')
    s=s[:m.start()]+block+s[m.start():]

helper_anchor='''  function updatePlayerStatsUI() {'''
helper='''  function getOnlineDaily30ProfileStats() {\n    const empty = { gamesPlayed:0, totalCorrect:0, totalWrong:0, bestScore:0, bestTotal:0, bestPercent:0, longestStreak:0 };\n    let results = {};\n    try { results = window.KvizDaily30?.getResults?.() || {}; } catch (_) { return empty; }\n    const official = Object.values(results).filter(r => r && r.official === true && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(r.date || "")));\n    if (!official.length) return empty;\n    let totalCorrect=0,totalWrong=0,bestScore=0,bestTotal=0,bestPercent=0;\n    official.forEach(r => {\n      const score=Math.max(0,Number(r.score)||0), total=Math.max(score,Number(r.total)||30), pct=total?Math.round(score/total*100):0;\n      totalCorrect += score; totalWrong += Math.max(0,total-score);\n      if (pct > bestPercent || (pct === bestPercent && score > bestScore)) { bestPercent=pct; bestScore=score; bestTotal=total; }\n    });\n    let longestStreak=0;\n    try { longestStreak=Math.max(0,Number(window.KvizDaily30Achievements?.getStats?.()?.bestStreak)||0); } catch (_) {}\n    return { gamesPlayed:official.length,totalCorrect,totalWrong,bestScore,bestTotal,bestPercent,longestStreak };\n  }\n\n'''
if 'function getOnlineDaily30ProfileStats()' not in s:
    if helper_anchor not in s: raise SystemExit('helper anchor not found')
    s=s.replace(helper_anchor,helper+helper_anchor,1)

old='''    setModeStats("blitz", blitz);\n    setModeStats("relax", relax);\n    setModeStats("themed", themed);\n    setText("themed-topics-chip", formatPlayerText("themesCount", { count: themed.themesPlayed.length }));'''
new='''    setModeStats("blitz", blitz);\n    setModeStats("relax", relax);\n    setModeStats("themed", themed);\n    setModeStats("daily30", getOnlineDaily30ProfileStats());\n    const daily30English = document.documentElement.lang === "en";\n    setText("profile-daily30-title", daily30English ? "Daily 30" : "Dnevnih 30");\n    setText("profile-daily30-copy", daily30English ? "Only Daily 30 quizzes played on their live day are counted." : "Broje se samo dnevni kvizovi odigrani na dan kada su aktivni.");\n    setText("daily30-result-label", daily30English ? "Total score" : "Ukupni rezultat");\n    setText("daily30-best-label", daily30English ? "Best game" : "Najbolja partija");\n    setText("daily30-games-label", daily30English ? "Days played" : "Odigrano dana");\n    setText("daily30-streak-label", daily30English ? "Longest correct streak" : "Najduži niz točnih");\n    setText("themed-topics-chip", formatPlayerText("themesCount", { count: themed.themesPlayed.length }));'''
if old not in s: raise SystemExit('render anchor not found')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')

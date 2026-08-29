from pathlib import Path

# 1) online-kviz.html: keep Daily 30 results/history visible after question 30,
# and refresh the few remaining static HR/EN labels on language switch.
p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')

old = '''    closeMobileQuizFocus();\n\n    const questionTextEl = document.getElementById("question-text");'''
new = '''    closeMobileQuizFocus();\n    document.body.classList.add("quiz-results-visible");\n\n    const questionTextEl = document.getElementById("question-text");'''
if old not in s:
    raise SystemExit('Daily30 finish anchor not found or already changed unexpectedly')
s = s.replace(old, new, 1)

old = '''  function refreshDynamicLanguageText() {\n    const btnStart = document.getElementById("btn-start");'''
new = '''  function refreshDynamicLanguageText() {\n    const isEnglish = currentLang === "en";\n\n    const leaderboardTitle = document.getElementById("leaderboard-preview-title");\n    if (leaderboardTitle) leaderboardTitle.textContent = isEnglish ? "🏆 Knowledge leaderboard" : "🏆 Ljestvica znanja";\n\n    const leaderboardSectionTabs = document.querySelector(".leaderboard-section-tabs");\n    if (leaderboardSectionTabs) leaderboardSectionTabs.setAttribute("aria-label", isEnglish ? "Leaderboard type" : "Vrsta ljestvice");\n    const leaderboardMainTab = document.querySelector(".leaderboard-section-tab.active");\n    if (leaderboardMainTab) leaderboardMainTab.textContent = isEnglish ? "Daily 30" : "Dnevnih 30";\n    const leaderboardSoon = document.querySelector(".leaderboard-section-tab--soon small");\n    if (leaderboardSoon) leaderboardSoon.textContent = isEnglish ? "Soon" : "Uskoro";\n    const leaderboardPeriodTabs = document.querySelector(".leaderboard-tabs");\n    if (leaderboardPeriodTabs) leaderboardPeriodTabs.setAttribute("aria-label", isEnglish ? "Leaderboard period" : "Razdoblje ljestvice");\n\n    const dailyCountdown = document.querySelector(".daily30-countdown");\n    if (dailyCountdown) dailyCountdown.setAttribute("aria-label", isEnglish ? "Time until the next quiz" : "Vrijeme do idućeg kviza");\n    const dailyPanel = document.getElementById("daily30-panel");\n    if (dailyPanel) dailyPanel.setAttribute("aria-label", isEnglish ? "Daily 30" : "Dnevnih 30");\n    const dailyPrev = document.getElementById("daily30-month-prev");\n    if (dailyPrev) dailyPrev.setAttribute("aria-label", isEnglish ? "Previous month" : "Prethodni mjesec");\n    const dailyNext = document.getElementById("daily30-month-next");\n    if (dailyNext) dailyNext.setAttribute("aria-label", isEnglish ? "Next month" : "Sljedeći mjesec");\n    const weekdayLabels = isEnglish ? ["MO","TU","WE","TH","FR","SA","SU"] : ["PO","UT","SR","ČE","PE","SU","NE"];\n    document.querySelectorAll(".daily30-weekdays span").forEach((el, index) => {\n      if (weekdayLabels[index]) el.textContent = weekdayLabels[index];\n    });\n    const dailyNameInput = document.getElementById("daily30-name-input");\n    if (dailyNameInput) dailyNameInput.placeholder = isEnglish ? "Your name" : "Tvoje ime";\n\n    const btnStart = document.getElementById("btn-start");'''
if old not in s:
    raise SystemExit('refreshDynamicLanguageText anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) leaderboards.js: dynamic pieces must also refresh when HR/EN changes.
p = Path('leaderboards.js')
s = p.read_text(encoding='utf-8')
old = '''function refreshAll(){renderPreview()}'''
new = '''function refreshLanguageCopy(){const en=lang()==='en';const title=document.querySelector('.leaderboard-visibility-title');if(title)title.textContent=en?'Show me on leaderboard':'Prikaži me na ljestvici';const note=document.querySelector('.leaderboard-visibility-note');if(note)note.textContent=en?'Your result stays saved when hidden.':'Rezultat ostaje spremljen i kad si skriven.';const full=document.querySelector('#leaderboard-page .leaderboard-title');if(full)full.textContent='🏆 '+(en?'Full leaderboard':'Cijela ljestvica');const close=document.getElementById('leaderboard-close');if(close)close.textContent=en?'Close':'Zatvori'}\nfunction refreshAll(){refreshLanguageCopy();renderPreview();if(document.getElementById('leaderboard-page')?.classList.contains('open'))renderPage();renderAch()}'''
if old not in s:
    raise SystemExit('leaderboards refreshAll anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

from pathlib import Path

p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')

old = '''      how9: "After typing your answer, confirm it by clicking the white checkmark on the green background.",\n      howAiNote: "We are building this system as a smart AI and it is still under development. If it mistakenly marks your correct answer as incorrect, do not worry too much. The most important thing is that you knew the answer.",'''
new = '''      how9: "After typing your answer, confirm it by clicking the white checkmark on the green background.",\n      how10: "Daily 30 is a quiz mode in which every player gets the same questions in the same order. The leaderboard shows and ranks players' results, and you can hide your own result if you wish. Only a quiz played on the day it is active counts as an official result and toward the leaderboard. You can still play past Daily 30 quizzes, but those results do not count toward the leaderboard.",\n      howAiNote: "We are building this system as a smart AI and it is still under development. If it mistakenly marks your correct answer as incorrect, do not worry too much. The most important thing is that you knew the answer.",'''
if s.count(old) != 1:
    raise SystemExit(f'Expected one English how9/howAiNote block, got {s.count(old)}')
s = s.replace(old, new, 1)

old = '''    const dailyNameInput = document.getElementById("daily30-name-input");\n    if (dailyNameInput) dailyNameInput.placeholder = isEnglish ? "Your name" : "Tvoje ime";\n\n    const btnStart = document.getElementById("btn-start");'''
new = '''    const dailyNameInput = document.getElementById("daily30-name-input");\n    if (dailyNameInput) dailyNameInput.placeholder = isEnglish ? "Your name" : "Tvoje ime";\n\n    const leaderboardVisibilityTitle = document.querySelector(".leaderboard-visibility-title");\n    if (leaderboardVisibilityTitle) leaderboardVisibilityTitle.textContent = isEnglish ? "Show me on the leaderboard" : "Prikaži me na ljestvici";\n    const leaderboardVisibilityNote = document.querySelector(".leaderboard-visibility-note");\n    if (leaderboardVisibilityNote) leaderboardVisibilityNote.textContent = isEnglish ? "Your result stays saved when hidden." : "Rezultat ostaje spremljen i kad si skriven.";\n\n    const btnStart = document.getElementById("btn-start");'''
if s.count(old) != 1:
    raise SystemExit(f'Expected one dailyNameInput translation block, got {s.count(old)}')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

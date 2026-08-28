from pathlib import Path

path = Path('online-kviz.html')
text = path.read_text(encoding='utf-8')
original = text

# 1) Zavrseni Blitz: povijest ostaje vidljiva i nakon skidanja quiz-playing klase.
css_marker = 'html.kviz-initial-loading body { visibility: hidden; }\n'
css_add = css_marker + 'html body.quiz-results-visible .sidebar-card { display: flex !important; }\n'
if 'html body.quiz-results-visible .sidebar-card' not in text:
    if css_marker not in text:
        raise SystemExit('CSS marker not found')
    text = text.replace(css_marker, css_add, 1)

# 2) Svaki normalni izlazak/reset uklanja stanje zavrsenih rezultata.
old_close = 'document.body.classList.remove("quiz-playing", "keyboard-active");'
new_close = 'document.body.classList.remove("quiz-playing", "keyboard-active", "quiz-results-visible");'
if old_close in text:
    text = text.replace(old_close, new_close, 1)
elif new_close not in text:
    raise SystemExit('closeMobileQuizFocus marker not found')

# 3) Samo na prirodnom isteku timera ponovno ukljuci prikaz povijesti nakon closeMobileQuizFocus().
old_finish = '''        setStartButtonState(false);\n        closeMobileQuizFocus();\n        void finishQuizTracking(true);'''
new_finish = '''        setStartButtonState(false);\n        closeMobileQuizFocus();\n        document.body.classList.add("quiz-results-visible");\n        void finishQuizTracking(true);'''
if new_finish not in text:
    if old_finish not in text:
        raise SystemExit('timer finish marker not found')
    text = text.replace(old_finish, new_finish, 1)

if text == original:
    raise SystemExit('no changes')
path.write_text(text, encoding='utf-8')
print('Blitz history persistence patched')

from pathlib import Path

path = Path('online-kviz.html')
text = path.read_text(encoding='utf-8')
original = text

html_marker = '<html lang="hr">'
html_replacement = '<html lang="hr" class="kviz-initial-loading">'
if html_marker not in text:
    raise SystemExit('html marker not found')
text = text.replace(html_marker, html_replacement, 1)

head_marker = '<style>\n/* ========================================================= */'
head_replacement = '''<style>\n/* Sprijeci kratki prikaz nedovrsenog layouta prije ucitavanja pocetnih skripti. */\nhtml.kviz-initial-loading { background: #0b1220; }\nhtml.kviz-initial-loading body { visibility: hidden; }\n\n/* ========================================================= */'''
if head_marker not in text:
    raise SystemExit('style marker not found')
text = text.replace(head_marker, head_replacement, 1)

init_marker = '  document.addEventListener("DOMContentLoaded", async () => {\n    initLanguageSwitch();'
init_replacement = '''  document.addEventListener("DOMContentLoaded", async () => {\n    document.documentElement.classList.remove("kviz-initial-loading");\n    initLanguageSwitch();'''
if init_marker not in text:
    raise SystemExit('init marker not found')
text = text.replace(init_marker, init_replacement, 1)

if text == original:
    raise SystemExit('no changes')
path.write_text(text, encoding='utf-8')
print('online-kviz initial flash patched')
